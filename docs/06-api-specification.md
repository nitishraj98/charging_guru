# 06 · API Specification (REST v1)

Base URL: `https://api.charging-guru.com/api/v1`
Auth: `Authorization: Bearer <access_token>` unless marked **public**.
Content: `application/json`. Errors: **RFC 9457** `application/problem+json`.

## 0. Conventions

### Standard error envelope
```json
{
  "type": "https://api.charging-guru.com/errors/slot-unavailable",
  "title": "Slot no longer available",
  "status": 409,
  "detail": "The selected slot was just booked by another user.",
  "instance": "/api/v1/bookings",
  "code": "SLOT_UNAVAILABLE",
  "trace_id": "01J..."
}
```

### Common status codes
`200` OK · `201` Created · `202` Accepted (async) · `204` No Content · `400` validation · `401` unauthenticated · `403` forbidden (RBAC) · `404` not found · `409` conflict (locks/duplicates) · `422` semantic validation · `429` rate-limited · `5xx` server.

### Pagination
Cursor-based: `?limit=20&cursor=<opaque>` → `{ "data": [...], "next_cursor": "...", "has_more": true }`.

### Idempotency
Mutating money/booking endpoints accept `Idempotency-Key` header; server stores result keyed by it for 24h.

### Rate limits (per identity/IP, sliding window via Redis)
OTP request: 5/hour/phone · auth verify: 10/10min · booking create: 30/min · general authed: 600/min. `429` returns `Retry-After`.

---

## 1. Auth  `/auth`

### POST /auth/otp/request **(public)**
Req: `{ "phone": "+919876543210" }`
Validation: E.164; rate-limited.
Res `200`: `{ "request_id": "uuid", "ttl_seconds": 300 }`
Errors: `429 OTP_RATE_LIMIT`, `400 INVALID_PHONE`.

### POST /auth/otp/verify **(public)**
Req: `{ "request_id": "uuid", "code": "123456", "device": {"id":"...","name":"Pixel","platform":"android"} }`
Res `200`:
```json
{
  "access_token": "jwt", "refresh_token": "jwt",
  "expires_in": 900,
  "user": { "id":"uuid","phone":"+91...","full_name":null,"roles":["ROLE_USER"],"is_new":true }
}
```
Errors: `400 INVALID_CODE`, `410 OTP_EXPIRED`, `429 TOO_MANY_ATTEMPTS`.

### POST /auth/refresh **(public, refresh token)**
Req: `{ "refresh_token": "jwt" }` → Res `200`: new pair (refresh rotated, old revoked).
Errors: `401 INVALID_REFRESH`, `401 REFRESH_REVOKED`.

### POST /auth/logout · GET /auth/sessions · DELETE /auth/sessions/{id}
Manage device sessions (revoke single/all). `204` on revoke.

---

## 2. Users & Vehicles  `/users`, `/vehicles`

### GET /users/me → `200` profile (+ roles, subscription tier, reward_points).
### PATCH /users/me  Req: `{ "full_name":"Ria","email":"ria@x.com" }` (email triggers verify).
### POST /users/me/avatar  → returns S3 presigned PUT `{ "upload_url","s3_key" }`; client PUTs file, then PATCH profile with key.

### GET /vehicles → list. 
### POST /vehicles
Req:
```json
{ "brand":"Tata","model":"Nexon EV","battery_kwh":40.5,"range_km":312,
  "connector_type":"CCS2","is_default":true }
```
Validation: battery_kwh>0, connector in enum. Res `201` vehicle.
### PATCH /vehicles/{id} · DELETE /vehicles/{id} (soft delete; cannot delete if active booking).

---

## 3. Routes  `/routes`

### POST /routes/plan
Req:
```json
{ "source": {"lat":28.57,"lng":77.32},
  "destination": {"lat":25.59,"lng":85.13},
  "vehicle_id":"uuid", "current_soc":80,
  "filters": {"min_power_kw":50,"connector_type":"CCS2","amenities":["restroom"]} }
```
Res `200`:
```json
{
  "route": {"distance_km":1015,"duration_min":1080,"polyline":"enc..."},
  "energy_plan": {"required_stops":2,"total_charge_min":95},
  "stops": [
    {"station_id":"uuid","name":"GreenCharge Lucknow","detour_min":4,
     "arrive_soc":18,"charge_to_soc":80,"charge_min":45,"eta":"2026-06-16T14:20:00Z",
     "price_per_kwh":1800,"available_chargers":3}
  ]
}
```
Validation: coords valid, vehicle owned. Errors: `422 NO_STATIONS_ON_ROUTE`, `503 MAPS_UNAVAILABLE` (serves degraded if cached).

---

## 4. Stations & Chargers  `/stations`, `/chargers`

### GET /stations  (discovery; **public** read)
Query: `lat,lng,radius_km` OR `route_id`; filters `connector_type,min_power_kw,amenities,price_max,open_now`; `sort=distance|price|rating`.
Res `200`: paginated stations with `distance_km`, `rating_avg`, `live_availability:{available,total}`.

### GET /stations/{id} → details + chargers (with live status) + amenities + photos + recent reviews.

### GET /chargers/{id} → charger detail + next available slots.
### GET /chargers/{id}/slots?date=YYYY-MM-DD → available `booking_slots`.

### WS /ws/stations/{id} → subscribe; messages `{ "charger_id","status","ts" }`.

#### Owner/Admin write endpoints
- POST /owner/stations (create, → PENDING_APPROVAL)
- PATCH /owner/stations/{id}
- POST /owner/stations/{id}/chargers
- PATCH /chargers/{id}/status  Req `{ "status":"MAINTENANCE","reason":"firmware" }` → updates DB+Redis+WS. RBAC: owner-of-station or admin. Appends `charger_status_history`.

---

## 5. Bookings  `/bookings`

### POST /bookings  (Idempotency-Key recommended)
Req: `{ "charger_id":"uuid","slot_id":"uuid","vehicle_id":"uuid" }`
Flow: Redis lock → verify slot free → create `PENDING_PAYMENT` → Razorpay order.
Res `201`:
```json
{ "booking_id":"uuid","status":"PENDING_PAYMENT","amount":54000,
  "hold_expires_at":"2026-06-16T12:05:00Z",
  "payment": {"razorpay_order_id":"order_x","razorpay_key":"rzp_live_x","currency":"INR","amount":54000} }
```
Errors: `409 SLOT_UNAVAILABLE`, `422 CONNECTOR_MISMATCH`, `403 STATION_INACTIVE`.

### GET /bookings → user's bookings (filter `status`, paginated).
### GET /bookings/{id} → detail incl. `qr_token` if CONFIRMED.
### POST /bookings/{id}/cancel → applies refund policy; Res `200` `{ "refund_amount","refund_status" }`.
### GET /bookings/{id}/qr → `{ "qr_token","expires_at","qr_png_url" }` (CONFIRMED only).
### GET /bookings/{id}/invoice → invoice JSON + `pdf_url`.

**Booking state machine:**
`PENDING_PAYMENT → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED`; side exits `→ CANCELLED / EXPIRED / NO_SHOW`.

---

## 6. Payments  `/payments`

### POST /payments/verify  (client callback)
Req: `{ "razorpay_order_id","razorpay_payment_id","razorpay_signature" }`
Server verifies HMAC; idempotent. Res `200` `{ "status":"CAPTURED","booking_id" }`.
### POST /payments/webhook **(public, signed)** — Razorpay webhook; verify `X-Razorpay-Signature`; handles `payment.captured`, `payment.failed`, `refund.processed`. Always `200` after enqueueing reconciliation; idempotent on event id.
### GET /payments → user payment history. 
### GET /payments/{id} → detail + transactions ledger.
### POST /payments/{id}/refund  (admin/owner-policy) Req `{ "amount","reason" }`.

---

## 7. QR Verification  `/qr`

### POST /qr/verify  (RBAC: ROLE_STATION_OWNER/admin)
Req: `{ "qr_token":"<signed>","station_id":"uuid" }`
Server checks: signature valid, not expired, `jti` not previously consumed (Redis), booking exists, payment CAPTURED, slot active now (± grace), station matches.
Res `200`:
```json
{ "valid":true, "booking_id":"uuid","user":{"name":"Ria"},
  "vehicle":{"model":"Nexon EV","connector":"CCS2"},
  "charger":{"label":"Bay 1"}, "slot":{"start":"...","end":"..."} }
```
Errors: `401 QR_INVALID_SIGNATURE`, `410 QR_EXPIRED`, `409 QR_ALREADY_USED`, `403 WRONG_STATION`, `402 PAYMENT_NOT_CAPTURED`.

---

## 8. Sessions  `/sessions`

### POST /sessions/start  (owner) Req `{ "booking_id" }` → marks booking `IN_PROGRESS`, charger `OCCUPIED`, creates session. Res `201` session.
### PATCH /sessions/{id}/heartbeat → `{ "current_kwh","soc" }` (optional live metering).
### POST /sessions/{id}/complete (owner) Req `{ "energy_kwh","end_soc" }` → booking `COMPLETED`, charger `AVAILABLE`; enqueues invoice + rewards. Res `200` summary.

---

## 9. Rewards & Subscriptions  `/rewards`, `/subscriptions`, `/referrals`

- GET /rewards → balance + ledger.
- POST /rewards/redeem Req `{ "points","towards":"BOOKING","ref_id" }`.
- GET /referrals → code + status of invitees.
- GET /subscriptions/plans **(public)** → FREE/SILVER/GOLD benefits + price.
- POST /subscriptions Req `{ "tier":"GOLD" }` → creates Razorpay subscription. 
- POST /subscriptions/cancel → `current_period_end` retained.

---

## 10. Reviews  `/reviews`

### POST /reviews Req `{ "station_id","booking_id","rating":5,"comment":"...","photo_keys":[] }`
Validation: must have a COMPLETED booking at that station (verified review). Res `201`.
### GET /stations/{id}/reviews → paginated; PATCH/DELETE own review.

---

## 11. Notifications  `/notifications`
- GET /notifications (paginated, unread filter) · POST /notifications/{id}/read · POST /notifications/read-all.
- POST /devices/register Req `{ "fcm_token","platform" }` for push.

---

## 12. Admin  `/admin`  (RBAC: ROLE_ADMIN)

| Endpoint | Purpose |
|----------|---------|
| GET /admin/users?q&status | search/manage users |
| POST /admin/users/{id}/suspend | suspend/reactivate |
| GET /admin/stations?status=PENDING | approval queue |
| POST /admin/stations/{id}/approve · /reject `{reason}` | station gating |
| GET /admin/payments · POST /admin/payments/{id}/refund | payment ops |
| GET /admin/subscriptions | membership mgmt |
| GET /admin/analytics/overview | KPIs (DAU, bookings, GMV, utilization) |
| GET /admin/reports/{type}?from&to&format=csv | exports (async → S3 link) |
| GET /admin/fraud/alerts | fraud monitoring feed |
| GET /admin/system/health | dependency health |
| GET /admin/audit-logs?actor&entity&from&to | audit trail |

---

## 13. Operational  `/health`, `/metrics`
- GET /health/live **(public)** → `200` liveness.
- GET /health/ready → checks DB/Redis/broker.
- GET /metrics → Prometheus exposition (internal network only).

---

## 14. Validation & Error Handling Standards

- **Input:** Pydantic v2 models on every request; reject unknown fields (`model_config = ConfigDict(extra='forbid')`).
- **Semantic checks** (ownership, state legality) in service layer → `409/422` with stable `code`.
- **Auth failures** never leak existence (uniform `401`/`404`).
- **Every error** carries `code` (machine) + `trace_id` (correlates with logs/Sentry).
- **Webhooks** are always verified by signature before processing and are idempotent by provider event id.
- **OpenAPI** auto-generated by FastAPI at `/openapi.json`; TS types generated for web/mobile from it.
