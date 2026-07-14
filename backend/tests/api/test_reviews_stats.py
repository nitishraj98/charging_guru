"""Station reviews (create/list, rating aggregation) + station stats."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

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


async def _completed_booking(client, seed_station, user_tokens) -> str:
    """Walk a fresh booking through payment + QR + session to COMPLETED."""
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
            "razorpay_payment_id": "pay_test_1",
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
async def test_review_requires_completed_booking(client, seed_station):
    user = await _login(client)
    r = await client.post(
        "/api/v1/bookings",
        json={"charger_id": seed_station["charger_id"], "slot_start": _future_slot()},
        headers=_auth(user),
    )
    booking_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/stations/{seed_station['station_id']}/reviews",
        params={"booking_id": booking_id},
        json={"rating": 5, "comment": "Great!"},
        headers=_auth(user),
    )
    assert r.status_code == 409, r.text
    assert r.json()["code"] == "BOOKING_NOT_COMPLETED"


@pytest.mark.asyncio
async def test_create_review_updates_station_rating(client, seed_station):
    user = await _login(client)
    booking_id = await _completed_booking(client, seed_station, user)

    r = await client.post(
        f"/api/v1/stations/{seed_station['station_id']}/reviews",
        params={"booking_id": booking_id},
        json={"rating": 4, "comment": "Fast charging, clean station."},
        headers=_auth(user),
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["rating"] == 4
    assert body["comment"] == "Fast charging, clean station."

    detail = await client.get(f"/api/v1/stations/{seed_station['station_id']}")
    assert detail.json()["rating_avg"] == 4.0
    assert detail.json()["rating_count"] == 1

    listed = await client.get(f"/api/v1/stations/{seed_station['station_id']}/reviews")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["rating"] == 4


@pytest.mark.asyncio
async def test_cannot_review_same_booking_twice(client, seed_station):
    user = await _login(client)
    booking_id = await _completed_booking(client, seed_station, user)

    r1 = await client.post(
        f"/api/v1/stations/{seed_station['station_id']}/reviews",
        params={"booking_id": booking_id},
        json={"rating": 5},
        headers=_auth(user),
    )
    assert r1.status_code == 201

    r2 = await client.post(
        f"/api/v1/stations/{seed_station['station_id']}/reviews",
        params={"booking_id": booking_id},
        json={"rating": 2},
        headers=_auth(user),
    )
    assert r2.status_code == 409
    assert r2.json()["code"] == "REVIEW_ALREADY_EXISTS"


@pytest.mark.asyncio
async def test_cannot_review_another_users_booking(client, seed_station):
    user_a = await _login(client, phone="+919800000011")
    booking_id = await _completed_booking(client, seed_station, user_a)

    user_b = await _login(client, phone="+919800000012")
    r = await client.post(
        f"/api/v1/stations/{seed_station['station_id']}/reviews",
        params={"booking_id": booking_id},
        json={"rating": 1},
        headers=_auth(user_b),
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_rating_out_of_range_rejected(client, seed_station):
    user = await _login(client)
    booking_id = await _completed_booking(client, seed_station, user)

    r = await client.post(
        f"/api/v1/stations/{seed_station['station_id']}/reviews",
        params={"booking_id": booking_id},
        json={"rating": 6},
        headers=_auth(user),
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_station_stats_endpoint(client, seed_station):
    user = await _login(client)
    await _completed_booking(client, seed_station, user)

    r = await client.get(f"/api/v1/stations/{seed_station['station_id']}/stats")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["sessions_today"] == 1
    assert body["uptime_pct"] == 100.0  # no OFFLINE/MAINTENANCE events recorded
