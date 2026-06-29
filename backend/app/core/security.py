"""Auth primitives: JWT issue/verify, OTP & token hashing."""
from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


# ── Hashing (OTP codes, refresh tokens) ──────────────────────────────────
def hash_secret(value: str) -> str:
    """HMAC-SHA256 with server pepper. Deterministic → allows equality lookup."""
    return hmac.new(
        settings.hash_pepper.encode(), value.encode(), hashlib.sha256
    ).hexdigest()


def verify_secret(value: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_secret(value), hashed)


def generate_numeric_otp(length: int | None = None) -> str:
    n = length or settings.otp_length
    return "".join(str(secrets.randbelow(10)) for _ in range(n))


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


# ── JWT ───────────────────────────────────────────────────────────────────
def _signing_key() -> str:
    if settings.jwt_algorithm.startswith("RS"):
        if not settings.jwt_private_key:
            raise RuntimeError("RS256 selected but CG_JWT_PRIVATE_KEY is not set")
        return settings.jwt_private_key
    return settings.jwt_secret


def _verify_key() -> str:
    if settings.jwt_algorithm.startswith("RS"):
        if not settings.jwt_public_key:
            raise RuntimeError("RS256 selected but CG_JWT_PUBLIC_KEY is not set")
        return settings.jwt_public_key
    return settings.jwt_secret


def create_access_token(*, user_id: uuid.UUID, session_id: uuid.UUID, roles: list[str]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "sid": str(session_id),
        "roles": roles,
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=settings.access_token_ttl_seconds)).timestamp()),
        "typ": "access",
    }
    return jwt.encode(payload, _signing_key(), algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Raises jwt exceptions on invalid/expired tokens."""
    return jwt.decode(token, _verify_key(), algorithms=[settings.jwt_algorithm])
