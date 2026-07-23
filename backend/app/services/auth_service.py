"""Authentication use-cases: OTP login + JWT/refresh rotation.

Framework-agnostic: depends on repositories and core helpers only.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from app.core import security
from app.core.config import settings
from app.core.errors import GoneError, NotFoundError, RateLimitError, UnauthorizedError
from app.core.logging import get_logger
from app.core.redis import sliding_window_allow
from app.core.sms import TwilioGateway
from app.core.time import ensure_aware, utcnow
from app.models.user import User
from app.repositories.otp_repo import OtpRepo
from app.repositories.session_repo import SessionRepo
from app.repositories.user_repo import UserRepo
from app.schemas.auth import (
    AuthResult,
    DeviceInfo,
    OtpRequestOut,
    UserPublic,
    UserSessionOut,
)

log = get_logger("auth")


class AuthService:
    def __init__(self, users: UserRepo, otps: OtpRepo, sessions: SessionRepo, sms: TwilioGateway):
        self.users = users
        self.otps = otps
        self.sessions = sessions
        self.sms = sms

    # ── OTP request ───────────────────────────────────────────────────────
    async def request_otp(self, phone: str, *, ip: str | None = None) -> OtpRequestOut:
        allowed = await sliding_window_allow(
            f"rl:otp:req:{phone}", settings.rl_otp_requests_per_hour, 3600
        )
        if not allowed:
            raise RateLimitError("Too many OTP requests. Try again later.", code="OTP_RATE_LIMIT")

        code = security.generate_numeric_otp()
        expires = datetime.now(timezone.utc) + timedelta(seconds=settings.otp_ttl_seconds)
        otp = await self.otps.create(
            phone=phone,
            code_hash=security.hash_secret(code),
            expires_at=expires,
            max_attempts=settings.otp_max_attempts,
            ip=ip,
        )
        log.info("otp_issued", phone=phone, request_id=str(otp.id),
                 code=(code if settings.otp_debug else "***"))
        await self.sms.send_otp(phone, code)
        return OtpRequestOut(
            request_id=otp.id,
            ttl_seconds=settings.otp_ttl_seconds,
            debug_code=code if settings.otp_debug else None,
        )

    # ── OTP verify → issue tokens ─────────────────────────────────────────
    async def verify_otp(
        self,
        *,
        request_id: uuid.UUID,
        code: str,
        device: DeviceInfo | None,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> AuthResult:
        allowed = await sliding_window_allow(
            f"rl:otp:verify:{request_id}", settings.rl_otp_verify_per_10min, 600
        )
        if not allowed:
            raise RateLimitError("Too many attempts.", code="TOO_MANY_ATTEMPTS")

        otp = await self.otps.get(request_id)
        if otp is None or otp.consumed_at is not None:
            raise UnauthorizedError("Invalid OTP request.", code="INVALID_OTP_REQUEST")
        if ensure_aware(otp.expires_at) <= utcnow():
            raise GoneError("OTP expired. Request a new one.", code="OTP_EXPIRED")
        if otp.attempts >= otp.max_attempts:
            raise RateLimitError("Maximum attempts exceeded.", code="TOO_MANY_ATTEMPTS")

        if not security.verify_secret(code, otp.code_hash):
            await self.otps.bump_attempt(otp)
            raise UnauthorizedError("Incorrect code.", code="INVALID_CODE")

        await self.otps.mark_consumed(otp)
        user, is_new = await self.users.get_or_create_by_phone(otp.phone)

        access, refresh, expires_in = await self._issue_session(
            user, device=device, ip=ip, user_agent=user_agent
        )
        return AuthResult(
            access_token=access,
            refresh_token=refresh,
            expires_in=expires_in,
            is_new=is_new,
            user=self._public(user),
        )

    # ── Refresh rotation (with reuse detection) ──────────────────────────
    async def refresh(self, refresh_token: str) -> AuthResult:
        token_hash = security.hash_secret(refresh_token)
        sess = await self.sessions.get_by_token_hash(token_hash)
        if sess is None:
            # Token not current → possible reuse of a rotated token. Cannot
            # tie it to a session here, so reject outright.
            raise UnauthorizedError("Invalid refresh token.", code="INVALID_REFRESH")
        if sess.revoked_at is not None:
            raise UnauthorizedError("Session revoked.", code="REFRESH_REVOKED")
        if ensure_aware(sess.expires_at) <= utcnow():
            await self.sessions.revoke(sess)
            raise UnauthorizedError("Session expired.", code="REFRESH_EXPIRED")

        user = await self.users.get(sess.user_id)
        if user is None:
            raise UnauthorizedError("User not found.", code="INVALID_REFRESH")

        new_refresh = security.generate_refresh_token()
        expires = datetime.now(timezone.utc) + timedelta(
            seconds=settings.refresh_token_ttl_seconds
        )
        await self.sessions.rotate(
            sess, new_hash=security.hash_secret(new_refresh), expires_at=expires
        )
        access = security.create_access_token(
            user_id=user.id, session_id=sess.id, roles=user.role_names
        )
        return AuthResult(
            access_token=access,
            refresh_token=new_refresh,
            expires_in=settings.access_token_ttl_seconds,
            is_new=False,
            user=self._public(user),
        )

    async def logout(self, session_id: uuid.UUID) -> None:
        sess = await self.sessions.get(session_id)
        if sess and sess.revoked_at is None:
            await self.sessions.revoke(sess)

    async def logout_by_refresh_token(self, refresh_token: str) -> None:
        """Revoke a session by its refresh token directly, without requiring
        a still-valid access token — the refresh token's own long TTL is the
        credential here, same trust model as /auth/refresh."""
        token_hash = security.hash_secret(refresh_token)
        sess = await self.sessions.get_by_token_hash(token_hash)
        if sess and sess.revoked_at is None:
            await self.sessions.revoke(sess)

    # ── Session management (device list / revoke) ─────────────────────────
    async def list_sessions(
        self, user_id: uuid.UUID, current_session_id: uuid.UUID
    ) -> list[UserSessionOut]:
        sessions = await self.sessions.list_active_for_user(user_id)
        return [
            UserSessionOut(
                id=s.id, device_name=s.device_name, platform=s.platform,
                ip=str(s.ip) if s.ip else None, user_agent=s.user_agent,
                created_at=s.created_at, last_seen_at=s.last_seen_at,
                is_current=s.id == current_session_id,
            )
            for s in sessions
        ]

    async def revoke_session(self, user_id: uuid.UUID, session_id: uuid.UUID) -> None:
        sess = await self.sessions.get(session_id)
        if sess is None or sess.user_id != user_id or sess.revoked_at is not None:
            raise NotFoundError("Session not found.", code="SESSION_NOT_FOUND")
        await self.sessions.revoke(sess)

    async def rename_session(
        self, user_id: uuid.UUID, session_id: uuid.UUID,
        current_session_id: uuid.UUID, device_name: str,
    ) -> UserSessionOut:
        sess = await self.sessions.get(session_id)
        if sess is None or sess.user_id != user_id or sess.revoked_at is not None:
            raise NotFoundError("Session not found.", code="SESSION_NOT_FOUND")
        await self.sessions.rename(sess, device_name=device_name)
        return UserSessionOut(
            id=sess.id, device_name=sess.device_name, platform=sess.platform,
            ip=str(sess.ip) if sess.ip else None, user_agent=sess.user_agent,
            created_at=sess.created_at, last_seen_at=sess.last_seen_at,
            is_current=sess.id == current_session_id,
        )

    async def revoke_other_sessions(
        self, user_id: uuid.UUID, current_session_id: uuid.UUID
    ) -> int:
        sessions = await self.sessions.list_active_for_user(user_id)
        revoked = 0
        for sess in sessions:
            if sess.id != current_session_id:
                await self.sessions.revoke(sess)
                revoked += 1
        return revoked

    # ── helpers ───────────────────────────────────────────────────────────
    async def _issue_session(
        self,
        user: User,
        *,
        device: DeviceInfo | None,
        ip: str | None,
        user_agent: str | None,
    ) -> tuple[str, str, int]:
        refresh = security.generate_refresh_token()
        expires = datetime.now(timezone.utc) + timedelta(
            seconds=settings.refresh_token_ttl_seconds
        )
        sess = await self.sessions.create(
            user_id=user.id,
            refresh_token_hash=security.hash_secret(refresh),
            expires_at=expires,
            device_id=device.id if device else None,
            device_name=device.name if device else None,
            platform=device.platform if device else None,
            ip=ip,
            user_agent=user_agent,
        )
        access = security.create_access_token(
            user_id=user.id, session_id=sess.id, roles=user.role_names
        )
        return access, refresh, settings.access_token_ttl_seconds

    @staticmethod
    def _public(user: User) -> UserPublic:
        return UserPublic(
            id=user.id,
            phone=user.phone,
            full_name=user.full_name,
            email=user.email,
            reward_points=user.reward_points,
            membership_tier=user.membership_tier,
            referral_code=user.referral_code,
            roles=user.role_names,
        )
