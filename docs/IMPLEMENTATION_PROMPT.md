# Charging Guru -- Production Implementation Prompt

## Objective

Convert the current prototype into a production-ready EV charging
platform. Do not use dummy data, mock APIs, placeholder values, or
hardcoded content where a real backend/API exists.

## 1. Google Maps Integration

-   Google Places Autocomplete for Origin/Destination
-   Search by city, address, landmark, charging station
-   Save place ID, lat/lng, formatted address
-   Validate before planning

## 2. Route Planning

-   Google Directions API
-   Distance, ETA, polyline, traffic-aware duration
-   Display actual route

## 3. EV Charging Stops

-   Backend/Open Charge Map/open government datasets where applicable
-   Smart charging stop recommendations
-   Availability, pricing, speed, connector, amenities

## 4. Vehicles

-   Load logged-in user's vehicles
-   Add/Edit/Delete/Default
-   No hardcoded vehicles

## 5. Profile

-   Profile
-   Addresses
-   Favourite stations
-   Saved routes
-   Vehicles
-   Booking history
-   Membership
-   Notifications

## 6. Booking

Search → Availability → Reserve → Payment → Confirmation → QR → Status →
Cancel → Refund

## 7. Payments

-   Razorpay
-   Stripe-ready architecture
-   Orders, verification, webhooks, refunds

## 8. Authentication

-   Login
-   Signup
-   OTP
-   Refresh token
-   RBAC

## 9. Live Station Data

Use backend: - Availability - Pricing - Queue - Reviews - Ratings

## 10. Maps

-   Google Maps
-   Current location
-   Stations
-   Route
-   Charging stops

## 11. API Quality

-   Retry
-   Caching
-   Cancellation
-   Loading
-   Error handling
-   No duplicate requests

## 12. Remove Dummy Data

Replace all placeholder data with backend integrations.

## 13. Production Quality

-   Validation
-   Accessibility
-   Responsive
-   Skeletons
-   Error boundaries
-   Typed APIs

## 14. Third-Party APIs

Priority: 1. Government/Open Data 2. Free APIs 3. Freemium 4. Paid only
if required

Examples: - Google Maps/Places/Directions - Open Charge Map - e-AMRIT
(official API/open dataset if available) - OpenWeather - Firebase -
Twilio Verify / MSG91 - Mailgun / Resend - Razorpay

## 15. Service Layer

Create reusable services: - googleMaps - places - directions -
chargingStations - payment - notifications

Never call third-party APIs directly from UI components.

## 16. Fallback Strategy

-   Provider unavailable → backend/cached data
-   Backend unavailable → proper error state
-   Never fabricate data

## 17. Configuration

Use environment variables. Support Development, Staging and Production.

## 18. Documentation

Create: - IMPLEMENTATION_PROGRESS.md - THIRD_PARTY_SERVICES.md -
PERFORMANCE_REPORT.md

## Acceptance Criteria

-   Real APIs
-   Real vehicles
-   Real booking
-   Real payments
-   Real maps
-   No dummy data
-   Production-ready
