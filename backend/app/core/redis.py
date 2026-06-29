"""Redis client + helpers (cache, locks, sliding-window rate limiting)."""
from __future__ import annotations

import contextlib
import os
import time
from collections.abc import AsyncIterator

import redis.asyncio as aioredis

from app.core.config import settings

_redis: aioredis.Redis = aioredis.from_url(
    settings.redis_url, encoding="utf-8", decode_responses=True
)


def get_redis() -> aioredis.Redis:
    return _redis


async def close_redis() -> None:
    await _redis.aclose()


async def sliding_window_allow(key: str, limit: int, window_seconds: int) -> bool:
    """Return True if the action is allowed under a sliding-window limit.

    Uses a sorted set of timestamps; trims the window and counts. Cheap and
    accurate enough for OTP/login throttling.
    """
    now = time.time()
    member = f"{now}:{os.urandom(4).hex()}"
    pipe = _redis.pipeline()
    pipe.zremrangebyscore(key, 0, now - window_seconds)
    pipe.zadd(key, {member: now})
    pipe.zcard(key)
    pipe.expire(key, window_seconds)
    _, _, count, _ = await pipe.execute()
    return int(count) <= limit


@contextlib.asynccontextmanager
async def lock(name: str, ttl_ms: int = 10_000) -> AsyncIterator[bool]:
    """Best-effort distributed lock (SET NX PX). Yields True if acquired."""
    token = os.urandom(16).hex()
    acquired = await _redis.set(name, token, nx=True, px=ttl_ms)
    try:
        yield bool(acquired)
    finally:
        if acquired:
            # Release only if we still own it (compare-and-delete).
            script = (
                "if redis.call('get', KEYS[1]) == ARGV[1] "
                "then return redis.call('del', KEYS[1]) else return 0 end"
            )
            with contextlib.suppress(Exception):
                await _redis.eval(script, 1, name, token)
