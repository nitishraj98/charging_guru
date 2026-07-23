"""Shared best-effort pub/sub publisher for the station WS channel.

Reuses the existing chan:station:{id} Redis channel and api/ws/hub.py's
generic relay (it forwards any JSON payload verbatim — no hub changes
needed) to push slot/hold lifecycle events to anyone watching a station's
availability, same pattern as availability_service.py's charger-status
publish. Failures are swallowed — a missed live-update push must never
block the write path; clients fall back to polling.
"""
from __future__ import annotations

import contextlib
import json
import uuid

from app.core.redis import get_redis


async def publish_slot_event(station_id: uuid.UUID, charger_id: uuid.UUID, reason: str) -> None:
    """reason: "hold_created" | "hold_released" | "booking_confirmed" | "hold_expired" """
    with contextlib.suppress(Exception):
        r = get_redis()
        await r.publish(
            f"chan:station:{station_id}",
            json.dumps({
                "type": "slot_update",
                "charger_id": str(charger_id),
                "reason": reason,
            }),
        )
