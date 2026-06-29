"""Owner onboarding: apply, admin review, role assignment."""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.models.enums import RoleName
from app.models.owner_application import ApplicationStatus, OwnerApplication
from app.models.role import Role
from app.models.user import User
from app.repositories.owner_application_repo import OwnerApplicationRepo
from app.schemas.owner_application import (
    OwnerApplicationOut,
    PagedApplications,
)


class OwnerApplicationService:
    def __init__(self, repo: OwnerApplicationRepo, session: AsyncSession):
        self.repo = repo
        self.session = session

    async def apply(self, user: User, **kwargs) -> OwnerApplication:
        existing = await self.repo.get_by_user(user.id)
        if existing and existing.status == ApplicationStatus.PENDING:
            raise ConflictError(
                "You already have a pending application.", code="APPLICATION_PENDING"
            )
        if "ROLE_STATION_OWNER" in user.role_names:
            raise ConflictError(
                "You are already a station owner.", code="ALREADY_OWNER"
            )
        return await self.repo.create(user_id=user.id, **kwargs)

    async def my_application(self, user_id: uuid.UUID) -> OwnerApplication | None:
        return await self.repo.get_by_user(user_id)

    async def list_applications(
        self, status_str: str | None, page: int, per_page: int
    ) -> PagedApplications:
        status: ApplicationStatus | None = None
        if status_str:
            try:
                status = ApplicationStatus(status_str.upper())
            except ValueError:
                raise ConflictError(f"Unknown status: {status_str}", code="INVALID_STATUS")

        rows, total = await self.repo.list_all(status, page, per_page)
        pages = max(1, math.ceil(total / per_page)) if total else 1
        return PagedApplications(
            items=[OwnerApplicationOut.model_validate(r) for r in rows],
            total=total, page=page, per_page=per_page, pages=pages,
        )

    async def approve(
        self, app_id: uuid.UUID, reviewer: User
    ) -> OwnerApplication:
        app = await self.repo.get(app_id)
        if app is None:
            raise NotFoundError("Application not found.", code="NOT_FOUND")
        if app.status != ApplicationStatus.PENDING:
            raise ConflictError(
                "Only PENDING applications can be approved.", code="INVALID_STATE"
            )

        app.status = ApplicationStatus.APPROVED
        app.reviewed_by = reviewer.id
        app.reviewed_at = datetime.now(timezone.utc)

        # Assign ROLE_STATION_OWNER to the applicant
        user = await self.session.get(User, app.user_id)
        if user is not None:
            owner_role = await self._get_role(RoleName.STATION_OWNER)
            if owner_role not in user.roles:
                user.roles.append(owner_role)

        await self.session.flush()
        return app

    async def reject(
        self, app_id: uuid.UUID, reviewer: User, note: str | None
    ) -> OwnerApplication:
        app = await self.repo.get(app_id)
        if app is None:
            raise NotFoundError("Application not found.", code="NOT_FOUND")
        if app.status != ApplicationStatus.PENDING:
            raise ConflictError(
                "Only PENDING applications can be rejected.", code="INVALID_STATE"
            )

        app.status = ApplicationStatus.REJECTED
        app.reviewed_by = reviewer.id
        app.reviewed_at = datetime.now(timezone.utc)
        app.review_note = note
        await self.session.flush()
        return app

    async def _get_role(self, name: RoleName) -> Role:
        res = await self.session.execute(select(Role).where(Role.name == name.value))
        role = res.scalar_one_or_none()
        if role is None:
            role = Role(name=name.value)
            self.session.add(role)
            await self.session.flush()
        return role
