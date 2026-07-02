"""SQLAlchemy ORM models. Import all here so Alembic autogenerate sees them."""
from app.models.base import Base
from app.models.booking import Booking, ChargerStatusHistory
from app.models.charger import Charger
from app.models.otp import OtpRequest
from app.models.payment import Payment
from app.models.review import Review
from app.models.role import Role, UserRole
from app.models.session import UserSession
from app.models.slot import BookingSlot
from app.models.station import Station
from app.models.user import User
from app.models.vehicle import Vehicle

__all__ = [
    "Base", "User", "Role", "UserRole", "UserSession", "OtpRequest", "Vehicle",
    "Station", "Charger", "BookingSlot", "Booking", "ChargerStatusHistory", "Payment",
    "Review",
]
