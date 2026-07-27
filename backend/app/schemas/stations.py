"""Station & discovery DTOs."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field

from app.models.enums import ChargerStatus, ConnectorType, StationStatus
from app.schemas.common import ORMModel, StrictModel


class ChargerOut(ORMModel):
    id: uuid.UUID
    label: str
    charger_type: str
    power_kw: float
    connector_type: ConnectorType
    status: ChargerStatus
    price_per_kwh: int  # paise
    parking_fee_paise: int = 0
    idle_fee_paise_per_min: int = 0


class StationOut(ORMModel):
    id: uuid.UUID
    name: str
    address: str
    city: str | None
    lat: float
    lng: float
    amenities: list[str]
    status: StationStatus
    rating_avg: float
    rating_count: int


class StationDetailOut(StationOut):
    chargers: list[ChargerOut] = []


class StationNearbyOut(StationOut):
    distance_km: float
    available_chargers: int
    total_chargers: int


class ChargerCreateIn(StrictModel):
    label: str = Field(..., max_length=40)
    charger_type: str = Field("DC", pattern="^(AC|DC)$")
    power_kw: float = Field(..., gt=0, le=400)
    connector_type: ConnectorType
    price_per_kwh: int = Field(..., gt=0, description="paise per kWh")
    parking_fee_paise: int = Field(0, ge=0, description="flat paise per booking")
    idle_fee_paise_per_min: int = Field(0, ge=0, description="paise per minute beyond grace period")


class StationCreateIn(StrictModel):
    name: str = Field(..., max_length=160)
    address: str = Field(..., max_length=400)
    city: str | None = Field(None, max_length=80)
    state: str | None = Field(None, max_length=80)
    pincode: str | None = Field(None, max_length=12)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    amenities: list[str] = Field(default_factory=list)
    chargers: list[ChargerCreateIn] = Field(default_factory=list)


class ChargerStatusIn(StrictModel):
    status: ChargerStatus
    reason: str | None = Field(None, max_length=200)


class SlotOut(ORMModel):
    slot_start: str  # ISO
    slot_end: str
    available: bool


class ReviewCreateIn(StrictModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=1000)


class ReviewOut(ORMModel):
    id: uuid.UUID
    user_id: uuid.UUID
    rating: int
    comment: str | None
    created_at: datetime


class StationStatsOut(ORMModel):
    sessions_today: int
    uptime_pct: float
