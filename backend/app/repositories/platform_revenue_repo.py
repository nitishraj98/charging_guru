"""CRUD for the append-only Charging Guru revenue ledger."""
from __future__ import annotations

import uuid

from sqlalchemy import select

from app.models.platform_revenue import PlatformRevenue


class PlatformRevenueRepo:
    def __init__(self, session):
        self.session = session

    async def add(self, row: PlatformRevenue) -> PlatformRevenue:
        self.session.add(row)
        await self.session.flush()
        return row

    async def get_by_payment(self, payment_id: uuid.UUID) -> PlatformRevenue | None:
        res = await self.session.execute(
            select(PlatformRevenue).where(PlatformRevenue.payment_id == payment_id)
        )
        return res.scalar_one_or_none()
