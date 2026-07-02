"""Membership tier upgrade payment — one row per Razorpay order, mirrors
Payment's lifecycle but for tier purchases instead of bookings."""
from __future__ import annotations

import uuid

from sqlalchemy import BigInteger, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import MembershipTier, PaymentStatus


class MembershipPayment(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "membership_payments"
    __table_args__ = (
        Index("idx_membership_payments_user", "user_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    tier: Mapped[MembershipTier] = mapped_column(
        Enum(MembershipTier, name="membership_tier"), nullable=False
    )
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)  # paise

    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        default=PaymentStatus.PENDING,
        nullable=False,
    )

    razorpay_order_id: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    razorpay_signature: Mapped[str | None] = mapped_column(String(200))
