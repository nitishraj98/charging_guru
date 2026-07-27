"""CRUD + listing for owner_payouts."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select

from app.models.enums import PayoutStatus
from app.models.owner_payout import OwnerPayout


class OwnerPayoutRepo:
    def __init__(self, session):
        self.session = session

    async def add(self, payout: OwnerPayout) -> OwnerPayout:
        self.session.add(payout)
        await self.session.flush()
        return payout

    async def get(self, payout_id: uuid.UUID) -> OwnerPayout | None:
        res = await self.session.execute(select(OwnerPayout).where(OwnerPayout.id == payout_id))
        return res.scalar_one_or_none()

    async def list_for_owner(
        self, owner_id: uuid.UUID, page: int, per_page: int
    ) -> tuple[list[OwnerPayout], int]:
        base = select(OwnerPayout).where(OwnerPayout.owner_id == owner_id)
        total = (
            await self.session.execute(
                select(func.count()).select_from(base.subquery())
            )
        ).scalar_one()
        res = await self.session.execute(
            base.order_by(OwnerPayout.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        return list(res.scalars().all()), total

    async def list_all(
        self, status: PayoutStatus | None, page: int, per_page: int
    ) -> tuple[list[OwnerPayout], int]:
        base = select(OwnerPayout)
        if status is not None:
            base = base.where(OwnerPayout.status == status)
        total = (
            await self.session.execute(
                select(func.count()).select_from(base.subquery())
            )
        ).scalar_one()
        res = await self.session.execute(
            base.order_by(OwnerPayout.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        return list(res.scalars().all()), total

    async def sum_by_status(self, owner_id: uuid.UUID | None = None) -> dict[str, int]:
        stmt = select(
            OwnerPayout.status, func.coalesce(func.sum(OwnerPayout.amount_paise), 0)
        ).group_by(OwnerPayout.status)
        if owner_id is not None:
            stmt = stmt.where(OwnerPayout.owner_id == owner_id)
        res = await self.session.execute(stmt)
        return {status.value: total for status, total in res.all()}

    async def sum_paid_or_pending_overlapping_period(
        self,
        owner_id: uuid.UUID,
        period_start: datetime,
        period_end: datetime,
        station_id: uuid.UUID | None = None,
    ) -> int:
        """Sum of existing payouts (any non-FAILED status) whose own period
        overlaps [period_start, period_end) for this owner/station — the
        "already accounted for" side of the pending-amount calc, so creating
        a second payout for a period you've already covered surfaces as
        ~₹0 pending instead of double-counting."""
        stmt = select(func.coalesce(func.sum(OwnerPayout.amount_paise), 0)).where(
            OwnerPayout.owner_id == owner_id,
            OwnerPayout.status != PayoutStatus.FAILED,
            OwnerPayout.period_start < period_end,
            OwnerPayout.period_end > period_start,
        )
        if station_id is not None:
            stmt = stmt.where(OwnerPayout.station_id == station_id)
        else:
            stmt = stmt.where(OwnerPayout.station_id.is_(None))
        res = await self.session.execute(stmt)
        return int(res.scalar_one())

    async def sum_paid_by_station(self, owner_id: uuid.UUID) -> dict[str, int]:
        """PAID total per station_id for this owner — station_id-scoped
        payouts only (owner-wide/no-station payouts aren't attributable to
        any single station so they're excluded here)."""
        stmt = (
            select(OwnerPayout.station_id, func.coalesce(func.sum(OwnerPayout.amount_paise), 0))
            .where(
                OwnerPayout.owner_id == owner_id,
                OwnerPayout.station_id.is_not(None),
                OwnerPayout.status == PayoutStatus.PAID,
            )
            .group_by(OwnerPayout.station_id)
        )
        res = await self.session.execute(stmt)
        return {str(station_id): int(total) for station_id, total in res.all()}
