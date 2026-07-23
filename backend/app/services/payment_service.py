"""Payment use-cases: order creation, client-side verify, webhook, refund.

Flow:
  1. POST /payments/order  →  create_order()  →  Razorpay order created, Payment row PENDING
  2. Client pays on Razorpay SDK
  3. POST /payments/verify →  verify_payment() →  signature checked, booking CONFIRMED, QR issued
  4. Razorpay webhook      →  handle_webhook() →  idempotent fallback confirm (if client verify raced)

Webhook is the safety net, not the primary path — the client-side verify call
is faster and gives the user instant feedback.
"""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass

from app.core.errors import AppError, ConflictError, NotFoundError
from app.core.qr import issue_qr
from app.core.razorpay import RazorpayGateway
from app.core.time import ensure_aware, utcnow
from app.models.booking import Booking
from app.models.enums import BookingStatus, PaymentStatus
from app.models.payment import Payment
from app.repositories.booking_repo import BookingRepo
from app.repositories.payment_repo import PaymentRepo
from app.schemas.bookings import BookingOut
from app.schemas.payments import PaymentVerifyIn
from app.services.realtime import publish_slot_event

# Booking statuses the user can self-cancel (charges not yet started).
_CANCELLABLE = {
    BookingStatus.PENDING_PAYMENT,
    BookingStatus.CONFIRMED,
    BookingStatus.CHECKED_IN,
}


@dataclass
class PaymentConfirmResult:
    booking: Booking
    qr_token: str


class PaymentService:
    def __init__(
        self,
        payments: PaymentRepo,
        bookings: BookingRepo,
        gateway: RazorpayGateway,
        session,
        membership=None,
    ):
        self.payments = payments
        self.bookings = bookings
        self.gateway = gateway
        self.session = session
        self.membership = membership

    async def create_order(self, booking_id: uuid.UUID, user_id: uuid.UUID) -> Payment:
        """Create (or return existing) Razorpay order for a pending booking."""
        booking = await self.bookings.get(booking_id)
        if booking is None or booking.user_id != user_id:
            raise NotFoundError("Booking not found.", code="BOOKING_NOT_FOUND")

        # A hold past its TTL must never reach Razorpay — the background sweep
        # (app.core.scheduler) only runs periodically, so expiry is also
        # enforced lazily right here rather than trusting it's already flipped.
        if (
            booking.status == BookingStatus.PENDING_PAYMENT
            and booking.hold_expires_at is not None
            and ensure_aware(booking.hold_expires_at) <= utcnow()
        ):
            booking.status = BookingStatus.EXPIRED
            await self.session.flush()
            raise ConflictError(
                "Your slot hold has expired. Please book again.", code="HOLD_EXPIRED"
            )

        if booking.status != BookingStatus.PENDING_PAYMENT:
            raise ConflictError(
                "Booking is not awaiting payment.", code="BOOKING_NOT_PENDING"
            )

        # Idempotent — if a Razorpay order already exists, return it.
        existing = await self.payments.get_by_booking(booking_id)
        if existing:
            return existing

        order = await self.gateway.create_order(
            amount_paise=booking.amount,
            receipt=str(booking.id)[:40],  # Razorpay receipt ≤ 40 chars
        )
        payment = Payment(
            booking_id=booking.id,
            user_id=user_id,
            amount=booking.amount,
            razorpay_order_id=order["id"],
        )
        return await self.payments.add(payment)

    async def verify_payment(
        self, payload: PaymentVerifyIn, user_id: uuid.UUID
    ) -> PaymentConfirmResult:
        """Client-side payment confirmation: verify Razorpay signature, confirm booking."""
        payment = await self.payments.get_by_order(payload.razorpay_order_id)
        if payment is None or payment.user_id != user_id:
            raise NotFoundError("Payment order not found.", code="PAYMENT_NOT_FOUND")

        # Idempotent — webhook may have already confirmed this.
        if payment.status == PaymentStatus.CAPTURED:
            booking = await self.bookings.get(payment.booking_id)
            qr_token, _ = issue_qr(booking.id)
            return PaymentConfirmResult(booking=booking, qr_token=qr_token)

        ok = self.gateway.verify_payment_signature(
            payload.razorpay_order_id,
            payload.razorpay_payment_id,
            payload.razorpay_signature,
        )
        if not ok:
            payment.status = PaymentStatus.FAILED
            raise AppError("Payment signature mismatch.", code="INVALID_PAYMENT_SIGNATURE")

        payment.razorpay_payment_id = payload.razorpay_payment_id
        payment.razorpay_signature = payload.razorpay_signature
        payment.status = PaymentStatus.CAPTURED

        booking = await self.bookings.get(payment.booking_id)
        booking.status = BookingStatus.CONFIRMED
        qr_token, jti = issue_qr(booking.id)
        booking.qr_jti = jti
        await self.session.flush()
        await publish_slot_event(booking.station_id, booking.charger_id, "booking_confirmed")

        return PaymentConfirmResult(booking=booking, qr_token=qr_token)

    async def handle_webhook(self, body: bytes, signature: str) -> None:
        """Razorpay webhook handler — idempotent fallback for payment confirmation."""
        if not self.gateway.verify_webhook_signature(body, signature):
            raise AppError(
                "Invalid webhook signature.", code="INVALID_WEBHOOK_SIGNATURE"
            )

        try:
            event = json.loads(body)
        except json.JSONDecodeError:
            raise AppError("Malformed webhook body.", code="INVALID_WEBHOOK_BODY")

        event_name = event.get("event", "")

        if event_name == "payment.captured":
            entity = event.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = entity.get("order_id", "")
            payment_id = entity.get("id", "")
            payment = await self.payments.get_by_order(order_id)
            if payment is None:
                # Not a booking payment — could be a membership order.
                if self.membership is not None:
                    await self.membership.handle_webhook_event(event_name, entity)
                return
            if payment.status == PaymentStatus.CAPTURED:
                return  # already processed

            payment.razorpay_payment_id = payment_id
            payment.status = PaymentStatus.CAPTURED
            booking = await self.bookings.get(payment.booking_id)
            if booking and booking.status == BookingStatus.PENDING_PAYMENT:
                booking.status = BookingStatus.CONFIRMED
                _, jti = issue_qr(booking.id)
                booking.qr_jti = jti
                await publish_slot_event(booking.station_id, booking.charger_id, "booking_confirmed")

        elif event_name == "refund.processed":
            entity = event.get("payload", {}).get("refund", {}).get("entity", {})
            payment_id = entity.get("payment_id", "")
            payment = await self.payments.get_by_payment_id(payment_id)
            if payment and payment.status == PaymentStatus.CAPTURED:
                payment.status = PaymentStatus.REFUNDED

    async def get_by_booking(self, booking_id: uuid.UUID, user_id: uuid.UUID) -> Payment:
        payment = await self.payments.get_by_booking(booking_id)
        if payment is None or payment.user_id != user_id:
            raise NotFoundError("Payment not found.", code="PAYMENT_NOT_FOUND")
        return payment

    async def refund_booking(self, booking_id: uuid.UUID, user_id: uuid.UUID) -> Booking:
        """Cancel a booking and refund the payment if one was captured.

        Allowed from PENDING_PAYMENT, CONFIRMED, or CHECKED_IN.
        A PENDING_PAYMENT booking with no captured payment is just cancelled.
        """
        booking = await self.bookings.get(booking_id)
        if booking is None or booking.user_id != user_id:
            raise NotFoundError("Booking not found.", code="BOOKING_NOT_FOUND")
        if booking.status not in _CANCELLABLE:
            raise ConflictError(
                f"Cannot cancel a booking in status {booking.status.value}.",
                code="BOOKING_NOT_CANCELLABLE",
            )

        payment = await self.payments.get_by_booking(booking_id)
        if payment and payment.status == PaymentStatus.CAPTURED:
            with __import__("contextlib").suppress(Exception):
                # Best-effort Razorpay refund; don't block the cancellation if
                # the gateway call fails (operations team reconciles later).
                await self.gateway.refund(payment.razorpay_payment_id, payment.amount)
            payment.status = PaymentStatus.REFUNDED

        booking.status = BookingStatus.CANCELLED
        await self.session.flush()
        await publish_slot_event(booking.station_id, booking.charger_id, "hold_released")
        return booking
