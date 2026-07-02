"""RFC 9457 Problem Details error model + exception handlers."""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings

PROBLEM_CONTENT_TYPE = "application/problem+json"
_ERROR_BASE = "https://api.charging-guru.com/errors/"


class AppError(Exception):
    """Base domain/application error → maps to a Problem Details response."""

    status_code: int = 400
    code: str = "BAD_REQUEST"
    title: str = "Bad request"

    def __init__(self, detail: str | None = None, *, code: str | None = None):
        self.detail = detail or self.title
        if code:
            self.code = code
        super().__init__(self.detail)


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"
    title = "Resource not found"


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"
    title = "Authentication required"


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"
    title = "Insufficient permissions"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"
    title = "Conflict"


class RateLimitError(AppError):
    status_code = 429
    code = "RATE_LIMITED"
    title = "Too many requests"


class GoneError(AppError):
    status_code = 410
    code = "GONE"
    title = "Resource expired"


def _problem(request: Request, status: int, code: str, title: str, detail: str) -> JSONResponse:
    response = JSONResponse(
        status_code=status,
        media_type=PROBLEM_CONTENT_TYPE,
        content={
            "type": f"{_ERROR_BASE}{code.lower().replace('_', '-')}",
            "title": title,
            "status": status,
            "detail": detail,
            "instance": str(request.url.path),
            "code": code,
            "trace_id": getattr(request.state, "request_id", None),
        },
    )
    # CORSMiddleware never sees responses built by exception handlers — they
    # short-circuit the ASGI send chain it wraps — so without this, every
    # error response (esp. unhandled 500s) looks like a CORS failure in the
    # browser instead of surfacing the real error.
    origin = request.headers.get("origin")
    if origin and origin in settings.cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
    return response


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError):
        return _problem(request, exc.status_code, exc.code, exc.title, exc.detail)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        return _problem(
            request, 422, "VALIDATION_ERROR", "Validation failed", str(exc.errors())
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        return _problem(
            request, exc.status_code, "HTTP_ERROR", "HTTP error", str(exc.detail)
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        return _problem(
            request, 500, "INTERNAL_ERROR", "Internal server error",
            "An unexpected error occurred.",
        )
