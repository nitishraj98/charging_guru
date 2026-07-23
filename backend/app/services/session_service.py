"""Charging session use-cases: QR check-in, session start, session complete.

State transitions driven by the booking state machine:
  CONFIRMED  →[qr_checkin]→  CHECKED_IN
  CHECKED_IN →[start]→       IN_PROGRESS   (charger → OCCUPIED)
  IN_PROGRESS→[complete]→    COMPLETED     (charger → AVAILABLE)

All three actions require the caller to be the station's owner (or an admin).
The skip_ownership flag is True for admins, bypassing the per-station check.
"""
from __future__ import annotations

import uuid

from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.core.qr import verify_qr
from app.domain.booking_state import can_transition
from app.models.booking import Booking
from app.models.enums import BookingStatus, ChargerStatus
from app.repositories.booking_repo import BookingRepo
from app.repositories.station_repo import StationRepo
from app.services.availability_service import AvailabilityService
from app.services.reward_service import RewardService


class SessionService:
    def __init__(
        self,
        bookings: BookingRepo,
        stations: StationRepo,
        avail: AvailabilityService,
        session,
        rewards: RewardService | None = None,
    ):
        self.bookings = bookings
        self.stations = stations
        self.avail = avail
        self.session = session
        self.rewards = rewards

    async def _check_ownership(
        self, booking: Booking, operator_id: uuid.UUID, skip: bool
    ) -> None:
        if skip:
            return
        station = await self.stations.get(booking.station_id)
        if station is None or station.owner_id != operator_id:
            raise ForbiddenError(
                "You do not own the station for this booking.", code="FORBIDDEN"
            )

    async def qr_checkin(
        self,
        qr_token: str,
        operator_id: uuid.UUID,
        *,
        skip_ownership: bool = False,
    ) -> Booking:
        """Verify a QR token, atomically consume it, transition booking → CHECKED_IN."""
        try:
            payload = await verify_qr(qr_token)
        except ValueError as exc:
            raise ConflictError(str(exc), code="INVALID_QR")

        booking_id = uuid.UUID(payload["booking_id"])
        booking = await self.bookings.get(booking_id)
        if booking is None:
            raise NotFoundError("Booking not found.", code="BOOKING_NOT_FOUND")

        await self._check_ownership(booking, operator_id, skip_ownership)

        if not can_transition(booking.status, BookingStatus.CHECKED_IN):
            raise ConflictError(
                f"Cannot check in a booking in status {booking.status.value}.",
                code="INVALID_BOOKING_STATE",
            )
        booking.status = BookingStatus.CHECKED_IN
        await self.session.flush()
        return booking

    async def checkin_by_id(
        self,
        booking_id: uuid.UUID,
        operator_id: uuid.UUID,
        *,
        skip_ownership: bool = False,
    ) -> Booking:
        """Manual check-in fallback for when a customer's QR won't scan —
        same CONFIRMED → CHECKED_IN transition as qr_checkin, just looked up
        by booking ID instead of a signed QR token."""
        booking = await self.bookings.get(booking_id)
        if booking is None:
            raise NotFoundError("Booking not found.", code="BOOKING_NOT_FOUND")

        await self._check_ownership(booking, operator_id, skip_ownership)

        if not can_transition(booking.status, BookingStatus.CHECKED_IN):
            raise ConflictError(
                f"Cannot check in a booking in status {booking.status.value}.",
                code="INVALID_BOOKING_STATE",
            )
        booking.status = BookingStatus.CHECKED_IN
        await self.session.flush()
        return booking

    async def start(
        self,
        booking_id: uuid.UUID,
        operator_id: uuid.UUID,
        *,
        skip_ownership: bool = False,
    ) -> Booking:
        """Start charging: CHECKED_IN → IN_PROGRESS, charger → OCCUPIED."""
        booking = await self.bookings.get(booking_id)
        if booking is None:
            raise NotFoundError("Booking not found.", code="BOOKING_NOT_FOUND")

        await self._check_ownership(booking, operator_id, skip_ownership)

        if not can_transition(booking.status, BookingStatus.IN_PROGRESS):
            raise ConflictError(
                f"Cannot start session from status {booking.status.value}.",
                code="INVALID_BOOKING_STATE",
            )
        booking.status = BookingStatus.IN_PROGRESS
        await self.avail.set_status(
            booking.charger_id,
            ChargerStatus.OCCUPIED,
            changed_by=operator_id,
            reason="session_started",
        )
        return booking

    async def complete(
        self,
        booking_id: uuid.UUID,
        operator_id: uuid.UUID,
        *,
        skip_ownership: bool = False,
    ) -> Booking:
        """Complete charging: IN_PROGRESS → COMPLETED, charger → AVAILABLE."""
        booking = await self.bookings.get(booking_id)
        if booking is None:
            raise NotFoundError("Booking not found.", code="BOOKING_NOT_FOUND")

        await self._check_ownership(booking, operator_id, skip_ownership)

        if not can_transition(booking.status, BookingStatus.COMPLETED):
            raise ConflictError(
                f"Cannot complete session from status {booking.status.value}.",
                code="INVALID_BOOKING_STATE",
            )
        booking.status = BookingStatus.COMPLETED
        await self.avail.set_status(
            booking.charger_id,
            ChargerStatus.AVAILABLE,
            changed_by=operator_id,
            reason="session_completed",
        )
        if self.rewards is not None:
            await self.rewards.award_session_points(booking.user_id, booking.id)
        return booking
