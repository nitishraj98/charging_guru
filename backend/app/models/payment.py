"""Payment model — one row per booking, tracks Razorpay order lifecycle."""
from __future__ import annotations

import uuid

from sqlalchemy import BigInteger, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import PaymentStatus


class Payment(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "payments"
    __table_args__ = (
        Index("idx_payments_user", "user_id"),
    )

    # One payment per booking (unique FK enforced at DB level).
    booking_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bookings.id"), nullable=False, unique=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)  # paise

    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        default=PaymentStatus.PENDING,
        nullable=False,
    )

    # Razorpay identifiers — all unique to enable safe idempotency lookups.
    razorpay_order_id: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    razorpay_signature: Mapped[str | None] = mapped_column(String(200))

    # Webhook idempotency key (Razorpay event id from X-Razorpay-Event-Id).
    webhook_event_id: Mapped[str | None] = mapped_column(String(80), unique=True)
