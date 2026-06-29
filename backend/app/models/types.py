"""Portable column types.

``INETType`` uses native PostgreSQL ``INET`` in production but degrades to a
plain string on other backends (e.g. SQLite under tests), so the same models
work in both environments.
"""
from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.types import TypeDecorator


class INETType(TypeDecorator):
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(INET())
        return dialect.type_descriptor(String(45))
