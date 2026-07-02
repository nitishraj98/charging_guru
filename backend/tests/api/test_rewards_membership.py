"""Reward points (earn on session completion, first-booking bonus, referral
bonus, redeem) + membership tier catalog/upgrade."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.user import User

USER_PHONE = "+919876543210"
_VALID_SIG = "valid_sig"


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


_payment_seq = 0


async def _completed_booking(client, seed_station, user_tokens) -> str:
    global _payment_seq
    _payment_seq += 1

    r = await client.post(
        "/api/v1/bookings",
        json={"charger_id": seed_station["charger_id"], "slot_start": _future_slot()},
        headers=_auth(user_tokens),
    )
    assert r.status_code == 201, r.text
    booking_id = r.json()["id"]

    r = await client.post(
        "/api/v1/payments/order", json={"booking_id": booking_id}, headers=_auth(user_tokens)
    )
    order = r.json()
    r = await client.post(
        "/api/v1/payments/verify",
        json={
            "razorpay_order_id": order["razorpay_order_id"],
            "razorpay_payment_id": f"pay_test_{_payment_seq}",
            "razorpay_signature": _VALID_SIG,
        },
        headers=_auth(user_tokens),
    )
    assert r.status_code == 200, r.text
    qr_token = r.json()["qr_token"]

    owner = await _login(client, phone=seed_station["owner_phone"])
    r = await client.post("/api/v1/qr/verify", json={"qr_token": qr_token}, headers=_auth(owner))
    assert r.status_code == 200, r.text
    r = await client.post(f"/api/v1/sessions/{booking_id}/start", headers=_auth(owner))
    assert r.status_code == 200, r.text
    r = await client.post(f"/api/v1/sessions/{booking_id}/complete", headers=_auth(owner))
    assert r.status_code == 200, r.text

    return booking_id


@pytest.mark.asyncio
async def test_summary_and_history_start_empty(client, seed_station):
    user = await _login(client)

    r = await client.get("/api/v1/rewards/summary", headers=_auth(user))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["points"] == 0
    assert body["tier"] == "FREE"
    assert body["referral_code"]

    r = await client.get("/api/v1/rewards/history", headers=_auth(user))
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_completing_session_awards_points_plus_first_booking_bonus(client, seed_station):
    user = await _login(client)
    await _completed_booking(client, seed_station, user)

    r = await client.get("/api/v1/rewards/summary", headers=_auth(user))
    assert r.status_code == 200, r.text
    # 10 (session, FREE tier 1x) + 25 (first booking bonus) = 35
    assert r.json()["points"] == 35

    r = await client.get("/api/v1/rewards/history", headers=_auth(user))
    history = r.json()
    assert len(history) == 2
    descriptions = {h["description"] for h in history}
    assert "Completed charging session" in descriptions
    assert "First booking bonus" in descriptions


@pytest.mark.asyncio
async def test_first_booking_bonus_only_awarded_once(client, seed_station):
    user = await _login(client)
    await _completed_booking(client, seed_station, user)
    await _completed_booking(client, seed_station, user)

    r = await client.get("/api/v1/rewards/summary", headers=_auth(user))
    # 35 (first session + bonus) + 10 (second session, no bonus) = 45
    assert r.json()["points"] == 45

    r = await client.get("/api/v1/rewards/history", headers=_auth(user))
    assert len(r.json()) == 3


@pytest.mark.asyncio
async def test_referral_bonus_awarded_to_referrer_on_referee_first_booking(client, seed_station, engine):
    referrer = await _login(client, phone="+919811111111")

    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        ref = (await s.execute(select(User).where(User.phone == "+919811111111"))).scalar_one()
        referee = User(phone="+919822222222", referral_code="REFEREE1", referred_by=ref.id)
        s.add(referee)
        await s.commit()

    referee_tokens = await _login(client, phone="+919822222222")
    await _completed_booking(client, seed_station, referee_tokens)

    r = await client.get("/api/v1/rewards/summary", headers=_auth(referrer))
    assert r.json()["points"] == 50  # referral bonus only, referrer did no session


@pytest.mark.asyncio
async def test_redeem_deducts_points_and_rejects_over_balance(client, seed_station):
    user = await _login(client)
    await _completed_booking(client, seed_station, user)  # 35 pts

    r = await client.post("/api/v1/rewards/redeem", json={"points": 1000}, headers=_auth(user))
    assert r.status_code == 409
    assert r.json()["code"] == "INSUFFICIENT_POINTS"

    r = await client.post("/api/v1/rewards/redeem", json={"points": 20}, headers=_auth(user))
    assert r.status_code == 201, r.text
    assert r.json()["points"] == -20

    r = await client.get("/api/v1/rewards/summary", headers=_auth(user))
    assert r.json()["points"] == 15


@pytest.mark.asyncio
async def test_membership_tier_catalog_and_upgrade(client, seed_station):
    user = await _login(client)

    r = await client.get("/api/v1/membership/tiers")
    assert r.status_code == 200
    tiers = {t["tier"]: t for t in r.json()}
    assert tiers["GOLD"]["points_multiplier"] == 2.0
    assert tiers["SILVER"]["discount_pct"] == 5

    r = await client.get("/api/v1/membership/me", headers=_auth(user))
    assert r.json()["tier"] == "FREE"

    r = await client.post("/api/v1/membership/upgrade", json={"tier": "GOLD"}, headers=_auth(user))
    assert r.status_code == 200, r.text
    assert r.json()["tier"] == "GOLD"
    assert r.json()["points_multiplier"] == 2.0

    # Re-upgrading to the same tier is rejected
    r = await client.post("/api/v1/membership/upgrade", json={"tier": "GOLD"}, headers=_auth(user))
    assert r.status_code == 409
    assert r.json()["code"] == "ALREADY_ON_TIER"


@pytest.mark.asyncio
async def test_gold_member_earns_double_points_per_session(client, seed_station):
    user = await _login(client)
    await client.post("/api/v1/membership/upgrade", json={"tier": "GOLD"}, headers=_auth(user))
    await _completed_booking(client, seed_station, user)

    r = await client.get("/api/v1/rewards/summary", headers=_auth(user))
    # 10 * 2.0 (GOLD multiplier) + 25 (first booking bonus, unaffected by multiplier) = 45
    assert r.json()["points"] == 45
