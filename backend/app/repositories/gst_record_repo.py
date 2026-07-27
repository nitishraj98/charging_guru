"""CRUD for per-payment GST records."""
from __future__ import annotations

import uuid

from sqlalchemy import select

from app.models.gst_record import GSTRecord


class GSTRecordRepo:
    def __init__(self, session):
        self.session = session

    async def add(self, row: GSTRecord) -> GSTRecord:
        self.session.add(row)
        await self.session.flush()
        return row

    async def get_by_payment(self, payment_id: uuid.UUID) -> GSTRecord | None:
        res = await self.session.execute(
            select(GSTRecord).where(GSTRecord.payment_id == payment_id)
        )
        return res.scalar_one_or_none()

    async def set_invoice_number(self, payment_id: uuid.UUID, invoice_number: str) -> None:
        row = await self.get_by_payment(payment_id)
        if row is not None and row.invoice_number is None:
            row.invoice_number = invoice_number
            await self.session.flush()
