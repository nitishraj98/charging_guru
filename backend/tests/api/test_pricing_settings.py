"""Admin pricing/fee configuration endpoints — GET/PATCH + RBAC, and an
integration check that a config change actually flows into a booking's
computed breakdown via BookingService (not just stored)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

USER_PHONE = "+919876543210"


async def _login(client, phone=USER_PHONE) -> dict:
    r = await client.post("/api/v1/auth/otp/request", json={"phone": phone})
    code = r.json()["debug_code"]
    r = await client.post(
        "/api/v1/auth/otp/verify",
        json={"request_id": r.json()["request_id"], "code": code},
    )
    return r.json()


def _auth(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def _future_slot() -> str:
    d = (datetime.now(timezone.utc) + timedelta(days=1)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )
    return d.isoformat()


@pytest.mark.asyncio
async def test_get_pricing_settings_requires_admin(client):
    user = await _login(client)
    r = await client.get("/api/v1/admin/pricing/settings", headers=_auth(user))
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_get_pricing_settings_defaults(client, admin_tokens):
    r = await client.get("/api/v1/admin/pricing/settings", headers=_auth(admin_tokens))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["platform_fee_enabled"] is False
    assert data["gst_enabled"] is False
    assert data["convenience_fee_enabled"] is True
    assert data["convenience_fee_fixed_paise"] == 1000


@pytest.mark.asyncio
async def test_update_pricing_settings_partial(client, admin_tokens):
    r = await client.patch(
        "/api/v1/admin/pricing/settings",
        json={"gst_enabled": True, "gst_percentage": 18.0},
        headers=_auth(admin_tokens),
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["gst_enabled"] is True
    assert data["gst_percentage"] == 18.0
    # Untouched fields keep their previous values.
    assert data["convenience_fee_enabled"] is True


@pytest.mark.asyncio
async def test_non_admin_cannot_update_pricing_settings(client):
    user = await _login(client)
    r = await client.patch(
        "/api/v1/admin/pricing/settings",
        json={"gst_enabled": True},
        headers=_auth(user),
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_pricing_settings_change_flows_into_booking_breakdown(client, admin_tokens, seed_station):
    """Enabling platform fee via the admin endpoint should be reflected in the
    breakdown of the very next booking created — proves BookingService reads
    live settings, not a hardcoded/cached value."""
    r = await client.patch(
        "/api/v1/admin/pricing/settings",
        json={
            "platform_fee_enabled": True,
            "platform_fee_mode": "FIXED",
            "platform_fee_fixed_paise": 500,
        },
        headers=_auth(admin_tokens),
    )
    assert r.status_code == 200, r.text

    user = await _login(client)
    r = await client.post(
        "/api/v1/bookings",
        json={"charger_id": seed_station["charger_id"], "slot_start": _future_slot()},
        headers=_auth(user),
    )
    assert r.status_code == 201, r.text
    breakdown = r.json()["breakdown"]
    assert breakdown["platform_fee_paise"] == 500
    assert breakdown["charging_guru_earnings_paise"] >= 500
