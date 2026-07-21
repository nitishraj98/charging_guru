"""FastAPI application factory."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.middleware import RequestContextMiddleware
from app.api.v1 import health
from app.api.v1.router import api_router
from app.api.ws import ws_router
from app.core import metrics
from app.core.config import settings
from app.core.db import dispose_engines
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.redis import close_redis
from app.core.scheduler import run_hold_sweep_loop

log = get_logger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    log.info("startup", env=settings.env, version=__version__)
    sweep_task = asyncio.create_task(run_hold_sweep_loop())
    yield
    sweep_task.cancel()
    with suppress(asyncio.CancelledError):
        await sweep_task
    await close_redis()
    await dispose_engines()
    log.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version=__version__,
        docs_url="/docs",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    # Health at root (probes), business APIs under /api/v1, WS at /ws/*.
    app.include_router(health.router)
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    app.include_router(ws_router)

    @app.get("/metrics", include_in_schema=False)
    async def prometheus_metrics():
        return metrics.metrics_response()

    return app


app = create_app()
