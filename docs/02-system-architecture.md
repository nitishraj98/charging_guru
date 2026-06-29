# 02 · System Architecture

## 1. Architectural Principles

1. **Clean Architecture** in the backend — API → Services → Repositories → Models, with Core/Events/Workers/WS as cross-cutting layers. Business logic never depends on frameworks.
2. **Stateless services** behind a load balancer → horizontal scaling. All state in Postgres/Redis/S3.
3. **CQRS-lite**: heavy reads (discovery, availability) served from Redis + read replicas; writes go to primary.
4. **Async by default**: anything not needed for the synchronous response (notifications, invoices, FCM, analytics, reconciliation) runs on Celery.
5. **Idempotency & eventual consistency** for payments and external integrations (webhooks, Maps).
6. **Defense in depth**: WAF/edge → API gateway → service authz → row-level checks → audit log.

## 2. Logical Architecture

```
                         ┌─────────────────────────────────────────────┐
   Clients               │                  EDGE / CDN                  │
 ┌──────────┐            │  CloudFront (static, web assets, S3 media)   │
 │ User App │            │  Route53 DNS · AWS WAF · TLS termination      │
 │ (Expo)   │            └───────────────────────┬─────────────────────┘
 ├──────────┤                                     │
 │Owner App │  HTTPS / WSS                         ▼
 ├──────────┤            ┌─────────────────────────────────────────────┐
 │ User Web │───────────▶│           Nginx / ALB (L7 LB)                │
 ├──────────┤            │   routing, rate-limit, gzip, sticky-WS       │
 │Admin Web │            └───────────────────────┬─────────────────────┘
 └──────────┘                                     │
                         ┌───────────────────────┴─────────────────────┐
                         │              FastAPI app tier                │
                         │  (Uvicorn workers, autoscaled, stateless)    │
                         │                                              │
                         │  API layer ── Services ── Repositories       │
                         │     │             │            │             │
                         │  WS hub      Domain logic   SQLAlchemy 2.0    │
                         └───┬──────────┬──────────┬────────────┬───────┘
                             │          │          │            │
                  ┌──────────▼──┐  ┌────▼────┐ ┌───▼─────┐ ┌────▼──────────┐
                  │   Redis     │  │ Postgres│ │ Postgres│ │  Celery queue │
                  │ cache/locks │  │ primary │ │ replica │ │  (Redis broker)│
                  │ pub/sub/WS  │  │ (writes)│ │ (reads) │ └────┬──────────┘
                  └─────────────┘  └─────────┘ └─────────┘      │
                                                          ┌──────▼───────────┐
                                                          │ Celery workers    │
                                                          │ + Beat scheduler  │
                                                          └──────┬───────────┘
                                                                 │
        External integrations (via gateway/adapters, server-side):
        Razorpay · Google Maps/Directions/Places · FCM · AWS S3 · Email/SMS
```

## 3. Service Decomposition (modular monolith → extractable)

We launch as a **modular monolith** (one deployable FastAPI app, clear internal module boundaries) for velocity, with seams to extract high-load modules into services later.

| Module | Responsibility | Extraction candidate? |
|--------|----------------|------------------------|
| `auth` | OTP, JWT, sessions, devices, RBAC | Later (identity service) |
| `users` | profile, vehicles | No |
| `catalog` | stations, chargers, amenities, photos | No |
| `geo` | route planning, geospatial search, Maps adapter | **Yes** (Maps cost isolation) |
| `availability` | charger status, Redis cache, WS fan-out | **Yes** (real-time service) |
| `booking` | slots, reservations, locking | **Yes** (hotspot at scale) |
| `payments` | Razorpay orders, webhooks, refunds, invoices | **Yes** (PCI/compliance isolation) |
| `qr` | signed QR issue/verify | No |
| `sessions` | charging session lifecycle, metering | No |
| `rewards` | points, referrals, membership | No |
| `reviews` | ratings, photos, moderation | No |
| `fleet` | fleet accounts, consolidated billing | **Yes** (B2B) |
| `pricing` | dynamic pricing engine | **Yes** |
| `admin` | back-office operations | No |
| `notifications` | FCM/email/SMS dispatch (async) | **Yes** |
| `analytics` | event ingestion → warehouse | **Yes** |

## 4. Data Stores

| Store | Use | Notes |
|-------|-----|-------|
| **PostgreSQL 16 (primary)** | system of record, all writes | PostGIS for geospatial; partitioning for high-volume tables |
| **PostgreSQL read replicas** | discovery, analytics reads, admin reports | async streaming replication |
| **Redis 7** | cache (availability, sessions, route results), distributed locks, rate-limit counters, Celery broker, WS pub/sub | cluster mode at scale |
| **AWS S3** | profile/station/review photos, invoices PDF, exports | served via CloudFront, presigned uploads |
| **Analytics warehouse** (Phase 2) | OLAP, BI | events streamed from app → S3 → warehouse (e.g. Redshift/ClickHouse) |

## 5. Real-Time Availability Pipeline

```
Owner app sets charger OFFLINE
        │  PATCH /chargers/{id}/status
        ▼
Service validates + writes Postgres (charger_status_history append)
        │
        ├──▶ Redis SET availability:{station_id} (hash) TTL
        │
        └──▶ Redis PUBLISH chan:station:{station_id}  {charger_id, status}
                        │
        WS hub (subscribed) ──▶ pushes to connected clients viewing that station
                        │
        Booking service availability checks read Redis first (cache-aside)
```

- **Cache key design:** `avail:station:{id}` → hash of `{charger_id: status}`; `avail:charger:{id}` for point reads.
- **Fan-out:** Redis Pub/Sub → WS hub; for multi-instance WS, all instances subscribe to the same channels (shared Redis).
- **Fallback:** if Redis miss, read replica → repopulate cache.

## 6. Booking Concurrency Model

1. Client requests slot for `(charger_id, start, end)`.
2. Service acquires Redis lock `lock:slot:{charger_id}:{slot_id}` (SET NX PX, e.g. 10s).
3. Validates slot is free in DB (`booking_slots` row state) under lock.
4. Creates `bookings` row in `PENDING_PAYMENT`; DB **unique constraint** on `(charger_id, slot_id)` for active states is the ultimate guard.
5. Creates Razorpay order; returns to client.
6. On payment webhook success → booking `CONFIRMED`, QR issued.
7. If payment not completed within hold TTL → Celery Beat releases slot, booking `EXPIRED`.

## 7. Synchronous vs Asynchronous Boundaries

| Synchronous (request path) | Asynchronous (Celery) |
|-----------------------------|------------------------|
| Auth, slot lock + booking create | Send OTP SMS, FCM push |
| Razorpay order create | Invoice PDF generation + S3 upload |
| QR verify | Payment webhook reconciliation retries |
| Availability read | Reward points accrual, referral payout |
| Route compute (cached) | Analytics event flush |
| | Slot expiry sweeps (Beat) |
| | Review photo moderation |
| | Dynamic pricing recompute (Beat) |

## 8. External Integration Adapters

All third-party calls go through an **adapter layer** (`core/integrations/*`) with: timeouts, retries (exponential backoff + jitter), circuit breakers, and response caching where legal/sensible.

- **Razorpay:** order/refund APIs + signed webhooks; HMAC verification.
- **Google Maps:** Directions, Places, Geocoding — **server-side only**, results cached in Redis (e.g. directions keyed by `geohash(src)|geohash(dst)|profile`, TTL hours).
- **FCM:** push to user/owner devices (booking confirmed, arriving, session complete).
- **SMS provider:** OTP delivery (e.g. MSG91/Twilio) with rate limits.

## 9. Environments

| Env | Purpose | Infra |
|-----|---------|-------|
| `local` | dev | docker-compose (api, db, redis, worker, mailhog, minio) |
| `staging` | pre-prod, QA, load tests | scaled-down AWS mirror |
| `production` | live | multi-AZ AWS |

## 10. Technology Decision Records (summary)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API framework | FastAPI | async, Pydantic v2, OpenAPI native, high throughput |
| ORM | SQLAlchemy 2.0 (async) | mature, async, fine-grained control |
| Geo | PostGIS | route-corridor & radius queries in DB, no extra store |
| Real-time | Redis Pub/Sub + WS | simple, scales with Redis; no Kafka needed at MVP |
| Task queue | Celery + Redis | proven, rich scheduling (Beat) |
| Monolith vs micro | Modular monolith | velocity now, clean seams for later extraction |
| IDs | UUIDv7 | sortable, non-enumerable, replica-friendly |
