"""Auth endpoints: OTP login, refresh, logout, sessions."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status

from app.api.deps import get_auth_service, get_current_user
from app.models.user import User
from app.schemas.auth import (
    AuthResult,
    OtpRequestIn,
    OtpRequestOut,
    OtpVerifyIn,
    RefreshIn,
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
    request: Request,
    user: User = Depends(get_current_user),
    svc: AuthService = Depends(get_auth_service),
) -> None:
    sid = getattr(request.state, "session_id", None)
    if sid:
        import uuid

        await svc.logout(uuid.UUID(sid))
