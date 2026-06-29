"""User profile DTOs."""
from __future__ import annotations

from pydantic import EmailStr, Field

from app.schemas.auth import UserPublic
from app.schemas.common import StrictModel

__all__ = ["UserPublic", "UpdateProfileIn"]


class UpdateProfileIn(StrictModel):
    full_name: str | None = Field(default=None, max_length=120)
    email: EmailStr | None = None
