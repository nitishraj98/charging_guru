"""Owner payout ledger: admin create/mark-paid + owner-scoped listing/isolation."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.role import Role
from app.models.enums import RoleName
from app.models.user import User

OWNER_PHONE = "+919000000001"
OTHER_OWNER_PHONE = "+919111111111"


async def _login(client, phone) -> dict:
    r = await client.post("/api/v1/auth/otp/request", json={"phone": phone})
    code = r.json()["debug_code"]
    r = await client.post(
        "/api/v1/auth/otp/verify",
        json={"request_id": r.json()["request_id"], "code": code},
    )
    return r.json()


def _auth(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def _make_station_owner(engine, phone: str) -> str:
    """Login-free owner creation (role only, no station) — for isolation test."""
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        owner_role = (
            await s.execute(select(Role).where(Role.name == RoleName.STATION_OWNER.value))
        ).scalar_one()
        user = User(phone=phone, referral_code=phone[-8:])
        user.roles.append(owner_role)
        s.add(user)
        await s.commit()
        return str(user.id)


def _period():
    now = datetime.now(timezone.utc)
    return (now - timedelta(days=7)).isoformat(), now.isoformat()


@pytest.mark.asyncio
async def test_admin_create_payout_and_mark_paid(client, admin_tokens, seed_station, engine):
    owner_id = None
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        owner = (
            await s.execute(select(User).where(User.phone == seed_station["owner_phone"]))
        ).scalar_one()
        owner_id = str(owner.id)

    period_start, period_end = _period()
    r = await client.post(
        "/api/v1/admin/pricing/payouts",
        json={
            "owner_id": owner_id,
            "period_start": period_start,
            "period_end": period_end,
            "amount_paise": 75000,
            "reference_note": "weekly payout",
        },
        headers=_auth(admin_tokens),
    )
    assert r.status_code == 201, r.text
    payout = r.json()
    assert payout["status"] == "PENDING"
    assert payout["amount_paise"] == 75000

    r2 = await client.post(
        f"/api/v1/admin/pricing/payouts/{payout['id']}/mark-paid",
        headers=_auth(admin_tokens),
    )
    assert r2.status_code == 200, r2.text
    assert r2.json()["status"] == "PAID"
    assert r2.json()["paid_at"] is not None

    r3 = await client.get("/api/v1/admin/pricing/payouts", headers=_auth(admin_tokens))
    assert r3.status_code == 200
    assert r3.json()["total"] >= 1


@pytest.mark.asyncio
async def test_owner_sees_only_own_payouts(client, admin_tokens, seed_station, engine):
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        owner = (
            await s.execute(select(User).where(User.phone == seed_station["owner_phone"]))
        ).scalar_one()
        owner_id = str(owner.id)

    other_owner_id = await _make_station_owner(engine, OTHER_OWNER_PHONE)

    period_start, period_end = _period()
    await client.post(
        "/api/v1/admin/pricing/payouts",
        json={
            "owner_id": owner_id, "period_start": period_start, "period_end": period_end,
            "amount_paise": 10000,
        },
        headers=_auth(admin_tokens),
    )
    await client.post(
        "/api/v1/admin/pricing/payouts",
        json={
            "owner_id": other_owner_id, "period_start": period_start, "period_end": period_end,
            "amount_paise": 20000,
        },
        headers=_auth(admin_tokens),
    )

    owner_tokens = await _login(client, seed_station["owner_phone"])
    r = await client.get("/api/v1/owner/finance/payouts", headers=_auth(owner_tokens))
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["amount_paise"] == 10000


@pytest.mark.asyncio
async def test_non_admin_cannot_create_payout(client, seed_station):
    owner_tokens = await _login(client, seed_station["owner_phone"])
    period_start, period_end = _period()
    r = await client.post(
        "/api/v1/admin/pricing/payouts",
        json={
            "owner_id": "00000000-0000-0000-0000-000000000000",
            "period_start": period_start, "period_end": period_end,
            "amount_paise": 1000,
        },
        headers=_auth(owner_tokens),
    )
    assert r.status_code == 403
