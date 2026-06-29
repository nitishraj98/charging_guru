"""Discovery + availability + booking vertical-slice tests."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

USER_PHONE = "+919876543210"


async def _login(client, phone=USER_PHONE) -> dict:
    r = await client.post("/api/v1/auth/otp/request", json={"phone": phone})
    code = r.json()["debug_code"]
    r = await client.post(
        "/api/v1/auth/otp/verify", json={"request_id": r.json()["request_id"], "code": code}
    )
    return r.json()


def _auth(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def _future_slot() -> str:
    # tomorrow 10:00 UTC, aligned to the 30-min grid
    d = (datetime.now(timezone.utc) + timedelta(days=1)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )
    return d.isoformat()


@pytest.mark.asyncio
async def test_discovery_returns_nearby_active_station(client, seed_station):
    r = await client.get(
        "/api/v1/stations",
        params={"lat": seed_station["lat"], "lng": seed_station["lng"], "radius_km": 5},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data) == 1
    s = data[0]
    assert s["id"] == seed_station["station_id"]
    assert s["available_chargers"] == 1
    assert s["total_chargers"] == 1
    assert s["distance_km"] >= 0


@pytest.mark.asyncio
async def test_discovery_excludes_far_stations(client, seed_station):
    # A point ~hundreds of km away with a small radius → no results
    r = await client.get(
        "/api/v1/stations", params={"lat": 19.07, "lng": 72.87, "radius_km": 5}
    )
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_station_detail_lists_chargers(client, seed_station):
    r = await client.get(f"/api/v1/stations/{seed_station['station_id']}")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "GreenCharge Sector 62"
    assert len(body["chargers"]) == 1
    assert body["chargers"][0]["connector_type"] == "CCS2"


@pytest.mark.asyncio
async def test_owner_can_set_charger_status_and_it_propagates(client, seed_station):
    owner = await _login(client, phone=seed_station["owner_phone"])
    r = await client.patch(
        f"/api/v1/chargers/{seed_station['charger_id']}/status",
        json={"status": "MAINTENANCE", "reason": "firmware"},
        headers=_auth(owner),
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "MAINTENANCE"
    # discovery now shows 0 available chargers
    r = await client.get(
        "/api/v1/stations",
        params={"lat": seed_station["lat"], "lng": seed_station["lng"], "radius_km": 5},
    )
    assert r.json()[0]["available_chargers"] == 0


@pytest.mark.asyncio
async def test_normal_user_cannot_set_charger_status(client, seed_station):
    user = await _login(client)  # ROLE_USER
    r = await client.patch(
        f"/api/v1/chargers/{seed_station['charger_id']}/status",
        json={"status": "OFFLINE"},
        headers=_auth(user),
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_slots_endpoint_returns_grid(client, seed_station):
    r = await client.get(f"/api/v1/chargers/{seed_station['charger_id']}/slots")
    assert r.status_code == 200
    slots = r.json()
    assert len(slots) == 32  # 06:00–22:00 in 30-min steps
    assert {"slot_start", "slot_end", "available"} <= set(slots[0])


@pytest.mark.asyncio
async def test_create_booking_succeeds(client, seed_station):
    user = await _login(client)
    r = await client.post(
        "/api/v1/bookings",
        json={"charger_id": seed_station["charger_id"], "slot_start": _future_slot()},
        headers=_auth(user),
    )
    assert r.status_code == 201, r.text
    b = r.json()
    assert b["status"] == "PENDING_PAYMENT"
    # quote: 60kW * 0.5h = 30 kWh * ₹18 = ₹540 + ₹10 fee = ₹550 → 55000 paise
    assert b["amount"] == 55000
    assert b["energy_kwh_est"] == 30.0
    assert b["hold_expires_at"] is not None


@pytest.mark.asyncio
async def test_double_booking_same_slot_is_rejected(client, seed_station):
    user = await _login(client)
    payload = {"charger_id": seed_station["charger_id"], "slot_start": _future_slot()}
    r1 = await client.post("/api/v1/bookings", json=payload, headers=_auth(user))
    assert r1.status_code == 201
    r2 = await client.post("/api/v1/bookings", json=payload, headers=_auth(user))
    assert r2.status_code == 409
    assert r2.json()["code"] == "SLOT_UNAVAILABLE"


@pytest.mark.asyncio
async def test_cannot_book_unavailable_charger(client, seed_station):
    owner = await _login(client, phone=seed_station["owner_phone"])
    await client.patch(
        f"/api/v1/chargers/{seed_station['charger_id']}/status",
        json={"status": "OFFLINE"}, headers=_auth(owner),
    )
    user = await _login(client)
    r = await client.post(
        "/api/v1/bookings",
        json={"charger_id": seed_station["charger_id"], "slot_start": _future_slot()},
        headers=_auth(user),
    )
    assert r.status_code == 409
    assert r.json()["code"] == "CHARGER_UNAVAILABLE"


@pytest.mark.asyncio
async def test_cannot_book_past_slot(client, seed_station):
    user = await _login(client)
    past = (datetime.now(timezone.utc) - timedelta(hours=2)).replace(microsecond=0).isoformat()
    r = await client.post(
        "/api/v1/bookings",
        json={"charger_id": seed_station["charger_id"], "slot_start": past},
        headers=_auth(user),
    )
    assert r.status_code == 409
    assert r.json()["code"] == "SLOT_IN_PAST"


@pytest.mark.asyncio
async def test_list_my_bookings(client, seed_station):
    user = await _login(client)
    await client.post(
        "/api/v1/bookings",
        json={"charger_id": seed_station["charger_id"], "slot_start": _future_slot()},
        headers=_auth(user),
    )
    r = await client.get("/api/v1/bookings", headers=_auth(user))
    assert r.status_code == 200
    assert len(r.json()) == 1
