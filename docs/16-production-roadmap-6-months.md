# 16 · Production Roadmap (6 Months)

From closed-beta MVP → scaled, feature-complete platform. Each month has a theme, exit criteria, and scale posture.

---

## Month 1 — MVP Launch & Stabilization
**Theme:** harden the happy path, instrument everything.
- Close beta feedback loop; fix top crashes/funnel drop-offs.
- Reviews & rewards **GA** (verified reviews, points ledger, redemption).
- Referral system live.
- Public app store launch (user app) + web GA for NCR corridor.
- Harden webhooks/reconciliation; refund automation.
**Exit:** 1k+ real bookings, payment success > 98%, crash-free sessions > 99%.

## Month 2 — Subscriptions & Monetization
**Theme:** turn on revenue levers.
- Subscriptions FREE/SILVER/GOLD (Razorpay subscriptions), tier benefits enforced (discounts, priority window, hold time, reward multipliers).
- Booking/convenience fee logic + tier discounts.
- Invoicing GST-compliant series, downloadable PDFs.
- Operator revenue dashboard + payouts reporting.
**Exit:** first subscription revenue; operator payout report accepted.

## Month 3 — Route Optimization & Real-Time at Scale
**Theme:** the differentiator + scale reads.
- **AI route optimization**: battery-consumption model (vehicle/terrain/temp factors), optimal multi-stop placement (beyond greedy), ETA with charging.
- Read replicas + PgBouncer in prod; partitioning live; cache tuning.
- WebSocket availability scaled (shared pub/sub, subscription hygiene).
- Maps cost optimization (aggressive caching, request coalescing) measured.
**Exit:** route planner NPS up; discovery p95 < 300 ms at 5× MVP load.

## Month 4 — Dynamic Pricing & Queue Prediction
**Theme:** intelligence on demand/supply.
- **Dynamic pricing** engine (peak hours, demand, availability) with guardrails + transparency to users; operator opt-in.
- **Queue/wait prediction** from current usage + historical bookings (per charger/time-of-day model).
- Pricing/forecast jobs on Celery Beat; A/B framework.
**Exit:** measurable utilization uplift for operators; pricing within fairness guardrails.

## Month 5 — Fleet & B2B
**Theme:** second revenue engine.
- **Fleet management**: fleet accounts, driver assignment, consolidated billing, expense analytics, role-scoped access.
- Corporate invoicing + GST; bulk station/charger onboarding tools.
- Admin sub-roles (SUPPORT/FINANCE/OPS) with scoped permissions + maker-checker on finance.
**Exit:** first fleet customer onboarded with consolidated billing.

## Month 6 — Scale, Reliability & Expansion
**Theme:** prove the 500k-ready posture.
- Module extraction where load demands (availability/booking/payments as services behind the existing seams).
- Analytics warehouse live (events → S3 → warehouse); BI dashboards for ops + investors.
- DR: cross-region replicas, restore drills, documented RTO/RPO; chaos/load tests at target scale.
- OCPP ingestion pilot (real charger telemetry) — Phase-2 integration.
- Expand to 2nd corridor/city; growth tooling (referrals, promos, featured stops).
**Exit:** sustained load test at 50k bookings/day with SLOs met; DR drill passed; multi-corridor live.

---

## Cross-cutting tracks (every month)
- **Quality:** test coverage growth, e2e suite expansion, perf budgets.
- **Security:** quarterly pentest, dependency hygiene, audit reviews.
- **Observability:** SLO refinement, alert noise reduction, cost dashboards.
- **Growth/BD:** operator supply expansion ahead of demand.

## Milestone scale targets

| Month | Users | DAU | Stations | Bookings/day |
|-------|-------|-----|----------|--------------|
| 1 | 5k | 500 | 50 | 200 |
| 2 | 20k | 2k | 200 | 1k |
| 3 | 60k | 6k | 700 | 5k |
| 4 | 150k | 15k | 1.5k | 12k |
| 5 | 300k | 30k | 3k | 25k |
| 6 | 500k+ | 50k | 5k+ | 50k+ |
