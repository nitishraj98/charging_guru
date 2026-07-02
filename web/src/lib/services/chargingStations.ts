// Charging station data service.
// Primary: Charging Guru backend (/api/v1/stations)
// Fallback: Open Charge Map public API (no key needed for basic usage)
// Never fabricate data — if both fail, throw so UI can show an error state.

import { config } from "./config";
import { jsonFetch } from "./http";

export interface NearbyParams {
  lat: number;
  lng: number;
  radius_km?: number;
  q?: string;
  signal?: AbortSignal;
}

export interface StationSummary {
  id: string;
  name: string;
  address: string;
  city?: string;
  lat: number;
  lng: number;
  status: string;
  rating_avg: number;
  rating_count: number;
  amenities: string[];
  chargers: ChargerSummary[];
  available_chargers?: number;   // from backend list response
  total_chargers?: number;       // from backend list response
  distance_km?: number;
  source: "backend" | "ocm";
}

export interface ChargerSummary {
  id: string;
  label: string;
  charger_type: string;
  connector_type: string;
  power_kw: number;
  price_per_kwh: number;  // paise
  status: string;
}

// Backend list response shape (no chargers array — only counts)
interface BackendStationListItem extends Omit<StationSummary, "chargers" | "source"> {
  available_chargers: number;
  total_chargers: number;
}

// Build synthetic charger stubs from counts so UI status/free-count logic works
function synthChargers(avail: number, total: number): ChargerSummary[] {
  return Array.from({ length: total }, (_, i) => ({
    id: `stub_${i}`,
    label: `Bay ${i + 1}`,
    charger_type: "DC",
    connector_type: "CCS2",
    power_kw: 50,
    price_per_kwh: 0,
    status: i < avail ? "AVAILABLE" : "BOOKED",
  }));
}

// Main entry point — backend first, OCM fallback
export async function fetchNearbyStations(params: NearbyParams): Promise<StationSummary[]> {
  const { lat, lng, radius_km = 50, q, signal } = params;

  // 1. Try backend
  try {
    const qs = new URLSearchParams({ lat: String(lat), lng: String(lng), radius_km: String(radius_km) });
    if (q) qs.set("q", q);
    const data = await jsonFetch<BackendStationListItem[]>(
      `${config.apiBase}/api/v1/stations?${qs}`,
      { signal, dedupe: true },
    );
    return data.map(s => ({
      ...s,
      chargers: synthChargers(s.available_chargers ?? 0, s.total_chargers ?? 0),
      source: "backend" as const,
    }));
  } catch (backendErr) {
    if (isAbort(backendErr)) throw backendErr;
    console.warn("[stations] Backend unavailable, falling back to OCM:", backendErr);
  }

  // 2. Fallback: Open Charge Map
  return fetchOCMStations({ lat, lng, radius_km, q, signal });
}

async function fetchOCMStations(params: NearbyParams): Promise<StationSummary[]> {
  const { lat, lng, radius_km = 25, signal } = params;

  const qs = new URLSearchParams({
    output: "json",
    latitude: String(lat),
    longitude: String(lng),
    distance: String(radius_km),
    distanceunit: "KM",
    maxresults: "30",
    compact: "true",
    verbose: "false",
    countrycode: "IN",
  });
  if (config.openChargeMapKey) qs.set("key", config.openChargeMapKey);

  const raw = await jsonFetch<OCMStation[]>(
    `https://api.openchargemap.io/v3/poi/?${qs}`,
    { signal },
  );

  return raw.map(mapOCM);
}

interface OCMStation {
  ID: number;
  AddressInfo: { Title: string; AddressLine1?: string; Town?: string; Latitude: number; Longitude: number; Distance?: number; };
  Connections?: Array<{ PowerKW?: number; ConnectionType?: { Title?: string }; StatusType?: { IsOperational?: boolean } }>;
  StatusType?: { IsOperational?: boolean };
}

function mapOCM(s: OCMStation): StationSummary {
  const operational = s.StatusType?.IsOperational !== false;
  return {
    id: `ocm_${s.ID}`,
    name: s.AddressInfo.Title,
    address: s.AddressInfo.AddressLine1 ?? "",
    city: s.AddressInfo.Town,
    lat: s.AddressInfo.Latitude,
    lng: s.AddressInfo.Longitude,
    status: operational ? "AVAILABLE" : "OFFLINE",
    rating_avg: 0,
    rating_count: 0,
    amenities: [],
    distance_km: s.AddressInfo.Distance,
    source: "ocm",
    chargers: s.Connections?.slice(0, 4).map((c, i) => ({
      id: `ocm_${s.ID}_c${i}`,
      label: `Bay ${i + 1}`,
      charger_type: (c.PowerKW ?? 0) >= 22 ? "DC" : "AC",
      connector_type: c.ConnectionType?.Title ?? "Type 2",
      power_kw: c.PowerKW ?? 7,
      price_per_kwh: 0,
      status: c.StatusType?.IsOperational !== false ? "AVAILABLE" : "OFFLINE",
    })) ?? [],
  };
}

function isAbort(e: unknown) { return e instanceof DOMException && e.name === "AbortError"; }
