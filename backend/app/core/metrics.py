"""Prometheus metrics — version-robust, no reliance on framework internals.

Uses ``prometheus_client`` directly so we are not coupled to a specific
Starlette/FastAPI routing API. Route templates are read best-effort from the
resolved ASGI scope to keep label cardinality bounded.
"""
from __future__ import annotations

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.requests import Request
from starlette.responses import Response

REQUESTS = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "route", "status"],
)
LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "route"],
)


def route_template(request: Request) -> str:
    """Best-effort low-cardinality route label (path pattern, not raw path)."""
    route = request.scope.get("route")
    path_format = getattr(route, "path", None)
    return path_format or "unmatched"


def record(method: str, route: str, status: int, elapsed_seconds: float) -> None:
    REQUESTS.labels(method=method, route=route, status=str(status)).inc()
    LATENCY.labels(method=method, route=route).observe(elapsed_seconds)


def metrics_response() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
