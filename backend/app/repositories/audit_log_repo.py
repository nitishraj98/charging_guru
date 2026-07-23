"""Data access for the admin audit log (append-only)."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditLogRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        *,
        actor_id: uuid.UUID | None,
        action: str,
        target_type: str | None = None,
        target_id: uuid.UUID | None = None,
        detail: dict[str, Any] | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            actor_id=actor_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail,
        )
        self.session.add(entry)
        await self.session.flush()
        return entry

    async def list(self, page: int, per_page: int) -> tuple[list[AuditLog], int]:
        total = (
            await self.session.execute(select(func.count()).select_from(AuditLog))
        ).scalar_one()
        rows = (
            await self.session.execute(
                select(AuditLog)
                .order_by(AuditLog.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        ).scalars().all()
        return list(rows), total
