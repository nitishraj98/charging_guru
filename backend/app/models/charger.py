"""Chargers belonging to a station."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import ChargerStatus, ConnectorType

if TYPE_CHECKING:
    from app.models.station import Station


class Charger(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "chargers"
    __table_args__ = (UniqueConstraint("station_id", "label", name="uq_charger_label"),)

    station_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(40), nullable=False)
    charger_type: Mapped[str] = mapped_column(String(8), default="DC", nullable=False)  # AC/DC
    power_kw: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    connector_type: Mapped[ConnectorType] = mapped_column(
        Enum(ConnectorType, name="connector_type"), nullable=False
    )
    status: Mapped[ChargerStatus] = mapped_column(
        Enum(ChargerStatus, name="charger_status"),
        default=ChargerStatus.AVAILABLE,
        nullable=False,
    )
    price_per_kwh: Mapped[int] = mapped_column(BigInteger, nullable=False)  # paise
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    station: Mapped["Station"] = relationship(back_populates="chargers")
