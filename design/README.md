# 🎨 Charging Guru — Brand & UI System

> Design language for a modern EV ecosystem. **Dark-mode-first, futuristic, premium, navigation-centric.** Tesla-inspired restraint × Google-Maps spatial clarity × Uber operational density × Rivian warmth.

**Design principles**
1. **Map is the canvas.** Geography is the primary surface; UI floats over it as glass.
2. **Energy is the language.** Battery rings, charge fills, and the bolt motif carry meaning, not decoration.
3. **One decision per screen.** Tesla-grade reduction — a single primary action, always.
4. **Calm dark, electric focus.** Near-black canvas; Volt green appears only where action or energy lives.
5. **Motion = current.** Animation implies flow of electricity and movement along a route.

---

## Index

| # | Document | Contents |
|---|----------|----------|
| 01 | [Brand Identity](01-brand-identity.md) | Logo concepts, color palette, typography, iconography, voice |
| 02 | [Foundations](02-foundations.md) | Grid, layout, elevation/glass, motion, EV components (battery, charge fill, route line), charging animations |
| 03 | [User App](03-user-app.md) | Home · Route Planner · Station Details · Booking · Payment · QR Pass · Rewards · Profile |
| 04 | [Station Owner App](04-owner-app.md) | Dashboard · QR Scanner · Revenue · Charger Control |
| 05 | [Admin Dashboard](05-admin-dashboard.md) | Analytics · Maps · User Management · Station Management |
| — | [tokens.css](tokens.css) | Production CSS variables (web/admin) |
| — | [tokens.json](tokens.json) | W3C design tokens — import into Figma via **Tokens Studio** |

---

## How to use in Figma

1. **Tokens** → install the *Tokens Studio* plugin → import [`tokens.json`](tokens.json). This populates color, type, spacing, radius, and effect styles.
2. **Frames** → device sizes used throughout: mobile **390 × 844** (iPhone 14/15), owner tablet-friendly **390 × 844** + **834 × 1194**, admin desktop **1440 × 1024**.
3. **Naming** → components follow `Category/Component/Variant` (e.g. `Button/Primary/Default`, `Card/Station/Available`). Screen frames follow `App/Section/Screen` (e.g. `User/Discovery/Home`).
4. **Modes** → Dark is the default Figma variable mode; a Light mode is defined in tokens for daytime map driving (see Foundations §8).

## Deliverables checklist (what a designer builds from this)
- [ ] Token library + 2 modes (Dark default / Light)
- [ ] Icon set (energy-grid, 24px, 2px stroke)
- [ ] Core components: Button, Input, Chip, Card, Sheet, Tab Bar, Map Marker, Battery Ring, Charge Bar, Route Line, QR Pass, Stat Tile
- [ ] 16 high-fidelity screens (8 user · 4 owner · 4 admin) + key states (loading/empty/error)
- [ ] Prototype: Plan → Discover → Book → Pay → QR → Charge flow
