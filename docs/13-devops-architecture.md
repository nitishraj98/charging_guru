# 13 · DevOps Architecture

## 1. Containerization

Multi-stage Docker builds for small, secure images. Non-root user, pinned base images.

### Backend Dockerfile (illustrative)
```dockerfile
# ---- builder ----
FROM python:3.12-slim AS builder
ENV PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN pip install uv
COPY pyproject.toml uv.lock ./
RUN uv export --no-dev -o requirements.txt && pip install -r requirements.txt --target /deps

# ---- runtime ----
FROM python:3.12-slim AS runtime
ENV PYTHONUNBUFFERED=1 PATH="/deps/bin:$PATH" PYTHONPATH=/deps
RUN useradd -m app && apt-get update && apt-get install -y --no-install-recommends libpq5 curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /deps /deps
COPY app ./app
USER app
EXPOSE 8000
HEALTHCHECK CMD curl -f http://localhost:8000/health/live || exit 1
CMD ["gunicorn","app.main:app","-c","gunicorn_conf.py"]
```
- **Worker image** reuses the same image, different command: `celery -A app.workers.celery_app worker -Q payments,notifications,...`.
- **Beat** scheduler as its own single-replica deployment.
- Web/admin: `next build` standalone → slim Node 20 runtime image.

## 2. Local Development — docker-compose

```yaml
# infra/compose/docker-compose.yml
services:
  api:        # FastAPI (reload), depends_on db/redis
  worker:     # celery worker
  beat:       # celery beat
  db:         # postgres:16 + postgis
  redis:      # redis:7
  minio:      # S3-compatible local storage
  mailhog:    # email capture
  adminer:    # db UI
# web-user, web-admin run via their own dev servers or compose profiles
```
One command (`make dev` / `docker compose up`) brings up the full stack with seed data.

## 3. Nginx (reverse proxy / edge in non-ALB setups)

```nginx
# infra/nginx/charging-guru.conf
upstream api      { server api:8000; }
upstream ws       { server api:8000; }     # WS to same app tier

server {
  listen 443 ssl http2;
  server_name api.charging-guru.com;
  # TLS, security headers, gzip
  add_header Strict-Transport-Security "max-age=63072000" always;
  client_max_body_size 10m;

  location /api/      { proxy_pass http://api; proxy_set_header X-Request-Id $request_id; }
  location /ws/       { proxy_pass http://ws; proxy_http_version 1.1;
                        proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";
                        proxy_read_timeout 3600s; }
  location /metrics   { allow 10.0.0.0/8; deny all; proxy_pass http://api; }
  limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;
}
```
- Handles TLS termination (or behind ALB), gzip/brotli, rate-limit edge, WS upgrade, request-id propagation.

## 4. AWS Architecture (production)

```
Route53 ─▶ CloudFront ─▶ {S3 (web static/media)}            (data residency: ap-south-1)
            │
            ▼
         AWS WAF ─▶ ALB (HTTPS, WS) ─▶ ECS Fargate services (multi-AZ)
                                         ├─ api (autoscaled)
                                         ├─ ws  (autoscaled)
                                         ├─ worker (queue-depth scaled)
                                         └─ beat (1)
                                                │
        ┌──────────────┬─────────────┬──────────┴───────────┬───────────────┐
        ▼              ▼             ▼                       ▼               ▼
   RDS PostgreSQL  Read Replicas  ElastiCache Redis     S3 (media/        Secrets Manager
   (Multi-AZ,      (1–N)          (cluster, Multi-AZ)   invoices, WORM    + KMS
    PgBouncer)                                          audit copy)
```

| AWS service | Use |
|-------------|-----|
| **Route53** | DNS, health-checked routing |
| **CloudFront** | CDN for static + media; edge caching |
| **WAF** | OWASP rules, rate limiting, bot control |
| **ALB** | L7 LB, TLS, WS support, path routing |
| **ECS Fargate** (or EC2 ASG) | container orchestration, no server mgmt |
| **RDS PostgreSQL 16** | primary + read replicas, Multi-AZ, automated backups, PITR |
| **ElastiCache Redis** | cache, locks, broker, pub/sub |
| **S3** | media, invoices, exports, audit WORM (Object Lock) |
| **Secrets Manager + KMS** | secrets + encryption keys |
| **ECR** | container registry (image scanning) |
| **CloudWatch** | logs/metrics/alarms (+ Prometheus stack) |
| **SES / SNS** | email / SMS fallback |

> ECS Fargate chosen for ops simplicity at this stage; EKS is an option if k8s expertise/scale warrants it later. Web/admin tiers may alternatively run on Vercel — decision deferred; container path documented for self-hosted control.

## 5. Infrastructure as Code

- **Terraform** (`infra/terraform/`) modules: `network` (VPC, subnets, NAT), `data` (RDS, ElastiCache), `compute` (ECS, ALB, autoscaling), `edge` (CloudFront, WAF, Route53), `storage` (S3, ECR), `secrets` (KMS, Secrets Manager), `observability`.
- Remote state in S3 + DynamoDB lock. Per-env workspaces (`staging`, `prod`).

## 6. CI/CD (GitHub Actions)

```
PR:    lint → typecheck → unit → integration (testcontainers) → SAST/secret-scan → build image → smoke
main:  build & push image (ECR) → deploy staging → e2e (Playwright/Detox) → manual approve → deploy prod
```
- **Backend deploy:** run Alembic migrations (guarded, online-safe) → rolling ECS deploy with health checks → automatic rollback on alarm.
- **Web/admin:** build standalone → image → ECS (or Vercel deploy).
- **Mobile:** EAS Build + Submit pipeline; EAS Update for OTA JS fixes.
- **Blue/green or rolling** with ALB target groups; DB migrations backward-compatible (expand/contract pattern).
- Image signing + Trivy scan gate; SBOM generated.

## 7. Environments & Config

| Env | Branch | Data | Notes |
|-----|--------|------|-------|
| local | any | compose | full stack + seeds |
| staging | `main` | scaled-down AWS | auto-deploy, load/e2e tests |
| prod | tagged release | Multi-AZ AWS | manual approval gate |

- Config via env vars; secrets via Secrets Manager (injected by ECS task role).
- Feature flags (e.g., Unleash/LaunchDarkly or simple Redis flags) for phased rollouts.

## 8. Backups & DR

- RDS automated backups + PITR; nightly snapshots; cross-region snapshot copy.
- S3 versioning + cross-region replication for critical buckets.
- Redis: persistence (AOF) for broker durability where needed (cache is rebuildable).
- DR runbook with RPO < 5 min / RTO < 1h targets; periodic restore drills.

## 9. Operational Runbooks

- Deploy/rollback, migration failure, Razorpay outage (queue + reconcile), Maps quota exhaustion (degrade to cache), Redis failover, partition creation failure, fraud incident response, data-subject deletion request.
