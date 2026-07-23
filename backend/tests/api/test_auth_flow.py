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
async def test_otp_request_dispatches_sms(client):
    r = await client.post("/api/v1/auth/otp/request", json={"phone": PHONE})
    assert r.status_code == 200, r.text
    code = r.json()["debug_code"]

    assert client.fake_twilio.sent == [(PHONE, code)]


@pytest.mark.asyncio
async def test_logout_revokes_refresh_token(client):
    result = await _login(client)
    refresh_token = result["refresh_token"]

    r = await client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
    assert r.status_code == 204

    # The revoked refresh token must no longer work.
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_logout_with_unknown_token_is_a_noop(client):
    r = await client.post("/api/v1/auth/logout", json={"refresh_token": "not-a-real-token"})
    assert r.status_code == 204


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
async def test_list_sessions_shows_current(client):
    result = await _login(client)
    headers = {"Authorization": f"Bearer {result['access_token']}"}
    r = await client.get("/api/v1/auth/sessions", headers=headers)
    assert r.status_code == 200, r.text
    sessions = r.json()
    assert len(sessions) == 1
    assert sessions[0]["is_current"] is True


@pytest.mark.asyncio
async def test_revoke_other_session_logs_it_out(client):
    first = await _login(client)
    second = await _login(client)  # same phone, second device/session
    headers2 = {"Authorization": f"Bearer {second['access_token']}"}

    r = await client.get("/api/v1/auth/sessions", headers=headers2)
    sessions = r.json()
    assert len(sessions) == 2
    other = next(s for s in sessions if not s["is_current"])

    r = await client.delete(f"/api/v1/auth/sessions/{other['id']}", headers=headers2)
    assert r.status_code == 204

    # The revoked session's refresh token must no longer work.
    r = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": first["refresh_token"]}
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_revoke_other_sessions_keeps_current(client):
    first = await _login(client)
    second = await _login(client)
    third = await _login(client)
    headers3 = {"Authorization": f"Bearer {third['access_token']}"}

    r = await client.delete("/api/v1/auth/sessions/others", headers=headers3)
    assert r.status_code == 204

    r = await client.get("/api/v1/auth/sessions", headers=headers3)
    sessions = r.json()
    assert len(sessions) == 1
    assert sessions[0]["is_current"] is True

    for stale in (first, second):
        r = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": stale["refresh_token"]}
        )
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_cannot_revoke_another_users_session(client):
    mine = await _login(client)

    r = await client.post(
        "/api/v1/auth/otp/request", json={"phone": "+919111111199"}
    )
    code = r.json()["debug_code"]
    r = await client.post(
        "/api/v1/auth/otp/verify",
        json={"request_id": r.json()["request_id"], "code": code},
    )
    other = r.json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}
    r = await client.get("/api/v1/auth/sessions", headers=other_headers)
    other_session_id = r.json()[0]["id"]

    my_headers = {"Authorization": f"Bearer {mine['access_token']}"}
    r = await client.delete(
        f"/api/v1/auth/sessions/{other_session_id}", headers=my_headers
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_rename_session(client):
    result = await _login(client)
    headers = {"Authorization": f"Bearer {result['access_token']}"}
    r = await client.get("/api/v1/auth/sessions", headers=headers)
    session_id = r.json()[0]["id"]

    r = await client.patch(
        f"/api/v1/auth/sessions/{session_id}",
        json={"device_name": "My Lenovo Laptop"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["device_name"] == "My Lenovo Laptop"

    r = await client.get("/api/v1/auth/sessions", headers=headers)
    assert r.json()[0]["device_name"] == "My Lenovo Laptop"


@pytest.mark.asyncio
async def test_cannot_rename_another_users_session(client):
    mine = await _login(client)

    r = await client.post(
        "/api/v1/auth/otp/request", json={"phone": "+919111111198"}
    )
    code = r.json()["debug_code"]
    r = await client.post(
        "/api/v1/auth/otp/verify",
        json={"request_id": r.json()["request_id"], "code": code},
    )
    other = r.json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}
    r = await client.get("/api/v1/auth/sessions", headers=other_headers)
    other_session_id = r.json()[0]["id"]

    my_headers = {"Authorization": f"Bearer {mine['access_token']}"}
    r = await client.patch(
        f"/api/v1/auth/sessions/{other_session_id}",
        json={"device_name": "Hijack"},
        headers=my_headers,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_health_live(client):
    r = await client.get("/health/live")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
