"""Booking slots — fixed time windows per charger.

A slot is uniquely identified by (charger_id, slot_start); booking the same
window therefore maps to one slot row, and the partial-unique index on
``bookings.slot_id`` (active states) guarantees no double-booking.
"""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class BookingSlot(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "booking_slots"
    __table_args__ = (
        UniqueConstraint("charger_id", "slot_start", name="uq_slot_charger_start"),
    )

    charger_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("chargers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    slot_start: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=False)
    slot_end: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
