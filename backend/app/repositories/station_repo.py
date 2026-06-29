"""Data access for stations + chargers, including bounding-box discovery."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.geo import bbox
from app.models.charger import Charger
from app.models.enums import StationStatus
from app.models.station import Station


class StationRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, station: Station) -> Station:
        self.session.add(station)
        await self.session.flush()
        return station

    async def get(self, station_id: uuid.UUID) -> Station | None:
        return await self.session.get(Station, station_id)

    async def get_by_owner(self, owner_id: uuid.UUID) -> list[Station]:
        stmt = (
            select(Station)
            .where(Station.owner_id == owner_id, Station.deleted_at.is_(None))
            .order_by(Station.created_at.desc())
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def within_bbox(
        self, lat: float, lng: float, radius_km: float
    ) -> list[Station]:
        """Active stations inside the bounding box (precise distance filtering
        + sorting happens in the service). PostGIS replaces this in prod."""
        min_lat, max_lat, min_lng, max_lng = bbox(lat, lng, radius_km)
        stmt = (
            select(Station)
            .where(
                Station.status == StationStatus.ACTIVE,
                Station.deleted_at.is_(None),
                Station.lat >= min_lat,
                Station.lat <= max_lat,
                Station.lng >= min_lng,
                Station.lng <= max_lng,
            )
            .limit(200)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())


class ChargerRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, charger_id: uuid.UUID) -> Charger | None:
        return await self.session.get(Charger, charger_id)

    async def add(self, charger: Charger) -> Charger:
        self.session.add(charger)
        await self.session.flush()
        return charger
