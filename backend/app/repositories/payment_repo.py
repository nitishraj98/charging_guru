"""Data access for payments."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment


class PaymentRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, payment: Payment) -> Payment:
        self.session.add(payment)
        await self.session.flush()
        return payment

    async def get(self, payment_id: uuid.UUID) -> Payment | None:
        return await self.session.get(Payment, payment_id)

    async def get_by_booking(self, booking_id: uuid.UUID) -> Payment | None:
        res = await self.session.execute(
            select(Payment).where(Payment.booking_id == booking_id)
        )
        return res.scalar_one_or_none()

    async def get_by_order(self, razorpay_order_id: str) -> Payment | None:
        res = await self.session.execute(
            select(Payment).where(Payment.razorpay_order_id == razorpay_order_id)
        )
        return res.scalar_one_or_none()

    async def get_by_payment_id(self, razorpay_payment_id: str) -> Payment | None:
        res = await self.session.execute(
            select(Payment).where(Payment.razorpay_payment_id == razorpay_payment_id)
        )
        return res.scalar_one_or_none()
