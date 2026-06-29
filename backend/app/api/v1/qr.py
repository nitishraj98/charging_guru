"""QR check-in endpoint — called by the owner app when scanning a user's QR."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user, get_session_service, require_roles
from app.models.enums import RoleName
from app.models.user import User
from app.schemas.payments import QRVerifyIn, QRVerifyOut
from app.services.session_service import SessionService

router = APIRouter(prefix="/qr", tags=["qr"])

_OWNER_OR_ADMIN = require_roles(RoleName.STATION_OWNER.value, RoleName.ADMIN.value)


@router.post("/verify", response_model=QRVerifyOut, status_code=status.HTTP_200_OK)
async def verify_qr(
    body: QRVerifyIn,
    current_user: User = Depends(_OWNER_OR_ADMIN),
    svc: SessionService = Depends(get_session_service),
):
    is_admin = RoleName.ADMIN.value in current_user.role_names
    booking = await svc.qr_checkin(body.qr_token, current_user.id, skip_ownership=is_admin)
    return booking
