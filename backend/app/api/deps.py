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
from app.core.sms import TwilioGateway, get_twilio_gateway
from app.models.user import User
from app.repositories.admin_repo import AdminRepo
from app.repositories.audit_log_repo import AuditLogRepo
from app.repositories.booking_repo import BookingRepo, SlotRepo
from app.repositories.gst_record_repo import GSTRecordRepo
from app.repositories.membership_payment_repo import MembershipPaymentRepo
from app.repositories.otp_repo import OtpRepo
from app.repositories.owner_payout_repo import OwnerPayoutRepo
from app.repositories.payment_repo import PaymentRepo
from app.repositories.platform_revenue_repo import PlatformRevenueRepo
from app.repositories.pricing_settings_repo import PricingSettingsRepo
from app.repositories.session_repo import SessionRepo
from app.repositories.reward_repo import RewardRepo
from app.repositories.station_repo import ChargerRepo, ReviewRepo, StationRepo
from app.repositories.transaction_breakdown_repo import TransactionBreakdownRepo
from app.repositories.user_repo import UserRepo
from app.services.admin_service import AdminService
from app.services.auth_service import AuthService
from app.services.availability_service import AvailabilityService
from app.services.booking_service import BookingService
from app.services.invoice_service import InvoiceService
from app.services.owner_finance_service import OwnerFinanceService
from app.services.payment_service import PaymentService
from app.services.payout_service import PayoutService
from app.services.pricing_settings_service import PricingSettingsService
from app.services.reward_service import MembershipService, RewardService
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
    "get_audit_log_repo",
    "get_reward_service",
    "get_membership_service",
    "get_pricing_settings_service",
    "get_payout_service",
    "get_owner_finance_service",
    "get_invoice_service",
    "get_razorpay_gateway",
    "get_twilio_gateway",
    "get_current_user",
    "get_current_session_id",
    "require_roles",
]


def get_auth_service(
    db: AsyncSession = Depends(get_db),
    sms: TwilioGateway = Depends(get_twilio_gateway),
) -> AuthService:
    return AuthService(UserRepo(db), OtpRepo(db), SessionRepo(db), sms)


def get_station_service(db: AsyncSession = Depends(get_db)) -> StationService:
    return StationService(StationRepo(db), ReviewRepo(db), BookingRepo(db), ChargerRepo(db))


def get_availability_service(db: AsyncSession = Depends(get_db)) -> AvailabilityService:
    return AvailabilityService(ChargerRepo(db), db)


def get_pricing_settings_service(db: AsyncSession = Depends(get_db)) -> PricingSettingsService:
    return PricingSettingsService(PricingSettingsRepo(db))


def get_booking_service(
    db: AsyncSession = Depends(get_db),
    pricing_settings: PricingSettingsService = Depends(get_pricing_settings_service),
) -> BookingService:
    return BookingService(BookingRepo(db), SlotRepo(db), ChargerRepo(db), db, pricing_settings)


def get_payment_service(
    db: AsyncSession = Depends(get_db),
    gateway: RazorpayGateway = Depends(get_razorpay_gateway),
    pricing_settings: PricingSettingsService = Depends(get_pricing_settings_service),
) -> PaymentService:
    membership = MembershipService(UserRepo(db), MembershipPaymentRepo(db), gateway, db)
    return PaymentService(
        PaymentRepo(db), BookingRepo(db), gateway, db, membership,
        pricing_settings=pricing_settings,
        breakdown_repo=TransactionBreakdownRepo(db),
        platform_revenue_repo=PlatformRevenueRepo(db),
        gst_repo=GSTRecordRepo(db),
    )


def get_session_service(
    db: AsyncSession = Depends(get_db),
    pricing_settings: PricingSettingsService = Depends(get_pricing_settings_service),
) -> SessionService:
    avail = AvailabilityService(ChargerRepo(db), db)
    rewards = RewardService(RewardRepo(db), UserRepo(db), db)
    return SessionService(BookingRepo(db), StationRepo(db), avail, db, rewards, pricing_settings)


def get_admin_service(db: AsyncSession = Depends(get_db)) -> AdminService:
    return AdminService(AdminRepo(db), StationRepo(db), UserRepo(db))


def get_audit_log_repo(db: AsyncSession = Depends(get_db)) -> AuditLogRepo:
    return AuditLogRepo(db)


def get_reward_service(db: AsyncSession = Depends(get_db)) -> RewardService:
    return RewardService(RewardRepo(db), UserRepo(db), db)


def get_membership_service(
    db: AsyncSession = Depends(get_db),
    gateway: RazorpayGateway = Depends(get_razorpay_gateway),
) -> MembershipService:
    return MembershipService(UserRepo(db), MembershipPaymentRepo(db), gateway, db)


def get_payout_service(db: AsyncSession = Depends(get_db)) -> PayoutService:
    return PayoutService(OwnerPayoutRepo(db))


def get_owner_finance_service(db: AsyncSession = Depends(get_db)) -> OwnerFinanceService:
    return OwnerFinanceService(TransactionBreakdownRepo(db), OwnerPayoutRepo(db))


def get_invoice_service(db: AsyncSession = Depends(get_db)) -> InvoiceService:
    return InvoiceService(
        db, TransactionBreakdownRepo(db), GSTRecordRepo(db), PricingSettingsService(PricingSettingsRepo(db)),
    )


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


async def get_current_session_id(
    request: Request, _: User = Depends(get_current_user)
) -> uuid.UUID:
    return uuid.UUID(request.state.session_id)


def require_roles(*roles: str) -> Callable[..., User]:
    """Dependency factory enforcing that the user has at least one role."""

    async def _checker(user: User = Depends(get_current_user)) -> User:
        if not set(roles) & set(user.role_names):
            raise ForbiddenError(
                f"Requires one of: {', '.join(roles)}", code="FORBIDDEN"
            )
        return user

    return _checker
