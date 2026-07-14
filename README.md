# ⚡ Charging Guru

> **Production-grade EV charging discovery, reservation, and payments platform**
>
> A comprehensive ecosystem connecting EV drivers with charging stations through intelligent route planning, real-time availability, seamless booking, and integrated payments.

[![TypeScript](https://img.shields.io/badge/TypeScript-68.5%25-3178C6?logo=typescript)](README.md)
[![Python](https://img.shields.io/badge/Python-21.1%25-3776AB?logo=python)](README.md)
[![HTML](https://img.shields.io/badge/HTML-6%25-E34C26?logo=html5)](README.md)
[![CSS](https://img.shields.io/badge/CSS-3.7%25-563D7C?logo=css3)](README.md)

---

## 🚀 Quick Start

### Prerequisites
- **Docker & Docker Compose** (recommended for full stack)
- **Python 3.12** (for backend development)
- **Node.js 18+** (for web & mobile)

### Run with Docker (Full Stack)
```bash
# Clone & navigate to repo
git clone https://github.com/nitishraj98/charging_guru.git
cd charging_guru

# Start all services (Postgres, Redis, Backend, etc.)
docker compose -f infra/compose/docker-compose.yml up --build
```

**Access points:**
- 🌐 **API**: http://localhost:8000
- 📚 **Swagger UI**: http://localhost:8000/docs
- 🔍 **Health Check**: http://localhost:8000/health/ready
- 📊 **Metrics**: http://localhost:8000/metrics

### Local Backend Development
```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Setup environment
cp .env.example .env

# Run tests
pytest

# Start dev server
python -m uvicorn app.main:app --reload
```

---

## 📂 Project Structure

```
charging-guru/
├── backend/                    # FastAPI service (Clean Architecture)
│   ├── app/
│   │   ├── core/              # Config, DB, Redis, Security, Logging
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic DTOs
│   │   ├── repositories/      # Data access layer
│   │   ├── services/          # Business logic & use cases
│   │   ├── api/               # Route handlers & middleware
│   │   └── db/                # Alembic migrations
│   └── tests/                 # Unit & integration tests
│
├── web-user/                  # Next.js 15 user web app
│   ├── app/                   # Pages & layouts
│   ├── components/            # React components
│   └── public/                # Static assets
│
├── web-admin/                 # Next.js 15 admin console
│
├── mobile-user/               # Expo React Native (Users)
│
├── mobile-owner/              # Expo React Native (Station Owners)
│
├── packages/
│   ├── shared-types/          # OpenAPI-generated TypeScript types
│   └── ui/                    # Shared UI components & design tokens
│
├── design/                    # Figma-ready design system
│   ├── tokens.json            # Design tokens (W3C standard)
│   ├── 01-brand-identity.md   # Logo, colors, typography
│   ├── 02-foundations.md      # Grid, components, animations
│   ├── 03-user-app.md         # User app screens & flows
│   ├── 04-owner-app.md        # Owner app designs
│   └── 05-admin-dashboard.md  # Admin panel designs
│
├── docs/                      # Architecture & specification docs
│   ├── 01-prd.md              # Product Requirements
│   ├── 02-system-architecture.md
│   ├── 03-user-flows.md       # End-to-end user journeys
│   ├── 04-database-design.md
│   ├── 05-er-diagram.md
│   ├── 06-api-specification.md
│   ├── 07-backend-folder-structure.md
│   ├── 11-security-architecture.md
│   ├── 12-scalability-strategy.md
│   ├── 13-devops-architecture.md
│   ├── 14-monitoring-strategy.md
│   ├── 15-mvp-roadmap-30-days.md
│   └── 18-development-milestones.md
│
├── infra/
│   ├── docker/                # Dockerfiles for each service
│   ├── compose/               # docker-compose configurations
│   ├── nginx/                 # Reverse proxy configs
│   └── terraform/             # AWS Infrastructure as Code
│
└── .github/workflows/         # CI/CD pipelines (GitHub Actions)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI · Python 3.12 · SQLAlchemy 2.0 · Pydantic v2 |
| **Database** | PostgreSQL 16 (PostGIS) · Redis 7 |
| **Task Queue** | Celery · Redis Broker |
| **Web** | Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui |
| **Mobile** | React Native · Expo · React Query · Zustand |
| **Payments** | Razorpay |
| **Maps** | Google Maps API (Directions, Places) |
| **Push Notifications** | Firebase Cloud Messaging |
| **Storage** | AWS S3 · CloudFront CDN |
| **Infrastructure** | Docker · Nginx · AWS (ECS, RDS, ElastiCache, Route53) |
| **Observability** | Prometheus · Grafana · Sentry · OpenTelemetry |

---

## 🔐 Authentication & Security

### OTP-Based Login Flow
```bash
# 1. Request OTP
curl -X POST http://localhost:8000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Response: {"request_id": "...", "ttl_seconds": 300, "debug_code": "123456"}

# 2. Verify OTP & get tokens
curl -X POST http://localhost:8000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"request_id": "<id>", "code": "<code>"}'

# Response: {"access_token": "...", "refresh_token": "...", "user": {...}}

# 3. Access protected endpoints
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer <access_token>"

# 4. Refresh tokens
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

**Security Features:**
- ✅ OTP verification (SMS provider in production)
- ✅ JWT tokens (RS256 in production, HS256 in dev)
- ✅ Rotating refresh tokens with reuse detection
- ✅ RBAC (Role-Based Access Control)
- ✅ Security headers & request ID tracking
- ✅ Rate limiting

---

## 📊 Core Features

### For Users
- 🗺️ **Route Planning** — Plan journeys with charging stops
- 🔌 **Station Discovery** — Real-time availability & pricing
- 📅 **Booking** — Reserve charging slots in advance
- 💳 **Payments** — Razorpay integration, multiple payment methods
- 🎟️ **QR Pass** — Scan & charge at stations
- 💰 **Rewards** — Loyalty program & cashback

### For Station Owners
- 📊 **Dashboard** — Real-time charger status & revenue
- 🔍 **Scanner** — QR code verification
- 💵 **Revenue Tracking** — Earnings analytics
- ⚙️ **Charger Control** — Manage availability & pricing

### For Admins
- 📈 **Analytics** — Platform-wide metrics & insights
- 🗺️ **Maps** — Station network overview
- 👥 **User Management** — Account management & support
- 🏢 **Station Management** — Approve, monitor, optimize stations

---

## 🗄️ Database

**Key Tables:**
- `users` — Registered users with profiles
- `stations` — Charging station information
- `chargers` — Individual charging points
- `bookings` — Reservation records
- `payments` — Transaction history
- `sessions` — Active charging sessions
- `otp_requests` — OTP verification
- `roles` — RBAC roles & permissions

**Features:**
- PostgreSQL 16 with read replicas for scalability
- PostGIS extension for geographic queries
- Alembic for versioned migrations
- Automated backups & point-in-time recovery

### Run Migrations
```bash
# Apply pending migrations
alembic upgrade head

# Create new migration (reviewed before commit)
alembic revision --autogenerate -m "description"

# Rollback one migration
alembic downgrade -1
```

---

## 📚 Documentation

Start with these in order:

1. **[Product Requirements (PRD)](docs/01-prd.md)** — Vision, personas, KPIs, monetization
2. **[System Architecture](docs/02-system-architecture.md)** — Services, data flow, deployment
3. **[User Flows](docs/03-user-flows.md)** — End-to-end user journeys
4. **[API Specification](docs/06-api-specification.md)** — REST contracts & validation
5. **[Security Architecture](docs/11-security-architecture.md)** — Auth, encryption, payments
6. **[DevOps Architecture](docs/13-devops-architecture.md)** — Docker, AWS, CI/CD
7. **[MVP Roadmap](docs/15-mvp-roadmap-30-days.md)** — 30-day development plan

**Design System:** See [`design/README.md`](design/README.md)

---

## 🎨 Design System

**Principles:**
- 🌙 Dark-mode first, electric green accents
- 🗺️ Maps as the primary interface
- ⚡ Energy-based design language
- 🎯 One primary action per screen

**Resources:**
- 📊 **Design Tokens** — [`design/tokens.json`](design/tokens.json) (Figma import)
- 🎨 **Brand Identity** — Colors, typography, iconography
- 📱 **Screens** — 8 user · 4 owner · 4 admin screens + states

[Browse design docs →](design/README.md)

---

## 🚀 Deployment

### Local Development
```bash
docker compose -f infra/compose/docker-compose.yml up --build
```

### Staging
```bash
docker compose -f infra/compose/docker-compose.staging.yml up --build
```

### Production (AWS)
```bash
# Push to ECR, deploy with Terraform
./infra/deploy.sh production
```

**Infrastructure:**
- ECS for containerized services
- RDS for PostgreSQL with Multi-AZ
- ElastiCache for Redis clusters
- S3 + CloudFront for static assets
- Route53 for DNS & failover
- Prometheus + Grafana for monitoring

---

## 📈 Monitoring & Observability

**Available at:**
- 📊 **Prometheus** — http://localhost:9090
- 📈 **Grafana** — http://localhost:3000
- 🐛 **Sentry** — Error tracking & alerting
- 📝 **Logs** — Structured JSON logs (CloudWatch in prod)

**Key Metrics:**
- Request latency & throughput
- Database query performance
- Cache hit rates
- Payment success rates
- Station availability

---

## 🧪 Testing

```bash
cd backend

# Run all tests
pytest

# With coverage
pytest --cov=app

# Specific test file
pytest tests/api/test_auth_flow.py

# Verbose output
pytest -v
```

---

## 🔑 Environment Variables

Create `.env` file in project root:

```env
# Backend
DATABASE_URL=postgresql://user:pass@localhost/charging_guru
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-key
CG_OTP_DEBUG=true

# Payments (Razorpay)
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret

# Maps
GOOGLE_MAPS_API_KEY=your_key

# Firebase (Notifications)
FIREBASE_PROJECT_ID=your_project
FIREBASE_SERVICE_ACCOUNT_KEY=path/to/key.json

# AWS (Storage & Infrastructure)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-south-1
AWS_S3_BUCKET=charging-guru-prod

# Observability
SENTRY_DSN=your_dsn
```

---

## 🤝 Contributing

1. **Create a branch** from `develop`
2. **Make changes** with clear commits
3. **Write tests** for new features
4. **Submit pull request** with description
5. **Code review** before merge

**Code Style:**
- Backend: Black, isort, mypy
- Frontend: ESLint, Prettier
- Commit messages: Conventional Commits

---

## 📞 Support & Feedback

- 💬 **Discussions** — GitHub Discussions
- 🐛 **Bug Reports** — GitHub Issues
- 📧 **Email** — contact@chargingguru.dev

---

## 📄 License

[LICENSE](LICENSE) — MIT License

---

## 🎯 Roadmap

- **Phase 1 (MVP - 30 days)** — Core auth, discovery, booking
- **Phase 2 (Payments)** — Payments, QR, invoicing, rewards
- **Phase 3 (Scale)** — Analytics, admin features, network optimization
- **Phase 4 (Advanced)** — Predictive charging, network coordination

[Full roadmap →](docs/18-development-milestones.md)

---

**Built with ⚡ for the EV revolution**
