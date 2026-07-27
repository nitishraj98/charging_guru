# ---- builder ----
FROM python:3.12-slim AS builder
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml ./
# Install runtime deps into an isolated prefix
RUN pip install --prefix=/install \
    "fastapi>=0.115" "uvicorn[standard]>=0.30" "gunicorn>=22.0" \
    "pydantic[email]>=2.7" "pydantic-settings>=2.3" \
    "sqlalchemy[asyncio]>=2.0.30" "asyncpg>=0.29" "alembic>=1.13" \
    "redis>=5.0" "pyjwt[crypto]>=2.8" "bcrypt>=4.1" "structlog>=24.1" \
    "httpx>=0.27" "python-multipart>=0.0.9" "prometheus-client>=0.20" \
    "weasyprint>=62.0" "qrcode[pil]>=7.4" "jinja2>=3.1"

# ---- runtime ----
FROM python:3.12-slim AS runtime
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
RUN useradd -m -u 10001 app \
    && apt-get update && apt-get install -y --no-install-recommends \
        libpq5 curl \
        libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 \
        libffi8 shared-mime-info fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /install /usr/local
COPY . .
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD curl -fsS http://localhost:8000/health/live || exit 1
CMD ["gunicorn", "app.main:app", "-c", "gunicorn_conf.py"]
