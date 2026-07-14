"""Data access for membership tier-upgrade payments."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import MembershipTier
from app.models.membership_payment import MembershipPayment


class MembershipPaymentRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, payment: MembershipPayment) -> MembershipPayment:
        self.session.add(payment)
        await self.session.flush()
        return payment

    async def get_by_order(self, razorpay_order_id: str) -> MembershipPayment | None:
        res = await self.session.execute(
            select(MembershipPayment).where(MembershipPayment.razorpay_order_id == razorpay_order_id)
        )
        return res.scalar_one_or_none()

    async def get_pending_for_user_tier(
        self, user_id: uuid.UUID, tier: MembershipTier
    ) -> MembershipPayment | None:
        """Idempotency: reuse an existing PENDING order for the same tier."""
        from app.models.enums import PaymentStatus

        res = await self.session.execute(
            select(MembershipPayment)
            .where(
                MembershipPayment.user_id == user_id,
                MembershipPayment.tier == tier,
                MembershipPayment.status == PaymentStatus.PENDING,
            )
            .order_by(MembershipPayment.created_at.desc())
            .limit(1)
        )
        return res.scalar_one_or_none()
