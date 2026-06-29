# 11 · Security Architecture

Defense in depth across edge, app, data, and operations. Compliance posture: **India DPDP Act**, **PCI-DSS SAQ-A** (no card data touches our servers — tokenized via Razorpay), **GST-compliant** invoicing.

## 1. Authentication

- **Phone OTP** primary. OTP stored **hashed** (never plaintext), short TTL (5 min), max attempts (5) → lockout + backoff; per-phone & per-IP rate limits.
- **JWT** access tokens: short-lived (~15 min), signed **RS256** (asymmetric — services verify with public key; private key in KMS/Secrets Manager). Claims: `sub`, `roles`, `sid` (session id), `jti`, `exp`, `iat`.
- **Refresh tokens:** opaque random, stored **hashed** in `user_sessions`; **rotation on every use** with reuse detection (if an already-rotated token is presented → revoke entire session family = stolen-token signal).
- **Session/device tracking:** every login creates a session row (device, IP, UA); user can list & revoke; new-device login → push/SMS alert.
- **Admin 2FA:** TOTP mandatory; high-risk actions require re-auth.

## 2. Authorization (RBAC)

- Roles: `ROLE_USER`, `ROLE_STATION_OWNER`, `ROLE_ADMIN` (many-to-many; a user can be user+owner).
- Enforced at two layers:
  1. **Route guard** (`require_roles(...)`) — coarse.
  2. **Resource ownership checks** in services — fine (e.g., owner can only mutate *their* stations/chargers; user can only see *their* bookings).
- Admin sub-roles (`SUPPORT/FINANCE/OPS`) as Phase-2 scoped permissions.
- Default-deny: unknown role → 403.

## 3. QR Signature & Verification

- QR payload (compact, e.g. base64url of CBOR/JSON):
  `{ b: booking_id, s: station_id, u: user_id, jti, iat, exp }` + detached signature.
- **Signing:** Ed25519 (or HMAC-SHA256 with a server secret). Private/secret key in Secrets Manager, rotated; `kid` in payload for rotation.
- **Verification at scan** (`POST /qr/verify`) checks, in order:
  1. Signature valid (`kid` → key) & not tampered.
  2. `exp` not passed (expiry tied to slot end + grace).
  3. `jti` not already consumed → **Redis `SETNX qr:jti:{jti}`** (single-use; replay-proof).
  4. Booking exists, status `CONFIRMED`/`CHECKED_IN`.
  5. Payment `CAPTURED`.
  6. Slot active now (within window ± grace).
  7. `station_id` matches scanning owner's station.
- Any failure → typed 4xx + **audit log** entry (potential fraud).

## 4. Payment Security

- **No card data on our servers** — Razorpay Checkout handles PAN; we store only tokens/order/payment ids → PCI SAQ-A scope.
- **Order creation idempotent** (`Idempotency-Key` + unique `razorpay_order_id`).
- **Signature verification** on both client callback (`/payments/verify`) and **webhooks** (`X-Razorpay-Signature` HMAC) — never trust client-reported success alone.
- **Webhook idempotency** by Razorpay event id; reconciliation worker resolves discrepancies (e.g., captured but webhook lost).
- Refunds go through Razorpay API only, logged in `transactions` ledger + `audit_logs`.

## 5. Input Validation & API Hardening

- Pydantic v2 on all inputs, `extra='forbid'`, strict types, length/range bounds, enum validation.
- Output schemas prevent over-exposure (no leaking internal fields).
- **SQL injection:** parameterized queries via SQLAlchemy only; no string-built SQL.
- **Mass assignment:** explicit DTO → model mapping.
- File uploads: presigned S3 PUT with content-type + size limits; server-side scan/moderation queue; images re-encoded to strip EXIF/metadata.

## 6. Transport & Headers

- TLS 1.2+ everywhere; HSTS. Internal service traffic in private subnets.
- **Security headers** (middleware): `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy` (web), `Referrer-Policy`, `Permissions-Policy`.
- **CORS** allowlist (web/admin origins only); credentials via cookies for web BFF.
- WAF (AWS WAF) at edge: OWASP rules, bot control, IP reputation.

## 7. Rate Limiting & Abuse Prevention

- Redis sliding-window limiter per identity + IP (limits in API spec §0).
- OTP & login endpoints aggressively limited; CAPTCHA challenge on web after threshold.
- Booking spam / scalping detection feeds fraud monitor.

## 8. Encryption & Secrets

- **In transit:** TLS. **At rest:** RDS encryption (KMS), S3 SSE-KMS, EBS encryption, Redis encryption in transit/at rest.
- **Field-level encryption** (pgcrypto / app-layer envelope encryption) for sensitive PII where required (e.g., payout bank refs, optional email-at-rest); keys in KMS.
- **Secrets:** AWS Secrets Manager / SSM Parameter Store; never in code/repo. `.env` only for local. Rotation policies for DB creds, JWT keys, webhook secrets.
- PII minimization: store only what's needed; phone is the identity anchor.

## 9. Audit Logging

- `audit_logs` (append-only, partitioned) records every privileged/state-changing action: who, what, before/after, IP, trace_id.
- Covered: station approval/suspension, refunds, user suspension, role changes, QR verification failures, admin data exports, charger status overrides.
- Immutable downstream copy shipped to S3 (WORM/Object Lock) for tamper-evidence.

## 10. Data Protection & Privacy (DPDP)

- Consent capture at signup; purpose-limited processing.
- Data subject rights: export & delete (soft-delete + scheduled hard-delete with financial-record retention exceptions for GST/7y).
- Data residency: India region (ap-south-1).
- Access controls + audit on PII access in admin tools.

## 11. Threat Model (STRIDE highlights)

| Threat | Vector | Control |
|--------|--------|---------|
| Spoofing | stolen JWT/refresh | short TTL, rotation + reuse detection, device binding |
| Tampering | forged QR | signed QR + jti single-use |
| Repudiation | disputed refund | immutable audit + ledger |
| Info disclosure | enumeration | UUIDv7, uniform errors, RBAC checks |
| DoS | OTP/booking flood | rate limits, WAF, autoscaling, queue backpressure |
| Elevation | owner editing others' stations | resource-ownership checks |
| Replay | reused webhook/QR | idempotency keys + jti registry |

## 12. Secure SDLC

- Dependency scanning (Dependabot / `pip-audit` / `npm audit`), SAST (Bandit, Semgrep), secret scanning (gitleaks) in CI.
- Container image scanning (Trivy); least-privilege IAM roles per service.
- Pre-merge security checklist for auth/payment/PII-touching PRs; periodic pentest before GA.
