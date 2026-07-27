"""Admin-only endpoints: platform pricing/fee configuration + owner payouts."""
from __future__ import annotations

import math
import uuid

from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.api.deps import (
    get_audit_log_repo,
    get_owner_finance_service,
    get_payout_service,
    get_pricing_settings_service,
    require_roles,
)
from app.models.enums import PayoutStatus, RoleName
from app.models.user import User
from app.repositories.audit_log_repo import AuditLogRepo
from app.schemas.admin import PagedResult
from app.schemas.payouts import OwnerPayoutCreateIn, OwnerPayoutOut, OwnerStationFinanceOut, PayoutQuoteOut
from app.schemas.pricing import PricingSettingsOut, PricingSettingsUpdateIn
from app.services.owner_finance_service import OwnerFinanceService
from app.services.payout_service import PayoutService
from app.services.pricing_settings_service import PricingSettingsService

router = APIRouter(prefix="/admin/pricing", tags=["admin-pricing"])

_ADMIN_ONLY = require_roles(RoleName.ADMIN.value)


@router.get("/settings", response_model=PricingSettingsOut)
async def get_pricing_settings(
    _: User = Depends(_ADMIN_ONLY),
    svc: PricingSettingsService = Depends(get_pricing_settings_service),
):
    return await svc.get()


@router.patch("/settings", response_model=PricingSettingsOut)
async def update_pricing_settings(
    body: PricingSettingsUpdateIn,
    admin: User = Depends(_ADMIN_ONLY),
    svc: PricingSettingsService = Depends(get_pricing_settings_service),
    audit: AuditLogRepo = Depends(get_audit_log_repo),
):
    updated = await svc.update(body.model_dump(exclude_unset=True), admin.id)
    await audit.create(
        actor_id=admin.id, action="PRICING_SETTINGS_UPDATED",
        target_type="pricing_settings", target_id=updated.id,
        detail=body.model_dump(exclude_unset=True),
    )
    return updated


@router.get("/owners/{owner_id}/stations-summary", response_model=list[OwnerStationFinanceOut])
async def get_owner_stations_summary(
    owner_id: uuid.UUID,
    _: User = Depends(_ADMIN_ONLY),
    svc: OwnerFinanceService = Depends(get_owner_finance_service),
):
    """Per-station earnings for one owner, with paid/pending payout amounts
    per station — lets admin decide which station a payout actually covers
    instead of guessing a lump-sum amount across every station the owner runs."""
    return await svc.get_owner_stations_summary(owner_id)


@router.get("/owners/{owner_id}/payout-quote", response_model=PayoutQuoteOut)
async def get_payout_quote(
    owner_id: uuid.UUID,
    period_start: datetime = Query(...),
    period_end: datetime = Query(...),
    station_id: uuid.UUID | None = Query(None),
    _: User = Depends(_ADMIN_ONLY),
    svc: OwnerFinanceService = Depends(get_owner_finance_service),
):
    """Live-computed payout amount for an owner (optionally one station)
    over an admin-chosen period — earned in that window minus anything an
    overlapping existing payout already covers. Powers the Create Payout
    form's auto-filled amount instead of a lifetime-total guess."""
    return await svc.quote_payout(owner_id, period_start, period_end, station_id)


@router.get("/payouts", response_model=PagedResult[OwnerPayoutOut])
async def list_all_payouts(
    status: PayoutStatus | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: User = Depends(_ADMIN_ONLY),
    svc: PayoutService = Depends(get_payout_service),
):
    items, total = await svc.list_all(status, page, per_page)
    pages = max(1, math.ceil(total / per_page)) if total else 1
    return PagedResult(items=items, total=total, page=page, per_page=per_page, pages=pages)


@router.post("/payouts", response_model=OwnerPayoutOut, status_code=201)
async def create_payout(
    body: OwnerPayoutCreateIn,
    admin: User = Depends(_ADMIN_ONLY),
    svc: PayoutService = Depends(get_payout_service),
    audit: AuditLogRepo = Depends(get_audit_log_repo),
):
    payout = await svc.create_manual_payout(
        owner_id=body.owner_id,
        station_id=body.station_id,
        period_start=body.period_start,
        period_end=body.period_end,
        amount_paise=body.amount_paise,
        admin_id=admin.id,
        payout_method=body.payout_method,
        reference_note=body.reference_note,
    )
    await audit.create(
        actor_id=admin.id, action="PAYOUT_CREATED",
        target_type="owner_payout", target_id=payout.id,
        detail={"owner_id": str(body.owner_id), "amount_paise": body.amount_paise},
    )
    return payout


@router.post("/payouts/{payout_id}/mark-paid", response_model=OwnerPayoutOut)
async def mark_payout_paid(
    payout_id: uuid.UUID,
    admin: User = Depends(_ADMIN_ONLY),
    svc: PayoutService = Depends(get_payout_service),
    audit: AuditLogRepo = Depends(get_audit_log_repo),
):
    payout = await svc.mark_paid(payout_id)
    await audit.create(
        actor_id=admin.id, action="PAYOUT_MARKED_PAID",
        target_type="owner_payout", target_id=payout.id, detail=None,
    )
    return payout
