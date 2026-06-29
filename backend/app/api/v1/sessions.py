"""Charging session endpoints — owner controls the physical session lifecycle."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status

from app.api.deps import get_session_service, require_roles
from app.models.enums import RoleName
from app.models.user import User
from app.schemas.payments import SessionOut
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])

_OWNER_OR_ADMIN = require_roles(RoleName.STATION_OWNER.value, RoleName.ADMIN.value)


@router.post(
    "/{booking_id}/start",
    response_model=SessionOut,
    status_code=status.HTTP_200_OK,
)
async def start_session(
    booking_id: uuid.UUID,
    current_user: User = Depends(_OWNER_OR_ADMIN),
    svc: SessionService = Depends(get_session_service),
):
    is_admin = RoleName.ADMIN.value in current_user.role_names
    booking = await svc.start(booking_id, current_user.id, skip_ownership=is_admin)
    return booking


@router.post(
    "/{booking_id}/complete",
    response_model=SessionOut,
    status_code=status.HTTP_200_OK,
)
async def complete_session(
    booking_id: uuid.UUID,
    current_user: User = Depends(_OWNER_OR_ADMIN),
    svc: SessionService = Depends(get_session_service),
):
    is_admin = RoleName.ADMIN.value in current_user.role_names
    booking = await svc.complete(booking_id, current_user.id, skip_ownership=is_admin)
    return booking
