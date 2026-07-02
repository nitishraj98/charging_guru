// Route planning service.
// 1. Uses Google Directions API for accurate distance + ETA
// 2. Fetches real charging stops from backend or OCM along the route
// 3. Falls back to local computation when Maps isn't available

import { getDirections, geocodeAddress, mapsReady } from "./googleMaps";
import { fetchNearbyStations } from "./chargingStations";
import { UserVehicle } from "./vehicleService";

export interface PlanInput {
  source: string;
  sourceLat?: number;
  sourceLng?: number;
  destination: string;
  destLat?: number;
  destLng?: number;
  vehicle: UserVehicle;
  batteryPercent: number;   // 0–100
  signal?: AbortSignal;
}

export interface ChargingStop {
  station_id?: string;
  station_name: string;
  city: string;
  lat: number;
  lng: number;
  distance_from_start_km: number;
  arrival_battery_pct: number;
  charge_to_pct: number;
  charge_time_min: number;
  charger_power_kw: number;
  price_per_kwh: number;     // paise; 0 if unknown
  availability: "available" | "limited" | "unavailable";
  charger_id?: string;
  connector_type: string;
  source: "backend" | "ocm" | "estimated";
}

export interface PlanResult {
  source: string;
  destination: string;
  total_distance_km: number;
  estimated_duration_min: number;
  estimated_duration_traffic_min?: number;
  stops_required: number;
  recommended_stops: ChargingStop[];
  total_charging_cost_paise: number;
  total_charging_time_min: number;
  polyline?: string;           // encoded polyline for map rendering
  data_source: "google+backend" | "google+ocm" | "offline";
}

export async function planRoute(input: PlanInput): Promise<PlanResult> {
  const { vehicle, batteryPercent, signal } = input;
  const startRange = Math.round(vehicle.range_km * (batteryPercent / 100));

  // ── Step 1: Resolve coords + get route from Google Directions ──────────────
  let totalDistKm = 0;
  let durationMin = 0;
  let durationTrafficMin: number | undefined;
  let polyline: string | undefined;
  let dataSource: PlanResult["data_source"] = "offline";

  let origin: string | { lat: number; lng: number } = input.source;
  let dest: string | { lat: number; lng: number } = input.destination;

  if (input.sourceLat != null && input.sourceLng != null) {
    origin = { lat: input.sourceLat, lng: input.sourceLng };
  }
  if (input.destLat != null && input.destLng != null) {
    dest = { lat: input.destLat, lng: input.destLng };
  }

  try {
    if (!mapsReady()) await import("./googleMaps").then(m => m.loadGoogleMaps());
    if (mapsReady()) {
      const route = await getDirections(origin, dest);
      totalDistKm = Math.round(route.distance_m / 1000);
      durationMin = Math.round(route.duration_s / 60);
      durationTrafficMin = route.duration_traffic_s ? Math.round(route.duration_traffic_s / 60) : undefined;
      polyline = route.polyline;
      dataSource = "google+backend";

      // Resolve origin coords for stop searching
      if (typeof origin === "string") {
        try {
          const gc = await geocodeAddress(origin);
          origin = gc;
        } catch { /* keep as string */ }
      }
      if (typeof dest === "string") {
        try {
          const gc = await geocodeAddress(dest);
          dest = gc;
        } catch { /* keep as string */ }
      }
    }
  } catch (mapsErr) {
    if (isAbort(mapsErr)) throw mapsErr;
    console.warn("[planner] Google Maps unavailable:", mapsErr);
  }

  // Offline fallback for distance
  if (totalDistKm === 0) {
    totalDistKm = estimateDistanceFallback(input.source, input.destination);
    durationMin = Math.round((totalDistKm / 65) * 60);
    dataSource = "offline";
  }

  // ── Step 2: Calculate stops needed ───────────────────────────────────────
  const safeRange = Math.round(startRange * 0.85);  // keep 15% buffer
  const stopsNeeded = Math.max(0, Math.ceil((totalDistKm - safeRange) / (vehicle.range_km * 0.85)));

  // ── Step 3: Fetch real charging stations along route midpoints ─────────────
  const stops: ChargingStop[] = [];

  if (stopsNeeded > 0) {
    const midpoints = computeMidpoints(
      typeof origin === "string" ? null : origin,
      typeof dest === "string" ? null : dest,
      stopsNeeded,
    );

    for (let i = 0; i < stopsNeeded; i++) {
      const mid = midpoints[i];
      const distFromStart = Math.round(((i + 1) / (stopsNeeded + 1)) * totalDistKm);
      const arrivalBattery = Math.max(10, Math.round(batteryPercent - (distFromStart / vehicle.range_km) * 100));

      let stop: ChargingStop | null = null;

      if (mid) {
        try {
          const nearby = await fetchNearbyStations({ lat: mid.lat, lng: mid.lng, radius_km: 15, signal });
          const available = nearby.filter(s =>
            s.status !== "OFFLINE" &&
            s.chargers.some(c => c.status === "AVAILABLE" || c.status === "BOOKED")
          );
          if (available.length > 0) {
            const best = available[0];
            const charger = best.chargers.find(c => c.status === "AVAILABLE") ?? best.chargers[0];
            const chargeTo = 85;
            const chargeTime = Math.round(((chargeTo - arrivalBattery) / 100) * vehicle.battery_kwh / (charger.power_kw / 60));
            stop = {
              station_id: best.id,
              station_name: best.name,
              city: best.city ?? "",
              lat: best.lat,
              lng: best.lng,
              distance_from_start_km: distFromStart,
              arrival_battery_pct: arrivalBattery,
              charge_to_pct: chargeTo,
              charge_time_min: Math.max(10, chargeTime),
              charger_power_kw: charger.power_kw,
              price_per_kwh: charger.price_per_kwh,
              availability: charger.status === "AVAILABLE" ? "available" : "limited",
              charger_id: charger.id,
              connector_type: charger.connector_type,
              source: best.source === "ocm" ? "ocm" : "backend",
            };
            if (best.source === "ocm") dataSource = "google+ocm";
          }
        } catch (err) {
          if (isAbort(err)) throw err;
          console.warn("[planner] Stop fetch failed:", err);
        }
      }

      if (!stop) {
        // Estimated placeholder — clearly labelled
        const chargeTo = 85;
        const chargeTime = Math.round(((chargeTo - arrivalBattery) / 100) * vehicle.battery_kwh / (50 / 60));
        stop = {
          station_name: `Charging Stop ${i + 1}`,
          city: "En route",
          lat: mid?.lat ?? 0,
          lng: mid?.lng ?? 0,
          distance_from_start_km: distFromStart,
          arrival_battery_pct: arrivalBattery,
          charge_to_pct: chargeTo,
          charge_time_min: Math.max(10, chargeTime),
          charger_power_kw: 50,
          price_per_kwh: 0,
          availability: "unavailable",
          connector_type: "CCS2",
          source: "estimated",
        };
        dataSource = "offline";
      }

      stops.push(stop);
    }
  }

  const totalChargingTime = stops.reduce((s, c) => s + c.charge_time_min, 0);
  const totalCost = stops.reduce((s, c) => s + c.price_per_kwh, 0);

  return {
    source: input.source,
    destination: input.destination,
    total_distance_km: totalDistKm,
    estimated_duration_min: durationMin,
    estimated_duration_traffic_min: durationTrafficMin,
    stops_required: stopsNeeded,
    recommended_stops: stops,
    total_charging_cost_paise: totalCost,
    total_charging_time_min: totalChargingTime,
    polyline,
    data_source: dataSource,
  };
}

// Generate evenly spaced midpoints between origin and destination
function computeMidpoints(
  origin: { lat: number; lng: number } | null,
  dest: { lat: number; lng: number } | null,
  count: number,
): Array<{ lat: number; lng: number } | null> {
  if (!origin || !dest) return Array(count).fill(null);
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / (count + 1);
    return {
      lat: origin.lat + (dest.lat - origin.lat) * t,
      lng: origin.lng + (dest.lng - origin.lng) * t,
    };
  });
}

// Rough offline distance estimate using Haversine if coords known, else lookup table
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "delhi": { lat: 28.61, lng: 77.21 }, "noida": { lat: 28.57, lng: 77.32 },
  "agra": { lat: 27.18, lng: 78.01 }, "jaipur": { lat: 26.91, lng: 75.79 },
  "udaipur": { lat: 24.58, lng: 73.69 }, "mumbai": { lat: 19.08, lng: 72.88 },
  "pune": { lat: 18.52, lng: 73.86 }, "bangalore": { lat: 12.97, lng: 77.59 },
  "mysore": { lat: 12.30, lng: 76.65 }, "chennai": { lat: 13.08, lng: 80.27 },
  "hyderabad": { lat: 17.39, lng: 78.49 }, "patna": { lat: 25.59, lng: 85.13 },
  "kolkata": { lat: 22.57, lng: 88.36 }, "ahmedabad": { lat: 23.03, lng: 72.59 },
  "lucknow": { lat: 26.85, lng: 80.95 }, "indore": { lat: 22.72, lng: 75.86 },
};

function estimateDistanceFallback(src: string, dst: string): number {
  const a = CITY_COORDS[src.toLowerCase()];
  const b = CITY_COORDS[dst.toLowerCase()];
  if (a && b) return Math.round(haversine(a.lat, a.lng, b.lat, b.lng) * 1.25);
  return 300; // generic fallback
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isAbort(e: unknown) { return e instanceof DOMException && e.name === "AbortError"; }
