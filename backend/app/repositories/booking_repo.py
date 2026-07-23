"""Data access for booking slots + bookings."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import utcnow
from app.models.booking import Booking
from app.models.enums import ACTIVE_BOOKING_STATUSES, BookingStatus
from app.models.slot import BookingSlot


def _hold_not_expired():
    """True for non-PENDING_PAYMENT bookings, or PENDING_PAYMENT bookings whose
    hold hasn't clock-expired yet.

    A background sweep (app.core.scheduler) periodically flips clock-expired
    holds to EXPIRED, but it only runs every HOLD_SWEEP_INTERVAL_SECONDS — a
    request landing in the gap between ticks would still see a stale
    PENDING_PAYMENT row without this check, blocking the slot for everyone
    else until the next sweep tick.
    """
    return or_(
        Booking.status != BookingStatus.PENDING_PAYMENT,
        Booking.hold_expires_at > utcnow(),
    )


class SlotRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_or_create(
        self, charger_id: uuid.UUID, start: datetime, end: datetime
    ) -> BookingSlot:
        res = await self.session.execute(
            select(BookingSlot).where(
                BookingSlot.charger_id == charger_id, BookingSlot.slot_start == start
            )
        )
        slot = res.scalar_one_or_none()
        if slot:
            return slot
        slot = BookingSlot(charger_id=charger_id, slot_start=start, slot_end=end)
        self.session.add(slot)
        await self.session.flush()
        return slot

    async def active_intervals_for_charger(
        self, charger_id: uuid.UUID, window_start: datetime, window_end: datetime
    ) -> list[tuple[datetime, datetime, BookingStatus]]:
        """(slot_start, slot_end, booking.status) for every active, non-expired
        booking on this charger whose slot overlaps [window_start, window_end).

        One query; the caller does per-candidate overlap math in Python rather
        than issuing one query per grid slot.
        """
        stmt = (
            select(BookingSlot.slot_start, BookingSlot.slot_end, Booking.status)
            .join(Booking, Booking.slot_id == BookingSlot.id)
            .where(
                BookingSlot.charger_id == charger_id,
                Booking.status.in_(ACTIVE_BOOKING_STATUSES),
                _hold_not_expired(),
                BookingSlot.slot_start < window_end,
                BookingSlot.slot_end > window_start,
            )
        )
        res = await self.session.execute(stmt)
        return [(s, e, st) for s, e, st in res.all()]


class BookingRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, booking: Booking) -> Booking:
        self.session.add(booking)
        await self.session.flush()
        await self.session.refresh(booking, attribute_names=["charger", "station", "slot"])
        return booking

    async def get(self, booking_id: uuid.UUID) -> Booking | None:
        return await self.session.get(Booking, booking_id)

    async def slot_has_active_booking(self, slot_id: uuid.UUID) -> bool:
        res = await self.session.execute(
            select(Booking.id).where(
                Booking.slot_id == slot_id,
                Booking.status.in_(ACTIVE_BOOKING_STATUSES),
                _hold_not_expired(),
            ).limit(1)
        )
        return res.scalar_one_or_none() is not None

    async def overlapping_active(
        self, charger_id: uuid.UUID, start: datetime, end: datetime
    ) -> bool:
        """Fresh, lock-scoped re-check: does any active/non-expired booking on
        this charger overlap [start, end)? Used inside create_booking's
        per-charger lock right before insert — must not trust anything
        computed outside the lock, since it may be stale by the time we get in.
        """
        stmt = (
            select(Booking.id)
            .join(BookingSlot, BookingSlot.id == Booking.slot_id)
            .where(
                BookingSlot.charger_id == charger_id,
                Booking.status.in_(ACTIVE_BOOKING_STATUSES),
                _hold_not_expired(),
                BookingSlot.slot_start < end,
                BookingSlot.slot_end > start,
            )
            .limit(1)
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none() is not None

    async def stale_pending_charger_refs(
        self, now: datetime
    ) -> list[tuple[uuid.UUID, uuid.UUID, uuid.UUID]]:
        """(booking_id, station_id, charger_id) for every PENDING_PAYMENT
        booking past its hold — collected BEFORE the sweep's bulk UPDATE runs,
        so the caller knows which chargers to publish slot_update events for.
        """
        stmt = select(Booking.id, Booking.station_id, Booking.charger_id).where(
            Booking.status == BookingStatus.PENDING_PAYMENT,
            Booking.hold_expires_at <= now,
        )
        res = await self.session.execute(stmt)
        return list(res.all())

    async def expire_if_stale(self, slot_id: uuid.UUID) -> None:
        """Flip this slot's PENDING_PAYMENT booking to EXPIRED if its hold has
        clock-expired, so a fresh booking attempt doesn't collide with a stale
        row that the (non-existent) background sweep never cleaned up.
        """
        await self.session.execute(
            update(Booking)
            .where(
                Booking.slot_id == slot_id,
                Booking.status == BookingStatus.PENDING_PAYMENT,
                Booking.hold_expires_at <= utcnow(),
            )
            .values(status=BookingStatus.EXPIRED)
        )

    async def list_for_station_owner(self, station_ids: list[uuid.UUID]) -> list[Booking]:
        if not station_ids:
            return []
        res = await self.session.execute(
            select(Booking)
            .where(Booking.station_id.in_(station_ids))
            .order_by(Booking.created_at.desc())
            .limit(200)
        )
        return list(res.scalars().all())

    async def list_for_user(self, user_id: uuid.UUID) -> list[Booking]:
        res = await self.session.execute(
            select(Booking).where(Booking.user_id == user_id).order_by(Booking.created_at.desc())
        )
        return list(res.scalars().all())
