# 15 · MVP Roadmap (30 Days)

**Goal:** A live, revenue-capable slice — a driver can find a charger, reserve a slot, pay, get a QR, and an operator can scan it to start/complete a session. Single corridor (NCR), seeded supply.

**MVP scope (in):** OTP auth, profile + vehicles, geospatial discovery + map, real-time availability (Redis+WS), slot booking with locking, Razorpay payment + webhook, signed QR generate/verify, owner availability control + scan + session, basic admin (station approval, refunds), invoices, structured logging + Sentry + core metrics.

**Out of MVP:** AI route optimization, dynamic pricing, subscriptions, queue prediction, fleet, reviews/rewards GA (stubs only), multi-region.

**Team assumption:** 2 backend, 1 RN, 1 web, 1 full-stack/DevOps, 1 PM/QA (≈6 people).

---

## Week 1 — Foundations (Days 1–7)

| Track | Deliverables |
|-------|-------------|
| Platform | Monorepo, CI (lint/type/test), docker-compose stack, base FastAPI app factory, settings, logging, error handling |
| Data | Postgres+PostGIS, core schema + Alembic (users, roles, sessions, vehicles, stations, chargers, slots, bookings), seeds |
| Auth | OTP request/verify (SMS provider sandbox), JWT + refresh rotation, session/device tracking, RBAC deps |
| Infra | ECR + staging ECS skeleton via Terraform, Nginx config, Redis up |
| Clients | RN + Next.js project scaffolds, design tokens/shadcn, typed API client from OpenAPI |

**Exit:** login works end-to-end on staging; CI green; one seeded station visible via API.

## Week 2 — Discovery & Booking Core (Days 8–14)

| Track | Deliverables |
|-------|-------------|
| Backend | Station/charger CRUD (owner), PostGIS discovery (`GET /stations`), slot generation, availability cache + WS hub + pub/sub |
| Booking | `POST /bookings` with Redis lock + partial-unique guard, hold TTL, Beat expiry sweep |
| User app/web | Discovery map+list+filters, station detail with live availability, slot picker, draft booking |
| Owner app | Charger list + status toggle (AVAILABLE/MAINTENANCE/OFFLINE) → reflects in user app real-time |

**Exit:** user sees live availability; can reserve a slot (PENDING_PAYMENT); double-booking prevented under concurrent test.

## Week 3 — Payments, QR, Sessions (Days 15–21)

| Track | Deliverables |
|-------|-------------|
| Payments | Razorpay order create, client verify, **webhook** (signature + idempotency), reconciliation task, refund on cancel |
| QR | Signed QR issue on CONFIRMED; `POST /qr/verify` with jti single-use, all validation checks |
| Sessions | `start`/`complete`; charger OCCUPIED↔AVAILABLE; invoice generation (PDF→S3); rewards accrual stub |
| Clients | Checkout (Razorpay) on app+web, QR display, owner scanner → verify → start → complete |
| Notifications | FCM push: booking confirmed, session complete (async) |

**Exit:** full happy path on staging: book → pay → QR → scan → charge → invoice. Refund path works.

## Week 4 — Admin, Hardening, Launch Prep (Days 22–30)

| Track | Deliverables |
|-------|-------------|
| Admin | Station approval queue + approve/reject, user list/suspend, payments + manual refund, basic KPI overview |
| Quality | Integration + API tests on critical paths; load test booking surge; fix p95 hotspots |
| Security | Rate limits, security headers, secrets in Secrets Manager, QR/payment audit logs, pen-test checklist |
| Observability | Grafana dashboards (service + booking funnel), Sentry on all apps, alerts on payment success + API errors |
| Ops | Prod Terraform apply, blue/green deploy + rollback drill, backup/restore drill, runbooks |
| Launch | Seed 20–50 real chargers (NCR), onboard pilot operators, app store internal/preview builds, soft launch to closed beta |

**Exit / MVP Definition of Done:**
- Closed beta live on NCR corridor with real payments.
- p95 booking < 400 ms; payment success > 97% in test.
- Monitoring + alerting live; rollback proven.
- Admin can approve stations and issue refunds.

## Risks to MVP timeline & mitigations
- **Razorpay/SMS sandbox→prod approval delays** → start KYC/onboarding Day 1.
- **Maps cost/quotas** → server-side proxy + caching from Week 2.
- **Supply cold-start** → BD seeds operators in parallel (non-eng track) from Day 1.
