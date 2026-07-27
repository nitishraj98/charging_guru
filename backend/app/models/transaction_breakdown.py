"""Per-payment fee breakdown — 1:1 child of Payment.

Kept as a separate table (not columns on Payment) so Payment stays focused on
gateway/lifecycle concerns (Razorpay IDs, status) while this table is the
financial ledger detail: every component of what the customer paid, plus the
owner/Charging Guru earnings split derived from it. Never mix the two splits.
"""
from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Index, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class TransactionBreakdown(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "transaction_breakdown"
    __table_args__ = (
        Index("idx_txn_breakdown_booking", "booking_id"),
    )

    payment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id"), nullable=False)

    energy_kwh: Mapped[float] = mapped_column(Numeric(8, 3), default=0, nullable=False)
    energy_cost_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    parking_fee_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    idle_fee_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    platform_fee_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    convenience_fee_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    gst_amount_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    discount_amount_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    total_amount_paise: Mapped[int] = mapped_column(nullable=False)  # must equal payments.amount

    owner_earnings_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    charging_guru_earnings_paise: Mapped[int] = mapped_column(default=0, nullable=False)

    coupon_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("coupons.id"))

    payment: Mapped["Payment"] = relationship(back_populates="breakdown")  # noqa: F821
