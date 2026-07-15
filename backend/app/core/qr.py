"""Signed, single-use QR tokens for booking check-in.

Token format:  base64url(json_payload) + "." + hex_HMAC_SHA256
                                                  ↑ keyed with jwt_secret

The jti (UUID v7) is stored in Redis with SET NX to enforce single-use.
A station owner scans the token; if the jti has never been consumed, we
set the key and allow check-in. Any replay (second scan, stolen token)
is rejected with a 409.
"""
from __future__ import annotations

import base64
import hashlib
import hmac as _hmac
import json
import uuid

from app.core.config import settings
from app.core.ids import uuid7
from app.core.redis import get_redis
from app.core.time import utcnow

_JTI_TTL_SECONDS = 86_400  # jti blacklist entry lives 24 h


def _sign(payload_bytes: bytes) -> str:
    return _hmac.new(settings.jwt_secret.encode(), payload_bytes, hashlib.sha256).hexdigest()


def issue_qr(booking_id: uuid.UUID, jti: uuid.UUID | None = None) -> tuple[str, uuid.UUID]:
    """Create a signed QR token for a confirmed booking.

    Returns (token_string, jti).  Caller must persist jti → booking.qr_jti
    so that the verify endpoint can cross-check the database.

    Pass an existing `jti` (e.g. `booking.qr_jti`) to re-issue a fresh token
    string for an already-issued, not-yet-redeemed pass — the jti is what
    Redis tracks for single-use, so re-issuing doesn't grant extra uses.
    """
    jti = jti or uuid7()
    payload = {
        "booking_id": str(booking_id),
        "jti": str(jti),
        "iat": utcnow().isoformat(),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode()
    b64 = base64.urlsafe_b64encode(payload_bytes).rstrip(b"=").decode()
    sig = _sign(payload_bytes)
    return f"{b64}.{sig}", jti


async def verify_qr(token: str) -> dict:
    """Verify a QR token and atomically mark it consumed.

    Raises ValueError on any failure (bad format, bad sig, already used).
    Returns the payload dict on success.
    """
    try:
        b64, sig = token.rsplit(".", 1)
    except ValueError:
        raise ValueError("malformed QR token")

    padding = (4 - len(b64) % 4) % 4
    try:
        payload_bytes = base64.urlsafe_b64decode(b64 + "=" * padding)
    except Exception:
        raise ValueError("malformed QR token (bad base64)")

    if not _hmac.compare_digest(_sign(payload_bytes), sig):
        raise ValueError("invalid QR signature")

    try:
        payload = json.loads(payload_bytes)
    except json.JSONDecodeError:
        raise ValueError("malformed QR token (invalid JSON)")

    jti = payload.get("jti")
    if not jti:
        raise ValueError("QR token missing jti")

    redis = get_redis()
    already_used = not await redis.set(f"qr:used:{jti}", "1", nx=True, ex=_JTI_TTL_SECONDS)
    if already_used:
        raise ValueError("QR already used (replay attack)")

    return payload
