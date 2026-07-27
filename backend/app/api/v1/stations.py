"""Station discovery + owner station/charger management."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

from app.api.deps import (
    get_availability_service,
    get_booking_service,
    get_current_user,
    get_station_service,
    require_roles,
)
from app.domain.policies import DEFAULT_DISCOVERY_RADIUS_KM
from app.models.user import User
from app.schemas.admin import PagedResult
from app.schemas.bookings import BookingOut, OwnerBookingOut, SlotOut
from app.schemas.stations import (
    ChargerCreateIn,
    ChargerOut,
    ChargerStatusIn,
    ReviewCreateIn,
    ReviewOut,
    StationCreateIn,
    StationDetailOut,
    StationNearbyOut,
    StationStatsOut,
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


@router.get("/stations/{station_id}/stats", response_model=StationStatsOut)
async def station_stats(
    station_id: uuid.UUID, svc: StationService = Depends(get_station_service)
):
    """Public: sessions started/completed today + rolling uptime %."""
    return await svc.get_stats(station_id)


@router.get("/stations/{station_id}/reviews", response_model=PagedResult[ReviewOut])
async def list_station_reviews(
    station_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    svc: StationService = Depends(get_station_service),
):
    items, total = await svc.list_reviews(station_id, page, per_page)
    pages = (total + per_page - 1) // per_page if total else 0
    return PagedResult(items=items, total=total, page=page, per_page=per_page, pages=pages)


@router.post("/stations/{station_id}/reviews", response_model=ReviewOut, status_code=201)
async def create_station_review(
    station_id: uuid.UUID,
    payload: ReviewCreateIn,
    booking_id: uuid.UUID = Query(..., description="A COMPLETED booking of yours at this station"),
    user: User = Depends(get_current_user),
    svc: StationService = Depends(get_station_service),
):
    return await svc.add_review(station_id, user.id, booking_id, payload)


@router.get("/owner/stations", response_model=list[StationDetailOut])
async def list_owner_stations(
    user: User = Depends(require_roles("ROLE_STATION_OWNER", "ROLE_ADMIN")),
    svc: StationService = Depends(get_station_service),
):
    return await svc.list_by_owner(user.id)


@router.get("/owner/bookings", response_model=list[OwnerBookingOut])
async def list_owner_bookings(
    user: User = Depends(require_roles("ROLE_STATION_OWNER", "ROLE_ADMIN")),
    svc: StationService = Depends(get_station_service),
    booking_svc: BookingService = Depends(get_booking_service),
):
    """Owner-facing booking list. response_model=OwnerBookingOut strips
    `amount` (customer's full paid total) and the platform/convenience/GST
    fields from `breakdown` — Pydantic filters them out at serialization
    even though the underlying ORM objects carry the full figures."""
    stations = await svc.list_by_owner(user.id)
    station_ids = [s.id for s in stations]
    bookings = await booking_svc.list_for_owner(station_ids)
    out = []
    for b in bookings:
        row = OwnerBookingOut.model_validate(b)
        row.breakdown = await booking_svc.get_breakdown(b)
        out.append(row)
    return out


@router.post("/owner/stations", response_model=StationDetailOut, status_code=201)
async def create_station(
    payload: StationCreateIn,
    user: User = Depends(require_roles("ROLE_STATION_OWNER", "ROLE_ADMIN")),
    svc: StationService = Depends(get_station_service),
):
    return await svc.create(user.id, payload)


@router.get("/owner/stations/{station_id}", response_model=StationDetailOut)
async def get_owner_station(
    station_id: uuid.UUID,
    user: User = Depends(require_roles("ROLE_STATION_OWNER", "ROLE_ADMIN")),
    svc: StationService = Depends(get_station_service),
):
    is_admin = "ROLE_ADMIN" in user.role_names
    return await svc.ensure_owner(station_id, user.id, is_admin)


@router.post("/owner/stations/{station_id}/chargers", response_model=ChargerOut, status_code=201)
async def add_station_charger(
    station_id: uuid.UUID,
    payload: ChargerCreateIn,
    user: User = Depends(require_roles("ROLE_STATION_OWNER", "ROLE_ADMIN")),
    svc: StationService = Depends(get_station_service),
):
    is_admin = "ROLE_ADMIN" in user.role_names
    return await svc.add_charger(station_id, user.id, is_admin, payload)


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


@router.get("/chargers/{charger_id}/slots", response_model=list[SlotOut])
async def charger_slots(
    charger_id: uuid.UUID,
    date: str | None = Query(None, description="YYYY-MM-DD (defaults to today)"),
    duration_minutes: int = Query(30, ge=15, le=180),
    booking: BookingService = Depends(get_booking_service),
):
    if date:
        day = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
    else:
        day = datetime.now(timezone.utc)
    return await booking.available_slots(charger_id, day, duration_minutes)
