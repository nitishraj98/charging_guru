# 14 · Monitoring & Observability Strategy

Three pillars — **metrics, logs, traces** — plus error tracking and business KPIs. Everything correlates on `trace_id`.

## 1. Stack

| Concern | Tool |
|---------|------|
| Metrics | **Prometheus** (scrape `/metrics`) + **Grafana** dashboards |
| Logs | **Structured JSON** (structlog) → CloudWatch / Loki, searchable |
| Traces | **OpenTelemetry** → Tempo/Jaeger (or vendor) |
| Errors | **Sentry** (backend + web + mobile RN) |
| Uptime/synthetic | external probes (health endpoints, key flows) |
| Alerting | Alertmanager + PagerDuty/Slack |

## 2. Metrics (Prometheus)

**RED method** per endpoint (Rate, Errors, Duration) via `prometheus-fastapi-instrumentator`, plus custom business metrics:

```
# Technical
http_requests_total{route,method,status}
http_request_duration_seconds_bucket{route}
db_pool_in_use / db_query_duration_seconds
redis_command_duration_seconds
celery_task_duration_seconds{task,status}
celery_queue_depth{queue}
ws_active_connections

# Business
bookings_created_total{status}
booking_payment_success_total / booking_payment_failed_total
qr_verify_total{result}
charging_sessions_completed_total
maps_api_calls_total{type,cache}   # cache hit/miss for cost control
gmv_paise_total
```

## 3. Dashboards (Grafana)

1. **Service health:** RPS, p50/p95/p99 latency, 5xx rate, saturation (CPU/mem), pool usage.
2. **Booking funnel:** created → paid → confirmed → checked-in → completed; drop-off + payment success %.
3. **Availability/real-time:** WS connections, publish rate, propagation latency, cache hit ratio.
4. **Async health:** queue depth per queue, task latency, failure/retry rate, dead-letter.
5. **Payments:** order→capture latency, webhook backlog, refund rate, reconciliation mismatches.
6. **Cost guards:** Maps API cache hit ratio + call volume, S3/CloudFront usage.
7. **Business KPIs:** DAU/MAU, GMV, utilization, new signups, retention cohorts (from warehouse).

## 4. Logging

- **Structured JSON** with: `timestamp, level, service, env, trace_id, span_id, request_id, user_id?, route, status, latency_ms, message`.
- Correlation: middleware injects `request_id`/`trace_id`; propagated to Celery tasks and WS.
- **PII redaction** filter (phone/email masked) before shipping.
- Log levels disciplined: INFO for lifecycle, WARN for recoverable, ERROR for failures (also → Sentry). No secrets ever logged.
- Centralized (CloudWatch Logs Insights / Loki) with retention by class (app 30d, audit copy long-term in S3).

## 5. Tracing

- OpenTelemetry auto-instrumentation for FastAPI, SQLAlchemy, Redis, httpx (Razorpay/Maps/FCM), Celery.
- End-to-end spans: request → service → repo/DB → external call → async task continuation.
- Sampling: head-based (e.g. 10%) + tail-sampling for errors/slow requests.

## 6. Error Tracking (Sentry)

- Backend, web, admin, and both RN apps report to Sentry with release + env tags.
- Source maps (web/RN) uploaded in CI for readable stack traces.
- Alerts on new/regressed issues, error-rate spikes; linked to `trace_id` for cross-tool drill-down.

## 7. SLOs & Alerting

| SLO | Target | Alert |
|-----|--------|-------|
| API availability | 99.9% monthly | error-budget burn-rate (fast/slow) |
| Discovery p95 | < 300 ms | sustained breach 5m |
| Booking-create p95 | < 400 ms | sustained breach 5m |
| Payment webhook processing | < 5 s p95 | backlog > N or age > threshold |
| Availability propagation | < 2 s | publish→deliver lag |
| Payment success rate | > 98% | drop below 95% (page) |
| Queue depth | bounded | depth > threshold for 5m → autoscale + alert |

- **Multi-window burn-rate alerts** (fast 5m + slow 1h) to reduce noise.
- Severity tiers: P1 (paging — payments down, API down), P2 (degraded), P3 (warning).
- Runbook link attached to every alert.

## 8. Synthetic & Real-User Monitoring

- Synthetic probes for: health, login (OTP stub), discovery, booking-create (staging), payment webhook.
- **RUM** on web (Web Vitals) + mobile (startup, screen render, crash-free sessions %).

## 9. Audit & Compliance Monitoring

- Fraud rules emit metrics + alerts (QR replay attempts, refund abuse, velocity anomalies).
- Audit-log volume + anomaly detection (e.g., spike in admin refunds).
- Data-access monitoring on PII endpoints.

## 10. On-Call & Incident Process

- PagerDuty rotation; Slack `#incidents`; severity-based escalation.
- Incident lifecycle: detect → triage → mitigate → resolve → **blameless postmortem** with action items tracked.
- Status page for external comms during major incidents.
