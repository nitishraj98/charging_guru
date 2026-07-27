"""Per-financial-year sequential invoice number counter.

A table (not a raw DB sequence) so the same increment logic works on both
PostgreSQL (prod) and SQLite (tests) — see InvoiceService._next_invoice_number.
"""
from __future__ import annotations

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class InvoiceCounter(Base):
    __tablename__ = "invoice_counters"

    fy: Mapped[str] = mapped_column(String(9), primary_key=True)
    next_seq: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
