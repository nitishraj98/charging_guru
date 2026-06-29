"""Owner application endpoints — apply, check status, admin review."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User
from app.repositories.owner_application_repo import OwnerApplicationRepo
from app.schemas.owner_application import (
    OwnerApplicationIn,
    OwnerApplicationOut,
    PagedApplications,
    ReviewIn,
)
from app.services.owner_application_service import OwnerApplicationService

router = APIRouter(tags=["owner-applications"])

_ADMIN = require_roles("ROLE_ADMIN")


def _svc(db: AsyncSession = Depends(get_db)) -> OwnerApplicationService:
    return OwnerApplicationService(OwnerApplicationRepo(db), db)


# ── Applicant endpoints ───────────────────────────────────────────────────────

@router.post(
    "/owner-applications",
    response_model=OwnerApplicationOut,
    status_code=status.HTTP_201_CREATED,
)
async def apply(
    payload: OwnerApplicationIn,
    user: User = Depends(get_current_user),
    svc: OwnerApplicationService = Depends(_svc),
) -> OwnerApplicationOut:
    """Any logged-in user can apply to become a station owner."""
    app = await svc.apply(
        user,
        business_name=payload.business_name,
        gst_number=payload.gst_number,
        city=payload.city,
        address=payload.address,
        planned_stations=payload.planned_stations,
        message=payload.message,
    )
    return OwnerApplicationOut.model_validate(app)


@router.get("/owner-applications/me", response_model=OwnerApplicationOut | None)
async def my_application(
    user: User = Depends(get_current_user),
    svc: OwnerApplicationService = Depends(_svc),
) -> OwnerApplicationOut | None:
    """Returns the current user's latest application (or null)."""
    app = await svc.my_application(user.id)
    return OwnerApplicationOut.model_validate(app) if app else None


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get(
    "/admin/owner-applications",
    response_model=PagedApplications,
)
async def list_applications(
    status: str | None = Query(None, description="PENDING | APPROVED | REJECTED"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: User = Depends(_ADMIN),
    svc: OwnerApplicationService = Depends(_svc),
) -> PagedApplications:
    return await svc.list_applications(status, page, per_page)


@router.post(
    "/admin/owner-applications/{app_id}/approve",
    response_model=OwnerApplicationOut,
)
async def approve_application(
    app_id: uuid.UUID,
    admin: User = Depends(_ADMIN),
    svc: OwnerApplicationService = Depends(_svc),
) -> OwnerApplicationOut:
    app = await svc.approve(app_id, admin)
    return OwnerApplicationOut.model_validate(app)


@router.post(
    "/admin/owner-applications/{app_id}/reject",
    response_model=OwnerApplicationOut,
)
async def reject_application(
    app_id: uuid.UUID,
    body: ReviewIn,
    admin: User = Depends(_ADMIN),
    svc: OwnerApplicationService = Depends(_svc),
) -> OwnerApplicationOut:
    app = await svc.reject(app_id, admin, body.note)
    return OwnerApplicationOut.model_validate(app)
