"""User aggregate root."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import MembershipTier, UserStatus

if TYPE_CHECKING:
    from app.models.role import Role
    from app.models.session import UserSession
    from app.models.vehicle import Vehicle


class User(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "users"

    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    full_name: Mapped[str | None] = mapped_column(String(120))
    profile_image: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="user_status"), default=UserStatus.ACTIVE, nullable=False
    )
    reward_points: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    referral_code: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    referred_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    membership_tier: Mapped[MembershipTier] = mapped_column(
        Enum(MembershipTier, name="membership_tier"),
        default=MembershipTier.FREE,
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    roles: Mapped[list["Role"]] = relationship(
        secondary="user_roles", back_populates="users", lazy="selectin"
    )
    sessions: Mapped[list["UserSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    vehicles: Mapped[list["Vehicle"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def role_names(self) -> list[str]:
        return [r.name for r in self.roles]
