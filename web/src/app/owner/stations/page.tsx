"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Zap, Plus, ChevronRight, RefreshCw, Search, Star } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { authFetch } from "@/lib/admin-ui";
import { getOwnerTheme, Card, EmptyState, PageHeader, StatusBadge, Button, CardListSkeleton } from "@/components/owner";

interface Charger { id: string; status: string; }
interface Station {
  id: string; name: string; city: string | null; address: string;
  status: string; rating_avg: number; chargers: Charger[];
}

const FILTERS = ["All", "ACTIVE", "PENDING_APPROVAL", "SUSPENDED"] as const;

export default function OwnerStationsListPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const th = getOwnerTheme(isLight);

  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState("");
  const [query, setQuery]       = useState("");
  const [filter, setFilter]     = useState<typeof FILTERS[number]>("All");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    setError("");
    try {
      const res = await authFetch("/api/v1/owner/stations");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStations(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load stations");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return stations.filter(s => {
      if (filter !== "All" && s.status !== filter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
    });
  }, [stations, query, filter]);

  if (loading) return (
    <div className="owner-pad">
      <div style={{ width: 160, height: 26, background: th.raised, borderRadius: 8, marginBottom: 24 }} />
      <CardListSkeleton th={th} count={4} />
    </div>
  );

  return (
    <div className="owner-pad owner-fade-up">
      <PageHeader
        th={th}
        title="My Stations"
        subtitle={`${stations.length} station${stations.length !== 1 ? "s" : ""} registered to your account`}
        actions={<>
          <Button th={th} variant="secondary" icon={<RefreshCw size={13} style={{ animation: refreshing ? "owner-spin .7s linear infinite" : "none" }} />} onClick={() => load(true)} disabled={refreshing}>Refresh</Button>
          <Button th={th} variant="primary" icon={<Plus size={14} strokeWidth={2.5} />} onClick={() => router.push("/owner/stations/new")}>Add Station</Button>
        </>}
      />

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 16, background: th.dangerDim, border: `1px solid ${th.danger}30`, color: th.danger, fontSize: 13 }}>{error}</div>
      )}

      {stations.length === 0 ? (
        <EmptyState
          th={th}
          icon={<MapPin size={24} color={th.accent} />}
          title="No stations yet"
          description="Add your first charging station to start accepting bookings."
          action={<Button th={th} variant="primary" onClick={() => router.push("/owner/stations/new")}>Add your first station →</Button>}
        />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
              <Search size={14} color={th.textMuted} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, city, address…"
                style={{ width: "100%", boxSizing: "border-box", padding: "9px 14px 9px 36px", borderRadius: 10, background: th.raised, border: `1px solid ${th.border}`, color: th.text, fontSize: 13, outline: "none", fontFamily: th.sans }}
              />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "8px 13px", borderRadius: 9, fontSize: 12, fontWeight: 650, cursor: "pointer", fontFamily: th.sans,
                  background: filter === f ? th.accentDim : th.card, border: `1px solid ${filter === f ? th.accentBorder : th.border}`,
                  color: filter === f ? th.accent : th.textSub,
                }}>{f === "All" ? "All" : f === "PENDING_APPROVAL" ? "Pending" : f.charAt(0) + f.slice(1).toLowerCase()}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: th.textSub }}>No stations match your search.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map(station => {
                const avail = station.chargers.filter(c => c.status === "AVAILABLE").length;
                return (
                  <Card key={station.id} th={th} hover padding={0} style={{ overflow: "hidden" }}>
                    <button onClick={() => router.push(`/owner/stations/${station.id}`)} style={{
                      display: "flex", alignItems: "center", gap: 16, textAlign: "left", width: "100%",
                      background: "none", border: "none", padding: "18px 20px", cursor: "pointer", fontFamily: "inherit",
                    }}>
                      <div style={{ width: 46, height: 46, borderRadius: 13, background: th.accentDim, border: `1.5px solid ${th.accentBorder}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <MapPin size={19} color={th.accent} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: th.text }}>{station.name}</span>
                          <StatusBadge status={station.status} th={th} />
                        </div>
                        <div style={{ fontSize: 12.5, color: th.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {station.city ? `${station.city} · ` : ""}{station.address}
                        </div>
                        {station.rating_avg > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                            <Star size={10} fill={th.warn} color={th.warn} />
                            <span style={{ fontSize: 11.5, color: th.textSub }}>{station.rating_avg.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "5px 12px", borderRadius: 999, background: avail > 0 ? th.successDim : th.raised, border: `1px solid ${avail > 0 ? th.accentBorder : th.border}` }}>
                        <Zap size={11} color={avail > 0 ? th.success : th.textSub} />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: avail > 0 ? th.success : th.textSub, fontFamily: th.mono }}>{avail}/{station.chargers.length}</span>
                      </div>
                      <ChevronRight size={16} color={th.textMuted} style={{ flexShrink: 0 }} />
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
