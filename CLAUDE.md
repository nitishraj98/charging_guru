# Charging Guru — Project Context for Claude

Single reference file. Read this at the start of every session to understand what exists and where work left off.

---

## What is this?

Production-grade EV charging platform. FastAPI backend + a unified Next.js 15 web app covering the user, station-owner, and admin surfaces.

**Original plan vs. actual build:** `docs/` (written 2026-06-16) specified 4 separate clients — RN User App, Next.js User Website, RN Station Owner App, Next.js Admin Panel. What actually got built is the backend (matches plan) plus **one** Next.js app (`web/`) that covers user + owner + admin in a single codebase (`/`, `/owner/*`, `/admin/*` routes). The two React Native mobile apps were never started. CI/CD and Terraform IaC (planned as part of the Day-30 MVP exit criteria) were never started either — see "What's pending" below.

---

## Tech stack

| Layer | Choice |
|---|---|
| API | FastAPI, Pydantic v2, uvicorn |
| DB | PostgreSQL 16 + PostGIS (prod) · SQLite + aiosqlite (tests) |
| ORM | async SQLAlchemy 2.0, Alembic migrations |
| Cache / PubSub | Redis 7 |
| Auth | JWT HS256, rotating refresh tokens, OTP phone login |
| Payments | Razorpay (order create, HMAC-SHA256 verify, webhook, refund) |
| QR | HMAC-SHA256 signed tokens + Redis SET NX for replay prevention |
| WebSocket | asyncio.wait FIRST_COMPLETED hub pattern |
| Testing | pytest-asyncio, httpx AsyncClient, SQLite StaticPool, FakeRazorpayGateway, FakeRedis |
| Dev infra | Docker Compose (4 services), Makefile |

### Key conventions
- All PKs are UUIDv7
- All money is integer paise (never floats)
- All errors use RFC 9457 Problem Details (`code`, `title`, `detail`, `status`)
- Architecture layers: `api/` → `services/` → `repositories/` → `models/`
- No network calls in tests — everything injectable / monkeypatched

---

## Project layout

```
charging_guru/
├── CLAUDE.md                        ← this file
├── README.md                        ← public-facing overview (describes an aspirational monorepo
│                                        layout with web-user/web-admin/mobile-user/mobile-owner —
│                                        those split dirs do NOT exist; actual web code is in web/)
├── Makefile                         ← make up / down / test / migrate / psql / redis
├── docker-compose.yml               ← db + redis + migrate + api (4 services)
├── docs/                            ← original planning docs (PRD, architecture, roadmap),
│                                        written 2026-06-16, not kept in sync with actual build
├── design/                          ← design tokens + Figma-ready screen specs (brand, user/owner/admin)
├── infra/compose/                   ← duplicate/older docker-compose.yml (no Terraform exists anywhere)
├── postman/
│   ├── charging-guru.postman_collection.json     ← 30 endpoints, 9 folders, auto-chaining scripts
│   └── charging-guru-local.postman_environment.json
├── web/                             ← Next.js 15 app: user + owner + admin in one codebase (see below)
└── backend/
    ├── .env.example                 ← all CG_* env vars (Razorpay keys, DB URL, etc.)
    ├── .dockerignore
    ├── Dockerfile
    ├── pyproject.toml
    ├── alembic.ini
    ├── app/
    │   ├── main.py                  ← FastAPI app, router registration, lifespan
    │   ├── core/
    │   │   ├── config.py            ← CG_* settings via pydantic-settings
    │   │   ├── security.py          ← JWT encode/decode, password hashing
    │   │   ├── redis.py             ← get_redis() dependency
    │   │   ├── qr.py                ← issue_qr() + verify_qr() (HMAC + Redis jti)
    │   │   └── razorpay.py          ← RazorpayGateway class + get_razorpay_gateway()
    │   ├── db/
    │   │   ├── base.py              ← async engine + sessionmaker + ORMModel base
    │   │   └── migrations/versions/ ← 3 migration files (users/roles, stations/chargers/bookings, payments)
    │   ├── models/
    │   │   ├── enums.py             ← BookingStatus, ChargerStatus, StationStatus, PaymentStatus, RoleName
    │   │   ├── user.py              ← User, Role, UserRole (M2M)
    │   │   ├── station.py           ← Station (PostGIS location), Charger
    │   │   ├── booking.py           ← Booking (state machine), hold_expires_at, qr_jti
    │   │   └── payment.py           ← Payment (Razorpay IDs, status, webhook_event_id)
    │   ├── repositories/
    │   │   ├── user_repo.py
    │   │   ├── station_repo.py      ← nearby() with PostGIS ST_DWithin
    │   │   ├── booking_repo.py
    │   │   ├── payment_repo.py
    │   │   └── admin_repo.py        ← counts/sums for analytics + paginated lists
    │   ├── schemas/
    │   │   ├── auth.py
    │   │   ├── users.py
    │   │   ├── stations.py
    │   │   ├── bookings.py
    │   │   ├── payments.py          ← PaymentOrderIn/Out, PaymentVerifyIn/Out, QRVerifyIn/Out
    │   │   └── admin.py             ← PagedResult[T] (Generic), AdminOverviewOut, UserAdminOut, StationAdminOut
    │   ├── services/
    │   │   ├── auth_service.py      ← OTP request/verify, refresh, logout
    │   │   ├── user_service.py
    │   │   ├── station_service.py   ← create, update, charger status
    │   │   ├── availability_service.py ← slot generation, Redis availability cache
    │   │   ├── booking_service.py   ← create (with hold), expire_stale_holds()
    │   │   ├── payment_service.py   ← create_order, verify_payment, handle_webhook, refund_booking
    │   │   ├── session_service.py   ← qr_checkin, start, complete (ownership check)
    │   │   └── admin_service.py     ← get_overview (7 parallel queries), list_users, list_stations, approve/reject
    │   └── api/
    │       ├── deps.py              ← all FastAPI dependencies (get_*_service, require_roles, get_current_user)
    │       ├── v1/
    │       │   ├── auth.py          ← /auth/otp/request, /auth/otp/verify, /auth/refresh, /auth/logout
    │       │   ├── users.py         ← GET/PATCH /users/me
    │       │   ├── stations.py      ← GET /stations (discovery), GET /stations/{id}
    │       │   ├── owner.py         ← POST /owner/stations, PATCH /chargers/{id}/status
    │       │   ├── chargers.py      ← GET /chargers/{id}/slots
    │       │   ├── bookings.py      ← POST /bookings, GET /bookings, GET /bookings/{id}
    │       │   ├── payments.py      ← POST /payments/order, /verify, /webhook, GET /payments/booking/{id}, POST /payments/{id}/refund
    │       │   ├── qr.py            ← POST /qr/verify (owner/admin only)
    │       │   ├── sessions.py      ← POST /sessions/{id}/start, /complete (owner/admin only)
    │       │   └── admin.py         ← GET /admin/analytics/overview, users, stations; POST approve/reject/expire-holds
    │       └── ws/
    │           └── hub.py           ← WebSocket /ws/stations/{station_id} (Redis pub/sub relay)
    └── tests/
        ├── conftest.py              ← engine, client, seed_station, admin_tokens, FakeRazorpayGateway, FakeRedis
        └── api/
            ├── test_auth.py
            ├── test_stations.py
            ├── test_bookings.py
            ├── test_payments_qr_session.py  ← 14 tests: full payment + QR + session flow
            ├── test_admin.py                ← 12 tests: RBAC, analytics, station approval
            └── test_lifecycle.py            ← 7 tests: cancel, refund, hold expiry
```

---

## Web app (`web/`)

Next.js 15 App Router, TypeScript, Tailwind. Single app serving three role-based route trees, all talking to the FastAPI backend via `src/lib/`:

- **User routes** — `/`, `/login`, `/discover` (Leaflet map + geolocation), `/plan` + `/plan/results` (route planning), `/station/[id]`, `/booking/[id]` + `/bookings/*`, `/pay/[id]`, `/qr/[id]`, `/journey/*`, `/trips`, `/vehicles`, `/profile`, `/rewards`, `/membership` + `/membership/checkout/[tier]`, `/become-owner`
- **Owner routes** — `/owner`, `/owner/stations` + `/owner/stations/new`, `/owner/bookings`, `/owner/sessions` (QR scan/check-in)
- **Admin routes** — `/admin`, `/admin/users`, `/admin/owners`, `/admin/applications` (approve/reject), `/admin/stations`, `/admin/chargers`, `/admin/bookings`, `/admin/sessions`, `/admin/revenue`, `/admin/settings`

Role gating (`ROLE_STATION_OWNER` / `ROLE_ADMIN`) is enforced client-side in `owner/layout.tsx` and `admin/layout.tsx` — see "What's pending" for the known weakness here.

**External services** (see `web/THIRD_PARTY_SERVICES.md`): Google Maps (Places/Directions/Geocoding, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`) with Haversine fallback if unset; Open Charge Map as a station-data fallback when the backend is unavailable; Razorpay client SDK; CARTO tiles for Leaflet (no key needed).

**Responsive:** all 32 pages audited and passing across 14 breakpoints (`web/RESPONSIVE_TEST_REPORT.md`).

**Perf history:** a 20s navigation freeze (dead fetch to a nonexistent `/api/v1/routes/plan` backend endpoint) and several sequential-auth-fetch waterfalls were fixed — see `web/PERFORMANCE_REPORT.md`.

---

## Booking state machine

```
PENDING_PAYMENT → (payment verified) → CONFIRMED
CONFIRMED       → (QR scanned)       → CHECKED_IN
CHECKED_IN      → (owner starts)     → IN_PROGRESS
IN_PROGRESS     → (owner completes)  → COMPLETED

Any of {PENDING_PAYMENT, CONFIRMED, CHECKED_IN} → (cancel/refund) → CANCELLED
PENDING_PAYMENT → (hold_expires_at passed, sweep) → EXPIRED
```

---

## Payment flow

1. `POST /payments/order` — creates Razorpay order, returns `razorpay_order_id`
2. User pays in Razorpay SDK (mobile/web)
3. `POST /payments/verify` — client sends `razorpay_order_id + payment_id + signature` → HMAC verify → booking CONFIRMED + QR token issued (not stored in DB)
4. `POST /payments/webhook` — idempotent server-side confirmation (deduped via `webhook_event_id`)
5. `POST /payments/{id}/refund` — cancel booking + best-effort Razorpay refund (`contextlib.suppress` wraps the refund call — never blocks cancellation)

---

## QR token format

```
base64url(json_payload) + "." + hex_HMAC_SHA256(jwt_secret, payload_bytes)
```
- `payload` contains `booking_id`, `jti` (UUID), `iat`
- Redis `SET qr:used:{jti} 1 NX EX 86400` enforces single-use (replay attack prevention)
- `issue_qr()` returns `(token_string, jti)` — caller stores `jti` on `booking.qr_jti`
- `verify_qr()` verifies sig + atomically consumes jti

---

## WebSocket

`GET /ws/stations/{station_id}` — real-time charger availability

On connect:
1. Subscribe to Redis channel `station:{id}`
2. Send HGETALL snapshot of current charger states
3. Two concurrent asyncio Tasks: `_relay_pubsub` (Redis → WS) and `_receive_client` (WS → pong)
4. `asyncio.wait(FIRST_COMPLETED)` — whichever finishes first (disconnect/error) cancels the other

---

## Docker Compose services

| Service | Image | Role |
|---|---|---|
| `db` | postgis/postgis:16-3.4 | PostgreSQL + PostGIS, port 5432 |
| `redis` | redis:7-alpine | Redis with AOF, port 6379 |
| `migrate` | (built from ./backend) | Runs `alembic upgrade head`, exits 0 |
| `api` | (built from ./backend) | uvicorn --reload on port 8000 |

Startup order: `db` healthy → `migrate` completed → `api` starts; `redis` healthy → `api` starts.

---

## Test infrastructure

- **DB**: SQLite StaticPool (in-memory, shared across async tasks) via `aiosqlite`
- **FakeRazorpayGateway**: `create_order` returns `{"id": f"order_test_{receipt}"}`, `verify_payment_signature` returns `signature == "valid_sig"`, `verify_webhook_signature` returns `signature == "valid_webhook_sig"`, `refund` returns dict
- **FakeRedis**: dict-backed stub with SET NX semantics; fresh instance per `client` fixture → replay test correctly sees None on second call
- **`admin_tokens` fixture**: logs in via OTP, assigns ROLE_ADMIN directly via engine (no re-login needed — roles loaded from DB on every request via selectin loading)
- **`seed_station` fixture**: creates owner user + station + charger + approves station

---

## Roles

| Role | Can do |
|---|---|
| (no role) | Auth, view own profile, discover stations, view slots |
| ROLE_STATION_OWNER | All above + create station, update charger status, scan QR, start/complete sessions |
| ROLE_ADMIN | All above + admin analytics, user listing, station approve/reject, expire-holds sweep |

---

## Environment variables (key ones)

```bash
CG_DATABASE_URL=postgresql+asyncpg://...   # SQLite for tests
CG_REDIS_URL=redis://localhost:6379/0
CG_JWT_SECRET=changeme
CG_OTP_DEBUG=true                          # Returns debug_code in OTP response (dev only)
CG_RAZORPAY_KEY_ID=rzp_test_...
CG_RAZORPAY_KEY_SECRET=...
CG_RAZORPAY_WEBHOOK_SECRET=...
```

---

## Test phone numbers

| Phone | Role |
|---|---|
| +919876543210 | Regular user |
| +919000000001 | Station owner (seed_station fixture) |
| +918000000001 | Admin (admin_tokens fixture) |

---

## What's done

**Backend (52 tests passing):**
- [x] Auth: OTP request/verify, JWT refresh, logout
- [x] Users: profile get/update
- [x] Stations: create, discover (PostGIS radius), detail
- [x] Chargers: slot availability (Redis cache), status update
- [x] Bookings: create (with slot hold), list, get, state machine
- [x] Payments: Razorpay order, client verify, webhook, refund
- [x] QR: signed token issue + Redis single-use verify
- [x] Sessions: QR check-in, start, complete
- [x] Admin: analytics overview, user list, station list, approve/reject, expire-holds
- [x] WebSocket: real-time charger status via Redis pub/sub
- [x] Hold expiry sweep: bulk SQLAlchemy UPDATE, admin maintenance endpoint
- [x] Docker Compose: 4-service stack with health checks and ordered startup
- [x] Makefile: up/down/test/migrate/psql/redis/shell/lint targets
- [x] Postman collection: 30 endpoints, auto-chaining test scripts

**Web app (`web/`)** — ahead of the original MVP scope, which had deferred these to Phase 2:
- [x] Full user flow: discovery, route planning, booking, payment, QR, trips, vehicles, profile
- [x] Owner portal: stations, bookings, sessions/QR scan
- [x] Admin panel: users, owners, applications, stations, chargers, bookings, sessions, revenue, settings
- [x] Membership/subscriptions wired to real Razorpay checkout (was planned as Month-2 Phase 2 work)
- [x] Rewards page wired to real backend (was planned as Phase 2/GA)
- [x] Responsive audit complete: 32/32 pages, 14 breakpoints
- [x] Perf fixes: killed 20s nav freeze, parallelized auth waterfalls

---

## What's pending

Real gaps against `docs/` (the original plan), in rough priority order:

**1. Mobile apps — not started.** The RN User App and RN Station Owner App from the original plan don't exist. Everything mobile-shaped today is just the responsive web app.

**2. CI/CD — not started.** No `.github/workflows`. No lint/test-on-PR, no build-on-merge.

**3. IaC / staging-prod infra — not started.** `infra/` only has a local docker-compose file (duplicate of the root one). No Terraform, no ECS/RDS/ElastiCache, despite being an M3 (Day-30) exit criterion in `docs/18-development-milestones.md`.

**4. Observability — not started.** No Grafana, Sentry, or Prometheus wired up anywhere, despite being planned MVP scope.

**5. `web/` auth is client-side only.** `owner/layout.tsx` / `admin/layout.tsx` gate on role by fetching `/users/me` after mount and showing a spinner — a determined user briefly sees the shell before the redirect. Should move to Next.js middleware validating the JWT cookie server-side before render (see `web/PERFORMANCE_REPORT.md` "Remaining Issues").

**6. No real route-planning backend endpoint.** The web app's `/plan` flow calls a local Haversine-based fallback because `/api/v1/routes/plan` was never implemented on the backend — this was the actual differentiator feature in the PRD.

**7. Minor:** `web/IMPLEMENTATION_PROGRESS.md` still says "pending: progress tracking for mobile/admin" — stale now that admin is done and mobile doesn't exist as a concept in this codebase; should be deleted or rewritten if kept.

Last session: read through `docs/` and `web/*.md` reports and reconciled this file with actual repo state. No code changes made.
