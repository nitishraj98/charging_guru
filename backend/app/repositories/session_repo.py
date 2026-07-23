"""Data access for user sessions (refresh-token rotation)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import UserSession


class SessionRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        *,
        user_id: uuid.UUID,
        refresh_token_hash: str,
        expires_at: datetime,
        device_id: str | None = None,
        device_name: str | None = None,
        platform: str | None = None,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> UserSession:
        s = UserSession(
            user_id=user_id,
            refresh_token_hash=refresh_token_hash,
            expires_at=expires_at,
            device_id=device_id,
            device_name=device_name,
            platform=platform,
            ip=ip,
            user_agent=user_agent,
            last_seen_at=datetime.now(timezone.utc),
        )
        self.session.add(s)
        await self.session.flush()
        return s

    async def get(self, session_id: uuid.UUID) -> UserSession | None:
        return await self.session.get(UserSession, session_id)

    async def get_by_token_hash(self, token_hash: str) -> UserSession | None:
        res = await self.session.execute(
            select(UserSession).where(UserSession.refresh_token_hash == token_hash)
        )
        return res.scalar_one_or_none()

    async def list_active_for_user(self, user_id: uuid.UUID) -> list[UserSession]:
        res = await self.session.execute(
            select(UserSession).where(
                UserSession.user_id == user_id, UserSession.revoked_at.is_(None)
            )
        )
        return list(res.scalars().all())

    async def rotate(self, sess: UserSession, *, new_hash: str, expires_at: datetime) -> None:
        sess.refresh_token_hash = new_hash
        sess.expires_at = expires_at
        sess.last_seen_at = datetime.now(timezone.utc)
        await self.session.flush()

    async def revoke(self, sess: UserSession) -> None:
        sess.revoked_at = datetime.now(timezone.utc)
        await self.session.flush()

    async def rename(self, sess: UserSession, *, device_name: str) -> None:
        sess.device_name = device_name
        await self.session.flush()
