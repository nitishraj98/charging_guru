"""Route planning — corridor-based charging stop recommendations."""
from __future__ import annotations

import math

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.domain.geo import haversine_km
from app.repositories.station_repo import StationRepo

router = APIRouter(prefix="/routes", tags=["routes"])


class Coords(BaseModel):
    lat: float
    lng: float


class RoutePlanIn(BaseModel):
    source: Coords
    destination: Coords
    vehicle_id: str
    soc_percent: float  # 0-100


class StopOut(BaseModel):
    station_id: str | None = None
    station_name: str
    city: str
    distance_from_start_km: float
    arrival_battery_pct: float
    charge_to_pct: float
    charge_time_min: float
    charger_power_kw: float
    price_per_kwh: float
    availability: str
    charger_id: str | None = None
    connector_type: str


class WaypointOut(BaseModel):
    city: str
    distance_km: float
    is_stop: bool


class RoutePlanOut(BaseModel):
    source: str
    destination: str
    total_distance_km: float
    estimated_duration_min: float
    stops_required: int
    recommended_stops: list[StopOut]
    route_waypoints: list[WaypointOut]
    total_charging_cost_paise: int
    total_charging_time_min: float


def _interp(src: Coords, dst: Coords, frac: float) -> Coords:
    return Coords(
        lat=src.lat + (dst.lat - src.lat) * frac,
        lng=src.lng + (dst.lng - src.lng) * frac,
    )


@router.post("/plan", response_model=RoutePlanOut)
async def plan_route(
    body: RoutePlanIn,
    db: AsyncSession = Depends(get_db),
) -> RoutePlanOut:
    total_km = haversine_km(body.source.lat, body.source.lng, body.destination.lat, body.destination.lng)

    # Conservative vehicle defaults (40 kWh, 6.5 km/kWh)
    BATTERY_KWH = 40.0
    EFFICIENCY = 6.5
    full_range = BATTERY_KWH * EFFICIENCY
    reserve_km = full_range * 0.10  # 10% reserve kept at all times

    repo = StationRepo(db)
    stops: list[StopOut] = []
    waypoints: list[WaypointOut] = []

    current_km = 0.0
    current_soc = body.soc_percent

    for _ in range(10):  # safety cap on iterations
        remaining_km = total_km - current_km
        if remaining_km <= 0:
            break

        usable_now = full_range * (current_soc / 100.0) - reserve_km
        if usable_now >= remaining_km:
            # Can reach destination — done
            break

        # Place stop at 90% of usable range from here
        drive_km = usable_now * 0.90
        stop_km = current_km + drive_km
        frac = min(stop_km / total_km, 0.98)
        stop_point = _interp(body.source, body.destination, frac)

        # kWh consumed to reach stop
        arrival_soc = max(5.0, current_soc - (drive_km / full_range) * 100.0)

        nearby = await repo.within_bbox(stop_point.lat, stop_point.lng, 50)
        # Sort by actual distance and pick closest
        nearby.sort(key=lambda s: haversine_km(stop_point.lat, stop_point.lng, s.lat, s.lng))

        if nearby:
            s = nearby[0]
            charger = s.chargers[0] if s.chargers else None
            power_kw = float(charger.power_kw) if charger else 50.0
            price_paise = int(charger.price_per_kwh) if charger else 1800
            charge_to = 80.0
            kwh_needed = BATTERY_KWH * (charge_to - arrival_soc) / 100.0
            charge_min = (kwh_needed / power_kw) * 60.0

            stops.append(StopOut(
                station_id=str(s.id),
                station_name=s.name,
                city=s.city or "En Route",
                distance_from_start_km=round(stop_km, 1),
                arrival_battery_pct=round(arrival_soc, 1),
                charge_to_pct=charge_to,
                charge_time_min=round(charge_min),
                charger_power_kw=power_kw,
                price_per_kwh=price_paise / 100.0,
                availability="available",
                charger_id=str(charger.id) if charger else None,
                connector_type=charger.connector_type if charger else "CCS2",
            ))
            waypoints.append(WaypointOut(city=s.city or "Stop", distance_km=round(stop_km, 1), is_stop=True))
            current_soc = charge_to
        else:
            # No station in DB — synthetic placeholder
            stops.append(StopOut(
                station_name="Charging Hub",
                city="En Route",
                distance_from_start_km=round(stop_km, 1),
                arrival_battery_pct=round(arrival_soc, 1),
                charge_to_pct=80.0,
                charge_time_min=30,
                charger_power_kw=50.0,
                price_per_kwh=18.0,
                availability="limited",
                connector_type="CCS2",
            ))
            waypoints.append(WaypointOut(city="En Route", distance_km=round(stop_km, 1), is_stop=True))
            current_soc = 80.0

        current_km = stop_km

    total_cost_paise = sum(
        int(s.charge_time_min / 60.0 * s.charger_power_kw * s.price_per_kwh * 100)
        for s in stops
    )
    total_charge_time = sum(s.charge_time_min for s in stops)
    drive_time_min = (total_km / 80.0) * 60.0  # assume 80 km/h avg

    return RoutePlanOut(
        source=f"{body.source.lat:.4f},{body.source.lng:.4f}",
        destination=f"{body.destination.lat:.4f},{body.destination.lng:.4f}",
        total_distance_km=round(total_km, 1),
        estimated_duration_min=round(drive_time_min + total_charge_time),
        stops_required=len(stops),
        recommended_stops=stops,
        route_waypoints=waypoints,
        total_charging_cost_paise=total_cost_paise,
        total_charging_time_min=round(total_charge_time),
    )
