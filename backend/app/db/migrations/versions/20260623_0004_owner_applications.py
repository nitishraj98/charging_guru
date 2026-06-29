"""owner_applications table

Revision ID: 0004_owner_applications
Revises: 0003_payments
Create Date: 2026-06-23
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_owner_applications"
down_revision: str = "0003_payments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

app_status = postgresql.ENUM(
    "PENDING", "APPROVED", "REJECTED",
    name="owner_application_status", create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    app_status.create(bind, checkfirst=True)

    op.create_table(
        "owner_applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_name", sa.String(length=160), nullable=False),
        sa.Column("gst_number", sa.String(length=20), nullable=True),
        sa.Column("city", sa.String(length=80), nullable=False),
        sa.Column("address", sa.String(length=400), nullable=False),
        sa.Column("planned_stations", sa.SmallInteger(), nullable=False, server_default="1"),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "status",
            app_status,
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
    )
    op.create_index("idx_owner_applications_user", "owner_applications", ["user_id"])
    op.create_index("idx_owner_applications_status", "owner_applications", ["status"])


def downgrade() -> None:
    op.drop_index("idx_owner_applications_status", table_name="owner_applications")
    op.drop_index("idx_owner_applications_user", table_name="owner_applications")
    op.drop_table("owner_applications")
    bind = op.get_bind()
    app_status.drop(bind, checkfirst=True)
