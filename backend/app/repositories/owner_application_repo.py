"""Data access for owner applications."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.owner_application import ApplicationStatus, OwnerApplication


class OwnerApplicationRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> OwnerApplication:
        app = OwnerApplication(**kwargs)
        self.session.add(app)
        await self.session.flush()
        return app

    async def get(self, app_id: uuid.UUID) -> OwnerApplication | None:
        return await self.session.get(OwnerApplication, app_id)

    async def get_by_user(self, user_id: uuid.UUID) -> OwnerApplication | None:
        res = await self.session.execute(
            select(OwnerApplication)
            .where(OwnerApplication.user_id == user_id)
            .order_by(OwnerApplication.created_at.desc())
            .limit(1)
        )
        return res.scalar_one_or_none()

    async def list_all(
        self, status: ApplicationStatus | None, page: int, per_page: int
    ) -> tuple[list[OwnerApplication], int]:
        from sqlalchemy import func

        base = select(OwnerApplication)
        count_q = select(func.count()).select_from(OwnerApplication)
        if status is not None:
            base = base.where(OwnerApplication.status == status)
            count_q = count_q.where(OwnerApplication.status == status)

        total = (await self.session.execute(count_q)).scalar_one()
        rows = (
            await self.session.execute(
                base.order_by(OwnerApplication.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        ).scalars().all()
        return list(rows), total
