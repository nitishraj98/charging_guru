"""Scaffolding for future coupon/discount support — not wired to any
service/route yet. Referenced (nullable) from transaction_breakdown.coupon_id.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class Coupon(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "coupons"

    code: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    discount_type: Mapped[str] = mapped_column(String(10), default="FIXED", nullable=False)  # FIXED | PERCENTAGE
    discount_value: Mapped[int] = mapped_column(default=0, nullable=False)
    max_discount_paise: Mapped[int | None] = mapped_column()
    active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
