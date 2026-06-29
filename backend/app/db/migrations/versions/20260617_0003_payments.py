"""payments: payment_status enum + payments table

Revision ID: 0003_payments
Revises: 0002_catalog_booking
Create Date: 2026-06-17
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_payments"
down_revision: str | None = "0002_catalog_booking"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

payment_status = postgresql.ENUM(
    "PENDING", "CAPTURED", "FAILED", "REFUNDED",
    name="payment_status", create_type=False,
)

_TS = dict(server_default=sa.text("now()"), nullable=False)


def upgrade() -> None:
    bind = op.get_bind()
    payment_status.create(bind, checkfirst=True)

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "booking_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bookings.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("amount", sa.BigInteger, nullable=False),
        sa.Column(
            "status",
            payment_status,
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("razorpay_order_id", sa.String(80), nullable=False, unique=True),
        sa.Column("razorpay_payment_id", sa.String(80), unique=True),
        sa.Column("razorpay_signature", sa.String(200)),
        sa.Column("webhook_event_id", sa.String(80), unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
    )
    op.create_index("idx_payments_user", "payments", ["user_id"])
    op.create_index("idx_payments_status", "payments", ["status", "created_at"])


def downgrade() -> None:
    op.drop_table("payments")
    bind = op.get_bind()
    payment_status.drop(bind, checkfirst=True)
