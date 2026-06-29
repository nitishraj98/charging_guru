"""Station discovery + owner station/charger management."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

from app.api.deps import (
    get_availability_service,
    get_booking_service,
    get_station_service,
    require_roles,
)
from app.domain.policies import DEFAULT_DISCOVERY_RADIUS_KM
from app.models.user import User
from app.schemas.bookings import BookingOut
from app.schemas.stations import (
    ChargerOut,
    ChargerStatusIn,
    StationCreateIn,
    StationDetailOut,
    StationNearbyOut,
)
from app.services.availability_service import AvailabilityService
from app.services.booking_service import BookingService
from app.services.station_service import StationService

router = APIRouter(tags=["stations"])


@router.get("/stations", response_model=list[StationNearbyOut])
async def discover(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(DEFAULT_DISCOVERY_RADIUS_KM, gt=0, le=50),
    q: str | None = Query(None, description="Filter by station name or city (case-insensitive substring)"),
    svc: StationService = Depends(get_station_service),
):
    """Public: stations near a point, nearest first, with live availability counts.
    Optional ?q= filters by name/city substring server-side."""
    results = await svc.discover(lat, lng, radius_km)
    if q:
        term = q.lower()
        results = [r for r in results if term in r.name.lower() or (r.city and term in r.city.lower())]
    return results


@router.get("/stations/{station_id}", response_model=StationDetailOut)
async def station_detail(
    station_id: uuid.UUID, svc: StationService = Depends(get_station_service)
):
    return await svc.get_detail(station_id)


@router.get("/owner/stations", response_model=list[StationDetailOut])
async def list_owner_stations(
    user: User = Depends(require_roles("ROLE_STATION_OWNER", "ROLE_ADMIN")),
    svc: StationService = Depends(get_station_service),
):
    return await svc.list_by_owner(user.id)


@router.get("/owner/bookings", response_model=list[BookingOut])
async def list_owner_bookings(
    user: User = Depends(require_roles("ROLE_STATION_OWNER", "ROLE_ADMIN")),
    svc: StationService = Depends(get_station_service),
    booking_svc: BookingService = Depends(get_booking_service),
):
    stations = await svc.list_by_owner(user.id)
    station_ids = [s.id for s in stations]
    return await booking_svc.list_for_owner(station_ids)


@router.post("/owner/stations", response_model=StationDetailOut, status_code=201)
async def create_station(
    payload: StationCreateIn,
    user: User = Depends(require_roles("ROLE_STATION_OWNER", "ROLE_ADMIN")),
    svc: StationService = Depends(get_station_service),
):
    return await svc.create(user.id, payload)


@router.patch("/chargers/{charger_id}/status", response_model=ChargerOut)
async def set_charger_status(
    charger_id: uuid.UUID,
    payload: ChargerStatusIn,
    user: User = Depends(require_roles("ROLE_STATION_OWNER", "ROLE_ADMIN")),
    avail: AvailabilityService = Depends(get_availability_service),
    stations: StationService = Depends(get_station_service),
):
    # ownership check: the charger's station must belong to this owner (or admin)
    charger = await avail.chargers.get(charger_id)
    if charger is not None:
        is_admin = "ROLE_ADMIN" in user.role_names
        await stations.ensure_owner(charger.station_id, user.id, is_admin)
    return await avail.set_status(
        charger_id, payload.status, changed_by=user.id, reason=payload.reason
    )


@router.get("/chargers/{charger_id}/slots")
async def charger_slots(
    charger_id: uuid.UUID,
    date: str | None = Query(None, description="YYYY-MM-DD (defaults to today)"),
    booking: BookingService = Depends(get_booking_service),
):
    if date:
        day = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
    else:
        day = datetime.now(timezone.utc)
    return await booking.available_slots(charger_id, day)
