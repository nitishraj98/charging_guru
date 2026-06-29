# 04 · Database Design (PostgreSQL 16)

## 1. Conventions

- **Engine:** PostgreSQL 16 + **PostGIS** (geospatial) + `pgcrypto` (field encryption) + `uuid` (UUIDv7 via app or `pg_uuidv7`).
- **PKs:** `uuid` (UUIDv7, time-sortable) for domain entities; `bigserial` for append-only logs (`*_history`, `audit_logs`, `transactions`).
- **Money:** `bigint` minor units (paise). **Never** float.
- **Time:** `timestamptz`, stored UTC. Every table has `created_at`, `updated_at` (trigger-maintained).
- **Soft delete:** `deleted_at timestamptz NULL` on user-facing entities; hard delete only via admin + audit.
- **Enums:** native PG `ENUM` types for stable sets; lookup tables where values churn.
- **Naming:** snake_case, plural tables, `fk_`, `idx_`, `uq_`, `ck_` prefixes for constraints.

## 2. Enumerated Types

```sql
CREATE TYPE user_status      AS ENUM ('ACTIVE','SUSPENDED','DELETED');
CREATE TYPE connector_type   AS ENUM ('CCS2','TYPE2','CHADEMO','GBT','BHARAT_AC','BHARAT_DC');
CREATE TYPE charger_status   AS ENUM ('AVAILABLE','BOOKED','OCCUPIED','OFFLINE','MAINTENANCE');
CREATE TYPE station_status   AS ENUM ('PENDING_APPROVAL','ACTIVE','SUSPENDED','REJECTED');
CREATE TYPE booking_status   AS ENUM ('PENDING_PAYMENT','CONFIRMED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED','EXPIRED','NO_SHOW');
CREATE TYPE session_status   AS ENUM ('STARTED','IN_PROGRESS','COMPLETED','ABORTED');
CREATE TYPE payment_status   AS ENUM ('CREATED','AUTHORIZED','CAPTURED','FAILED','REFUND_PENDING','REFUNDED','PARTIAL_REFUND');
CREATE TYPE txn_type         AS ENUM ('CHARGE','REFUND','PAYOUT','ADJUSTMENT','SUBSCRIPTION');
CREATE TYPE sub_tier         AS ENUM ('FREE','SILVER','GOLD');
CREATE TYPE sub_status       AS ENUM ('ACTIVE','CANCELLED','EXPIRED','PAST_DUE');
CREATE TYPE notif_channel    AS ENUM ('PUSH','SMS','EMAIL','INAPP');
```

## 3. Table-by-Table Schema

> Full DDL is abbreviated to the load-bearing columns/constraints. `created_at/updated_at` omitted for brevity but present on all tables.

### roles & users

```sql
CREATE TABLE roles (
  id          smallserial PRIMARY KEY,
  name        text UNIQUE NOT NULL CHECK (name IN ('ROLE_USER','ROLE_STATION_OWNER','ROLE_ADMIN'))
);

CREATE TABLE users (
  id              uuid PRIMARY KEY,
  phone           text UNIQUE NOT NULL,                 -- E.164, verified
  email           text UNIQUE,                          -- nullable
  full_name       text,
  profile_image   text,                                 -- S3 key
  email_enc       bytea,                                -- pgcrypto if PII-at-rest required
  status          user_status NOT NULL DEFAULT 'ACTIVE',
  reward_points   bigint NOT NULL DEFAULT 0,
  referral_code   text UNIQUE NOT NULL,
  referred_by     uuid REFERENCES users(id),
  deleted_at      timestamptz,
  CHECK (phone ~ '^\+[1-9]\d{7,14}$')
);

CREATE TABLE user_roles (        -- many-to-many
  user_id  uuid REFERENCES users(id) ON DELETE CASCADE,
  role_id  smallint REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);
```

### user_sessions (device/session tracking)

```sql
CREATE TABLE user_sessions (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL,            -- store hash only
  device_id         text,
  device_name       text,
  platform          text,                      -- ios/android/web
  ip                inet,
  user_agent        text,
  expires_at        timestamptz NOT NULL,
  revoked_at        timestamptz,
  last_seen_at      timestamptz
);
CREATE INDEX idx_sessions_user ON user_sessions(user_id) WHERE revoked_at IS NULL;
```

### otp_requests

```sql
CREATE TABLE otp_requests (
  id           uuid PRIMARY KEY,
  phone        text NOT NULL,
  code_hash    text NOT NULL,                  -- hashed OTP
  purpose      text NOT NULL DEFAULT 'LOGIN',
  attempts     smallint NOT NULL DEFAULT 0,
  max_attempts smallint NOT NULL DEFAULT 5,
  expires_at   timestamptz NOT NULL,
  consumed_at  timestamptz,
  ip           inet
);
CREATE INDEX idx_otp_phone_active ON otp_requests(phone, expires_at) WHERE consumed_at IS NULL;
```

### vehicles

```sql
CREATE TABLE vehicles (
  id               uuid PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand            text NOT NULL,
  model            text NOT NULL,
  battery_kwh      numeric(6,2) NOT NULL CHECK (battery_kwh > 0),
  range_km         integer CHECK (range_km > 0),
  connector_type   connector_type NOT NULL,
  is_default       boolean NOT NULL DEFAULT false,
  deleted_at       timestamptz
);
CREATE INDEX idx_vehicles_user ON vehicles(user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_vehicle_default ON vehicles(user_id) WHERE is_default AND deleted_at IS NULL;
```

### station_owners & stations

```sql
CREATE TABLE station_owners (
  id            uuid PRIMARY KEY,
  user_id       uuid NOT NULL UNIQUE REFERENCES users(id),
  business_name text NOT NULL,
  gstin         text,
  kyc_status    text NOT NULL DEFAULT 'PENDING',
  payout_account text                          -- tokenized bank ref
);

CREATE TABLE stations (
  id            uuid PRIMARY KEY,
  owner_id      uuid NOT NULL REFERENCES station_owners(id),
  name          text NOT NULL,
  address       text NOT NULL,
  city          text, state text, pincode text,
  geog          geography(Point,4326) NOT NULL,    -- PostGIS
  amenities     jsonb NOT NULL DEFAULT '[]',        -- ['cafe','restroom','wifi']
  status        station_status NOT NULL DEFAULT 'PENDING_APPROVAL',
  rating_avg    numeric(2,1) DEFAULT 0,
  rating_count  integer DEFAULT 0,
  deleted_at    timestamptz
);
CREATE INDEX idx_stations_geog  ON stations USING gist (geog);   -- spatial
CREATE INDEX idx_stations_status ON stations(status) WHERE deleted_at IS NULL;
```

### chargers & charger_status_history

```sql
CREATE TABLE chargers (
  id              uuid PRIMARY KEY,
  station_id      uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  label           text NOT NULL,                 -- "Bay 1"
  charger_type    text NOT NULL,                 -- AC/DC
  power_kw        numeric(6,2) NOT NULL CHECK (power_kw > 0),
  connector_type  connector_type NOT NULL,
  status          charger_status NOT NULL DEFAULT 'AVAILABLE',
  price_per_kwh   bigint NOT NULL,               -- paise
  deleted_at      timestamptz,
  UNIQUE (station_id, label)
);
CREATE INDEX idx_chargers_station ON chargers(station_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chargers_lookup  ON chargers(connector_type, status, power_kw);

CREATE TABLE charger_status_history (   -- append-only, partition by month
  id           bigserial,
  charger_id   uuid NOT NULL REFERENCES chargers(id),
  old_status   charger_status,
  new_status   charger_status NOT NULL,
  changed_by   uuid,                    -- owner/system
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);
```

### booking_slots & bookings

```sql
-- Pre-generated or virtual slots per charger; here as materialized slots.
CREATE TABLE booking_slots (
  id           uuid PRIMARY KEY,
  charger_id   uuid NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
  slot_start   timestamptz NOT NULL,
  slot_end     timestamptz NOT NULL,
  is_blocked   boolean NOT NULL DEFAULT false,  -- maintenance block
  CHECK (slot_end > slot_start),
  EXCLUDE USING gist (                          -- no overlapping slots per charger
    charger_id WITH =,
    tstzrange(slot_start, slot_end) WITH &&
  )
);
CREATE INDEX idx_slots_charger_time ON booking_slots(charger_id, slot_start);

CREATE TABLE bookings (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id),
  vehicle_id      uuid REFERENCES vehicles(id),
  station_id      uuid NOT NULL REFERENCES stations(id),
  charger_id      uuid NOT NULL REFERENCES chargers(id),
  slot_id         uuid NOT NULL REFERENCES booking_slots(id),
  status          booking_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  amount          bigint NOT NULL,              -- paise (quote)
  hold_expires_at timestamptz,                  -- payment hold TTL
  qr_jti          uuid,                         -- QR token id (for replay defense)
  created_at      timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);              -- monthly partitions
-- Guarantee one active booking per slot:
CREATE UNIQUE INDEX uq_active_slot ON bookings(slot_id)
  WHERE status IN ('PENDING_PAYMENT','CONFIRMED','CHECKED_IN','IN_PROGRESS');
CREATE INDEX idx_bookings_user ON bookings(user_id, created_at DESC);
CREATE INDEX idx_bookings_station ON bookings(station_id, created_at DESC);
CREATE INDEX idx_bookings_status_hold ON bookings(status, hold_expires_at)
  WHERE status = 'PENDING_PAYMENT';
```

### charging_sessions

```sql
CREATE TABLE charging_sessions (
  id            uuid PRIMARY KEY,
  booking_id    uuid NOT NULL UNIQUE REFERENCES bookings(id),
  charger_id    uuid NOT NULL REFERENCES chargers(id),
  user_id       uuid NOT NULL REFERENCES users(id),
  status        session_status NOT NULL DEFAULT 'STARTED',
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  energy_kwh    numeric(8,3),
  start_soc     smallint, end_soc smallint,
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX idx_sessions_charger ON charging_sessions(charger_id, started_at DESC);
```

### payments, transactions, invoices

```sql
CREATE TABLE payments (
  id                uuid PRIMARY KEY,
  booking_id        uuid REFERENCES bookings(id),
  subscription_id   uuid,
  user_id           uuid NOT NULL REFERENCES users(id),
  razorpay_order_id text UNIQUE,
  razorpay_payment_id text UNIQUE,
  amount            bigint NOT NULL,            -- paise
  currency          text NOT NULL DEFAULT 'INR',
  status            payment_status NOT NULL DEFAULT 'CREATED',
  method            text,                       -- upi/card/netbanking
  idempotency_key   text UNIQUE,
  raw_webhook       jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);

CREATE TABLE transactions (        -- ledger, append-only, partitioned
  id            bigserial,
  payment_id    uuid REFERENCES payments(id),
  user_id       uuid NOT NULL,
  type          txn_type NOT NULL,
  amount        bigint NOT NULL,               -- signed paise
  balance_after bigint,                        -- wallet/credits if used
  ref           text,
  created_at    timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE TABLE invoices (
  id            uuid PRIMARY KEY,
  booking_id    uuid REFERENCES bookings(id),
  user_id       uuid NOT NULL REFERENCES users(id),
  number        text UNIQUE NOT NULL,          -- GST-compliant series
  subtotal      bigint NOT NULL,
  tax           bigint NOT NULL,
  total         bigint NOT NULL,
  pdf_s3_key    text,
  issued_at     timestamptz NOT NULL DEFAULT now()
);
```

### rewards, referrals, subscriptions

```sql
CREATE TABLE rewards (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id),
  points      integer NOT NULL,                -- +earn / -redeem
  reason      text NOT NULL,                   -- 'SESSION','REFERRAL','PROMO'
  ref_id      uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rewards_user ON rewards(user_id, created_at DESC);

CREATE TABLE referrals (
  id            uuid PRIMARY KEY,
  referrer_id   uuid NOT NULL REFERENCES users(id),
  referee_id    uuid NOT NULL REFERENCES users(id),
  status        text NOT NULL DEFAULT 'PENDING', -- PENDING/REWARDED
  rewarded_at   timestamptz,
  UNIQUE (referee_id)                            -- a user can be referred once
);

CREATE TABLE subscriptions (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id),
  tier            sub_tier NOT NULL,
  status          sub_status NOT NULL DEFAULT 'ACTIVE',
  current_period_end timestamptz,
  razorpay_sub_id text,
  UNIQUE (user_id) DEFERRABLE
);
```

### reviews & photos

```sql
CREATE TABLE reviews (
  id          uuid PRIMARY KEY,
  station_id  uuid NOT NULL REFERENCES stations(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  booking_id  uuid REFERENCES bookings(id),     -- verified-stay reviews
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  status      text NOT NULL DEFAULT 'PUBLISHED', -- PUBLISHED/HIDDEN/FLAGGED
  UNIQUE (user_id, booking_id)
);
CREATE INDEX idx_reviews_station ON reviews(station_id, created_at DESC);

CREATE TABLE photos (
  id          uuid PRIMARY KEY,
  owner_type  text NOT NULL,        -- 'STATION','REVIEW','USER'
  owner_id    uuid NOT NULL,
  s3_key      text NOT NULL,
  status      text NOT NULL DEFAULT 'PENDING'  -- moderation
);
CREATE INDEX idx_photos_owner ON photos(owner_type, owner_id);
```

### notifications & audit_logs

```sql
CREATE TABLE notifications (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES users(id),
  channel     notif_channel NOT NULL,
  title       text, body text,
  data        jsonb,
  read_at     timestamptz,
  sent_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user_unread ON notifications(user_id) WHERE read_at IS NULL;

CREATE TABLE audit_logs (          -- append-only, partitioned
  id          bigserial,
  actor_id    uuid,
  actor_role  text,
  action      text NOT NULL,       -- 'STATION_APPROVED','REFUND_ISSUED'
  entity_type text, entity_id uuid,
  before      jsonb, after jsonb,
  ip          inet,
  created_at  timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);
```

### fleet (Phase 3)

```sql
CREATE TABLE fleets (
  id            uuid PRIMARY KEY,
  name          text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id),
  gstin         text,
  billing_email text
);
CREATE TABLE fleet_members (
  fleet_id uuid REFERENCES fleets(id),
  user_id  uuid REFERENCES users(id),
  role     text DEFAULT 'DRIVER',
  PRIMARY KEY (fleet_id, user_id)
);
```

## 4. Key Constraints Summary

| Concern | Mechanism |
|---------|-----------|
| No double-booking | partial UNIQUE on `bookings(slot_id)` for active states + Redis lock |
| No overlapping slots | GiST `EXCLUDE` on `booking_slots(charger_id, tstzrange)` |
| One default vehicle | partial UNIQUE on `vehicles(user_id) WHERE is_default` |
| Payment idempotency | UNIQUE `payments.idempotency_key`, `razorpay_order_id` |
| One referral per referee | UNIQUE `referrals(referee_id)` |
| Verified reviews | FK `reviews.booking_id` + UNIQUE `(user_id, booking_id)` |
| Money integrity | `bigint` paise, CHECKs, ledger in `transactions` |

## 5. Indexing Strategy

- **Spatial:** GiST on `stations.geog` for radius + corridor (`ST_DWithin`).
- **Hot lookups:** composite `chargers(connector_type, status, power_kw)`; `bookings(user_id, created_at DESC)`.
- **Partial indexes** for active-state filters (cheaper, smaller).
- **Covering/INCLUDE** indexes for availability reads where helpful.
- Periodic `pg_stat_statements` review → add/prune indexes; avoid over-indexing write-hot tables (`bookings`, `transactions`).

## 6. Partitioning Strategy

High-volume / time-series tables are **range-partitioned by month**, with automated partition creation (pg_partman or Celery Beat job) and retention policies:

| Table | Partition key | Retention | Rationale |
|-------|---------------|-----------|-----------|
| `bookings` | `created_at` monthly | hot 12m, archive to S3 after | 50k/day = ~1.5M/month |
| `transactions` | `created_at` monthly | 7y (financial/GST) | ledger volume |
| `charger_status_history` | `created_at` monthly | 6–12m | telemetry churn |
| `audit_logs` | `created_at` monthly | 1–2y compliance | append-heavy |
| `notifications` | `created_at` monthly | 3–6m | high churn |

- Old partitions detached → exported to S3 (Parquet) for the analytics warehouse.
- Queries always include `created_at` predicate to enable **partition pruning**.

## 7. Read/Write Routing

- Writes → primary. Reads for discovery, history, admin reports, analytics → **read replicas** (SQLAlchemy bind routing / separate session factories).
- Strongly-consistent reads (just-wrote-then-read in booking) pinned to primary.

## 8. Migrations

- **Alembic** with autogenerate + manual review. Each migration: forward + tested downgrade.
- Online/zero-downtime patterns: add nullable column → backfill (batched Celery) → add constraint `NOT VALID` → `VALIDATE` → set NOT NULL. Create indexes `CONCURRENTLY` outside transactions.
- Enum changes via `ADD VALUE` (additive) only; never reorder.
