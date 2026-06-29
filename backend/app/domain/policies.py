"""Business policies: hold windows, pricing/quote, discovery defaults.

All monetary values are integer paise. Pure functions — no IO.
"""
from __future__ import annotations

from dataclasses import dataclass

HOLD_TTL_SECONDS = 300          # slot held while payment is pending
BOOKING_FEE_PAISE = 1000        # ₹10 convenience fee
SLOT_LOCK_TTL_MS = 10_000       # Redis lock window for booking create
DEFAULT_DISCOVERY_RADIUS_KM = 5.0
MAX_DISCOVERY_RADIUS_KM = 50.0


@dataclass(frozen=True)
class Quote:
    energy_kwh: float
    energy_cost_paise: int
    booking_fee_paise: int
    total_paise: int


def quote_booking(power_kw: float, duration_minutes: int, price_per_kwh_paise: int) -> Quote:
    """Estimate energy + cost for a session.

    Assumes the charger delivers near its rated power for the window (a simple
    MVP model; refined later by the dynamic-pricing / telemetry services).
    """
    energy_kwh = round(float(power_kw) * (duration_minutes / 60.0), 3)
    energy_cost = round(energy_kwh * price_per_kwh_paise)
    total = energy_cost + BOOKING_FEE_PAISE
    return Quote(
        energy_kwh=energy_kwh,
        energy_cost_paise=energy_cost,
        booking_fee_paise=BOOKING_FEE_PAISE,
        total_paise=total,
    )
