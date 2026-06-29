"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { stations, Station, Charger } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

const AMENITY_ICONS: Record<string, string> = {
  cafe: "☕", coffee: "☕", restroom: "🚻", washroom: "🚻",
  wifi: "📶", parking: "🅿", store: "🛒",
};

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  AVAILABLE:   { color: "#4DFFA6", bg: "rgba(0,230,118,.1)",  label: "Available" },
  BOOKED:      { color: "#FFC043", bg: "rgba(255,192,67,.1)", label: "Booked" },
  OCCUPIED:    { color: "#22D3EE", bg: "rgba(34,211,238,.1)", label: "In session" },
  IN_USE:      { color: "#22D3EE", bg: "rgba(34,211,238,.1)", label: "In session" },
  MAINTENANCE: { color: "#FF7849", bg: "rgba(255,120,73,.1)", label: "Maintenance" },
  OFFLINE:     { color: "#495154", bg: "rgba(73,81,84,.1)",   label: "Offline" },
};

const REVIEWS = [
  { name: "Arjun M.", rating: 5, text: "Fast, clean, and the booking guaranteed my slot on a busy evening. The CCS2 bay gave a full charge in 45 minutes flat." },
  { name: "Meera N.", rating: 5, text: "The café made the 40-min wait easy. Staff were helpful and the charger started the moment I scanned the QR." },
  { name: "Rahul K.", rating: 4, text: "Solid station. Only one bay was occupied when I arrived. Pricing is fair for fast DC." },
];

export default function StationDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { isLight } = useTheme();
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"chargers" | "reviews">("chargers");

  const bg = isLight ? "#F8FAFC" : "#0A0D0E";
  const cardBg = isLight ? "#FFFFFF" : "#101415";
  const cardBorder = isLight ? "#E2E8F0" : "#222829";
  const cardBorderHover = isLight ? "#CBD5E1" : "#2E3638";
  const raisedBg = isLight ? "#F1F5F9" : "#181D1F";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub = isLight ? "#64748B" : "#6B7479";
  const textMuted = isLight ? "#94A3B8" : "#495154";
  const accent = isLight ? "#00D26A" : "#00E676";

  useEffect(() => {
    stations.get(id).then(setStation).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: cardBorder, borderTopColor: accent }} />
        <span style={{ color: textSub, fontSize: 14 }}>Loading station…</span>
      </div>
    </div>
  );

  if (!station) return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />
      <div style={{ padding: 40, color: "#FF5A5F" }}>Station not found.</div>
    </div>
  );

  const available = station.chargers?.filter(c => c.status === "AVAILABLE") ?? [];
  const chargers = station.chargers ?? [];

  return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />

      {/* Hero banner */}
      <div style={{
        position: "relative", height: 260, overflow: "hidden",
        background: isLight ? "linear-gradient(160deg,#ECFDF5 0%,#F0FDF4 40%,#F8FAFC 100%)" : "linear-gradient(160deg,#0a2518 0%,#0d1a12 40%,#080c0d 100%)",
      }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: isLight ? .04 : .08 }} viewBox="0 0 100 40" preserveAspectRatio="none">
          {Array.from({ length: 10 }).map((_, i) => <line key={`v${i}`} x1={i * 12} y1="0" x2={i * 12} y2="40" stroke="#00D26A" strokeWidth=".3"/>)}
          {Array.from({ length: 6 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i * 9} x2="100" y2={i * 9} stroke="#00D26A" strokeWidth=".3"/>)}
        </svg>
        <div style={{ position: "absolute", right: "15%", top: "-30%", width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle,${isLight ? "rgba(0,210,106,.08)" : "rgba(0,230,118,.12)"} 0%,transparent 70%)` }} />
        <button onClick={() => router.back()} style={{
          position: "absolute", top: 20, left: 24, width: 36, height: 36, borderRadius: 10,
          background: isLight ? "rgba(255,255,255,.8)" : "rgba(16,20,21,.8)",
          border: `1px solid ${cardBorder}`, color: textPrimary, cursor: "pointer", display: "grid", placeItems: "center", fontSize: 16,
        }}>←</button>

        <div style={{ position: "absolute", bottom: 24, left: 24, right: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: isLight ? "#DCFCE7" : "#00532B", border: isLight ? "1px solid #86EFAC" : "1px solid #00A455", color: isLight ? "#16A34A" : "#4DFFA6" }}>⚡ Fast charging</span>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: isLight ? "rgba(0,0,0,.04)" : "rgba(0,0,0,.4)", border: `1px solid ${cardBorder}`, color: textSub }}>Open 24h</span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, letterSpacing: "-.02em", color: textPrimary }}>{station.name}</h1>
              <p style={{ color: textSub, fontSize: 14 }}>
                {station.rating_avg > 0 && `★ ${station.rating_avg.toFixed(1)} (${station.rating_count}) · `}
                {station.city && `${station.city} · `}{station.address}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: isLight ? "rgba(255,255,255,.8)" : "rgba(16,20,21,.7)", border: `1px solid ${cardBorder}` }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: available.length > 0 ? accent : "#FFC043", display: "inline-block", boxShadow: available.length > 0 ? "0 0 6px rgba(0,210,106,.6)" : "none" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{available.length}/{chargers.length} chargers open</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="fade-up" style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>

          {/* Left column */}
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
              {["📍 Directions", "↗ Share"].map(label => (
                <button key={label} style={{
                  flex: 1, padding: "11px 16px", borderRadius: 12,
                  background: cardBg, border: `1px solid ${cardBorder}`,
                  color: textPrimary, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                  boxShadow: isLight ? "0 1px 3px rgba(0,0,0,.05)" : "none",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = cardBorderHover}
                onMouseLeave={e => e.currentTarget.style.borderColor = cardBorder}
                >{label}</button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 2, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 4, marginBottom: 20 }}>
              {(["chargers", "reviews"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  flex: 1, padding: "9px", borderRadius: 9,
                  background: activeTab === t ? raisedBg : "transparent",
                  color: activeTab === t ? textPrimary : textSub,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: activeTab === t ? `1px solid ${cardBorder}` : "1px solid transparent",
                  textTransform: "capitalize", transition: "all .15s",
                }}>{t === "chargers" ? `Chargers (${chargers.length})` : `Reviews (${station.rating_count || 3})`}</button>
              ))}
            </div>

            {activeTab === "chargers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {chargers.map((c: Charger) => {
                  const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.OFFLINE;
                  return (
                    <div key={c.id} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "16px 18px", transition: "all .15s", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: raisedBg, border: `1px solid ${cardBorder}`, display: "grid", placeItems: "center", fontSize: 20 }}>
                          {c.charger_type === "DC" ? "⚡" : "🔌"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, color: textPrimary }}>{c.label} · {c.connector_type}</div>
                          <div style={{ fontSize: 12, color: textSub }}>{c.power_kw}kW · ₹{(c.price_per_kwh / 100).toFixed(0)}/kWh</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: s.color, background: s.bg, marginBottom: 8 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block" }} />{s.label}
                          </span>
                          {c.status === "AVAILABLE" && (
                            <div>
                              <button onClick={() => router.push(`/booking/${c.id}?station=${id}`)} style={{ padding: "8px 18px", borderRadius: 10, background: "linear-gradient(135deg,#00D26A,#00A855)", color: "#FFF", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>Select →</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: textMuted, marginBottom: 5 }}>
                          <span>Power</span><span>{c.power_kw}kW</span>
                        </div>
                        <div style={{ height: 4, background: cardBorder, borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 999, width: `${Math.min(100, (c.power_kw / 150) * 100)}%`, background: c.charger_type === "DC" ? "linear-gradient(90deg,#00E676,#26F593)" : "#22D3EE" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "reviews" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {REVIEWS.map((r, i) => (
                  <div key={i} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "18px 20px", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: `hsl(${i * 80 + 140},50%,${isLight ? "45%" : "35%"})`, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>{r.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: textPrimary }}>{r.name}</div>
                        <div style={{ color: "#FFC043", fontSize: 12 }}>{"★".repeat(r.rating)}</div>
                      </div>
                    </div>
                    <p style={{ color: textSub, fontSize: 13, lineHeight: 1.65 }}>{r.text}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 20 }}>
              {["✓ Instant confirmation", "✓ Hold guaranteed", "✓ Cancel anytime"].map(t => (
                <div key={t} style={{ padding: "10px 12px", borderRadius: 10, background: isLight ? "#F0FDF4" : "rgba(0,230,118,.04)", border: isLight ? "1px solid #BBF7D0" : "1px solid rgba(0,164,85,.2)", fontSize: 11, color: isLight ? "#16A34A" : "#4DFFA6", textAlign: "center", fontWeight: 600 }}>{t}</div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "18px 20px", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
              <h3 style={{ fontSize: 13, color: textSub, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 16, fontWeight: 600 }}>Amenities</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {(station.amenities ?? []).map((a: string) => (
                  <span key={a} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999, fontSize: 13, background: raisedBg, border: `1px solid ${cardBorder}`, color: textPrimary }}>
                    {AMENITY_ICONS[a.toLowerCase()] ?? "•"} {a}
                  </span>
                ))}
                {(!station.amenities || station.amenities.length === 0) && <span style={{ color: textMuted, fontSize: 13 }}>No amenities listed</span>}
              </div>
            </div>

            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "18px 20px", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
              <h3 style={{ fontSize: 13, color: textSub, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 16, fontWeight: 600 }}>Station stats</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Sessions today", val: "38" },
                  { label: "Avg wait time", val: "< 2 min" },
                  { label: "Uptime", val: "99.1%" },
                  { label: "Rating", val: station.rating_avg > 0 ? `${station.rating_avg.toFixed(1)} ★` : "4.6 ★" },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 11, color: textMuted, marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: textPrimary }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {available.length > 0 && (
              <button onClick={() => router.push(`/booking/${available[0].id}?station=${id}`)} className="pulse-glow" style={{ width: "100%", padding: "16px 20px", borderRadius: 14, background: "linear-gradient(135deg,#00D26A,#00A855)", color: "#FFF", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer" }}>
                Book {available[0].label} · {available[0].power_kw}kW →
              </button>
            )}

            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, height: 140, overflow: "hidden", position: "relative" }}>
              <svg viewBox="0 0 100 50" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%" }}>
                <rect width="100" height="50" fill={isLight ? "#E8F0F5" : "#080C0D"}/>
                <path d="M0,20 H100 M0,35 H100 M30,0 V50 M65,0 V50" stroke={isLight ? "#CBD5E1" : "#181D1F"} strokeWidth="4" fill="none"/>
                <rect x="8" y="6" width="18" height="10" rx="2" fill={isLight ? "#BFDBFE" : "#0d1213"} opacity=".7"/>
                <rect x="40" y="5" width="20" height="12" rx="2" fill={isLight ? "#BFDBFE" : "#0d1213"} opacity=".7"/>
                <rect x="70" y="8" width="22" height="14" rx="2" fill={isLight ? "#BFDBFE" : "#0d1213"} opacity=".7"/>
                <polygon points="0,42 50,36 100,44 100,50 0,50" fill={isLight ? "#BFDBFE" : "#06181c"}/>
              </svg>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 16, height: 16, borderRadius: "50%", background: accent, boxShadow: "0 0 0 4px rgba(0,210,106,.2),0 0 0 8px rgba(0,210,106,.08)" }} />
              <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", fontSize: 11, color: textMuted }}>Tap for directions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
