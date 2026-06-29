"""Data access for users + roles."""
from __future__ import annotations

import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import RoleName
from app.models.role import Role
from app.models.user import User


class UserRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, user_id: uuid.UUID) -> User | None:
        return await self.session.get(User, user_id)

    async def get_by_phone(self, phone: str) -> User | None:
        res = await self.session.execute(select(User).where(User.phone == phone))
        return res.scalar_one_or_none()

    async def get_or_create_by_phone(self, phone: str) -> tuple[User, bool]:
        user = await self.get_by_phone(phone)
        if user:
            return user, False
        user = User(phone=phone, referral_code=self._referral_code())
        role = await self._get_role(RoleName.USER)
        user.roles.append(role)
        self.session.add(user)
        await self.session.flush()
        return user, True

    async def _get_role(self, name: RoleName) -> Role:
        res = await self.session.execute(select(Role).where(Role.name == name.value))
        role = res.scalar_one_or_none()
        if role is None:
            # Self-heal in dev if seeds were skipped.
            role = Role(name=name.value)
            self.session.add(role)
            await self.session.flush()
        return role

    @staticmethod
    def _referral_code() -> str:
        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return "".join(secrets.choice(alphabet) for _ in range(8))
