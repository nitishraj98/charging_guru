"""Payment endpoints: order creation, client verification, Razorpay webhook, refund."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request, status

from app.api.deps import get_current_user, get_payment_service
from app.models.user import User
from app.schemas.bookings import BookingOut
from app.schemas.payments import (
    PaymentOrderIn,
    PaymentOrderOut,
    PaymentVerifyIn,
    PaymentVerifyOut,
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/order", response_model=PaymentOrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    body: PaymentOrderIn,
    current_user: User = Depends(get_current_user),
    svc: PaymentService = Depends(get_payment_service),
):
    payment = await svc.create_order(body.booking_id, current_user.id)
    # No breakdown exists yet at order-creation time (it's persisted at
    # capture — see PaymentService._persist_breakdown). Build the response
    # explicitly rather than model_validate(payment), which would try to
    # read the ORM `breakdown` relationship — unsafe to lazy-load on a
    # freshly-constructed instance outside an active fetch.
    return PaymentOrderOut(
        id=payment.id,
        booking_id=payment.booking_id,
        razorpay_order_id=payment.razorpay_order_id,
        amount=payment.amount,
        status=payment.status,
        created_at=payment.created_at,
        breakdown=None,
    )


@router.post("/verify", response_model=PaymentVerifyOut)
async def verify_payment(
    body: PaymentVerifyIn,
    current_user: User = Depends(get_current_user),
    svc: PaymentService = Depends(get_payment_service),
):
    result = await svc.verify_payment(body, current_user.id)
    return PaymentVerifyOut(
        booking_id=result.booking.id,
        booking_status=result.booking.status,
        qr_token=result.qr_token,
        breakdown=result.breakdown,
    )


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def razorpay_webhook(
    request: Request,
    svc: PaymentService = Depends(get_payment_service),
):
    """Razorpay webhook receiver — no JWT auth, signature in header."""
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    await svc.handle_webhook(body, signature)
    return {"ok": True}


@router.get("/booking/{booking_id}", response_model=PaymentOrderOut)
async def get_payment_by_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    svc: PaymentService = Depends(get_payment_service),
):
    return await svc.get_by_booking(booking_id, current_user.id)


@router.post(
    "/{booking_id}/refund",
    response_model=BookingOut,
    status_code=status.HTTP_200_OK,
)
async def refund_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    svc: PaymentService = Depends(get_payment_service),
):
    """Cancel a booking and issue a Razorpay refund if payment was captured."""
    return await svc.refund_booking(booking_id, current_user.id)
