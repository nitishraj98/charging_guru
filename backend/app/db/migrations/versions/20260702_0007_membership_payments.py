"""membership_payments table

Revision ID: 0007_membership_payments
Revises: 0006_membership_rewards
Create Date: 2026-07-02
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_membership_payments"
down_revision: str | None = "0006_membership_rewards"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TS = dict(server_default=sa.text("now()"), nullable=False)

membership_tier = postgresql.ENUM(
    "FREE", "SILVER", "GOLD", name="membership_tier", create_type=False,
)
payment_status = postgresql.ENUM(
    "PENDING", "CAPTURED", "FAILED", "REFUNDED", name="payment_status", create_type=False,
)


def upgrade() -> None:
    op.create_table(
        "membership_payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tier", membership_tier, nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("status", payment_status, nullable=False, server_default="PENDING"),
        sa.Column("razorpay_order_id", sa.String(length=80), nullable=False, unique=True),
        sa.Column("razorpay_payment_id", sa.String(length=80), unique=True),
        sa.Column("razorpay_signature", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("idx_membership_payments_user", "membership_payments", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_membership_payments_user", table_name="membership_payments")
    op.drop_table("membership_payments")
