"""WebSocket hub: real-time charger availability fan-out.

Each client subscribes to a station channel:
  ws://host/ws/stations/{station_id}

On connect:
  1. Send a "snapshot" message with every charger's current status (from the
     Redis availability hash set by AvailabilityService).
  2. Relay all Redis pub/sub messages published to chan:station:{id}
     (these are emitted by AvailabilityService.set_status on every change).
  3. Handle client "ping" → "pong" keep-alive frames.
  4. On disconnect (or error), cancel relay task + unsubscribe cleanly.

The Redis availability hash and pub/sub channel are best-effort — if Redis is
down, the client receives an empty snapshot and no live updates, but the
connection stays open (frontend can fall back to polling /stations/{id}).
"""
from __future__ import annotations

import asyncio
import contextlib
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.redis import get_redis

ws_router = APIRouter()


async def _relay_pubsub(pubsub, websocket: WebSocket) -> None:
    """Forward every Redis pub/sub message to the connected WebSocket client."""
    async for message in pubsub.listen():
        if message["type"] == "message":
            await websocket.send_text(message["data"])


async def _receive_client(websocket: WebSocket) -> None:
    """Handle incoming client frames; respond to pings; exit on disconnect."""
    while True:
        text = await websocket.receive_text()
        if text == "ping":
            await websocket.send_text("pong")


@ws_router.websocket("/ws/stations/{station_id}")
async def station_availability_ws(
    websocket: WebSocket,
    station_id: uuid.UUID,
) -> None:
    await websocket.accept()

    redis = get_redis()
    channel = f"chan:station:{station_id}"
    pubsub = redis.pubsub()

    try:
        await pubsub.subscribe(channel)

        # ── Initial state snapshot ─────────────────────────────────────────
        with contextlib.suppress(Exception):
            avail = await redis.hgetall(f"avail:station:{station_id}")
            await websocket.send_json({"type": "snapshot", "data": avail})

        # ── Two concurrent tasks: relay outbound, receive inbound ──────────
        relay = asyncio.create_task(_relay_pubsub(pubsub, websocket))
        receive = asyncio.create_task(_receive_client(websocket))

        done, pending = await asyncio.wait(
            [relay, receive],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await task

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        with contextlib.suppress(Exception):
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
