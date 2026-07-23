"""Lightweight in-process periodic tasks.

The architecture doc (docs/02-system-architecture.md) specifies Celery Beat
for the slot-hold expiry sweep, but no Celery app/broker/worker exists in
this deployment — it's a single-instance FastAPI process. Rather than stand
up Celery + a broker for one periodic job, this runs the sweep as a plain
asyncio background task inside the app's own lifespan.

Correctness doesn't depend on this task running promptly (booking_service and
booking_repo already expire stale holds lazily wherever it actually matters —
payment creation, slot availability, booking creation). This sweep only keeps
`booking.status` accurate in the DB for rows nobody happens to touch again,
which matters for admin/analytics counts, not for user-facing behavior.

If this app is ever scaled to multiple instances, move this to a real
scheduler (Celery Beat, as originally planned) so it doesn't run redundantly
on every instance.
"""
from __future__ import annotations

import asyncio

from app.core.db import SessionFactory
from app.core.logging import get_logger
from app.repositories.booking_repo import BookingRepo, SlotRepo
from app.repositories.station_repo import ChargerRepo
from app.services.booking_service import BookingService
from app.services.realtime import publish_slot_event

log = get_logger("scheduler")

# Tight enough that "a slot freed up" reaches other users watching the slot
# picker without a noticeable lag — this is now also the mechanism that
# powers that live update, not just DB-status bookkeeping (correctness never
# depended on sweep promptness; the lazy-expiry checks in booking_service and
# booking_repo already cover every path that matters for that).
HOLD_SWEEP_INTERVAL_SECONDS = 15


async def _sweep_once() -> None:
    async with SessionFactory() as session:
        service = BookingService(
            BookingRepo(session), SlotRepo(session), ChargerRepo(session), session
        )
        expired = await service.expire_stale_holds()
        await session.commit()
        if expired:
            log.info("hold_sweep", expired_count=len(expired))
            for _booking_id, station_id, charger_id in expired:
                await publish_slot_event(station_id, charger_id, "hold_expired")


async def run_hold_sweep_loop() -> None:
    while True:
        try:
            await _sweep_once()
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("hold_sweep_failed")
        await asyncio.sleep(HOLD_SWEEP_INTERVAL_SECONDS)
