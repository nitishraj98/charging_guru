"""Admin-configurable pricing/fee settings + the itemized breakdown DTO
returned on bookings/payments."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import ORMModel, StrictModel

FeeModeLiteral = Literal["FIXED", "PERCENTAGE"]


class PricingSettingsOut(ORMModel):
    platform_fee_mode: FeeModeLiteral
    platform_fee_fixed_paise: int
    platform_fee_percent: float
    platform_fee_min_paise: int
    platform_fee_max_paise: int
    platform_fee_enabled: bool

    convenience_fee_mode: FeeModeLiteral
    convenience_fee_fixed_paise: int
    convenience_fee_percent: float
    convenience_fee_min_paise: int
    convenience_fee_max_paise: int
    convenience_fee_enabled: bool

    gst_percentage: float
    gst_enabled: bool

    parking_fee_enabled: bool
    idle_fee_enabled: bool
    idle_grace_minutes: int

    updated_at: datetime


class PricingSettingsUpdateIn(StrictModel):
    platform_fee_mode: FeeModeLiteral | None = None
    platform_fee_fixed_paise: int | None = Field(None, ge=0)
    platform_fee_percent: float | None = Field(None, ge=0, le=100)
    platform_fee_min_paise: int | None = Field(None, ge=0)
    platform_fee_max_paise: int | None = Field(None, ge=0)
    platform_fee_enabled: bool | None = None

    convenience_fee_mode: FeeModeLiteral | None = None
    convenience_fee_fixed_paise: int | None = Field(None, ge=0)
    convenience_fee_percent: float | None = Field(None, ge=0, le=100)
    convenience_fee_min_paise: int | None = Field(None, ge=0)
    convenience_fee_max_paise: int | None = Field(None, ge=0)
    convenience_fee_enabled: bool | None = None

    gst_percentage: float | None = Field(None, ge=0, le=100)
    gst_enabled: bool | None = None

    parking_fee_enabled: bool | None = None
    idle_fee_enabled: bool | None = None
    idle_grace_minutes: int | None = Field(None, ge=0, le=120)


class PricingBreakdownOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    energy_kwh: float
    energy_cost_paise: int
    parking_fee_paise: int
    idle_fee_paise: int
    platform_fee_paise: int
    convenience_fee_paise: int
    gst_amount_paise: int
    discount_amount_paise: int
    total_paise: int
    owner_earnings_paise: int
    charging_guru_earnings_paise: int


class OwnerBreakdownOut(BaseModel):
    """Breakdown shown to station owners — deliberately excludes
    platform_fee_paise, convenience_fee_paise, gst_amount_paise, total_paise,
    and charging_guru_earnings_paise so Charging Guru's own cut is never
    visible in the owner-facing bookings/sessions API response."""
    model_config = ConfigDict(from_attributes=True)

    energy_kwh: float
    energy_cost_paise: int
    parking_fee_paise: int
    idle_fee_paise: int
    owner_earnings_paise: int
