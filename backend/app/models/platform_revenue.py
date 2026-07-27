"""Append-only ledger of Charging Guru's own earnings, one row per captured
payment. Kept separate from transaction_breakdown so admin aggregate queries
("Charging Guru Revenue" KPI/section) don't have to join through
payments/bookings every time.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class PlatformRevenue(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "platform_revenue"
    __table_args__ = (
        Index("idx_platform_revenue_recorded_at", "recorded_at"),
        Index("idx_platform_revenue_station", "station_id"),
    )

    payment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("payments.id"), nullable=False, unique=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id"), nullable=False)
    station_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stations.id"), nullable=False)

    platform_fee_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    convenience_fee_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    subscription_fee_paise: Mapped[int] = mapped_column(default=0, nullable=False)  # scaffolding
    ad_revenue_paise: Mapped[int] = mapped_column(default=0, nullable=False)  # scaffolding
    total_paise: Mapped[int] = mapped_column(default=0, nullable=False)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
