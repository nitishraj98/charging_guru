"""Reward-point ledger + membership tier use-cases.

Points are a simple signed ledger (RewardTransaction): earning writes a
positive row, redeeming writes a negative row, and the user's spendable
balance (User.reward_points) is a running total kept in sync on every write.
Tier progression is driven by lifetime *earned* points, not the spendable
balance, so redeeming points never demotes a user.
"""
from __future__ import annotations

import uuid

from app.core.errors import AppError, ConflictError, NotFoundError
from app.core.razorpay import RazorpayGateway
from app.domain.policies import (
    FIRST_BOOKING_BONUS_POINTS,
    GOLD_TIER_POINTS_THRESHOLD,
    MEMBERSHIP_TIERS,
    POINTS_PER_SESSION,
    REFERRAL_BONUS_POINTS,
    SILVER_TIER_POINTS_THRESHOLD,
)
from app.models.enums import MembershipTier, PaymentStatus, RewardTransactionType
from app.models.membership_payment import MembershipPayment
from app.models.reward import RewardTransaction
from app.models.user import User
from app.repositories.membership_payment_repo import MembershipPaymentRepo
from app.repositories.reward_repo import RewardRepo
from app.repositories.user_repo import UserRepo
from app.schemas.rewards import MembershipVerifyIn, RewardSummaryOut, RewardTransactionOut

_TIER_ORDER = [MembershipTier.FREE, MembershipTier.SILVER, MembershipTier.GOLD]
_TIER_THRESHOLDS = {
    MembershipTier.FREE: 0,
    MembershipTier.SILVER: SILVER_TIER_POINTS_THRESHOLD,
    MembershipTier.GOLD: GOLD_TIER_POINTS_THRESHOLD,
}


def _loyalty_tier_for(lifetime_points: int) -> MembershipTier:
    """Loyalty tier earned purely from activity (separate from the paid
    membership_tier on User, which the user can also buy directly)."""
    if lifetime_points >= GOLD_TIER_POINTS_THRESHOLD:
        return MembershipTier.GOLD
    if lifetime_points >= SILVER_TIER_POINTS_THRESHOLD:
        return MembershipTier.SILVER
    return MembershipTier.FREE


class RewardService:
    def __init__(self, rewards: RewardRepo, users: UserRepo, session):
        self.rewards = rewards
        self.users = users
        self.session = session

    async def get_summary(self, user: User) -> RewardSummaryOut:
        lifetime = await self.rewards.lifetime_earned_points(user.id)
        # Effective tier: the higher of (paid membership_tier, activity-earned loyalty tier).
        loyalty_tier = _loyalty_tier_for(lifetime)
        tier = loyalty_tier if _TIER_ORDER.index(loyalty_tier) > _TIER_ORDER.index(user.membership_tier) else user.membership_tier

        idx = _TIER_ORDER.index(tier)
        next_tier = _TIER_ORDER[idx + 1] if idx + 1 < len(_TIER_ORDER) else None
        points_to_next = max(0, _TIER_THRESHOLDS[next_tier] - lifetime) if next_tier else 0

        return RewardSummaryOut(
            points=user.reward_points,
            tier=tier,
            next_tier=next_tier,
            points_to_next=points_to_next,
            referral_code=user.referral_code,
        )

    async def get_history(self, user_id: uuid.UUID) -> list[RewardTransactionOut]:
        rows = await self.rewards.list_for_user(user_id)
        return [RewardTransactionOut.model_validate(r) for r in rows]

    async def redeem(self, user: User, points: int) -> RewardTransactionOut:
        if points > user.reward_points:
            raise ConflictError(
                f"You only have {user.reward_points} points available.", code="INSUFFICIENT_POINTS"
            )
        tx = RewardTransaction(
            user_id=user.id,
            type=RewardTransactionType.REDEEMED,
            points=-points,
            description=f"Redeemed {points} points for a discount code",
        )
        await self.rewards.add(tx)
        user.reward_points -= points
        await self.session.flush()
        return RewardTransactionOut.model_validate(tx)

    # ── Internal award hooks (called by other services, not exposed via API) ──

    async def award_session_points(self, user_id: uuid.UUID, booking_id: uuid.UUID) -> None:
        user = await self.users.get(user_id)
        if user is None:
            return

        multiplier = MEMBERSHIP_TIERS[user.membership_tier].points_multiplier
        points = round(POINTS_PER_SESSION * multiplier)
        await self.rewards.add(RewardTransaction(
            user_id=user.id, type=RewardTransactionType.EARNED, points=points,
            description="Completed charging session", booking_id=booking_id,
        ))
        user.reward_points += points

        if not await self.rewards.has_earned_first_booking_bonus(user.id):
            await self.rewards.add(RewardTransaction(
                user_id=user.id, type=RewardTransactionType.EARNED,
                points=FIRST_BOOKING_BONUS_POINTS, description="First booking bonus",
                booking_id=booking_id,
            ))
            user.reward_points += FIRST_BOOKING_BONUS_POINTS

            if user.referred_by is not None:
                referrer = await self.users.get(user.referred_by)
                if referrer is not None:
                    await self.rewards.add(RewardTransaction(
                        user_id=referrer.id, type=RewardTransactionType.EARNED,
                        points=REFERRAL_BONUS_POINTS,
                        description=f"Referral bonus — {user.full_name or user.phone} completed their first booking",
                    ))
                    referrer.reward_points += REFERRAL_BONUS_POINTS

        await self.session.flush()


class MembershipService:
    """Membership tier purchase — real Razorpay order/verify, same pattern
    as PaymentService for bookings (order create → client pays → signature
    verify → webhook as idempotent fallback)."""

    def __init__(
        self,
        users: UserRepo,
        payments: MembershipPaymentRepo,
        gateway: RazorpayGateway,
        session,
    ):
        self.users = users
        self.payments = payments
        self.gateway = gateway
        self.session = session

    def tier_catalog(self) -> list[dict]:
        return [
            {"tier": tier, "price_paise": meta.price_paise, "points_multiplier": meta.points_multiplier, "discount_pct": meta.discount_pct}
            for tier, meta in MEMBERSHIP_TIERS.items()
        ]

    def current(self, user: User) -> dict:
        meta = MEMBERSHIP_TIERS[user.membership_tier]
        return {
            "tier": user.membership_tier, "price_paise": meta.price_paise,
            "points_multiplier": meta.points_multiplier, "discount_pct": meta.discount_pct,
        }

    async def create_order(self, user: User, tier: MembershipTier) -> MembershipPayment:
        if tier not in MEMBERSHIP_TIERS:
            raise NotFoundError("Unknown membership tier.", code="UNKNOWN_TIER")
        if tier == user.membership_tier:
            raise ConflictError(f"You are already on the {tier.value} plan.", code="ALREADY_ON_TIER")
        if tier == MembershipTier.FREE:
            raise ConflictError("The Free plan has no payment required.", code="FREE_TIER_NO_PAYMENT")

        # Idempotent — reuse an existing pending order for the same tier.
        existing = await self.payments.get_pending_for_user_tier(user.id, tier)
        if existing:
            return existing

        amount = MEMBERSHIP_TIERS[tier].price_paise
        order = await self.gateway.create_order(
            amount_paise=amount,
            receipt=f"mem_{user.id}_{tier.value}"[:40],
        )
        payment = MembershipPayment(
            user_id=user.id, tier=tier, amount=amount, razorpay_order_id=order["id"],
        )
        return await self.payments.add(payment)

    async def verify_payment(self, user: User, payload: MembershipVerifyIn) -> dict:
        payment = await self.payments.get_by_order(payload.razorpay_order_id)
        if payment is None or payment.user_id != user.id:
            raise NotFoundError("Payment order not found.", code="PAYMENT_NOT_FOUND")

        # Idempotent — webhook may have already confirmed this.
        if payment.status == PaymentStatus.CAPTURED:
            user.membership_tier = payment.tier
            await self.session.flush()
            return self.current(user)

        ok = self.gateway.verify_payment_signature(
            payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature,
        )
        if not ok:
            payment.status = PaymentStatus.FAILED
            raise AppError("Payment signature mismatch.", code="INVALID_PAYMENT_SIGNATURE")

        payment.razorpay_payment_id = payload.razorpay_payment_id
        payment.razorpay_signature = payload.razorpay_signature
        payment.status = PaymentStatus.CAPTURED
        user.membership_tier = payment.tier
        await self.session.flush()
        return self.current(user)

    async def handle_webhook_event(self, event_name: str, entity: dict) -> None:
        """Idempotent fallback confirmation — mirrors PaymentService.handle_webhook
        but for membership_payments. Called from the shared webhook receiver."""
        if event_name == "payment.captured":
            order_id = entity.get("order_id", "")
            payment_id = entity.get("id", "")
            payment = await self.payments.get_by_order(order_id)
            if payment is None or payment.status == PaymentStatus.CAPTURED:
                return
            payment.razorpay_payment_id = payment_id
            payment.status = PaymentStatus.CAPTURED
            user = await self.users.get(payment.user_id)
            if user is not None:
                user.membership_tier = payment.tier
