"""Repository for the single-row pricing_settings config table."""
from __future__ import annotations

import uuid

from sqlalchemy import select

from app.models.pricing_settings import PricingSettings


class PricingSettingsRepo:
    def __init__(self, session):
        self.session = session

    async def get(self) -> PricingSettings:
        """Fetch the single settings row — the migration seeds exactly one."""
        res = await self.session.execute(select(PricingSettings).limit(1))
        settings = res.scalar_one_or_none()
        if settings is None:
            raise RuntimeError("pricing_settings row missing — migration 0009 should have seeded it")
        return settings

    async def update(self, fields: dict, updated_by: uuid.UUID) -> PricingSettings:
        settings = await self.get()
        for key, value in fields.items():
            if value is not None:
                setattr(settings, key, value)
        settings.updated_by = updated_by
        await self.session.flush()
        # updated_at is a server-side onupdate=func.now() default — refresh so
        # the Python object has the real value before the response serializes it
        # (otherwise accessing it triggers an unsafe lazy DB round-trip).
        await self.session.refresh(settings)
        return settings
