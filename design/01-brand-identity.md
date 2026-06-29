# 01 · Brand Identity

## 1. Brand Essence

| Attribute | Expression |
|-----------|-----------|
| **Personality** | Confident, effortless, intelligent guide — a "guru" that removes anxiety |
| **Feeling** | Calm control in the dark, then a spark of electric confidence |
| **Tension we resolve** | Range anxiety → range *certainty* |
| **Tone** | Spare, human, never jargon. "2 stops. You'll arrive at 6:40 with 22% to spare." |

**Tagline options:** *“Charge with certainty.”* · *“Plan once. Charge everywhere.”* · *“Your route, fully charged.”*

---

## 2. Logo Concepts

The mark fuses the **two core jobs**: *navigation* (map pin) + *energy* (bolt). Three concepts, all built on a single geometric grid (bolt angle = 24°, matching the icon stroke system).

### Concept A — “The Pinbolt” (recommended primary)
A rounded map pin whose negative space is a lightning bolt. Reads as location + power instantly; works at 16px.

```
        ╱╲
       ╱  ╲          • Teardrop map-pin silhouette
      │ ◹  │         • Bolt carved from negative space (Volt green on dark)
      │ ╱  │         • Bolt doubles as the "G" terminal of "Guru"
       ╲  ╱          • Single-weight, no gradients in the core mark
        ╲╱
```
- **Construction:** pin built from a circle (r=48) + 24° tangent lines; bolt is a 2-segment polyline offset 8 units, corners radius 4.
- **Clear space:** ½ the pin height on all sides.
- **Min size:** 16px (app icon), 20px (favicon legibility floor for wordmark lockup).

### Concept B — “Current G” (monogram)
A `G` whose open counter is broken by a bolt gap and a charging "fill" arc — the ring fills clockwise like a battery as a loading/brand animation.

### Concept C — “Waypoint” (route mark)
Two waypoint dots joined by a bolt-shaped route segment. Best for motion/launch animations and the route-planning surface.

### Lockups
- **Primary:** Pinbolt + wordmark `charging guru` (lowercase, Satoshi Medium, -2% tracking).
- **Stacked:** mark over wordmark (app store, splash).
- **Mark-only:** app icon, avatars, map attribution.
- **App icon:** Pinbolt centered on a `Carbon-950 → #0E2A1C` radial, Volt bolt with a soft outer glow (`shadow-glow-volt`).

### Don'ts
No gradients inside the bolt · no drop shadows on the wordmark · never rotate the bolt · never place the dark mark on busy map imagery without the glass scrim.

---

## 3. Color Palette

Dark-mode-first. The canvas is a cool near-black; **Volt green is reserved for energy + the single primary action** so it never loses meaning. Full ramps live in [`tokens.json`](tokens.json) / [`tokens.css`](tokens.css).

### Brand — Volt (primary / energy)
| Token | Hex | Use |
|-------|-----|-----|
| volt/50 | `#E6FFF2` | tint backgrounds (light mode) |
| volt/100 | `#B3FFD9` | subtle fills |
| volt/300 | `#4DFFA6` | charge-fill highlight |
| volt/400 | `#26F593` | hover / active glow |
| **volt/500** | **`#00E676`** | **primary accent, CTAs, "available", energy** |
| volt/600 | `#00C766` | pressed |
| volt/700 | `#00A455` | borders on tint |
| volt/900 | `#00532B` | deep accent / charts |

### Neutrals — Carbon (canvas & surfaces)
| Token | Hex | Use |
|-------|-----|-----|
| carbon/1000 | `#050708` | true black (OLED, map base) |
| **carbon/950** | **`#0A0D0E`** | **app background** |
| carbon/900 | `#101415` | surface / cards |
| carbon/800 | `#181D1F` | raised surface, sheets |
| carbon/700 | `#222829` | hairline borders, dividers |
| carbon/600 | `#2E3638` | strong border, inactive track |
| carbon/500 | `#495154` | disabled text, offline |
| carbon/400 | `#6B7479` | tertiary text, icons-muted |
| carbon/300 | `#98A1A6` | secondary text |
| carbon/200 | `#C2C9CD` | secondary on dark |
| carbon/100 | `#E6EBED` | primary text on dark |
| carbon/0 | `#FFFFFF` | max-contrast text, on-Volt foreground is carbon/1000 |

### Secondary — Cyan (navigation / route / data)
Route lines, info, and "occupied/in-session" telemetry use an electric cyan so they read distinctly from the Volt action color.
`cyan/500 #22D3EE` · `cyan/400 #4DDFF2` · `cyan/700 #0E9DB5`.

### Semantic & Charger Status
| Meaning | Token | Hex |
|---------|-------|-----|
| Success / **Available** | volt/500 | `#00E676` |
| Info / **In session (occupied)** | cyan/500 | `#22D3EE` |
| Warning / **Booked** | amber/500 | `#FFC043` |
| Danger / **Maintenance** | orange/500 | `#FF7849` |
| Critical / error | red/500 | `#FF5A5F` |
| **Offline** | carbon/500 | `#495154` |

### State-of-charge gradient (battery fills, route energy)
`linear-gradient(90deg, #FF5A5F 0%, #FFC043 35%, #00E676 70%)` — red (empty) → amber → Volt (full). Used on battery rings, SoC bars, and the route energy track.

### Accessibility
- Body text uses `carbon/100` on `carbon/950/900` → ≥ 15:1.
- Volt on dark for text only at ≥ Title size or as iconography; **never Volt text on Volt fill**. On-Volt label = `carbon/1000`.
- All status colors paired with an icon/shape (never color-only) for color-blind safety.

---

## 4. Typography

A three-voice system: a geometric **display** for confidence, a neutral **UI** workhorse for legibility, and a **mono** for energy/data so numbers feel like instrumentation.

| Role | Typeface | Fallback | Notes |
|------|----------|----------|-------|
| Display / headings | **Satoshi** (or Clash Display for hero) | SF Pro Display, Inter | Medium/Bold, tracking -2% |
| UI / body | **Inter** | SF Pro Text, system-ui | Variable, 400/500/600 |
| Data / energy / kWh | **Geist Mono** (or JetBrains Mono) | ui-monospace | Tabular figures for kWh, ₹, %, time |

### Type scale (mobile, px / line-height)
| Style | Size / LH | Weight | Tracking | Use |
|-------|-----------|--------|----------|-----|
| Display XL | 40 / 44 | 600 | -2% | Splash, big numbers (SoC, ETA) |
| Display | 32 / 38 | 600 | -2% | Screen hero |
| H1 | 28 / 34 | 600 | -1% | Section titles |
| H2 | 24 / 30 | 600 | -1% | Card titles |
| H3 | 20 / 26 | 600 | 0 | Sub-section |
| Title | 18 / 24 | 600 | 0 | List/row titles |
| Body L | 16 / 24 | 400/500 | 0 | Primary body |
| Body | 14 / 20 | 400/500 | 0 | Default UI text |
| Caption | 12 / 16 | 500 | +1% | Meta, labels |
| Overline | 12 / 16 | 600 | +8% UPPER | Eyebrows, section kickers |
| Micro | 11 / 14 | 500 | +2% | Legal, tags |
| **Metric** (mono) | 16–40 | 500 | tabular | kWh / ₹ / % / countdowns |

Desktop (admin) scales up ~1.15× from Title and above; body stays 14.

---

## 5. Iconography

- **Grid:** 24 × 24, 1.5px keyline padding, **2px stroke**, round caps & joins (matches bolt geometry). 20px and 16px variants with optical stroke 1.75/1.5.
- **Style:** outline-default, **solid for active/selected** tab and status. Energy-forward metaphors: bolt, plug (CCS2/Type2 silhouettes), battery, route pin, gauge, leaf (eco), shield (verified).
- **Connector icons:** literal connector silhouettes (CCS2, Type 2, CHAdeMO, GB/T) as a dedicated set — used on chargers and vehicle profiles.
- **Map markers:** see Foundations §6 (status-colored teardrop with charger count).
- **Motion:** icons may animate state (plug "connects", bolt "pulses" while charging).

Core set (MVP): home, route, bolt, plug, battery, map-pin, search, filter, clock, wallet, qr, scan, star, gift (rewards), user, settings, bell, chevrons, check-shield, gauge, power, wrench (maintenance), trend-up.

---

## 6. Photography & Illustration
- **Photography:** real EVs at dusk/night, wet asphalt reflecting Volt-green light, headlights as bokeh. Cool grade, deep blacks, single green light source.
- **Illustration:** thin-line + Volt accent on dark; isometric chargers; never flat corporate clip-art.
- **Map styling:** custom dark map (see Foundations §6) — desaturated carbon land, near-black water, Volt route, dimmed POIs.

## 7. Brand Voice (microcopy)
- Lead with certainty + numbers. "Booked. Bay 3 is yours till 6:55."
- Calm on errors, never blame. "That slot just went. Here are 3 open nearby."
- Reward effort. "Nice — 120 km on clean energy this week. +50 pts."
