# 05 · ER Diagram

> Rendered with Mermaid. Cardinalities: `||--o{` = one-to-many, `||--||` = one-to-one, `}o--o{` = many-to-many.

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : assigned
    USERS ||--o{ USER_SESSIONS : owns
    USERS ||--o{ VEHICLES : owns
    USERS ||--o{ BOOKINGS : makes
    USERS ||--o{ PAYMENTS : pays
    USERS ||--o{ REWARDS : earns
    USERS ||--o{ REVIEWS : writes
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o| SUBSCRIPTIONS : subscribes
    USERS ||--o| STATION_OWNERS : may_be
    USERS ||--o{ OTP_REQUESTS : requests
    USERS ||--o{ REFERRALS : refers

    STATION_OWNERS ||--o{ STATIONS : owns
    STATIONS ||--o{ CHARGERS : has
    STATIONS ||--o{ REVIEWS : receives
    STATIONS ||--o{ BOOKINGS : hosts
    STATIONS ||--o{ PHOTOS : has

    CHARGERS ||--o{ BOOKING_SLOTS : offers
    CHARGERS ||--o{ CHARGER_STATUS_HISTORY : logs
    CHARGERS ||--o{ BOOKINGS : booked_for
    CHARGERS ||--o{ CHARGING_SESSIONS : runs

    BOOKING_SLOTS ||--o| BOOKINGS : reserved_by
    VEHICLES ||--o{ BOOKINGS : used_in

    BOOKINGS ||--o| CHARGING_SESSIONS : starts
    BOOKINGS ||--o{ PAYMENTS : settled_by
    BOOKINGS ||--o| INVOICES : invoiced
    BOOKINGS ||--o| REVIEWS : reviewed

    PAYMENTS ||--o{ TRANSACTIONS : ledgered
    SUBSCRIPTIONS ||--o{ PAYMENTS : billed

    REVIEWS ||--o{ PHOTOS : includes
    FLEETS ||--o{ FLEET_MEMBERS : contains
    USERS ||--o{ FLEET_MEMBERS : joins

    USERS {
      uuid id PK
      text phone UK
      text email UK
      user_status status
      bigint reward_points
      text referral_code UK
      uuid referred_by FK
    }
    ROLES {
      smallint id PK
      text name UK
    }
    USER_SESSIONS {
      uuid id PK
      uuid user_id FK
      text refresh_token_hash
      text device_id
      timestamptz expires_at
      timestamptz revoked_at
    }
    OTP_REQUESTS {
      uuid id PK
      text phone
      text code_hash
      smallint attempts
      timestamptz expires_at
    }
    VEHICLES {
      uuid id PK
      uuid user_id FK
      text brand
      text model
      numeric battery_kwh
      connector_type connector_type
      bool is_default
    }
    STATION_OWNERS {
      uuid id PK
      uuid user_id FK
      text business_name
      text kyc_status
    }
    STATIONS {
      uuid id PK
      uuid owner_id FK
      text name
      geography geog
      station_status status
      numeric rating_avg
    }
    CHARGERS {
      uuid id PK
      uuid station_id FK
      numeric power_kw
      connector_type connector_type
      charger_status status
      bigint price_per_kwh
    }
    CHARGER_STATUS_HISTORY {
      bigserial id PK
      uuid charger_id FK
      charger_status new_status
      timestamptz created_at
    }
    BOOKING_SLOTS {
      uuid id PK
      uuid charger_id FK
      timestamptz slot_start
      timestamptz slot_end
      bool is_blocked
    }
    BOOKINGS {
      uuid id PK
      uuid user_id FK
      uuid charger_id FK
      uuid slot_id FK
      booking_status status
      bigint amount
      timestamptz hold_expires_at
      uuid qr_jti
    }
    CHARGING_SESSIONS {
      uuid id PK
      uuid booking_id FK
      session_status status
      numeric energy_kwh
    }
    PAYMENTS {
      uuid id PK
      uuid booking_id FK
      text razorpay_order_id UK
      bigint amount
      payment_status status
      text idempotency_key UK
    }
    TRANSACTIONS {
      bigserial id PK
      uuid payment_id FK
      txn_type type
      bigint amount
    }
    INVOICES {
      uuid id PK
      uuid booking_id FK
      text number UK
      bigint total
      text pdf_s3_key
    }
    REWARDS {
      bigserial id PK
      uuid user_id FK
      int points
      text reason
    }
    REFERRALS {
      uuid id PK
      uuid referrer_id FK
      uuid referee_id FK
      text status
    }
    SUBSCRIPTIONS {
      uuid id PK
      uuid user_id FK
      sub_tier tier
      sub_status status
    }
    REVIEWS {
      uuid id PK
      uuid station_id FK
      uuid user_id FK
      smallint rating
    }
    PHOTOS {
      uuid id PK
      text owner_type
      uuid owner_id
      text s3_key
    }
    NOTIFICATIONS {
      bigserial id PK
      uuid user_id FK
      notif_channel channel
    }
    AUDIT_LOGS {
      bigserial id PK
      uuid actor_id
      text action
    }
    FLEETS {
      uuid id PK
      uuid owner_user_id FK
    }
    FLEET_MEMBERS {
      uuid fleet_id FK
      uuid user_id FK
    }
```

## Relationship Notes

- A **user** may also be a **station owner** (1:0..1 via `station_owners.user_id`) and/or part of fleets.
- **Bookings** are the hub: linked to user, vehicle, station, charger, slot; spawn one optional **charging_session**, one optional **invoice**, many **payments** (retries/refunds), and one optional **review**.
- **booking_slots** ↔ **bookings** is 1:0..1 for *active* bookings (enforced by partial unique index), allowing slot reuse after cancellation/expiry.
- **transactions** form an append-only financial ledger under each payment.
- `AUDIT_LOGS` references actors loosely (no hard FK) so logs survive entity deletion.
