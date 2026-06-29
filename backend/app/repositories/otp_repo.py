"""Data access for OTP requests."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.otp import OtpRequest


class OtpRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        *,
        phone: str,
        code_hash: str,
        expires_at: datetime,
        max_attempts: int,
        ip: str | None = None,
    ) -> OtpRequest:
        otp = OtpRequest(
            phone=phone,
            code_hash=code_hash,
            expires_at=expires_at,
            max_attempts=max_attempts,
            ip=ip,
        )
        self.session.add(otp)
        await self.session.flush()
        return otp

    async def get(self, request_id: uuid.UUID) -> OtpRequest | None:
        return await self.session.get(OtpRequest, request_id)

    async def mark_consumed(self, otp: OtpRequest) -> None:
        otp.consumed_at = datetime.now(timezone.utc)
        await self.session.flush()

    async def bump_attempt(self, otp: OtpRequest) -> None:
        otp.attempts += 1
        await self.session.flush()
