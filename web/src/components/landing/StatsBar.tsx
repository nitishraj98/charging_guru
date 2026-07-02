"use client";
import { useEffect, useRef, useState } from "react";
import { Tok } from "./tokens";

const STATS = [
  { value: 5200,  suffix: "+", label: "Chargers",       sub: "And counting",        color: "#00E676" },
  { value: 42,    suffix: "+", label: "Cities",          sub: "Across India",         color: "#22D3EE" },
  { value: 50000, suffix: "+", label: "Happy Drivers",   sub: "Trust Charging Guru",  color: "#FFC043" },
  { value: 99.8,  suffix: "%", label: "Booking Success", sub: "We've got your back",  color: "#C4B5FD" },
];

// India city nodes for the mini-network visualization
const NODES = [
  { x: 115, y: 28,  r: 4.5, c: "#FFC043", label: "Delhi" },
  { x: 145, y: 38,  r: 3,   c: "#22D3EE", label: "Agra" },
  { x: 105, y: 60,  r: 3,   c: "#00E676", label: "Jaipur" },
  { x: 165, y: 55,  r: 3,   c: "#22D3EE", label: "Lucknow" },
  { x: 190, y: 68,  r: 3.5, c: "#FFC043", label: "Patna" },
  { x: 100, y: 88,  r: 3.5, c: "#00E676", label: "Ahmedabad" },
  { x: 148, y: 82,  r: 3,   c: "#22D3EE", label: "Bhopal" },
  { x: 200, y: 88,  r: 4,   c: "#C4B5FD", label: "Kolkata" },
  { x: 108, y: 118, r: 5,   c: "#00E676", label: "Mumbai" },
  { x: 152, y: 106, r: 4,   c: "#00E676", label: "Hyderabad" },
  { x: 120, y: 145, r: 4.5, c: "#22D3EE", label: "Pune" },
  { x: 148, y: 140, r: 5,   c: "#00E676", label: "Bengaluru" },
  { x: 165, y: 130, r: 4,   c: "#FFC043", label: "Chennai" },
];

const EDGES: [number, number][] = [
  [0,1],[0,2],[0,4],[1,3],[1,4],[2,5],[3,6],[4,7],[5,6],[5,8],[6,9],[7,9],[8,10],[9,10],[9,11],[9,12],[10,11],[11,12],
];

function useCountUp(target: number, duration = 1800, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf: number;
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(target < 100 ? Math.round(target * ease * 10) / 10 : Math.round(target * ease));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return val;
}

function StatItem({ s, isLight, t, start, index }: { s: typeof STATS[0]; isLight: boolean; t: Tok; start: boolean; index: number }) {
  const val = useCountUp(s.value, 1600 + index * 100, start);
  const display = s.value < 100
    ? val.toFixed(1)
    : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toString();

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "28px 24px",
      borderRight: index < 3 ? `1px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.05)"}` : "none",
      position: "relative",
      animation: `fade-up .6s cubic-bezier(.2,0,0,1) ${index * 80}ms both`,
    }}>
      {/* Glow behind value */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: 80, height: 80, borderRadius: "50%",
        background: `radial-gradient(circle, ${s.color}14 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800,
        fontSize: "clamp(28px,3.5vw,40px)", lineHeight: 1,
        color: s.color,
        textShadow: isLight ? "none" : `0 0 30px ${s.color}40`,
        letterSpacing: "-.03em",
        transition: "color .3s",
      }}>
        {display}{s.suffix}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginTop: 6 }}>{s.label}</div>
      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{s.sub}</div>
    </div>
  );
}

function NetworkMini({ isLight }: { isLight: boolean }) {
  const [activeNode, setActiveNode] = useState(0);
  const [pulseEdges, setPulseEdges] = useState<number[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      const n = Math.floor(Math.random() * NODES.length);
      setActiveNode(n);
      const connectedEdges = EDGES.map((e, i) => e.includes(n) ? i : -1).filter(i => i !== -1);
      setPulseEdges(connectedEdges.slice(0, 3));
      setTimeout(() => setPulseEdges([]), 1200);
    }, 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg width="100%" height="100%" viewBox="0 0 250 170" style={{ overflow: "visible" }}>
        {/* Base edges */}
        {EDGES.map(([a, b], i) => (
          <line key={i}
            x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
            stroke={pulseEdges.includes(i)
              ? (isLight ? "#00D26A" : "#00E676")
              : (isLight ? "rgba(0,0,0,.09)" : "rgba(255,255,255,.06)")}
            strokeWidth={pulseEdges.includes(i) ? 1.5 : 1}
            style={{ transition: "stroke .3s, stroke-width .3s" }}
          />
        ))}
        {/* Nodes */}
        {NODES.map((n, i) => (
          <g key={i}>
            {i === activeNode && <circle cx={n.x} cy={n.y} r={n.r * 2.5} fill={`${n.c}20`} style={{ animation: "ping-green 1.4s ease-out infinite" }} />}
            <circle cx={n.x} cy={n.y} r={n.r} fill={n.c}
              style={{ filter: i === activeNode ? `drop-shadow(0 0 5px ${n.c})` : "none", transition: "filter .3s" }} />
          </g>
        ))}
      </svg>
      <div style={{
        position: "absolute", bottom: 6, right: 8,
        fontSize: 8, fontWeight: 700, color: isLight ? "#94A3B8" : "#4B5563",
        letterSpacing: ".06em",
      }}>INDIA NETWORK</div>
    </div>
  );
}

export default function StatsBar({ isLight, t }: { isLight: boolean; t: Tok }) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStarted(true); },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="stats-bar-grid"
      style={{
        background: isLight
          ? "linear-gradient(90deg, #FFFFFF, #F6F8FA 50%, #FFFFFF)"
          : "rgba(8,10,11,.9)",
        borderTop: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.04)"}`,
        borderBottom: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.04)"}`,
        backdropFilter: isLight ? "none" : "blur(16px)",
        boxShadow: isLight ? "0 4px 32px rgba(0,0,0,.05) inset, 0 -4px 32px rgba(0,0,0,.03) inset" : "none",
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr) 200px",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Animated shimmer sweep */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `linear-gradient(90deg, transparent 0%, ${isLight ? "rgba(0,210,106,.025)" : "rgba(0,230,118,.03)"} 50%, transparent 100%)`,
        animation: "slide-left 8s linear infinite",
        backgroundSize: "200% 100%",
      }} />

      {STATS.map((s, i) => (
        <StatItem key={s.label} s={s} isLight={isLight} t={t} start={started} index={i} />
      ))}

      {/* India network mini-map */}
      <div className="stats-network" style={{
        borderLeft: `1px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.05)"}`,
        padding: "8px 12px",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        background: isLight
          ? "linear-gradient(135deg,rgba(0,184,94,.03),rgba(14,165,233,.02))"
          : "linear-gradient(135deg,rgba(0,230,118,.03),rgba(34,211,238,.02))",
      }}>
        <NetworkMini isLight={isLight} />
      </div>
    </div>
  );
}
