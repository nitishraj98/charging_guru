"""
Seed script — populates Postgres with realistic dummy data for local testing.

Run from: backend/
  .venv/Scripts/python seed.py

Requires Docker Compose stack to be running:
  docker compose up -d db redis

Creates:
  - 3 roles (ROLE_USER, ROLE_STATION_OWNER, ROLE_ADMIN)
  - 4 users (1 admin, 2 owners, 1 regular user)
  - 4 vehicles
  - 7 stations across Delhi NCR, Bangalore, Mumbai
  - 21 chargers with mixed statuses
"""

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone

# Postgres via Docker Compose (port 5433 mapped to host)
os.environ.setdefault("CG_DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5433/chargingguru")

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.ids import uuid7
from app.models.base import Base
from app.models.user import User
from app.models.role import Role, UserRole
from app.models.station import Station
from app.models.charger import Charger
from app.models.vehicle import Vehicle
from app.models.enums import (
    UserStatus, StationStatus, ChargerStatus,
    ConnectorType, RoleName
)

DATABASE_URL = os.environ["CG_DATABASE_URL"]

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ── Helpers ────────────────────────────────────────────────────────────────────

def uid() -> uuid.UUID:
    return uuid7()

def now() -> datetime:
    return datetime.now(timezone.utc)

def ref_code(n: int) -> str:
    return f"GURU{n:06d}"


# ── Seed data ──────────────────────────────────────────────────────────────────

ROLES = [
    {"id": 1, "name": RoleName.USER.value},
    {"id": 2, "name": RoleName.STATION_OWNER.value},
    {"id": 3, "name": RoleName.ADMIN.value},
]

# UUIDs fixed so re-running is idempotent
ADMIN_ID    = uuid.UUID("00000000-0000-0000-0000-000000000001")
OWNER1_ID   = uuid.UUID("00000000-0000-0000-0000-000000000002")
OWNER2_ID   = uuid.UUID("00000000-0000-0000-0000-000000000003")
USER_ID     = uuid.UUID("00000000-0000-0000-0000-000000000004")

USERS = [
    {"id": ADMIN_ID,  "phone": "+918000000001", "full_name": "Aarav Admin",    "email": "admin@chargingguru.in",   "referral_code": "ADMIN001", "roles": [1, 2, 3]},
    {"id": OWNER1_ID, "phone": "+919000000001", "full_name": "Priya Sharma",   "email": "priya@chargingguru.in",   "referral_code": "OWN00001", "roles": [1, 2]},
    {"id": OWNER2_ID, "phone": "+919000000002", "full_name": "Rohan Mehra",    "email": "rohan@chargingguru.in",   "referral_code": "OWN00002", "roles": [1, 2]},
    {"id": USER_ID,   "phone": "+919876543210", "full_name": "Nitish Kumar",   "email": "nitish@example.com",      "referral_code": "USR00001", "roles": [1]},
]

VEHICLES = [
    {"user_id": USER_ID, "brand": "Tata", "model": "Nexon EV Max", "battery_kwh": 40.5, "range_km": 453, "connector_type": ConnectorType.CCS2,   "is_default": True},
    {"user_id": USER_ID, "brand": "MG",   "model": "ZS EV",        "battery_kwh": 50.3, "range_km": 461, "connector_type": ConnectorType.CCS2,   "is_default": False},
    {"user_id": USER_ID, "brand": "Ather","model": "450X Gen 3",   "battery_kwh": 3.7,  "range_km": 146, "connector_type": ConnectorType.BHARAT_AC, "is_default": False},
    {"user_id": OWNER1_ID, "brand": "BYD","model": "Atto 3",       "battery_kwh": 60.5, "range_km": 521, "connector_type": ConnectorType.CCS2,   "is_default": True},
]

# (station_id_suffix, owner, lat, lng, name, city, address, amenities, status)
STATIONS_RAW = [
    {
        "id_suffix": "A1",
        "owner_id": OWNER1_ID,
        "name": "Charging Guru — Connaught Place",
        "address": "B-Block Outer Circle, Connaught Place",
        "city": "New Delhi", "state": "Delhi", "pincode": "110001",
        "lat": 28.6304, "lng": 77.2177,
        "amenities": ["wifi", "cafe", "restroom", "parking"],
        "status": StationStatus.ACTIVE, "rating_avg": 4.7, "rating_count": 142,
        "chargers": [
            {"label": "DC-01", "type": "DC", "kw": 60,  "connector": ConnectorType.CCS2,      "price": 1600, "status": ChargerStatus.AVAILABLE},
            {"label": "DC-02", "type": "DC", "kw": 60,  "connector": ConnectorType.CCS2,      "price": 1600, "status": ChargerStatus.BOOKED},
            {"label": "AC-01", "type": "AC", "kw": 7.4, "connector": ConnectorType.TYPE2,     "price": 900,  "status": ChargerStatus.AVAILABLE},
            {"label": "AC-02", "type": "AC", "kw": 7.4, "connector": ConnectorType.BHARAT_AC, "price": 900,  "status": ChargerStatus.AVAILABLE},
        ],
    },
    {
        "id_suffix": "A2",
        "owner_id": OWNER1_ID,
        "name": "Charging Guru — Cyber Hub Gurugram",
        "address": "DLF Cyber Hub, Phase II, Gurugram",
        "city": "Gurugram", "state": "Haryana", "pincode": "122002",
        "lat": 28.4944, "lng": 77.0893,
        "amenities": ["wifi", "restroom", "parking", "store"],
        "status": StationStatus.ACTIVE, "rating_avg": 4.5, "rating_count": 89,
        "chargers": [
            {"label": "DC-01", "type": "DC", "kw": 120, "connector": ConnectorType.CCS2,      "price": 1800, "status": ChargerStatus.AVAILABLE},
            {"label": "DC-02", "type": "DC", "kw": 120, "connector": ConnectorType.CCS2,      "price": 1800, "status": ChargerStatus.OCCUPIED},
            {"label": "DC-03", "type": "DC", "kw": 50,  "connector": ConnectorType.CHADEMO,   "price": 1500, "status": ChargerStatus.AVAILABLE},
        ],
    },
    {
        "id_suffix": "A3",
        "owner_id": OWNER2_ID,
        "name": "Charging Guru — Noida Sector 18",
        "address": "Atta Market Road, Sector 18, Noida",
        "city": "Noida", "state": "Uttar Pradesh", "pincode": "201301",
        "lat": 28.5700, "lng": 77.3200,
        "amenities": ["wifi", "parking", "cafe"],
        "status": StationStatus.ACTIVE, "rating_avg": 4.3, "rating_count": 67,
        "chargers": [
            {"label": "DC-01", "type": "DC", "kw": 60,  "connector": ConnectorType.CCS2,      "price": 1500, "status": ChargerStatus.AVAILABLE},
            {"label": "DC-02", "type": "DC", "kw": 60,  "connector": ConnectorType.CCS2,      "price": 1500, "status": ChargerStatus.MAINTENANCE},
            {"label": "AC-01", "type": "AC", "kw": 22,  "connector": ConnectorType.TYPE2,     "price": 1000, "status": ChargerStatus.AVAILABLE},
        ],
    },
    {
        "id_suffix": "B1",
        "owner_id": OWNER2_ID,
        "name": "Charging Guru — Koramangala Bangalore",
        "address": "80 Feet Road, 6th Block, Koramangala",
        "city": "Bengaluru", "state": "Karnataka", "pincode": "560095",
        "lat": 12.9352, "lng": 77.6245,
        "amenities": ["wifi", "cafe", "restroom", "parking"],
        "status": StationStatus.ACTIVE, "rating_avg": 4.8, "rating_count": 213,
        "chargers": [
            {"label": "DC-01", "type": "DC", "kw": 150, "connector": ConnectorType.CCS2,      "price": 2000, "status": ChargerStatus.AVAILABLE},
            {"label": "DC-02", "type": "DC", "kw": 150, "connector": ConnectorType.CCS2,      "price": 2000, "status": ChargerStatus.AVAILABLE},
            {"label": "DC-03", "type": "DC", "kw": 50,  "connector": ConnectorType.BHARAT_DC, "price": 1400, "status": ChargerStatus.BOOKED},
            {"label": "AC-01", "type": "AC", "kw": 7.4, "connector": ConnectorType.TYPE2,     "price": 900,  "status": ChargerStatus.AVAILABLE},
        ],
    },
    {
        "id_suffix": "B2",
        "owner_id": OWNER1_ID,
        "name": "Charging Guru — Indiranagar Bangalore",
        "address": "100 Feet Road, HAL 2nd Stage, Indiranagar",
        "city": "Bengaluru", "state": "Karnataka", "pincode": "560008",
        "lat": 12.9784, "lng": 77.6408,
        "amenities": ["wifi", "parking"],
        "status": StationStatus.ACTIVE, "rating_avg": 4.6, "rating_count": 158,
        "chargers": [
            {"label": "DC-01", "type": "DC", "kw": 60,  "connector": ConnectorType.CCS2,      "price": 1700, "status": ChargerStatus.AVAILABLE},
            {"label": "DC-02", "type": "DC", "kw": 60,  "connector": ConnectorType.CCS2,      "price": 1700, "status": ChargerStatus.OFFLINE},
            {"label": "AC-01", "type": "AC", "kw": 22,  "connector": ConnectorType.TYPE2,     "price": 1000, "status": ChargerStatus.AVAILABLE},
        ],
    },
    {
        "id_suffix": "C1",
        "owner_id": OWNER2_ID,
        "name": "Charging Guru — Bandra Mumbai",
        "address": "Hill Road, Bandra West, Mumbai",
        "city": "Mumbai", "state": "Maharashtra", "pincode": "400050",
        "lat": 19.0596, "lng": 72.8295,
        "amenities": ["wifi", "restroom", "parking", "cafe"],
        "status": StationStatus.ACTIVE, "rating_avg": 4.4, "rating_count": 97,
        "chargers": [
            {"label": "DC-01", "type": "DC", "kw": 60,  "connector": ConnectorType.CCS2,      "price": 1800, "status": ChargerStatus.AVAILABLE},
            {"label": "DC-02", "type": "DC", "kw": 60,  "connector": ConnectorType.CCS2,      "price": 1800, "status": ChargerStatus.AVAILABLE},
            {"label": "AC-01", "type": "AC", "kw": 7.4, "connector": ConnectorType.TYPE2,     "price": 950,  "status": ChargerStatus.AVAILABLE},
        ],
    },
    # Pending approval — to test admin flow
    {
        "id_suffix": "P1",
        "owner_id": OWNER2_ID,
        "name": "EV Hub — Pune Koregaon Park (Pending)",
        "address": "North Main Road, Koregaon Park, Pune",
        "city": "Pune", "state": "Maharashtra", "pincode": "411001",
        "lat": 18.5362, "lng": 73.8929,
        "amenities": ["parking"],
        "status": StationStatus.PENDING_APPROVAL, "rating_avg": 0.0, "rating_count": 0,
        "chargers": [
            {"label": "DC-01", "type": "DC", "kw": 60, "connector": ConnectorType.CCS2, "price": 1500, "status": ChargerStatus.OFFLINE},
        ],
    },
]


# ── Main ───────────────────────────────────────────────────────────────────────

async def seed():
    async with AsyncSessionLocal() as db:

        # ── Roles (upsert — safe to re-run) ─────────────────────────────────
        for r in ROLES:
            await db.execute(
                text("INSERT INTO roles (id, name) VALUES (:id, :name) ON CONFLICT (id) DO NOTHING"),
                {"id": r["id"], "name": r["name"]},
            )
        await db.commit()
        print("[OK] Roles upserted")

        # ── Seed users (skip if phone already exists) ─────────────────────────
        users_created = 0
        for u in USERS:
            exists = (await db.execute(
                text("SELECT 1 FROM users WHERE phone = :phone"), {"phone": u["phone"]}
            )).scalar()
            if exists:
                print(f"  [SKIP] User {u['phone']} already exists")
                # Still ensure roles are assigned
                user_row = (await db.execute(
                    text("SELECT id FROM users WHERE phone = :phone"), {"phone": u["phone"]}
                )).fetchone()
                uid_val = user_row[0]
            else:
                await db.execute(
                    text("""INSERT INTO users
                        (id, phone, full_name, email, referral_code, status, reward_points)
                        VALUES (:id, :phone, :name, :email, :ref, 'ACTIVE', 0)
                        ON CONFLICT (phone) DO NOTHING"""),
                    {"id": str(u["id"]), "phone": u["phone"], "name": u["full_name"],
                     "email": u["email"], "ref": u["referral_code"]},
                )
                uid_val = str(u["id"])
                users_created += 1

            for role_id in u["roles"]:
                await db.execute(
                    text("INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid) ON CONFLICT DO NOTHING"),
                    {"uid": str(uid_val), "rid": role_id},
                )
        await db.commit()
        print(f"[OK] Users: {users_created} created, roles assigned")

        # ── Vehicles (skip if user already has vehicles) ──────────────────────
        vehicles_created = 0
        for v in VEHICLES:
            exists = (await db.execute(
                text("SELECT 1 FROM users WHERE id = :uid"), {"uid": str(v["user_id"])}
            )).scalar()
            if not exists:
                print(f"  [SKIP] Vehicle owner {v['user_id']} not found")
                continue
            already = (await db.execute(
                text("SELECT COUNT(*) FROM vehicles WHERE user_id = :uid"), {"uid": str(v["user_id"])}
            )).scalar()
            if already:
                print(f"  [SKIP] User {v['user_id']} already has vehicles")
                continue
            await db.execute(
                text("""INSERT INTO vehicles
                    (id, user_id, brand, model, battery_kwh, range_km, connector_type, is_default)
                    VALUES (:id, :uid, :brand, :model, :kwh, :range_km, :conn, :default)"""),
                {"id": str(uid()), "uid": str(v["user_id"]), "brand": v["brand"],
                 "model": v["model"], "kwh": float(v["battery_kwh"]),
                 "range_km": v["range_km"], "conn": v["connector_type"].value,
                 "default": v["is_default"]},
            )
            vehicles_created += 1
        await db.commit()
        print(f"[OK] Vehicles: {vehicles_created} created")

        # ── Stations + Chargers (upsert by fixed UUID) ────────────────────────
        stations_created = 0
        chargers_created = 0
        for i, s in enumerate(STATIONS_RAW):
            sid = uuid.UUID(f"00000000-0000-0000-0001-{i+1:012d}")

            # Ensure owner exists
            owner_exists = (await db.execute(
                text("SELECT 1 FROM users WHERE id = :uid"), {"uid": str(s["owner_id"])}
            )).scalar()
            if not owner_exists:
                print(f"  [SKIP] Station '{s['name']}' — owner {s['owner_id']} not found")
                continue

            await db.execute(
                text("""INSERT INTO stations
                    (id, owner_id, name, address, city, state, pincode, lat, lng,
                     amenities, status, rating_avg, rating_count)
                    VALUES (:id, :owner, :name, :addr, :city, :state, :pin, :lat, :lng,
                            CAST(:amenities AS jsonb), CAST(:status AS station_status),
                            :rating_avg, :rating_count)
                    ON CONFLICT (id) DO UPDATE SET
                        status = EXCLUDED.status,
                        rating_avg = EXCLUDED.rating_avg,
                        rating_count = EXCLUDED.rating_count"""),
                {
                    "id": str(sid), "owner": str(s["owner_id"]),
                    "name": s["name"], "addr": s["address"],
                    "city": s["city"], "state": s["state"], "pin": s["pincode"],
                    "lat": s["lat"], "lng": s["lng"],
                    "amenities": json.dumps(s["amenities"]),
                    "status": s["status"].value,
                    "rating_avg": s["rating_avg"], "rating_count": s["rating_count"],
                },
            )
            stations_created += 1

            for j, c in enumerate(s["chargers"]):
                cid = uuid.UUID(f"00000000-0000-0000-0002-{i+1:06d}{j+1:06d}")
                await db.execute(
                    text("""INSERT INTO chargers
                        (id, station_id, label, charger_type, power_kw, connector_type,
                         price_per_kwh, status)
                        VALUES (:id, :sid, :label, :ctype, :kw,
                                CAST(:conn AS connector_type),
                                :price,
                                CAST(:status AS charger_status))
                        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status"""),
                    {
                        "id": str(cid), "sid": str(sid), "label": c["label"],
                        "ctype": c["type"], "kw": float(c["kw"]),
                        "conn": c["connector"].value, "price": c["price"],
                        "status": c["status"].value,
                    },
                )
                chargers_created += 1

        await db.commit()
        print(f"[OK] Stations: {stations_created} upserted, chargers: {chargers_created} upserted")

    print()
    print("=" * 60)
    print("  Seed complete!")
    print("=" * 60)
    print()
    print("  Roles:")
    for r in ROLES:
        print(f"    {r['id']}. {r['name']}")
    print()
    print("  Seed users (OTP debug_code in API response):")
    for u in USERS:
        role_str = ", ".join(str(r) for r in u["roles"])
        print(f"    {u['phone']:>15}  {u['full_name']:<20} roles=[{role_str}]")
    print()
    print("  Stations:")
    for i, s in enumerate(STATIONS_RAW):
        sid = f"00000000-0000-0000-0001-{i+1:012d}"
        print(f"    {s['city']:<12} {s['name'][:38]:38} ({len(s['chargers'])} chargers)  id={sid}")
    print()
    print("  API:  http://localhost:8000/docs")
    print()


if __name__ == "__main__":
    asyncio.run(seed())
