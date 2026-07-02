"""Membership tier catalog + upgrade (no payment gateway wired yet)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, get_membership_service
from app.models.user import User
from app.schemas.rewards import MembershipMeOut, MembershipTierOut, MembershipUpgradeIn
from app.services.reward_service import MembershipService

router = APIRouter(prefix="/membership", tags=["membership"])


@router.get("/tiers", response_model=list[MembershipTierOut])
async def list_tiers(svc: MembershipService = Depends(get_membership_service)):
    return svc.tier_catalog()


@router.get("/me", response_model=MembershipMeOut)
async def get_my_membership(
    user: User = Depends(get_current_user),
    svc: MembershipService = Depends(get_membership_service),
):
    return svc.current(user)


@router.post("/upgrade", response_model=MembershipMeOut)
async def upgrade_membership(
    payload: MembershipUpgradeIn,
    user: User = Depends(get_current_user),
    svc: MembershipService = Depends(get_membership_service),
):
    return await svc.upgrade(user, payload.tier)
