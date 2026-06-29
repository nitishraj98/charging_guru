"""Razorpay payment gateway wrapper.

Thin async wrapper around the Razorpay REST API.  Injected via FastAPI
dependency so tests can swap in a fake without hitting the network.

Signature verification is pure-Python (no network call), so it stays
synchronous even in tests.
"""
from __future__ import annotations

import hashlib
import hmac as _hmac

import httpx

from app.core.config import settings


class RazorpayGateway:
    _BASE = "https://api.razorpay.com/v1"

    def _auth(self) -> tuple[str, str]:
        return (settings.razorpay_key_id, settings.razorpay_key_secret)

    async def create_order(self, amount_paise: int, receipt: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._BASE}/orders",
                auth=self._auth(),
                json={"amount": amount_paise, "currency": "INR", "receipt": receipt},
                timeout=10.0,
            )
            resp.raise_for_status()
            return resp.json()

    def verify_payment_signature(
        self, order_id: str, payment_id: str, signature: str
    ) -> bool:
        """Returns True iff Razorpay's HMAC-SHA256 over order|payment matches."""
        msg = f"{order_id}|{payment_id}".encode()
        expected = _hmac.new(
            settings.razorpay_key_secret.encode(), msg, hashlib.sha256
        ).hexdigest()
        return _hmac.compare_digest(expected, signature)

    def verify_webhook_signature(self, body: bytes, signature: str) -> bool:
        """Returns True iff the webhook body HMAC matches the header value."""
        expected = _hmac.new(
            settings.razorpay_webhook_secret.encode(), body, hashlib.sha256
        ).hexdigest()
        return _hmac.compare_digest(expected, signature)

    async def refund(self, payment_id: str, amount_paise: int) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._BASE}/payments/{payment_id}/refund",
                auth=self._auth(),
                json={"amount": amount_paise},
                timeout=10.0,
            )
            resp.raise_for_status()
            return resp.json()


def get_razorpay_gateway() -> RazorpayGateway:
    return RazorpayGateway()
