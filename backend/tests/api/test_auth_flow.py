"""End-to-end auth vertical slice: OTP → tokens → /me → refresh → logout."""
from __future__ import annotations

import pytest

PHONE = "+919876543210"


async def _login(client) -> dict:
    r = await client.post("/api/v1/auth/otp/request", json={"phone": PHONE})
    assert r.status_code == 200, r.text
    body = r.json()
    code = body["debug_code"]
    assert code is not None  # CG_OTP_DEBUG=true in tests

    r = await client.post(
        "/api/v1/auth/otp/verify",
        json={"request_id": body["request_id"], "code": code},
    )
    assert r.status_code == 200, r.text
    return r.json()


@pytest.mark.asyncio
async def test_signup_creates_user_and_returns_tokens(client):
    result = await _login(client)
    assert result["is_new"] is True
    assert result["access_token"] and result["refresh_token"]
    assert result["user"]["phone"] == PHONE
    assert "ROLE_USER" in result["user"]["roles"]


@pytest.mark.asyncio
async def test_returning_user_is_not_new(client):
    await _login(client)
    second = await _login(client)
    assert second["is_new"] is False


@pytest.mark.asyncio
async def test_me_requires_auth_and_returns_profile(client):
    result = await _login(client)
    # No token → 401
    r = await client.get("/api/v1/users/me")
    assert r.status_code == 401

    r = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {result['access_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["phone"] == PHONE


@pytest.mark.asyncio
async def test_wrong_code_is_rejected(client):
    r = await client.post("/api/v1/auth/otp/request", json={"phone": PHONE})
    rid = r.json()["request_id"]
    r = await client.post(
        "/api/v1/auth/otp/verify", json={"request_id": rid, "code": "000000"}
    )
    assert r.status_code == 401
    assert r.json()["code"] == "INVALID_CODE"


@pytest.mark.asyncio
async def test_refresh_rotates_and_old_token_is_invalid(client):
    result = await _login(client)
    old_refresh = result["refresh_token"]

    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert r.status_code == 200, r.text
    rotated = r.json()
    assert rotated["refresh_token"] != old_refresh

    # Reusing the old (rotated-out) refresh token must fail.
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert r.status_code == 401

    # New refresh token works.
    r = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": rotated["refresh_token"]}
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_update_profile(client):
    result = await _login(client)
    headers = {"Authorization": f"Bearer {result['access_token']}"}
    r = await client.patch(
        "/api/v1/users/me", json={"full_name": "Ria"}, headers=headers
    )
    assert r.status_code == 200
    assert r.json()["full_name"] == "Ria"


@pytest.mark.asyncio
async def test_invalid_phone_rejected(client):
    r = await client.post("/api/v1/auth/otp/request", json={"phone": "12345"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_health_live(client):
    r = await client.get("/health/live")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
