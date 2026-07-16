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


class AdminOverviewOut(BaseModel):
    total_users: int
    total_stations: int
    active_stations: int
    pending_stations: int
    total_chargers: int
    bookings_today: int
    confirmed_bookings_today: int
    revenue_today_paise: int
    revenue_total_paise: int
    trend_7d: list[DayTrend]
    charger_breakdown: ChargerBreakdown
    top_stations: list[TopStation]


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
