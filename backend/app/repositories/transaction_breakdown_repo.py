"""CRUD for per-payment fee breakdowns, plus the owner-scoped aggregate used
by OwnerFinanceService (selects only owner-earnings-relevant columns —
platform_fee_paise/convenience_fee_paise/charging_guru_earnings_paise are
never touched here, since an owner must never see Charging Guru's cut)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select

from app.models.booking import Booking
from app.models.enums import BookingStatus
from app.models.station import Station
from app.models.transaction_breakdown import TransactionBreakdown

_CONFIRMED_STATUSES = (
    BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN,
    BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED,
)


class TransactionBreakdownRepo:
    def __init__(self, session):
        self.session = session

    async def add(self, breakdown: TransactionBreakdown) -> TransactionBreakdown:
        self.session.add(breakdown)
        await self.session.flush()
        return breakdown

    async def get_by_payment(self, payment_id: uuid.UUID) -> TransactionBreakdown | None:
        res = await self.session.execute(
            select(TransactionBreakdown).where(TransactionBreakdown.payment_id == payment_id)
        )
        return res.scalar_one_or_none()

    async def get_by_booking(self, booking_id: uuid.UUID) -> TransactionBreakdown | None:
        res = await self.session.execute(
            select(TransactionBreakdown).where(TransactionBreakdown.booking_id == booking_id)
        )
        return res.scalar_one_or_none()

    async def sum_by_station_for_owner(self, owner_id: uuid.UUID) -> list[dict]:
        """Per-station breakdown for one owner — same restricted column set as
        sum_for_owner (never platform/convenience/charging_guru_earnings),
        grouped by station so a multi-station owner can see which of their
        stations is actually earning, instead of one lump total."""
        stmt = (
            select(
                Station.id,
                Station.name,
                func.coalesce(func.sum(TransactionBreakdown.owner_earnings_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.energy_cost_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.parking_fee_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.idle_fee_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.energy_kwh), 0),
                func.count(TransactionBreakdown.id),
            )
            .select_from(Station)
            .join(Booking, Booking.station_id == Station.id)
            .join(TransactionBreakdown, TransactionBreakdown.booking_id == Booking.id)
            .where(Station.owner_id == owner_id, Booking.status.in_(_CONFIRMED_STATUSES))
            .group_by(Station.id, Station.name)
            .order_by(func.sum(TransactionBreakdown.owner_earnings_paise).desc())
        )
        res = await self.session.execute(stmt)
        return [
            {
                "station_id": str(station_id),
                "station_name": station_name,
                "total_earnings_paise": int(total_earnings),
                "charging_revenue_paise": int(charging_revenue),
                "parking_revenue_paise": int(parking_revenue),
                "idle_fee_revenue_paise": int(idle_revenue),
                "energy_sold_kwh": float(energy_kwh),
                "charging_sessions_count": int(sessions_count),
            }
            for (
                station_id, station_name, total_earnings, charging_revenue,
                parking_revenue, idle_revenue, energy_kwh, sessions_count,
            ) in res.all()
        ]

    async def sum_earned_in_period(
        self,
        owner_id: uuid.UUID,
        period_start: datetime,
        period_end: datetime,
        station_id: uuid.UUID | None = None,
    ) -> int:
        """Owner earnings for bookings created within [period_start, period_end)
        — optionally narrowed to one station. This is what a payout's Period
        Start/End fields should actually mean: how much was earned in that
        window, not the owner's all-time total."""
        stmt = (
            select(func.coalesce(func.sum(TransactionBreakdown.owner_earnings_paise), 0))
            .join(Booking, Booking.id == TransactionBreakdown.booking_id)
            .join(Station, Station.id == Booking.station_id)
            .where(
                Station.owner_id == owner_id,
                Booking.status.in_(_CONFIRMED_STATUSES),
                Booking.created_at >= period_start,
                Booking.created_at < period_end,
            )
        )
        if station_id is not None:
            stmt = stmt.where(Station.id == station_id)
        res = await self.session.execute(stmt)
        return int(res.scalar_one())

    async def sum_for_owner(self, owner_id: uuid.UUID) -> dict:
        """Owner-scoped aggregate — ONLY energy/parking/idle/owner_earnings
        columns, joined to bookings at stations this owner runs. Never
        selects platform_fee_paise/convenience_fee_paise/
        charging_guru_earnings_paise (requirement: owners never see Charging
        Guru's cut)."""
        stmt = (
            select(
                func.coalesce(func.sum(TransactionBreakdown.owner_earnings_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.energy_cost_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.parking_fee_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.idle_fee_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.energy_kwh), 0),
                func.count(TransactionBreakdown.id),
            )
            .join(Booking, Booking.id == TransactionBreakdown.booking_id)
            .join(Station, Station.id == Booking.station_id)
            .where(Station.owner_id == owner_id, Booking.status.in_(_CONFIRMED_STATUSES))
        )
        res = await self.session.execute(stmt)
        (
            total_earnings, charging_revenue, parking_revenue, idle_revenue,
            energy_kwh, sessions_count,
        ) = res.one()
        return {
            "total_earnings_paise": int(total_earnings),
            "charging_revenue_paise": int(charging_revenue),
            "parking_revenue_paise": int(parking_revenue),
            "idle_fee_revenue_paise": int(idle_revenue),
            "energy_sold_kwh": float(energy_kwh),
            "charging_sessions_count": int(sessions_count),
        }
