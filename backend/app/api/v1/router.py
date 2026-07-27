"""Aggregate all v1 routers."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import admin, admin_pricing, auth, bookings, membership, owner_applications, owner_finance, payments, qr, routes_api, rewards, sessions, stations, users, vehicles

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(vehicles.router)
api_router.include_router(stations.router)
api_router.include_router(bookings.router)
api_router.include_router(payments.router)
api_router.include_router(qr.router)
api_router.include_router(sessions.router)
api_router.include_router(routes_api.router)
api_router.include_router(owner_applications.router)
api_router.include_router(owner_finance.router)
api_router.include_router(rewards.router)
api_router.include_router(membership.router)
api_router.include_router(admin.router)
api_router.include_router(admin_pricing.router)
