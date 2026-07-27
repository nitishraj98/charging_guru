"""Scaffolding for future referral-reward payouts — not wired to any
service/route yet. Distinct from RewardTransaction (the points ledger)."""
from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class ReferralReward(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "referral_rewards"

    referrer_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    referred_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    reward_amount_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(12), default="PENDING", nullable=False)
