"""Test fixtures: in-memory SQLite, dependency overrides, Redis stubs.

These run with zero external services so `pytest` works out of the box.
Integration tests against real Postgres/Redis run separately in CI via
docker-compose (see infra/compose).
"""
from __future__ import annotations

import os

os.environ.setdefault("CG_ENV", "test")
os.environ.setdefault("CG_JWT_SECRET", "test-secret-please-change-32-characters")
os.environ.setdefault("CG_OTP_DEBUG", "true")

import contextlib

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.core.qr as qr_module
import app.services.auth_service as auth_service_module
import app.services.booking_service as booking_service_module
from app.api.deps import get_db
from app.core.razorpay import get_razorpay_gateway
from app.core.sms import get_twilio_gateway
from app.main import app
from app.models import Base, Charger, PricingSettings, Role, Station, User
from app.models.enums import ChargerStatus, ConnectorType, RoleName, StationStatus

ADMIN_PHONE = "+918000000001"

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


# ── Fake external dependencies ─────────────────────────────────────────────────

class FakeRazorpayGateway:
    """Test double for RazorpayGateway — no network calls."""

    async def create_order(self, amount_paise: int, receipt: str) -> dict:
        return {"id": f"order_test_{receipt}"}

    def verify_payment_signature(
        self, order_id: str, payment_id: str, signature: str
    ) -> bool:
        return signature == "valid_sig"

    def verify_webhook_signature(self, body: bytes, signature: str) -> bool:
        return signature == "valid_webhook_sig"

    async def refund(self, payment_id: str, amount_paise: int) -> dict:
        return {"id": f"rfnd_test_{payment_id}"}


class FakeTwilioGateway:
    """Test double for TwilioGateway — no network calls, records sends."""

    def __init__(self):
        self.sent: list[tuple[str, str]] = []

    async def send_otp(self, phone: str, code: str) -> None:
        self.sent.append((phone, code))


class FakeRedis:
    """Minimal dict-backed async Redis stub — just enough for QR jti checks."""

    def __init__(self):
        self._store: dict[str, str] = {}

    async def set(self, key: str, value: str, *, nx: bool = False, ex: int | None = None, px: int | None = None):
        if nx and key in self._store:
            return None  # SET NX: key exists → not set
        self._store[key] = value
        return True


# ── DB fixtures ────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # one shared connection → in-memory DB persists
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed roles + the single pricing_settings row (normally done by the
    # Alembic migration) — defaults mirror migration 0009's seed exactly:
    # convenience fee ₹10 fixed & enabled, everything else off/zero.
    factory = async_sessionmaker(eng, expire_on_commit=False)
    async with factory() as s:
        # Explicit ids: SQLite only auto-increments INTEGER rowid PKs, not
        # SMALLINT. Postgres assigns these via identity at migration time.
        for i, name in enumerate(RoleName, start=1):
            s.add(Role(id=i, name=name.value))
        s.add(PricingSettings())
        await s.commit()
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def client(engine, monkeypatch):
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def _override_get_db():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    # Bypass Redis-backed rate limiting in unit tests.
    async def _always_allow(*_args, **_kwargs):
        return True

    # No-op distributed lock (Redis-free) for booking concurrency in tests.
    @contextlib.asynccontextmanager
    async def _fake_lock(*_a, **_k):
        yield True

    # Fake Redis for QR jti single-use registry.
    fake_redis = FakeRedis()
    fake_twilio = FakeTwilioGateway()

    monkeypatch.setattr(auth_service_module, "sliding_window_allow", _always_allow)
    monkeypatch.setattr(booking_service_module, "lock", _fake_lock)
    monkeypatch.setattr(qr_module, "get_redis", lambda: fake_redis)

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_razorpay_gateway] = lambda: FakeRazorpayGateway()
    app.dependency_overrides[get_twilio_gateway] = lambda: fake_twilio

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ac.fake_twilio = fake_twilio  # exposed for assertions in tests
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_tokens(engine, client):
    """Create a user, elevate to ROLE_ADMIN, return logged-in tokens.

    Roles are checked from DB on every request, so no re-login is needed
    after granting the role — the next request with the same access token
    will see the updated role set.
    """
    factory = async_sessionmaker(engine, expire_on_commit=False)

    r = await client.post("/api/v1/auth/otp/request", json={"phone": ADMIN_PHONE})
    code = r.json()["debug_code"]
    r = await client.post(
        "/api/v1/auth/otp/verify",
        json={"request_id": r.json()["request_id"], "code": code},
    )
    tokens = r.json()

    async with factory() as s:
        admin_role = (
            await s.execute(select(Role).where(Role.name == RoleName.ADMIN.value))
        ).scalar_one()
        user = (
            await s.execute(select(User).where(User.phone == ADMIN_PHONE))
        ).scalar_one()
        user.roles.append(admin_role)
        await s.commit()

    return tokens


@pytest_asyncio.fixture
async def seed_station(engine):
    """Insert an owner (ROLE_STATION_OWNER) + an ACTIVE station with one
    AVAILABLE charger. Returns ids/coords for discovery & booking tests."""
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        owner_role = (
            await s.execute(select(Role).where(Role.name == RoleName.STATION_OWNER.value))
        ).scalar_one()
        owner = User(phone="+919000000001", referral_code="OWNER001")
        owner.roles.append(owner_role)
        s.add(owner)
        await s.flush()

        station = Station(
            owner_id=owner.id,
            name="GreenCharge Sector 62",
            address="Sector 62, Noida",
            city="Noida",
            lat=28.6280,
            lng=77.3649,
            amenities=["cafe", "restroom"],
            status=StationStatus.ACTIVE,
        )
        charger = Charger(
            label="Bay 1",
            charger_type="DC",
            power_kw=60,
            connector_type=ConnectorType.CCS2,
            status=ChargerStatus.AVAILABLE,
            price_per_kwh=1800,  # ₹18/kWh in paise
        )
        station.chargers.append(charger)
        s.add(station)
        await s.commit()
        return {
            "owner_phone": owner.phone,
            "station_id": str(station.id),
            "charger_id": str(charger.id),
            "lat": station.lat,
            "lng": station.lng,
        }
