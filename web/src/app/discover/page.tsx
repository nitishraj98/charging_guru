"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Station } from "@/lib/api";
import NavBar from "@/components/NavBar";
import StationPin from "@/components/StationPin";
import { useTheme } from "@/contexts/ThemeContext";

const FILTERS = ["Near me", "⚡ Fast DC", "CCS2", "Type 2", "≥50kW", "★4.5+"];

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "#00E676", BOOKED: "#FFC043", OCCUPIED: "#22D3EE",
  IN_USE: "#22D3EE", MAINTENANCE: "#FF7849", OFFLINE: "#495154",
};

const PIN_POSITIONS = [
  { left: "30%", top: "38%" }, { left: "62%", top: "32%" },
  { left: "75%", top: "56%" }, { left: "20%", top: "62%" },
  { left: "50%", top: "20%" }, { left: "85%", top: "35%" },
];

export default function DiscoverPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [list, setList] = useState<Station[]>([]);
  const [activeFilter, setActiveFilter] = useState("Near me");
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  // theme tokens
  const bg = isLight ? "#F8FAFC" : "#0A0D0E";
  const panelBg = isLight ? "#FFFFFF" : "#0A0D0E";
  const border = isLight ? "#E2E8F0" : "#1a1f20";
  const cardBg = isLight ? "#FFFFFF" : "#101415";
  const cardBgHover = isLight ? "#F8FAFC" : "#181D1F";
  const cardBorder = isLight ? "#E2E8F0" : "#222829";
  const cardBorderHover = isLight ? "#CBD5E1" : "#2E3638";
  const inputBg = isLight ? "#F1F5F9" : "#101415";
  const inputBorder = isLight ? "#E2E8F0" : "#222829";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub = isLight ? "#64748B" : "#6B7479";
  const accent = isLight ? "#00D26A" : "#00E676";
  const accentText = isLight ? "#050708" : "#050708";
  const filterActiveBg = isLight ? "#DCFCE7" : "#00532B";
  const filterActiveBorder = isLight ? "#86EFAC" : "#00A455";
  const filterActiveText = isLight ? "#16A34A" : "#4DFFA6";
  const mapBg = isLight ? "#E8F0F5" : "#080C0D";

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )cg_access=([^;]*)/);
    setAuthed(!!match);
  }, []);

  const load = useCallback(async (searchTerm?: string) => {
    setApiError("");
    setLoading(true);
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const params = new URLSearchParams({ lat: "28.628", lng: "77.365", radius_km: "25" });
      if (searchTerm && searchTerm.length >= 2) params.set("q", searchTerm);
      const res = await fetch(`${BASE}/api/v1/stations?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setList(await res.json());
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : "Failed to load stations");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Debounced backend search when user types 2+ chars
  useEffect(() => {
    if (search.length < 2) return;
    const t = setTimeout(() => load(search), 400);
    return () => clearTimeout(t);
  }, [search, load]);

  // Reset to full list when search cleared
  useEffect(() => {
    if (search === "") load();
  }, [search, load]);

  function firstStatus(s: Station) {
    if (!s.chargers?.length) return "OFFLINE";
    if (s.chargers.find(c => c.status === "AVAILABLE")) return "AVAILABLE";
    if (s.chargers.find(c => c.status === "OCCUPIED" || c.status === "IN_USE")) return "OCCUPIED";
    return "MAINTENANCE";
  }

  function freeCount(s: Station) {
    return s.chargers?.filter(c => c.status === "AVAILABLE").length ?? 0;
  }

  const filtered = list.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: bg }}>
      <NavBar />

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "380px 1fr", overflow: "hidden" }}>

        {/* ── Left panel ── */}
        <div style={{ borderRight: `1px solid ${border}`, background: panelBg, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Search */}
          <div style={{ padding: "14px 16px 0" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: inputBg, border: `1px solid ${inputBorder}`,
              borderRadius: 14, padding: "10px 14px", transition: "border-color .15s",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="7" stroke={textSub} strokeWidth="2"/>
                <path d="M21 21l-4-4" stroke={textSub} strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search city or station…"
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: textPrimary, fontSize: 14 }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: textSub, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 7, padding: "10px 16px", overflowX: "auto", scrollbarWidth: "none" }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)} style={{
                padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                whiteSpace: "nowrap", cursor: "pointer", transition: "all .15s",
                background: activeFilter === f ? filterActiveBg : inputBg,
                border: `1px solid ${activeFilter === f ? filterActiveBorder : inputBorder}`,
                color: activeFilter === f ? filterActiveText : textSub,
              }}>{f}</button>
            ))}
          </div>

          {/* Results header */}
          <div style={{ padding: "4px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: textSub }}>
              {loading ? "Loading…" : apiError ? "Error loading" : `${filtered.length} stations`}
            </span>
          </div>

          {/* Station list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px" }}>
            {/* Loading skeletons */}
            {loading && [1, 2, 3].map(i => (
              <div key={i} style={{
                background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16,
                padding: "14px 16px", marginBottom: 8, height: 96, opacity: 1 - i * 0.2,
              }} />
            ))}

            {/* API error */}
            {!loading && apiError && (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
                <p style={{ fontSize: 14, color: textPrimary, fontWeight: 600, marginBottom: 6 }}>Could not load stations</p>
                <p style={{ fontSize: 12, color: textSub, marginBottom: 16 }}>Make sure the backend is running.</p>
                <button onClick={() => load()} style={{
                  padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: accent, color: "#050708", border: "none", cursor: "pointer",
                }}>Retry</button>
              </div>
            )}

            {/* Station cards */}
            {!loading && !apiError && filtered.map(s => (
              <div key={s.id}
                onClick={() => router.push(`/station/${s.id}`)}
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: hoveredId === s.id ? cardBgHover : cardBg,
                  border: `1px solid ${hoveredId === s.id ? cardBorderHover : cardBorder}`,
                  borderRadius: 16, padding: "14px 16px", marginBottom: 8,
                  cursor: "pointer", transition: "all .15s",
                  transform: hoveredId === s.id ? "translateX(2px)" : "none",
                  boxShadow: isLight && hoveredId === s.id ? "0 2px 12px rgba(0,0,0,.06)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ flex: 1, marginRight: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, color: textPrimary }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: textSub, fontFamily: "'JetBrains Mono',monospace" }}>
                      {s.distance_km != null ? `${s.distance_km.toFixed(1)} km` : ""}{" "}
                      {s.chargers?.[0] ? `· ⚡${s.chargers[0].power_kw}kW ${s.chargers[0].connector_type} · ₹${(s.chargers[0].price_per_kwh / 100).toFixed(0)}/kWh` : ""}
                      {s.rating_avg > 0 ? ` · ★${s.rating_avg.toFixed(1)}` : ""}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); router.push(`/station/${s.id}`); }}
                    style={{ padding: "6px 14px", borderRadius: 9, background: accent, color: accentText, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", flexShrink: 0 }}>Book</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {(s.chargers ?? []).slice(0, 4).map((c, i) => (
                    <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[c.status] ?? "#495154", boxShadow: c.status === "AVAILABLE" ? "0 0 4px rgba(0,230,118,.5)" : "none" }} />
                  ))}
                  <span style={{ fontSize: 11, color: textSub, marginLeft: 2 }}>{freeCount(s)}/{s.chargers?.length ?? 0} free</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, color: STATUS_COLOR[firstStatus(s)] ?? "#98A1A6", background: `${STATUS_COLOR[firstStatus(s)] ?? "#98A1A6"}18` }}>
                    {firstStatus(s) === "AVAILABLE" ? "● Open" : firstStatus(s) === "OCCUPIED" ? "◐ Busy" : "○ Closed"}
                  </span>
                </div>
              </div>
            ))}

            {/* Empty state (no error, no loading, no results) */}
            {!loading && !apiError && filtered.length === 0 && (
              <div style={{ padding: "40px 0", textAlign: "center", color: textSub }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 6 }}>No stations found</p>
                <p style={{ fontSize: 12 }}>Try a different search or check your connection.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Map ── */}
        <div style={{ position: "relative", overflow: "hidden", background: mapBg }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <polygon points="0,82 40,72 70,88 100,80 100,100 0,100" fill={isLight ? "#BFDBFE" : "#06181c"}/>
            <path d="M0,36 H100 M0,68 H100 M30,0 V100 M60,0 V100" stroke={isLight ? "#E2E8F0" : "#181D1F"} strokeWidth="3" fill="none"/>
            <path d="M-2,24 C30,30 60,18 102,28" stroke={isLight ? "#CBD5E1" : "#222829"} strokeWidth="6" fill="none"/>
            <path d="M48,-2 C44,40 58,70 52,102" stroke={isLight ? "#CBD5E1" : "#222829"} strokeWidth="6" fill="none"/>
            <path d="M0,52 C20,50 40,54 60,52 S90,48 100,50" stroke={isLight ? "#E2E8F0" : "#1a1f20"} strokeWidth="1.5" fill="none"/>
            {[
              { x: 8, y: 14, w: 20, h: 16 }, { x: 34, y: 10, w: 22, h: 14 },
              { x: 64, y: 16, w: 24, h: 20 }, { x: 10, y: 44, w: 26, h: 18 },
              { x: 44, y: 40, w: 18, h: 22 }, { x: 70, y: 48, w: 20, h: 22 },
            ].map((b, i) => (
              <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="2" fill={isLight ? "#DBEAFE" : "#181D1F"} />
            ))}
          </svg>

          <span style={{ position: "absolute", left: "46%", top: "64%", width: 16, height: 16, borderRadius: "50%", background: accent, boxShadow: "0 0 0 3px rgba(0,230,118,.2),0 0 0 7px rgba(0,230,118,.08)", transform: "translate(-50%,-50%)", zIndex: 4 }} />
          <span className="ripple" style={{ left: "46%", top: "64%" }} />

          {filtered.slice(0, 6).map((s, i) => {
            const pos = PIN_POSITIONS[i] ?? { left: `${25 + i * 12}%`, top: `${25 + i * 10}%` };
            return (
              <StationPin key={s.id} color={STATUS_COLOR[firstStatus(s)] ?? "#00E676"} count={freeCount(s)}
                onClick={() => router.push(`/station/${s.id}`)}
                style={{ left: pos.left, top: pos.top }} />
            );
          })}

          {!authed && (
            <div style={{
              position: "absolute", top: 16, right: 16,
              background: isLight ? "rgba(255,255,255,.95)" : "rgba(16,20,21,.9)",
              backdropFilter: "blur(20px)",
              border: isLight ? "1px solid #E2E8F0" : "1px solid rgba(0,230,118,.2)",
              borderRadius: 16, padding: "16px 20px", maxWidth: 230,
              boxShadow: isLight ? "0 4px 20px rgba(0,0,0,.08)" : "none",
            }}>
              <p style={{ fontSize: 13, color: isLight ? "#475569" : "#C2C9CD", marginBottom: 12, lineHeight: 1.5 }}>
                Sign in to book a slot and pay online.
              </p>
              <button onClick={() => router.push("/login")} style={{
                width: "100%", padding: "10px 16px", borderRadius: 10,
                background: "linear-gradient(135deg,#00D26A,#00A855)", color: "#FFF",
                fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
              }}>Sign in →</button>
            </div>
          )}

          <div style={{
            position: "absolute", bottom: 16, left: 16,
            background: isLight ? "rgba(255,255,255,.9)" : "rgba(16,20,21,.85)",
            backdropFilter: "blur(16px)",
            border: isLight ? "1px solid #E2E8F0" : "1px solid rgba(255,255,255,.06)",
            borderRadius: 12, padding: "10px 14px",
            display: "flex", gap: 16, fontSize: 11, color: textSub,
            boxShadow: isLight ? "0 2px 8px rgba(0,0,0,.06)" : "none",
          }}>
            {[["#00E676", "Available"], ["#FFC043", "Booked"], ["#22D3EE", "In session"], ["#FF7849", "Maintenance"]].map(([c, l]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block", boxShadow: `0 0 4px ${c}80` }} />{l}
              </span>
            ))}
          </div>

          <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            {["+", "−"].map(z => (
              <button key={z} style={{
                width: 36, height: 36, borderRadius: 10,
                background: isLight ? "rgba(255,255,255,.9)" : "rgba(16,20,21,.85)",
                backdropFilter: "blur(16px)",
                border: isLight ? "1px solid #E2E8F0" : "1px solid rgba(255,255,255,.08)",
                color: textSub, fontSize: 18, cursor: "pointer", display: "grid", placeItems: "center",
                boxShadow: isLight ? "0 2px 8px rgba(0,0,0,.06)" : "none",
              }}>{z}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
