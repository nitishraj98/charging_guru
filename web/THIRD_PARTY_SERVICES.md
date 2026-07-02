# Third-Party Services

## Google Maps Platform

**Required env var:** `NEXT_PUBLIC_GOOGLE_MAPS_KEY`

**APIs to enable** in Google Cloud Console:
- Maps JavaScript API
- Places API
- Directions API
- Geocoding API

**Used for:**
- Places autocomplete in `/plan` route inputs
- Real distance + ETA + encoded polyline in route planner
- Geocoding address strings to lat/lng coordinates

**Fallback:** If key is not set or Maps fails to load, the plan page still works with a text input (no autocomplete), and route planner falls back to Haversine estimation from a built-in city coordinates table.

**Cost:** Free tier covers ~28,500 map loads/month. Place autocomplete has a per-session pricing model (~$0.017/session after 100/day free).

---

## Open Charge Map (OCM)

**Required env var:** `NEXT_PUBLIC_OCM_KEY` (optional — works without key at lower rate limit)

**Get a key:** https://openchargemap.org/site/develop/api

**Used for:** Fallback charging station data when Charging Guru backend is unavailable.

**Fallback chain:** Backend `/api/v1/stations` → OCM → Error state (never fabricate data)

**Data quality note:** OCM data doesn't include real-time availability or pricing. Stations sourced from OCM are labeled with an "OCM" badge in the UI.

---

## Razorpay

**Required env var:** `NEXT_PUBLIC_RAZORPAY_KEY_ID`

**Used for:** Payment processing (booking flow).

**Backend also needs:** `CG_RAZORPAY_KEY_SECRET`, `CG_RAZORPAY_WEBHOOK_SECRET`

---

## CARTO (Map Tiles)

No key required. Free tile server used for Leaflet base map.

- Light theme: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`
- Dark theme: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`

Attribution: © OpenStreetMap contributors, © CARTO
