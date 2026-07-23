"""Admin use-cases: platform analytics, user/station management."""
from __future__ import annotations

import math
import uuid

from app.core.errors import ConflictError, NotFoundError
from app.models.enums import BookingStatus, ChargerStatus, PaymentStatus, RoleName, StationStatus, UserStatus
from app.repositories.admin_repo import AdminRepo
from app.repositories.station_repo import StationRepo
from app.repositories.user_repo import UserRepo
from app.models.enums import BookingStatus as _BookingStatus
from app.schemas.admin import (
    AdminBookingOut,
    AdminOverviewOut,
    ChargerAdminOut,
    ChargerBreakdown,
    DayTrend,
    MembershipPaymentAdminOut,
    PagedResult,
    PaymentAdminOut,
    StationAdminOut,
    TopStation,
    UserAdminOut,
)


class AdminService:
    def __init__(self, repo: AdminRepo, stations: StationRepo, users: UserRepo):
        self.repo = repo
        self.stations = stations
        self.users = users

    async def get_overview(self) -> AdminOverviewOut:
        import asyncio
        (
            total_users, total_stations, active_stations, pending_stations,
            total_chargers, bookings_today, confirmed_today, revenue_today,
            revenue_total, trend_7d, charger_bkdn, top_stations,
        ) = await asyncio.gather(
            self.repo.count_users(),
            self.repo.count_stations(),
            self.repo.count_stations(StationStatus.ACTIVE),
            self.repo.count_stations(StationStatus.PENDING_APPROVAL),
            self.repo.count_chargers(),
            self.repo.count_bookings_today(),
            self.repo.count_bookings_today(BookingStatus.CONFIRMED),
            self.repo.sum_revenue_today(),
            self.repo.sum_revenue_total(),
            self.repo.bookings_last_n_days(7),
            self.repo.charger_status_breakdown(),
            self.repo.top_stations_by_revenue(5),
        )
        return AdminOverviewOut(
            total_users=total_users,
            total_stations=total_stations,
            active_stations=active_stations,
            pending_stations=pending_stations,
            total_chargers=total_chargers,
            bookings_today=bookings_today,
            confirmed_bookings_today=confirmed_today,
            revenue_today_paise=revenue_today,
            revenue_total_paise=revenue_total,
            trend_7d=[DayTrend(**d) for d in trend_7d],
            charger_breakdown=ChargerBreakdown(**{k: v for k, v in charger_bkdn.items() if k in ChargerBreakdown.model_fields}),
            top_stations=[TopStation(**s) for s in top_stations],
        )

    async def list_users(self, page: int, per_page: int) -> PagedResult[UserAdminOut]:
        users, total = await self.repo.list_users(page, per_page)
        pages = max(1, math.ceil(total / per_page)) if total else 1
        return PagedResult(
            items=[UserAdminOut.model_validate(u) for u in users],
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
        )

    async def list_stations(
        self,
        status: str | None,
        page: int,
        per_page: int,
    ) -> PagedResult[StationAdminOut]:
        station_status: StationStatus | None = None
        if status is not None:
            try:
                station_status = StationStatus(status)
            except ValueError:
                raise ConflictError(f"Unknown station status: {status}", code="INVALID_STATUS")

        stations, total = await self.repo.list_stations(station_status, page, per_page)
        pages = max(1, math.ceil(total / per_page)) if total else 1
        return PagedResult(
            items=[StationAdminOut.model_validate(s) for s in stations],
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
        )

    async def list_bookings(
        self,
        status: str | None,
        page: int,
        per_page: int,
    ) -> PagedResult[AdminBookingOut]:
        booking_status: _BookingStatus | None = None
        if status is not None:
            try:
                booking_status = _BookingStatus(status)
            except ValueError:
                raise ConflictError(f"Unknown booking status: {status}", code="INVALID_STATUS")

        bookings, total = await self.repo.list_bookings(booking_status, page, per_page)
        pages = max(1, math.ceil(total / per_page)) if total else 1
        return PagedResult(
            items=[AdminBookingOut.model_validate(b) for b in bookings],
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
        )

    async def approve_station(self, station_id: uuid.UUID) -> StationAdminOut:
        station = await self.stations.get(station_id)
        if station is None or station.deleted_at is not None:
            raise NotFoundError("Station not found.", code="STATION_NOT_FOUND")
        if station.status == StationStatus.ACTIVE:
            return StationAdminOut.model_validate(station)
        if station.status == StationStatus.REJECTED:
            raise ConflictError(
                "Rejected stations cannot be approved.", code="STATION_REJECTED"
            )
        station.status = StationStatus.ACTIVE

        # Grant ROLE_STATION_OWNER to the station's owner if they don't have it yet.
        owner = await self.users.get(station.owner_id)
        if owner is not None:
            existing = {r.name for r in owner.roles}
            if RoleName.STATION_OWNER.value not in existing:
                role = await self.users._get_role(RoleName.STATION_OWNER)
                owner.roles.append(role)

        return StationAdminOut.model_validate(station)

    async def reject_station(
        self, station_id: uuid.UUID, reason: str | None = None
    ) -> StationAdminOut:
        station = await self.stations.get(station_id)
        if station is None or station.deleted_at is not None:
            raise NotFoundError("Station not found.", code="STATION_NOT_FOUND")
        if station.status in (StationStatus.COMPLETED if hasattr(StationStatus, "COMPLETED") else ()):
            raise ConflictError("Station cannot be rejected.", code="INVALID_STATION_STATE")
        station.status = StationStatus.REJECTED
        return StationAdminOut.model_validate(station)

    async def update_station_status(
        self, station_id: uuid.UUID, new_status: StationStatus
    ) -> StationAdminOut:
        station = await self.stations.get(station_id)
        if station is None or station.deleted_at is not None:
            raise NotFoundError("Station not found.", code="STATION_NOT_FOUND")
        station.status = new_status
        return StationAdminOut.model_validate(station)

    async def update_user_status(
        self, user_id: uuid.UUID, new_status: UserStatus
    ) -> UserAdminOut:
        user = await self.repo.get_user(str(user_id))
        if user is None or user.deleted_at is not None:
            raise NotFoundError("User not found.", code="USER_NOT_FOUND")
        user.status = new_status
        return UserAdminOut.model_validate(user)

    async def list_chargers(
        self,
        status: str | None,
        page: int,
        per_page: int,
    ) -> PagedResult[ChargerAdminOut]:
        charger_status: ChargerStatus | None = None
        if status is not None:
            try:
                charger_status = ChargerStatus(status)
            except ValueError:
                raise ConflictError(f"Unknown charger status: {status}", code="INVALID_STATUS")

        chargers, total = await self.repo.list_chargers(charger_status, page, per_page)
        pages = max(1, math.ceil(total / per_page)) if total else 1
        return PagedResult(
            items=[ChargerAdminOut.model_validate(c) for c in chargers],
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
        )

    async def list_payments(
        self,
        status: str | None,
        page: int,
        per_page: int,
    ) -> PagedResult[PaymentAdminOut]:
        payment_status: PaymentStatus | None = None
        if status is not None:
            try:
                payment_status = PaymentStatus(status)
            except ValueError:
                raise ConflictError(f"Unknown payment status: {status}", code="INVALID_STATUS")

        payments, total = await self.repo.list_payments(payment_status, page, per_page)
        pages = max(1, math.ceil(total / per_page)) if total else 1
        return PagedResult(
            items=[PaymentAdminOut.model_validate(p) for p in payments],
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
        )

    async def list_membership_payments(
        self,
        status: str | None,
        page: int,
        per_page: int,
    ) -> PagedResult[MembershipPaymentAdminOut]:
        payment_status: PaymentStatus | None = None
        if status is not None:
            try:
                payment_status = PaymentStatus(status)
            except ValueError:
                raise ConflictError(f"Unknown payment status: {status}", code="INVALID_STATUS")

        payments, total = await self.repo.list_membership_payments(payment_status, page, per_page)
        pages = max(1, math.ceil(total / per_page)) if total else 1
        return PagedResult(
            items=[MembershipPaymentAdminOut.model_validate(p) for p in payments],
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
        )

    async def get_membership_revenue_total(self) -> int:
        return await self.repo.sum_membership_revenue_total()

    async def list_user_bookings(
        self,
        user_id: uuid.UUID,
        page: int,
        per_page: int,
    ) -> PagedResult[AdminBookingOut]:
        bookings, total = await self.repo.list_user_bookings(str(user_id), page, per_page)
        pages = max(1, math.ceil(total / per_page)) if total else 1
        return PagedResult(
            items=[AdminBookingOut.model_validate(b) for b in bookings],
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
        )

    async def list_admins(self) -> list[UserAdminOut]:
        users = await self.repo.list_admins()
        return [UserAdminOut.model_validate(u) for u in users]

    async def grant_admin(self, phone: str) -> UserAdminOut:
        user = await self.users.get_by_phone(phone)
        if user is None:
            raise NotFoundError("No user found with that phone number.", code="USER_NOT_FOUND")
        if RoleName.ADMIN.value not in {r.name for r in user.roles}:
            role = await self.users._get_role(RoleName.ADMIN)
            user.roles.append(role)
        return UserAdminOut.model_validate(user)

    async def revoke_admin(self, user_id: uuid.UUID, acting_admin_id: uuid.UUID) -> UserAdminOut:
        if user_id == acting_admin_id:
            raise ConflictError(
                "You cannot revoke your own admin access.", code="CANNOT_REVOKE_SELF"
            )
        user = await self.repo.get_user(str(user_id))
        if user is None:
            raise NotFoundError("User not found.", code="USER_NOT_FOUND")
        user.roles = [r for r in user.roles if r.name != RoleName.ADMIN.value]
        return UserAdminOut.model_validate(user)

    async def cancel_booking(self, booking_id: uuid.UUID) -> AdminBookingOut:
        booking = await self.repo.get_booking(str(booking_id))
        if booking is None:
            raise NotFoundError("Booking not found.", code="BOOKING_NOT_FOUND")
        cancellable = {
            _BookingStatus.PENDING_PAYMENT,
            _BookingStatus.CONFIRMED,
            _BookingStatus.CHECKED_IN,
        }
        if booking.status not in cancellable:
            raise ConflictError(
                f"Cannot cancel booking in status {booking.status.value}.",
                code="BOOKING_NOT_CANCELLABLE",
            )
        booking.status = _BookingStatus.CANCELLED
        return AdminBookingOut.model_validate(booking)
