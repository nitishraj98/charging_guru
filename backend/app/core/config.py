"""Application settings — env-driven via pydantic-settings.

All variables are prefixed ``CG_``. In production, values come from the
environment (injected by the ECS task role from Secrets Manager); locally
they come from ``.env`` / ``.env.example``.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="CG_",
        env_file=(".env", ".env.example"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    env: str = "local"
    debug: bool = True
    project_name: str = "Charging Guru API"
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+asyncpg://charging:charging@localhost:5432/charging_guru"
    database_replica_url: str | None = None
    db_echo: bool = False

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT / auth
    jwt_algorithm: str = "HS256"
    jwt_secret: str = "dev-only-change-me-please-32chars-min"
    jwt_private_key: str | None = None  # PEM for RS256 (prod)
    jwt_public_key: str | None = None
    access_token_ttl_seconds: int = 900
    refresh_token_ttl_seconds: int = 2_592_000
    hash_pepper: str = "dev-pepper-change-me"

    # OTP
    otp_ttl_seconds: int = 300
    otp_max_attempts: int = 5
    otp_length: int = 6
    otp_debug: bool = True

    # Rate limits
    rl_otp_requests_per_hour: int = 5
    rl_otp_verify_per_10min: int = 10

    # Razorpay
    razorpay_key_id: str = "rzp_test_placeholder"
    razorpay_key_secret: str = "placeholder_secret_min_32_chars_____"
    razorpay_webhook_secret: str = "placeholder_webhook_secret__________"

    # CORS (CSV string in env → parsed to list; NoDecode skips JSON parsing)
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def replica_url(self) -> str:
        return self.database_replica_url or self.database_url

    @property
    def is_prod(self) -> bool:
        return self.env.lower() in {"prod", "production"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
