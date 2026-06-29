# 02 · Foundations

References tokens in [`tokens.css`](tokens.css) / [`tokens.json`](tokens.json). All values are Figma-ready.

## 1. Layout & Grid

**Mobile (390 × 844)**
- Margins: `--space-4` (16). Content max-width = screen − 32.
- Grid: 4 columns, 16 gutter (used for stat tiles & galleries).
- Safe areas: top 59 (notch), bottom 34 (home indicator). Tab bar sits above the indicator.
- Vertical rhythm: 8-pt. Section gap `--space-6` (24); card inner padding `--space-4`–`--space-5`.

**Desktop / Admin (1440 × 1024)**
- 12-column grid, 24 gutter, 32 outer margin, max content 1376.
- Left nav rail 264 (collapsible to 72). Content region scrolls independently.

**Map-first layout pattern (the signature)**
```
┌──────────────────────────────┐
│  MAP (full-bleed canvas)      │  ← carbon dark style, Volt route
│   • floating top: search/glass │
│   • markers: status-colored    │
│                                │
│   ┌────────────────────────┐  │  ← Bottom Sheet (glass)
│   │ ▁▁ grabber              │  │     3 detents: peek(120) /
│   │ content…                │  │     half(50%) / full(90%)
│   └────────────────────────┘  │
└──────────────────────────────┘
   [ Tab Bar (glass, floating) ]
```

## 2. Elevation & Glass

Dark UI avoids heavy shadows; depth comes from **surface lightening + hairline borders + selective glow**.
| Level | Surface | Border | Shadow |
|-------|---------|--------|--------|
| Canvas | `--bg` | — | — |
| Card | `--surface` | `--border` 1px | `--shadow-sm` |
| Sheet / modal | `--surface-raised` | `--glass-stroke` | `--shadow-lg` |
| Floating over map | **glass** (`--glass-fill` + `blur 24`) | `--glass-stroke` | `--shadow-md` |
| Primary CTA / energy | `--accent` | — | `--shadow-glow-volt` |

**Glass recipe:** `background: --glass-fill; backdrop-filter: blur(--glass-blur) saturate(140%); border: 1px solid --glass-stroke; border-radius: --radius-lg;`

## 3. Core Components (anatomy + states)

### Button
- Heights: **lg 56**, md 48, sm 40. Radius `--radius-md` (or pill for FAB-style).
- **Primary:** fill `--accent`, label `--on-accent` (Title), glow on press. **Secondary:** surface + border. **Ghost:** text only. **Destructive:** red/500 fill.
- States: default / hover (+4% lightness) / pressed (scale .98, `--volt-600`) / focus (`--focus-ring` 2px) / loading (inline charge spinner) / disabled (`--carbon-700` fill, `--text-disabled`).

### Input / Search
- Height 52, radius `--radius-md`, surface `--surface`, border `--border`; focus → border `--accent` + faint glow. Leading icon `--text-tertiary`. Error → red/500 border + caption.

### Chip / Filter
- Height 36, pill, surface `--surface`; selected → `--volt-900` fill + `--volt-300` label + bolt/dot. Used for connector type, power, amenities.

### Card
- Radius `--radius-lg`, padding `--space-4`, surface `--surface`, border `--border`. Station card variants keyed by status color (left 3px status rail or status dot).

### Bottom Sheet
- Radius top `--radius-xl`, grabber 36×4 `--carbon-600`. Detents peek/half/full. Drag uses `--ease-decel`.

### Tab Bar (floating glass)
- 5 max items; user app: **Home · Plan · (center QR FAB) · Trips · Profile**. Active = solid icon + Volt + label; inactive = outline + `--text-tertiary`. Center QR is a raised Volt circle with bolt.

### Map Marker (see §6) · Stat Tile (see §7)

## 4. EV-Specific Components

### 4.1 Battery Ring (SoC indicator)
Circular progress that fills with the **SoC gradient** (`--grad-soc`); the percentage sits in the center in `--font-mono`.
```
      ╭───────╮          • Track: --carbon-700, 8px
    ╭╯  ┌───┐  ╰╮        • Fill: --grad-soc, rounded cap
   │    │82%│    │       • Cap glows --shadow-glow-volt when >80%
    ╰╮  └───┘  ╭╯        • Sizes: 40 / 64 / 120 (hero)
      ╰───────╯          • Pulses softly while charging (§5)
```
States: empty(<15% red + warn ring) · low(15–40 amber) · ok(40–80 mixed) · full(>80 volt + glow).

### 4.2 Charge Bar (linear SoC / session progress)
Horizontal track `--carbon-700`, fill `--grad-soc`; an animated **leading shimmer** travels the fill edge while charging. Shows `start% → target%` ticks. Height 8 (compact) / 14 (session).

### 4.3 Connector Tag
Pill with connector silhouette + power: `⚡ CCS2 · 60 kW`. Color-neutral; turns Volt when it matches the user's vehicle.

### 4.4 Route Energy Track (Plan screen)
A vertical/horizontal timeline of the trip where the line color **is** the SoC gradient — green where battery is healthy, fading to amber/red before a recommended stop, then resetting to green after charging. Stops are bolt nodes.

### 4.5 QR Pass
Rounded "ticket" card with a notch + perforation line; Volt-tinted QR on `--carbon-1000`; live countdown ring around a bolt; status chip (Valid / Used / Expired).

### 4.6 Status Dot / Pill
6px dot or pill using `--status-*`; always paired with a glyph (✓ available, ● occupied, ◐ booked, ⏻ offline, 🔧 maintenance) for non-color encoding.

## 5. Motion & Charging Animations

| Animation | Spec |
|-----------|------|
| **Charging pulse** (battery ring/marker) | Opacity 1→.55→1 + scale 1→1.04 on the fill cap glow, `--dur-charge-pulse` (1600ms) loop, `ease-in-out`. Implies live energy. |
| **Charge fill** (booking confirm / session) | Fill animates start%→target% over `--dur-xl`, `--ease-decel`; leading-edge shimmer sweeps continuously. |
| **Route draw** | Volt polyline draws from origin→destination using stroke-dashoffset, `--dur-xl`×N, `--ease-standard`; stop nodes "pop" with `--ease-spring`. |
| **Marker drop** | New markers translate-y -16→0 + fade, staggered 24ms, `--ease-spring`. |
| **Bolt pulse** | Tab QR FAB + "available" markers emit a 2s expanding ring (scale 1→1.8, opacity .4→0). |
| **Sheet detent** | Snap with `--ease-decel`; content cross-fades 120ms. |
| **Success (booked/paid)** | Battery ring fills to 100% + checkmark draw + single Volt glow bloom; subtle haptic (`notificationSuccess`). |
| **Number ticker** | kWh / ₹ / pts count up with `--dur-slow`, mono font. |
| **Skeleton** | Shimmer sweep on `--carbon-800` blocks; never spinners for content. |

**Reduced motion:** respect `prefers-reduced-motion` — replace pulses/draws with instant state + opacity fade only.

## 6. Map System

- **Base style:** custom dark — land `--carbon-950`, water `--carbon-1000`, roads `--carbon-700/600`, labels `--carbon-300`, POIs dimmed. Selected corridor brightened.
- **Route line:** Volt `--volt-500`, 6px, soft outer glow; alternate routes `--carbon-500` dashed.
- **Markers (teardrop, 40px):** fill = charger status color; inner glyph = bolt; badge = available-charger count. Clusters show count + mini status ring. Selected marker scales 1.25 + glow.
- **User puck:** Volt dot + heading cone + accuracy halo.
- **Recommended stop:** larger marker with battery ring showing arrival SoC.

## 7. Data Viz (owner + admin)

- **Stat Tile:** label (Overline) + value (Metric mono, count-up) + delta chip (▲ volt / ▼ red) + sparkline.
- **Charts:** Volt as primary series, cyan secondary, amber/orange/red for status breakdowns. Dark gridlines `--carbon-800`, axis `--carbon-400`. Area fills use `--grad-volt` at 12% alpha.
- **Utilization heatmap:** time-of-day × day grid, cells scaled `--carbon-800` → `--volt-500`.
- **Status legend** always visible; never color-only.

## 8. Theming & Accessibility
- **Dark default**, **Light** for daytime driving (tokens `light`). Map auto-switches with system + manual override.
- Min tap target 44×44. Text contrast ≥ 4.5:1 (body) / 3:1 (large). Focus rings on all interactive web elements.
- Dynamic Type / font scaling supported; layouts reflow, never truncate critical numbers.
- Haptics: success (book/pay), warning (slot lost), selection (filters).
