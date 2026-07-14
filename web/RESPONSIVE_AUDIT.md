# Responsive Audit — Charging Guru Web

**Date:** 2026-06-30  
**Breakpoints tested:** 320px, 375px, 390px, 414px, 480px, 640px, 768px, 820px, 1024px, 1280px, 1440px, 1536px, 1920px

---

## Pages Audited

| Page | Status | Notes |
|------|--------|-------|
| `/` — Landing Page | ✅ COMPLETE | All sections fixed |
| `/login` — Login / OTP | ✅ COMPLETE | 2-col collapses to 1-col on mobile |
| `/discover` | ⬜ NOT AUDITED | Future session |
| `/plan` | ⬜ NOT AUDITED | Future session |
| `/station/[id]` | ⬜ NOT AUDITED | Future session |
| `/booking/[id]` | ⬜ NOT AUDITED | Future session |
| `/profile` | ⬜ NOT AUDITED | Future session |
| `/owner` | ⬜ NOT AUDITED | Future session |
| `/admin` | ⬜ NOT AUDITED | Future session |
| `/membership` | ⬜ NOT AUDITED | Future session |

---

## Components Fixed

### `globals.css`
**Issues found:**
- Only had one `@media (max-width: 768px)` block and one `@media (max-width: 1024px)` block
- `.faq-two-col` override used `flex-direction` but the element uses `display: grid`
- No breakpoints for 820px, 1280px, 1536px, 640px, 480px, 390px, 320px
- Missing classes: `stats-bar-grid`, `stats-network`, `trust-strip`, `hiw-main-grid`, `hiw-phone-col`, `hiw-bottom-grid`, `footer-newsletter-outer`, `footer-newsletter`, `footer-newsletter-grid`, `final-cta-grid`, `final-cta-right`

**Fixes applied:**
- Added breakpoints: `≤1536px`, `≤1280px`, `≤1024px`, `≤820px`, `≤768px`, `≤640px`, `≤480px`, `≤390px`, `≤320px`
- Fixed `.faq-two-col` to use `grid-template-columns: 1fr` not `flex-direction`
- Added all missing class rules covering grids, visibility, padding, spacing

---

### `NavBar.tsx`
**Issues found:**
- Nav links hidden on mobile with no replacement navigation
- No hamburger menu / mobile drawer

**Fixes applied:**
- Added `mobileMenuOpen` state
- Added `.nav-hamburger` button (hidden on desktop via `display: none`, shown via `display: flex` CSS class at `≤768px`)
- Added slide-out mobile drawer (right-anchored, 300px wide, full-height) with all nav links, theme toggle, login/logout
- Route change closes drawer automatically

---

### `HeroSection.tsx`
**Issues found:**
- `height: 680` fixed pixel value overrides the CSS `height: auto !important` rule on mobile
- Left column padding `"0 0 80px 52px"` — fixed values that don't scale

**Fixes applied:**
- Changed `height: 680` → `minHeight: "clamp(520px,56vw,720px)"` (fluid, no fixed height)
- Left column padding changed to `clamp()` expressions: `clamp(72px,9vw,100px)` vertical, `clamp(20px,4vw,52px)` horizontal

---

### `StatsBar.tsx`
**Issues found:**
- Grid was `repeat(4,1fr) 200px` (5-column fixed)
- No `className` on the main grid div — CSS rules for `.stats-bar-inner` never fired
- No `className` on the network mini-map column — `.stats-network` never fired

**Fixes applied:**
- Added `className="stats-bar-grid"` to main grid div
- Added `className="stats-network"` to the India network mini-map column
- On `≤1280px`: hides network, collapses to `repeat(4,1fr)`
- On `≤768px`: collapses to `repeat(2,1fr)`
- On `≤320px`: collapses to `1fr`

---

### `HowItWorks.tsx`
**Issues found:**
- Main 2-col grid `"1fr 300px"` — no className, CSS `.hiw-layout` rule never fired
- Phone column — no className
- Bottom metric cards `"repeat(3,1fr)"` — no className, fixed 3-col
- Header `marginBottom: 72` — fixed pixel value

**Fixes applied:**
- Added `className="hiw-main-grid"` to main 2-col container
- Added `className="hiw-phone-col"` to phone column (hidden on mobile)
- Added `className="hiw-bottom-grid"` to metric cards container
- Changed `marginBottom: 72` → `clamp(36px,5vw,72px)`
- Changed `marginTop: 96` → `clamp(48px,6vw,96px)`
- On `≤820px`/`≤768px`: stacks to 1-col, phone hidden, steps list fills full width
- On `≤640px`: metric cards stack to 1-col

---

### `Features.tsx`
**Issues found:**
- Feature grid `"repeat(3,1fr)"` — no `className`, CSS `.features-grid` never fired

**Fixes applied:**
- Added `className="features-grid"` to feature grid container
- On `≤1280px`/`≤1024px`: 2 columns
- On `≤768px`: 1 column

---

### `Pricing.tsx`
**Issues found:**
- Trust strip used `gridTemplateColumns: "repeat(6,1fr)"` — 6 equal columns, no wrapping, overflows on mobile
- No `className` on trust strip div

**Fixes applied:**
- Added `className="trust-strip"` to trust strip
- Changed border-right logic (removed `i < length - 1` condition — now uses CSS grid and borders work with wrapping)
- On `≤1280px`: 3 columns
- On `≤640px`: 2 columns
- On `≤320px`: 1 column

---

### `Footer.tsx`
**Issues found:**
- Newsletter outer wrapper `padding: "52px 56px 0"` — fixed 56px side padding causes overflow on small screens
- Newsletter inner grid `gridTemplateColumns: "1fr 1fr"` — no className, fixed 2-col

**Fixes applied:**
- Added `className="footer-newsletter-outer"` to outer wrapper with `padding: "52px clamp(16px,4vw,56px) 0"`
- Added `className="footer-newsletter footer-newsletter-grid"` to inner glass card
- Padding changed to `clamp()` expressions
- Gap changed to `clamp()` expression
- On `≤1024px`/`≤820px`/`≤768px`: stacks to 1-col

---

### `page.tsx` — `FinalCTA`
**Issues found:**
- `gridTemplateColumns: "1fr 1fr"` — fixed 2-col, no className
- Left column padding `"80px 52px 80px 80px"` — all fixed values

**Fixes applied:**
- Added `className="section-fade final-cta-grid"` to container
- Added `className="final-cta-right"` to right column (hidden on mobile)
- `minHeight` changed to `clamp(560px,70vw,90vh)` 
- Left column padding changed to `clamp()` expressions
- On `≤820px`/`≤768px`: collapses to 1-col, right column (SVG network map) hidden

---

### `login/page.tsx`
**Issues found:**
- Outer div used `style` prop for `gridTemplateColumns: "1fr 1fr"` but the inline `<style>` block defines `.lg-grid { grid-template-columns: 1fr }` — the `className="lg-grid"` was missing so the media query never activated
- Right panel `padding: "48px 56px"` — fixed values
- Left panel `padding: "52px 56px"` — fixed values

**Fixes applied:**
- Added `className="lg-grid"` to the outer grid div
- Right panel padding → `clamp(32px,5vw,48px) clamp(16px,4vw,56px)`
- Left panel padding → `clamp(36px,5vw,52px) clamp(24px,4vw,56px)`
- On `≤768px`: 1-col, left brand panel hidden

---

## Issues Remaining

### App Pages (Not Yet Audited)
The following pages have not been audited for responsive issues:
- `/discover` — map-based station discovery
- `/plan` — route planner
- `/station/[id]` — station detail
- `/booking/[id]` — booking flow
- `/profile` — user profile
- `/owner` — station owner dashboard
- `/admin` — admin panel
- `/membership` — membership plans

### Known Potential Issues in Unaudited Pages
- Tables (if any) may overflow horizontally on small screens
- Modal/drawer components need testing at 320px
- Calendar/date picker components need responsive verification
- Forms with long labels may wrap awkwardly

---

## Breakpoint Coverage Summary

| Breakpoint | Coverage |
|-----------|---------|
| 1920px | ✅ Fluid (max-width containers, clamp()) |
| 1536px | ✅ Padding scale-down |
| 1440px | ✅ Fluid (inside 1536px rule) |
| 1280px | ✅ Features 3→2 col, trust strip 6→3, stats network hidden |
| 1024px | ✅ Hero compress, sidebar narrow, newsletter stack |
| 820px | ✅ Hero mobile, hiw stack, map stack, final-cta stack |
| 768px | ✅ Full mobile: nav hamburger, hero single-col, stats 2-col, features 1-col |
| 640px | ✅ HiW bottom 3→1, trust strip 3→2, footer grid 2→1 |
| 480px | ✅ Hero padding tighter, newsletter padding tighter |
| 390px | ✅ Stats 2-col maintained, trust strip 2-col |
| 375px | ✅ Covered by 390px rule |
| 320px | ✅ Stats 1-col, trust strip 1-col |
