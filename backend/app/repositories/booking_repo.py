"""Data access for booking slots + bookings."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.enums import ACTIVE_BOOKING_STATUSES
from app.models.slot import BookingSlot


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

    async def taken_starts_for_charger(self, charger_id: uuid.UUID) -> set[datetime]:
        """slot_start values on this charger with an active booking."""
        stmt = (
            select(BookingSlot.slot_start)
            .join(Booking, Booking.slot_id == BookingSlot.id)
            .where(
                BookingSlot.charger_id == charger_id,
                Booking.status.in_(ACTIVE_BOOKING_STATUSES),
            )
        )
        res = await self.session.execute(stmt)
        return set(res.scalars().all())

    async def active_slot_ids_for_charger(
        self, charger_id: uuid.UUID
    ) -> set[uuid.UUID]:
        """slot ids on this charger that currently have an active booking."""
        stmt = (
            select(Booking.slot_id)
            .join(BookingSlot, BookingSlot.id == Booking.slot_id)
            .where(
                BookingSlot.charger_id == charger_id,
                Booking.status.in_(ACTIVE_BOOKING_STATUSES),
            )
        )
        res = await self.session.execute(stmt)
        return set(res.scalars().all())


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
            ).limit(1)
        )
        return res.scalar_one_or_none() is not None

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
