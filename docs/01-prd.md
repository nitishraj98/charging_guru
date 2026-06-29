# 01 · Product Requirements Document (PRD)

**Product:** Charging Guru — EV charging discovery, reservation & payments platform
**Doc owner:** CTO / Product
**Status:** v1.0 (funding + build baseline)
**Last updated:** 2026-06-16

---

## 1. Problem Statement

EV adoption in India is accelerating, but **range anxiety** and **charger uncertainty** remain the biggest barriers to long-distance travel. Drivers cannot reliably know:

1. Which chargers lie *along* their route (not just near a destination).
2. Whether a charger is **available right now** or will be when they arrive.
3. Whether the connector matches their vehicle.
4. Whether they can **guarantee a slot** instead of gambling on a queue.

Station operators, conversely, have **idle assets**, no demand forecasting, and weak monetization tooling.

**Charging Guru closes both gaps:** a route-aware marketplace that converts uncertain, ad-hoc charging into **reserved, paid, verified** sessions — while giving operators utilization, pricing, and revenue tooling.

## 2. Vision

> *"Never worry about where or when to charge. Plan once, charge everywhere."*

Become the **default trip-planning + reservation layer** for EV mobility across India, then expand to fleets and B2B.

## 3. Goals & Non-Goals

### Goals (12 months)
- Reservation-backed charging with guaranteed slots and QR verification.
- Route planning that places **optimal charging stops** between source & destination.
- Real-time availability for every onboarded charger.
- Two-sided liquidity: 5,000 chargers + 500k users.
- Sustainable take-rate via commission + subscriptions + dynamic pricing.

### Non-Goals (v1)
- Manufacturing/operating physical hardware (we integrate, not build OCPP hardware initially; OCPP ingestion is a Phase-2 integration).
- In-house mapping/routing engine (we use Google Maps).
- Cross-border / international expansion.
- Vehicle telematics OEM integrations (Phase 3).

## 4. Personas

| Persona | Description | Primary Jobs-to-be-Done |
|---------|-------------|--------------------------|
| **Ria — Daily Commuter** | Owns a Tata Nexon EV, charges 3×/week | Find a free nearby charger, reserve, pay, go |
| **Arjun — Road-tripper** | Drives Noida→Patna occasionally | Plan a route with reliable charging stops, avoid being stranded |
| **Fleet Manager — Meera** | Runs 40 delivery EVs | Track charging spend, assign drivers, get analytics & invoices |
| **Station Owner — Sanjay** | Owns 3 stations / 12 chargers | Maximize utilization & revenue, verify bookings, control availability |
| **Ops Admin — Internal** | Platform operator | Approve stations, resolve disputes, monitor fraud, refunds |

## 5. Scope by Application

| App | Platform | Audience | Core scope |
|-----|----------|----------|-----------|
| **User App** | React Native (Expo) | EV drivers | OTP login, vehicles, route planner, discovery, real-time availability, booking, payment, QR, history, rewards, membership, reviews |
| **User Website** | Next.js 15 | EV drivers | Feature parity with user app (login, plan, discover, book, pay, manage, invoices) |
| **Station Owner App** | React Native (Expo) | Operators | Dashboard, QR scanner & verification, revenue, charger & slot management, availability control, analytics, maintenance mode |
| **Admin Panel** | Next.js 15 | Internal ops | User mgmt, station approval & mgmt, payments/refunds, membership mgmt, analytics, reports, fraud, system monitoring |

## 6. Core Functional Requirements

### 6.1 Authentication
- Mobile OTP login (primary), email optional.
- JWT access tokens (short-lived) + rotating refresh tokens.
- Session & device tracking; remote logout.
- RBAC: `ROLE_USER`, `ROLE_STATION_OWNER`, `ROLE_ADMIN`.

### 6.2 Profile & Vehicles
- Profile: name, phone (verified), email, profile image (S3).
- Multiple vehicles per user: brand, model, **battery capacity (kWh)**, **estimated range (km)**, **connector type** (CCS2 / Type2 / CHAdeMO / GB-T).

### 6.3 Route Planner *(differentiator)*
- Input: source + destination (+ optional current SoC %).
- Output: route polyline, **recommended charging stops**, estimated charging duration per stop, total trip time, energy plan.
- Filters: connector type, min power (kW), amenities, price ceiling.

### 6.4 Discovery & Availability
- Geospatial search ("near me", "along route", "near destination").
- Real-time charger status: `AVAILABLE / BOOKED / OCCUPIED / OFFLINE / MAINTENANCE`.
- Live updates via WebSocket; cached availability via Redis.

### 6.5 Booking
- Select station → charger → time slot → pay → confirm.
- Slot locking to prevent double-booking (Redis distributed lock + DB constraint).
- Cancellation & refund policy windows.

### 6.6 Payments (Razorpay)
- Create order, verify signature, capture, refunds, invoices, payment logs.
- Idempotent order creation; webhook reconciliation.

### 6.7 QR System
- Signed QR encoding `booking_id, station_id, user_id, expiry, signature`.
- Owner scans → backend validates booking existence, payment success, slot validity, non-expiry, signature.

### 6.8 Sessions, Rewards, Reviews
- Charging session lifecycle: start → metering → complete → invoice.
- Reward points, referrals, membership multipliers.
- Station reviews with rating, photos, feedback (moderated).

### 6.9 Advanced (phased)
- Real-time availability (Redis + WS) — *MVP*.
- Queue/wait prediction — *Phase 2*.
- AI route optimization (battery consumption, stops, ETA) — *Phase 2*.
- Dynamic pricing (peak/demand/availability) — *Phase 2*.
- Fleet management — *Phase 3*.
- Subscriptions: FREE / SILVER / GOLD — *Phase 2*.

## 7. Subscription Tiers

| Benefit | FREE | SILVER | GOLD |
|---------|------|--------|------|
| Booking | ✅ | ✅ | ✅ |
| Reward multiplier | 1× | 1.5× | 2× |
| Booking fee discount | 0% | 5% | 10% |
| Priority booking window | — | 5 min | 15 min |
| Slot hold time | 5 min | 8 min | 12 min |
| Support | Standard | Priority | Concierge |

## 8. Monetization

1. **Commission** per session (e.g. 8–12% of energy charge).
2. **Convenience/booking fee** (waived/discounted by tier).
3. **Subscriptions** (SILVER/GOLD monthly).
4. **Dynamic pricing margin** during peak demand.
5. **Fleet B2B** plans (per-vehicle SaaS + consolidated billing).
6. **Featured listings / sponsored stops** (later).

## 9. Success Metrics (North Star + KPIs)

- **North Star:** *Completed reserved charging sessions / week.*
- Activation: % of signups that complete first booking within 7 days (target >25%).
- Reservation→Session conversion (target >85%).
- Charger utilization uplift for operators (target +20%).
- Payment success rate (target >98%).
- Booking p95 API latency < 300 ms; availability fan-out < 2 s.
- Refund/dispute rate < 1.5%.
- 30-day user retention > 35%.

## 10. Constraints & Assumptions

- Razorpay is sole PSP at launch (India).
- Google Maps quota & cost managed via caching + server-side proxy.
- Operators self-onboard but require admin approval before going live.
- Charger telemetry initially via operator app status updates; OCPP later.
- Compliance: India DPDP Act (data protection), PCI-DSS scope minimized (no card data stored — tokenized via Razorpay), GST-compliant invoicing.

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Cold-start liquidity (chargers vs users) | High | Seed supply via operator partnerships before consumer launch; route-corridor focus (NCR→East) |
| Stale availability → bad UX | High | Short TTL caches, owner status SLAs, "verify on arrival" grace + auto-refund |
| Payment disputes/fraud | Med | Signed QR, idempotent webhooks, fraud rules, audit logs |
| Maps API cost spikes | Med | Server-side caching of directions/places, request coalescing |
| Double-booking | High | Redis lock + unique DB constraint on `(charger_id, slot)` |
| Regulatory (DPDP, GST) | Med | Field encryption, consent, compliant invoice service |

## 12. Release Strategy

- **MVP (Day 30):** OTP auth, vehicles, discovery + map, slot booking, Razorpay payment, QR generate/verify, owner availability control, basic admin approval. Single region (NCR corridor).
- **Phase 2 (M2–M4):** Route optimization, dynamic pricing, subscriptions, queue prediction, reviews/rewards GA, WebSocket availability at scale.
- **Phase 3 (M5–M6):** Fleet management, OCPP ingestion, advanced analytics, multi-region read replicas, marketplace growth tooling.
