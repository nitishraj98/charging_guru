# 07 · Backend Folder Structure (Clean Architecture)

## 1. Layering Rule

Dependencies point **inward**. API depends on Services; Services depend on Repositories (via interfaces) and Domain; Repositories depend on Models. Core/Schemas are shared. Nothing inner imports FastAPI.

```
API  ─▶ Services ─▶ Repositories ─▶ Models (SQLAlchemy)
 │          │            ▲
 ▼          ▼            │
Schemas   Domain      Core (config, db, security, integrations, cache)
            ▲
        Events / Workers / WebSockets (cross-cutting)
```

## 2. Tree

```
backend/
├── pyproject.toml                # poetry/uv, deps, ruff, mypy, pytest config
├── alembic.ini
├── Dockerfile
├── .env.example
├── gunicorn_conf.py              # uvicorn workers under gunicorn for prod
│
├── app/
│   ├── main.py                   # FastAPI app factory, router mounting, middleware
│   ├── __init__.py
│   │
│   ├── core/                     # framework-agnostic cross-cutting concerns
│   │   ├── config.py             # Pydantic Settings (env-driven, per-env)
│   │   ├── db.py                 # async engine, primary + replica session factories
│   │   ├── redis.py              # redis client, lock helper, cache helper
│   │   ├── security.py           # JWT issue/verify, password/otp hashing, RBAC deps
│   │   ├── qr.py                 # QR sign/verify (HMAC/Ed25519), jti registry
│   │   ├── pagination.py         # cursor pagination utils
│   │   ├── errors.py             # Problem+JSON exception classes + handlers
│   │   ├── logging.py            # structlog config, request_id/trace_id binding
│   │   ├── ratelimit.py          # Redis sliding-window limiter
│   │   ├── idempotency.py        # idempotency-key store
│   │   └── integrations/         # external adapters (timeouts, retries, breakers)
│   │       ├── razorpay.py
│   │       ├── google_maps.py
│   │       ├── fcm.py
│   │       ├── sms.py
│   │       └── s3.py
│   │
│   ├── api/                      # transport layer (thin controllers)
│   │   ├── deps.py               # get_current_user, require_roles, get_db, get_replica
│   │   ├── middleware.py         # request-id, timing, security headers, gzip
│   │   └── v1/
│   │       ├── router.py         # aggregates all routers
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── vehicles.py
│   │       ├── routes.py
│   │       ├── stations.py
│   │       ├── chargers.py
│   │       ├── bookings.py
│   │       ├── payments.py
│   │       ├── qr.py
│   │       ├── sessions.py
│   │       ├── rewards.py
│   │       ├── subscriptions.py
│   │       ├── reviews.py
│   │       ├── notifications.py
│   │       └── admin.py
│   │
│   ├── schemas/                  # Pydantic v2 request/response DTOs (per module)
│   │   ├── common.py             # Page[T], ProblemDetail, GeoPoint
│   │   ├── auth.py  users.py  vehicles.py  routes.py
│   │   ├── stations.py  chargers.py  bookings.py  payments.py
│   │   ├── qr.py  sessions.py  rewards.py  subscriptions.py
│   │   ├── reviews.py  notifications.py  admin.py
│   │
│   ├── services/                 # business logic / use-cases (no SQL, no FastAPI)
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── vehicle_service.py
│   │   ├── route_service.py      # energy model + maps adapter + corridor query
│   │   ├── station_service.py
│   │   ├── availability_service.py  # Redis cache + WS publish
│   │   ├── booking_service.py    # locking, slot validation, state machine
│   │   ├── payment_service.py    # orders, verify, refunds, webhooks, idempotency
│   │   ├── qr_service.py
│   │   ├── session_service.py
│   │   ├── reward_service.py
│   │   ├── subscription_service.py
│   │   ├── pricing_service.py    # dynamic pricing (Phase 2)
│   │   ├── review_service.py
│   │   ├── notification_service.py
│   │   └── admin_service.py
│   │
│   ├── repositories/             # data access; one per aggregate
│   │   ├── base.py               # generic async CRUD, unit-of-work
│   │   ├── user_repo.py  vehicle_repo.py  session_repo.py  otp_repo.py
│   │   ├── station_repo.py  charger_repo.py  slot_repo.py
│   │   ├── booking_repo.py  payment_repo.py  invoice_repo.py
│   │   ├── reward_repo.py  subscription_repo.py  review_repo.py
│   │   ├── notification_repo.py  audit_repo.py
│   │   └── geo_repo.py           # PostGIS corridor/radius queries
│   │
│   ├── models/                   # SQLAlchemy 2.0 ORM (mapped dataclasses)
│   │   ├── base.py               # DeclarativeBase, mixins (TimestampMixin, UUIDPk)
│   │   ├── enums.py
│   │   ├── user.py  role.py  session.py  otp.py  vehicle.py
│   │   ├── station.py  charger.py  slot.py  status_history.py
│   │   ├── booking.py  charging_session.py
│   │   ├── payment.py  transaction.py  invoice.py
│   │   ├── reward.py  referral.py  subscription.py
│   │   ├── review.py  photo.py  notification.py  audit.py  fleet.py
│   │
│   ├── domain/                   # pure domain logic (no IO)
│   │   ├── booking_state.py      # state machine transitions
│   │   ├── energy_model.py       # SoC/consumption/stop placement
│   │   ├── pricing_rules.py
│   │   └── policies.py           # refund windows, hold TTLs, tier benefits
│   │
│   ├── events/                   # internal event bus + handlers
│   │   ├── bus.py                # publish/subscribe (in-proc → Redis stream later)
│   │   ├── types.py              # BookingConfirmed, SessionCompleted, ...
│   │   └── handlers.py           # fan-out: enqueue celery tasks, ws notify
│   │
│   ├── workers/                  # Celery
│   │   ├── celery_app.py
│   │   ├── beat_schedule.py      # slot-expiry sweep, partition mgmt, pricing recompute
│   │   └── tasks/
│   │       ├── notifications.py  # send_sms, send_push, send_email
│   │       ├── invoices.py       # generate_invoice_pdf → S3
│   │       ├── payments.py       # reconcile_payment, process_refund
│   │       ├── rewards.py        # accrue_points, referral_payout
│   │       ├── bookings.py       # expire_unpaid_holds, no_show_sweep
│   │       ├── availability.py   # stale-status sweeper
│   │       └── maintenance.py    # create_partitions, archive_to_s3
│   │
│   ├── websockets/
│   │   ├── hub.py                # connection manager, Redis pub/sub bridge
│   │   ├── auth.py               # WS token auth
│   │   └── handlers.py           # station subscribe, booking updates
│   │
│   └── db/
│       ├── migrations/           # Alembic versions
│       │   ├── env.py
│       │   └── versions/
│       └── seeds/                # dev seed data (roles, demo stations)
│
└── tests/
    ├── conftest.py               # async client, test db (testcontainers), fixtures
    ├── unit/                     # services + domain (mocked repos)
    ├── integration/              # repos + real PG/Redis (testcontainers)
    ├── api/                      # endpoint contract tests
    └── load/                     # k6/locust scripts
```

## 3. Key Patterns

- **App factory** (`create_app()`): mounts middleware (request-id, security headers, CORS, gzip), exception handlers, routers, OpenAPI metadata, Prometheus instrumentation, startup/shutdown (engine, redis, ws hub).
- **Dependency injection** via FastAPI `Depends`: `get_db` (primary), `get_replica` (reads), `get_current_user`, `require_roles("ROLE_ADMIN")`.
- **Unit of Work:** a request-scoped async session; services receive repositories bound to that session; commit at the edge of the use-case.
- **Repository interfaces:** services depend on protocols, enabling mock repos in unit tests.
- **No business logic in routers** — they validate (Pydantic), call a service, map result to a response schema.
- **Settings per env** via `CHARGING_GURU_ENV` selecting `.env.{env}`; secrets from AWS Secrets Manager in prod.

## 4. Example: booking endpoint wiring (illustrative)

```python
# api/v1/bookings.py
@router.post("", response_model=BookingCreatedOut, status_code=201)
async def create_booking(
    payload: BookingCreateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    idem: str | None = Header(None, alias="Idempotency-Key"),
):
    svc = BookingService(BookingRepo(db), SlotRepo(db), PaymentService(...), redis)
    return await svc.create_booking(user.id, payload, idempotency_key=idem)
```

```python
# services/booking_service.py  (logic, framework-free)
async def create_booking(self, user_id, payload, idempotency_key=None):
    async with self.redis.lock(f"lock:slot:{payload.charger_id}:{payload.slot_id}", ttl=10):
        slot = await self.slots.get_free_or_raise(payload.slot_id)
        booking = await self.bookings.create_pending(user_id, payload, slot)
        order = await self.payments.create_order(booking, idempotency_key)
    await self.events.publish(BookingCreated(booking.id))
    return BookingCreatedOut.from_domain(booking, order)
```
