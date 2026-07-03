"use client";
import { useEffect, useState } from "react";

function RingBattery({ pct, size = 88 }: { pct: number; size?: number }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const col = pct < 25 ? "#FF5A5F" : pct < 55 ? "#FFC043" : "#00E676";
  const glowCol = pct < 25 ? "rgba(255,90,95,.6)" : pct < 55 ? "rgba(255,192,67,.5)" : "rgba(0,230,118,.6)";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)", filter: `drop-shadow(0 0 6px ${glowCol})` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: size * 0.2, color: "#E6EBED", lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: size * 0.1, color: "#6B7479", marginTop: 2, letterSpacing: ".06em" }}>BATTERY</span>
      </div>
    </div>
  );
}

const CITIES = [
  { name: "Noida",      pct: 14, type: "origin" as const },
  { name: "Kanpur",     pct: 14, type: "stop"   as const, avail: 12, kw: "150 kW" },
  { name: "Prayagraj",  pct: 38, type: "stop"   as const, avail: 8,  kw: "100 kW" },
  { name: "Varanasi",   pct: 62, type: "stop"   as const, avail: 15, kw: "150 kW" },
  { name: "Patna",      pct: 89, type: "dest"   as const },
];

const CITY_PCTS = [2, 25, 50, 75, 98];

const STEPS = [
  { label: "Plan Trip",  icon: "M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7Z",            filled: true  },
  { label: "Reserve",    icon: "M3 4h18v16H3zM3 9h18M9 9v11",                                         filled: false },
  { label: "Navigate",   icon: "M12 2a9 9 0 0 1 9 9c0 5-9 13-9 13S3 16 3 11a9 9 0 0 1 9-9Z",        filled: false },
  { label: "Charge",     icon: "M13 2 4.5 13.5H11L10 22 20 10h-6.5Z",                                filled: true  },
  { label: "Continue",   icon: "M5 12h14M13 6l6 6-6 6",                                               filled: false },
];

function useBreakpoint() {
  const [bp, setBp] = useState<"xs" | "sm" | "md" | "lg">("lg");
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      setBp(w < 480 ? "xs" : w < 768 ? "sm" : w < 1024 ? "md" : "lg");
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}

interface Props { isLight?: boolean }

export default function HeroAnimation({ isLight = false }: Props) {
  const [activeLeg, setActiveLeg] = useState(1);
  const [batt, setBatt] = useState(14);
  const bp = useBreakpoint();

  const isMobile = bp === "xs" || bp === "sm";
  const isTablet = bp === "md";

  useEffect(() => {
    const t = setInterval(() => {
      setActiveLeg(l => {
        const next = (l + 1) % 4;
        setBatt(CITIES[next === 0 ? 0 : next].pct ?? 14);
        return next;
      });
    }, 2600);
    return () => clearInterval(t);
  }, []);

  const carPct = CITY_PCTS[activeLeg] + (CITY_PCTS[activeLeg + 1] - CITY_PCTS[activeLeg]) * 0.44;
  const stepActive = activeLeg <= 0 ? 0 : activeLeg === 1 ? 2 : activeLeg === 2 ? 3 : 4;

  // ── theme tokens ──
  const glass      = isLight ? "rgba(255,255,255,.85)"   : "rgba(7,11,12,.88)";
  const glassBd    = isLight ? "rgba(0,210,106,.2)"      : "rgba(0,230,118,.18)";
  const cardShadow = isLight
    ? "0 2px 16px rgba(15,23,42,.08)"
    : "0 0 0 1px rgba(0,230,118,.06),0 20px 60px rgba(0,0,0,.7)";
  const labelBg    = isLight ? "rgba(255,255,255,.8)"    : "rgba(7,11,12,.85)";
  const labelBd    = isLight ? "rgba(0,210,106,.18)"     : "#1C2224";
  const textPri    = isLight ? "#0F172A"                 : "#E6EBED";
  const textSub    = isLight ? "#475569"                 : "#6B7479";
  const chipBg     = isLight ? "rgba(255,255,255,.75)"   : "rgba(10,13,14,.7)";
  const chipBd     = isLight ? "rgba(0,210,106,.15)"     : "#1A2018";
  const routeBase  = isLight ? "#C8DDD4"                 : "#1A2018";
  const routeDash  = isLight ? "#B8CCC4"                 : "#2E3638";
  const nodeBg     = isLight ? "#D4EDE0"                 : "#1C2224";
  const nodeBd     = isLight ? "#8ECFAA"                 : "#2E3638";
  const green      = isLight ? "#00D26A"                 : "#00E676";
  const cyan       = isLight ? "#22D3EE"                 : "#22D3EE";

  // ── responsive scaling ──
  const hPad       = isMobile ? 16 : isTablet ? 28 : 48;
  const battSize   = isMobile ? 60 : isTablet ? 72 : 90;
  const cardGap    = isMobile ? 10 : 18;
  const cardPad    = isMobile ? "10px 12px" : isTablet ? "12px 16px" : "16px 20px";
  const stationW   = isMobile ? 26 : isTablet ? 32 : 40;
  const stationH   = isMobile ? 40 : isTablet ? 50 : 62;
  const labelFontS = isMobile ? 10 : isTablet ? 11 : 13;
  const labelPad   = isMobile ? "4px 7px" : "7px 13px";
  const socFontS   = isMobile ? 9 : 12;
  const carW       = isMobile ? 42 : isTablet ? 52 : 64;
  const carH       = isMobile ? 18 : isTablet ? 22 : 28;

  // ── MOBILE layout: compact vertical stack ──
  if (isMobile) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: `0 ${hPad}px` }}>

        {/* Top: live card compact */}
        <div style={{
          display: "flex", alignItems: "center", gap: cardGap,
          background: glass, backdropFilter: "blur(18px)",
          border: `1px solid ${glassBd}`, borderRadius: 14,
          padding: cardPad, marginTop: 14,
          boxShadow: cardShadow,
        }}>
          <RingBattery pct={batt} size={battSize} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: green, flexShrink: 0, boxShadow: `0 0 8px ${green}`, animation: "pulse-dot 1.6s ease-in-out infinite" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: textPri, letterSpacing: ".06em" }}>LIVE · Prayagraj Hub</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", marginBottom: 6 }}>
              {[
                { label: "ENERGY", value: "24.6 kWh" },
                { label: "RATE",   value: "100 kW" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 7.5, color: textSub, fontWeight: 700, letterSpacing: ".06em" }}>{label}</div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12, color: textPri, marginTop: 1 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 3, borderRadius: 2, background: isLight ? "#D6E8DF" : "#101415", overflow: "hidden" }}>
              <div style={{ width: `${batt}%`, height: "100%", borderRadius: 2, background: `linear-gradient(90deg,${green},${cyan})`, transition: "width 1.4s cubic-bezier(.4,0,.2,1)", boxShadow: `0 0 6px ${green}` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span style={{ fontSize: 7.5, color: textSub }}>14% → {batt}%</span>
              <span style={{ fontSize: 7.5, color: green, fontWeight: 700 }}>~{Math.round((100 - batt) * 0.6)} min</span>
            </div>
          </div>
        </div>

        {/* Route map */}
        <div style={{ position: "relative", flex: 1, margin: "16px 0 12px" }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 3, background: routeBase, transform: "translateY(-50%)", borderRadius: 2 }} />
          <div style={{ position: "absolute", top: "50%", left: 0, width: `${carPct}%`, height: 3, background: `linear-gradient(90deg,${green},${cyan})`, transform: "translateY(-50%)", borderRadius: 2, transition: "width 2.2s cubic-bezier(.4,0,.2,1)", boxShadow: `0 0 10px 2px rgba(0,230,118,.6)` }} />
          <svg style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 12, transform: "translateY(-50%)", overflow: "visible", pointerEvents: "none" }}>
            <line x1={`${carPct}%`} y1="6" x2="100%" y2="6" stroke={routeDash} strokeWidth="2" strokeDasharray="8 6" />
          </svg>

          {/* Car */}
          <div style={{ position: "absolute", top: "50%", left: `${carPct}%`, transform: "translate(-50%, -50%)", transition: "left 2.2s cubic-bezier(.4,0,.2,1)", zIndex: 10 }}>
            <svg width={carW} height={carH} viewBox="0 0 64 28" fill="none" style={{ display: "block", filter: `drop-shadow(0 0 6px ${isLight ? "rgba(0,167,85,.6)" : "rgba(0,230,118,.8)"})` }}>
              <rect x="0" y="8" width="64" height="14" rx="5" fill={isLight ? "#E8F5EE" : "#0D1214"} stroke={green} strokeWidth="1.5" />
              <path d="M12 8C17-2 47-2 52 8Z" fill={isLight ? "#D0EDDF" : "#0D1A14"} stroke={green} strokeWidth="1.2" />
              <rect x="58" y="11" width="7" height="7" rx="2" fill={green} opacity=".95" />
              <rect x="0" y="12" width="4" height="5" rx="1.5" fill="#FF5A5F" opacity=".8" />
              <circle cx="15" cy="22" r="5.5" fill={isLight ? "#C8DDD4" : "#060809"} stroke={green} strokeWidth="1.5" />
              <circle cx="49" cy="22" r="5.5" fill={isLight ? "#C8DDD4" : "#060809"} stroke={green} strokeWidth="1.5" />
            </svg>
          </div>

          {/* City nodes — labels only, no charger station on mobile (too small) */}
          {CITIES.map((city, i) => {
            const xPct      = CITY_PCTS[i];
            const isPast    = carPct > xPct + 2;
            const isCurrent = Math.abs(carPct - xPct) < 14;
            const isOrigin  = city.type === "origin";
            const isDest    = city.type === "dest";
            const nodeSize  = isOrigin || isDest ? 14 : 10;
            const above     = i % 2 === 0;
            return (
              <div key={city.name} style={{ position: "absolute", top: "50%", left: `${xPct}%`, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 5 }}>
                {above && (
                  <div style={{ marginBottom: 6, background: isCurrent ? (isLight ? "rgba(0,167,85,.12)" : "rgba(0,230,118,.1)") : labelBg, border: `1px solid ${isCurrent ? (isLight ? "rgba(0,167,85,.45)" : "rgba(0,230,118,.45)") : labelBd}`, borderRadius: 8, padding: "3px 7px", textAlign: "center", backdropFilter: "blur(10px)" }}>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: labelFontS, color: isCurrent ? green : isPast ? textPri : textSub }}>{city.name}</div>
                  </div>
                )}
                <div style={{ width: nodeSize, height: nodeSize, borderRadius: "50%", background: isCurrent ? green : isPast ? (isLight ? "#7ECFA4" : "#00A455") : nodeBg, border: `2px solid ${isCurrent ? (isLight ? "#00A855" : "#4DFFA6") : isPast ? green : nodeBd}`, boxShadow: isCurrent ? `0 0 0 3px ${isLight ? "rgba(0,167,85,.15)" : "rgba(0,230,118,.15)"}, 0 0 14px ${isLight ? "rgba(0,167,85,.55)" : "rgba(0,230,118,.65)"}` : "none", transition: "all .5s", position: "relative", zIndex: 2 }}>
                  {isCurrent && <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: `1.5px solid ${isLight ? "rgba(0,167,85,.4)" : "rgba(0,230,118,.4)"}`, animation: "ping-node 1.8s ease-out infinite" }} />}
                </div>
                {!above && (
                  <div style={{ marginTop: 6, background: isCurrent ? (isLight ? "rgba(0,167,85,.12)" : "rgba(0,230,118,.1)") : labelBg, border: `1px solid ${isCurrent ? (isLight ? "rgba(0,167,85,.45)" : "rgba(0,230,118,.45)") : labelBd}`, borderRadius: 8, padding: "3px 7px", textAlign: "center", backdropFilter: "blur(10px)" }}>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: labelFontS, color: isCurrent ? green : isPast ? textPri : textSub }}>{city.name}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom chips — 2 per row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", paddingBottom: 16 }}>
          {[
            { icon: "M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7Z", label: "590 km", fill: true },
            { icon: "M13 2 4.5 13.5H11L10 22 20 10h-6.5Z",                    label: "3 stops",  fill: true },
            { icon: "M12 2 4 5v6.5c0 4.6 3.4 8.9 8 9.9 4.6-1 8-5.3 8-9.9V5L12 2Z", label: "14%→89%", fill: false },
            { icon: "M9 12l2 2 4-4",                                            label: "Booked",  fill: false },
          ].map(({ icon, label, fill }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, background: chipBg, backdropFilter: "blur(10px)", border: `1px solid ${chipBd}`, borderRadius: 999, padding: "5px 11px" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d={icon} fill={fill ? green : "none"} stroke={!fill ? green : "none"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 10, fontWeight: 600, color: textPri }}>{label}</span>
            </div>
          ))}
        </div>

        <style>{`
          @keyframes ping-node { 0% { transform:scale(1);opacity:.8; } 100% { transform:scale(2.4);opacity:0; } }
          @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:.4; } }
          @keyframes charger-glow { 0%,100% { opacity:.5; } 50% { opacity:1; } }
        `}</style>
      </div>
    );
  }

  // ── TABLET / DESKTOP layout ──
  const showStepLabels = !isTablet; // hide text labels on tablet, keep icons only

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: `0 ${hPad}px` }}>

      {/* ── TOP ROW: step bar + live card ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: isTablet ? 12 : 20, paddingTop: isTablet ? 16 : 24, flexWrap: "nowrap" }}>

        {/* Step pill */}
        <div style={{
          display: "flex", alignItems: "center",
          background: glass, backdropFilter: "blur(18px)",
          border: `1px solid ${glassBd}`, borderRadius: 999,
          padding: isTablet ? "4px 6px" : "5px 8px", gap: 0, flexShrink: 0,
          boxShadow: isLight ? "0 1px 3px rgba(15,23,42,.08),0 8px 32px rgba(15,23,42,.12)" : "0 4px 24px rgba(0,0,0,.5)",
        }}>
          {STEPS.map((step, i) => {
            const active = i === stepActive;
            const done   = i < stepActive;
            return (
              <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: isTablet ? 4 : 6,
                  padding: isTablet ? "4px 8px" : "5px 12px", borderRadius: 999,
                  background: active ? (isLight ? "#00A855" : "#00E676") : "transparent",
                  boxShadow: active ? `0 0 16px ${isLight ? "rgba(0,167,85,.4)" : "rgba(0,230,118,.45)"}` : "none",
                  transition: "background .4s, box-shadow .4s",
                }}>
                  <svg width={isTablet ? 9 : 11} height={isTablet ? 9 : 11} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d={step.icon}
                      fill={step.filled ? (active ? "#fff" : done ? green : (isLight ? "#A0BFB4" : "#2E3638")) : "none"}
                      stroke={!step.filled ? (active ? "#fff" : done ? green : (isLight ? "#A0BFB4" : "#2E3638")) : "none"}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                  {showStepLabels && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : done ? green : (isLight ? "#7A9487" : "#495154"), transition: "color .4s", whiteSpace: "nowrap" }}>{step.label}</span>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: isTablet ? 10 : 20, height: 1, background: done ? green : (isLight ? "#C8DDD4" : "#1C2224"), transition: "background .4s", flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Live charging card */}
        <div style={{
          background: glass, backdropFilter: "blur(22px)",
          border: `1px solid ${glassBd}`, borderRadius: isTablet ? 14 : 18,
          padding: cardPad, display: "flex", alignItems: "center", gap: cardGap,
          boxShadow: cardShadow,
          minWidth: isTablet ? 220 : 280,
          maxWidth: isTablet ? 280 : 340,
        }}>
          <RingBattery pct={batt} size={battSize} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: isTablet ? 6 : 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: green, flexShrink: 0, boxShadow: `0 0 10px ${green}`, animation: "pulse-dot 1.6s ease-in-out infinite" }} />
              <span style={{ fontSize: isTablet ? 8.5 : 10, fontWeight: 700, color: textPri, letterSpacing: ".07em" }}>LIVE SESSION · Prayagraj Hub</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isTablet ? "5px 12px" : "7px 18px", marginBottom: isTablet ? 6 : 10 }}>
              {[
                { label: "ENERGY", value: "24.6 kWh" },
                { label: "COST",   value: "₹368" },
                { label: "TIME",   value: "00:43:12" },
                { label: "RATE",   value: "100 kW" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: isTablet ? 7.5 : 9, color: textSub, fontWeight: 700, letterSpacing: ".07em" }}>{label}</div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: isTablet ? 12 : 15, color: textPri, marginTop: 1 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 4, borderRadius: 2, background: isLight ? "#D6E8DF" : "#101415", overflow: "hidden" }}>
              <div style={{ width: `${batt}%`, height: "100%", borderRadius: 2, background: `linear-gradient(90deg,${green},${cyan})`, transition: "width 1.4s cubic-bezier(.4,0,.2,1)", boxShadow: `0 0 8px ${green}` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 9, color: textSub }}>14% → {batt}%</span>
              <span style={{ fontSize: 9, color: green, fontWeight: 700 }}>~{Math.round((100 - batt) * 0.6)} min left</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── MIDDLE: route map ── */}
      <div style={{ position: "relative", flex: 1, margin: isTablet ? "20px 0 16px" : "32px 0 28px" }}>

        {/* Route base line */}
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 3, background: routeBase, transform: "translateY(-50%)", borderRadius: 2 }} />

        {/* Completed glowing portion */}
        <div style={{
          position: "absolute", top: "50%", left: 0,
          width: `${carPct}%`, height: 3,
          background: `linear-gradient(90deg,${green},${cyan})`,
          transform: "translateY(-50%)", borderRadius: 2,
          transition: "width 2.2s cubic-bezier(.4,0,.2,1)",
          boxShadow: isLight ? `0 0 8px 2px rgba(0,210,106,.3)` : `0 0 14px 2px rgba(0,230,118,.7)`,
        }} />

        {/* Dashed future portion */}
        <svg style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 12, transform: "translateY(-50%)", overflow: "visible", pointerEvents: "none" }}>
          <line x1={`${carPct}%`} y1="6" x2="100%" y2="6" stroke={routeDash} strokeWidth="2" strokeDasharray="8 6" />
        </svg>

        {/* Moving car */}
        <div style={{ position: "absolute", top: "50%", left: `${carPct}%`, transform: "translate(-50%, -50%)", transition: "left 2.2s cubic-bezier(.4,0,.2,1)", zIndex: 10 }}>
          <div style={{ position: "absolute", inset: -14, borderRadius: "50%", background: `radial-gradient(circle,${isLight ? "rgba(0,167,85,.22)" : "rgba(0,230,118,.28)"} 0%,transparent 70%)`, animation: "car-glow-pulse 2s ease-in-out infinite" }} />
          <svg width={carW} height={carH} viewBox="0 0 64 28" fill="none" style={{ display: "block", filter: `drop-shadow(0 0 8px ${isLight ? "rgba(0,167,85,.6)" : "rgba(0,230,118,.8)"})` }}>
            <rect x="0" y="8" width="64" height="14" rx="5" fill={isLight ? "#E8F5EE" : "#0D1214"} stroke={green} strokeWidth="1.5" />
            <path d="M12 8C17-2 47-2 52 8Z" fill={isLight ? "#D0EDDF" : "#0D1A14"} stroke={green} strokeWidth="1.2" />
            <rect x="58" y="11" width="7" height="7" rx="2" fill={green} opacity=".95" />
            <rect x="58" y="11" width="7" height="7" rx="2" fill={green} style={{ filter: `blur(4px)`, opacity: 0.5 }} />
            <rect x="0" y="12" width="4" height="5" rx="1.5" fill="#FF5A5F" opacity=".8" />
            <circle cx="15" cy="22" r="5.5" fill={isLight ? "#C8DDD4" : "#060809"} stroke={green} strokeWidth="1.5" />
            <circle cx="15" cy="22" r="2" fill={green} opacity=".5" />
            <circle cx="49" cy="22" r="5.5" fill={isLight ? "#C8DDD4" : "#060809"} stroke={green} strokeWidth="1.5" />
            <circle cx="49" cy="22" r="2" fill={green} opacity=".5" />
            <rect x="18" y="3" width="10" height="6" rx="2" fill={isLight ? "rgba(0,167,85,.15)" : "rgba(0,230,118,.18)"} stroke={green} strokeWidth=".8" opacity=".8"/>
            <rect x="31" y="3" width="10" height="6" rx="2" fill={isLight ? "rgba(0,167,85,.15)" : "rgba(0,230,118,.18)"} stroke={green} strokeWidth=".8" opacity=".8"/>
          </svg>
        </div>

        {/* City nodes */}
        {CITIES.map((city, i) => {
          const xPct      = CITY_PCTS[i];
          const isPast    = carPct > xPct + 2;
          const isCurrent = Math.abs(carPct - xPct) < 14;
          const isOrigin  = city.type === "origin";
          const isDest    = city.type === "dest";
          const nodeSize  = isOrigin || isDest ? 18 : 14;

          return (
            <div key={city.name} style={{
              position: "absolute", top: "50%", left: `${xPct}%`,
              transform: "translate(-50%, -50%)",
              display: "flex", flexDirection: "column", alignItems: "center",
              zIndex: 5,
            }}>
              {/* Label chip — above */}
              <div style={{
                marginBottom: isTablet ? 8 : 14,
                background: isCurrent ? (isLight ? "rgba(0,167,85,.12)" : "rgba(0,230,118,.1)") : labelBg,
                border: `1px solid ${isCurrent ? (isLight ? "rgba(0,167,85,.45)" : "rgba(0,230,118,.45)") : isPast ? (isLight ? "rgba(0,167,85,.25)" : "rgba(0,230,118,.2)") : labelBd}`,
                borderRadius: isTablet ? 8 : 12, padding: labelPad,
                transition: "all .5s", textAlign: "center", backdropFilter: "blur(12px)",
                boxShadow: isCurrent ? `0 0 18px ${isLight ? "rgba(0,167,85,.18)" : "rgba(0,230,118,.15)"}` : "none",
              }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: labelFontS, color: isCurrent ? green : isPast ? textPri : textSub, transition: "color .5s" }}>{city.name}</div>
                {city.type === "stop" && !isTablet && (
                  <div style={{ fontSize: 10, color: isPast ? green : textSub, marginTop: 2, transition: "color .5s" }}>{city.avail} bays · {city.kw}</div>
                )}
                {isOrigin && <div style={{ fontSize: isTablet ? 8.5 : 10, color: cyan, marginTop: 2 }}>Start · {city.pct}% SoC</div>}
                {isDest    && <div style={{ fontSize: isTablet ? 8.5 : 10, color: green, marginTop: 2 }}>Dest · {city.pct}% SoC</div>}
              </div>

              {/* EV Charging Station — shown for stops, scaled by breakpoint */}
              {city.type === "stop" && (() => {
                const sc    = isCurrent ? "#22D3EE" : isPast ? green : (isLight ? "#8AADA0" : "#2A3A3A");
                const bodyF = isLight
                  ? (isCurrent ? "#D8F5FF" : isPast ? "#D4EDE0" : "#EEF3F1")
                  : (isCurrent ? "#061418" : isPast ? "#061008" : "#090D0D");
                const kwLabel = city.kw ?? "150 kW";
                // viewBox is always 0 0 40 62, we just scale with width/height
                const vbW = 40, vbH = 62;
                return (
                  <div style={{ position: "relative", marginBottom: isTablet ? 4 : 6 }}>
                    {isCurrent && (
                      <div style={{ position: "absolute", inset: -12, borderRadius: 12, background: "radial-gradient(ellipse, rgba(34,211,238,.2) 0%, transparent 70%)", animation: "charger-glow 2s ease-in-out infinite", pointerEvents: "none" }}/>
                    )}
                    <svg width={stationW} height={stationH} viewBox={`0 0 ${vbW} ${vbH}`} fill="none" style={{ display: "block", filter: isCurrent ? "drop-shadow(0 0 7px rgba(34,211,238,.75))" : isPast ? "drop-shadow(0 0 4px rgba(0,230,118,.4))" : "none", transition: "filter .5s" }}>
                      <rect x="12" y="55" width="16" height="5" rx="2" fill={sc} opacity=".4"/>
                      <rect x="9"  y="51" width="22" height="5" rx="2" fill={sc} opacity=".28"/>
                      <rect x="18" y="42" width="4" height="10" fill={sc} opacity=".35"/>
                      <rect x="4" y="6" width="32" height="38" rx="6" fill={bodyF} stroke={sc} strokeWidth="1.6"/>
                      <rect x="2" y="3" width="36" height="6" rx="3" fill={sc} opacity=".55"/>
                      <rect x="4" y="12" width="4" height="30" rx="2" fill={sc} opacity=".12"/>
                      <rect x="9" y="10" width="22" height="15" rx="3"
                        fill={isCurrent ? "rgba(34,211,238,.1)" : isPast ? "rgba(0,230,118,.07)" : (isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.03)")}
                        stroke={sc} strokeWidth=".9"/>
                      {isCurrent ? (<>
                        <text x="20" y="19" textAnchor="middle" fontSize="6" fontWeight="800" fontFamily="'Space Grotesk',sans-serif" fill="#22D3EE">{kwLabel.replace(" kW", "")}</text>
                        <text x="20" y="23" textAnchor="middle" fontSize="3.8" fill="rgba(34,211,238,.75)">kW DC</text>
                        <rect x="11" y="24" width="18" height="1.8" rx=".9" fill="rgba(34,211,238,.12)"/>
                        <rect x="11" y="24" height="1.8" rx=".9" fill="#22D3EE"><animate attributeName="width" values="3;16;3" dur="1.8s" repeatCount="indefinite"/></rect>
                      </>) : isPast ? (<>
                        <text x="20" y="20" textAnchor="middle" fontSize="7" fontWeight="800" fontFamily="'Space Grotesk',sans-serif" fill={green}>✓</text>
                        <text x="20" y="24" textAnchor="middle" fontSize="3.2" fill={`${green}aa`}>DONE</text>
                      </>) : (
                        <text x="20" y="20.5" textAnchor="middle" fontSize="3.8" fontFamily="monospace" fill={isLight ? "#8AADA0" : "#2E4040"}>READY</text>
                      )}
                      <circle cx="28" cy="12" r="2.2" fill={isCurrent ? "#22D3EE" : isPast ? green : (isLight ? "#64748B" : "#1E3030")}>
                        {isCurrent && <animate attributeName="opacity" values="1;.25;1" dur="1.1s" repeatCount="indefinite"/>}
                      </circle>
                      <rect x="11" y="30" width="18" height="12" rx="4" fill={isCurrent ? "rgba(34,211,238,.08)" : "rgba(0,0,0,.08)"} stroke={sc} strokeWidth="1.1"/>
                      <circle cx="16" cy="34" r="1.8" fill={sc} opacity=".55"/>
                      <circle cx="24" cy="34" r="1.8" fill={sc} opacity=".55"/>
                      <rect x="14.5" y="37" width="11" height="3.5" rx="1.5" fill={sc} opacity=".4"/>
                      <path d="M20 42 C20 46 24 48 20 52" stroke={sc} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".45"/>
                      {isCurrent && (<>
                        <circle r="2.2" fill="#22D3EE" opacity=".95">
                          <animateMotion path="M20 42 C20 46 24 48 20 52" dur="1s" repeatCount="indefinite"/>
                          <animate attributeName="opacity" values=".95;.1;.95" dur="1s" repeatCount="indefinite"/>
                        </circle>
                        <circle r="1.6" fill="#00E676" opacity=".8">
                          <animateMotion path="M20 42 C20 46 24 48 20 52" dur="1s" begin="0.48s" repeatCount="indefinite"/>
                          <animate attributeName="opacity" values=".8;.1;.8" dur="1s" begin="0.48s" repeatCount="indefinite"/>
                        </circle>
                      </>)}
                    </svg>
                  </div>
                );
              })()}

              {/* Node dot */}
              <div style={{
                width: nodeSize, height: nodeSize, borderRadius: "50%",
                background: isCurrent ? green : isPast ? (isLight ? "#7ECFA4" : "#00A455") : nodeBg,
                border: `2.5px solid ${isCurrent ? (isLight ? "#00A855" : "#4DFFA6") : isPast ? green : nodeBd}`,
                boxShadow: isCurrent ? `0 0 0 3px ${isLight ? "rgba(0,167,85,.15)" : "rgba(0,230,118,.15)"}, 0 0 18px ${isLight ? "rgba(0,167,85,.55)" : "rgba(0,230,118,.65)"}` : "none",
                transition: "all .5s", position: "relative", zIndex: 2,
              }}>
                {isCurrent && <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: `1.5px solid ${isLight ? "rgba(0,167,85,.4)" : "rgba(0,230,118,.4)"}`, animation: "ping-node 1.8s ease-out infinite" }} />}
              </div>

              {/* SoC badge below (stops only) */}
              {city.type === "stop" && (
                <div style={{ marginTop: isTablet ? 6 : 12, background: labelBg, backdropFilter: "blur(10px)", border: `1px solid ${labelBd}`, borderRadius: 8, padding: isTablet ? "3px 8px" : "4px 11px" }}>
                  <div style={{ fontSize: socFontS, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", color: city.pct >= 60 ? green : city.pct >= 35 ? "#FFC043" : "#FF5A5F" }}>{city.pct}%</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── BOTTOM ROW: trip summary chips ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isTablet ? 6 : 10, flexWrap: "wrap", paddingBottom: isTablet ? 20 : 32 }}>
        {[
          { icon: "M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7Z",        label: isTablet ? "590 km" : "590 km total",   fill: true  },
          { icon: "M13 2 4.5 13.5H11L10 22 20 10h-6.5Z",                            label: isTablet ? "3 stops" : "3 charge stops", fill: true  },
          { icon: "M12 2a9 9 0 0 1 0 18A9 9 0 0 1 12 2zm0 4v5l3 2",               label: "~7h 20m",                               fill: false },
          { icon: "M12 2 4 5v6.5c0 4.6 3.4 8.9 8 9.9 4.6-1 8-5.3 8-9.9V5L12 2Z", label: isTablet ? "14%→89%" : "14% → 89% SoC", fill: false },
          { icon: "M9 12l2 2 4-4",                                                   label: "Pre-booked",                            fill: false },
        ].map(({ icon, label, fill }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: isTablet ? 5 : 7,
            background: chipBg, backdropFilter: "blur(12px)",
            border: `1px solid ${chipBd}`, borderRadius: 999,
            padding: isTablet ? "5px 11px" : "7px 16px",
            boxShadow: isLight ? "0 1px 3px rgba(15,23,42,.07),0 4px 16px rgba(15,23,42,.08)" : "none",
          }}>
            <svg width={isTablet ? 10 : 12} height={isTablet ? 10 : 12} viewBox="0 0 24 24" fill="none">
              <path d={icon} fill={fill ? green : "none"} stroke={!fill ? green : "none"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: isTablet ? 10 : 12, fontWeight: 600, color: textPri }}>{label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ping-node { 0% { transform:scale(1);opacity:.8; } 100% { transform:scale(2.4);opacity:0; } }
        @keyframes car-glow-pulse { 0%,100% { opacity:.7; } 50% { opacity:1; } }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        @keyframes charger-glow { 0%,100% { opacity:.5; } 50% { opacity:1; } }
      `}</style>
    </div>
  );
}
