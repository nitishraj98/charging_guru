"""Charging stations.

Geolocation is stored as plain ``lat``/``lng`` (float) so discovery works on
both PostgreSQL and SQLite (tests) via a bounding-box + Haversine query. A
PostGIS ``geography`` column + GiST index is layered on in production for
large-scale spatial queries (see docs/04-database-design.md).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import StationStatus

if TYPE_CHECKING:
    from app.models.charger import Charger


class Station(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "stations"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    address: Mapped[str] = mapped_column(String(400), nullable=False)
    city: Mapped[str | None] = mapped_column(String(80))
    state: Mapped[str | None] = mapped_column(String(80))
    pincode: Mapped[str | None] = mapped_column(String(12))
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    amenities: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    status: Mapped[StationStatus] = mapped_column(
        Enum(StationStatus, name="station_status"),
        default=StationStatus.PENDING_APPROVAL,
        nullable=False,
    )
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    chargers: Mapped[list["Charger"]] = relationship(
        back_populates="station", cascade="all, delete-orphan", lazy="selectin"
    )
