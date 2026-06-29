"""initial auth schema: users, roles, sessions, otp, vehicles

Revision ID: 0001_initial_auth
Revises:
Create Date: 2026-06-16
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_auth"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

user_status = postgresql.ENUM(
    "ACTIVE", "SUSPENDED", "DELETED", name="user_status", create_type=False
)
connector_type = postgresql.ENUM(
    "CCS2", "TYPE2", "CHADEMO", "GBT", "BHARAT_AC", "BHARAT_DC",
    name="connector_type", create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    user_status.create(bind, checkfirst=True)
    connector_type.create(bind, checkfirst=True)

    op.create_table(
        "roles",
        sa.Column("id", sa.SmallInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=40), nullable=False, unique=True),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("full_name", sa.String(length=120), nullable=True),
        sa.Column("profile_image", sa.String(length=512), nullable=True),
        sa.Column("status", user_status, nullable=False, server_default="ACTIVE"),
        sa.Column("reward_points", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("referral_code", sa.String(length=12), nullable=False),
        sa.Column("referred_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["referred_by"], ["users.id"]),
        sa.UniqueConstraint("phone", name="uq_users_phone"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("referral_code", name="uq_users_referral_code"),
        sa.CheckConstraint(r"phone ~ '^\+[1-9]\d{7,14}$'", name="ck_users_phone_e164"),
    )
    op.create_index("idx_users_phone", "users", ["phone"])

    op.create_table(
        "user_roles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role_id", sa.SmallInteger(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "role_id"),
    )

    op.create_table(
        "user_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=128), nullable=False),
        sa.Column("device_id", sa.String(length=128), nullable=True),
        sa.Column("device_name", sa.String(length=128), nullable=True),
        sa.Column("platform", sa.String(length=20), nullable=True),
        sa.Column("ip", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.String(length=256), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_sessions_user", "user_sessions", ["user_id"])
    op.create_index("idx_sessions_token_hash", "user_sessions", ["refresh_token_hash"])

    op.create_table(
        "otp_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False),
        sa.Column("purpose", sa.String(length=20), nullable=False, server_default="LOGIN"),
        sa.Column("attempts", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.SmallInteger(), nullable=False, server_default="5"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip", postgresql.INET(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_otp_phone", "otp_requests", ["phone"])

    op.create_table(
        "vehicles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("brand", sa.String(length=80), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=False),
        sa.Column("battery_kwh", sa.Numeric(6, 2), nullable=False),
        sa.Column("range_km", sa.Integer(), nullable=True),
        sa.Column("connector_type", connector_type, nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint("battery_kwh > 0", name="ck_vehicles_battery_positive"),
    )
    op.create_index("idx_vehicles_user", "vehicles", ["user_id"])
    op.create_index(
        "uq_vehicle_default",
        "vehicles",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("is_default AND deleted_at IS NULL"),
    )

    # Seed roles.
    op.bulk_insert(
        sa.table("roles", sa.column("name", sa.String)),
        [{"name": "ROLE_USER"}, {"name": "ROLE_STATION_OWNER"}, {"name": "ROLE_ADMIN"}],
    )


def downgrade() -> None:
    op.drop_table("vehicles")
    op.drop_table("otp_requests")
    op.drop_table("user_sessions")
    op.drop_table("user_roles")
    op.drop_index("idx_users_phone", table_name="users")
    op.drop_table("users")
    op.drop_table("roles")
    bind = op.get_bind()
    connector_type.drop(bind, checkfirst=True)
    user_status.drop(bind, checkfirst=True)
