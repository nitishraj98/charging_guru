"""Single-row, admin-editable platform pricing/fee configuration.

All monetary fields are paise; percentages are NUMERIC(5,2). Nothing here is
hardcoded elsewhere — app/domain/pricing.py reads this row (via
PricingSettingsService.to_platform_config()) on every quote/checkout
computation.
"""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class PricingSettings(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "pricing_settings"

    platform_fee_mode: Mapped[str] = mapped_column(String(10), default="FIXED", nullable=False)
    platform_fee_fixed_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    platform_fee_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    platform_fee_min_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    platform_fee_max_paise: Mapped[int] = mapped_column(default=0, nullable=False)  # 0 = uncapped
    platform_fee_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    convenience_fee_mode: Mapped[str] = mapped_column(String(10), default="FIXED", nullable=False)
    convenience_fee_fixed_paise: Mapped[int] = mapped_column(default=1000, nullable=False)
    convenience_fee_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    convenience_fee_min_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    convenience_fee_max_paise: Mapped[int] = mapped_column(default=0, nullable=False)
    convenience_fee_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    gst_percentage: Mapped[float] = mapped_column(Numeric(5, 2), default=18.00, nullable=False)
    gst_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    parking_fee_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    idle_fee_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    idle_grace_minutes: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    # Scaffolding — not wired to any pricing logic yet.
    subscription_revenue_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ad_revenue_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    updated_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
