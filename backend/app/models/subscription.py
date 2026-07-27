"""Scaffolding for future recurring subscription support — not wired to any
service/route yet. Distinct from MembershipPayment (a one-time tier purchase).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class Subscription(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    plan_code: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(12), default="INACTIVE", nullable=False)
    renewal_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    amount_paise: Mapped[int] = mapped_column(default=0, nullable=False)
