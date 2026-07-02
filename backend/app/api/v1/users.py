"""User profile endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import UserPublic
from app.schemas.users import UpdateProfileIn

router = APIRouter(prefix="/users", tags=["users"])


def _to_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        phone=user.phone,
        full_name=user.full_name,
        email=user.email,
        reward_points=user.reward_points,
        membership_tier=user.membership_tier,
        referral_code=user.referral_code,
        roles=user.role_names,
    )


@router.get("/me", response_model=UserPublic)
async def get_me(user: User = Depends(get_current_user)) -> UserPublic:
    return _to_public(user)


@router.patch("/me", response_model=UserPublic)
async def update_me(
    payload: UpdateProfileIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPublic:
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.email is not None:
        user.email = str(payload.email)
    await db.flush()
    return _to_public(user)
