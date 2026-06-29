# 12 · Scalability Strategy

**Targets:** 500k registered · 50k DAU · 5k stations · 50k bookings/day (~0.6 bookings/s avg, peak ~5–10×). Read-heavy (discovery/availability) vs write-spiky (bookings at peak hours, e.g. 6–10pm).

## 1. Capacity Model (back-of-envelope)

| Metric | Estimate |
|--------|----------|
| Bookings/day | 50,000 → ~0.6/s avg, ~6/s peak |
| Availability/discovery reads | ~10–50× bookings → hundreds/s peak |
| WS concurrent connections | tens of thousands at peak |
| Writes (bookings+sessions+payments+history) | bursty, partition-friendly |
| Storage growth | bookings ~1.5M rows/month; archived after 12m |

Design rule: **reads scale out cheaply (cache + replicas); writes stay on a well-tuned primary with hot tables partitioned**.

## 2. Stateless Horizontal Scaling

- FastAPI app tier is **stateless** → run N replicas behind ALB; autoscale on CPU + RPS + p95 latency.
- Sessions/locks/cache externalized to Redis; no in-process state except ephemeral WS connections.
- **WebSocket tier** scaled separately (sticky or shared via Redis pub/sub so any instance can deliver any station's updates).
- Celery workers autoscale by queue depth; separate queues (`payments`, `notifications`, `invoices`, `maintenance`) so slow tasks don't block fast ones.

## 3. Redis Caching Strategy

| Data | Pattern | TTL |
|------|---------|-----|
| Charger availability | cache-aside hash `avail:station:{id}` | short (seconds–minutes) + event invalidation |
| Directions/route plans | keyed by geohash(src)|geohash(dst)|profile | hours |
| Places/geocode | cache-aside | hours–days |
| Station detail (read) | cache-aside | minutes |
| Subscription tier / user flags | cache-aside | minutes |
| Rate-limit counters | sliding window | window |
| Distributed locks | `SET NX PX` | seconds |
| Idempotency results | keyed by Idempotency-Key | 24h |
| Session/JWT denylist | set | token TTL |

- **Invalidation:** write-through/event-driven for availability (status change → update + publish). Cache stampede protection via single-flight + jittered TTL.
- Redis **Cluster** mode at scale; separate logical DBs/instances for cache vs broker vs pub/sub if needed.

## 4. PostgreSQL Scaling

- **Read replicas:** route discovery, history, analytics, admin reads to replicas (SQLAlchemy replica session). Primary handles writes + read-after-write paths (booking).
- **Connection pooling:** **PgBouncer** (transaction pooling) in front of RDS — essential with many app/worker replicas.
- **Partitioning:** monthly range partitions on `bookings`, `transactions`, `charger_status_history`, `audit_logs`, `notifications` (see DB doc) → bounded index size, fast pruning, cheap archival.
- **Hot-row contention** on booking slots solved by short Redis locks + partial unique constraint (DB is the final arbiter, but contention window is tiny).
- **Archival:** detach old partitions → export Parquet to S3 → load to warehouse; keeps OLTP lean.
- Vertical headroom on primary (RDS instance class) + Multi-AZ for HA; consider Aurora PostgreSQL for faster replica scaling later.

## 5. Async Processing

- Push everything non-critical to Celery (notifications, invoices, reconciliation, rewards, analytics, partition maintenance, dynamic-pricing recompute).
- **Backpressure:** if a queue grows, autoscale workers; rate-limit producers for non-urgent tasks.
- **Idempotent tasks** with retries (exponential backoff) + dead-letter handling.

## 6. CDN & Static

- CloudFront in front of S3 (media, invoices) and web static assets.
- Next.js ISR for marketing/station SEO pages — cached at edge, regenerated on interval.
- Presigned S3 uploads bypass app tier for media.

## 7. Real-Time at Scale

- Redis Pub/Sub fan-out; all WS instances subscribe to station channels.
- Reduce WS pressure: clients only subscribe to currently-viewed station(s); idle/hidden tabs unsubscribe; server coalesces rapid updates.
- For very high fan-out later: move to Redis Streams or a dedicated pub/sub (NATS) — seam already isolated in `availability` module.

## 8. Hot-Path Optimizations

- Discovery query: PostGIS GiST index + bounded radius + result cap; availability merged from Redis (not per-charger DB hits).
- Booking create: minimal synchronous work (lock, insert, order); everything else async.
- Avoid N+1: eager-load with `selectinload`; project only needed columns.

## 9. Multi-Region / DR (Phase 3)

- Primary region **ap-south-1** (data residency). 
- Cross-region read replica + S3 cross-region replication for DR; documented RTO/RPO (target RPO < 5 min via continuous replication, RTO < 1h).
- Active-active out of scope initially; warm standby acceptable.

## 10. Scaling Roadmap by Stage

| Stage | Users | Posture |
|-------|-------|---------|
| MVP | <10k | Single app instances, single RDS, single Redis, compose-style on ECS |
| Growth | 10k–100k | Add replicas, PgBouncer, Redis cluster, autoscaling, CDN, partitioning live |
| Scale | 100k–500k+ | Extract hot modules (availability, booking, payments) to services, warehouse for analytics, multi-AZ + DR, dynamic pricing |

## 11. Load Testing & SLOs

- SLOs: discovery p95 < 300 ms, booking-create p95 < 400 ms, availability propagation < 2 s, payment webhook processing < 5 s.
- Load tests (k6/Locust) model peak booking surge + discovery storm; run in staging each release; capacity headroom target 40%.
