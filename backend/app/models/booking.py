"""Bookings + charger status history."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import BookingStatus, ChargerStatus

if TYPE_CHECKING:
    from app.models.charger import Charger
    from app.models.slot import BookingSlot
    from app.models.station import Station

# Partial-unique guard: at most one *active* booking per slot. Works on both
# PostgreSQL and SQLite (both support partial indexes). This is the ultimate
# defence against double-booking, complementing the Redis slot lock.
_ACTIVE_SQL = (
    "status IN ('PENDING_PAYMENT','CONFIRMED','CHECKED_IN','IN_PROGRESS')"
)


class Booking(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "bookings"
    __table_args__ = (
        Index(
            "uq_active_booking_slot",
            "slot_id",
            unique=True,
            postgresql_where=text(_ACTIVE_SQL),
            sqlite_where=text(_ACTIVE_SQL),
        ),
        Index("idx_bookings_user", "user_id", "created_at"),
        Index("idx_bookings_station", "station_id", "created_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("vehicles.id"))
    station_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stations.id"), nullable=False)
    charger_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chargers.id"), nullable=False)
    slot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("booking_slots.id"), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status"),
        default=BookingStatus.PENDING_PAYMENT,
        nullable=False,
    )
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)  # paise
    energy_kwh_est: Mapped[float | None] = mapped_column()
    hold_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    qr_jti: Mapped[uuid.UUID | None] = mapped_column()

    charger: Mapped["Charger"] = relationship(lazy="selectin")
    station: Mapped["Station"] = relationship(lazy="selectin")
    slot: Mapped["BookingSlot"] = relationship(lazy="selectin")

    @property
    def slot_start(self) -> datetime:
        return self.slot.slot_start

    @property
    def slot_end(self) -> datetime:
        return self.slot.slot_end


class ChargerStatusHistory(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "charger_status_history"

    charger_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("chargers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    old_status: Mapped[ChargerStatus | None] = mapped_column(
        Enum(ChargerStatus, name="charger_status")
    )
    new_status: Mapped[ChargerStatus] = mapped_column(
        Enum(ChargerStatus, name="charger_status"), nullable=False
    )
    changed_by: Mapped[uuid.UUID | None] = mapped_column()
    reason: Mapped[str | None] = mapped_column(String(200))
