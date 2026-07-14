"""membership tier on users + reward_transactions table

Revision ID: 0006_membership_rewards
Revises: 0005_reviews
Create Date: 2026-07-02
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_membership_rewards"
down_revision: str | None = "0005_reviews"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TS = dict(server_default=sa.text("now()"), nullable=False)

membership_tier = postgresql.ENUM(
    "FREE", "SILVER", "GOLD", name="membership_tier", create_type=False,
)
reward_transaction_type = postgresql.ENUM(
    "EARNED", "REDEEMED", "EXPIRED", name="reward_transaction_type", create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    membership_tier.create(bind, checkfirst=True)
    reward_transaction_type.create(bind, checkfirst=True)

    op.add_column(
        "users",
        sa.Column("membership_tier", membership_tier, nullable=False, server_default="FREE"),
    )

    op.create_table(
        "reward_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", reward_transaction_type, nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"]),
    )
    op.create_index("idx_reward_tx_user", "reward_transactions", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("idx_reward_tx_user", table_name="reward_transactions")
    op.drop_table("reward_transactions")
    op.drop_column("users", "membership_tier")
    bind = op.get_bind()
    reward_transaction_type.drop(bind, checkfirst=True)
    membership_tier.drop(bind, checkfirst=True)
