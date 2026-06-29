"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@/contexts/UserContext";
import { MapPin, Zap, Clock, Plus, RefreshCw, ChevronRight, Activity } from "lucide-react";

function getToken() {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )cg_access=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : "";
}

interface Charger {
  id: string; label: string; connector_type: string;
  power_kw: number; price_per_kwh: number; status: string;
}
interface Station {
  id: string; name: string; city: string | null; address: string;
  status: string; rating_avg: number; chargers: Charger[];
}

const CHARGER_COLOR: Record<string, string> = {
  AVAILABLE:   "#00E676",
  BOOKED:      "#FFC043",
  OCCUPIED:    "#22D3EE",
  MAINTENANCE: "#FF7849",
  OFFLINE:     "#495154",
};

const STATION_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  ACTIVE:           { color: "#00E676", bg: "rgba(0,230,118,.12)",  label: "Active" },
  PENDING_APPROVAL: { color: "#FFC043", bg: "rgba(255,192,67,.12)", label: "Pending Review" },
  SUSPENDED:        { color: "#FF7849", bg: "rgba(255,120,73,.12)", label: "Suspended" },
  REJECTED:         { color: "#FF5A5F", bg: "rgba(255,90,95,.12)",  label: "Rejected" },
};

function getTheme(isLight: boolean) {
  return isLight ? {
    bg: "#F1F5F9", card: "#FFFFFF", raised: "#F8FAFC", raised2: "#EEF2F7",
    border: "rgba(15,23,42,0.08)", borderHi: "rgba(15,23,42,0.14)",
    text: "#0F172A", sub: "#64748B", muted: "#94A3B8",
    statGrad1: "linear-gradient(135deg,#FFFFFF,#F0FDF4)",
    statGrad2: "linear-gradient(135deg,#FFFFFF,#F0F9FF)",
    statGrad3: "linear-gradient(135deg,#FFFFFF,#FFFBEB)",
    statGrad4: "linear-gradient(135deg,#FFFFFF,#F0FDF4)",
  } : {
    bg: "#0A0D0E", card: "#111517", raised: "#181D1F", raised2: "#1E2428",
    border: "#1E2636", borderHi: "#2A3447",
    text: "#E6EBED", sub: "#6B7479", muted: "#495154",
    statGrad1: "linear-gradient(135deg,#111517,#0C2319)",
    statGrad2: "linear-gradient(135deg,#111517,#071A2E)",
    statGrad3: "linear-gradient(135deg,#111517,#2A1A04)",
    statGrad4: "linear-gradient(135deg,#111517,#0C2319)",
  };
}

const GREEN = "#00D26A";
const MONO  = "'JetBrains Mono',monospace";
const SANS  = "'Space Grotesk',system-ui,sans-serif";

function StatCard({
  label, value, sub, icon, accentColor, gradient, glowColor, isLight, th,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ReactNode; accentColor: string; gradient: string;
  glowColor: string; isLight: boolean; th: ReturnType<typeof getTheme>;
}) {
  return (
    <div style={{
      background: gradient,
      border: `1px solid ${isLight ? "rgba(15,23,42,0.07)" : accentColor + "22"}`,
      borderRadius: 18, padding: "22px 24px",
      boxShadow: isLight
        ? `0 1px 4px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.03)`
        : `0 0 0 1px ${accentColor}18, 0 8px 32px ${glowColor}`,
      position: "relative" as const, overflow: "hidden",
    }}>
      <div style={{
        position: "absolute" as const, top: -20, right: -20,
        width: 80, height: 80, borderRadius: "50%",
        background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const,
          color: accentColor, opacity: 0.9,
        }}>{label}</span>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `${accentColor}15`,
          border: `1px solid ${accentColor}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{icon}</div>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: th.text, lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: th.sub }}>{sub}</div>
    </div>
  );
}

function ChargerPill({ c, updating, onStatusChange, th, isLight }: {
  c: Charger; updating: boolean;
  onStatusChange: (id: string, status: string) => void;
  th: ReturnType<typeof getTheme>; isLight: boolean;
}) {
  const color = CHARGER_COLOR[c.status] ?? th.muted;
  const [open, setOpen] = useState(false);
  const OPTIONS = ["AVAILABLE", "MAINTENANCE", "OFFLINE"];
  const LABELS: Record<string, string> = { AVAILABLE: "Available", MAINTENANCE: "Maintenance", OFFLINE: "Offline" };

  return (
    <div style={{ position: "relative" as const }}>
      <div style={{
        background: th.raised2,
        border: `1px solid ${open ? color + "50" : th.border}`,
        borderRadius: 14, padding: "14px 16px",
        transition: "border-color .15s",
        boxShadow: open ? `0 0 0 3px ${color}10` : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: color, flexShrink: 0,
            boxShadow: `0 0 8px ${color}`,
          }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: th.text, flex: 1 }}>{c.label}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: th.muted, fontFamily: MONO }}>
            {c.power_kw}kW
          </span>
        </div>
        <div style={{ fontSize: 11, color: th.sub, marginBottom: 12, display: "flex", gap: 6 }}>
          <span style={{
            padding: "2px 7px", borderRadius: 6,
            background: `${color}12`, color, fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
          }}>{c.connector_type}</span>
          <span style={{ padding: "2px 7px", borderRadius: 6, background: th.raised, fontSize: 10, color: th.muted }}>
            ₹{(c.price_per_kwh / 100).toFixed(0)}/kWh
          </span>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          disabled={updating}
          style={{
            width: "100%", padding: "7px 12px", borderRadius: 9,
            background: open ? `${color}12` : isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${open ? color + "40" : th.border}`,
            color: open ? color : th.sub,
            fontSize: 12, fontWeight: 600, cursor: updating ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontFamily: SANS, transition: "all .12s",
          }}>
          <span>{LABELS[c.status] ?? c.status}</span>
          <ChevronRight size={12} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
        </button>
      </div>

      {open && (
        <div style={{
          position: "absolute" as const, bottom: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20,
          background: th.card, border: `1px solid ${th.borderHi}`,
          borderRadius: 12, overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,.25)",
        }}>
          {OPTIONS.map(opt => (
            <button key={opt}
              onClick={() => { setOpen(false); if (opt !== c.status) onStatusChange(c.id, opt); }}
              style={{
                width: "100%", padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 10,
                background: opt === c.status ? `${CHARGER_COLOR[opt]}10` : "transparent",
                border: "none", cursor: "pointer", textAlign: "left" as const,
                borderBottom: opt !== "OFFLINE" ? `1px solid ${th.border}` : "none",
                transition: "background .1s",
              }}
              onMouseEnter={e => { if (opt !== c.status) (e.currentTarget as HTMLElement).style.background = `${CHARGER_COLOR[opt]}08`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = opt === c.status ? `${CHARGER_COLOR[opt]}10` : "transparent"; }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: CHARGER_COLOR[opt], boxShadow: `0 0 6px ${CHARGER_COLOR[opt]}`, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: opt === c.status ? 700 : 500, color: opt === c.status ? CHARGER_COLOR[opt] : th.text }}>{LABELS[opt]}</span>
              {opt === c.status && <span style={{ marginLeft: "auto", fontSize: 11, color: CHARGER_COLOR[opt] }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OwnerDashboard() {
  const router = useRouter();
  const { isLight } = useTheme();
  const { user } = useUser();
  const th = getTheme(isLight);

  const [stations, setStations]               = useState<Station[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [error, setError]                     = useState("");
  const [updatingCharger, setUpdatingCharger] = useState<string | null>(null);
  const [now, setNow]                         = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/v1/owner/stations", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStations(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setChargerStatus(chargerId: string, newStatus: string) {
    setUpdatingCharger(chargerId);
    try {
      const res = await fetch(`/api/v1/chargers/${chargerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await load(true);
    } finally { setUpdatingCharger(null); }
  }

  const totalChargers     = stations.reduce((s, st) => s + st.chargers.length, 0);
  const availableChargers = stations.reduce((s, st) => s + st.chargers.filter(c => c.status === "AVAILABLE").length, 0);
  const activeStations    = stations.filter(s => s.status === "ACTIVE").length;
  const pendingStations   = stations.filter(s => s.status === "PENDING_APPROVAL").length;
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.full_name?.split(" ")[0] ?? "Partner";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 14, background: th.bg }}>
      <div style={{ position: "relative" as const, width: 48, height: 48 }}>
        <div style={{ width: 48, height: 48, border: `3px solid ${th.border}`, borderTopColor: GREEN, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <Zap size={16} color={GREEN} style={{ position: "absolute" as const, top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ color: th.sub, fontSize: 13, fontFamily: SANS }}>Loading your stations…</span>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px 48px", fontFamily: SANS, background: th.bg, minHeight: "100%" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: GREEN, letterSpacing: ".08em", marginBottom: 4, opacity: 0.85 }}>
            {greeting}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: th.text, letterSpacing: "-0.035em", marginBottom: 4 }}>
            {firstName}&apos;s Dashboard
          </h1>
          <p style={{ fontSize: 13, color: th.sub }}>
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            {" · "}{stations.length} station{stations.length !== 1 ? "s" : ""} · {totalChargers} charger{totalChargers !== 1 ? "s" : ""}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 16px", borderRadius: 11,
              background: th.card, border: `1px solid ${th.border}`,
              color: th.sub, fontSize: 13, fontWeight: 600, cursor: refreshing ? "not-allowed" : "pointer",
              fontFamily: SANS, opacity: refreshing ? 0.6 : 1,
            }}>
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }} />
            Refresh
          </button>
          <button onClick={() => router.push("/owner/stations/new")} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 20px", borderRadius: 11,
            background: `linear-gradient(135deg,${GREEN},#00A855)`,
            color: "#050708", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
            fontFamily: SANS,
            boxShadow: isLight ? "0 4px 14px rgba(0,210,106,.35)" : "0 0 0 1px rgba(0,210,106,.3), 0 4px 20px rgba(0,210,106,.2)",
          }}>
            <Plus size={14} strokeWidth={2.5} /> Add Station
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 32 }}>
        <StatCard
          label="Total Stations" value={stations.length}
          sub={`${activeStations} active${pendingStations ? `, ${pendingStations} pending` : ""}`}
          icon={<MapPin size={15} color={GREEN} />} accentColor={GREEN}
          gradient={th.statGrad1} glowColor="rgba(0,210,106,.08)" isLight={isLight} th={th}
        />
        <StatCard
          label="Total Chargers" value={totalChargers}
          sub={`${availableChargers} available right now`}
          icon={<Zap size={15} color="#22D3EE" />} accentColor="#22D3EE"
          gradient={th.statGrad2} glowColor="rgba(34,211,238,.06)" isLight={isLight} th={th}
        />
        <StatCard
          label="Pending Review" value={pendingStations}
          sub="awaiting admin approval"
          icon={<Clock size={15} color="#FFC043" />} accentColor="#FFC043"
          gradient={th.statGrad3} glowColor="rgba(255,192,67,.06)" isLight={isLight} th={th}
        />
        <StatCard
          label="Available Now" value={availableChargers}
          sub={`of ${totalChargers} total chargers`}
          icon={<Activity size={15} color={GREEN} />} accentColor={GREEN}
          gradient={th.statGrad4} glowColor="rgba(0,210,106,.08)" isLight={isLight} th={th}
        />
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 24, background: "rgba(255,90,95,.07)", border: "1px solid rgba(255,90,95,.22)", color: "#FF5A5F", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Stations ── */}
      {stations.length === 0 ? (
        <div style={{
          background: th.card, border: `1px solid ${th.border}`,
          borderRadius: 20, padding: "72px 24px", textAlign: "center",
          boxShadow: isLight ? "0 1px 6px rgba(0,0,0,.05)" : "none",
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: isLight ? "#F0FDF4" : "#0C2319",
            border: `1px solid ${GREEN}25`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 18px",
          }}>
            <MapPin size={26} color={GREEN} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: th.text, marginBottom: 8 }}>No stations yet</h2>
          <p style={{ fontSize: 13, color: th.sub, marginBottom: 24, maxWidth: 340, margin: "0 auto 24px" }}>
            Add your first charging station to start accepting bookings and earning revenue.
          </p>
          <button onClick={() => router.push("/owner/stations/new")} style={{
            padding: "12px 28px", borderRadius: 12,
            background: `linear-gradient(135deg,${GREEN},#00A855)`,
            color: "#050708", fontSize: 14, fontWeight: 700,
            border: "none", cursor: "pointer", fontFamily: SANS,
            boxShadow: isLight ? "0 4px 14px rgba(0,210,106,.3)" : "0 0 20px rgba(0,210,106,.2)",
          }}>Add your first station →</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {stations.map(station => {
            const badge = STATION_BADGE[station.status] ?? { color: th.sub, bg: `${th.sub}15`, label: station.status };
            const avail = station.chargers.filter(c => c.status === "AVAILABLE").length;

            return (
              <div key={station.id} style={{
                background: th.card,
                border: `1px solid ${isLight ? "rgba(15,23,42,0.07)" : th.border}`,
                borderRadius: 20, overflow: "visible",
                boxShadow: isLight ? "0 2px 12px rgba(0,0,0,.06)" : "0 0 0 1px #1E2636",
              }}>

                {/* Station header */}
                <div style={{
                  padding: "20px 24px",
                  borderBottom: `1px solid ${th.border}`,
                  background: isLight
                    ? "linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(240,255,244,0.3) 100%)"
                    : "linear-gradient(180deg,rgba(0,210,106,0.02) 0%,transparent 100%)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>

                    {/* Left: name + meta */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 13,
                        background: isLight ? "#F0FDF4" : "#0C1F12",
                        border: `1.5px solid ${badge.color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        boxShadow: `0 0 12px ${badge.color}18`,
                      }}>
                        <MapPin size={18} color={badge.color} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                          <span style={{ fontWeight: 800, fontSize: 16, color: th.text, letterSpacing: "-0.02em" }}>{station.name}</span>
                          <span style={{
                            padding: "3px 10px", borderRadius: 999,
                            fontSize: 10, fontWeight: 700, letterSpacing: ".05em",
                            color: badge.color, background: badge.bg,
                          }}>{badge.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: th.sub, display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={10} strokeWidth={2} style={{ flexShrink: 0 }} />
                          {station.city ? `${station.city} · ` : ""}{station.address}
                        </div>
                        {station.rating_avg > 0 && (
                          <div style={{ fontSize: 11, color: th.muted, marginTop: 4 }}>
                            ⭐ {station.rating_avg.toFixed(1)} rating
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: charger availability pill + actions */}
                    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "5px 12px", borderRadius: 999,
                          background: avail > 0 ? "rgba(0,230,118,.1)" : "rgba(73,81,84,.12)",
                          border: `1px solid ${avail > 0 ? "rgba(0,230,118,.25)" : "rgba(73,81,84,.25)"}`,
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: avail > 0 ? "#00E676" : th.muted, animation: avail > 0 ? "pulse-dot 2s ease-in-out infinite" : "none" }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: avail > 0 ? "#00E676" : th.muted }}>
                            {avail}/{station.chargers.length} free
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => router.push("/owner/bookings")}
                          style={{
                            padding: "7px 14px", borderRadius: 9,
                            background: th.raised, border: `1px solid ${th.border}`,
                            color: th.sub, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: SANS,
                            transition: "all .12s",
                          }}>
                          Bookings
                        </button>
                        <button onClick={() => router.push("/owner/sessions")}
                          style={{
                            padding: "7px 14px", borderRadius: 9,
                            background: `${GREEN}12`, border: `1px solid ${GREEN}35`,
                            color: GREEN, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: SANS,
                          }}>
                          Sessions
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chargers section */}
                <div style={{ padding: "18px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Zap size={12} color={GREEN} />
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: th.muted }}>
                        Chargers — {station.chargers.length}
                      </span>
                    </div>
                    {/* Mini status legend */}
                    <div style={{ display: "flex", gap: 12 }}>
                      {Object.entries({ AVAILABLE: "Available", BOOKED: "Booked", OFFLINE: "Offline" }).map(([k, v]) => (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: CHARGER_COLOR[k] }} />
                          <span style={{ fontSize: 10, color: th.muted }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {station.chargers.length === 0 ? (
                    <p style={{ fontSize: 13, color: th.muted, padding: "12px 0" }}>No chargers configured.</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
                      {station.chargers.map(c => (
                        <ChargerPill
                          key={c.id} c={c}
                          updating={updatingCharger === c.id}
                          onStatusChange={setChargerStatus}
                          th={th} isLight={isLight}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
