"""Twilio SMS gateway — thin async wrapper, mirrors RazorpayGateway's style.

Injected via FastAPI dependency so tests can swap in a fake without hitting
the network. Only sends a real SMS when credentials are configured; otherwise
it's a no-op and OTP codes stay reachable via CG_OTP_DEBUG for local dev,
exactly like before this gateway existed.
"""
from __future__ import annotations

import httpx

from app.core.config import settings
from app.core.errors import ServiceUnavailableError
from app.core.logging import get_logger

log = get_logger("sms")


class TwilioGateway:
    _BASE = "https://api.twilio.com/2010-04-01"

    @property
    def configured(self) -> bool:
        return bool(
            settings.twilio_account_sid
            and settings.twilio_auth_token
            and settings.twilio_from_number
        )

    async def send_otp(self, phone: str, code: str) -> None:
        if not self.configured:
            log.info("sms_skipped_not_configured", phone=phone)
            return

        body = (
            f"{code} is your Charging Guru verification code. "
            f"Valid for {settings.otp_ttl_seconds // 60} minutes."
        )
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    f"{self._BASE}/Accounts/{settings.twilio_account_sid}/Messages.json",
                    auth=(settings.twilio_account_sid, settings.twilio_auth_token),
                    data={"To": phone, "From": settings.twilio_from_number, "Body": body},
                    timeout=10.0,
                )
                resp.raise_for_status()
            except httpx.HTTPError as exc:
                log.error("sms_send_failed", phone=phone, error=str(exc))
                raise ServiceUnavailableError(
                    "Could not send the verification code. Please try again.",
                    code="SMS_DELIVERY_FAILED",
                ) from exc


def get_twilio_gateway() -> TwilioGateway:
    return TwilioGateway()
