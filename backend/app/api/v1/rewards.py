"""Reward-point summary, history, and redemption."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, get_reward_service
from app.models.user import User
from app.schemas.rewards import RedeemIn, RewardSummaryOut, RewardTransactionOut
from app.services.reward_service import RewardService

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("/summary", response_model=RewardSummaryOut)
async def get_summary(
    user: User = Depends(get_current_user),
    svc: RewardService = Depends(get_reward_service),
):
    return await svc.get_summary(user)


@router.get("/history", response_model=list[RewardTransactionOut])
async def get_history(
    user: User = Depends(get_current_user),
    svc: RewardService = Depends(get_reward_service),
):
    return await svc.get_history(user.id)


@router.post("/redeem", response_model=RewardTransactionOut, status_code=201)
async def redeem(
    payload: RedeemIn,
    user: User = Depends(get_current_user),
    svc: RewardService = Depends(get_reward_service),
):
    return await svc.redeem(user, payload.points)
