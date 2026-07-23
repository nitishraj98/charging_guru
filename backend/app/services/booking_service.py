"""Booking use-cases: slot listing + reservation with distributed locking.

Reservation concurrency model:
  1. Acquire a Redis lock scoped to the whole charger (not just one exact
     start time — two *different* start times can still overlap in time,
     e.g. 5:00/90min and 5:30/30min on the same charger, and only a
     charger-wide lock can serialize those against each other). The lock's
     acquisition result is checked and retried with backoff — a contended
     lock must not silently let the caller through unprotected.
  2. Inside the lock, freshly re-check for any overlapping active booking
     (not just an exact slot_start match) before inserting.
  3. Insert the booking in PENDING_PAYMENT with a hold TTL.
  4. The partial-unique index on bookings(slot_id) is a secondary DB-level
     guard for the exact-same-start-time case; the lock + fresh overlap
     check is what actually guarantees no overlapping bookings under
     concurrency for differing start times.

Payment (Razorpay order) is wired in the next slice; here the booking is held
pending payment, and app.core.scheduler's background sweep expires unpaid
holds that nobody happens to touch again.
"""
from __future__ import annotations

import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

from app.core.errors import ConflictError, NotFoundError
from app.core.qr import issue_qr
from app.core.redis import lock
from app.core.time import ensure_aware, utcnow
from app.domain.policies import (
    HOLD_TTL_SECONDS,
    LOCK_MAX_ATTEMPTS,
    LOCK_RETRY_DELAY_S,
    LOCK_RETRY_JITTER_S,
    SLOT_LOCK_TTL_MS,
    quote_booking,
)
from app.models.booking import Booking
from app.models.enums import BookingStatus, ChargerStatus
from app.repositories.booking_repo import BookingRepo, SlotRepo
from app.repositories.station_repo import ChargerRepo
from app.schemas.bookings import BookingCreateIn
from app.services.realtime import publish_slot_event

# Slot grid used by the slot picker (local-naive hours interpreted as UTC for demo).
GRID_OPEN_HOUR = 6
GRID_CLOSE_HOUR = 22
GRID_STEP_MIN = 30
# Longest a single booking may run (BookingCreateIn caps duration_minutes at
# 180) — used as headroom so a booking starting near grid-close but running
# past it is still accounted for in the overlap window.
MAX_BOOKING_MINUTES = 180


class BookingService:
    def __init__(self, bookings: BookingRepo, slots: SlotRepo, chargers: ChargerRepo, session):
        self.bookings = bookings
        self.slots = slots
        self.chargers = chargers
        self.session = session

    async def available_slots(
        self, charger_id: uuid.UUID, day: datetime, duration_minutes: int
    ) -> list[dict]:
        """Duration/overlap-aware slot grid: a candidate slot is only AVAILABLE
        if its *entire* [start, start+duration) window is free — not just its
        start time. Classification precedence (first match wins):
          1. start already passed             -> PAST
          2. charger isn't AVAILABLE           -> OFFLINE
          3. overlaps a paid/checked-in/active booking -> BOOKED
          4. overlaps someone else's unexpired hold     -> HELD
          5. otherwise                          -> AVAILABLE
        """
        charger = await self.chargers.get(charger_id)
        if charger is None or charger.deleted_at is not None:
            raise NotFoundError("Charger not found.", code="CHARGER_NOT_FOUND")

        base = day.astimezone(timezone.utc).replace(
            hour=GRID_OPEN_HOUR, minute=0, second=0, microsecond=0
        )
        end_of_grid = base.replace(hour=GRID_CLOSE_HOUR)
        # Headroom: a booking starting before close but running past it (up to
        # the max allowed duration) must still be accounted for.
        window_end = end_of_grid + timedelta(minutes=MAX_BOOKING_MINUTES)
        intervals = await self.slots.active_intervals_for_charger(
            charger_id, base, window_end
        )
        intervals = [
            (ensure_aware(s), ensure_aware(e), st) for s, e, st in intervals
        ]

        chargeable = charger.status == ChargerStatus.AVAILABLE
        now = utcnow()
        out: list[dict] = []
        cur = base
        while cur < end_of_grid:
            cand_end = cur + timedelta(minutes=duration_minutes)
            if cur <= now:
                status = "PAST"
            elif not chargeable:
                status = "OFFLINE"
            elif any(
                s < cand_end and e > cur and st != BookingStatus.PENDING_PAYMENT
                for s, e, st in intervals
            ):
                status = "BOOKED"
            elif any(
                s < cand_end and e > cur and st == BookingStatus.PENDING_PAYMENT
                for s, e, st in intervals
            ):
                status = "HELD"
            else:
                status = "AVAILABLE"
            out.append({
                "slot_start": cur.isoformat(),
                "slot_end": cand_end.isoformat(),
                "status": status,
                "available": status == "AVAILABLE",
            })
            cur += timedelta(minutes=GRID_STEP_MIN)
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

        # Locked per-charger (not per-exact-start-time): two requests for
        # *different* start times that still overlap in time (e.g. 5:00/90min
        # and 5:30/30min) touch different slot_ids, so only a charger-wide
        # lock can serialize them against each other — the DB partial-unique
        # index is scoped to a single slot_id and can't catch that case.
        # Not scoped by date either: a booking starting 21:30 for 180min
        # spans midnight, so a day-scoped key could let two such requests
        # dodge each other.
        lock_key = f"lock:charger:{payload.charger_id}"
        booking: Booking | None = None
        acquired = False
        for attempt in range(LOCK_MAX_ATTEMPTS):
            async with lock(lock_key, ttl_ms=SLOT_LOCK_TTL_MS) as got:
                if got:
                    acquired = True
                    if await self.bookings.overlapping_active(payload.charger_id, start, end):
                        raise ConflictError("That slot was just booked.", code="SLOT_UNAVAILABLE")

                    slot = await self.slots.get_or_create(payload.charger_id, start, end)
                    # Defense-in-depth: the overlap check above already covers
                    # this, but keep the per-slot lazy-expire too in case this
                    # exact slot_id has a stale row from before the sweep ran.
                    await self.bookings.expire_if_stale(slot.id)

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
                        # Commit before releasing the lock, not after returning
                        # to the caller — the DB commit normally happens later,
                        # at the request-dependency edge, but if we released
                        # the lock first, a waiting contender could acquire it
                        # and run its own fresh overlap check against a
                        # different, uncommitted transaction that doesn't see
                        # this row yet, defeating the lock entirely. Committing
                        # here makes the row visible to every session before
                        # anyone else gets a chance to look.
                        await self.session.commit()
                    except IntegrityError as exc:  # raced past the lock → DB guard caught it
                        await self.session.rollback()
                        raise ConflictError(
                            "That slot was just booked.", code="SLOT_UNAVAILABLE"
                        ) from exc
            if acquired:
                break
            await asyncio.sleep(LOCK_RETRY_DELAY_S + random.uniform(0, LOCK_RETRY_JITTER_S))

        if not acquired:
            raise ConflictError(
                "This charger is under heavy demand right now. Please try again in a moment.",
                code="LOCK_CONTENDED",
            )

        assert booking is not None  # acquired implies booking was set or an error was raised
        await publish_slot_event(booking.station_id, booking.charger_id, "hold_created")
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

    async def expire_stale_holds(self) -> list[tuple[uuid.UUID, uuid.UUID, uuid.UUID]]:
        """Transition PENDING_PAYMENT bookings past hold_expires_at → EXPIRED.

        Returns (booking_id, station_id, charger_id) for every row affected —
        callers use this to know which chargers to publish slot_update events
        for. Called from the admin maintenance endpoint and from
        app.core.scheduler's periodic background sweep.
        """
        now = utcnow()
        affected = await self.bookings.stale_pending_charger_refs(now)
        if affected:
            await self.session.execute(
                update(Booking)
                .where(
                    Booking.status == BookingStatus.PENDING_PAYMENT,
                    Booking.hold_expires_at <= now,
                )
                .values(status=BookingStatus.EXPIRED)
                .execution_options(synchronize_session="fetch")
            )
        return affected
