"""Station-owner-only endpoints: scoped financial summary + payouts.

Deliberately never exposes platform/convenience fee or Charging Guru revenue
fields — see OwnerFinanceService and TransactionBreakdownRepo.sum_for_owner.
"""
from __future__ import annotations

import math

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_owner_finance_service, get_payout_service, require_roles
from app.models.enums import RoleName
from app.models.user import User
from app.schemas.admin import PagedResult
from app.schemas.payouts import OwnerFinanceSummaryOut, OwnerPayoutOut, OwnerStationFinanceOut
from app.services.owner_finance_service import OwnerFinanceService
from app.services.payout_service import PayoutService

router = APIRouter(prefix="/owner/finance", tags=["owner-finance"])

_OWNER_ONLY = require_roles(RoleName.STATION_OWNER.value)


@router.get("/summary", response_model=OwnerFinanceSummaryOut)
async def get_owner_finance_summary(
    owner: User = Depends(_OWNER_ONLY),
    svc: OwnerFinanceService = Depends(get_owner_finance_service),
):
    return await svc.get_owner_summary(owner.id)


@router.get("/by-station", response_model=list[OwnerStationFinanceOut])
async def get_owner_finance_by_station(
    owner: User = Depends(_OWNER_ONLY),
    svc: OwnerFinanceService = Depends(get_owner_finance_service),
):
    """Per-station earnings breakdown for the current owner — powers the
    station switcher on the owner dashboard for owners running more than
    one station."""
    return await svc.get_owner_stations_summary(owner.id)


@router.get("/payouts", response_model=PagedResult[OwnerPayoutOut])
async def list_my_payouts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    owner: User = Depends(_OWNER_ONLY),
    svc: PayoutService = Depends(get_payout_service),
):
    items, total = await svc.list_for_owner(owner.id, page, per_page)
    pages = max(1, math.ceil(total / per_page)) if total else 1
    return PagedResult(items=items, total=total, page=page, per_page=per_page, pages=pages)
