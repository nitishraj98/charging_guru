"""Booking endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header

from app.api.deps import get_booking_service, get_current_user, get_station_service
from app.core.errors import NotFoundError
from app.models.user import User
from app.schemas.bookings import BookingCreateIn, BookingOut, QRTokenOut
from app.services.booking_service import BookingService
from app.services.station_service import StationService

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=201)
async def create_booking(
    payload: BookingCreateIn,
    user: User = Depends(get_current_user),
    svc: BookingService = Depends(get_booking_service),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
):
    return await svc.create_booking(user.id, payload)


@router.get("", response_model=list[BookingOut])
async def list_bookings(
    user: User = Depends(get_current_user),
    svc: BookingService = Depends(get_booking_service),
):
    return await svc.list_user_bookings(user.id)


@router.get("/{booking_id}", response_model=BookingOut)
async def get_booking(
    booking_id: uuid.UUID,
    user: User = Depends(get_current_user),
    svc: BookingService = Depends(get_booking_service),
    station_svc: StationService = Depends(get_station_service),
):
    role_names = user.role_names
    if "ROLE_ADMIN" not in role_names and "ROLE_STATION_OWNER" not in role_names:
        return await svc.get_owned(booking_id, user.id)

    # Station owners/admins may also look up bookings at stations they operate
    # (needed for the check-in / session-manager tools), not just their own.
    booking = await svc.get_any(booking_id)
    if booking is None:
        raise NotFoundError("Booking not found.", code="BOOKING_NOT_FOUND")
    if booking.user_id == user.id or "ROLE_ADMIN" in role_names:
        return booking
    await station_svc.ensure_owner(booking.station_id, user.id, is_admin=False)
    return booking


@router.get("/{booking_id}/qr", response_model=QRTokenOut)
async def get_booking_qr(
    booking_id: uuid.UUID,
    user: User = Depends(get_current_user),
    svc: BookingService = Depends(get_booking_service),
):
    token = await svc.get_qr_token(booking_id, user.id)
    return QRTokenOut(qr_token=token)
