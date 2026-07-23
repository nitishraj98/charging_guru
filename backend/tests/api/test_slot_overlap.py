"""Duration/overlap-aware availability + concurrency-safe booking creation.

Covers the gaps the old implementation had:
  - available_slots() only checked exact slot_start matches, never whether a
    longer booking's full duration overlapped a candidate slot.
  - create_booking()'s Redis lock was scoped per exact start time, so two
    different-but-overlapping start times on the same charger could race
    past each other; the DB partial-unique index only guards same-slot_id
    collisions.
  - The sweep (app.core.scheduler) now reports which chargers it freed and
    publishes a live-update event for each.
"""
from __future__ import annotations

import asyncio
import contextlib
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker

import app.core.scheduler as scheduler_module
import app.services.booking_service as booking_service_module
from app.models.booking import Booking

USER_PHONE = "+919876543210"


# ── Helpers (mirrors test_stations_booking.py / test_lifecycle.py) ────────────

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


def _anchor_start() -> datetime:
    """Tomorrow 10:00 UTC, aligned to the 30-min grid — same anchor pattern
    used throughout the existing booking tests."""
    return (datetime.now(timezone.utc) + timedelta(days=1)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )


async def _book(client, seed_station, user_tokens, start: datetime, duration_minutes: int):
    return await client.post(
        "/api/v1/bookings",
        json={
            "charger_id": seed_station["charger_id"],
            "slot_start": start.isoformat(),
            "duration_minutes": duration_minutes,
        },
        headers=_auth(user_tokens),
    )


async def _slots(client, seed_station, day: datetime, duration_minutes: int):
    """Keyed by parsed datetime, not the raw string — the API serializes
    with a "Z" suffix (fromisoformat handles that in 3.11+), which wouldn't
    string-match Python's own dt.isoformat() ("+00:00")."""
    r = await client.get(
        f"/api/v1/chargers/{seed_station['charger_id']}/slots",
        params={"date": day.date().isoformat(), "duration_minutes": duration_minutes},
    )
    assert r.status_code == 200, r.text
    return {datetime.fromisoformat(s["slot_start"]): s for s in r.json()}


def _status_at(slots: dict, dt: datetime) -> str:
    return slots[dt]["status"]


# ── Overlap-aware availability ─────────────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "booking_duration,blocked_offsets_min",
    [
        (30, [0]),
        (60, [0, 30]),
        (90, [0, 30, 60]),
        (120, [0, 30, 60, 90]),
    ],
)
async def test_overlap_blocks_full_duration_not_just_start(
    client, seed_station, booking_duration, blocked_offsets_min
):
    """The user's own spec examples: a booking's full duration must block
    every grid slot whose (30-min, default) window would overlap it."""
    user = await _login(client)
    anchor = _anchor_start()
    r = await _book(client, seed_station, user, anchor, booking_duration)
    assert r.status_code == 201, r.text

    slots = await _slots(client, seed_station, anchor, duration_minutes=30)

    blocked = {anchor + timedelta(minutes=m) for m in blocked_offsets_min}
    for dt, slot in slots.items():
        if dt in blocked:
            assert slot["status"] == "HELD", f"{dt} should be HELD (blocked), got {slot['status']}"
            assert slot["available"] is False
        elif dt > anchor:
            # neighbors just outside the booked window must stay free
            gap = (dt - anchor).total_seconds() / 60
            if gap not in blocked_offsets_min:
                assert slot["status"] == "AVAILABLE", f"{dt} should be AVAILABLE, got {slot['status']}"


@pytest.mark.asyncio
async def test_create_booking_rejects_overlapping_different_start(client, seed_station):
    """The actual regression case: two different slot_starts (different
    slot_ids) that overlap in time. The DB partial-unique index alone cannot
    catch this — only the overlap-aware lock/check can."""
    user = await _login(client)
    anchor = _anchor_start()

    r1 = await _book(client, seed_station, user, anchor, 60)  # 10:00-11:00
    assert r1.status_code == 201, r1.text

    r2 = await _book(client, seed_station, user, anchor + timedelta(minutes=30), 30)  # 10:30-11:00
    assert r2.status_code == 409, r2.text
    assert r2.json()["code"] == "SLOT_UNAVAILABLE"


@pytest.mark.asyncio
async def test_offline_charger_all_future_slots_offline(client, seed_station):
    owner = await _login(client, phone=seed_station["owner_phone"])
    await client.patch(
        f"/api/v1/chargers/{seed_station['charger_id']}/status",
        json={"status": "MAINTENANCE"},
        headers=_auth(owner),
    )
    anchor = _anchor_start()
    slots = await _slots(client, seed_station, anchor, duration_minutes=30)
    future = [s for dt, s in slots.items() if dt > datetime.now(timezone.utc)]
    assert future, "expected at least one future grid slot"
    assert all(s["status"] == "OFFLINE" and s["available"] is False for s in future)


@pytest.mark.asyncio
async def test_past_slots_marked_past(client, seed_station):
    """Query today's grid — the grid opens 06:00 UTC, so unless the test runs
    before 06:00 UTC, at least the earliest slots are already in the past."""
    today = datetime.now(timezone.utc)
    if today.hour < 7:
        pytest.skip("grid open hour hasn't started yet at test run time")
    slots = await _slots(client, seed_station, today, duration_minutes=30)
    past = [s for dt, s in slots.items() if dt <= today]
    assert past, "expected at least one grid slot already in the past"
    assert all(s["status"] == "PAST" and s["available"] is False for s in past)


# ── Hold release frees the slot immediately ────────────────────────────────────

@pytest.mark.asyncio
async def test_hold_release_frees_slot_immediately(client, seed_station):
    user = await _login(client)
    anchor = _anchor_start()
    r = await _book(client, seed_station, user, anchor, 60)
    assert r.status_code == 201, r.text
    booking_id = r.json()["id"]

    slots = await _slots(client, seed_station, anchor, duration_minutes=30)
    assert _status_at(slots, anchor) == "HELD"

    r = await client.post(f"/api/v1/payments/{booking_id}/refund", headers=_auth(user))
    assert r.status_code == 200, r.text

    slots = await _slots(client, seed_station, anchor, duration_minutes=30)
    assert _status_at(slots, anchor) == "AVAILABLE"


# ── Background sweep: reports affected chargers + publishes live events ───────

@pytest_asyncio.fixture
async def patched_scheduler(engine, monkeypatch):
    """scheduler._sweep_once() reaches for the *production* SessionFactory
    (app.core.db.SessionFactory), which bypasses the test's get_db override
    entirely — it would try to hit whatever real DB is configured, not the
    in-memory test engine. Point it at the same test engine instead, and
    record publish_slot_event calls instead of hitting Redis."""
    test_factory = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(scheduler_module, "SessionFactory", test_factory)

    published: list[tuple[uuid.UUID, uuid.UUID, str]] = []

    async def _record(station_id, charger_id, reason):
        published.append((station_id, charger_id, reason))

    monkeypatch.setattr(scheduler_module, "publish_slot_event", _record)
    return published


@pytest.mark.asyncio
async def test_sweep_reports_and_publishes_expired_holds(
    client, engine, seed_station, patched_scheduler
):
    user = await _login(client)
    anchor = _anchor_start()
    r = await _book(client, seed_station, user, anchor, 30)
    assert r.status_code == 201, r.text
    booking_id = uuid.UUID(r.json()["id"])

    # Wind the clock: hold_expires_at → 10s ago (same pattern as test_lifecycle.py).
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        b = await s.get(Booking, booking_id)
        b.hold_expires_at = datetime.now(timezone.utc) - timedelta(seconds=10)
        await s.commit()

    await scheduler_module._sweep_once()

    published = patched_scheduler
    assert len(published) == 1
    pub_station_id, pub_charger_id, reason = published[0]
    assert reason == "hold_expired"
    assert str(pub_charger_id) == seed_station["charger_id"]

    slots = await _slots(client, seed_station, anchor, duration_minutes=30)
    assert _status_at(slots, anchor) == "AVAILABLE"


# ── Concurrency: only one of two overlapping requests wins ────────────────────

@pytest_asyncio.fixture
async def real_lock(monkeypatch):
    """The client fixture's default lock fake (_fake_lock) always yields True
    with zero exclusion, which is fine for every other test but makes a real
    race untestable here — the outcome would hinge on incidental event-loop
    scheduling, not the code path under test. Swap in a genuine per-key
    asyncio.Lock so two concurrent calls actually serialize against each
    other, the way the real Redis lock does across processes."""
    locks: dict[str, asyncio.Lock] = {}

    @contextlib.asynccontextmanager
    async def _serializing_lock(name, ttl_ms=10_000):
        lk = locks.setdefault(name, asyncio.Lock())
        async with lk:
            yield True

    monkeypatch.setattr(booking_service_module, "lock", _serializing_lock)


@pytest.mark.asyncio
async def test_concurrent_overlapping_creates_only_one_wins(client, seed_station, real_lock):
    """Validates the service-layer serialization contract (lock + fresh
    in-lock overlap re-check + commit-before-release). Not a test of true
    multi-process Redis behavior — that's inherently untestable against the
    SQLite/StaticPool test DB and is out of scope here (no infra work this
    pass); it would belong in a real docker-compose Postgres+Redis suite."""
    user = await _login(client)
    anchor = _anchor_start()

    results = await asyncio.gather(
        _book(client, seed_station, user, anchor, 60),                       # 10:00-11:00
        _book(client, seed_station, user, anchor + timedelta(minutes=30), 30),  # 10:30-11:00, overlaps
    )

    statuses = sorted(r.status_code for r in results)
    assert statuses == [201, 409], [r.text for r in results]
    loser = next(r for r in results if r.status_code == 409)
    assert loser.json()["code"] == "SLOT_UNAVAILABLE"
