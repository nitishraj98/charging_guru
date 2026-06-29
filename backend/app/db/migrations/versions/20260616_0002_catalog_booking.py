"""catalog + booking: stations, chargers, slots, bookings, status history

Revision ID: 0002_catalog_booking
Revises: 0001_initial_auth
Create Date: 2026-06-16
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_catalog_booking"
down_revision: str | None = "0001_initial_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

station_status = postgresql.ENUM(
    "PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "REJECTED",
    name="station_status", create_type=False,
)
charger_status = postgresql.ENUM(
    "AVAILABLE", "BOOKED", "OCCUPIED", "OFFLINE", "MAINTENANCE",
    name="charger_status", create_type=False,
)
booking_status = postgresql.ENUM(
    "PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS",
    "COMPLETED", "CANCELLED", "EXPIRED", "NO_SHOW",
    name="booking_status", create_type=False,
)
connector_type = postgresql.ENUM(name="connector_type", create_type=False)  # exists from 0001

_TS = dict(server_default=sa.text("now()"), nullable=False)
_ACTIVE = "status IN ('PENDING_PAYMENT','CONFIRMED','CHECKED_IN','IN_PROGRESS')"


def upgrade() -> None:
    bind = op.get_bind()
    station_status.create(bind, checkfirst=True)
    charger_status.create(bind, checkfirst=True)
    booking_status.create(bind, checkfirst=True)

    op.create_table(
        "stations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("address", sa.String(400), nullable=False),
        sa.Column("city", sa.String(80)), sa.Column("state", sa.String(80)), sa.Column("pincode", sa.String(12)),
        sa.Column("lat", sa.Float, nullable=False),
        sa.Column("lng", sa.Float, nullable=False),
        sa.Column("amenities", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("status", station_status, nullable=False, server_default="PENDING_APPROVAL"),
        sa.Column("rating_avg", sa.Float, nullable=False, server_default="0"),
        sa.Column("rating_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
    )
    op.create_index("idx_stations_owner", "stations", ["owner_id"])
    op.create_index("idx_stations_geo", "stations", ["lat", "lng"])
    op.create_index("idx_stations_status", "stations", ["status"], postgresql_where=sa.text("deleted_at IS NULL"))

    op.create_table(
        "chargers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("station_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(40), nullable=False),
        sa.Column("charger_type", sa.String(8), nullable=False, server_default="DC"),
        sa.Column("power_kw", sa.Numeric(6, 2), nullable=False),
        sa.Column("connector_type", connector_type, nullable=False),
        sa.Column("status", charger_status, nullable=False, server_default="AVAILABLE"),
        sa.Column("price_per_kwh", sa.BigInteger, nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
        sa.UniqueConstraint("station_id", "label", name="uq_charger_label"),
    )
    op.create_index("idx_chargers_station", "chargers", ["station_id"])
    op.create_index("idx_chargers_lookup", "chargers", ["connector_type", "status", "power_kw"])

    op.create_table(
        "booking_slots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("charger_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chargers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slot_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("slot_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_blocked", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
        sa.UniqueConstraint("charger_id", "slot_start", name="uq_slot_charger_start"),
    )
    op.create_index("idx_slots_charger", "booking_slots", ["charger_id"])

    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id")),
        sa.Column("station_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stations.id"), nullable=False),
        sa.Column("charger_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chargers.id"), nullable=False),
        sa.Column("slot_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("booking_slots.id"), nullable=False),
        sa.Column("status", booking_status, nullable=False, server_default="PENDING_PAYMENT"),
        sa.Column("amount", sa.BigInteger, nullable=False),
        sa.Column("energy_kwh_est", sa.Float),
        sa.Column("hold_expires_at", sa.DateTime(timezone=True)),
        sa.Column("qr_jti", postgresql.UUID(as_uuid=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
    )
    op.create_index("uq_active_booking_slot", "bookings", ["slot_id"], unique=True, postgresql_where=sa.text(_ACTIVE))
    op.create_index("idx_bookings_user", "bookings", ["user_id", "created_at"])
    op.create_index("idx_bookings_station", "bookings", ["station_id", "created_at"])
    op.create_index("idx_bookings_hold", "bookings", ["status", "hold_expires_at"], postgresql_where=sa.text("status = 'PENDING_PAYMENT'"))

    op.create_table(
        "charger_status_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("charger_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chargers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("old_status", charger_status),
        sa.Column("new_status", charger_status, nullable=False),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True)),
        sa.Column("reason", sa.String(200)),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
    )
    op.create_index("idx_status_hist_charger", "charger_status_history", ["charger_id"])


def downgrade() -> None:
    op.drop_table("charger_status_history")
    op.drop_table("bookings")
    op.drop_table("booking_slots")
    op.drop_table("chargers")
    op.drop_table("stations")
    bind = op.get_bind()
    booking_status.drop(bind, checkfirst=True)
    charger_status.drop(bind, checkfirst=True)
    station_status.drop(bind, checkfirst=True)
