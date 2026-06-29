"""Schemas for owner onboarding applications."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, field_validator

T = TypeVar("T")


class OwnerApplicationIn(BaseModel):
    business_name: str
    gst_number: str | None = None
    city: str
    address: str
    planned_stations: int = 1
    message: str | None = None

    @field_validator("business_name", "city", "address")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field must not be blank.")
        return v.strip()

    @field_validator("planned_stations")
    @classmethod
    def positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("planned_stations must be >= 1.")
        return v


class OwnerApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    business_name: str
    gst_number: str | None
    city: str
    address: str
    planned_stations: int
    message: str | None
    status: str
    review_note: str | None
    reviewed_at: datetime | None
    created_at: datetime


class ReviewIn(BaseModel):
    note: str | None = None


class PagedApplications(BaseModel, Generic[T]):
    items: list[OwnerApplicationOut]
    total: int
    page: int
    per_page: int
    pages: int
