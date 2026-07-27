"""Owner payout use-cases — manual/admin-triggered, no real bank-transfer
integration. Admin creates a payout (PENDING/SCHEDULED) covering a period,
then marks it PAID once the transfer is done out-of-band."""
from __future__ import annotations

import uuid
from datetime import datetime

from app.core.errors import ConflictError, NotFoundError
from app.core.time import utcnow
from app.models.enums import PayoutStatus
from app.models.owner_payout import OwnerPayout
from app.repositories.owner_payout_repo import OwnerPayoutRepo


class PayoutService:
    def __init__(self, payouts: OwnerPayoutRepo):
        self.payouts = payouts

    async def create_manual_payout(
        self,
        owner_id: uuid.UUID,
        station_id: uuid.UUID | None,
        period_start: datetime,
        period_end: datetime,
        amount_paise: int,
        admin_id: uuid.UUID,
        payout_method: str | None = None,
        reference_note: str | None = None,
    ) -> OwnerPayout:
        payout = OwnerPayout(
            owner_id=owner_id,
            station_id=station_id,
            period_start=period_start,
            period_end=period_end,
            amount_paise=amount_paise,
            status=PayoutStatus.PENDING,
            payout_method=payout_method,
            reference_note=reference_note,
            created_by=admin_id,
        )
        return await self.payouts.add(payout)

    async def mark_paid(self, payout_id: uuid.UUID) -> OwnerPayout:
        payout = await self.payouts.get(payout_id)
        if payout is None:
            raise NotFoundError("Payout not found.", code="PAYOUT_NOT_FOUND")
        if payout.status == PayoutStatus.PAID:
            return payout
        if payout.status == PayoutStatus.FAILED:
            raise ConflictError("Cannot mark a failed payout as paid.", code="PAYOUT_FAILED")
        payout.status = PayoutStatus.PAID
        payout.paid_at = utcnow()
        return payout

    async def list_for_owner(self, owner_id: uuid.UUID, page: int, per_page: int):
        return await self.payouts.list_for_owner(owner_id, page, per_page)

    async def list_all(self, status: PayoutStatus | None, page: int, per_page: int):
        return await self.payouts.list_all(status, page, per_page)
