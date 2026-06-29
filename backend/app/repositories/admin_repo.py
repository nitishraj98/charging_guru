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
from app.models.enums import BookingStatus, ChargerStatus, PaymentStatus, StationStatus
from app.models.payment import Payment
from app.models.station import Station
from app.models.user import User


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
        confirmed_statuses = [
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.IN_PROGRESS,
            BookingStatus.COMPLETED,
        ]
        res = await self.session.execute(
            select(func.coalesce(func.sum(Booking.amount), 0))
            .select_from(Booking)
            .where(
                Booking.created_at >= today_start,
                Booking.status.in_(confirmed_statuses),
            )
        )
        return int(res.scalar_one())

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

            confirmed = [
                BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN,
                BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED,
            ]
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
                    Booking.status.in_(confirmed),
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
        confirmed = [
            BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN,
            BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED,
        ]
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
            .filter(Booking.status.in_(confirmed) | Booking.id.is_(None))
            .group_by(Station.id, Station.name, Station.city)
            .order_by(func.sum(Booking.amount).desc().nullslast())
            .limit(limit)
        )
        return [
            {"id": str(r.id), "name": r.name, "city": r.city or "", "revenue_paise": int(r.revenue), "bookings": r.bookings}
            for r in rows
        ]

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
        confirmed = [
            BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN,
            BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED,
        ]
        res = await self.session.execute(
            select(func.coalesce(func.sum(Booking.amount), 0))
            .select_from(Booking)
            .where(Booking.status.in_(confirmed))
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

    async def get_user(self, user_id: str):
        import uuid as _uuid
        from app.models.user import User as _User
        return await self.session.get(_User, _uuid.UUID(user_id))

    async def get_booking(self, booking_id: str):
        import uuid as _uuid
        from app.models.booking import Booking as _Booking
        return await self.session.get(_Booking, _uuid.UUID(booking_id))
