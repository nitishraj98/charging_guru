"""PDF invoice generation for completed charging sessions.

Renders app/templates/invoice.html.jinja to PDF via WeasyPrint, embedding a
QR (encoding invoice number + booking id, for offline verification) and the
charged transaction_breakdown alongside the actual post-session energy/
duration figures (display-only — never re-persisted, see
app.domain.pricing's module docstring for why the charged amount is frozen
at payment capture).
"""
from __future__ import annotations

import base64
import io
from datetime import datetime, timezone
from pathlib import Path

import qrcode
from jinja2 import Environment, FileSystemLoader

from app.core.errors import ConflictError
from app.core.time import ensure_aware
from app.domain.pricing import ChargerPricing, compute_pricing
from app.models.booking import Booking
from app.models.invoice_counter import InvoiceCounter
from app.models.payment import Payment
from app.models.user import User
from app.models.vehicle import Vehicle
from app.repositories.gst_record_repo import GSTRecordRepo
from app.repositories.transaction_breakdown_repo import TransactionBreakdownRepo
from app.services.pricing_settings_service import PricingSettingsService
from sqlalchemy import select, update

_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
_FONT_DIR = _TEMPLATE_DIR / "fonts"
_env = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)))


def _font_uri(filename: str) -> str:
    return (_FONT_DIR / filename).as_uri()


def _rupees(paise: int) -> str:
    return f"₹{paise / 100:,.2f}"


class InvoiceService:
    def __init__(
        self,
        session,
        breakdown_repo: TransactionBreakdownRepo,
        gst_repo: GSTRecordRepo,
        pricing_settings: PricingSettingsService,
    ):
        self.session = session
        self.breakdown_repo = breakdown_repo
        self.gst_repo = gst_repo
        self.pricing_settings = pricing_settings

    async def _next_invoice_number(self) -> str:
        """Per-financial-year sequential counter (Indian FY: Apr–Mar).
        Table-based (not a DB sequence) so the same logic works on both
        Postgres (prod) and SQLite (tests)."""
        now = datetime.now(timezone.utc)
        fy_start_year = now.year if now.month >= 4 else now.year - 1
        fy = f"{fy_start_year}-{str(fy_start_year + 1)[-2:]}"

        row = (
            await self.session.execute(
                select(InvoiceCounter).where(InvoiceCounter.fy == fy)
            )
        ).scalar_one_or_none()
        if row is None:
            row = InvoiceCounter(fy=fy, next_seq=1)
            self.session.add(row)
            await self.session.flush()

        seq = row.next_seq
        await self.session.execute(
            update(InvoiceCounter).where(InvoiceCounter.fy == fy).values(next_seq=seq + 1)
        )
        await self.session.flush()
        return f"CG/{fy}/{seq:06d}"

    async def generate_invoice_pdf(self, booking: Booking) -> tuple[bytes, str]:
        breakdown_row = await self.breakdown_repo.get_by_booking(booking.id)
        if breakdown_row is None:
            raise ConflictError(
                "No payment breakdown found for this booking.", code="INVOICE_NOT_AVAILABLE"
            )

        gst_record = await self.gst_repo.get_by_payment(breakdown_row.payment_id)
        if gst_record is not None and gst_record.invoice_number:
            invoice_number = gst_record.invoice_number
        else:
            invoice_number = await self._next_invoice_number()
            if gst_record is not None:
                gst_record.invoice_number = invoice_number
                await self.session.flush()

        # Actual session figures for display (duration/energy delivered) —
        # never overwrites the charged breakdown above. If the real session
        # was too short to produce a meaningful reading (e.g. checked-in and
        # completed within the same minute during testing/ops), fall back to
        # the booking-time estimate that was actually billed, so the invoice
        # doesn't show "0 kWh" next to a nonzero charge.
        charger = booking.charger
        platform_config = await self.pricing_settings.to_platform_config()
        if (
            booking.started_at is not None
            and booking.completed_at is not None
            and ensure_aware(booking.completed_at) > ensure_aware(booking.started_at)
        ):
            duration_minutes = int(
                (ensure_aware(booking.completed_at) - ensure_aware(booking.started_at)).total_seconds() // 60
            )
        else:
            duration_minutes = 0
        if duration_minutes <= 0 or not booking.energy_kwh_actual:
            duration_minutes = int(
                (ensure_aware(booking.slot_end) - ensure_aware(booking.slot_start)).total_seconds() // 60
            )
            energy_kwh_override = booking.energy_kwh_est
            idle_minutes = 0
        else:
            energy_kwh_override = booking.energy_kwh_actual
            idle_minutes = booking.idle_minutes_actual or 0
        actual = compute_pricing(
            ChargerPricing(
                power_kw=float(charger.power_kw),
                price_per_kwh_paise=charger.price_per_kwh,
                parking_fee_paise=charger.parking_fee_paise,
                idle_fee_paise_per_min=charger.idle_fee_paise_per_min,
            ),
            platform_config,
            duration_minutes=duration_minutes,
            energy_kwh_override=energy_kwh_override,
            idle_minutes=idle_minutes,
        )

        user = await self.session.get(User, booking.user_id)
        vehicle = None
        if booking.vehicle_id is not None:
            vehicle = await self.session.get(Vehicle, booking.vehicle_id)
        payment = await self.session.get(Payment, breakdown_row.payment_id)

        qr_img = qrcode.make(f"{invoice_number}|{booking.id}")
        buf = io.BytesIO()
        qr_img.save(buf, format="PNG")
        qr_base64 = base64.b64encode(buf.getvalue()).decode()

        hours = duration_minutes // 60
        mins = duration_minutes % 60
        duration_label = f"{hours}h {mins}m" if hours else f"{mins}m"

        used_actual_session = energy_kwh_override is booking.energy_kwh_actual
        session_start = booking.started_at if used_actual_session else booking.slot_start
        session_end = booking.completed_at if used_actual_session else booking.slot_end
        issued_at = datetime.now(timezone.utc)
        subtotal_paise = breakdown_row.total_amount_paise - breakdown_row.gst_amount_paise

        template = _env.get_template("invoice.html.jinja")
        html_str = template.render(
            font_regular_path=_font_uri("NotoSans-Regular.ttf"),
            font_bold_path=_font_uri("NotoSans-Bold.ttf"),
            font_italic_path=_font_uri("NotoSans-Italic.ttf"),
            invoice_number=invoice_number,
            issued_date=issued_at.strftime("%d %b %Y"),
            issued_time=issued_at.strftime("%I:%M %p"),
            transaction_id=(payment.razorpay_payment_id if payment else str(breakdown_row.payment_id)),
            order_id=(payment.razorpay_order_id if payment else "—"),
            customer_name=(user.full_name if user and user.full_name else "Customer"),
            customer_phone=(user.phone if user else ""),
            vehicle=(f"{vehicle.brand} {vehicle.model}" if vehicle else None),
            station_name=booking.station.name,
            station_address=booking.station.address,
            charger_label=f"{charger.label} · {charger.connector_type.value} · {charger.power_kw}kW",
            start_time=ensure_aware(session_start).strftime("%d %b %Y, %I:%M %p"),
            end_time=ensure_aware(session_end).strftime("%d %b %Y, %I:%M %p"),
            duration=duration_label,
            energy_kwh=f"{actual.energy_kwh:.2f}",
            rate_per_kwh=_rupees(charger.price_per_kwh),
            energy_cost=_rupees(breakdown_row.energy_cost_paise),
            parking_fee=_rupees(breakdown_row.parking_fee_paise),
            parking_fee_paise=breakdown_row.parking_fee_paise,
            idle_fee=_rupees(breakdown_row.idle_fee_paise),
            idle_fee_paise=breakdown_row.idle_fee_paise,
            platform_fee=_rupees(breakdown_row.platform_fee_paise),
            platform_fee_paise=breakdown_row.platform_fee_paise,
            convenience_fee=_rupees(breakdown_row.convenience_fee_paise),
            convenience_fee_paise=breakdown_row.convenience_fee_paise,
            discount_amount=_rupees(breakdown_row.discount_amount_paise),
            discount_amount_paise=breakdown_row.discount_amount_paise,
            subtotal=_rupees(subtotal_paise),
            gst_amount=_rupees(breakdown_row.gst_amount_paise),
            gst_amount_paise=breakdown_row.gst_amount_paise,
            gst_percentage=f"{float(platform_config.gst_percentage):.2f}".rstrip("0").rstrip("."),
            grand_total=_rupees(breakdown_row.total_amount_paise),
            qr_base64=qr_base64,
        )
        # Imported lazily: WeasyPrint eagerly dlopen()s Pango/Cairo/GObject at
        # import time, which requires the GTK3 runtime on native Windows dev
        # machines (not needed in the Docker image, which installs those libs
        # via apt — see Dockerfile). Deferring the import keeps the rest of
        # the app importable in dev environments without that runtime.
        from weasyprint import HTML

        pdf_bytes = HTML(string=html_str).write_pdf()
        return pdf_bytes, invoice_number
