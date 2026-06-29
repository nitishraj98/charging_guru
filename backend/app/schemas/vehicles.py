"""Vehicle DTOs."""
from __future__ import annotations

import uuid

from pydantic import Field

from app.models.enums import ConnectorType
from app.schemas.common import ORMModel, StrictModel


class VehicleOut(ORMModel):
    id: uuid.UUID
    brand: str
    model: str
    battery_kwh: float
    range_km: int | None
    connector_type: ConnectorType
    is_default: bool


class VehicleCreateIn(StrictModel):
    brand: str = Field(..., max_length=80)
    model: str = Field(..., max_length=80)
    battery_kwh: float = Field(..., gt=0, le=300)
    range_km: int | None = Field(default=None, gt=0, le=2000)
    connector_type: ConnectorType


class VehicleUpdateIn(StrictModel):
    brand: str | None = Field(default=None, max_length=80)
    model: str | None = Field(default=None, max_length=80)
    battery_kwh: float | None = Field(default=None, gt=0, le=300)
    range_km: int | None = Field(default=None, gt=0, le=2000)
    connector_type: ConnectorType | None = None
