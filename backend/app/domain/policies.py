"""Business policies: hold windows, pricing/quote, discovery defaults.

All monetary values are integer paise. Pure functions — no IO.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.models.enums import MembershipTier

HOLD_TTL_SECONDS = 300          # slot held while payment is pending
BOOKING_FEE_PAISE = 1000        # ₹10 convenience fee
SLOT_LOCK_TTL_MS = 10_000       # Redis lock window for booking create
LOCK_MAX_ATTEMPTS = 20          # bounded retry on a contended per-charger lock
LOCK_RETRY_DELAY_S = 0.08       # base delay between lock-acquire retries
LOCK_RETRY_JITTER_S = 0.05      # random jitter added to each retry delay
DEFAULT_DISCOVERY_RADIUS_KM = 5.0
MAX_DISCOVERY_RADIUS_KM = 50.0

# ── Rewards / Membership ─────────────────────────────────────────────────────
POINTS_PER_SESSION = 10
FIRST_BOOKING_BONUS_POINTS = 25
REFERRAL_BONUS_POINTS = 50
POINTS_TO_PAISE_RATE = 20        # 1 point ≈ ₹0.20 when redeemed
GOLD_TIER_POINTS_THRESHOLD = 500  # cumulative lifetime points needed for GOLD
SILVER_TIER_POINTS_THRESHOLD = 200


@dataclass(frozen=True)
class TierMeta:
    price_paise: int
    points_multiplier: float
    discount_pct: int


MEMBERSHIP_TIERS: dict[MembershipTier, TierMeta] = {
    MembershipTier.FREE:   TierMeta(price_paise=0,      points_multiplier=1.0, discount_pct=0),
    MembershipTier.SILVER: TierMeta(price_paise=19_900, points_multiplier=1.5, discount_pct=5),
    MembershipTier.GOLD:   TierMeta(price_paise=49_900, points_multiplier=2.0, discount_pct=10),
}


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
