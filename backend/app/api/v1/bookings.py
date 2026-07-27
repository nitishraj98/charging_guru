"""Booking endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, Response

from app.api.deps import get_booking_service, get_current_user, get_invoice_service, get_station_service
from app.core.errors import ConflictError, NotFoundError
from app.models.enums import BookingStatus
from app.models.user import User
from app.schemas.bookings import BookingCreateIn, BookingOut, QRTokenOut
from app.services.booking_service import BookingService
from app.services.invoice_service import InvoiceService
from app.services.station_service import StationService

router = APIRouter(prefix="/bookings", tags=["bookings"])


async def _with_breakdown(booking, svc: BookingService) -> BookingOut:
    out = BookingOut.model_validate(booking)
    out.breakdown = await svc.get_breakdown(booking)
    return out


@router.post("", response_model=BookingOut, status_code=201)
async def create_booking(
    payload: BookingCreateIn,
    user: User = Depends(get_current_user),
    svc: BookingService = Depends(get_booking_service),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
):
    booking = await svc.create_booking(user.id, payload)
    return await _with_breakdown(booking, svc)


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
        booking = await svc.get_owned(booking_id, user.id)
        return await _with_breakdown(booking, svc)

    # Station owners/admins may also look up bookings at stations they operate
    # (needed for the check-in / session-manager tools), not just their own.
    booking = await svc.get_any(booking_id)
    if booking is None:
        raise NotFoundError("Booking not found.", code="BOOKING_NOT_FOUND")
    if booking.user_id == user.id or "ROLE_ADMIN" in role_names:
        return await _with_breakdown(booking, svc)
    await station_svc.ensure_owner(booking.station_id, user.id, is_admin=False)
    return await _with_breakdown(booking, svc)


@router.get("/{booking_id}/qr", response_model=QRTokenOut)
async def get_booking_qr(
    booking_id: uuid.UUID,
    user: User = Depends(get_current_user),
    svc: BookingService = Depends(get_booking_service),
):
    token = await svc.get_qr_token(booking_id, user.id)
    return QRTokenOut(qr_token=token)


@router.get("/{booking_id}/invoice")
async def get_booking_invoice(
    booking_id: uuid.UUID,
    user: User = Depends(get_current_user),
    svc: BookingService = Depends(get_booking_service),
    invoice_svc: InvoiceService = Depends(get_invoice_service),
):
    """PDF invoice for a completed charging session."""
    booking = await svc.get_owned(booking_id, user.id)
    if booking.status != BookingStatus.COMPLETED:
        raise ConflictError(
            "Invoice is only available for completed charging sessions.",
            code="INVOICE_NOT_AVAILABLE",
        )
    pdf_bytes, invoice_number = await invoice_svc.generate_invoice_pdf(booking)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="invoice-{invoice_number.replace("/", "-")}.pdf"'
        },
    )
