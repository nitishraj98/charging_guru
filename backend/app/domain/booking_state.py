"""Booking state machine — the single source of truth for legal transitions."""
from __future__ import annotations

from app.models.enums import BookingStatus

# allowed: current -> {next states}
_TRANSITIONS: dict[BookingStatus, set[BookingStatus]] = {
    BookingStatus.PENDING_PAYMENT: {
        BookingStatus.CONFIRMED,
        BookingStatus.CANCELLED,
        BookingStatus.EXPIRED,
    },
    BookingStatus.CONFIRMED: {
        BookingStatus.CHECKED_IN,
        BookingStatus.CANCELLED,
        BookingStatus.NO_SHOW,
    },
    BookingStatus.CHECKED_IN: {BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED},
    BookingStatus.IN_PROGRESS: {BookingStatus.COMPLETED},
    BookingStatus.COMPLETED: set(),
    BookingStatus.CANCELLED: set(),
    BookingStatus.EXPIRED: set(),
    BookingStatus.NO_SHOW: set(),
}


def can_transition(current: BookingStatus, target: BookingStatus) -> bool:
    return target in _TRANSITIONS.get(current, set())
