"""Owner-scoped finance summary — enforces that owners can never see
platform/convenience fee or Charging Guru revenue fields (requirement 7).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

USER_PHONE = "+919876543210"
_VALID_SIG = "valid_sig"

_ALLOWED_FIELDS = {
    "total_earnings_paise",
    "charging_revenue_paise",
    "parking_revenue_paise",
    "idle_fee_revenue_paise",
    "pending_payouts_paise",
    "completed_payouts_paise",
    "charging_sessions_count",
    "energy_sold_kwh",
}


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
async def test_owner_finance_summary_field_set_is_exactly_the_allowed_fields(client, seed_station):
    owner = await _login(client, seed_station["owner_phone"])
    r = await client.get("/api/v1/owner/finance/summary", headers=_auth(owner))
    assert r.status_code == 200, r.text
    assert set(r.json().keys()) == _ALLOWED_FIELDS


@pytest.mark.asyncio
async def test_owner_finance_summary_reflects_captured_payment(client, admin_tokens, seed_station):
    # Enable a platform fee so we can prove it never leaks into this response.
    await client.patch(
        "/api/v1/admin/pricing/settings",
        json={"platform_fee_enabled": True, "platform_fee_mode": "FIXED", "platform_fee_fixed_paise": 500},
        headers=_auth(admin_tokens),
    )

    user = await _login(client)
    r = await client.post(
        "/api/v1/bookings",
        json={"charger_id": seed_station["charger_id"], "slot_start": _future_slot()},
        headers=_auth(user),
    )
    booking = r.json()
    r = await client.post(
        "/api/v1/payments/order", json={"booking_id": booking["id"]}, headers=_auth(user),
    )
    order = r.json()
    r = await client.post(
        "/api/v1/payments/verify",
        json={
            "razorpay_order_id": order["razorpay_order_id"],
            "razorpay_payment_id": "pay_test_owner_finance",
            "razorpay_signature": _VALID_SIG,
        },
        headers=_auth(user),
    )
    assert r.status_code == 200, r.text

    owner = await _login(client, seed_station["owner_phone"])
    r = await client.get("/api/v1/owner/finance/summary", headers=_auth(owner))
    data = r.json()
    assert set(data.keys()) == _ALLOWED_FIELDS
    assert data["charging_revenue_paise"] > 0
    assert data["total_earnings_paise"] == (
        data["charging_revenue_paise"] + data["parking_revenue_paise"] + data["idle_fee_revenue_paise"]
    )
    # The platform fee we just enabled must never surface here.
    assert "platform_fee_paise" not in data
    assert "convenience_fee_paise" not in data
    assert "charging_guru_earnings_paise" not in data


@pytest.mark.asyncio
async def test_non_owner_cannot_access_owner_finance_summary(client):
    user = await _login(client)
    r = await client.get("/api/v1/owner/finance/summary", headers=_auth(user))
    assert r.status_code == 403
