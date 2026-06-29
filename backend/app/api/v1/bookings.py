"""Booking endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header

from app.api.deps import get_booking_service, get_current_user
from app.models.user import User
from app.schemas.bookings import BookingCreateIn, BookingOut
from app.services.booking_service import BookingService

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
):
    return await svc.get_owned(booking_id, user.id)
