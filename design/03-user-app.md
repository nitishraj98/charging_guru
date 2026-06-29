# 03 · User App — Screen Specs

Frame **390 × 844**. Dark default. Each screen: **Purpose · Layout · Components · States · Motion · Figma frame**.
Tab bar (floating glass): **Home · Plan · ⚡QR(center) · Trips · Profile**.

---

## 3.1 Home (Discovery) — `User/Discovery/Home`

**Purpose:** Land in a map-first world; see chargers near me; one tap to plan or book.

**Layout**
```
┌──────────────────────────────────────┐
│  ◐ 82%   Good evening, Ria      ⚙ 🔔 │  ← glass top bar: vehicle SoC chip + greeting
│  ┌──────────────────────────────────┐ │
│  │ 🔍  Where to?            🎙  ⚙   │ │  ← Search/Plan launcher (glass)
│  └──────────────────────────────────┘ │
│   [ Near me ][ ⚡Fast ][ CCS2 ][ ⭐ ]  │  ← filter chips (horizontal scroll)
│                                        │
│            • MAP CANVAS •              │  ← markers status-colored, user puck
│        ◉   ◉        ◉                   │
│              ◉(you)                     │
│                                        │
│  ┌───────────── grabber ────────────┐ │
│  │ 6 chargers nearby      Sort ▾     │ │  ← Bottom sheet (peek→half)
│  │ ┌──────────────────────────────┐ │ │
│  │ │● GreenCharge Sector 62        │ │ │  station card: status dot,
│  │ │  2.1 km · ⚡60kW CCS2 · ₹18    │ │ │  distance, power, price,
│  │ │  ◉◉◉○  3/4 available    [Book] │ │ │  availability pips, rating
│  │ └──────────────────────────────┘ │ │
│  │ ┌── next station card … ───────┐ │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
        [ Home  Plan  ⚡  Trips  Me ]
```
**Components:** SoC chip, Search launcher, Filter chips, Map + markers, Station Card (list), Sort menu, Tab bar.
**States:** loading (skeleton cards + dimmed map) · empty ("No chargers in range — widen search" + CTA) · location-denied (prompt card) · offline (cached results banner).
**Motion:** markers stagger-drop; available markers bolt-pulse; sheet snaps; SoC chip ticks on focus.
**Notes:** primary action density = 1 (Book). Tapping a card focuses its marker and expands sheet to half.

---

## 3.2 Route Planner — `User/Plan/RoutePlanner`

**Purpose:** Enter source→destination, get optimal charging stops with arrival SoC and ETA. The hero differentiator.

**Layout**
```
┌──────────────────────────────────────┐
│ ←  Plan your trip                     │
│ ┌──────────────────────────────────┐ │
│ │ ◉ Noida Sector 62                 │ │  origin (auto = current)
│ │ │                              ⇅ │ │  swap
│ │ ◎ Patna, Bihar                    │ │  destination (Places autocomplete)
│ └──────────────────────────────────┘ │
│ Vehicle  [ Nexon EV ▾ ]   SoC ◐ 80%  │  ← vehicle + starting charge slider
│                                        │
│        • MAP with Volt route •        │  ← route draws; stop markers w/ battery rings
│      ◉━━━━━⚡━━━━━━⚡━━━━━◎             │
│                                        │
│ ┌──────────────── sheet (full) ─────┐ │
│ │ 1015 km · ~18h · 2 charging stops │ │  trip summary (mono metrics)
│ │ ───────── Route Energy Track ──── │ │
│ │ ◉ 80% ───▼ Stop 1 ── 80% ──▼ Stop2│ │  SoC-gradient timeline, bolt nodes
│ │                                    │ │
│ │ ⚡ Stop 1 · GreenCharge Lucknow    │ │  stop card:
│ │   arrive 18% → charge to 80%       │ │  arrival SoC (red), target,
│ │   ~45 min · ₹612 · 3 open   [Book] │ │  duration, cost, availability
│ │ ⚡ Stop 2 · VoltHub Varanasi …     │ │
│ └────────────────────────────────────┘│
│           [  Reserve all stops  ]      │  sticky primary CTA
└──────────────────────────────────────┘
```
**Components:** Origin/Dest inputs (Places), Swap, Vehicle picker, SoC slider, Map route, **Route Energy Track**, Stop cards w/ Battery Ring, Reserve-all CTA.
**States:** computing (route shimmer + "Finding the smartest stops…") · no-stops-needed ("You'll arrive with 31% — no charging needed 🎉") · no-station-in-range (warn + widen connector filter) · maps-degraded (cached banner).
**Motion:** route stroke draws; energy track fills with SoC gradient; stop nodes spring-pop; arrival SoC numbers tick.
**Notes:** changing vehicle/SoC recomputes live with a subtle re-draw. Each stop independently bookable.

---

## 3.3 Charging Station Details — `User/Discovery/StationDetail`

**Purpose:** Decide on a station; pick a charger; see live availability, amenities, reviews.

**Layout**
```
┌──────────────────────────────────────┐
│ [ hero photo carousel ]          ← ♡ │
│ GreenCharge Sector 62      ● 3/4 open │  title + live status pill
│ ⭐ 4.6 (212) · 2.1 km · Open 24h       │
│ [ Directions ] [ Share ]              │  secondary actions
│ ── Chargers ───────────────────────── │
│ ┌──────────────────────────────────┐ │
│ │ Bay 1  ⚡CCS2 60kW   ● Available   │ │  charger row: connector tag,
│ │        ₹18/kWh             [Select]│ │  power, status, price
│ │ Bay 2  ⚡CCS2 60kW   ◐ Booked      │ │
│ │ Bay 3  🔌Type2 22kW ● In session  │ │
│ │ Bay 4  ⚡CCS2 60kW   🔧 Maintenance│ │
│ └──────────────────────────────────┘ │
│ ── Amenities ──  ☕ 🚻 📶 🅿 🛒        │
│ ── Reviews ────  rating bars + cards  │
│                                        │
│            [  Select Bay 1  ]          │  sticky CTA (enabled on select)
└──────────────────────────────────────┘
```
**Components:** Photo carousel, Live status pill, Charger rows (status-coded), Connector tags, Amenity icons, Review summary + cards, sticky Select CTA, live availability via WebSocket.
**States:** all-occupied ("Notify me when free" + queue ETA) · single-charger station (collapse list) · loading (skeleton) · unavailable charger rows disabled with reason.
**Motion:** "In session" rows show charging pulse; status changes animate dot color crossfade in real time.

---

## 3.4 Booking — `User/Booking/SlotPicker`

**Purpose:** Choose time slot, confirm vehicle, review price; hold a slot.

**Layout**
```
┌──────────────────────────────────────┐
│ ←  Book · GreenCharge · Bay 1         │
│ Today  Tue  Wed  Thu  Fri             │  date selector
│ ── Available slots ─────────────────── │
│ [6:00][6:30]●[7:00][7:30][8:00] …      │  slot chips (● selected, dim=taken)
│ Duration  [ 30m ][ 45m ][ 60m ]        │  est. from SoC target
│ Vehicle   [ Nexon EV · CCS2 ▾ ]        │
│ ── Estimate ─────────────────────────  │
│ Energy ~24 kWh        ₹432             │  mono metrics
│ Booking fee           ₹10              │
│ GOLD discount        −₹40              │
│ ─────────────────────────────         │
│ Total                 ₹402             │
│ ⏳ Slot held for 04:58                  │  hold countdown (appears after tap)
│            [  Continue to pay  ]        │  primary CTA
└──────────────────────────────────────┘
```
**Components:** Date selector, Slot chips, Duration toggle, Vehicle picker, Price breakdown (mono), Hold countdown, CTA.
**States:** slot-taken-midflow (toast "That slot just went" + auto-suggest nearest) · no-slots-today (jump to next day) · hold-expiring (countdown turns amber <60s).
**Motion:** selected slot fills Volt; price block count-up; hold ring depletes.

---

## 3.5 Payment — `User/Booking/Payment`

**Purpose:** Pay via Razorpay with total clarity and trust.

**Layout**
```
┌──────────────────────────────────────┐
│ ←  Payment                            │
│ ┌──── order summary card ───────────┐ │
│ │ GreenCharge · Bay 1 · 7:00–7:45   │ │
│ │ Nexon EV · ~24 kWh                │ │
│ │ Total              ₹402           │ │  big mono total
│ │ ⏳ Hold 03:42                      │ │
│ └────────────────────────────────────┘│
│ Pay with                              │
│ ( ) UPI   ( ) Card   ( ) Netbanking   │  method radios (Razorpay)
│ [ apply reward points · 120 = ₹24 ]   │  redeem toggle
│ 🔒 Secured by Razorpay                 │
│            [  Pay ₹402  ]              │  primary CTA → Razorpay sheet
└──────────────────────────────────────┘
```
**Components:** Order summary, Hold countdown, Payment method (Razorpay), Reward redeem toggle, Trust line, Pay CTA.
**States:** processing (Volt charge spinner overlay "Confirming payment…") · success (full-screen battery-fill→100% + check, →QR Pass) · failed (calm retry + "slot still held 02:10") · hold-expired (re-quote flow).
**Motion:** success = battery ring fills to 100% + glow bloom + success haptic.

---

## 3.6 QR Pass — `User/Booking/QRPass`

**Purpose:** Present at station; clear validity; quick directions.

**Layout**
```
┌──────────────────────────────────────┐
│         Your charging pass            │
│  ╭───────────── ticket ─────────────╮ │
│  │  GreenCharge · Bay 1              │ │
│  │  ┌────────────────────┐           │ │
│  │  │   ▓▓ Volt QR ▓▓     │  ◷ 44:12  │ │  QR (Volt on carbon-1000) + countdown ring
│  │  └────────────────────┘           │ │
│  │ ·····perforation·····             │ │
│  │  Ria · Nexon EV · CCS2            │ │
│  │  Tue 7:00–7:45 PM                 │ │
│  │  ● Valid                          │ │  status chip
│  ╰───────────────────────────────────╯│
│  [ Directions ]   [ Add to Wallet ]    │
│  Show this to the operator to start.   │  helper text
└──────────────────────────────────────┘
```
**Components:** QR ticket card (notch + perforation), Countdown ring, Status chip (Valid/Used/Expired), Directions, Wallet add.
**States:** valid · checked-in (→ live session view) · used (dimmed + ✓) · expired (greyed + rebook CTA).
**Motion:** countdown ring depletes; on operator scan → ticket flips to "Verified ✓" + charging pulse begins.

---

## 3.7 Rewards — `User/Rewards/Home`

**Purpose:** Make clean-energy habit feel rewarding; surface tier, points, referrals.

**Layout**
```
┌──────────────────────────────────────┐
│  Rewards                              │
│ ┌──── tier card (glass + glow) ──────┐│
│ │ GOLD ⚡           1,240 pts         ││  big mono balance
│ │ ▓▓▓▓▓▓▓▓░░  760 pts to next perk    ││  progress bar (SoC-style)
│ │ 2× points · 10% off · priority      ││
│ └────────────────────────────────────┘│
│ [ Redeem ]   [ Refer & earn ]         │
│ ── This week ──  120 km clean · +50pts │  eco impact stat tiles
│ ── Activity ─── ledger rows (earn/use) │
└──────────────────────────────────────┘
```
**Components:** Tier card (glow by tier), Points balance (mono), Progress bar, Redeem/Refer CTAs, Eco stat tiles, Ledger list.
**States:** FREE tier (upsell to SILVER/GOLD) · empty ledger · referral pending.
**Motion:** points ticker count-up; tier upgrade = confetti-free Volt bloom + badge morph.

---

## 3.8 Profile — `User/Profile/Home`

**Purpose:** Identity, vehicles, payments, sessions/devices, settings.

**Layout**
```
┌──────────────────────────────────────┐
│  Ria Sharma            GOLD ⚡          │
│  +91 98765 43210 · ✓ verified          │
│ ── My vehicles ──────────────────────  │
│  🚗 Tata Nexon EV · CCS2 · 40.5kWh  ★  │  default badge
│  + Add vehicle                         │
│ ── Membership ──  GOLD · renews 12 Jul │
│ ── Payments ────  history · invoices    │
│ ── Security ────  devices & sessions    │  device list w/ revoke
│ ── Preferences ──  theme · units · lang │
│  [ Log out ]                           │
└──────────────────────────────────────┘
```
**Components:** Profile header (tier), Vehicle cards (connector tag, default star), Membership row, Payments/Invoices, Devices/Sessions (revoke), Preferences (incl. Dark/Light), Logout.
**States:** unverified email (CTA) · no vehicles (empty + add) · single device.
**Motion:** vehicle add = slide-up sheet; device revoke = row collapse.

---

### State coverage to deliver per screen
Loading (skeleton) · Empty · Error/offline · Success/confirmation. Build these as Figma variants on each screen frame.
