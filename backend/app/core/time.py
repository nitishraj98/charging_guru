"""Timezone-aware time helpers.

PostgreSQL ``timestamptz`` round-trips as aware datetimes; some backends
(e.g. SQLite in tests) return naive values. ``ensure_aware`` normalizes both
so comparisons never raise.
"""
from __future__ import annotations

from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
