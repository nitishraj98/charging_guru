# 17 · Cost Estimation

All figures **indicative monthly** in USD (₹ ≈ ×83), India region (ap-south-1). Cloud costs are on-demand estimates; reserved/savings plans cut 30–50% at scale. Numbers are planning ranges, not quotes.

## 1. Infrastructure — by stage

### Stage A — MVP / Beta (<10k users, ~200 bookings/day)
| Item | Spec | Monthly |
|------|------|---------|
| ECS Fargate (api/ws/worker/beat) | ~4–6 small tasks | $120–200 |
| RDS PostgreSQL | db.t4g.medium Multi-AZ | $130–180 |
| ElastiCache Redis | cache.t4g.small | $40–70 |
| ALB + data | 1 ALB | $25–40 |
| S3 + CloudFront | low volume | $15–30 |
| Route53 + WAF | basic | $25–40 |
| Secrets/KMS/ECR/logs | — | $20–40 |
| **Subtotal** | | **~$380–600** |

### Stage B — Growth (~100k users, ~12k bookings/day)
| Item | Spec | Monthly |
|------|------|---------|
| ECS Fargate (autoscaled) | api/ws/workers | $600–1,000 |
| RDS primary + 1 replica | db.r6g.large Multi-AZ + replica | $700–1,000 |
| PgBouncer (small task) | — | $30 |
| ElastiCache Redis | cache.r6g.large (cluster) | $250–400 |
| ALB + data transfer | — | $100–200 |
| S3 + CloudFront | media/invoices | $80–200 |
| WAF + Route53 | — | $60–120 |
| Observability infra | Prometheus/Grafana/Loki hosts or managed | $150–300 |
| **Subtotal** | | **~$2,000–3,300** |

### Stage C — Scale (500k users, 50k bookings/day)
| Item | Spec | Monthly |
|------|------|---------|
| ECS Fargate (large autoscale) | api/ws/workers + extracted services | $2,000–3,500 |
| RDS primary + 2–3 replicas | db.r6g.xlarge+ Multi-AZ | $2,500–4,000 |
| ElastiCache Redis cluster | multi-node | $700–1,200 |
| ALB + heavy data transfer | — | $400–800 |
| S3 + CloudFront | media + analytics | $300–700 |
| Analytics warehouse | Redshift/ClickHouse | $500–1,200 |
| WAF/Route53/observability | — | $400–800 |
| Cross-region DR | replicas + S3 CRR | $500–1,000 |
| **Subtotal** | | **~$7,300–13,200** |

## 2. Third-Party / Usage-Based

| Service | Cost model | MVP | Scale |
|---------|-----------|-----|-------|
| **Google Maps** (Directions/Places/Geocode) | per call; ~$5–17 / 1k after free $200 | **mitigated by caching** — $100–400 | $1,500–5,000 (cache-dependent) |
| **Razorpay** | ~2% + GST per txn (no fixed) | scales with GMV | scales with GMV |
| **SMS OTP** | ₹0.12–0.20/SMS | $50–200 | $1,000–3,000 |
| **FCM (push)** | free | $0 | $0 |
| **Sentry** | tier | $26–80 | $300–800 |
| **EAS (Expo) builds** | plan | $0–99 | $99–299 |
| **Domain/TLS** | — | ~$15 | ~$15 |

> **Maps is the #1 cost risk.** Server-side proxy + Redis caching of directions/places is mandatory; target >70% cache hit. Negotiate Google Maps Platform committed-use discount at scale.

## 3. People (team) — monthly, blended India rates (indicative)

| Role | MVP (mo 1) | Scale (mo 6) |
|------|-----------|--------------|
| Backend engineers | 2 | 3–4 |
| Frontend/web | 1 | 2 |
| Mobile (RN) | 1 | 2 |
| DevOps/SRE | 0.5 (shared) | 1–2 |
| Product/QA | 1 | 2 |
| Data/ML (Phase 2+) | — | 1 |
| Design | 0.5 | 1 |
| **Approx headcount** | **~6** | **~12–14** |
| **Approx payroll/mo** | $18k–30k | $45k–80k |

## 4. Indicative Total Burn

| Stage | Infra+3P | People | **Total/mo** |
|-------|----------|--------|--------------|
| MVP/Beta | ~$0.6–1.2k | $18–30k | **~$19–31k** |
| Growth | ~$4–8k | $30–55k | **~$34–63k** |
| Scale | ~$12–25k | $45–80k | **~$57–105k** |

## 5. Cost Optimization Levers
- **Reserved Instances / Savings Plans** (RDS, ElastiCache, Fargate) → 30–50% off committed baseline.
- **Maps caching + coalescing**; consider OSRM self-host for non-critical routing later.
- **Read replicas + caching** offload primary → smaller/fewer write nodes.
- **Partition archival to S3/Glacier** → keep hot OLTP small.
- **CloudFront caching** of static/media; ISR for SEO pages.
- **Autoscaling to baseline at night**; spot for non-critical workers.
- **GMV-linked costs** (Razorpay/SMS) scale with revenue — healthy unit economics if take-rate > processing cost.

## 6. Unit Economics (illustrative)
- Avg session energy 20 kWh × ₹18/kWh = ₹360 charge.
- Platform take (10%) = ₹36; booking fee ₹10 → ~₹46 gross/booking.
- Variable cost/booking: Razorpay (~₹7) + SMS (~₹0.2) + Maps (amortized ~₹1–3) + infra (~₹1–2) ≈ ₹10–13.
- **Contribution ≈ ₹33–36/booking** before fixed costs → at 50k bookings/day ≈ ₹1.6–1.8M/day gross contribution potential (pre-fixed). Validates the model contingent on supply liquidity + take-rate.
