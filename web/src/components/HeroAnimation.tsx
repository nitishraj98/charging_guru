"use client";
import { useEffect, useState } from "react";

/*
  EV Journey Visualiser — hero-scale, cinematic.
  Noida → Kanpur → Prayagraj → Varanasi → Patna
  Full 480px canvas, large car SVG, glowing route, prominent live card.
*/

function RingBattery({ pct, size = 88 }: { pct: number; size?: number }) {
  const r = (size / 2) - 7;
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
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 18, color: "#E6EBED", lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 9, color: "#6B7479", marginTop: 2, letterSpacing: ".06em" }}>BATTERY</span>
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

const CITY_PCTS = [2, 25, 50, 75, 98]; // x-position as % of route width

const STEPS = [
  { label: "Plan Trip",  icon: "M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7Z",            filled: true  },
  { label: "Reserve",    icon: "M3 4h18v16H3zM3 9h18M9 9v11",                                         filled: false },
  { label: "Navigate",   icon: "M12 2a9 9 0 0 1 9 9c0 5-9 13-9 13S3 16 3 11a9 9 0 0 1 9-9Z",        filled: false },
  { label: "Charge",     icon: "M13 2 4.5 13.5H11L10 22 20 10h-6.5Z",                                filled: true  },
  { label: "Continue",   icon: "M5 12h14M13 6l6 6-6 6",                                               filled: false },
];

interface Props { isLight?: boolean }

export default function HeroAnimation({ isLight = false }: Props) {
  const [activeLeg, setActiveLeg] = useState(1);
  const [batt, setBatt] = useState(14);

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

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "0 48px 0" }}>

      {/* ── TOP ROW: step bar + live card ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, paddingTop: 24, flexWrap: "wrap" }}>

        {/* Step pill */}
        <div style={{
          display: "flex", alignItems: "center",
          background: glass, backdropFilter: "blur(18px)",
          border: `1px solid ${glassBd}`, borderRadius: 999,
          padding: "5px 8px", gap: 0, flexShrink: 0,
          boxShadow: isLight
            ? "0 1px 3px rgba(15,23,42,.08),0 8px 32px rgba(15,23,42,.12)"
            : "0 4px 24px rgba(0,0,0,.5)",
        }}>
          {STEPS.map((step, i) => {
            const active = i === stepActive;
            const done   = i < stepActive;
            return (
              <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 999,
                  background: active
                    ? (isLight ? "#00A855" : "#00E676")
                    : "transparent",
                  boxShadow: active ? `0 0 16px ${isLight ? "rgba(0,167,85,.4)" : "rgba(0,230,118,.45)"}` : "none",
                  transition: "background .4s, box-shadow .4s",
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d={step.icon}
                      fill={step.filled ? (active ? "#fff" : done ? green : (isLight ? "#A0BFB4" : "#2E3638")) : "none"}
                      stroke={!step.filled ? (active ? "#fff" : done ? green : (isLight ? "#A0BFB4" : "#2E3638")) : "none"}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: active ? "#fff" : done ? green : (isLight ? "#7A9487" : "#495154"),
                    transition: "color .4s", whiteSpace: "nowrap",
                  }}>{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 20, height: 1, background: done ? green : (isLight ? "#C8DDD4" : "#1C2224"), transition: "background .4s", flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Live charging card */}
        <div style={{
          background: glass, backdropFilter: "blur(22px)",
          border: `1px solid ${glassBd}`, borderRadius: 18,
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 18,
          boxShadow: cardShadow, minWidth: 300,
        }}>
          <RingBattery pct={batt} size={90} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: green, flexShrink: 0,
                boxShadow: `0 0 10px ${green}`,
                animation: "pulse-dot 1.6s ease-in-out infinite",
              }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: textPri, letterSpacing: ".07em" }}>LIVE SESSION · Prayagraj Hub</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 18px", marginBottom: 10 }}>
              {[
                { label: "ENERGY", value: "24.6 kWh" },
                { label: "COST",   value: "₹368" },
                { label: "TIME",   value: "00:43:12" },
                { label: "RATE",   value: "100 kW" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 9, color: textSub, fontWeight: 700, letterSpacing: ".07em" }}>{label}</div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: textPri, marginTop: 1 }}>{value}</div>
                </div>
              ))}
            </div>
            {/* Charge bar */}
            <div style={{ height: 4, borderRadius: 2, background: isLight ? "#D6E8DF" : "#101415", overflow: "hidden" }}>
              <div style={{
                width: `${batt}%`, height: "100%", borderRadius: 2,
                background: `linear-gradient(90deg,${green},${cyan})`,
                transition: "width 1.4s cubic-bezier(.4,0,.2,1)",
                boxShadow: `0 0 8px ${green}`,
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 9, color: textSub }}>14% → {batt}%</span>
              <span style={{ fontSize: 9, color: green, fontWeight: 700 }}>~{Math.round((100 - batt) * 0.6)} min left</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── MIDDLE: route map ── */}
      <div style={{ position: "relative", flex: 1, margin: "32px 0 28px" }}>

        {/* Route base line */}
        <div style={{
          position: "absolute", top: "50%", left: 0, right: 0,
          height: 3, background: routeBase, transform: "translateY(-50%)", borderRadius: 2,
        }} />

        {/* Completed glowing portion */}
        <div style={{
          position: "absolute", top: "50%", left: 0,
          width: `${carPct}%`, height: isLight ? 4 : 3,
          background: `linear-gradient(90deg,${green},${cyan})`,
          transform: "translateY(-50%)", borderRadius: 2,
          transition: "width 2.2s cubic-bezier(.4,0,.2,1)",
          boxShadow: isLight
            ? `0 0 8px 2px rgba(0,210,106,.3)`
            : `0 0 14px 2px rgba(0,230,118,.7)`,
        }} />

        {/* Dashed future portion */}
        <svg style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 12, transform: "translateY(-50%)", overflow: "visible", pointerEvents: "none" }}>
          <line x1={`${carPct}%`} y1="6" x2="100%" y2="6"
            stroke={routeDash} strokeWidth="2" strokeDasharray="8 6" />
        </svg>

        {/* Moving car */}
        <div style={{
          position: "absolute", top: "50%", left: `${carPct}%`,
          transform: "translate(-50%, -50%)",
          transition: "left 2.2s cubic-bezier(.4,0,.2,1)",
          zIndex: 10,
        }}>
          {/* outer glow ring */}
          <div style={{
            position: "absolute", inset: -18, borderRadius: "50%",
            background: `radial-gradient(circle,${isLight ? "rgba(0,167,85,.22)" : "rgba(0,230,118,.28)"} 0%,transparent 70%)`,
            animation: "car-glow-pulse 2s ease-in-out infinite",
          }} />
          {/* Car SVG — larger */}
          <svg width="64" height="28" viewBox="0 0 64 28" fill="none" style={{ display: "block", filter: `drop-shadow(0 0 8px ${isLight ? "rgba(0,167,85,.6)" : "rgba(0,230,118,.8)"})` }}>
            <rect x="0" y="8" width="64" height="14" rx="5" fill={isLight ? "#E8F5EE" : "#0D1214"} stroke={green} strokeWidth="1.5" />
            <path d="M12 8C17-2 47-2 52 8Z" fill={isLight ? "#D0EDDF" : "#0D1A14"} stroke={green} strokeWidth="1.2" />
            {/* Headlight */}
            <rect x="58" y="11" width="7" height="7" rx="2" fill={green} opacity=".95" />
            <rect x="58" y="11" width="7" height="7" rx="2" fill={green} style={{ filter: `blur(4px)`, opacity: 0.5 }} />
            {/* Tail light */}
            <rect x="0" y="12" width="4" height="5" rx="1.5" fill="#FF5A5F" opacity=".8" />
            {/* Wheels */}
            <circle cx="15" cy="22" r="5.5" fill={isLight ? "#C8DDD4" : "#060809"} stroke={green} strokeWidth="1.5" />
            <circle cx="15" cy="22" r="2" fill={green} opacity=".5" />
            <circle cx="49" cy="22" r="5.5" fill={isLight ? "#C8DDD4" : "#060809"} stroke={green} strokeWidth="1.5" />
            <circle cx="49" cy="22" r="2" fill={green} opacity=".5" />
            {/* Windows */}
            <rect x="18" y="3" width="10" height="6" rx="2" fill={isLight ? "rgba(0,167,85,.15)" : "rgba(0,230,118,.18)"} stroke={green} strokeWidth=".8" opacity=".8"/>
            <rect x="31" y="3" width="10" height="6" rx="2" fill={isLight ? "rgba(0,167,85,.15)" : "rgba(0,230,118,.18)"} stroke={green} strokeWidth=".8" opacity=".8"/>
          </svg>
        </div>

        {/* City nodes */}
        {CITIES.map((city, i) => {
          const xPct     = CITY_PCTS[i];
          const isPast   = carPct > xPct + 2;
          const isCurrent= Math.abs(carPct - xPct) < 14;
          const isOrigin = city.type === "origin";
          const isDest   = city.type === "dest";
          const nodeSize = isOrigin || isDest ? 18 : 14;

          return (
            <div key={city.name} style={{
              position: "absolute", top: "50%",
              left: `${xPct}%`,
              transform: "translate(-50%, -50%)",
              display: "flex", flexDirection: "column", alignItems: "center",
              zIndex: 5,
            }}>
              {/* Label chip — above */}
              <div style={{
                marginBottom: 14,
                background: isCurrent
                  ? (isLight ? "rgba(0,167,85,.12)" : "rgba(0,230,118,.1)")
                  : labelBg,
                border: `1px solid ${isCurrent ? (isLight ? "rgba(0,167,85,.45)" : "rgba(0,230,118,.45)") : isPast ? (isLight ? "rgba(0,167,85,.25)" : "rgba(0,230,118,.2)") : labelBd}`,
                borderRadius: 12, padding: "7px 13px",
                transition: "all .5s",
                textAlign: "center",
                backdropFilter: "blur(12px)",
                boxShadow: isCurrent ? `0 0 18px ${isLight ? "rgba(0,167,85,.18)" : "rgba(0,230,118,.15)"}` : "none",
              }}>
                <div style={{
                  fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13,
                  color: isCurrent ? green : isPast ? textPri : textSub,
                  transition: "color .5s",
                }}>{city.name}</div>
                {city.type === "stop" && (
                  <div style={{ fontSize: 10, color: isPast ? green : textSub, marginTop: 2, transition: "color .5s" }}>
                    {city.avail} bays · {city.kw}
                  </div>
                )}
                {isOrigin && <div style={{ fontSize: 10, color: cyan, marginTop: 2 }}>Start · {city.pct}% SoC</div>}
                {isDest    && <div style={{ fontSize: 10, color: green, marginTop: 2 }}>Destination · {city.pct}% SoC</div>}
              </div>

              {/* Node dot */}
              <div style={{
                width: nodeSize, height: nodeSize, borderRadius: "50%",
                background: isCurrent ? green : isPast ? (isLight ? "#7ECFA4" : "#00A455") : nodeBg,
                border: `2.5px solid ${isCurrent ? (isLight ? "#00A855" : "#4DFFA6") : isPast ? green : nodeBd}`,
                boxShadow: isCurrent ? `0 0 0 3px ${isLight ? "rgba(0,167,85,.15)" : "rgba(0,230,118,.15)"}, 0 0 18px ${isLight ? "rgba(0,167,85,.55)" : "rgba(0,230,118,.65)"}` : "none",
                transition: "all .5s", position: "relative", zIndex: 2,
              }}>
                {isCurrent && (
                  <div style={{
                    position: "absolute", inset: -8, borderRadius: "50%",
                    border: `1.5px solid ${isLight ? "rgba(0,167,85,.4)" : "rgba(0,230,118,.4)"}`,
                    animation: "ping-node 1.8s ease-out infinite",
                  }} />
                )}
              </div>

              {/* SoC badge below (stops only) */}
              {city.type === "stop" && (
                <div style={{
                  marginTop: 12,
                  background: labelBg, backdropFilter: "blur(10px)",
                  border: `1px solid ${labelBd}`, borderRadius: 8, padding: "4px 11px",
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700,
                    fontFamily: "'Space Grotesk',sans-serif",
                    color: city.pct >= 60 ? green : city.pct >= 35 ? "#FFC043" : "#FF5A5F",
                  }}>{city.pct}%</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── BOTTOM ROW: trip summary chips ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", paddingBottom: 32 }}>
        {[
          { icon: "M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7Z",           label: "590 km total",    fill: true  },
          { icon: "M13 2 4.5 13.5H11L10 22 20 10h-6.5Z",                               label: "3 charge stops",  fill: true  },
          { icon: "M12 2a9 9 0 0 1 0 18A9 9 0 0 1 12 2zm0 4v5l3 2",                   label: "~7h 20m",         fill: false },
          { icon: "M12 2 4 5v6.5c0 4.6 3.4 8.9 8 9.9 4.6-1 8-5.3 8-9.9V5L12 2Z",    label: "14% → 89% SoC",  fill: false },
          { icon: "M9 12l2 2 4-4",                                                       label: "Pre-booked",      fill: false },
        ].map(({ icon, label, fill }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 7,
            background: chipBg, backdropFilter: "blur(12px)",
            border: `1px solid ${chipBd}`, borderRadius: 999,
            padding: "7px 16px",
            boxShadow: isLight
              ? "0 1px 3px rgba(15,23,42,.07),0 4px 16px rgba(15,23,42,.08)"
              : "none",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d={icon}
                fill={fill ? green : "none"}
                stroke={!fill ? green : "none"}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: textPri }}>{label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ping-node {
          0%   { transform: scale(1); opacity: .8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes car-glow-pulse {
          0%, 100% { opacity: .7; }
          50%       { opacity: 1; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor; }
          50%       { opacity: .6; box-shadow: 0 0 14px currentColor; }
        }
      `}</style>
    </div>
  );
}
