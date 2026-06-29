# 04 · Station Owner App — Screen Specs

Frame **390 × 844** (also responsive to **834 × 1194** tablet for desk use). Same dark system, but **operational density** over discovery. Accent reserved for revenue + "available". Tab bar: **Dashboard · Scan · Revenue · Chargers · Me**.

---

## 4.1 Dashboard — `Owner/Dashboard/Home`

**Purpose:** At-a-glance operating picture for today — bookings, utilization, revenue, alerts.

**Layout**
```
┌──────────────────────────────────────┐
│ GreenCharge Sector 62        ▾  🔔3   │  station switcher (multi-station) + alerts
│ ── Today ────────────────────────────  │
│ ┌─────────┐┌─────────┐┌─────────┐     │
│ │ ₹12,480 ││  38     ││  72%    │     │  Stat tiles (mono, count-up):
│ │ Revenue ││ Sessions││  Util.  │     │  revenue · sessions · utilization
│ │ ▲14%    ││ ▲6      ││ ▲8%     │     │  delta chips + sparkline
│ └─────────┘└─────────┘└─────────┘     │
│ ── Live chargers ──────────────────── │
│ ◉◉◉○  Bay1● Bay2◐ Bay3◉ Bay4🔧        │  live status row (real-time)
│ ── Upcoming bookings ───────────────── │
│ │ 7:00 Ria · Bay1 · CCS2   [Verify]  │ │  next-up list with quick verify
│ │ 7:30 Amit · Bay3 …                 │ │
│ ── Alerts ──  🔧 Bay4 maintenance 2d   │
│              [   Scan a pass   ]        │  prominent scan CTA
└──────────────────────────────────────┘
```
**Components:** Station switcher, Alert bell, Stat Tiles (sparkline + delta), Live charger status row, Upcoming bookings list, Alerts, Scan CTA.
**States:** multi-station rollup vs single · no bookings today (empty) · alert present (amber banner) · offline charger (red flag).
**Motion:** stat values count-up on load; live row dots crossfade on status change; "in session" bays pulse.

---

## 4.2 QR Scanner — `Owner/Scan/Verify`

**Purpose:** Scan a customer pass, verify instantly, start the session.

**Layout**
```
┌──────────────────────────────────────┐
│ ←  Scan pass                      ⚡   │
│                                        │
│        camera viewfinder               │  full-bleed camera
│     ┌───────────────────┐              │
│     │   ╔═══════════╗    │   ← reticle  │  Volt corner brackets, scan-line sweep
│     │   ║  align QR ║    │              │
│     │   ╚═══════════╝    │              │
│     └───────────────────┘              │
│   Point at the customer's QR pass      │  helper
│   [ Enter code manually ]              │  fallback
└──────────────────────────────────────┘
        ↓ on successful verify ↓
┌──────────────────────────────────────┐
│        ✓  Verified                    │  success sheet (Volt glow)
│  Ria Sharma · Nexon EV · CCS2          │
│  Bay 1 · 7:00–7:45 · ₹402 paid ●       │
│            [  Start session  ]          │  primary CTA
└──────────────────────────────────────┘
```
**Components:** Camera viewfinder, Volt reticle + scan-line, Manual-code fallback, **Verify result sheet** (success/fail), Start-session CTA.
**Verify failure states (calm, explicit):** Expired pass · Already used · Wrong station · Payment not captured · Invalid signature — each with icon, reason, and resolution (e.g., "Ask customer to re-open pass").
**Motion:** scan-line sweeps continuously; on detect → reticle snaps Volt + haptic; success sheet rises with glow.

---

## 4.3 Revenue — `Owner/Revenue/Home`

**Purpose:** Earnings clarity, payouts, trends, per-charger breakdown.

**Layout**
```
┌──────────────────────────────────────┐
│ Revenue            [ This month ▾ ]   │  period selector
│ ┌──── earnings card ────────────────┐ │
│ │  ₹3,84,200                         │ │  big mono total + count-up
│ │  ▲ 18% vs last month               │ │
│ │  ┌ bar/area chart (Volt) ────────┐ │ │  daily revenue chart
│ │  └────────────────────────────────┘│ │
│ └────────────────────────────────────┘│
│ ── Payouts ──  Next ₹2,10,000 · 18 Jun │  payout schedule + status
│ ── By charger ──                        │
│ │ Bay1  ₹1,40k ▓▓▓▓▓▓▓ 72% util       │ │  per-charger utilization bars
│ │ Bay3  ₹98k   ▓▓▓▓▓   54%            │ │
│ ── By time ──  utilization heatmap      │  hour×day heatmap (carbon→Volt)
│  [ Download statement ]                 │
└──────────────────────────────────────┘
```
**Components:** Period selector, Earnings card + chart, Payout schedule, Per-charger utilization bars, Utilization heatmap, Statement export (→ async S3 link).
**States:** loading (skeleton chart) · pending payout · dispute/hold flag · zero-revenue period.
**Motion:** total count-up; chart bars grow `--ease-decel`; heatmap cells fade in.

---

## 4.4 Charger Control — `Owner/Chargers/Control`

**Purpose:** Manage each charger's status, pricing, and maintenance — with real-time propagation to users.

**Layout**
```
┌──────────────────────────────────────┐
│ ←  Chargers · GreenCharge Sector 62   │
│ ┌── Bay 1 ────────────────────────── │
│ │ ⚡ CCS2 · 60 kW          ● Available │ │  status (live)
│ │ Status  [Available|Offline|Maint.]  │ │  segmented control
│ │ Price   ₹ 18 /kWh            [edit]  │ │
│ │ Today   12 sessions · ₹1,480         │ │  mini stats
│ └──────────────────────────────────── │
│ ┌── Bay 2 …  ◐ Booked (locked) ────── │  booked → status change warns
│ ┌── Bay 3 …  ◉ In session (live) ───── │  shows live session: ▓▓▓▓ 64% · 18 min
│ ┌── Bay 4 …  🔧 Maintenance ────────── │  maintenance note + ETA
│  [ + Add charger ]   [ Bulk status ]   │
└──────────────────────────────────────┘
```
**Components:** Charger cards, Status segmented control (Available/Offline/Maintenance), Price editor, Live-session progress (charge bar), Add charger, Bulk status.
**States:** changing-status confirm (if active/future bookings → "3 bookings affected — notify & refund?") · maintenance scheduler (date + note) · in-session lock (cannot offline mid-charge).
**Motion:** optimistic status toggle (animates immediately, reverts on conflict); in-session card pulses + charge bar shimmer.
**Notes:** every change writes status history + propagates to user apps via WebSocket (see backend availability service).
