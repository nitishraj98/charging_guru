"""Booking DTOs."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field

from app.models.enums import BookingStatus
from app.schemas.common import ORMModel, StrictModel
from app.schemas.stations import ChargerOut, StationOut


class BookingCreateIn(StrictModel):
    charger_id: uuid.UUID
    slot_start: datetime = Field(..., description="ISO 8601 start of a 30-min slot window")
    vehicle_id: uuid.UUID | None = None
    duration_minutes: int = Field(30, ge=15, le=180)


class BookingOut(ORMModel):
    id: uuid.UUID
    station_id: uuid.UUID
    charger_id: uuid.UUID
    slot_id: uuid.UUID
    status: BookingStatus
    amount: int  # paise
    energy_kwh_est: float | None
    hold_expires_at: datetime | None
    created_at: datetime
    charger: ChargerOut | None = None
    station: StationOut | None = None
