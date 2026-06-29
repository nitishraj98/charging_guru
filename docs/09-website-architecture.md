# 09 · Website Architecture (Next.js 15 — User Web)

Feature parity with the user mobile app: login, route planning, discovery, booking, payment, booking management, invoices.

## 1. Stack & Rendering Strategy

- **Next.js 15 App Router**, React Server Components by default; Client Components only where interactivity/maps/WS needed.
- **TypeScript**, **Tailwind CSS**, **shadcn/ui** (Radix primitives).
- **TanStack Query** for client-side server-state; **Zustand** for UI state.
- **Rendering mix:**
  - Marketing/SEO pages (home, station landing pages) → **SSG/ISR** for SEO + speed.
  - Discovery results → **server components** streaming + client hydration for map/filters.
  - Authenticated dashboard (bookings, profile) → **client-rendered** behind auth, data via React Query.

## 2. Structure

```
web-user/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx               # SSG landing
│   │   ├── stations/[slug]/page.tsx  # ISR station SEO pages
│   │   └── layout.tsx
│   ├── (auth)/login/page.tsx      # OTP login (phone → code)
│   ├── (app)/
│   │   ├── layout.tsx             # auth-guarded shell (sidebar/topbar)
│   │   ├── plan/page.tsx          # route planner + map
│   │   ├── discover/page.tsx      # map + list + filters
│   │   ├── stations/[id]/page.tsx # detail + live availability + slot picker
│   │   ├── checkout/[bookingId]/page.tsx  # Razorpay
│   │   ├── bookings/page.tsx      # list
│   │   ├── bookings/[id]/page.tsx # detail + QR + invoice
│   │   ├── vehicles/page.tsx
│   │   ├── rewards/page.tsx  membership/page.tsx  profile/page.tsx
│   ├── api/                       # route handlers (BFF): token cookie, webhooks proxy
│   │   ├── auth/[...]/route.ts
│   │   └── og/route.tsx           # dynamic OG images
│   └── layout.tsx                 # root providers
├── components/
│   ├── ui/                        # shadcn components
│   ├── map/                       # @vis.gl/react-google-maps wrapper
│   ├── booking/  discovery/  route-planner/
├── lib/
│   ├── api/                       # typed client (OpenAPI) + query hooks
│   ├── auth/                      # session, refresh, server-side guards
│   ├── ws/                        # availability socket
│   └── razorpay.ts                # checkout.js loader
├── hooks/                         # useNearbyStations, useRoutePlan, useAvailability
├── stores/                        # zustand (filters, draftBooking)
├── middleware.ts                  # auth redirect, locale, security headers
└── next.config.ts
```

## 3. Authentication on Web

- OTP login via API; tokens stored in **HttpOnly, Secure, SameSite=Lax cookies** set by Next route handlers (BFF pattern) — JS never touches refresh token.
- Access token short-lived; refresh via `/api/auth/refresh` route handler (server-to-server to backend).
- `middleware.ts` guards `(app)` segment; redirects unauthenticated to `/login`.
- Server Components read session from cookie for SSR-personalized data.

## 4. Maps & Route Planning

- `@vis.gl/react-google-maps` (official React wrapper).
- **Google Maps JS API key restricted** to domain (referrer); Directions/Places heavy calls proxied through **backend** (`/routes/plan`) to control cost + cache, not called directly from browser.
- Route polyline decoded + rendered; stop markers with charge-time popovers.

## 5. Payments

- Razorpay Checkout.js loaded on checkout page; order created via backend; signature verified server-side via `/payments/verify`.
- Booking hold timer with server `hold_expires_at`; auto-cancel UX on expiry.

## 6. Real-Time

- WebSocket (or SSE fallback) for station availability on detail/discovery pages; updates patched into React Query cache. Reconnect with backoff; pause when tab hidden.

## 7. Performance, SEO, A11y

- ISR for station/marketing pages (great SEO for "EV charging near X").
- `next/image` + CloudFront for media; route-based code splitting; RSC streaming.
- Core Web Vitals budget enforced in CI (Lighthouse). 
- shadcn/Radix → accessible components; keyboard + screen-reader tested.
- i18n-ready (en + hi) via `next-intl`.

## 8. Quality & CI

- ESLint + Prettier + `tsc --noEmit`; Vitest + React Testing Library; Playwright e2e (login→book→pay happy path against staging).
- Sentry browser SDK; Web Vitals → analytics.
- Deployed as containerized Next.js (standalone output) behind Nginx/CloudFront, or Vercel for web tier (decision in DevOps doc).
