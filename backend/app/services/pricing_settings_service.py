"""Admin-editable platform pricing/fee configuration use-cases."""
from __future__ import annotations

import uuid

from app.domain.pricing import PlatformPricingConfig
from app.models.pricing_settings import PricingSettings
from app.repositories.pricing_settings_repo import PricingSettingsRepo


class PricingSettingsService:
    def __init__(self, repo: PricingSettingsRepo):
        self.repo = repo

    async def get(self) -> PricingSettings:
        return await self.repo.get()

    async def update(self, fields: dict, admin_id: uuid.UUID) -> PricingSettings:
        return await self.repo.update(fields, admin_id)

    async def to_platform_config(self) -> PlatformPricingConfig:
        s = await self.repo.get()
        return PlatformPricingConfig(
            platform_fee_mode=s.platform_fee_mode,
            platform_fee_fixed_paise=s.platform_fee_fixed_paise,
            platform_fee_percent=float(s.platform_fee_percent),
            platform_fee_min_paise=s.platform_fee_min_paise,
            platform_fee_max_paise=s.platform_fee_max_paise,
            platform_fee_enabled=s.platform_fee_enabled,
            convenience_fee_mode=s.convenience_fee_mode,
            convenience_fee_fixed_paise=s.convenience_fee_fixed_paise,
            convenience_fee_percent=float(s.convenience_fee_percent),
            convenience_fee_min_paise=s.convenience_fee_min_paise,
            convenience_fee_max_paise=s.convenience_fee_max_paise,
            convenience_fee_enabled=s.convenience_fee_enabled,
            gst_percentage=float(s.gst_percentage),
            gst_enabled=s.gst_enabled,
            parking_fee_enabled=s.parking_fee_enabled,
            idle_fee_enabled=s.idle_fee_enabled,
        )
