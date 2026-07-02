"""reviews table

Revision ID: 0005_reviews
Revises: 0004_owner_applications
Create Date: 2026-07-02
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_reviews"
down_revision: str | None = "0004_owner_applications"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TS = dict(server_default=sa.text("now()"), nullable=False)


def upgrade() -> None:
    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("station_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("rating", sa.SmallInteger(), nullable=False),
        sa.Column("comment", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating_range"),
        sa.ForeignKeyConstraint(["station_id"], ["stations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"]),
    )
    op.create_index("idx_reviews_station", "reviews", ["station_id", "created_at"])


def downgrade() -> None:
    op.drop_index("idx_reviews_station", table_name="reviews")
    op.drop_table("reviews")
