# ⚡ Charging Guru

> Production-grade EV charging discovery, reservation, and payments platform.
> Plan a route → find chargers along the way → reserve a slot → pay → arrive → scan QR → charge → get invoiced & rewarded.

**Scale targets:** 500k+ registered users · 50k+ DAU · 5,000+ stations · 50k+ bookings/day.

---

## 📚 Documentation Index

This repository is the **single source of truth** for product, architecture, and delivery. Read in order, or jump to a section.

| # | Document | Purpose |
|---|----------|---------|
| 01 | [Product Requirements (PRD)](docs/01-prd.md) | Vision, personas, scope, KPIs, monetization |
| 02 | [System Architecture](docs/02-system-architecture.md) | Logical & deployment topology, services, data flow |
| 03 | [User Flows](docs/03-user-flows.md) | End-to-end journeys with sequence diagrams |
| 04 | [Database Design](docs/04-database-design.md) | Schema, constraints, indexes, partitioning |
| 05 | [ER Diagram](docs/05-er-diagram.md) | Entity relationships (Mermaid) |
| 06 | [API Specification](docs/06-api-specification.md) | REST contracts: request/response/validation/errors |
| 07 | [Backend Folder Structure](docs/07-backend-folder-structure.md) | Clean Architecture layout |
| 08 | [Mobile App Architecture](docs/08-mobile-architecture.md) | User + Station Owner React Native apps |
| 09 | [Website Architecture](docs/09-website-architecture.md) | Next.js 15 user web app |
| 10 | [Admin Architecture](docs/10-admin-architecture.md) | Next.js admin console |
| 11 | [Security Architecture](docs/11-security-architecture.md) | AuthN/Z, QR signing, payments, encryption |
| 12 | [Scalability Strategy](docs/12-scalability-strategy.md) | Caching, replicas, async, horizontal scaling |
| 13 | [DevOps Architecture](docs/13-devops-architecture.md) | Docker, Nginx, AWS, CI/CD |
| 14 | [Monitoring Strategy](docs/14-monitoring-strategy.md) | Prometheus, Grafana, Sentry, logging, SLOs |
| 15 | [MVP Roadmap (30 Days)](docs/15-mvp-roadmap-30-days.md) | Week-by-week plan to first revenue |
| 16 | [Production Roadmap (6 Months)](docs/16-production-roadmap-6-months.md) | Path to scale & advanced features |
| 17 | [Cost Estimation](docs/17-cost-estimation.md) | Infra + team + 3rd-party costs |
| 18 | [Development Milestones](docs/18-development-milestones.md) | Gantt, exit criteria, team plan |

## 🎨 Brand & UI System

Figma-ready design language (dark-mode-first, electric-green, map-centric). See [`design/`](design/README.md).

| Doc | Contents |
|-----|----------|
| [Design Index](design/README.md) | Principles, Figma setup, deliverables checklist |
| [Brand Identity](design/01-brand-identity.md) | Logo concepts, color palette, typography, iconography |
| [Foundations](design/02-foundations.md) | Grid, glass, motion, battery/charge/route components, charging animations |
| [User App](design/03-user-app.md) | 8 screens: Home · Plan · Station · Booking · Payment · QR · Rewards · Profile |
| [Station Owner App](design/04-owner-app.md) | Dashboard · Scanner · Revenue · Charger Control |
| [Admin Dashboard](design/05-admin-dashboard.md) | Analytics · Maps · Users · Stations |
| [tokens.css](design/tokens.css) · [tokens.json](design/tokens.json) | Production CSS vars · W3C tokens (Tokens Studio import) |

---

## 🧱 Tech Stack (at a glance)

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI · Python 3.12 · SQLAlchemy 2.0 · Alembic · Pydantic v2 |
| Data | PostgreSQL 16 (+ read replicas, PostGIS) · Redis 7 |
| Async | Celery · Redis broker · WebSockets |
| Web | Next.js 15 · TypeScript · Tailwind · shadcn/ui |
| Mobile | React Native · Expo · React Query · Zustand |
| Payments | Razorpay |
| Maps | Google Maps / Directions / Places |
| Notifications | Firebase Cloud Messaging |
| Storage | AWS S3 + CloudFront |
| Infra | Docker · Nginx · AWS (ECS/EC2, RDS, ElastiCache, S3, CloudFront, Route53) |
| Observability | Prometheus · Grafana · Sentry · OpenTelemetry |

---

## 🗂️ Intended Monorepo Layout

```
charging-guru/
├── docs/                  # ← this documentation set
├── backend/               # FastAPI service (Clean Architecture)
├── web-user/              # Next.js user website
├── web-admin/             # Next.js admin console
├── mobile-user/           # Expo RN user app
├── mobile-owner/          # Expo RN station-owner app
├── packages/
│   ├── shared-types/      # OpenAPI-generated TS types (shared across web/mobile)
│   └── ui/                # shared design tokens
├── infra/
│   ├── docker/            # Dockerfiles
│   ├── compose/           # docker-compose.* for local & staging
│   ├── nginx/             # reverse-proxy configs
│   └── terraform/         # AWS IaC
└── .github/workflows/     # CI/CD pipelines
```

> The documentation in `docs/` is complete. Code scaffolding (backend skeleton, app skeletons) can be generated next — see the closing note in [Development Milestones](docs/18-development-milestones.md).

## 📐 Conventions

- **API versioning:** `/api/v1/...`; breaking changes bump the version.
- **IDs:** UUIDv7 (time-sortable) for public entities; `bigserial` for high-volume internal logs.
- **Money:** integer **paise** (INR minor units) everywhere; never floats.
- **Time:** UTC in storage; localized at the edge.
- **Errors:** RFC 9457 Problem Details (`application/problem+json`).
