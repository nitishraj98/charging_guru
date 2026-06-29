"""Data access for user vehicles."""
from __future__ import annotations

import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vehicle import Vehicle


class VehicleRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_user(self, user_id: uuid.UUID) -> list[Vehicle]:
        res = await self.session.execute(
            select(Vehicle)
            .where(Vehicle.user_id == user_id, Vehicle.deleted_at.is_(None))
            .order_by(Vehicle.is_default.desc(), Vehicle.created_at.asc())
        )
        return list(res.scalars().all())

    async def get(self, vehicle_id: uuid.UUID, user_id: uuid.UUID) -> Vehicle | None:
        res = await self.session.execute(
            select(Vehicle).where(
                Vehicle.id == vehicle_id,
                Vehicle.user_id == user_id,
                Vehicle.deleted_at.is_(None),
            )
        )
        return res.scalar_one_or_none()

    async def create(self, user_id: uuid.UUID, **kwargs) -> Vehicle:
        # If this is the user's first vehicle, make it default automatically.
        existing = await self.list_for_user(user_id)
        is_default = len(existing) == 0
        vehicle = Vehicle(user_id=user_id, is_default=is_default, **kwargs)
        self.session.add(vehicle)
        await self.session.flush()
        return vehicle

    async def set_default(self, vehicle_id: uuid.UUID, user_id: uuid.UUID) -> Vehicle | None:
        vehicle = await self.get(vehicle_id, user_id)
        if vehicle is None:
            return None
        # Clear existing default.
        await self.session.execute(
            update(Vehicle)
            .where(Vehicle.user_id == user_id, Vehicle.deleted_at.is_(None))
            .values(is_default=False)
        )
        vehicle.is_default = True
        await self.session.flush()
        return vehicle

    async def soft_delete(self, vehicle_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        from datetime import datetime, timezone
        vehicle = await self.get(vehicle_id, user_id)
        if vehicle is None:
            return False
        vehicle.deleted_at = datetime.now(timezone.utc)
        if vehicle.is_default:
            vehicle.is_default = False
            # Promote the next vehicle to default if any remain.
            remaining = await self.list_for_user(user_id)
            # list_for_user filters deleted_at IS NULL, so vehicle is already excluded
            # after flush — but we haven't flushed yet.  Use a fresh query instead.
            res = await self.session.execute(
                select(Vehicle).where(
                    Vehicle.user_id == user_id,
                    Vehicle.id != vehicle_id,
                    Vehicle.deleted_at.is_(None),
                ).order_by(Vehicle.created_at.asc()).limit(1)
            )
            next_v = res.scalar_one_or_none()
            if next_v:
                next_v.is_default = True
        await self.session.flush()
        return True
