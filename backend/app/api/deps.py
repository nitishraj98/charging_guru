"""FastAPI dependencies: DB sessions, current user, RBAC, service factories."""
from __future__ import annotations

import uuid
from collections.abc import Callable

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.db import get_db, get_replica_db
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.razorpay import RazorpayGateway, get_razorpay_gateway
from app.models.user import User
from app.repositories.admin_repo import AdminRepo
from app.repositories.booking_repo import BookingRepo, SlotRepo
from app.repositories.otp_repo import OtpRepo
from app.repositories.payment_repo import PaymentRepo
from app.repositories.session_repo import SessionRepo
from app.repositories.station_repo import ChargerRepo, StationRepo
from app.repositories.user_repo import UserRepo
from app.services.admin_service import AdminService
from app.services.auth_service import AuthService
from app.services.availability_service import AvailabilityService
from app.services.booking_service import BookingService
from app.services.payment_service import PaymentService
from app.services.session_service import SessionService
from app.services.station_service import StationService

bearer = HTTPBearer(auto_error=False)

__all__ = [
    "get_db",
    "get_replica_db",
    "get_auth_service",
    "get_station_service",
    "get_availability_service",
    "get_booking_service",
    "get_payment_service",
    "get_session_service",
    "get_admin_service",
    "get_razorpay_gateway",
    "get_current_user",
    "require_roles",
]


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(UserRepo(db), OtpRepo(db), SessionRepo(db))


def get_station_service(db: AsyncSession = Depends(get_db)) -> StationService:
    return StationService(StationRepo(db))


def get_availability_service(db: AsyncSession = Depends(get_db)) -> AvailabilityService:
    return AvailabilityService(ChargerRepo(db), db)


def get_booking_service(db: AsyncSession = Depends(get_db)) -> BookingService:
    return BookingService(BookingRepo(db), SlotRepo(db), ChargerRepo(db), db)


def get_payment_service(
    db: AsyncSession = Depends(get_db),
    gateway: RazorpayGateway = Depends(get_razorpay_gateway),
) -> PaymentService:
    return PaymentService(PaymentRepo(db), BookingRepo(db), gateway, db)


def get_session_service(db: AsyncSession = Depends(get_db)) -> SessionService:
    avail = AvailabilityService(ChargerRepo(db), db)
    return SessionService(BookingRepo(db), StationRepo(db), avail, db)


def get_admin_service(db: AsyncSession = Depends(get_db)) -> AdminService:
    return AdminService(AdminRepo(db), StationRepo(db), UserRepo(db))


async def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if creds is None or not creds.credentials:
        raise UnauthorizedError("Missing bearer token.", code="UNAUTHORIZED")
    try:
        payload = security.decode_access_token(creds.credentials)
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("Access token expired.", code="TOKEN_EXPIRED") from exc
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Invalid access token.", code="INVALID_TOKEN") from exc

    if payload.get("typ") != "access":
        raise UnauthorizedError("Wrong token type.", code="INVALID_TOKEN")

    user = await UserRepo(db).get(uuid.UUID(payload["sub"]))
    if user is None:
        raise UnauthorizedError("User not found.", code="UNAUTHORIZED")

    request.state.user_id = str(user.id)
    request.state.session_id = payload.get("sid")
    return user


def require_roles(*roles: str) -> Callable[..., User]:
    """Dependency factory enforcing that the user has at least one role."""

    async def _checker(user: User = Depends(get_current_user)) -> User:
        if not set(roles) & set(user.role_names):
            raise ForbiddenError(
                f"Requires one of: {', '.join(roles)}", code="FORBIDDEN"
            )
        return user

    return _checker
