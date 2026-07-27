"""Owner-scoped financial summary — the enforcement point for the rule that
station owners must never see Charging Guru's platform/convenience fee
revenue or overall company profit. A separate service (not a filtered view
of admin_repo's aggregates) so the restricted field set is structural: the
repo query this calls physically never selects those columns.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from app.models.enums import PayoutStatus
from app.repositories.owner_payout_repo import OwnerPayoutRepo
from app.repositories.transaction_breakdown_repo import TransactionBreakdownRepo


class OwnerFinanceService:
    def __init__(self, breakdown_repo: TransactionBreakdownRepo, payouts: OwnerPayoutRepo):
        self.breakdown_repo = breakdown_repo
        self.payouts = payouts

    async def get_owner_stations_summary(self, owner_id: uuid.UUID) -> list[dict]:
        """Per-station earnings for this owner, each annotated with how much
        of that station's lifetime earnings has already been paid out
        (station-scoped PAID payouts only) — so "pending" per station is
        computable instead of guessed."""
        by_station = await self.breakdown_repo.sum_by_station_for_owner(owner_id)
        paid_by_station = await self.payouts.sum_paid_by_station(owner_id)
        for row in by_station:
            paid = paid_by_station.get(row["station_id"], 0)
            row["paid_out_paise"] = paid
            row["pending_payout_paise"] = max(0, row["total_earnings_paise"] - paid)
        return by_station

    async def quote_payout(
        self,
        owner_id: uuid.UUID,
        period_start: datetime,
        period_end: datetime,
        station_id: uuid.UUID | None = None,
    ) -> dict:
        """What a payout for this exact owner/station/period should be:
        earnings in that window, minus anything already covered by an
        existing payout whose period overlaps it. This is what the Create
        Payout form calls live as the admin adjusts owner/station/dates,
        instead of asking them to compute it by hand."""
        earned = await self.breakdown_repo.sum_earned_in_period(
            owner_id, period_start, period_end, station_id
        )
        already_covered = await self.payouts.sum_paid_or_pending_overlapping_period(
            owner_id, period_start, period_end, station_id
        )
        return {
            "earned_in_period_paise": earned,
            "already_covered_paise": already_covered,
            "suggested_amount_paise": max(0, earned - already_covered),
        }

    async def get_owner_summary(self, owner_id: uuid.UUID) -> dict:
        earnings = await self.breakdown_repo.sum_for_owner(owner_id)
        payout_totals = await self.payouts.sum_by_status(owner_id)
        completed = payout_totals.get(PayoutStatus.PAID.value, 0)
        scheduled = payout_totals.get(PayoutStatus.PENDING.value, 0) + payout_totals.get(
            PayoutStatus.SCHEDULED.value, 0
        )
        # "Pending" is what's actually still owed — lifetime earnings minus
        # what's been paid or already committed to a payout row — not just
        # the sum of existing PENDING/SCHEDULED rows on their own. Those two
        # only match if every earned rupee already has a ledger row, which
        # isn't guaranteed: an owner can have real unpaid earnings with zero
        # payout rows at all, and this must still surface as pending instead
        # of silently showing ₹0.
        pending = max(0, earnings["total_earnings_paise"] - completed - scheduled)
        return {
            "total_earnings_paise": earnings["total_earnings_paise"],
            "charging_revenue_paise": earnings["charging_revenue_paise"],
            "parking_revenue_paise": earnings["parking_revenue_paise"],
            "idle_fee_revenue_paise": earnings["idle_fee_revenue_paise"],
            "pending_payouts_paise": pending,
            "completed_payouts_paise": completed,
            "charging_sessions_count": earnings["charging_sessions_count"],
            "energy_sold_kwh": earnings["energy_sold_kwh"],
        }
