"""Unit tests for the pricing engine (app.domain.pricing.compute_pricing) —
pure functions, no DB/IO. Everything downstream (booking creation, payment
capture, invoicing) depends on this being correct.
"""
from __future__ import annotations

from app.domain.pricing import ChargerPricing, PlatformPricingConfig, compute_pricing

CHARGER = ChargerPricing(
    power_kw=60.0,
    price_per_kwh_paise=1800,  # ₹18/kWh
    parking_fee_paise=2000,  # ₹20
    idle_fee_paise_per_min=500,  # ₹5/min
)

ALL_DISABLED = PlatformPricingConfig(
    platform_fee_mode="FIXED", platform_fee_fixed_paise=0, platform_fee_percent=0,
    platform_fee_min_paise=0, platform_fee_max_paise=0, platform_fee_enabled=False,
    convenience_fee_mode="FIXED", convenience_fee_fixed_paise=0, convenience_fee_percent=0,
    convenience_fee_min_paise=0, convenience_fee_max_paise=0, convenience_fee_enabled=False,
    gst_percentage=0, gst_enabled=False,
    parking_fee_enabled=False, idle_fee_enabled=False,
)


def _config(**overrides) -> PlatformPricingConfig:
    base = dict(
        platform_fee_mode="FIXED", platform_fee_fixed_paise=0, platform_fee_percent=0,
        platform_fee_min_paise=0, platform_fee_max_paise=0, platform_fee_enabled=False,
        convenience_fee_mode="FIXED", convenience_fee_fixed_paise=1000, convenience_fee_percent=0,
        convenience_fee_min_paise=0, convenience_fee_max_paise=0, convenience_fee_enabled=True,
        gst_percentage=18.0, gst_enabled=False,
        parking_fee_enabled=True, idle_fee_enabled=True,
    )
    base.update(overrides)
    return PlatformPricingConfig(**base)


def test_energy_cost_from_rated_power_and_duration():
    b = compute_pricing(CHARGER, ALL_DISABLED, duration_minutes=60)
    assert b.energy_kwh == 60.0
    assert b.energy_cost_paise == 60.0 * 1800
    assert b.parking_fee_paise == 0
    assert b.idle_fee_paise == 0
    assert b.platform_fee_paise == 0
    assert b.convenience_fee_paise == 0
    assert b.gst_amount_paise == 0
    assert b.total_paise == b.energy_cost_paise
    assert b.owner_earnings_paise == b.energy_cost_paise
    assert b.charging_guru_earnings_paise == 0


def test_all_disabled_matches_old_flat_energy_only_behavior():
    """With every fee disabled, total == energy cost — same as the pre-
    marketplace-redesign behavior (before BOOKING_FEE_PAISE existed)."""
    b = compute_pricing(CHARGER, ALL_DISABLED, duration_minutes=30)
    assert b.total_paise == b.energy_cost_paise
    assert b.charging_guru_earnings_paise == 0


def test_parking_and_idle_fee_included_when_enabled():
    config = _config(convenience_fee_enabled=False)
    b = compute_pricing(CHARGER, config, duration_minutes=60, idle_minutes=10)
    assert b.parking_fee_paise == 2000
    assert b.idle_fee_paise == 10 * 500
    assert b.owner_earnings_paise == b.energy_cost_paise + 2000 + 5000
    assert b.total_paise == b.owner_earnings_paise  # no platform/convenience/gst


def test_idle_fee_zero_when_globally_disabled_even_if_charger_configures_it():
    config = _config(idle_fee_enabled=False, convenience_fee_enabled=False)
    b = compute_pricing(CHARGER, config, duration_minutes=60, idle_minutes=10)
    assert b.idle_fee_paise == 0


def test_convenience_fee_fixed():
    config = _config(convenience_fee_fixed_paise=1000, convenience_fee_enabled=True)
    b = compute_pricing(CHARGER, config, duration_minutes=30)
    assert b.convenience_fee_paise == 1000
    assert b.charging_guru_earnings_paise == 1000


def test_platform_fee_percentage_of_energy_cost():
    config = _config(
        platform_fee_mode="PERCENTAGE", platform_fee_percent=5.0, platform_fee_enabled=True,
        convenience_fee_enabled=False,
    )
    b = compute_pricing(CHARGER, config, duration_minutes=60)
    expected_platform_fee = round(b.energy_cost_paise * 0.05)
    assert b.platform_fee_paise == expected_platform_fee
    assert b.charging_guru_earnings_paise == expected_platform_fee


def test_platform_fee_percentage_clamped_to_min():
    config = _config(
        platform_fee_mode="PERCENTAGE", platform_fee_percent=0.1, platform_fee_enabled=True,
        platform_fee_min_paise=500, convenience_fee_enabled=False,
    )
    b = compute_pricing(CHARGER, config, duration_minutes=15)  # small energy cost
    assert b.platform_fee_paise == 500


def test_platform_fee_percentage_clamped_to_max():
    config = _config(
        platform_fee_mode="PERCENTAGE", platform_fee_percent=50.0, platform_fee_enabled=True,
        platform_fee_max_paise=200, convenience_fee_enabled=False,
    )
    b = compute_pricing(CHARGER, config, duration_minutes=60)
    assert b.platform_fee_paise == 200


def test_platform_fee_max_zero_means_uncapped():
    config = _config(
        platform_fee_mode="PERCENTAGE", platform_fee_percent=50.0, platform_fee_enabled=True,
        platform_fee_max_paise=0, convenience_fee_enabled=False,
    )
    b = compute_pricing(CHARGER, config, duration_minutes=60)
    assert b.platform_fee_paise == round(b.energy_cost_paise * 0.5)


def test_convenience_fee_fixed_mode_disabled_by_flag_regardless_of_value():
    config = _config(convenience_fee_fixed_paise=9999, convenience_fee_enabled=False)
    b = compute_pricing(CHARGER, config, duration_minutes=30)
    assert b.convenience_fee_paise == 0


def test_gst_computed_on_full_pretax_subtotal():
    config = _config(
        gst_enabled=True, gst_percentage=18.0,
        platform_fee_enabled=True, platform_fee_fixed_paise=500,
        convenience_fee_enabled=True, convenience_fee_fixed_paise=1000,
    )
    b = compute_pricing(CHARGER, config, duration_minutes=60, idle_minutes=5)
    subtotal = (
        b.energy_cost_paise + b.parking_fee_paise + b.idle_fee_paise
        + b.platform_fee_paise + b.convenience_fee_paise
    )
    assert b.gst_amount_paise == round(subtotal * 0.18)
    assert b.total_paise == subtotal + b.gst_amount_paise


def test_discount_reduces_pretax_subtotal_and_gst_base():
    config = _config(gst_enabled=True, gst_percentage=10.0, convenience_fee_enabled=False)
    without_discount = compute_pricing(CHARGER, config, duration_minutes=60)
    with_discount = compute_pricing(CHARGER, config, duration_minutes=60, discount_paise=1000)
    assert with_discount.discount_amount_paise == 1000
    assert with_discount.total_paise < without_discount.total_paise
    assert with_discount.gst_amount_paise < without_discount.gst_amount_paise


def test_discount_cannot_push_subtotal_negative():
    config = _config(convenience_fee_enabled=False)
    b = compute_pricing(CHARGER, config, duration_minutes=15, discount_paise=10_000_000)
    assert b.total_paise == 0


def test_owner_and_charging_guru_earnings_never_overlap():
    config = _config(
        platform_fee_enabled=True, platform_fee_fixed_paise=300,
        convenience_fee_enabled=True, convenience_fee_fixed_paise=1000,
        gst_enabled=True, gst_percentage=18.0,
    )
    b = compute_pricing(CHARGER, config, duration_minutes=60, idle_minutes=5)
    assert b.owner_earnings_paise == b.energy_cost_paise + b.parking_fee_paise + b.idle_fee_paise
    assert b.charging_guru_earnings_paise == b.platform_fee_paise + b.convenience_fee_paise
    # GST is tracked separately, not folded into either earnings split.
    assert b.owner_earnings_paise + b.charging_guru_earnings_paise + b.gst_amount_paise == (
        b.total_paise - b.discount_amount_paise
    )


def test_energy_kwh_override_used_for_actual_post_session_billing():
    config = _config(convenience_fee_enabled=False)
    b = compute_pricing(CHARGER, config, duration_minutes=60, energy_kwh_override=45.5)
    assert b.energy_kwh == 45.5
    assert b.energy_cost_paise == round(45.5 * 1800)
