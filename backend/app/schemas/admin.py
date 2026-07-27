"""Admin-facing DTOs."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel

from app.models.enums import BookingStatus, ChargerStatus, MembershipTier, PaymentStatus, StationStatus, UserStatus
from app.schemas.common import ORMModel, StrictModel

T = TypeVar("T")


class PagedResult(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    per_page: int
    pages: int


class DayTrend(BaseModel):
    date: str
    bookings: int
    revenue_paise: int


class StationRevenueRow(BaseModel):
    station_id: uuid.UUID
    station_name: str
    city: str
    owner_name: str
    gtv_paise: int
    owner_earnings_paise: int
    charging_guru_earnings_paise: int
    charging_revenue_paise: int
    parking_revenue_paise: int
    idle_revenue_paise: int
    gst_collected_paise: int
    transaction_count: int


class ChargerBreakdown(BaseModel):
    AVAILABLE: int = 0
    BOOKED: int = 0
    OCCUPIED: int = 0
    OFFLINE: int = 0
    MAINTENANCE: int = 0


class TopStation(BaseModel):
    id: str
    name: str
    city: str
    revenue_paise: int
    bookings: int


class MarketplaceVolumeOut(BaseModel):
    charging_revenue_paise: int
    parking_revenue_paise: int
    idle_revenue_paise: int
    gtv_paise: int


class ChargingGuruRevenueOut(BaseModel):
    platform_fee_paise: int
    convenience_fee_paise: int
    subscription_fee_paise: int
    ad_revenue_paise: int
    total_paise: int


class StationPayoutsOut(BaseModel):
    total_paid_paise: int
    pending_paise: int
    scheduled_paise: int


class TaxesOut(BaseModel):
    gst_collected_paise: int
    gst_payable_paise: int  # MVP: no input-credit modeling, same as collected


class AdminOverviewOut(BaseModel):
    total_users: int
    total_stations: int
    active_stations: int
    pending_stations: int
    total_chargers: int
    bookings_today: int
    confirmed_bookings_today: int
    completed_sessions_total: int
    revenue_today_paise: int  # deprecated alias of gtv_today_paise, kept for existing consumers
    revenue_total_paise: int  # deprecated alias of gtv_total_paise
    gtv_today_paise: int
    gtv_total_paise: int
    charging_guru_revenue_total_paise: int
    owner_payouts_total_paise: int
    owner_payouts_pending_paise: int
    trend_7d: list[DayTrend]
    charger_breakdown: ChargerBreakdown
    top_stations: list[TopStation]
    marketplace_volume: MarketplaceVolumeOut
    charging_guru_revenue: ChargingGuruRevenueOut
    station_payouts: StationPayoutsOut
    taxes: TaxesOut


class UserAdminOut(ORMModel):
    id: uuid.UUID
    phone: str
    email: str | None
    full_name: str | None
    status: UserStatus
    referral_code: str
    reward_points: int
    role_names: list[str]
    created_at: datetime


class StationAdminOut(ORMModel):
    id: uuid.UUID
    name: str
    address: str
    city: str | None
    state: str | None
    lat: float
    lng: float
    status: StationStatus
    owner_id: uuid.UUID
    rating_avg: float
    rating_count: int
    created_at: datetime


class AdminBookingOut(ORMModel):
    id: uuid.UUID
    user_id: uuid.UUID
    station_id: uuid.UUID
    charger_id: uuid.UUID
    slot_id: uuid.UUID
    status: BookingStatus
    amount: int
    hold_expires_at: datetime | None
    created_at: datetime
    slot_start: datetime
    slot_end: datetime


class ChargerAdminOut(ORMModel):
    id: uuid.UUID
    station_id: uuid.UUID
    label: str
    charger_type: str
    power_kw: float
    connector_type: str
    status: ChargerStatus
    price_per_kwh: int
    parking_fee_paise: int = 0
    idle_fee_paise_per_min: int = 0
    created_at: datetime


class PaymentAdminOut(ORMModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    user_id: uuid.UUID
    amount: int
    status: PaymentStatus
    razorpay_order_id: str
    razorpay_payment_id: str | None
    created_at: datetime


class MembershipPaymentAdminOut(ORMModel):
    id: uuid.UUID
    user_id: uuid.UUID
    tier: MembershipTier
    amount: int
    status: PaymentStatus
    razorpay_order_id: str
    razorpay_payment_id: str | None
    created_at: datetime


class UserStatusIn(StrictModel):
    status: UserStatus


class StationStatusIn(StrictModel):
    status: StationStatus


class StationRejectIn(StrictModel):
    reason: str | None = None


class AdminInviteIn(StrictModel):
    phone: str


class AuditLogOut(ORMModel):
    id: uuid.UUID
    actor_id: uuid.UUID | None
    action: str
    target_type: str | None
    target_id: uuid.UUID | None
    detail: dict | None
    created_at: datetime
