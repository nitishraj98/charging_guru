"""Admin-only endpoints: analytics overview, user/station/charger/payment management."""
from __future__ import annotations

import math
import uuid

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel

from app.api.deps import (
    get_admin_service,
    get_audit_log_repo,
    get_booking_service,
    get_payment_service,
    require_roles,
)
from app.core.db import get_db
from app.core.errors import ForbiddenError, NotFoundError
from app.models.enums import RoleName
from app.models.user import User
from app.repositories.audit_log_repo import AuditLogRepo
from app.repositories.user_repo import UserRepo
from app.schemas.admin import (
    AdminBookingOut,
    AdminInviteIn,
    AdminOverviewOut,
    AuditLogOut,
    ChargerAdminOut,
    MembershipPaymentAdminOut,
    PagedResult,
    PaymentAdminOut,
    StationAdminOut,
    StationRejectIn,
    StationRevenueRow,
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


async def _audit(
    audit: AuditLogRepo,
    admin: User,
    action: str,
    *,
    target_type: str | None = None,
    target_id: uuid.UUID | None = None,
    detail: dict | None = None,
) -> None:
    await audit.create(
        actor_id=admin.id, action=action,
        target_type=target_type, target_id=target_id, detail=detail,
    )


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


@router.get("/analytics/stations-revenue", response_model=PagedResult[StationRevenueRow])
async def get_station_revenue_breakdown(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    """Every station's full marketplace breakdown — GTV, owner earnings vs.
    Charging Guru revenue, GST — for the admin Revenue page's station-level view."""
    return await svc.station_revenue_breakdown(page, per_page, search)


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
    admin: User = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
    audit: AuditLogRepo = Depends(get_audit_log_repo),
):
    result = await svc.update_user_status(user_id, body.status)
    await _audit(
        audit, admin, "USER_STATUS_UPDATED",
        target_type="user", target_id=user_id, detail={"status": body.status.value},
    )
    return result


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
    admin: User = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
    audit: AuditLogRepo = Depends(get_audit_log_repo),
):
    result = await svc.approve_station(station_id)
    await _audit(audit, admin, "STATION_APPROVED", target_type="station", target_id=station_id)
    return result


@router.post(
    "/stations/{station_id}/reject",
    response_model=StationAdminOut,
    status_code=status.HTTP_200_OK,
)
async def reject_station(
    station_id: uuid.UUID,
    body: StationRejectIn,
    admin: User = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
    audit: AuditLogRepo = Depends(get_audit_log_repo),
):
    result = await svc.reject_station(station_id, body.reason)
    await _audit(
        audit, admin, "STATION_REJECTED",
        target_type="station", target_id=station_id, detail={"reason": body.reason},
    )
    return result


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
    admin: User = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
    audit: AuditLogRepo = Depends(get_audit_log_repo),
):
    result = await svc.cancel_booking(booking_id)
    await _audit(audit, admin, "BOOKING_CANCELLED", target_type="booking", target_id=booking_id)
    return result


@router.post("/bookings/{booking_id}/refund", response_model=AdminBookingOut)
async def refund_booking(
    booking_id: uuid.UUID,
    admin: User = Depends(_ADMIN_ONLY),
    payment_svc: PaymentService = Depends(get_payment_service),
    svc: AdminService = Depends(get_admin_service),
    audit: AuditLogRepo = Depends(get_audit_log_repo),
):
    """Admin force-refund: cancels booking and attempts Razorpay refund."""
    booking = await svc.repo.get_booking(str(booking_id))
    if booking is None:
        raise NotFoundError("Booking not found.", code="BOOKING_NOT_FOUND")
    # Re-use PaymentService.refund_booking but override user_id check by using booking's owner
    result = await payment_svc.refund_booking(booking_id, booking.user_id)
    await _audit(audit, admin, "BOOKING_REFUNDED", target_type="booking", target_id=booking_id)
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


class MembershipRevenueOut(BaseModel):
    total_paise: int


@router.get("/membership-payments", response_model=PagedResult[MembershipPaymentAdminOut])
async def list_membership_payments(
    status: str | None = Query(None, description="Filter by PaymentStatus value"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.list_membership_payments(status, page, per_page)


@router.get("/membership-payments/revenue", response_model=MembershipRevenueOut)
async def get_membership_revenue(
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    total = await svc.get_membership_revenue_total()
    return MembershipRevenueOut(total_paise=total)


# ── Maintenance ───────────────────────────────────────────────────────────────

@router.post(
    "/maintenance/expire-holds",
    response_model=MaintenanceResult,
    status_code=status.HTTP_200_OK,
)
async def expire_stale_holds(
    admin: User = Depends(_ADMIN_ONLY),
    booking_svc: BookingService = Depends(get_booking_service),
    audit: AuditLogRepo = Depends(get_audit_log_repo),
):
    """Expire PENDING_PAYMENT bookings whose hold window has elapsed."""
    expired = await booking_svc.expire_stale_holds()
    count = len(expired)
    await _audit(audit, admin, "HOLDS_EXPIRED", detail={"expired_count": count})
    return MaintenanceResult(expired_count=count)


# ── Admin management ───────────────────────────────────────────────────────────

@router.get("/admins", response_model=list[UserAdminOut])
async def list_admins(
    _: object = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
):
    return await svc.list_admins()


@router.post("/admins", response_model=UserAdminOut, status_code=status.HTTP_201_CREATED)
async def grant_admin(
    body: AdminInviteIn,
    admin: User = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
    audit: AuditLogRepo = Depends(get_audit_log_repo),
):
    result = await svc.grant_admin(body.phone)
    await _audit(
        audit, admin, "ADMIN_GRANTED",
        target_type="user", target_id=result.id, detail={"phone": body.phone},
    )
    return result


@router.delete("/admins/{user_id}", response_model=UserAdminOut)
async def revoke_admin(
    user_id: uuid.UUID,
    admin: User = Depends(_ADMIN_ONLY),
    svc: AdminService = Depends(get_admin_service),
    audit: AuditLogRepo = Depends(get_audit_log_repo),
):
    result = await svc.revoke_admin(user_id, admin.id)
    await _audit(audit, admin, "ADMIN_REVOKED", target_type="user", target_id=user_id)
    return result


# ── Audit log ─────────────────────────────────────────────────────────────────

@router.get("/audit-log", response_model=PagedResult[AuditLogOut])
async def list_audit_log(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: object = Depends(_ADMIN_ONLY),
    audit: AuditLogRepo = Depends(get_audit_log_repo),
):
    entries, total = await audit.list(page, per_page)
    pages = max(1, math.ceil(total / per_page)) if total else 1
    return PagedResult(
        items=[AuditLogOut.model_validate(e) for e in entries],
        total=total, page=page, per_page=per_page, pages=pages,
    )
