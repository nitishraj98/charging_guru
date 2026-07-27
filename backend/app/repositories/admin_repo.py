"""Admin-specific read queries: counts, analytics, paginated listings.

All queries are read-only and hit the primary DB (replica in prod).
Counts use scalar subqueries so they compose cleanly with optional filters.
"""
from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from datetime import date as _date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.charger import Charger
from app.models.enums import (
    BookingStatus,
    ChargerStatus,
    PayoutStatus,
    PaymentStatus,
    RoleName,
    StationStatus,
)
from app.models.membership_payment import MembershipPayment
from app.models.owner_payout import OwnerPayout
from app.models.payment import Payment
from app.models.platform_revenue import PlatformRevenue
from app.models.gst_record import GSTRecord
from app.models.role import Role, UserRole
from app.models.station import Station
from app.models.transaction_breakdown import TransactionBreakdown
from app.models.user import User

# Booking states counted as "confirmed" for revenue/GTV purposes — payment
# was captured, even if the session hasn't happened/completed yet.
CONFIRMED_BOOKING_STATUSES = (
    BookingStatus.CONFIRMED,
    BookingStatus.CHECKED_IN,
    BookingStatus.IN_PROGRESS,
    BookingStatus.COMPLETED,
)


class AdminRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    # ── Counters ──────────────────────────────────────────────────────────────

    async def count_users(self) -> int:
        res = await self.session.execute(
            select(func.count()).select_from(User).where(User.deleted_at.is_(None))
        )
        return res.scalar_one()

    async def count_stations(self, status: StationStatus | None = None) -> int:
        stmt = select(func.count()).select_from(Station).where(Station.deleted_at.is_(None))
        if status is not None:
            stmt = stmt.where(Station.status == status)
        return (await self.session.execute(stmt)).scalar_one()

    async def count_chargers(self) -> int:
        res = await self.session.execute(
            select(func.count()).select_from(Charger).where(Charger.deleted_at.is_(None))
        )
        return res.scalar_one()

    async def count_bookings_today(self, status: BookingStatus | None = None) -> int:
        today_start = datetime.combine(_date.today(), time.min, tzinfo=timezone.utc)
        stmt = (
            select(func.count())
            .select_from(Booking)
            .where(Booking.created_at >= today_start)
        )
        if status is not None:
            stmt = stmt.where(Booking.status == status)
        return (await self.session.execute(stmt)).scalar_one()

    async def sum_revenue_today(self) -> int:
        today_start = datetime.combine(_date.today(), time.min, tzinfo=timezone.utc)
        res = await self.session.execute(
            select(func.coalesce(func.sum(Booking.amount), 0))
            .select_from(Booking)
            .where(
                Booking.created_at >= today_start,
                Booking.status.in_(CONFIRMED_BOOKING_STATUSES),
            )
        )
        return int(res.scalar_one())

    # sum_gtv_today/sum_gtv_total are the conceptual rename of
    # sum_revenue_today/sum_revenue_total for the marketplace-aware dashboard —
    # same query, kept as separate methods so callers can migrate gradually.
    async def sum_gtv_today(self) -> int:
        return await self.sum_revenue_today()

    async def sum_gtv_total(self) -> int:
        return await self.sum_revenue_total()

    # ── Paginated listings ─────────────────────────────────────────────────────

    async def list_users(
        self, page: int, per_page: int
    ) -> tuple[list[User], int]:
        total = (
            await self.session.execute(
                select(func.count()).select_from(User).where(User.deleted_at.is_(None))
            )
        ).scalar_one()
        users = (
            await self.session.execute(
                select(User)
                .where(User.deleted_at.is_(None))
                .order_by(User.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        ).scalars().all()
        return list(users), total

    async def list_stations(
        self,
        status: StationStatus | None,
        page: int,
        per_page: int,
    ) -> tuple[list[Station], int]:
        base = select(Station).where(Station.deleted_at.is_(None))
        count_base = select(func.count()).select_from(Station).where(Station.deleted_at.is_(None))
        if status is not None:
            base = base.where(Station.status == status)
            count_base = count_base.where(Station.status == status)

        total = (await self.session.execute(count_base)).scalar_one()
        stations = (
            await self.session.execute(
                base.order_by(Station.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        ).scalars().all()
        return list(stations), total

    # ── Trend queries (last N days) ────────────────────────────────────────────

    async def bookings_last_n_days(self, n: int = 7) -> list[dict]:
        """Return daily booking count and revenue for the past n days."""
        results = []
        today = _date.today()
        for i in range(n - 1, -1, -1):
            day = today - timedelta(days=i)
            day_start = datetime.combine(day, time.min, tzinfo=timezone.utc)
            day_end   = datetime.combine(day, time.max, tzinfo=timezone.utc)

            count_res = await self.session.execute(
                select(func.count()).select_from(Booking)
                .where(Booking.created_at >= day_start, Booking.created_at <= day_end)
            )
            rev_res = await self.session.execute(
                select(func.coalesce(func.sum(Booking.amount), 0))
                .select_from(Booking)
                .where(
                    Booking.created_at >= day_start,
                    Booking.created_at <= day_end,
                    Booking.status.in_(CONFIRMED_BOOKING_STATUSES),
                )
            )
            results.append({
                "date": day.strftime("%d %b"),
                "bookings": count_res.scalar_one(),
                "revenue_paise": int(rev_res.scalar_one()),
            })
        return results

    async def charger_status_breakdown(self) -> dict[str, int]:
        """Count chargers by current status."""
        rows = await self.session.execute(
            select(Charger.status, func.count().label("cnt"))
            .where(Charger.deleted_at.is_(None))
            .group_by(Charger.status)
        )
        return {str(row.status.value): row.cnt for row in rows}

    async def top_stations_by_revenue(self, limit: int = 5) -> list[dict]:
        """Top stations by total confirmed revenue."""
        rows = await self.session.execute(
            select(
                Station.id,
                Station.name,
                Station.city,
                func.coalesce(func.sum(Booking.amount), 0).label("revenue"),
                func.count(Booking.id).label("bookings"),
            )
            .join(Booking, Booking.station_id == Station.id, isouter=True)
            .where(
                Station.deleted_at.is_(None),
                Station.status == StationStatus.ACTIVE,
            )
            .filter(Booking.status.in_(CONFIRMED_BOOKING_STATUSES) | Booking.id.is_(None))
            .group_by(Station.id, Station.name, Station.city)
            .order_by(func.sum(Booking.amount).desc().nullslast())
            .limit(limit)
        )
        return [
            {"id": str(r.id), "name": r.name, "city": r.city or "", "revenue_paise": int(r.revenue), "bookings": r.bookings}
            for r in rows
        ]

    async def station_revenue_breakdown(
        self, page: int, per_page: int, search: str | None = None
    ) -> tuple[list[dict], int]:
        """Full marketplace breakdown per station — GTV, owner earnings,
        Charging Guru revenue, GST — for every station platform-wide (not
        scoped to one owner). Powers the admin Revenue page's station-level
        view; complements the owner-scoped equivalent used for payouts."""
        base = (
            select(
                Station.id,
                Station.name,
                Station.city,
                User.full_name,
                User.phone,
                func.coalesce(func.sum(TransactionBreakdown.total_amount_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.owner_earnings_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.charging_guru_earnings_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.energy_cost_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.parking_fee_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.idle_fee_paise), 0),
                func.coalesce(func.sum(GSTRecord.gst_amount_paise), 0),
                func.count(TransactionBreakdown.id),
            )
            .select_from(Station)
            .join(User, User.id == Station.owner_id)
            .outerjoin(TransactionBreakdown, TransactionBreakdown.booking_id.in_(
                select(Booking.id).where(
                    Booking.station_id == Station.id,
                    Booking.status.in_(CONFIRMED_BOOKING_STATUSES),
                )
            ))
            .outerjoin(GSTRecord, GSTRecord.payment_id == TransactionBreakdown.payment_id)
            .where(Station.deleted_at.is_(None))
        )
        if search:
            like = f"%{search}%"
            base = base.where(
                Station.name.ilike(like) | User.full_name.ilike(like) | User.phone.ilike(like)
            )
        base = base.group_by(Station.id, Station.name, Station.city, User.full_name, User.phone)

        total = (
            await self.session.execute(select(func.count()).select_from(base.subquery()))
        ).scalar_one()

        rows = await self.session.execute(
            base.order_by(func.sum(TransactionBreakdown.total_amount_paise).desc().nullslast())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        items = [
            {
                "station_id": str(r[0]),
                "station_name": r[1],
                "city": r[2] or "",
                "owner_name": r[3] or r[4],
                "gtv_paise": int(r[5]),
                "owner_earnings_paise": int(r[6]),
                "charging_guru_earnings_paise": int(r[7]),
                "charging_revenue_paise": int(r[8]),
                "parking_revenue_paise": int(r[9]),
                "idle_revenue_paise": int(r[10]),
                "gst_collected_paise": int(r[11]),
                "transaction_count": int(r[12]),
            }
            for r in rows.all()
        ]
        return items, total

    async def list_bookings(
        self,
        status: BookingStatus | None,
        page: int,
        per_page: int,
    ) -> tuple[list, int]:
        base = select(Booking)
        count_base = select(func.count()).select_from(Booking)
        if status is not None:
            base = base.where(Booking.status == status)
            count_base = count_base.where(Booking.status == status)

        total = (await self.session.execute(count_base)).scalar_one()
        rows = (
            await self.session.execute(
                base.order_by(Booking.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        ).scalars().all()
        return list(rows), total

    async def sum_revenue_total(self) -> int:
        """All-time total revenue from confirmed bookings."""
        res = await self.session.execute(
            select(func.coalesce(func.sum(Booking.amount), 0))
            .select_from(Booking)
            .where(Booking.status.in_(CONFIRMED_BOOKING_STATUSES))
        )
        return int(res.scalar_one())

    async def list_chargers(
        self,
        status: ChargerStatus | None,
        page: int,
        per_page: int,
    ) -> tuple[list, int]:
        base = select(Charger).where(Charger.deleted_at.is_(None))
        count_base = select(func.count()).select_from(Charger).where(Charger.deleted_at.is_(None))
        if status is not None:
            base = base.where(Charger.status == status)
            count_base = count_base.where(Charger.status == status)

        total = (await self.session.execute(count_base)).scalar_one()
        rows = (
            await self.session.execute(
                base.order_by(Charger.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        ).scalars().all()
        return list(rows), total

    async def list_payments(
        self,
        status: PaymentStatus | None,
        page: int,
        per_page: int,
    ) -> tuple[list, int]:
        base = select(Payment)
        count_base = select(func.count()).select_from(Payment)
        if status is not None:
            base = base.where(Payment.status == status)
            count_base = count_base.where(Payment.status == status)

        total = (await self.session.execute(count_base)).scalar_one()
        rows = (
            await self.session.execute(
                base.order_by(Payment.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        ).scalars().all()
        return list(rows), total

    async def list_membership_payments(
        self,
        status: PaymentStatus | None,
        page: int,
        per_page: int,
    ) -> tuple[list, int]:
        base = select(MembershipPayment)
        count_base = select(func.count()).select_from(MembershipPayment)
        if status is not None:
            base = base.where(MembershipPayment.status == status)
            count_base = count_base.where(MembershipPayment.status == status)

        total = (await self.session.execute(count_base)).scalar_one()
        rows = (
            await self.session.execute(
                base.order_by(MembershipPayment.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        ).scalars().all()
        return list(rows), total

    async def sum_membership_revenue_total(self) -> int:
        """All-time total revenue from captured membership payments."""
        res = await self.session.execute(
            select(func.coalesce(func.sum(MembershipPayment.amount), 0))
            .select_from(MembershipPayment)
            .where(MembershipPayment.status == PaymentStatus.CAPTURED)
        )
        return int(res.scalar_one())

    async def list_user_bookings(
        self,
        user_id: str,
        page: int,
        per_page: int,
    ) -> tuple[list, int]:
        import uuid as _uuid
        uid = _uuid.UUID(user_id)
        base = select(Booking).where(Booking.user_id == uid)
        count_base = select(func.count()).select_from(Booking).where(Booking.user_id == uid)

        total = (await self.session.execute(count_base)).scalar_one()
        rows = (
            await self.session.execute(
                base.order_by(Booking.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        ).scalars().all()
        return list(rows), total

    async def list_admins(self) -> list[User]:
        res = await self.session.execute(
            select(User)
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(Role.name == RoleName.ADMIN.value, User.deleted_at.is_(None))
            .order_by(User.created_at.desc())
        )
        return list(res.scalars().unique().all())

    async def get_user(self, user_id: str):
        import uuid as _uuid
        from app.models.user import User as _User
        return await self.session.get(_User, _uuid.UUID(user_id))

    async def get_booking(self, booking_id: str):
        import uuid as _uuid
        from app.models.booking import Booking as _Booking
        return await self.session.get(_Booking, _uuid.UUID(booking_id))

    # ── Marketplace financial aggregates ─────────────────────────────────

    async def marketplace_volume_breakdown(self) -> dict:
        """Charging/parking/idle revenue + GTV, summed from transaction_breakdown
        (captured payments only — transaction_breakdown rows only exist for
        captured payments, see PaymentService._persist_breakdown)."""
        res = await self.session.execute(
            select(
                func.coalesce(func.sum(TransactionBreakdown.energy_cost_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.parking_fee_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.idle_fee_paise), 0),
                func.coalesce(func.sum(TransactionBreakdown.total_amount_paise), 0),
            )
        )
        charging, parking, idle, gtv = res.one()
        return {
            "charging_revenue_paise": int(charging),
            "parking_revenue_paise": int(parking),
            "idle_revenue_paise": int(idle),
            "gtv_paise": int(gtv),
        }

    async def sum_platform_revenue_breakdown(self) -> dict:
        res = await self.session.execute(
            select(
                func.coalesce(func.sum(PlatformRevenue.platform_fee_paise), 0),
                func.coalesce(func.sum(PlatformRevenue.convenience_fee_paise), 0),
                func.coalesce(func.sum(PlatformRevenue.subscription_fee_paise), 0),
                func.coalesce(func.sum(PlatformRevenue.ad_revenue_paise), 0),
                func.coalesce(func.sum(PlatformRevenue.total_paise), 0),
            )
        )
        platform, convenience, subscription, ad, total = res.one()
        return {
            "platform_fee_paise": int(platform),
            "convenience_fee_paise": int(convenience),
            "subscription_fee_paise": int(subscription),
            "ad_revenue_paise": int(ad),
            "total_paise": int(total),
        }

    async def sum_platform_revenue_total(self) -> int:
        res = await self.session.execute(
            select(func.coalesce(func.sum(PlatformRevenue.total_paise), 0))
        )
        return int(res.scalar_one())

    async def sum_owner_payouts(self) -> dict:
        res = await self.session.execute(
            select(OwnerPayout.status, func.coalesce(func.sum(OwnerPayout.amount_paise), 0))
            .group_by(OwnerPayout.status)
        )
        totals = {status.value: int(total) for status, total in res.all()}
        return {
            "total_paid_paise": totals.get(PayoutStatus.PAID.value, 0),
            "pending_paise": totals.get(PayoutStatus.PENDING.value, 0),
            "scheduled_paise": totals.get(PayoutStatus.SCHEDULED.value, 0),
        }

    async def sum_gst_collected(self) -> int:
        res = await self.session.execute(
            select(func.coalesce(func.sum(GSTRecord.gst_amount_paise), 0))
        )
        return int(res.scalar_one())

    async def count_completed_sessions(self) -> int:
        res = await self.session.execute(
            select(func.count()).select_from(Booking).where(Booking.status == BookingStatus.COMPLETED)
        )
        return res.scalar_one()
