"""Payment → QR → Session vertical-slice tests.

Happy-path flow tested end-to-end:
  login → create booking → create payment order → verify payment
  → get qr_token → owner scans QR (check-in) → start session
  → complete session

Edge cases: bad signature, QR replay, wrong booking state.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pytest

USER_PHONE = "+919876543210"
_VALID_SIG = "valid_sig"           # FakeRazorpayGateway sentinel
_VALID_WEBHOOK_SIG = "valid_webhook_sig"


# ── Helpers ───────────────────────────────────────────────────────────────────

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


async def _make_booking(client, seed_station, user_tokens) -> dict:
    r = await client.post(
        "/api/v1/bookings",
        json={"charger_id": seed_station["charger_id"], "slot_start": _future_slot()},
        headers=_auth(user_tokens),
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _make_order(client, booking_id: str, user_tokens) -> dict:
    r = await client.post(
        "/api/v1/payments/order",
        json={"booking_id": booking_id},
        headers=_auth(user_tokens),
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _verify_payment(client, order: dict, user_tokens) -> dict:
    r = await client.post(
        "/api/v1/payments/verify",
        json={
            "razorpay_order_id": order["razorpay_order_id"],
            "razorpay_payment_id": "pay_test_abc123",
            "razorpay_signature": _VALID_SIG,
        },
        headers=_auth(user_tokens),
    )
    assert r.status_code == 200, r.text
    return r.json()


# ── Tests: payment order ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_payment_order(client, seed_station):
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)

    r = await client.post(
        "/api/v1/payments/order",
        json={"booking_id": booking["id"]},
        headers=_auth(user),
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["status"] == "PENDING"
    assert data["amount"] == 55000  # same as booking
    assert data["razorpay_order_id"].startswith("order_test_")
    assert data["booking_id"] == booking["id"]


@pytest.mark.asyncio
async def test_create_order_is_idempotent(client, seed_station):
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)

    r1 = await client.post(
        "/api/v1/payments/order",
        json={"booking_id": booking["id"]},
        headers=_auth(user),
    )
    r2 = await client.post(
        "/api/v1/payments/order",
        json={"booking_id": booking["id"]},
        headers=_auth(user),
    )
    assert r1.status_code == r2.status_code == 201
    assert r1.json()["razorpay_order_id"] == r2.json()["razorpay_order_id"]


# ── Tests: payment verify ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_verify_payment_confirms_booking_and_issues_qr(client, seed_station):
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)
    order = await _make_order(client, booking["id"], user)

    result = await _verify_payment(client, order, user)
    assert result["booking_status"] == "CONFIRMED"
    assert result["booking_id"] == booking["id"]
    assert "." in result["qr_token"]   # base64url.hexsig format


@pytest.mark.asyncio
async def test_verify_payment_bad_signature_rejected(client, seed_station):
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)
    order = await _make_order(client, booking["id"], user)

    r = await client.post(
        "/api/v1/payments/verify",
        json={
            "razorpay_order_id": order["razorpay_order_id"],
            "razorpay_payment_id": "pay_test_bad",
            "razorpay_signature": "bad_signature_value",
        },
        headers=_auth(user),
    )
    assert r.status_code == 400
    assert r.json()["code"] == "INVALID_PAYMENT_SIGNATURE"


# ── Tests: webhook ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_webhook_payment_captured_confirms_booking(client, seed_station):
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)
    order = await _make_order(client, booking["id"], user)

    webhook_body = json.dumps({
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_webhook_001",
                    "order_id": order["razorpay_order_id"],
                }
            }
        },
    }).encode()

    r = await client.post(
        "/api/v1/payments/webhook",
        content=webhook_body,
        headers={"X-Razorpay-Signature": _VALID_WEBHOOK_SIG, "Content-Type": "application/json"},
    )
    assert r.status_code == 200

    # Booking should now be CONFIRMED
    r2 = await client.get(f"/api/v1/bookings/{booking['id']}", headers=_auth(user))
    assert r2.json()["status"] == "CONFIRMED"


@pytest.mark.asyncio
async def test_webhook_invalid_signature_rejected(client, seed_station):
    r = await client.post(
        "/api/v1/payments/webhook",
        content=b'{"event":"payment.captured"}',
        headers={"X-Razorpay-Signature": "bad_sig", "Content-Type": "application/json"},
    )
    assert r.status_code == 400


# ── Tests: QR check-in ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_qr_checkin_transitions_to_checked_in(client, seed_station):
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)
    order = await _make_order(client, booking["id"], user)
    verify_result = await _verify_payment(client, order, user)

    owner = await _login(client, phone=seed_station["owner_phone"])
    r = await client.post(
        "/api/v1/qr/verify",
        json={"qr_token": verify_result["qr_token"]},
        headers=_auth(owner),
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "CHECKED_IN"


@pytest.mark.asyncio
async def test_qr_replay_is_rejected(client, seed_station):
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)
    order = await _make_order(client, booking["id"], user)
    verify_result = await _verify_payment(client, order, user)
    qr_token = verify_result["qr_token"]

    owner = await _login(client, phone=seed_station["owner_phone"])
    r1 = await client.post(
        "/api/v1/qr/verify",
        json={"qr_token": qr_token},
        headers=_auth(owner),
    )
    assert r1.status_code == 200

    r2 = await client.post(
        "/api/v1/qr/verify",
        json={"qr_token": qr_token},
        headers=_auth(owner),
    )
    assert r2.status_code == 409
    assert r2.json()["code"] == "INVALID_QR"


@pytest.mark.asyncio
async def test_normal_user_cannot_verify_qr(client, seed_station):
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)
    order = await _make_order(client, booking["id"], user)
    verify_result = await _verify_payment(client, order, user)

    r = await client.post(
        "/api/v1/qr/verify",
        json={"qr_token": verify_result["qr_token"]},
        headers=_auth(user),
    )
    assert r.status_code == 403


# ── Tests: session start / complete ───────────────────────────────────────────

async def _full_checkin(client, seed_station) -> tuple[dict, dict, str]:
    """Returns (user_tokens, owner_tokens, booking_id) with booking CHECKED_IN."""
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)
    order = await _make_order(client, booking["id"], user)
    verify_result = await _verify_payment(client, order, user)

    owner = await _login(client, phone=seed_station["owner_phone"])
    await client.post(
        "/api/v1/qr/verify",
        json={"qr_token": verify_result["qr_token"]},
        headers=_auth(owner),
    )
    return user, owner, booking["id"]


@pytest.mark.asyncio
async def test_start_session_transitions_to_in_progress(client, seed_station):
    _, owner, booking_id = await _full_checkin(client, seed_station)

    r = await client.post(f"/api/v1/sessions/{booking_id}/start", headers=_auth(owner))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_start_session_marks_charger_occupied(client, seed_station):
    _, owner, booking_id = await _full_checkin(client, seed_station)
    await client.post(f"/api/v1/sessions/{booking_id}/start", headers=_auth(owner))

    r = await client.get(
        "/api/v1/stations",
        params={"lat": seed_station["lat"], "lng": seed_station["lng"], "radius_km": 5},
    )
    assert r.json()[0]["available_chargers"] == 0


@pytest.mark.asyncio
async def test_complete_session_transitions_to_completed(client, seed_station):
    _, owner, booking_id = await _full_checkin(client, seed_station)
    await client.post(f"/api/v1/sessions/{booking_id}/start", headers=_auth(owner))

    r = await client.post(f"/api/v1/sessions/{booking_id}/complete", headers=_auth(owner))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_complete_session_releases_charger(client, seed_station):
    _, owner, booking_id = await _full_checkin(client, seed_station)
    await client.post(f"/api/v1/sessions/{booking_id}/start", headers=_auth(owner))
    await client.post(f"/api/v1/sessions/{booking_id}/complete", headers=_auth(owner))

    r = await client.get(
        "/api/v1/stations",
        params={"lat": seed_station["lat"], "lng": seed_station["lng"], "radius_km": 5},
    )
    assert r.json()[0]["available_chargers"] == 1


@pytest.mark.asyncio
async def test_cannot_start_session_not_checked_in(client, seed_station):
    """Booking is CONFIRMED (not CHECKED_IN) → start should fail."""
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)
    order = await _make_order(client, booking["id"], user)
    await _verify_payment(client, order, user)  # booking → CONFIRMED, not CHECKED_IN

    owner = await _login(client, phone=seed_station["owner_phone"])
    r = await client.post(
        f"/api/v1/sessions/{booking['id']}/start",
        headers=_auth(owner),
    )
    assert r.status_code == 409
    assert r.json()["code"] == "INVALID_BOOKING_STATE"
