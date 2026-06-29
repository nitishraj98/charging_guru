"use client";
import { useEffect, useRef, useState } from "react";
import { Tok } from "./tokens";

/* ── Mini animated previews inside each card ── */

function RoutePreview({ isLight }: { isLight: boolean }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setProgress(p => (p >= 100 ? 0 : p + 1.2)), 40);
    return () => clearInterval(id);
  }, []);
  const len  = 280;
  const dash = (progress / 100) * len;
  return (
    <div style={{ height: 80, position: "relative", overflow: "hidden" }}>
      <svg width="100%" height="80" viewBox="0 0 280 80" style={{ overflow: "visible" }}>
        {/* Road */}
        <path d="M10 60 Q70 10 140 40 Q210 70 270 20" fill="none"
          stroke={isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)"} strokeWidth="3" strokeLinecap="round" />
        {/* Animated route */}
        <path d="M10 60 Q70 10 140 40 Q210 70 270 20" fill="none"
          stroke="url(#routeGrad)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${dash} ${len}`} />
        {/* Charger stops */}
        {[{ x: 70, y: 22 }, { x: 140, y: 40 }, { x: 210, y: 55 }].map((pt, i) => {
          const lit = progress > (i + 1) * 25;
          return (
            <g key={i} transform={`translate(${pt.x},${pt.y})`}>
              {lit && <circle r="12" fill="rgba(0,230,118,.12)" style={{ animation: "ping-green 1.8s ease-in-out infinite" }} />}
              <circle r="6" fill={lit ? "#00E676" : (isLight ? "#CBD5E1" : "#2E3638")}
                style={{ transition: "fill .3s", filter: lit ? "drop-shadow(0 0 6px #00E676)" : "none" }} />
            </g>
          );
        })}
        {/* Car dot */}
        <circle cx={10 + (progress / 100) * 260} cy={60 - Math.sin((progress / 100) * Math.PI) * 40}
          r="5" fill="#22D3EE" style={{ filter: "drop-shadow(0 0 6px #22D3EE)" }} />
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#00E676" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LiveAvailabilityPreview({ isLight }: { isLight: boolean }) {
  const STATUSES = ["AVAILABLE", "BOOKED", "AVAILABLE", "OCCUPIED", "AVAILABLE", "MAINTENANCE"];
  const [statuses, setStatuses] = useState(STATUSES);
  useEffect(() => {
    const id = setInterval(() => {
      setStatuses(prev => {
        const next = [...prev];
        const i = Math.floor(Math.random() * next.length);
        const opts = ["AVAILABLE", "BOOKED", "OCCUPIED", "MAINTENANCE"];
        next[i] = opts[Math.floor(Math.random() * opts.length)];
        return next;
      });
    }, 1200);
    return () => clearInterval(id);
  }, []);
  const COLOR: Record<string, string> = {
    AVAILABLE: "#00E676", BOOKED: "#FFC043", OCCUPIED: "#22D3EE", MAINTENANCE: "#FF7849",
  };
  return (
    <div style={{ height: 80, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {statuses.map((s, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "5px 10px", borderRadius: 8,
          background: `${COLOR[s]}10`,
          border: `1px solid ${COLOR[s]}30`,
          transition: "all .4s",
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: COLOR[s],
            boxShadow: `0 0 6px ${COLOR[s]}`,
            transition: "background .4s, box-shadow .4s",
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: COLOR[s], letterSpacing: ".04em", transition: "color .4s" }}>
            {s === "AVAILABLE" ? "Free" : s === "BOOKED" ? "Reserved" : s === "OCCUPIED" ? "Charging" : "Maint."}
          </span>
        </div>
      ))}
    </div>
  );
}

function QRPreview({ isLight }: { isLight: boolean }) {
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const cycle = () => {
      setDone(false); setScanning(false);
      setTimeout(() => setScanning(true), 600);
      setTimeout(() => { setScanning(false); setDone(true); }, 2600);
      setTimeout(cycle, 4000);
    };
    const t = setTimeout(cycle, 800);
    return () => clearTimeout(t);
  }, []);
  const cells = Array.from({ length: 49 }, () => Math.random() > 0.5);
  return (
    <div style={{ height: 80, display: "flex", alignItems: "center", gap: 20 }}>
      {/* QR matrix */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7,8px)", gap: 1.5,
        opacity: done ? 0.5 : 1, transition: "opacity .4s",
      }}>
        {cells.map((on, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: 1,
            background: on
              ? (done ? "#00E676" : isLight ? "#1E293B" : "#E6EBED")
              : "transparent",
            transition: "background .4s",
          }} />
        ))}
      </div>
      {/* Status */}
      <div style={{ flex: 1 }}>
        {!scanning && !done && <div style={{ fontSize: 12, color: isLight ? "#64748B" : "#6B7479" }}>Waiting for scan…</div>}
        {scanning && (
          <div>
            <div style={{ fontSize: 12, color: "#22D3EE", marginBottom: 4 }}>Scanning QR…</div>
            <div style={{ height: 3, borderRadius: 2, background: isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.08)", overflow: "hidden" }}>
              <div className="scan-line" style={{ height: "100%", background: "#22D3EE", borderRadius: 2 }} />
            </div>
          </div>
        )}
        {done && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(0,230,118,.15)", border: "1px solid rgba(0,230,118,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#00E676" }}>Checked in!</span>
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AnalyticsPreview({ isLight }: { isLight: boolean }) {
  const bars = [45, 72, 38, 88, 61, 95, 54];
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ height: 80, display: "flex", alignItems: "flex-end", gap: 6, paddingBottom: 4 }}>
      {bars.map((h, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: "100%", borderRadius: "4px 4px 0 0",
            height: animated ? h * 0.62 : 2,
            background: `linear-gradient(180deg, #22D3EE${i === 5 ? "ff" : "80"}, #00E676)`,
            transition: `height .8s cubic-bezier(.4,0,.2,1) ${i * 80}ms`,
            boxShadow: i === 5 ? "0 0 10px rgba(0,230,118,.4)" : "none",
          }} />
        </div>
      ))}
    </div>
  );
}

function RewardsPreview({ isLight }: { isLight: boolean }) {
  const [points, setPoints] = useState(1240);
  useEffect(() => {
    const id = setInterval(() => setPoints(p => p + Math.floor(Math.random() * 4) + 1), 900);
    return () => clearInterval(id);
  }, []);
  const TIERS = [{ label: "Standard", min: 0, max: 1000, color: "#6B7479" }, { label: "Silver", min: 1000, max: 2500, color: "#94A3B8" }, { label: "Gold", min: 2500, max: 5000, color: "#FFC043" }];
  const currentTier = TIERS.find(t => points >= t.min && points < t.max) ?? TIERS[2];
  const pct = Math.min(100, ((points - currentTier.min) / (currentTier.max - currentTier.min)) * 100);
  return (
    <div style={{ height: 80, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 26, fontWeight: 700, color: currentTier.color, lineHeight: 1, transition: "color .5s" }}>{points.toLocaleString()}</span>
        <span style={{ fontSize: 11, color: isLight ? "#94A3B8" : "#6B7479" }}>pts · {currentTier.label}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg, ${currentTier.color}80, ${currentTier.color})`, transition: "width .5s ease, background .5s" }} />
      </div>
    </div>
  );
}

function SecurityPreview({ isLight }: { isLight: boolean }) {
  const badges = [
    { label: "PCI-DSS L1", color: "#00E676" },
    { label: "TLS 1.3",    color: "#22D3EE" },
    { label: "HMAC-SHA256", color: "#FFC043" },
    { label: "JWT Rotate", color: "#00E676" },
  ];
  return (
    <div style={{ height: 80, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {badges.map((b, i) => (
          <div key={b.label} style={{
            padding: "4px 9px", borderRadius: 6,
            background: `${b.color}10`, border: `1px solid ${b.color}30`,
            fontSize: 10, fontWeight: 700, color: b.color,
            animation: `fade-up .4s cubic-bezier(.2,0,0,1) ${i * 120}ms both`,
          }}>{b.label}</div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00E676", boxShadow: "0 0 8px #00E676", animation: "glow-pulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize: 11, color: isLight ? "#64748B" : "#6B7479" }}>All transactions encrypted end-to-end</span>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    title: "Route-Aware Planning", tag: "AI-powered", color: "#22D3EE",
    desc: "Enter your destination. We calculate exactly which chargers to stop at, when, and for how long.",
    preview: RoutePreview,
  },
  {
    title: "Live Availability", tag: "WebSocket live", color: "#00E676",
    desc: "Real-time charger status updated every 30 seconds. No more driving to find a busy bay.",
    preview: LiveAvailabilityPreview,
  },
  {
    title: "Instant QR Check-In", tag: "Single-use", color: "#4DFFA6",
    desc: "HMAC-signed, replay-attack proof tokens. Scan takes under 10 seconds from lock to plug.",
    preview: QRPreview,
  },
  {
    title: "Driver Analytics", tag: "Carbon tracking", color: "#FFC043",
    desc: "Track total kWh consumed, CO₂ saved vs petrol, spend per month, and favourite stations.",
    preview: AnalyticsPreview,
  },
  {
    title: "Rewards & Membership", tag: "Up to 10% back", color: "#00E676",
    desc: "Earn 2 points per kWh. Silver and Gold tiers unlock priority booking and higher cashback.",
    preview: RewardsPreview,
  },
  {
    title: "Bank-Grade Security", tag: "PCI-DSS L1", color: "#22D3EE",
    desc: "Razorpay PCI-DSS L1, TLS 1.3, HMAC-SHA256 payment verification, rotating JWT refresh tokens.",
    preview: SecurityPreview,
  },
];

export default function Features({ isLight, t }: { isLight: boolean; t: Tok }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRefs   = useRef<(HTMLDivElement | null)[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) section.classList.add("visible"); },
      { threshold: 0.1 },
    );
    io.observe(section);

    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) { (e.target as HTMLElement).style.opacity = "1"; (e.target as HTMLElement).style.transform = "none"; }
        });
      },
      { threshold: 0.15 },
    );
    cardRefs.current.forEach(r => { if (r) cardObserver.observe(r); });

    return () => { io.disconnect(); cardObserver.disconnect(); };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="section-fade"
      style={{
        padding: "0 60px 120px",
        background: isLight
          ? "linear-gradient(180deg, #F0F5F8 0%, #F6F8FA 60%, #EEF3F7 100%)"
          : t.bg,
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Aurora gradient orbs */}
      <div style={{
        position: "absolute", top: "-5%", left: "-10%",
        width: 700, height: 600, borderRadius: "50%", pointerEvents: "none",
        background: isLight
          ? "radial-gradient(ellipse, rgba(0,184,94,.06) 0%, transparent 60%)"
          : "radial-gradient(ellipse, rgba(0,230,118,.06) 0%, transparent 60%)",
        animation: "aurora-shift 18s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "5%", right: "-5%",
        width: 600, height: 500, borderRadius: "50%", pointerEvents: "none",
        background: isLight
          ? "radial-gradient(ellipse, rgba(14,165,233,.05) 0%, transparent 60%)"
          : "radial-gradient(ellipse, rgba(34,211,238,.05) 0%, transparent 60%)",
        animation: "aurora-shift 24s ease-in-out 8s infinite reverse",
      }} />
      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: isLight
          ? "linear-gradient(rgba(0,184,94,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,184,94,.05) 1px, transparent 1px)"
          : "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
        backgroundSize: "52px 52px",
        maskImage: "radial-gradient(ellipse at 50% 50%, black 50%, transparent 80%)",
      }} />

      <div style={{ position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
            background: "rgba(139,92,246,.08)",
            border: "1px solid rgba(139,92,246,.22)",
            borderRadius: 999, padding: "5px 16px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8B5CF6", display: "inline-block", boxShadow: "0 0 8px #8B5CF6" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: "#8B5CF6" }}>PLATFORM</span>
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "clamp(28px,4vw,48px)", fontWeight: 700, letterSpacing: "-.03em",
            color: t.text, marginBottom: 16, lineHeight: 1.1,
          }}>Every feature alive with data</h2>
          <p style={{ color: t.textSub, fontSize: 16, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
            Not just icons and text — live previews of what each feature actually does.
          </p>
        </div>

        {/* Feature grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
          {FEATURES.map((f, i) => {
            const Preview = f.preview;
            const hovered = hoveredIdx === i;
            return (
              <div
                key={f.title}
                ref={el => { cardRefs.current[i] = el; }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  background: isLight
                    ? hovered ? "#FFFFFF" : "#FFFFFF"
                    : hovered ? "#131A1C" : "#0E1416",
                  border: `1.5px solid ${hovered ? f.color + "45" : (isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.05)")}`,
                  borderRadius: 20, padding: "24px",
                  cursor: "default",
                  transition: "transform .25s cubic-bezier(.2,0,0,1), box-shadow .25s, border-color .25s",
                  transform: hovered ? "translateY(-5px)" : "none",
                  boxShadow: hovered
                    ? isLight
                      ? `0 0 0 1.5px ${f.color}25, 0 16px 48px rgba(0,0,0,.12), 0 0 0 4px ${f.color}06`
                      : `0 0 0 1px ${f.color}25, 0 12px 40px rgba(0,0,0,.4), 0 0 60px ${f.color}10`
                    : isLight
                      ? "0 2px 16px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.04)"
                      : "none",
                  opacity: 0,
                  animationFillMode: "both",
                  animation: `fade-up .6s cubic-bezier(.2,0,0,1) ${i * 80}ms both`,
                }}>

                {/* Live preview box */}
                <div style={{
                  background: isLight
                    ? hovered ? `${f.color}05` : "rgba(0,0,0,.025)"
                    : "rgba(255,255,255,.025)",
                  border: `1px solid ${hovered ? f.color + "25" : (isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.05)")}`,
                  borderRadius: 12, padding: "12px 14px", marginBottom: 20,
                  transition: "border-color .25s, background .25s",
                }}>
                  <Preview isLight={isLight} />
                </div>

                {/* Title + tag */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <h3 style={{
                    fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700,
                    color: t.text, transition: "color .2s",
                  }}>{f.title}</h3>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: ".07em",
                    color: f.color, background: `${f.color}12`,
                    border: `1px solid ${f.color}30`, borderRadius: 6, padding: "2px 7px",
                  }}>{f.tag}</span>
                </div>
                <p style={{ color: t.textSub, fontSize: 13.5, lineHeight: 1.7 }}>{f.desc}</p>

                {/* Hover arrow */}
                <div style={{
                  marginTop: 16, display: "flex", alignItems: "center", gap: 4,
                  color: f.color, fontSize: 12, fontWeight: 600,
                  opacity: hovered ? 1 : 0, transform: hovered ? "none" : "translateX(-4px)",
                  transition: "opacity .2s, transform .2s",
                }}>
                  Learn more
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
