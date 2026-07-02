"""Data access for stations + chargers, including bounding-box discovery."""
from __future__ import annotations

import uuid
from datetime import datetime, time, timedelta, timezone
from datetime import date as _date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.geo import bbox
from app.models.booking import Booking, ChargerStatusHistory
from app.models.charger import Charger
from app.models.enums import BookingStatus, ChargerStatus, StationStatus
from app.models.review import Review
from app.models.station import Station


class StationRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, station: Station) -> Station:
        self.session.add(station)
        await self.session.flush()
        return station

    async def get(self, station_id: uuid.UUID) -> Station | None:
        return await self.session.get(Station, station_id)

    async def get_by_owner(self, owner_id: uuid.UUID) -> list[Station]:
        stmt = (
            select(Station)
            .where(Station.owner_id == owner_id, Station.deleted_at.is_(None))
            .order_by(Station.created_at.desc())
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def within_bbox(
        self, lat: float, lng: float, radius_km: float
    ) -> list[Station]:
        """Active stations inside the bounding box (precise distance filtering
        + sorting happens in the service). PostGIS replaces this in prod."""
        min_lat, max_lat, min_lng, max_lng = bbox(lat, lng, radius_km)
        stmt = (
            select(Station)
            .where(
                Station.status == StationStatus.ACTIVE,
                Station.deleted_at.is_(None),
                Station.lat >= min_lat,
                Station.lat <= max_lat,
                Station.lng >= min_lng,
                Station.lng <= max_lng,
            )
            .limit(200)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def sessions_today(self, station_id: uuid.UUID) -> int:
        today_start = datetime.combine(_date.today(), time.min, tzinfo=timezone.utc)
        counted = [
            BookingStatus.CHECKED_IN, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED,
        ]
        res = await self.session.execute(
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.station_id == station_id,
                Booking.created_at >= today_start,
                Booking.status.in_(counted),
            )
        )
        return res.scalar_one()

    async def uptime_pct(self, station_id: uuid.UUID, charger_ids: list[uuid.UUID], window_days: int = 30) -> float:
        """% of the last `window_days` that chargers spent outside
        OFFLINE/MAINTENANCE, averaged across chargers. Stations with no
        history (new, or never gone down) report 100%."""
        if not charger_ids:
            return 100.0

        window_start = datetime.now(timezone.utc) - timedelta(days=window_days)
        window_end = datetime.now(timezone.utc)

        stmt = (
            select(ChargerStatusHistory)
            .where(
                ChargerStatusHistory.charger_id.in_(charger_ids),
                ChargerStatusHistory.created_at >= window_start,
            )
            .order_by(ChargerStatusHistory.charger_id, ChargerStatusHistory.created_at)
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        if not rows:
            return 100.0

        down_statuses = {ChargerStatus.OFFLINE, ChargerStatus.MAINTENANCE}
        downtime_seconds = 0.0
        by_charger: dict[uuid.UUID, list[ChargerStatusHistory]] = {}
        for row in rows:
            by_charger.setdefault(row.charger_id, []).append(row)

        for events in by_charger.values():
            for i, ev in enumerate(events):
                if ev.new_status not in down_statuses:
                    continue
                interval_end = events[i + 1].created_at if i + 1 < len(events) else window_end
                downtime_seconds += (interval_end - ev.created_at).total_seconds()

        total_seconds = len(charger_ids) * (window_end - window_start).total_seconds()
        if total_seconds <= 0:
            return 100.0
        pct = 100.0 * (1 - downtime_seconds / total_seconds)
        return round(max(0.0, min(100.0, pct)), 1)


class ChargerRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, charger_id: uuid.UUID) -> Charger | None:
        return await self.session.get(Charger, charger_id)

    async def add(self, charger: Charger) -> Charger:
        self.session.add(charger)
        await self.session.flush()
        return charger


class ReviewRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, review: Review) -> Review:
        self.session.add(review)
        await self.session.flush()
        return review

    async def get_by_booking(self, booking_id: uuid.UUID) -> Review | None:
        res = await self.session.execute(
            select(Review).where(Review.booking_id == booking_id)
        )
        return res.scalar_one_or_none()

    async def list_for_station(
        self, station_id: uuid.UUID, page: int, per_page: int
    ) -> tuple[list[Review], int]:
        count_stmt = (
            select(func.count()).select_from(Review).where(Review.station_id == station_id)
        )
        total = (await self.session.execute(count_stmt)).scalar_one()

        stmt = (
            select(Review)
            .where(Review.station_id == station_id)
            .order_by(Review.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        return list(rows), total

    async def rating_summary(self, station_id: uuid.UUID) -> tuple[float, int]:
        """Returns (average, count) of ratings for a station."""
        res = await self.session.execute(
            select(func.coalesce(func.avg(Review.rating), 0.0), func.count(Review.id))
            .where(Review.station_id == station_id)
        )
        avg, count = res.one()
        return round(float(avg), 2), int(count)
