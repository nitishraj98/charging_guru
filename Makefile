# Charging Guru — developer convenience targets
# Requires: Docker Desktop (or docker + docker compose plugin) + Git Bash / WSL / macOS
#
# Usage:  make up          → build + start full stack
#         make help        → list all targets

.DEFAULT_GOAL := help
.PHONY: help up down down-v restart build logs logs-db \
        shell migrate psql redis lint test

C  := docker compose        # compose shorthand
API := $(C) exec api        # run a command in the running api container

# ─────────────────────────────────────────────────────────────────────────────
# Stack lifecycle
# ─────────────────────────────────────────────────────────────────────────────

up: ## Build images (if needed) and start all services in the background
	$(C) up --build -d
	@echo ""
	@echo "  API   →  http://localhost:8000"
	@echo "  Docs  →  http://localhost:8000/docs"
	@echo "  Admin →  http://localhost:8000/redoc"
	@echo ""
	@echo "  Run 'make logs' to stream API logs."

down: ## Stop containers (volumes kept — data is safe)
	$(C) down

down-v: ## Stop containers AND wipe all volumes (fresh database)
	$(C) down -v
	@echo "All volumes wiped. Run 'make up' to start fresh."

restart: ## Restart only the API container (picks up code changes when --reload is off)
	$(C) restart api

build: ## Force-rebuild the API image
	$(C) build api

# ─────────────────────────────────────────────────────────────────────────────
# Logs
# ─────────────────────────────────────────────────────────────────────────────

logs: ## Stream API logs (Ctrl-C to stop)
	$(C) logs -f api

logs-db: ## Stream Postgres logs
	$(C) logs -f db

# ─────────────────────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────────────────────

migrate: ## Run pending Alembic migrations inside the running API container
	$(API) alembic upgrade head

migration: ## Create a new migration — usage: make migration name="add_invoices"
	$(API) alembic revision --autogenerate -m "$(name)"

psql: ## Connect to PostgreSQL as the charging user
	$(C) exec db psql -U charging charging_guru

# ─────────────────────────────────────────────────────────────────────────────
# Redis
# ─────────────────────────────────────────────────────────────────────────────

redis: ## Open a redis-cli session
	$(C) exec redis redis-cli

redis-flush: ## Flush all Redis keys (clears rate limits, locks, availability cache)
	$(C) exec redis redis-cli FLUSHALL
	@echo "Redis flushed."

# ─────────────────────────────────────────────────────────────────────────────
# Dev tools
# ─────────────────────────────────────────────────────────────────────────────

shell: ## Open a bash shell inside the running API container
	$(API) bash

lint: ## Run ruff linter on the backend
	cd backend && .venv/Scripts/python -m ruff check app/ tests/

test: ## Run the full test suite against the local SQLite in-memory DB (no Docker needed)
	cd backend && .venv/Scripts/python -m pytest tests/ -v

test-fast: ## Run tests without verbose output
	cd backend && .venv/Scripts/python -m pytest tests/ -q

# ─────────────────────────────────────────────────────────────────────────────
# Help
# ─────────────────────────────────────────────────────────────────────────────

help: ## Show this help message
	@echo ""
	@echo "  Charging Guru — dev commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	    | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""
