# 08 · Mobile App Architecture (React Native + Expo)

Two apps share one codebase strategy: a **monorepo** with shared packages, two Expo apps (`mobile-user`, `mobile-owner`). TypeScript throughout. State: **React Query** (server state) + **Zustand** (client/UI state).

## 1. Shared Strategy

```
mobile/
├── apps/
│   ├── user/        # EV driver app
│   └── owner/       # station operator app
├── packages/
│   ├── api/         # typed API client (generated from OpenAPI) + React Query hooks
│   ├── ui/          # shared components, theme tokens, icons
│   ├── auth/        # OTP/JWT/refresh logic, secure storage
│   ├── core/        # config, error mapping, analytics, push registration
│   └── types/       # shared TS types (from backend OpenAPI)
└── package.json     # workspaces (pnpm/yarn)
```

## 2. User App Structure (Expo Router)

```
apps/user/
├── app/                          # file-based routing (expo-router)
│   ├── (auth)/login.tsx          # phone → OTP
│   ├── (auth)/verify.tsx
│   ├── (tabs)/
│   │   ├── index.tsx             # Home: nearby + quick book
│   │   ├── plan.tsx              # Route planner
│   │   ├── bookings.tsx          # History/upcoming
│   │   └── profile.tsx
│   ├── station/[id].tsx          # station detail + live chargers
│   ├── booking/[id].tsx          # booking detail + QR
│   ├── booking/checkout.tsx      # Razorpay
│   ├── vehicles/index.tsx
│   ├── rewards.tsx  membership.tsx
│   └── _layout.tsx               # providers (QueryClient, theme, auth gate)
├── src/
│   ├── features/                 # feature-sliced
│   │   ├── route-planner/        # map, stop cards, energy model display
│   │   ├── discovery/            # map + list, filters
│   │   ├── booking/              # slot picker, hold timer
│   │   ├── payments/             # razorpay-react-native integration
│   │   ├── qr/                   # QR render (react-native-qrcode-svg)
│   │   └── rewards/
│   ├── store/                    # zustand slices (session, filters, draftBooking)
│   ├── hooks/                    # useNearbyStations, useBooking, useAvailabilityWS
│   ├── lib/                      # maps, location, notifications, storage
│   └── components/
├── app.config.ts                 # Expo config (env via EAS)
└── eas.json                      # build profiles dev/preview/prod
```

## 3. State Management Split

| Concern | Tool |
|---------|------|
| Server data (stations, bookings, availability) | **React Query** (caching, retries, background refetch, optimistic updates) |
| Auth tokens, current user | Zustand + **expo-secure-store** (encrypted) |
| UI/local (filters, draft booking, map camera) | Zustand |
| Real-time availability | WebSocket → React Query cache patch (`queryClient.setQueryData`) |

## 4. Networking & Auth

- Typed client generated from backend `openapi.json` (`openapi-typescript` + thin fetch wrapper).
- Axios/fetch interceptor: attach `Bearer`, on `401` → silent refresh (single-flight mutex) → retry; on refresh fail → logout.
- `Idempotency-Key` (uuid) attached to booking/payment mutations.
- Offline: React Query persisted cache (MMKV) for read screens; mutations queued where safe.

## 5. Key Integrations

| Feature | Library |
|---------|---------|
| Maps | `react-native-maps` (Google provider) + Directions overlay |
| Location | `expo-location` |
| Payments | `react-native-razorpay` |
| QR display | `react-native-qrcode-svg` |
| Push | `expo-notifications` + FCM credentials via EAS |
| Secure storage | `expo-secure-store` |
| Camera (owner scan) | `expo-camera` / `expo-barcode-scanner` |

## 6. Owner App (apps/owner) — differences

```
app/
├── (tabs)/dashboard.tsx     # today's bookings, revenue, utilization
├── (tabs)/scan.tsx          # QR scanner → /qr/verify → start session
├── (tabs)/chargers.tsx      # status toggles (AVAILABLE/MAINT/OFFLINE)
├── (tabs)/analytics.tsx
└── session/[id].tsx         # active session: start/complete, energy entry
```

- **QR scan flow:** camera scans token → `POST /qr/verify` → show booking → `POST /sessions/start` → on completion `POST /sessions/{id}/complete` with energy reading.
- **Availability control:** optimistic status toggle → PATCH → WS confirms; conflict → revert.
- Role-gated: app only logs in users with `ROLE_STATION_OWNER`.

## 7. Real-Time Availability Hook (pattern)

```ts
function useAvailabilityWS(stationId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const ws = connectWS(`/ws/stations/${stationId}`, getToken());
    ws.onMessage(({ charger_id, status }) =>
      qc.setQueryData(['station', stationId], patchChargerStatus(charger_id, status)));
    return () => ws.close();
  }, [stationId]);
}
```

## 8. Performance & UX

- FlashList for long station lists; map marker clustering.
- Skeleton loaders; React Query `staleTime` tuned per resource (availability short, station meta long).
- Hold timer countdown on checkout (mirrors `hold_expires_at`); auto-release UX.
- Deep links (`charging-guru://booking/{id}`) from push notifications.
- Sentry RN for crash/error; analytics events for funnel.

## 9. Build & Release

- **EAS Build** profiles: `development` (dev client), `preview` (internal QA), `production`.
- **EAS Update** (OTA) for JS-only fixes; store submission for native changes.
- Env via EAS secrets; separate Firebase + Razorpay keys per env.
- CI: lint + typecheck + unit (Jest + RN Testing Library) + Detox e2e on PR.
