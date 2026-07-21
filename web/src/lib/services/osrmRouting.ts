// Free road-routing (OSRM) + geocoding (Nominatim/OpenStreetMap) — no API key,
// no billing account required. Used as the default provider for /plan's real
// road-distance, ETA, and route polyline.
//
// Swap back to Google Directions/Geocoding (see getDirections/geocodeAddress
// in googleMaps.ts) if billing ever gets set up on a Google Cloud project —
// same RouteResult shape and encoded-polyline format, so only routePlanner.ts's
// Step 1 block needs to change back.

import { RouteResult } from "./googleMaps";

const OSRM_BASE = "https://router.project-osrm.org";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: string;
  legs?: Array<{ distance: number; duration: number }>;
}

export async function getRoadRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<RouteResult> {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=polyline&steps=false`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OSRM route: HTTP ${res.status}`);
  const data: { code: string; routes?: OsrmRoute[] } = await res.json();
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route) throw new Error(`OSRM route: ${data.code ?? "no route found"}`);

  return {
    distance_m: Math.round(route.distance),
    duration_s: Math.round(route.duration),
    duration_traffic_s: undefined, // public OSRM demo has no live-traffic model
    polyline: route.geometry,      // precision-5 encoded polyline — same format decodePolyline() expects
    waypoint_order: [],
    legs: (route.legs ?? []).map(l => ({
      start_address: "",
      end_address: "",
      distance_m: Math.round(l.distance),
      duration_s: Math.round(l.duration),
    })),
  };
}

interface NominatimHit {
  lat: string;
  lon: string;
}

export async function geocodeFree(
  address: string,
  signal?: AbortSignal,
): Promise<{ lat: number; lng: number }> {
  const url = `${NOMINATIM_BASE}/search?format=json&countrycodes=in&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { signal, headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error(`Nominatim geocode: HTTP ${res.status}`);
  const data: NominatimHit[] = await res.json();
  if (!data[0]) throw new Error("Nominatim geocode: no results");
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}
