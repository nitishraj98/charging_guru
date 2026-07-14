"""Enum types shared across models."""
from __future__ import annotations

import enum


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DELETED = "DELETED"


class RoleName(str, enum.Enum):
    USER = "ROLE_USER"
    STATION_OWNER = "ROLE_STATION_OWNER"
    ADMIN = "ROLE_ADMIN"


class ConnectorType(str, enum.Enum):
    CCS2 = "CCS2"
    TYPE2 = "TYPE2"
    CHADEMO = "CHADEMO"
    GBT = "GBT"
    BHARAT_AC = "BHARAT_AC"
    BHARAT_DC = "BHARAT_DC"


class OtpPurpose(str, enum.Enum):
    LOGIN = "LOGIN"


class StationStatus(str, enum.Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    REJECTED = "REJECTED"


class ChargerStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BOOKED = "BOOKED"
    OCCUPIED = "OCCUPIED"
    OFFLINE = "OFFLINE"
    MAINTENANCE = "MAINTENANCE"


class BookingStatus(str, enum.Enum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    CHECKED_IN = "CHECKED_IN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    NO_SHOW = "NO_SHOW"


# Booking states that occupy a slot (block re-booking of the same slot).
ACTIVE_BOOKING_STATUSES = (
    BookingStatus.PENDING_PAYMENT,
    BookingStatus.CONFIRMED,
    BookingStatus.CHECKED_IN,
    BookingStatus.IN_PROGRESS,
)


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CAPTURED = "CAPTURED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class MembershipTier(str, enum.Enum):
    FREE = "FREE"
    SILVER = "SILVER"
    GOLD = "GOLD"


class RewardTransactionType(str, enum.Enum):
    EARNED = "EARNED"
    REDEEMED = "REDEEMED"
    EXPIRED = "EXPIRED"
