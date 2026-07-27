"""PDF invoice generation — 409 for non-completed bookings, 200 + real PDF
bytes for completed ones, stable invoice number across repeated downloads.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

USER_PHONE = "+919876543210"
_VALID_SIG = "valid_sig"

# WeasyPrint dlopen()s Pango/Cairo/GObject at import time, which requires the
# GTK3 runtime on native Windows dev machines (not needed in the Docker image
# — see backend/Dockerfile). Skip PDF-generation assertions in that case
# rather than failing on an environment gap unrelated to app correctness;
# the 409-before-completion test still runs everywhere since it never reaches
# WeasyPrint.
try:
    import weasyprint  # noqa: F401
    _WEASYPRINT_AVAILABLE = True
except OSError:
    _WEASYPRINT_AVAILABLE = False

requires_weasyprint = pytest.mark.skipif(
    not _WEASYPRINT_AVAILABLE, reason="WeasyPrint system libs (Pango/Cairo/GObject) not available"
)


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


async def _completed_booking(client, seed_station) -> tuple[dict, str]:
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
            "razorpay_payment_id": "pay_test_invoice",
            "razorpay_signature": _VALID_SIG,
        },
        headers=_auth(user),
    )
    verify_result = r.json()

    owner = await _login(client, seed_station["owner_phone"])
    await client.post(
        "/api/v1/qr/verify", json={"qr_token": verify_result["qr_token"]}, headers=_auth(owner),
    )
    await client.post(f"/api/v1/sessions/{booking['id']}/start", headers=_auth(owner))
    r = await client.post(f"/api/v1/sessions/{booking['id']}/complete", headers=_auth(owner))
    assert r.json()["status"] == "COMPLETED"

    return user, booking["id"]


@pytest.mark.asyncio
async def test_invoice_not_available_before_completion(client, seed_station):
    user = await _login(client)
    r = await client.post(
        "/api/v1/bookings",
        json={"charger_id": seed_station["charger_id"], "slot_start": _future_slot()},
        headers=_auth(user),
    )
    booking = r.json()

    r = await client.get(f"/api/v1/bookings/{booking['id']}/invoice", headers=_auth(user))
    assert r.status_code == 409
    assert r.json()["code"] == "INVOICE_NOT_AVAILABLE"


@requires_weasyprint
@pytest.mark.asyncio
async def test_invoice_generated_for_completed_booking(client, seed_station):
    user, booking_id = await _completed_booking(client, seed_station)

    r = await client.get(f"/api/v1/bookings/{booking_id}/invoice", headers=_auth(user))
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"
    assert "attachment" in r.headers["content-disposition"]


@requires_weasyprint
@pytest.mark.asyncio
async def test_invoice_number_stable_across_repeated_downloads(client, seed_station):
    user, booking_id = await _completed_booking(client, seed_station)

    r1 = await client.get(f"/api/v1/bookings/{booking_id}/invoice", headers=_auth(user))
    r2 = await client.get(f"/api/v1/bookings/{booking_id}/invoice", headers=_auth(user))
    assert r1.status_code == r2.status_code == 200
    assert r1.headers["content-disposition"] == r2.headers["content-disposition"]


@pytest.mark.asyncio
async def test_other_user_cannot_download_invoice(client, seed_station):
    _, booking_id = await _completed_booking(client, seed_station)

    other_user = await _login(client, "+919222222222")
    r = await client.get(f"/api/v1/bookings/{booking_id}/invoice", headers=_auth(other_user))
    assert r.status_code == 404
