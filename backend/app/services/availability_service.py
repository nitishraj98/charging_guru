"""Charger availability: status changes, Redis cache, real-time publish.

On a status change we (1) persist, (2) append to charger_status_history, and
(3) update the Redis availability cache + publish to the station channel so
WebSocket subscribers see it live. Cache/pub-sub failures never block the
write (best-effort), keeping the transactional path resilient.
"""
from __future__ import annotations

import contextlib
import json
import uuid

from app.core.errors import NotFoundError
from app.core.logging import get_logger
from app.core.redis import get_redis
from app.models.booking import ChargerStatusHistory
from app.models.enums import ChargerStatus
from app.repositories.station_repo import ChargerRepo

log = get_logger("availability")


class AvailabilityService:
    def __init__(self, chargers: ChargerRepo, session):
        self.chargers = chargers
        self.session = session

    async def set_status(
        self,
        charger_id: uuid.UUID,
        new_status: ChargerStatus,
        *,
        changed_by: uuid.UUID | None = None,
        reason: str | None = None,
    ):
        charger = await self.chargers.get(charger_id)
        if charger is None or charger.deleted_at is not None:
            raise NotFoundError("Charger not found.", code="CHARGER_NOT_FOUND")

        old = charger.status
        if old == new_status:
            return charger

        charger.status = new_status
        self.session.add(
            ChargerStatusHistory(
                charger_id=charger.id, old_status=old, new_status=new_status,
                changed_by=changed_by, reason=reason,
            )
        )
        await self.session.flush()
        await self._publish(charger.station_id, charger.id, new_status)
        return charger

    async def _publish(self, station_id, charger_id, status: ChargerStatus) -> None:
        """Best-effort cache update + pub/sub fan-out for WebSocket clients."""
        with contextlib.suppress(Exception):
            r = get_redis()
            await r.hset(f"avail:station:{station_id}", str(charger_id), status.value)
            await r.expire(f"avail:station:{station_id}", 3600)
            await r.publish(
                f"chan:station:{station_id}",
                json.dumps({
                    "type": "charger_status",
                    "charger_id": str(charger_id),
                    "status": status.value,
                }),
            )
