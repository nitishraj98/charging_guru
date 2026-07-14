"""Data access for the reward-point ledger."""
from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reward import RewardTransaction


class RewardRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, tx: RewardTransaction) -> RewardTransaction:
        self.session.add(tx)
        await self.session.flush()
        return tx

    async def list_for_user(self, user_id: uuid.UUID, limit: int = 100) -> list[RewardTransaction]:
        res = await self.session.execute(
            select(RewardTransaction)
            .where(RewardTransaction.user_id == user_id)
            .order_by(RewardTransaction.created_at.desc())
            .limit(limit)
        )
        return list(res.scalars().all())

    async def has_earned_first_booking_bonus(self, user_id: uuid.UUID) -> bool:
        res = await self.session.execute(
            select(RewardTransaction.id)
            .where(
                RewardTransaction.user_id == user_id,
                RewardTransaction.description == "First booking bonus",
            )
            .limit(1)
        )
        return res.scalar_one_or_none() is not None

    async def lifetime_earned_points(self, user_id: uuid.UUID) -> int:
        """Sum of all positive (earned) point entries — used for tier thresholds,
        independent of the user's current spendable balance."""
        res = await self.session.execute(
            select(func.coalesce(func.sum(RewardTransaction.points), 0))
            .where(RewardTransaction.user_id == user_id, RewardTransaction.points > 0)
        )
        return int(res.scalar_one())
