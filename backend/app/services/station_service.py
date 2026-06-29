"""Station catalog + geospatial discovery use-cases."""
from __future__ import annotations

import uuid

from app.core.errors import ForbiddenError, NotFoundError
from app.domain.geo import haversine_km
from app.domain.policies import MAX_DISCOVERY_RADIUS_KM
from app.models.charger import Charger
from app.models.enums import ChargerStatus, StationStatus
from app.models.station import Station
from app.repositories.station_repo import StationRepo
from app.schemas.stations import StationCreateIn, StationNearbyOut


class StationService:
    def __init__(self, stations: StationRepo):
        self.stations = stations

    async def create(self, owner_id: uuid.UUID, payload: StationCreateIn) -> Station:
        station = Station(
            owner_id=owner_id,
            name=payload.name,
            address=payload.address,
            city=payload.city,
            state=payload.state,
            pincode=payload.pincode,
            lat=payload.lat,
            lng=payload.lng,
            amenities=payload.amenities,
            status=StationStatus.PENDING_APPROVAL,
        )
        for c in payload.chargers:
            station.chargers.append(
                Charger(
                    label=c.label,
                    charger_type=c.charger_type,
                    power_kw=c.power_kw,
                    connector_type=c.connector_type,
                    price_per_kwh=c.price_per_kwh,
                    status=ChargerStatus.AVAILABLE,
                )
            )
        return await self.stations.add(station)

    async def get_detail(self, station_id: uuid.UUID) -> Station:
        station = await self.stations.get(station_id)
        if station is None or station.deleted_at is not None:
            raise NotFoundError("Station not found.", code="STATION_NOT_FOUND")
        return station

    async def discover(
        self, lat: float, lng: float, radius_km: float
    ) -> list[StationNearbyOut]:
        radius_km = min(radius_km, MAX_DISCOVERY_RADIUS_KM)
        candidates = await self.stations.within_bbox(lat, lng, radius_km)
        out: list[StationNearbyOut] = []
        for s in candidates:
            dist = haversine_km(lat, lng, s.lat, s.lng)
            if dist > radius_km:
                continue
            avail = sum(1 for c in s.chargers if c.status == ChargerStatus.AVAILABLE)
            out.append(
                StationNearbyOut(
                    id=s.id, name=s.name, address=s.address, city=s.city,
                    lat=s.lat, lng=s.lng, amenities=s.amenities, status=s.status,
                    rating_avg=s.rating_avg, rating_count=s.rating_count,
                    distance_km=round(dist, 2),
                    available_chargers=avail, total_chargers=len(s.chargers),
                )
            )
        out.sort(key=lambda x: x.distance_km)
        return out

    async def list_by_owner(self, owner_id: uuid.UUID) -> list[Station]:
        return await self.stations.get_by_owner(owner_id)

    async def ensure_owner(self, station_id: uuid.UUID, user_id: uuid.UUID, is_admin: bool) -> Station:
        station = await self.get_detail(station_id)
        if not is_admin and station.owner_id != user_id:
            raise ForbiddenError("You do not own this station.", code="NOT_STATION_OWNER")
        return station
