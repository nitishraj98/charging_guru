# 10 · Admin Panel Architecture (Next.js 15)

Internal back-office for `ROLE_ADMIN`. Optimized for data density, auditability, and operational speed — not SEO.

## 1. Stack

- Next.js 15 App Router (all client-rendered behind auth; no SSG).
- TypeScript · Tailwind · shadcn/ui.
- **TanStack Table** (server-side pagination/sort/filter) + **TanStack Query**.
- **Recharts** for analytics dashboards.
- Strict RBAC: only `ROLE_ADMIN` (sub-roles later: `SUPPORT`, `FINANCE`, `OPS`).

## 2. Structure

```
web-admin/
├── app/
│   ├── (auth)/login/page.tsx        # admin login (OTP + optional TOTP 2FA)
│   ├── (dash)/
│   │   ├── layout.tsx               # sidebar, role guard, command palette
│   │   ├── page.tsx                 # Overview dashboard (KPIs)
│   │   ├── users/                   # list, detail, suspend/reactivate
│   │   ├── stations/                # approval queue, detail, suspend
│   │   │   ├── pending/page.tsx
│   │   │   └── [id]/page.tsx        # docs, map, chargers, approve/reject
│   │   ├── chargers/page.tsx
│   │   ├── bookings/page.tsx        # search, drill-down, manual interventions
│   │   ├── payments/                # transactions, refunds
│   │   │   └── refunds/page.tsx
│   │   ├── subscriptions/page.tsx
│   │   ├── analytics/page.tsx       # GMV, DAU, utilization, cohorts
│   │   ├── reports/page.tsx         # export builder (async → S3)
│   │   ├── fraud/page.tsx           # alerts feed + rule status
│   │   ├── system/page.tsx          # health, queue depth, error rate
│   │   └── audit/page.tsx           # audit log search
│   └── layout.tsx
├── components/
│   ├── tables/  charts/  forms/  ui/
├── lib/api/  lib/auth/  lib/rbac.ts
└── middleware.ts                     # enforce ROLE_ADMIN
```

## 3. Feature → Endpoint Map

| Screen | Backend |
|--------|---------|
| Overview | `GET /admin/analytics/overview` |
| Users | `GET /admin/users`, `POST /admin/users/{id}/suspend` |
| Station approval | `GET /admin/stations?status=PENDING`, `POST .../approve|reject` |
| Payments/Refunds | `GET /admin/payments`, `POST /admin/payments/{id}/refund` |
| Subscriptions | `GET /admin/subscriptions` |
| Analytics | `GET /admin/analytics/*` (from read replica/warehouse) |
| Reports | `GET /admin/reports/{type}` (202 → poll → S3 signed URL) |
| Fraud | `GET /admin/fraud/alerts` |
| System | `GET /admin/system/health`, `/metrics` proxy |
| Audit | `GET /admin/audit-logs` |

## 4. Security Specifics

- **Mandatory 2FA** (TOTP) for admin accounts in addition to OTP.
- All admin mutations write `audit_logs` (actor, before/after, IP) — surfaced in Audit screen.
- IP allowlist / VPN-only access option for production admin.
- Sensitive actions (refund > threshold, user data export, station suspend) require **reason** + optional second-approver (maker-checker) for finance ops.
- Shorter session TTL; re-auth for high-risk actions.

## 5. Dashboards & Analytics

- **Overview KPIs:** DAU/MAU, new signups, bookings today, GMV, payment success %, refund rate, active sessions, top stations, charger utilization heatmap.
- **Operational:** queue depth (Celery), webhook backlog, error rate, p95 latency (embedded Grafana panels or queried metrics).
- Reads hit **read replicas / warehouse**, never primary, to protect transactional load.

## 6. Fraud Monitoring (UI)

- Surfaces rule hits: rapid multi-booking, mismatched device/geo, refund abuse, QR replay attempts, payment anomalies.
- Each alert → drill into user/booking/payment; actions: flag, suspend, force refund, escalate.

## 7. Build & Deploy

- Containerized standalone Next.js behind Nginx; **not** public — internal ALB / VPN / Cloudflare Access.
- CI: lint, typecheck, Vitest, Playwright (admin smoke against staging).
- Feature flags for risky ops tooling.
