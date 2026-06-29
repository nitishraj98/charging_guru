"""Admin-only endpoints: analytics overview, user/station/charger/payment management."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel

from app.api.deps import get_admin_service, get_booking_service, get_payment_service, require_roles
from app.core.db import get_db
from app.core.errors import ForbiddenError
from app.models.enums import RoleName
from app.repositories.user_repo import UserRepo
from app.schemas.admin import (
    AdminBookingOut,
    AdminOverviewOut,
    ChargerAdminOut,
    PagedResult,
    PaymentAdminOut,
    StationAdminOut,
    StationRejectIn,
    StationStatusIn,
    UserAdminOut,
    UserStatusIn,
)
from app.services.admin_service import AdminService
from app.services.booking_service import BookingService
from app.services.payment_service import PaymentService


class MaintenanceResult(BaseModel):
    expired_count: int

router = APIRouter(prefix="/admin", tags=["admin"])

_ADMIN_ONLY = require_roles(RoleName.ADMIN.value)


class CheckPhoneIn(BaseModel):
    phone: str


class CheckPhoneOut(BaseModel):
    is_admin: bool


@router.post("/auth/check-phone", response_model=CheckPhoneOut)
async def check_admin_phone(
    body: CheckPhoneIn,
    db=Depends(get_db),
) -> CheckPhoneOut:
    """Public endpoint — returns 200 if phone belongs to an admin, 403 otherwise.
    Does not reveal whether the phone number exists in the system at all."""
    user = await UserRepo(db).get_by_phone(body.phone)
    if user is None or RoleName.ADMIN.value not in user.role_names:
        raise ForbiddenError(
            "This phone number is not registered as an admin.",
            code="NOT_ADMIN",
        )
    return CheckPhoneOut(is_admin=True)


@router.get("/analytics/overview", response_model=AdminOverviewOut)
async def get_overview(
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.get_overview()


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=PagedResult[UserAdminOut])
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.list_users(page, per_page)


@router.patch("/users/{user_id}/status", response_model=UserAdminOut)
async def update_user_status(
    user_id: uuid.UUID,
    body: UserStatusIn,
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.update_user_status(user_id, body.status)


@router.get("/users/{user_id}/bookings", response_model=PagedResult[AdminBookingOut])
async def list_user_bookings(
    user_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.list_user_bookings(user_id, page, per_page)


# ── Stations ──────────────────────────────────────────────────────────────────

@router.get("/stations", response_model=PagedResult[StationAdminOut])
async def list_stations(
    status: str | None = Query(None, description="Filter by StationStatus value"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.list_stations(status, page, per_page)


@router.post(
    "/stations/{station_id}/approve",
    response_model=StationAdminOut,
    status_code=status.HTTP_200_OK,
)
async def approve_station(
    station_id: uuid.UUID,
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.approve_station(station_id)


@router.post(
    "/stations/{station_id}/reject",
    response_model=StationAdminOut,
    status_code=status.HTTP_200_OK,
)
async def reject_station(
    station_id: uuid.UUID,
    body: StationRejectIn,
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.reject_station(station_id, body.reason)


@router.patch("/stations/{station_id}/status", response_model=StationAdminOut)
async def update_station_status(
    station_id: uuid.UUID,
    body: StationStatusIn,
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.update_station_status(station_id, body.status)


# ── Chargers ──────────────────────────────────────────────────────────────────

@router.get("/chargers", response_model=PagedResult[ChargerAdminOut])
async def list_chargers(
    status: str | None = Query(None, description="Filter by ChargerStatus value"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.list_chargers(status, page, per_page)


# ── Bookings ──────────────────────────────────────────────────────────────────

@router.get("/bookings", response_model=PagedResult[AdminBookingOut])
async def list_bookings(
    status: str | None = Query(None, description="Filter by BookingStatus value"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.list_bookings(status, page, per_page)


@router.post("/bookings/{booking_id}/cancel", response_model=AdminBookingOut)
async def cancel_booking(
    booking_id: uuid.UUID,
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.cancel_booking(booking_id)


@router.post("/bookings/{booking_id}/refund", response_model=AdminBookingOut)
async def refund_booking(
    booking_id: uuid.UUID,
    _: object = Depends(_ADMIN_ONLY),
    payment_svc: PaymentService = Depends(get_payment_service),
    svc: AdminService = Depends(get_admin_service),
):
    """Admin force-refund: cancels booking and attempts Razorpay refund."""
    booking = await svc.repo.get_booking(str(booking_id))
    if booking is None:
        from app.core.errors import NotFoundError
        raise NotFoundError("Booking not found.", code="BOOKING_NOT_FOUND")
    # Re-use PaymentService.refund_booking but override user_id check by using booking's owner
    result = await payment_svc.refund_booking(booking_id, booking.user_id)
    return AdminBookingOut.model_validate(result)


# ── Payments ──────────────────────────────────────────────────────────────────

@router.get("/payments", response_model=PagedResult[PaymentAdminOut])
async def list_payments(
    status: str | None = Query(None, description="Filter by PaymentStatus value"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.list_payments(status, page, per_page)


# ── Maintenance ───────────────────────────────────────────────────────────────

@router.post(
    "/maintenance/expire-holds",
    response_model=MaintenanceResult,
    status_code=status.HTTP_200_OK,
)
async def expire_stale_holds(
    _: object = Depends(_ADMIN_ONLY),
    booking_svc: BookingService = Depends(get_booking_service),
):
    """Expire PENDING_PAYMENT bookings whose hold window has elapsed."""
    count = await booking_svc.expire_stale_holds()
    return MaintenanceResult(expired_count=count)
