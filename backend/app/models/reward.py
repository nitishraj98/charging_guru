"""Reward point ledger — one row per earn/redeem/expire event."""
from __future__ import annotations

import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import RewardTransactionType


class RewardTransaction(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "reward_transactions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[RewardTransactionType] = mapped_column(
        Enum(RewardTransactionType, name="reward_transaction_type"), nullable=False
    )
    points: Mapped[int] = mapped_column(Integer, nullable=False)  # signed: +earned, -redeemed/expired
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    booking_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("bookings.id"))
