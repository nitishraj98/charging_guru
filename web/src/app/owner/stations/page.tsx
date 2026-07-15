"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Zap, Plus, ChevronRight, RefreshCw } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { authFetch } from "@/lib/admin-ui";

interface Charger {
  id: string; status: string;
}
interface Station {
  id: string; name: string; city: string | null; address: string;
  status: string; rating_avg: number; chargers: Charger[];
}

const STATION_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  ACTIVE:           { color: "#00E676", bg: "rgba(0,230,118,.12)",  label: "Active" },
  PENDING_APPROVAL: { color: "#FFC043", bg: "rgba(255,192,67,.12)", label: "Pending Review" },
  SUSPENDED:        { color: "#FF7849", bg: "rgba(255,120,73,.12)", label: "Suspended" },
  REJECTED:         { color: "#FF5A5F", bg: "rgba(255,90,95,.12)",  label: "Rejected" },
};

export default function OwnerStationsListPage() {
  const router = useRouter();
  const { isLight } = useTheme();

  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState("");

  const cardBg      = isLight ? "#FFFFFF" : "#101415";
  const cardBorder  = isLight ? "#CBD5E1" : "#222829";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#6B7479";
  const accent      = isLight ? "#00D26A" : "#00E676";
  const raisedBg    = isLight ? "#F1F5F9" : "#181D1F";

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

  if (loading) return (
    <div className="owner-pad" style={{ padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${cardBorder}`, borderTopColor: accent, animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="owner-pad" style={{ padding: "28px 32px", maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>My Stations</h1>
          <p style={{ fontSize: 13, color: textSub }}>{stations.length} station{stations.length !== 1 ? "s" : ""} registered to your account</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => load(true)} disabled={refreshing} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 11,
            background: cardBg, border: `1px solid ${cardBorder}`, color: textSub, fontSize: 13, fontWeight: 600,
            cursor: refreshing ? "not-allowed" : "pointer", opacity: refreshing ? 0.6 : 1,
          }}>
            <RefreshCw size={13} style={{ animation: refreshing ? "spin .7s linear infinite" : "none" }} />
            Refresh
          </button>
          <button onClick={() => router.push("/owner/stations/new")} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 11,
            background: `linear-gradient(135deg,${accent},#00A855)`, color: "#050708", fontSize: 13, fontWeight: 700,
            border: "none", cursor: "pointer",
            boxShadow: isLight ? "0 4px 14px rgba(0,210,106,.35)" : "0 0 0 1px rgba(0,210,106,.3), 0 4px 20px rgba(0,210,106,.2)",
          }}>
            <Plus size={14} strokeWidth={2.5} /> Add Station
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 16, background: "rgba(255,90,95,.07)", border: "1px solid rgba(255,90,95,.22)", color: "#FF5A5F", fontSize: 13 }}>{error}</div>
      )}

      {stations.length === 0 ? (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "64px 24px", textAlign: "center" }}>
          <MapPin size={30} color={accent} style={{ marginBottom: 14 }} />
          <h2 style={{ fontSize: 17, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>No stations yet</h2>
          <p style={{ fontSize: 13, color: textSub, marginBottom: 20 }}>Add your first charging station to start accepting bookings.</p>
          <button onClick={() => router.push("/owner/stations/new")} style={{
            padding: "11px 24px", borderRadius: 12, background: `linear-gradient(135deg,${accent},#00A855)`,
            color: "#050708", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
          }}>Add your first station →</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {stations.map(station => {
            const badge = STATION_BADGE[station.status] ?? { color: textSub, bg: raisedBg, label: station.status };
            const avail = station.chargers.filter(c => c.status === "AVAILABLE").length;
            return (
              <button key={station.id} onClick={() => router.push(`/owner/stations/${station.id}`)} style={{
                display: "flex", alignItems: "center", gap: 16, textAlign: "left", width: "100%",
                background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "18px 20px",
                cursor: "pointer", fontFamily: "inherit", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none",
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: isLight ? "#F0FDF4" : "#0C1F12", border: `1.5px solid ${badge.color}30`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <MapPin size={18} color={badge.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: textPrimary }}>{station.name}</span>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg }}>{badge.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {station.city ? `${station.city} · ` : ""}{station.address}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "5px 12px", borderRadius: 999, background: avail > 0 ? "rgba(0,230,118,.1)" : "rgba(73,81,84,.12)", border: `1px solid ${avail > 0 ? "rgba(0,230,118,.25)" : "rgba(73,81,84,.25)"}` }}>
                  <Zap size={11} color={avail > 0 ? "#00E676" : textSub} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: avail > 0 ? "#00E676" : textSub }}>{avail}/{station.chargers.length}</span>
                </div>
                <ChevronRight size={16} color={textSub} style={{ flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
