"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import { VEHICLES } from "@/lib/api";

const POPULAR_ROUTES = [
  { from: "Delhi", to: "Agra",    km: 233 },
  { from: "Mumbai", to: "Pune",   km: 149 },
  { from: "Noida", to: "Patna",   km: 1010 },
  { from: "Bangalore", to: "Mysore", km: 150 },
  { from: "Chennai", to: "Hyderabad", km: 630 },
  { from: "Jaipur", to: "Udaipur",   km: 421 },
];

export default function PlanPage() {
  const router = useRouter();
  const { isLight } = useTheme();

  const [source, setSource]     = useState("");
  const [dest, setDest]         = useState("");
  const [vehicleId, setVehicleId] = useState(VEHICLES[0].id);
  const [battery, setBattery]   = useState(80);
  const [planning, setPlanning] = useState(false);
  const [error, setError]       = useState("");

  // theme
  const bg           = isLight ? "#F8FAFC" : "#0A0D0E";
  const cardBg       = isLight ? "#FFFFFF" : "#101415";
  const cardBorder   = isLight ? "#E2E8F0" : "#222829";
  const inputBg      = isLight ? "#F8FAFC" : "#0A0D0E";
  const inputBorder  = isLight ? "#E2E8F0" : "#2E3638";
  const textPrimary  = isLight ? "#0F172A" : "#E6EBED";
  const textSub      = isLight ? "#64748B" : "#6B7479";
  const textMuted    = isLight ? "#94A3B8" : "#495154";
  const accent       = isLight ? "#00D26A" : "#00E676";
  const accentDim    = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBorder = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";
  const raisedBg     = isLight ? "#F1F5F9" : "#181D1F";

  const selectedVehicle = VEHICLES.find(v => v.id === vehicleId) ?? VEHICLES[0];
  const currentRangeKm  = Math.round(selectedVehicle.range_km * (battery / 100));

  function handlePopular(from: string, to: string) {
    setSource(from);
    setDest(to);
  }

  async function handlePlan() {
    if (!source.trim() || !dest.trim()) {
      setError("Please enter both source and destination.");
      return;
    }
    setError("");
    setPlanning(true);
    const params = new URLSearchParams({
      source: source.trim(),
      destination: dest.trim(),
      vehicle_id: vehicleId,
      battery: String(battery),
    });
    router.push(`/plan/results?${params.toString()}`);
  }

  const batteryColor = battery >= 60 ? "#00E676" : battery >= 30 ? "#FFC043" : "#FF5A5F";

  return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />

      <div className="fade-up" style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: accentDim, border: `1px solid ${accentBorder}`,
            borderRadius: 999, padding: "5px 16px", marginBottom: 20,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent, display: "inline-block", boxShadow: `0 0 8px ${accent}` }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: accent }}>ROUTE PLANNER</span>
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800,
            fontSize: "clamp(28px,4vw,44px)", lineHeight: 1.1, letterSpacing: "-.03em",
            color: textPrimary, marginBottom: 12,
          }}>Plan your journey.<br />Book every stop.</h1>
          <p style={{ color: textSub, fontSize: 16, lineHeight: 1.7, maxWidth: 460, margin: "0 auto" }}>
            Enter your route. We find the optimal charging stops, show real-time availability, and let you reserve them all in one go.
          </p>
        </div>

        {/* Planner card */}
        <div style={{
          background: cardBg, border: `1px solid ${cardBorder}`,
          borderRadius: 24, overflow: "hidden",
          boxShadow: isLight ? "0 4px 24px rgba(0,0,0,.06)" : "none",
        }}>

          {/* Route inputs */}
          <div style={{ padding: "28px 28px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 16 }}>Your Route</div>

            {/* Source */}
            <div style={{ position: "relative", marginBottom: 8 }}>
              <div style={{
                position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                width: 10, height: 10, borderRadius: "50%",
                background: "#22D3EE", boxShadow: "0 0 8px rgba(34,211,238,.6)",
              }} />
              <input
                value={source}
                onChange={e => setSource(e.target.value)}
                onKeyDown={e => e.key === "Enter" && document.getElementById("dest-input")?.focus()}
                placeholder="From — Noida, Delhi, Mumbai…"
                style={{
                  width: "100%", padding: "16px 16px 16px 38px",
                  background: inputBg, border: `1.5px solid ${inputBorder}`,
                  borderRadius: 14, fontSize: 15, color: textPrimary,
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color .15s",
                  fontFamily: "inherit",
                }}
                onFocus={e => e.target.style.borderColor = accent}
                onBlur={e => e.target.style.borderColor = inputBorder}
              />
            </div>

            {/* Route line connector */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 4px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 4, borderRadius: 1, background: textMuted, opacity: .4 }} />)}
              </div>
              <span style={{ fontSize: 12, color: textMuted }}>Route</span>
            </div>

            {/* Destination */}
            <div style={{ position: "relative", marginBottom: 24 }}>
              <div style={{
                position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                width: 10, height: 10, borderRadius: "50%",
                background: accent, boxShadow: `0 0 8px ${accent}80`,
              }} />
              <input
                id="dest-input"
                value={dest}
                onChange={e => setDest(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handlePlan()}
                placeholder="To — Patna, Agra, Pune…"
                style={{
                  width: "100%", padding: "16px 16px 16px 38px",
                  background: inputBg, border: `1.5px solid ${inputBorder}`,
                  borderRadius: 14, fontSize: 15, color: textPrimary,
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color .15s",
                  fontFamily: "inherit",
                }}
                onFocus={e => e.target.style.borderColor = accent}
                onBlur={e => e.target.style.borderColor = inputBorder}
              />
            </div>

            <div style={{ height: 1, background: cardBorder, margin: "0 -28px 24px" }} />

            {/* Vehicle selector */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 12 }}>Vehicle</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {VEHICLES.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setVehicleId(v.id)}
                    style={{
                      padding: "12px 10px", borderRadius: 12, cursor: "pointer",
                      background: vehicleId === v.id ? accentDim : raisedBg,
                      border: `1.5px solid ${vehicleId === v.id ? accentBorder : cardBorder}`,
                      color: vehicleId === v.id ? accent : textSub,
                      fontSize: 12, fontWeight: 600, textAlign: "center",
                      transition: "all .15s", lineHeight: 1.4,
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>🚗</div>
                    <div>{v.label}</div>
                    <div style={{ fontSize: 10, opacity: .7, marginTop: 2 }}>{v.range_km} km range</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Battery slider */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted }}>Current Battery</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: batteryColor }}>{battery}%</span>
                  <span style={{ fontSize: 12, color: textSub }}>≈ {currentRangeKm} km range</span>
                </div>
              </div>
              {/* Battery visual */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 10, borderRadius: 999, background: raisedBg, border: `1px solid ${cardBorder}`, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${battery}%`, borderRadius: 999, background: `linear-gradient(90deg,${batteryColor},${batteryColor}CC)`, transition: "width .2s,background .2s" }} />
                </div>
                <span style={{ fontSize: 16 }}>{battery >= 60 ? "🔋" : battery >= 30 ? "🪫" : "⚠️"}</span>
              </div>
              <input
                type="range" min={5} max={100} step={5}
                value={battery}
                onChange={e => setBattery(Number(e.target.value))}
                style={{ width: "100%", accentColor: batteryColor, cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: textMuted, marginTop: 4 }}>
                <span>5%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ margin: "0 28px 16px", padding: "12px 16px", borderRadius: 10, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* CTA */}
          <div style={{ padding: "0 28px 28px" }}>
            <button
              onClick={handlePlan}
              disabled={planning}
              style={{
                width: "100%", padding: "18px 24px", borderRadius: 16,
                background: planning ? (isLight ? "#E2E8F0" : "#222829") : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
                color: planning ? textMuted : "#050708",
                fontSize: 16, fontWeight: 800, border: "none", cursor: planning ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all .2s",
                boxShadow: planning ? "none" : isLight ? "0 4px 20px rgba(0,210,106,.35)" : "0 0 0 1px rgba(0,230,118,.4),0 0 28px rgba(0,230,118,.2)",
              }}>
              {planning ? (
                <><span className="spinner" style={{ borderColor: cardBorder, borderTopColor: textSub, width: 18, height: 18 }} />Calculating route…</>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12h18M13 6l6 6-6 6" stroke="#050708" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Plan My Journey →
                </>
              )}
            </button>
          </div>
        </div>

        {/* Popular routes */}
        <div style={{ marginTop: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 14 }}>Popular Routes</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {POPULAR_ROUTES.map(r => (
              <button
                key={`${r.from}-${r.to}`}
                onClick={() => handlePopular(r.from, r.to)}
                style={{
                  padding: "12px 14px", borderRadius: 14,
                  background: cardBg, border: `1px solid ${cardBorder}`,
                  cursor: "pointer", textAlign: "left", transition: "all .15s",
                  boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.04)" : "none",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accentBorder; e.currentTarget.style.background = accentDim; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.background = cardBg; }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 3 }}>
                  {r.from} → {r.to}
                </div>
                <div style={{ fontSize: 11, color: textSub }}>~{r.km} km</div>
              </button>
            ))}
          </div>
        </div>

        {/* Trust row */}
        <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 32 }}>
          {["⚡ 5,200+ chargers", "🗺 42 cities", "⏱ 30-sec booking"].map(t => (
            <span key={t} style={{ fontSize: 12, color: textMuted, fontWeight: 500 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
