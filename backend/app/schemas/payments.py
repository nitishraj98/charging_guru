"""Payment, QR-verify, and session DTOs."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import BookingStatus, PaymentStatus
from app.schemas.common import ORMModel, StrictModel
from app.schemas.pricing import PricingBreakdownOut


# ── Payment order ─────────────────────────────────────────────────────────────

class PaymentOrderIn(StrictModel):
    booking_id: uuid.UUID


class PaymentOrderOut(ORMModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    razorpay_order_id: str
    amount: int  # paise
    status: PaymentStatus
    created_at: datetime
    breakdown: PricingBreakdownOut | None = None


# ── Payment verify (client-side signature confirmation) ───────────────────────

class PaymentVerifyIn(StrictModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerifyOut(BaseModel):
    """Not an ORM row — assembled by the API layer from service results."""
    model_config = {"from_attributes": True}

    booking_id: uuid.UUID
    booking_status: BookingStatus
    qr_token: str
    breakdown: PricingBreakdownOut


# ── QR check-in ───────────────────────────────────────────────────────────────

class QRVerifyIn(StrictModel):
    qr_token: str


class QRVerifyOut(ORMModel):
    id: uuid.UUID
    status: BookingStatus
    charger_id: uuid.UUID
    station_id: uuid.UUID


# ── Charging session ──────────────────────────────────────────────────────────

class SessionOut(ORMModel):
    id: uuid.UUID
    status: BookingStatus
    charger_id: uuid.UUID
    station_id: uuid.UUID
    amount: int
