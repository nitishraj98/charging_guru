"""Business policies: hold windows, pricing/quote, discovery defaults.

All monetary values are integer paise. Pure functions — no IO.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.models.enums import MembershipTier

HOLD_TTL_SECONDS = 300          # slot held while payment is pending
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


# Pricing (energy cost, parking/idle fees, platform/convenience fees, GST) has
# moved to app.domain.pricing.compute_pricing — the fixed BOOKING_FEE_PAISE
# convenience fee is now an admin-configurable PricingSettings row instead of
# a hardcoded constant.
