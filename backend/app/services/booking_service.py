"""Booking use-cases: slot listing + reservation with distributed locking.

Reservation concurrency model:
  1. Acquire a short Redis lock on (charger, slot_start).
  2. Get-or-create the slot row; reject if it already has an active booking.
  3. Insert the booking in PENDING_PAYMENT with a hold TTL.
  4. The partial-unique index on bookings(slot_id) is the final DB-level guard
     against double-booking if two requests race past the lock.

Payment (Razorpay order) is wired in the next slice; here the booking is held
pending payment, and a Celery-beat sweep (documented) expires unpaid holds.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

from app.core.errors import ConflictError, NotFoundError
from app.core.qr import issue_qr
from app.core.redis import lock
from app.core.time import ensure_aware, utcnow
from app.domain.policies import HOLD_TTL_SECONDS, SLOT_LOCK_TTL_MS, quote_booking
from app.models.booking import Booking
from app.models.enums import BookingStatus, ChargerStatus
from app.repositories.booking_repo import BookingRepo, SlotRepo
from app.repositories.station_repo import ChargerRepo
from app.schemas.bookings import BookingCreateIn

# Slot grid used by the slot picker (local-naive hours interpreted as UTC for demo).
GRID_OPEN_HOUR = 6
GRID_CLOSE_HOUR = 22
GRID_STEP_MIN = 30


class BookingService:
    def __init__(self, bookings: BookingRepo, slots: SlotRepo, chargers: ChargerRepo, session):
        self.bookings = bookings
        self.slots = slots
        self.chargers = chargers
        self.session = session

    async def available_slots(self, charger_id: uuid.UUID, day: datetime) -> list[dict]:
        charger = await self.chargers.get(charger_id)
        if charger is None or charger.deleted_at is not None:
            raise NotFoundError("Charger not found.", code="CHARGER_NOT_FOUND")
        taken = {ensure_aware(t) for t in await self.slots.taken_starts_for_charger(charger_id)}
        base = day.astimezone(timezone.utc).replace(
            hour=GRID_OPEN_HOUR, minute=0, second=0, microsecond=0
        )
        out: list[dict] = []
        cur = base
        end_of_grid = base.replace(hour=GRID_CLOSE_HOUR)
        chargeable = charger.status == ChargerStatus.AVAILABLE
        while cur < end_of_grid:
            slot_end = cur + timedelta(minutes=GRID_STEP_MIN)
            out.append({
                "slot_start": cur.isoformat(),
                "slot_end": slot_end.isoformat(),
                "available": chargeable and cur not in taken and cur > utcnow(),
            })
            cur = slot_end
        return out

    async def create_booking(
        self, user_id: uuid.UUID, payload: BookingCreateIn
    ) -> Booking:
        charger = await self.chargers.get(payload.charger_id)
        if charger is None or charger.deleted_at is not None:
            raise NotFoundError("Charger not found.", code="CHARGER_NOT_FOUND")
        if charger.status != ChargerStatus.AVAILABLE:
            raise ConflictError("Charger is not available.", code="CHARGER_UNAVAILABLE")

        start = ensure_aware(payload.slot_start)
        if start <= utcnow():
            raise ConflictError("Slot is in the past.", code="SLOT_IN_PAST")
        end = start + timedelta(minutes=payload.duration_minutes)

        q = quote_booking(float(charger.power_kw), payload.duration_minutes, charger.price_per_kwh)

        lock_key = f"lock:slot:{payload.charger_id}:{start.isoformat()}"
        async with lock(lock_key, ttl_ms=SLOT_LOCK_TTL_MS):
            slot = await self.slots.get_or_create(payload.charger_id, start, end)
            # Self-healing: no background sweep runs, so lazily expire this
            # slot's stale hold (if any) before checking/inserting — otherwise
            # a fresh booking could collide with an unflipped expired row.
            await self.bookings.expire_if_stale(slot.id)
            if await self.bookings.slot_has_active_booking(slot.id):
                raise ConflictError("That slot was just booked.", code="SLOT_UNAVAILABLE")

            booking = Booking(
                user_id=user_id,
                vehicle_id=payload.vehicle_id,
                station_id=charger.station_id,
                charger_id=charger.id,
                slot_id=slot.id,
                status=BookingStatus.PENDING_PAYMENT,
                amount=q.total_paise,
                energy_kwh_est=q.energy_kwh,
                hold_expires_at=utcnow() + timedelta(seconds=HOLD_TTL_SECONDS),
            )
            try:
                await self.bookings.add(booking)
            except IntegrityError as exc:  # raced past the lock → DB guard caught it
                await self.session.rollback()
                raise ConflictError("That slot was just booked.", code="SLOT_UNAVAILABLE") from exc
        return booking

    async def list_user_bookings(self, user_id: uuid.UUID) -> list[Booking]:
        return await self.bookings.list_for_user(user_id)

    async def list_for_owner(self, station_ids: list[uuid.UUID]) -> list[Booking]:
        return await self.bookings.list_for_station_owner(station_ids)

    async def get_owned(self, booking_id: uuid.UUID, user_id: uuid.UUID) -> Booking:
        b = await self.bookings.get(booking_id)
        if b is None or b.user_id != user_id:
            raise NotFoundError("Booking not found.", code="BOOKING_NOT_FOUND")
        return b

    async def get_any(self, booking_id: uuid.UUID) -> Booking | None:
        """Unscoped fetch — caller is responsible for authorizing access."""
        return await self.bookings.get(booking_id)

    async def get_qr_token(self, booking_id: uuid.UUID, user_id: uuid.UUID) -> str:
        """Re-issue a fresh, valid QR token string for an unredeemed pass.

        The original signed token is only ever returned once, right after
        payment (it's never persisted). Revisiting the QR later — a page
        refresh, a bookmark, "view booking" then back — needs a way to get
        a scannable token again, bound to the same jti so it's still only
        usable once in total.
        """
        booking = await self.get_owned(booking_id, user_id)
        if booking.status != BookingStatus.CONFIRMED:
            raise ConflictError(
                "QR pass is only available for confirmed bookings awaiting check-in.",
                code="QR_NOT_AVAILABLE",
            )
        if booking.qr_jti is None:
            raise ConflictError("No QR pass has been issued for this booking.", code="QR_NOT_ISSUED")
        token, _ = issue_qr(booking.id, jti=booking.qr_jti)
        return token

    async def expire_stale_holds(self) -> int:
        """Transition PENDING_PAYMENT bookings past hold_expires_at → EXPIRED.

        Returns the count of rows updated.  Called from the admin maintenance
        endpoint and (in production) from a Celery-beat task every minute.
        """
        now = utcnow()
        result = await self.session.execute(
            update(Booking)
            .where(
                Booking.status == BookingStatus.PENDING_PAYMENT,
                Booking.hold_expires_at <= now,
            )
            .values(status=BookingStatus.EXPIRED)
            .execution_options(synchronize_session="fetch")
        )
        return result.rowcount
