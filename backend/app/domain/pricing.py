"""Marketplace pricing engine: the single source of truth for the Grand Total
formula. Pure functions — no IO — mirroring:

    Grand Total = Energy Cost + Parking Fee + Idle Fee
                  + Platform Fee + Convenience Fee + GST - Discount

GST is computed on the full pre-tax subtotal (energy + parking + idle +
platform + convenience - discount). Owner earnings = energy + parking + idle.
Charging Guru earnings = platform + convenience (+ future subscription/ad,
always 0 here). Never mix the two.

Called from three places (see app/services/booking_service.py,
payment_service.py, session_service.py):
  1. Booking creation — provisional quote (idle=0, energy=estimate). Becomes
     the amount actually charged via Razorpay.
  2. Payment capture — recomputed with the *same* inputs as (1), so it's
     byte-identical; persisted as the authoritative transaction_breakdown row.
  3. Session complete — recomputed with actual energy/idle minutes, for
     invoice display only. Never re-persisted to transaction_breakdown/payments.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PricingBreakdown:
    energy_kwh: float
    energy_cost_paise: int
    parking_fee_paise: int
    idle_fee_paise: int
    platform_fee_paise: int
    convenience_fee_paise: int
    gst_amount_paise: int
    discount_amount_paise: int
    total_paise: int
    owner_earnings_paise: int
    charging_guru_earnings_paise: int


@dataclass(frozen=True)
class ChargerPricing:
    power_kw: float
    price_per_kwh_paise: int
    parking_fee_paise: int
    idle_fee_paise_per_min: int


@dataclass(frozen=True)
class PlatformPricingConfig:
    platform_fee_mode: str  # "FIXED" | "PERCENTAGE"
    platform_fee_fixed_paise: int
    platform_fee_percent: float
    platform_fee_min_paise: int
    platform_fee_max_paise: int  # 0 = uncapped
    platform_fee_enabled: bool

    convenience_fee_mode: str
    convenience_fee_fixed_paise: int
    convenience_fee_percent: float
    convenience_fee_min_paise: int
    convenience_fee_max_paise: int
    convenience_fee_enabled: bool

    gst_percentage: float
    gst_enabled: bool

    parking_fee_enabled: bool
    idle_fee_enabled: bool


def _compute_fee(
    *, mode: str, fixed_paise: int, percent: float, base_paise: int,
    min_paise: int, max_paise: int, enabled: bool,
) -> int:
    """Shared fixed/percentage fee resolver with min/max clamping.
    Returns 0 if disabled. max_paise of 0 means uncapped."""
    if not enabled:
        return 0
    if mode == "PERCENTAGE":
        fee = round(base_paise * (percent / 100.0))
    else:
        fee = fixed_paise
    if min_paise > 0:
        fee = max(fee, min_paise)
    if max_paise > 0:
        fee = min(fee, max_paise)
    return max(0, fee)


def compute_pricing(
    charger: ChargerPricing,
    config: PlatformPricingConfig,
    *,
    duration_minutes: int,
    energy_kwh_override: float | None = None,
    idle_minutes: int = 0,
    discount_paise: int = 0,
) -> PricingBreakdown:
    """Compute the full itemized breakdown. `energy_kwh_override` and
    `idle_minutes` let callers pass actual post-session figures; when omitted,
    energy is estimated from rated power * duration and idle is 0 (the
    provisional, pre-session quote)."""
    energy_kwh = (
        energy_kwh_override
        if energy_kwh_override is not None
        else round(float(charger.power_kw) * (duration_minutes / 60.0), 3)
    )
    energy_cost_paise = round(energy_kwh * charger.price_per_kwh_paise)

    parking_fee_paise = charger.parking_fee_paise if config.parking_fee_enabled else 0

    idle_fee_paise = (
        max(0, idle_minutes) * charger.idle_fee_paise_per_min
        if config.idle_fee_enabled
        else 0
    )

    platform_fee_paise = _compute_fee(
        mode=config.platform_fee_mode,
        fixed_paise=config.platform_fee_fixed_paise,
        percent=float(config.platform_fee_percent),
        base_paise=energy_cost_paise,
        min_paise=config.platform_fee_min_paise,
        max_paise=config.platform_fee_max_paise,
        enabled=config.platform_fee_enabled,
    )
    convenience_fee_paise = _compute_fee(
        mode=config.convenience_fee_mode,
        fixed_paise=config.convenience_fee_fixed_paise,
        percent=float(config.convenience_fee_percent),
        base_paise=energy_cost_paise,
        min_paise=config.convenience_fee_min_paise,
        max_paise=config.convenience_fee_max_paise,
        enabled=config.convenience_fee_enabled,
    )

    discount_paise = max(0, discount_paise)
    pretax_subtotal = (
        energy_cost_paise + parking_fee_paise + idle_fee_paise
        + platform_fee_paise + convenience_fee_paise - discount_paise
    )
    pretax_subtotal = max(0, pretax_subtotal)

    gst_amount_paise = (
        round(pretax_subtotal * (float(config.gst_percentage) / 100.0))
        if config.gst_enabled
        else 0
    )

    total_paise = pretax_subtotal + gst_amount_paise
    owner_earnings_paise = energy_cost_paise + parking_fee_paise + idle_fee_paise
    charging_guru_earnings_paise = platform_fee_paise + convenience_fee_paise

    return PricingBreakdown(
        energy_kwh=energy_kwh,
        energy_cost_paise=energy_cost_paise,
        parking_fee_paise=parking_fee_paise,
        idle_fee_paise=idle_fee_paise,
        platform_fee_paise=platform_fee_paise,
        convenience_fee_paise=convenience_fee_paise,
        gst_amount_paise=gst_amount_paise,
        discount_amount_paise=discount_paise,
        total_paise=total_paise,
        owner_earnings_paise=owner_earnings_paise,
        charging_guru_earnings_paise=charging_guru_earnings_paise,
    )
