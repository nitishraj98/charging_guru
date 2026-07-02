"""Auth request/response DTOs."""
from __future__ import annotations

import re
import uuid

from pydantic import Field, field_validator

from app.models.enums import MembershipTier
from app.schemas.common import ORMModel, StrictModel

_E164 = re.compile(r"^\+[1-9]\d{7,14}$")


class DeviceInfo(StrictModel):
    id: str | None = Field(default=None, max_length=128)
    name: str | None = Field(default=None, max_length=128)
    platform: str | None = Field(default=None, max_length=20)


class OtpRequestIn(StrictModel):
    phone: str = Field(..., examples=["+919876543210"])

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, v: str) -> str:
        if not _E164.match(v):
            raise ValueError("phone must be E.164, e.g. +919876543210")
        return v


class OtpRequestOut(ORMModel):
    request_id: uuid.UUID
    ttl_seconds: int
    # Present only in dev (CG_OTP_DEBUG=true) — never in production.
    debug_code: str | None = None


class OtpVerifyIn(StrictModel):
    request_id: uuid.UUID
    code: str = Field(..., min_length=4, max_length=8)
    device: DeviceInfo | None = None


class UserPublic(ORMModel):
    id: uuid.UUID
    phone: str
    full_name: str | None
    email: str | None
    reward_points: int
    membership_tier: MembershipTier
    referral_code: str
    roles: list[str]


class TokenPair(ORMModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResult(ORMModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    is_new: bool
    user: UserPublic


class RefreshIn(StrictModel):
    refresh_token: str
