"""Vehicle management endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.repositories.vehicle_repo import VehicleRepo
from app.schemas.vehicles import VehicleCreateIn, VehicleOut, VehicleUpdateIn

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


def _out(v) -> VehicleOut:
    return VehicleOut.model_validate(v)


@router.get("", response_model=list[VehicleOut])
async def list_vehicles(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[VehicleOut]:
    repo = VehicleRepo(db)
    vehicles = await repo.list_for_user(user.id)
    return [_out(v) for v in vehicles]


@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    payload: VehicleCreateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VehicleOut:
    repo = VehicleRepo(db)
    vehicle = await repo.create(
        user_id=user.id,
        brand=payload.brand,
        model=payload.model,
        battery_kwh=float(payload.battery_kwh),
        range_km=payload.range_km,
        connector_type=payload.connector_type,
    )
    return _out(vehicle)


@router.patch("/{vehicle_id}", response_model=VehicleOut)
async def update_vehicle(
    vehicle_id: uuid.UUID,
    payload: VehicleUpdateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VehicleOut:
    repo = VehicleRepo(db)
    vehicle = await repo.get(vehicle_id, user.id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    if payload.brand is not None:
        vehicle.brand = payload.brand
    if payload.model is not None:
        vehicle.model = payload.model
    if payload.battery_kwh is not None:
        vehicle.battery_kwh = float(payload.battery_kwh)
    if payload.range_km is not None:
        vehicle.range_km = payload.range_km
    if payload.connector_type is not None:
        vehicle.connector_type = payload.connector_type
    await db.flush()
    return _out(vehicle)


@router.post("/{vehicle_id}/default", response_model=VehicleOut)
async def set_default_vehicle(
    vehicle_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VehicleOut:
    repo = VehicleRepo(db)
    vehicle = await repo.set_default(vehicle_id, user.id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    return _out(vehicle)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    vehicle_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    repo = VehicleRepo(db)
    deleted = await repo.soft_delete(vehicle_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
