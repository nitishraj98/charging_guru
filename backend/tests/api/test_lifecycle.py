"""Booking lifecycle tests: cancellation/refund + hold-expiry sweep.

These tests cover the end-of-life paths for a booking:
  - User cancels a PENDING_PAYMENT booking (no payment → just CANCELLED)
  - User cancels a CONFIRMED booking (payment captured → Razorpay refund)
  - Admin triggers hold-expiry sweep → stale PENDING_PAYMENT → EXPIRED
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.booking import Booking

USER_PHONE = "+919876543210"
_VALID_SIG = "valid_sig"
_VALID_WEBHOOK_SIG = "valid_webhook_sig"


# ── Helpers (mirrors test_payments_qr_session.py) ─────────────────────────────

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
            "razorpay_payment_id": "pay_test_refund_001",
            "razorpay_signature": _VALID_SIG,
        },
        headers=_auth(user_tokens),
    )
    assert r.status_code == 200, r.text
    return r.json()


# ── Refund / cancellation tests ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cancel_pending_payment_booking(client, seed_station):
    """Cancel before payment is made — no Razorpay refund needed."""
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)

    r = await client.post(
        f"/api/v1/payments/{booking['id']}/refund",
        headers=_auth(user),
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "CANCELLED"


@pytest.mark.asyncio
async def test_cancel_confirmed_booking_triggers_refund(client, seed_station):
    """Cancel after payment confirmed — FakeRazorpayGateway.refund() is called."""
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)
    order = await _make_order(client, booking["id"], user)
    await _verify_payment(client, order, user)  # booking → CONFIRMED

    r = await client.post(
        f"/api/v1/payments/{booking['id']}/refund",
        headers=_auth(user),
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "CANCELLED"


@pytest.mark.asyncio
async def test_cannot_cancel_completed_booking(client, seed_station):
    """COMPLETED bookings cannot be cancelled."""
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)
    order = await _make_order(client, booking["id"], user)
    verify_result = await _verify_payment(client, order, user)

    # Walk the booking through to COMPLETED
    owner = await _login(client, phone=seed_station["owner_phone"])
    await client.post(
        "/api/v1/qr/verify",
        json={"qr_token": verify_result["qr_token"]},
        headers=_auth(owner),
    )
    await client.post(f"/api/v1/sessions/{booking['id']}/start", headers=_auth(owner))
    await client.post(f"/api/v1/sessions/{booking['id']}/complete", headers=_auth(owner))

    r = await client.post(
        f"/api/v1/payments/{booking['id']}/refund",
        headers=_auth(user),
    )
    assert r.status_code == 409
    assert r.json()["code"] == "BOOKING_NOT_CANCELLABLE"


@pytest.mark.asyncio
async def test_cannot_cancel_another_users_booking(client, seed_station):
    """User B cannot cancel User A's booking."""
    user_a = await _login(client, phone="+919800000001")
    booking = await _make_booking(client, seed_station, user_a)

    user_b = await _login(client, phone="+919800000002")
    r = await client.post(
        f"/api/v1/payments/{booking['id']}/refund",
        headers=_auth(user_b),
    )
    assert r.status_code == 404  # booking not found for user_b


# ── Hold expiry tests ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_expire_holds_transitions_stale_booking(client, engine, seed_station, admin_tokens):
    """A PENDING_PAYMENT booking past its hold window is moved to EXPIRED."""
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)
    booking_id = uuid.UUID(booking["id"])

    # Wind the clock: set hold_expires_at to 10 seconds ago.
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        b = await s.get(Booking, booking_id)
        b.hold_expires_at = datetime.now(timezone.utc) - timedelta(seconds=10)
        await s.commit()

    r = await client.post(
        "/api/v1/admin/maintenance/expire-holds",
        headers=_auth(admin_tokens),
    )
    assert r.status_code == 200, r.text
    assert r.json()["expired_count"] >= 1

    # The booking must now be EXPIRED.
    r = await client.get(f"/api/v1/bookings/{booking['id']}", headers=_auth(user))
    assert r.json()["status"] == "EXPIRED"


@pytest.mark.asyncio
async def test_expire_holds_skips_fresh_bookings(client, seed_station, admin_tokens):
    """A recently-created booking (hold not yet expired) must stay PENDING_PAYMENT."""
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)

    r = await client.post(
        "/api/v1/admin/maintenance/expire-holds",
        headers=_auth(admin_tokens),
    )
    assert r.status_code == 200
    # The fresh booking is NOT expired.
    r = await client.get(f"/api/v1/bookings/{booking['id']}", headers=_auth(user))
    assert r.json()["status"] == "PENDING_PAYMENT"


@pytest.mark.asyncio
async def test_expire_holds_is_idempotent(client, engine, seed_station, admin_tokens):
    """Running the sweep twice should not double-count."""
    user = await _login(client)
    booking = await _make_booking(client, seed_station, user)

    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        b = await s.get(Booking, uuid.UUID(booking["id"]))
        b.hold_expires_at = datetime.now(timezone.utc) - timedelta(seconds=10)
        await s.commit()

    r1 = await client.post(
        "/api/v1/admin/maintenance/expire-holds", headers=_auth(admin_tokens)
    )
    r2 = await client.post(
        "/api/v1/admin/maintenance/expire-holds", headers=_auth(admin_tokens)
    )
    assert r1.json()["expired_count"] == 1
    assert r2.json()["expired_count"] == 0  # already expired, not double-counted
