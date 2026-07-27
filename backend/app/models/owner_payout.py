"""Manual owner payout ledger — no real bank-transfer integration.

Admin creates a payout (PENDING/SCHEDULED) covering a period, then marks it
PAID once the transfer is done out-of-band. `station_id` is nullable since a
payout can span every station an owner runs.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import PayoutStatus


class OwnerPayout(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "owner_payouts"
    __table_args__ = (
        Index("idx_owner_payouts_owner", "owner_id", "created_at"),
        Index("idx_owner_payouts_status", "status"),
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    station_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("stations.id"))
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    amount_paise: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[PayoutStatus] = mapped_column(
        Enum(PayoutStatus, name="payout_status"), default=PayoutStatus.PENDING, nullable=False
    )
    payout_method: Mapped[str | None] = mapped_column(String(20))
    reference_note: Mapped[str | None] = mapped_column(String(200))
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
