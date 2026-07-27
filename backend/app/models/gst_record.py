"""GST collected per payment, tracked separately from owner/platform earnings."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class GSTRecord(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "gst_records"
    __table_args__ = (
        Index("idx_gst_records_collected_at", "collected_at"),
    )

    payment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("payments.id"), nullable=False, unique=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id"), nullable=False)
    taxable_amount_paise: Mapped[int] = mapped_column(nullable=False)
    gst_percentage: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    gst_amount_paise: Mapped[int] = mapped_column(nullable=False)
    invoice_number: Mapped[str | None] = mapped_column(String(30))

    collected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
