"""Reward + membership DTOs."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field

from app.models.enums import MembershipTier, RewardTransactionType
from app.schemas.common import ORMModel, StrictModel


class RewardSummaryOut(ORMModel):
    points: int
    tier: MembershipTier
    next_tier: MembershipTier | None
    points_to_next: int
    referral_code: str


class RewardTransactionOut(ORMModel):
    id: uuid.UUID
    type: RewardTransactionType
    points: int
    description: str
    created_at: datetime


class RedeemIn(StrictModel):
    points: int = Field(..., gt=0)


class MembershipTierOut(ORMModel):
    tier: MembershipTier
    price_paise: int
    points_multiplier: float
    discount_pct: int


class MembershipMeOut(ORMModel):
    tier: MembershipTier
    price_paise: int
    points_multiplier: float
    discount_pct: int


class MembershipUpgradeIn(StrictModel):
    tier: MembershipTier
