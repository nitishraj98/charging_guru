"""Auth endpoints: OTP login, refresh, logout, sessions."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request, status

from app.api.deps import get_auth_service, get_current_session_id, get_current_user
from app.models.user import User
from app.schemas.auth import (
    AuthResult,
    OtpRequestIn,
    OtpRequestOut,
    OtpVerifyIn,
    RefreshIn,
    SessionRenameIn,
    UserSessionOut,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str | None:
    fwd = request.headers.get("X-Forwarded-For")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/otp/request", response_model=OtpRequestOut)
async def request_otp(
    payload: OtpRequestIn,
    request: Request,
    svc: AuthService = Depends(get_auth_service),
) -> OtpRequestOut:
    return await svc.request_otp(payload.phone, ip=_client_ip(request))


@router.post("/otp/verify", response_model=AuthResult)
async def verify_otp(
    payload: OtpVerifyIn,
    request: Request,
    svc: AuthService = Depends(get_auth_service),
) -> AuthResult:
    return await svc.verify_otp(
        request_id=payload.request_id,
        code=payload.code,
        device=payload.device,
        ip=_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
    )


@router.post("/refresh", response_model=AuthResult)
async def refresh(
    payload: RefreshIn,
    svc: AuthService = Depends(get_auth_service),
) -> AuthResult:
    return await svc.refresh(payload.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: RefreshIn,
    svc: AuthService = Depends(get_auth_service),
) -> None:
    # Revoking by refresh token (rather than requiring a still-valid access
    # token) means logout works even if the access token already expired —
    # the same trust model /auth/refresh already uses.
    await svc.logout_by_refresh_token(payload.refresh_token)


@router.get("/sessions", response_model=list[UserSessionOut])
async def list_sessions(
    user: User = Depends(get_current_user),
    current_session_id: uuid.UUID = Depends(get_current_session_id),
    svc: AuthService = Depends(get_auth_service),
) -> list[UserSessionOut]:
    return await svc.list_sessions(user.id, current_session_id)


@router.delete("/sessions/others", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_other_sessions(
    user: User = Depends(get_current_user),
    current_session_id: uuid.UUID = Depends(get_current_session_id),
    svc: AuthService = Depends(get_auth_service),
) -> None:
    await svc.revoke_other_sessions(user.id, current_session_id)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    svc: AuthService = Depends(get_auth_service),
) -> None:
    await svc.revoke_session(user.id, session_id)


@router.patch("/sessions/{session_id}", response_model=UserSessionOut)
async def rename_session(
    session_id: uuid.UUID,
    payload: SessionRenameIn,
    user: User = Depends(get_current_user),
    current_session_id: uuid.UUID = Depends(get_current_session_id),
    svc: AuthService = Depends(get_auth_service),
) -> UserSessionOut:
    return await svc.rename_session(user.id, session_id, current_session_id, payload.device_name)
