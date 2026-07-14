// Vehicle service — wraps backend /api/v1/vehicles.
// Falls back to a curated static list if the endpoint doesn't exist yet (404),
// so the route planner stays functional while the backend is being built.

import { config } from "./config";
import { jsonFetch } from "./http";

export interface UserVehicle {
  id: string;
  brand: string;
  model: string;
  battery_kwh: number;
  range_km: number;
  connector_type: string;
  is_default: boolean;
  label: string;             // "Brand Model" combined
  efficiency_km_per_kwh: number;
  source: "backend" | "static";
}

// Popular Indian EVs — used as fallback when backend has no vehicles endpoint
// or when the user is logged out.
export const STATIC_VEHICLES: UserVehicle[] = [
  { id: "mg_zs_ev",      brand: "MG",       model: "ZS EV",      battery_kwh: 50.3, range_km: 461, connector_type: "CCS2",   is_default: false, label: "MG ZS EV",       efficiency_km_per_kwh: 6.8, source: "static" },
  { id: "tata_nexon",    brand: "Tata",     model: "Nexon EV",   battery_kwh: 40.5, range_km: 465, connector_type: "CCS2",   is_default: false, label: "Tata Nexon EV",   efficiency_km_per_kwh: 7.0, source: "static" },
  { id: "hyundai_kona",  brand: "Hyundai",  model: "Kona EV",    battery_kwh: 39.2, range_km: 452, connector_type: "CCS2",   is_default: false, label: "Hyundai Kona EV", efficiency_km_per_kwh: 6.6, source: "static" },
  { id: "byd_atto3",     brand: "BYD",      model: "Atto 3",     battery_kwh: 60.5, range_km: 521, connector_type: "CCS2",   is_default: false, label: "BYD Atto 3",      efficiency_km_per_kwh: 7.2, source: "static" },
  { id: "tata_tigor",    brand: "Tata",     model: "Tigor EV",   battery_kwh: 26.0, range_km: 306, connector_type: "Type 2", is_default: false, label: "Tata Tigor EV",   efficiency_km_per_kwh: 6.2, source: "static" },
  { id: "mahindra_xuv",  brand: "Mahindra", model: "XUV400",     battery_kwh: 39.4, range_km: 456, connector_type: "CCS2",   is_default: false, label: "Mahindra XUV400", efficiency_km_per_kwh: 6.9, source: "static" },
];

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )cg_access=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// Returns user's vehicles from backend; falls back to static list on 404/401/network error.
export async function listVehicles(signal?: AbortSignal): Promise<UserVehicle[]> {
  const token = getToken();
  if (!token) return STATIC_VEHICLES;

  try {
    const raw = await jsonFetch<Array<{
      id: string; brand: string; model: string;
      battery_kwh: number; range_km?: number;
      connector_type: string; is_default: boolean;
    }>>(`${config.apiBase}/api/v1/vehicles`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
      dedupe: true,
    });

    if (!raw.length) return STATIC_VEHICLES;

    return raw.map(v => ({
      ...v,
      range_km: v.range_km ?? estimateRange(v.battery_kwh),
      label: `${v.brand} ${v.model}`,
      efficiency_km_per_kwh: estimateEfficiency(v.battery_kwh, v.range_km),
      source: "backend" as const,
    }));
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    // 404 → backend endpoint not built yet; fall through to static
    if (status === 404 || status === 401 || isAbort(err)) {
      if (isAbort(err)) throw err;
      return STATIC_VEHICLES;
    }
    console.warn("[vehicles] Backend error, using static list:", err);
    return STATIC_VEHICLES;
  }
}

function estimateRange(battery_kwh: number): number {
  return Math.round(battery_kwh * 6.5);
}

function estimateEfficiency(battery_kwh: number, range_km?: number): number {
  if (range_km && range_km > 0) return Math.round((range_km / battery_kwh) * 10) / 10;
  return 6.5;
}

function isAbort(e: unknown) { return e instanceof DOMException && e.name === "AbortError"; }
