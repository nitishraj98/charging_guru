"""marketplace financials: pricing_settings, transaction_breakdown,
owner_payouts, platform_revenue, gst_records, invoice_counters, coupon/
subscription/referral scaffolding, charger parking/idle fees, booking
session-actuals

Revision ID: 0009_marketplace_financials
Revises: 0008_audit_log
Create Date: 2026-07-24
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_marketplace_financials"
down_revision: str | None = "0008_audit_log"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TS = dict(server_default=sa.text("now()"), nullable=False)

payout_status = postgresql.ENUM(
    "PENDING", "SCHEDULED", "PAID", "FAILED", name="payout_status", create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    payout_status.create(bind, checkfirst=True)

    # ── pricing_settings (single-row admin config) ─────────────────────────
    op.create_table(
        "pricing_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("platform_fee_mode", sa.String(10), nullable=False, server_default="FIXED"),
        sa.Column("platform_fee_fixed_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("platform_fee_percent", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("platform_fee_min_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("platform_fee_max_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("platform_fee_enabled", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("convenience_fee_mode", sa.String(10), nullable=False, server_default="FIXED"),
        sa.Column("convenience_fee_fixed_paise", sa.BigInteger, nullable=False, server_default="1000"),
        sa.Column("convenience_fee_percent", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("convenience_fee_min_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("convenience_fee_max_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("convenience_fee_enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("gst_percentage", sa.Numeric(5, 2), nullable=False, server_default="18.00"),
        sa.Column("gst_enabled", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("parking_fee_enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("idle_fee_enabled", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("idle_grace_minutes", sa.Integer, nullable=False, server_default="10"),
        sa.Column("subscription_revenue_enabled", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("ad_revenue_enabled", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"]),
    )

    # ── coupons / subscriptions / referral_rewards (scaffolding) ───────────
    op.create_table(
        "coupons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(30), nullable=False, unique=True),
        sa.Column("discount_type", sa.String(10), nullable=False, server_default="FIXED"),
        sa.Column("discount_value", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("max_discount_paise", sa.BigInteger, nullable=True),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
    )

    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_code", sa.String(30), nullable=False),
        sa.Column("status", sa.String(12), nullable=False, server_default="INACTIVE"),
        sa.Column("renewal_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("amount_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
    )

    op.create_table(
        "referral_rewards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("referrer_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("referred_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reward_amount_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("status", sa.String(12), nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
    )

    # ── transaction_breakdown (1:1 child of payments) ───────────────────────
    op.create_table(
        "transaction_breakdown",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bookings.id"), nullable=False),
        sa.Column("energy_kwh", sa.Numeric(8, 3), nullable=False, server_default="0"),
        sa.Column("energy_cost_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("parking_fee_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("idle_fee_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("platform_fee_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("convenience_fee_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("gst_amount_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("discount_amount_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("total_amount_paise", sa.BigInteger, nullable=False),
        sa.Column("owner_earnings_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("charging_guru_earnings_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("coupon_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["coupon_id"], ["coupons.id"]),
    )
    op.create_index("idx_txn_breakdown_booking", "transaction_breakdown", ["booking_id"])

    # ── owner_payouts ────────────────────────────────────────────────────
    op.create_table(
        "owner_payouts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("station_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stations.id"), nullable=True),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("amount_paise", sa.BigInteger, nullable=False),
        sa.Column("status", payout_status, nullable=False, server_default="PENDING"),
        sa.Column("payout_method", sa.String(20), nullable=True),
        sa.Column("reference_note", sa.String(200), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
    )
    op.create_index("idx_owner_payouts_owner", "owner_payouts", ["owner_id", "created_at"])
    op.create_index("idx_owner_payouts_status", "owner_payouts", ["status"])

    # ── platform_revenue ─────────────────────────────────────────────────
    op.create_table(
        "platform_revenue",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payments.id"), nullable=False, unique=True),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bookings.id"), nullable=False),
        sa.Column("station_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stations.id"), nullable=False),
        sa.Column("platform_fee_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("convenience_fee_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("subscription_fee_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("ad_revenue_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("total_paise", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("recorded_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
    )
    op.create_index("idx_platform_revenue_recorded_at", "platform_revenue", ["recorded_at"])
    op.create_index("idx_platform_revenue_station", "platform_revenue", ["station_id"])

    # ── gst_records ──────────────────────────────────────────────────────
    op.create_table(
        "gst_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payments.id"), nullable=False, unique=True),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bookings.id"), nullable=False),
        sa.Column("taxable_amount_paise", sa.BigInteger, nullable=False),
        sa.Column("gst_percentage", sa.Numeric(5, 2), nullable=False),
        sa.Column("gst_amount_paise", sa.BigInteger, nullable=False),
        sa.Column("invoice_number", sa.String(30), nullable=True),
        sa.Column("collected_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("created_at", sa.DateTime(timezone=True), **_TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **_TS),
    )
    op.create_index("idx_gst_records_collected_at", "gst_records", ["collected_at"])

    # ── invoice_counters (per-FY sequential invoice numbering) ─────────────
    op.create_table(
        "invoice_counters",
        sa.Column("fy", sa.String(9), primary_key=True),
        sa.Column("next_seq", sa.Integer, nullable=False, server_default="1"),
    )

    # ── chargers: parking/idle fee ──────────────────────────────────────
    op.add_column("chargers", sa.Column("parking_fee_paise", sa.BigInteger, nullable=False, server_default="0"))
    op.add_column("chargers", sa.Column("idle_fee_paise_per_min", sa.BigInteger, nullable=False, server_default="0"))

    # ── bookings: session-actuals ────────────────────────────────────────
    op.add_column("bookings", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("bookings", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("bookings", sa.Column("energy_kwh_actual", sa.Numeric(8, 3), nullable=True))
    op.add_column("bookings", sa.Column("idle_minutes_actual", sa.Integer, nullable=True))

    # ── seed the single pricing_settings row (reproduces current behavior:
    #    ₹10 fixed convenience fee, everything else off) ────────────────
    op.execute(
        """
        INSERT INTO pricing_settings (
            id, platform_fee_mode, platform_fee_fixed_paise, platform_fee_percent,
            platform_fee_min_paise, platform_fee_max_paise, platform_fee_enabled,
            convenience_fee_mode, convenience_fee_fixed_paise, convenience_fee_percent,
            convenience_fee_min_paise, convenience_fee_max_paise, convenience_fee_enabled,
            gst_percentage, gst_enabled, parking_fee_enabled, idle_fee_enabled,
            idle_grace_minutes, subscription_revenue_enabled, ad_revenue_enabled,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(), 'FIXED', 0, 0,
            0, 0, false,
            'FIXED', 1000, 0,
            0, 0, true,
            18.00, false, true, true,
            10, false, false,
            now(), now()
        )
        """
    )

    # ── backfill: every existing CAPTURED payment gets a transaction_breakdown
    #    row treating its full amount as energy_cost (no fees existed then) ──
    op.execute(
        """
        INSERT INTO transaction_breakdown (
            id, payment_id, booking_id, energy_kwh, energy_cost_paise,
            parking_fee_paise, idle_fee_paise, platform_fee_paise, convenience_fee_paise,
            gst_amount_paise, discount_amount_paise, total_amount_paise,
            owner_earnings_paise, charging_guru_earnings_paise, created_at, updated_at
        )
        SELECT
            gen_random_uuid(), p.id, p.booking_id,
            COALESCE(b.energy_kwh_est, 0), p.amount,
            0, 0, 0, 0, 0, 0, p.amount,
            p.amount, 0, now(), now()
        FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        WHERE p.status = 'CAPTURED'
        """
    )


def downgrade() -> None:
    op.drop_column("bookings", "idle_minutes_actual")
    op.drop_column("bookings", "energy_kwh_actual")
    op.drop_column("bookings", "completed_at")
    op.drop_column("bookings", "started_at")
    op.drop_column("chargers", "idle_fee_paise_per_min")
    op.drop_column("chargers", "parking_fee_paise")

    op.drop_table("invoice_counters")
    op.drop_index("idx_gst_records_collected_at", table_name="gst_records")
    op.drop_table("gst_records")
    op.drop_index("idx_platform_revenue_station", table_name="platform_revenue")
    op.drop_index("idx_platform_revenue_recorded_at", table_name="platform_revenue")
    op.drop_table("platform_revenue")
    op.drop_index("idx_owner_payouts_status", table_name="owner_payouts")
    op.drop_index("idx_owner_payouts_owner", table_name="owner_payouts")
    op.drop_table("owner_payouts")
    op.drop_index("idx_txn_breakdown_booking", table_name="transaction_breakdown")
    op.drop_table("transaction_breakdown")
    op.drop_table("referral_rewards")
    op.drop_table("subscriptions")
    op.drop_table("coupons")
    op.drop_table("pricing_settings")

    bind = op.get_bind()
    payout_status.drop(bind, checkfirst=True)
