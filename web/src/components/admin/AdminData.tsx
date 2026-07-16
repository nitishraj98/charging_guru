"use client";
// Reference-data layer for the admin panel — fetches users/stations/chargers
// once and exposes lookup maps so every page can show "Acme Motors — Priya
// Sharma" instead of a bare owner_id, with zero backend changes (client-side
// joins over the existing paginated list endpoints).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/admin-ui";

export interface AdminUser {
  id: string; phone: string; email: string | null; full_name: string | null;
  status: string; referral_code: string; reward_points: number;
  role_names: string[]; created_at: string;
}
export interface AdminStation {
  id: string; name: string; address: string; city: string | null; state: string | null;
  lat: number; lng: number; status: string; owner_id: string;
  rating_avg: number; rating_count: number; created_at: string;
}
export interface AdminCharger {
  id: string; station_id: string; label: string; charger_type: string;
  power_kw: number; connector_type: string; status: string;
  price_per_kwh: number; created_at: string;
}

interface Paged<T> { items: T[]; total: number; page: number; per_page: number; pages: number; }

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let page = 1, pages = 1;
  do {
    const res = await authFetch(`${path}${path.includes("?") ? "&" : "?"}page=${page}&per_page=100`);
    if (!res.ok) break;
    const json: Paged<T> = await res.json();
    out.push(...json.items);
    pages = json.pages;
    page++;
  } while (page <= pages && page <= 20); // hard cap — 2000 records is plenty for a client-side join
  return out;
}

interface AdminDataCtx {
  loading: boolean;
  error: string;
  users: AdminUser[];
  stations: AdminStation[];
  chargers: AdminCharger[];
  userById: Map<string, AdminUser>;
  stationById: Map<string, AdminStation>;
  chargerById: Map<string, AdminCharger>;
  chargersByStation: Map<string, AdminCharger[]>;
  stationsByOwner: Map<string, AdminStation[]>;
  owners: AdminUser[];
  refresh: () => void;
}

const Ctx = createContext<AdminDataCtx | null>(null);

export function useAdminData(): AdminDataCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminData must be used within AdminDataProvider");
  return ctx;
}

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stations, setStations] = useState<AdminStation[]>([]);
  const [chargers, setChargers] = useState<AdminCharger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gen, setGen] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [u, s, c] = await Promise.all([
        fetchAllPages<AdminUser>("/api/v1/admin/users"),
        fetchAllPages<AdminStation>("/api/v1/admin/stations"),
        fetchAllPages<AdminCharger>("/api/v1/admin/chargers"),
      ]);
      setUsers(u); setStations(s); setChargers(c);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reference data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, gen]);

  const derived = useMemo(() => {
    const userById = new Map(users.map(u => [u.id, u]));
    const stationById = new Map(stations.map(s => [s.id, s]));
    const chargerById = new Map(chargers.map(c => [c.id, c]));
    const chargersByStation = new Map<string, AdminCharger[]>();
    chargers.forEach(c => {
      const arr = chargersByStation.get(c.station_id) ?? [];
      arr.push(c);
      chargersByStation.set(c.station_id, arr);
    });
    const stationsByOwner = new Map<string, AdminStation[]>();
    stations.forEach(s => {
      const arr = stationsByOwner.get(s.owner_id) ?? [];
      arr.push(s);
      stationsByOwner.set(s.owner_id, arr);
    });
    const owners = users.filter(u => u.role_names.includes("ROLE_STATION_OWNER"));
    return { userById, stationById, chargerById, chargersByStation, stationsByOwner, owners };
  }, [users, stations, chargers]);

  const value: AdminDataCtx = {
    loading, error, users, stations, chargers,
    refresh: () => setGen(g => g + 1),
    ...derived,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
