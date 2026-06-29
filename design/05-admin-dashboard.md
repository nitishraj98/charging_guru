# 05 · Admin Dashboard — Screen Specs

Frame **1440 × 1024** (desktop). Dark system, **information-dense**, data-viz forward. Left nav rail (264 / collapsed 72) + top bar (search, env, admin avatar + 2FA badge). Accent reserved for primary actions and "healthy/available" metrics.

**Global shell**
```
┌────────────────────────────────────────────────────────────────────┐
│ ⚡ Charging Guru · Admin        🔍 global search        env:prod  ◐ AK │
├──────────┬─────────────────────────────────────────────────────────┤
│ ▸ Overview│                                                          │
│ ▸ Maps    │                    CONTENT REGION                        │
│ ▸ Users   │                  (12-col grid, 24 gutter)                │
│ ▸ Stations│                                                          │
│ ▸ Bookings│                                                          │
│ ▸ Payments│                                                          │
│ ▸ Fraud   │                                                          │
│ ▸ System  │                                                          │
│ ▸ Audit   │                                                          │
└──────────┴─────────────────────────────────────────────────────────┘
```
Nav rail items: solid icon + label when active (Volt left indicator bar). Maker-checker & 2FA enforced for finance actions (see Security doc).

---

## 5.1 Analytics (Overview) — `Admin/Analytics/Overview`

**Purpose:** The business at a glance — growth, GMV, conversion, reliability.

**Layout**
```
┌──────────────────────────────────────────────────────────────┐
│ Overview                          [ Last 30 days ▾ ] [ Export ]│
│ ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐               │  KPI row (6 stat tiles)
│ │ DAU  ││ GMV  ││Bookng││Pay % ││Refnd ││Active│               │  count-up + delta + sparkline
│ │14.2k ││₹48L  ││12.4k ││98.4% ││1.1%  ││ 312  │               │
│ │▲6%   ││▲12%  ││▲9%   ││▲0.3% ││▼0.2% ││ live ││               │
│ └──────┘└──────┘└──────┘└──────┘└──────┘└──────┘               │
│ ┌─ Booking funnel ───────────┐ ┌─ GMV trend (Volt area) ─────┐ │
│ │ created▓▓▓▓▓▓▓▓ 12.4k       │ │     ╱╲    ╱╲                │ │
│ │ paid   ▓▓▓▓▓▓▓ 11.9k        │ │  ╱╲╱  ╲╱╲╱  ╲               │ │
│ │ confirmd▓▓▓▓▓▓ 11.7k        │ └─────────────────────────────┘ │
│ │ completd▓▓▓▓▓ 11.1k (89%)   │ ┌─ Utilization heatmap ───────┐ │
│ └─────────────────────────────┘ │ hour × day, carbon→Volt     │ │
│ ┌─ Top stations (table) ──────────────────────────────────────┐│
│ │ Station        City    Sessions  GMV     Util   Rating       ││
│ └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```
**Components:** KPI Stat Tiles, Booking funnel bars, GMV area chart (Volt), Utilization heatmap, Top-stations TanStack table, Period selector, Export (async → S3).
**States:** loading skeletons · no-data range · drill-down on any tile → detail view · comparison mode (vs prev period dashed series).
**Notes:** reads from replica/warehouse, never primary. Embeddable Grafana panels for ops (queue depth, p95, error rate).

---

## 5.2 Maps (Network View) — `Admin/Maps/Network`

**Purpose:** Spatial command center — every station's live state across the network; demand vs supply.

**Layout**
```
┌──────────────────────────────────────────────────────────────┐
│ Network map     [ status ▾ ][ city ▾ ][ connector ▾ ]  ◉live   │  filters + live toggle
│ ┌─────────────────────────────────────────┐ ┌──────────────┐  │
│ │                                           │ │ Selected:    │  │
│ │        DARK MAP (network)                 │ │ GreenCharge  │  │  side detail panel
│ │   ◉ clusters · status-colored markers     │ │ ● 3/4 open   │  │
│ │   heat overlay: demand intensity          │ │ today ₹12k   │  │
│ │   ◉  ◉   ◉◉   ◉                            │ │ 72% util     │  │
│ │                                           │ │ [Open detail]│  │
│ └─────────────────────────────────────────┘ └──────────────┘  │
│ Legend: ●avail ◐booked ◉in-session ⏻offline 🔧maint            │
│ ── Network bar ──  5,012 stations · 96.2% online · 312 sessions │
└──────────────────────────────────────────────────────────────┘
```
**Components:** Filterable dark map, status-colored clusters/markers, demand heat overlay, live toggle, selected-station side panel, status legend, network health bar.
**States:** offline-station alerts (red pulse markers) · region drill-down · supply-gap overlay (areas with demand but no/low chargers — growth tool) · cluster expand.
**Motion:** live status changes ripple on the map; offline markers pulse red; heat overlay animates on filter change.

---

## 5.3 User Management — `Admin/Users/List`

**Purpose:** Find, inspect, and act on users; support + fraud + compliance actions with audit.

**Layout**
```
┌──────────────────────────────────────────────────────────────┐
│ Users          🔍 phone / email / id        [ status ▾ ][+ ]   │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ User            Phone        Tier  Bookings  Status  ⋯    │  │  TanStack table:
│ │ Ria Sharma      +91 98•••43  GOLD   38       ● Active     │  │  server pagination,
│ │ Amit Kumar      +91 90•••11  FREE    4        ⏸ Suspended  │  │  sort, filter
│ └──────────────────────────────────────────────────────────┘  │
│  ↳ row click → slide-over detail:                              │
│   ┌────────────── User detail ───────────────┐                 │
│   │ profile · vehicles · bookings · payments  │                 │  tabs
│   │ devices/sessions (revoke) · rewards       │                 │
│   │ Actions: [Suspend] [Reset] [Refund] [Flag]│                 │  audited, reason required
│   └────────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────┘
```
**Components:** Search, status filter, Users table (server-side), Row slide-over with tabbed detail, Action buttons (audited, maker-checker on sensitive), Devices/sessions revoke, masked PII.
**States:** empty search · suspended/flagged badges · action-confirm modal (reason + optional second approver) · data-export request (DPDP) · loading rows.
**Notes:** PII masked by default with reveal-on-permission + audit; every action writes `audit_logs`.

---

## 5.4 Station Management — `Admin/Stations/List`

**Purpose:** Approval queue + lifecycle management of stations and chargers.

**Layout**
```
┌──────────────────────────────────────────────────────────────┐
│ Stations   [ Pending 7 ][ Active ][ Suspended ]   🔍   [ Bulk ]│  status tabs
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Station         Owner        City   Chargers  Status  ⋯   │  │
│ │ VoltHub Varan.  S. Gupta     VNS     4        ⏳ Pending   │  │
│ │ GreenCharge 62  S. Mehra     NCR     4        ● Active     │  │
│ └──────────────────────────────────────────────────────────┘  │
│  ↳ Pending row → review panel:                                 │
│   ┌──────────── Approval review ──────────────┐                │
│   │ KYC docs (S3) · GSTIN · map location pin  │                │  document viewer + map
│   │ chargers config · pricing · photos        │                │
│   │ [ Approve ]   [ Reject (reason) ]          │                │  gated action + audit
│   └────────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────┘
```
**Components:** Status tabs (pending count badge), Stations table, **Approval review panel** (KYC doc viewer, map pin, charger config, pricing, photos), Approve/Reject (reason), Suspend, Bulk import.
**States:** pending queue (default sort oldest) · rejected (resubmission thread) · suspended (fraud flag + reason) · empty queue ("All caught up ⚡") · document-missing flag.
**Motion:** approve → row animates out of queue + Volt success toast; counts update.

---

### Cross-screen admin standards
- **Tables:** TanStack server-side pagination/sort/filter; sticky header; row density toggle; column chooser; CSV export (async → S3 link).
- **Every mutation** is audited (actor, before/after, reason, IP) and surfaced in `Admin/Audit`.
- **Finance actions** (refunds over threshold, payouts) require 2FA re-auth + maker-checker.
- **Charts/legends** never color-only; all status encodings carry a glyph.
