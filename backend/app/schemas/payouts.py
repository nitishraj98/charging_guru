"""Owner payout DTOs + the owner-scoped finance summary (deliberately
excludes any platform/convenience fee or Charging Guru revenue field)."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import PayoutStatus
from app.schemas.common import ORMModel, StrictModel


class OwnerPayoutOut(ORMModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    station_id: uuid.UUID | None
    period_start: datetime
    period_end: datetime
    amount_paise: int
    status: PayoutStatus
    payout_method: str | None
    reference_note: str | None
    paid_at: datetime | None
    created_at: datetime


class OwnerPayoutCreateIn(StrictModel):
    owner_id: uuid.UUID
    station_id: uuid.UUID | None = None
    period_start: datetime
    period_end: datetime
    amount_paise: int = Field(..., gt=0)
    payout_method: str | None = None
    reference_note: str | None = Field(None, max_length=200)


class OwnerFinanceSummaryOut(BaseModel):
    total_earnings_paise: int
    charging_revenue_paise: int
    parking_revenue_paise: int
    idle_fee_revenue_paise: int
    pending_payouts_paise: int
    completed_payouts_paise: int
    charging_sessions_count: int
    energy_sold_kwh: float


class PayoutQuoteOut(BaseModel):
    earned_in_period_paise: int
    already_covered_paise: int
    suggested_amount_paise: int


class OwnerStationFinanceOut(BaseModel):
    station_id: uuid.UUID
    station_name: str
    total_earnings_paise: int
    charging_revenue_paise: int
    parking_revenue_paise: int
    idle_fee_revenue_paise: int
    energy_sold_kwh: float
    charging_sessions_count: int
    paid_out_paise: int
    pending_payout_paise: int
