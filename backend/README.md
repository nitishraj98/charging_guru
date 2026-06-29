# Charging Guru — Backend (FastAPI)

Clean-architecture FastAPI service. This increment implements the **auth vertical slice**
(OTP login → JWT + rotating refresh tokens → profile) end-to-end, plus the platform
foundations (config, async DB, Redis, structured logging, Problem+JSON errors, metrics,
Alembic migrations). See [`../docs`](../docs) for the full architecture.

## Quickstart (Docker — full stack)

```bash
# from repo root
docker compose -f infra/compose/docker-compose.yml up --build
```
This starts Postgres+PostGIS, Redis, runs `alembic upgrade head`, and serves the API.

- API:        http://localhost:8000
- Swagger UI:  http://localhost:8000/docs
- Health:      http://localhost:8000/health/ready
- Metrics:     http://localhost:8000/metrics

## Quickstart (local venv — tests + dev)

```bash
cd backend
python -m venv .venv && .venv/Scripts/python -m pip install -e ".[dev]"   # Windows
# source .venv/bin/activate && pip install -e ".[dev]"                    # macOS/Linux

cp .env.example .env            # adjust as needed
pytest                          # 8 tests, no external services (SQLite + stubbed Redis)
```

## Try the auth flow

```bash
# 1) Request an OTP (CG_OTP_DEBUG=true returns the code in dev)
curl -X POST localhost:8000/api/v1/auth/otp/request \
  -H 'content-type: application/json' -d '{"phone":"+919876543210"}'
# → {"request_id":"...","ttl_seconds":300,"debug_code":"123456"}

# 2) Verify → get tokens
curl -X POST localhost:8000/api/v1/auth/otp/verify \
  -H 'content-type: application/json' \
  -d '{"request_id":"<id>","code":"<debug_code>"}'

# 3) Use the access token
curl localhost:8000/api/v1/users/me -H 'authorization: Bearer <access_token>'

# 4) Rotate refresh token
curl -X POST localhost:8000/api/v1/auth/refresh \
  -H 'content-type: application/json' -d '{"refresh_token":"<refresh>"}'
```

## Migrations

```bash
alembic upgrade head                         # apply
alembic revision --autogenerate -m "msg"     # create new (review before commit)
alembic downgrade -1                          # roll back one
```

## Layout

```
app/
  core/        config, db, redis, security, errors, logging, metrics, time, ids
  models/      SQLAlchemy 2.0 ORM (users, roles, sessions, otp, vehicles)
  schemas/     Pydantic v2 DTOs (strict, extra='forbid')
  repositories/ data access (user, otp, session)
  services/    use-cases (auth_service: OTP, JWT, refresh rotation + reuse detection)
  api/         deps (RBAC), middleware (request-id, security headers, metrics), v1 routers
  db/migrations/ Alembic
tests/         api/test_auth_flow.py (SQLite, stubbed Redis)
```

## Notes
- **Dev vs prod auth:** HS256 + shared secret locally; set `CG_JWT_ALGORITHM=RS256` with
  `CG_JWT_PRIVATE_KEY`/`CG_JWT_PUBLIC_KEY` (from KMS/Secrets Manager) in production.
- **OTP delivery:** logged in dev (`CG_OTP_DEBUG=true`); wired to an SMS provider via Celery in prod.
- **Refresh tokens** are stored only as HMAC hashes and rotate on every use, with reuse → reject.
- Next slices per [`../docs/18-development-milestones.md`](../docs/18-development-milestones.md):
  discovery + booking, then payments + QR + sessions.
