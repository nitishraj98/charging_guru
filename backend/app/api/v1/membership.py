"""Membership tier catalog + real Razorpay order/verify purchase flow."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user, get_membership_service
from app.models.user import User
from app.schemas.rewards import (
    MembershipMeOut,
    MembershipOrderIn,
    MembershipOrderOut,
    MembershipTierOut,
    MembershipVerifyIn,
)
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


@router.post("/order", response_model=MembershipOrderOut, status_code=status.HTTP_201_CREATED)
async def create_membership_order(
    payload: MembershipOrderIn,
    user: User = Depends(get_current_user),
    svc: MembershipService = Depends(get_membership_service),
):
    return await svc.create_order(user, payload.tier)


@router.post("/verify", response_model=MembershipMeOut)
async def verify_membership_payment(
    payload: MembershipVerifyIn,
    user: User = Depends(get_current_user),
    svc: MembershipService = Depends(get_membership_service),
):
    return await svc.verify_payment(user, payload)
