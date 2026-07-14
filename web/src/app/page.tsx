"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import HeroAnimation from "@/components/HeroAnimation";
import HeroSection from "@/components/landing/HeroSection";
import StatsBar from "@/components/landing/StatsBar";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import FAQSection from "@/components/landing/FAQSection";
import Footer from "@/components/landing/Footer";
import { D, L } from "@/components/landing/tokens";
import { useTheme } from "@/contexts/ThemeContext";

const LiveMapLeaflet = dynamic(
  () => import("@/components/landing/LiveMapLeaflet"),
  { ssr: false, loading: () => <div style={{ flex: 1, background: "#1d2535", minHeight: 520 }} /> },
);

/* ── Live map section ── */
const LIVE_EVENTS = [
  { text: "Booking confirmed · Delhi NCR", color: "#00E676" },
  { text: "Session started · Bengaluru",   color: "#22D3EE" },
  { text: "Station added · Pune",          color: "#00E676" },
  { text: "QR scanned · Hyderabad",        color: "#FFC043" },
  { text: "Payment verified · Mumbai",     color: "#00E676" },
  { text: "Session completed · Chennai",   color: "#4DFFA6" },
];

const FILTER_TABS = ["All", "Fast DC", "AC Type 2", "CCS2", "Bharat AC"];

const NEARBY = [
  { name: "Sector 44, Gurugram", dist: "2.1 km", power: "150 kW", slots: 3,  status: "available" },
  { name: "Aerocity, Delhi",     dist: "4.8 km", power: "50 kW",  slots: 0,  status: "busy"      },
  { name: "Dwarka Sector 21",    dist: "6.3 km", power: "100 kW", slots: 1,  status: "available" },
];

function LiveMapSection({ isLight }: { isLight: boolean }) {
  const [eventIdx, setEventIdx]   = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const sectionRef = useRef<HTMLDivElement>(null);
  const tok = isLight ? L : D;
  const accent = isLight ? "#00D26A" : "#00E676";

  /* Event ticker */
  useEffect(() => {
    const id = setInterval(() => setEventIdx(i => (i + 1) % LIVE_EVENTS.length), 2400);
    return () => clearInterval(id);
  }, []);

  /* Scroll reveal */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) el.classList.add("visible"); },
      { threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // map loading bg
  const mapLoadingBg = isLight ? "#f5f5f0" : "#1d2535";

  return (
    <section ref={sectionRef} className="section-fade" style={{
      padding: `0 clamp(16px,5vw,60px) clamp(48px,8vw,100px)`,
      background: isLight
        ? "linear-gradient(180deg,#F8F6F1 0%,#FBFAF7 60%,#F8F6F1 100%)"
        : "linear-gradient(160deg,#060C12 0%,#09101A 35%,#070D15 65%,#050A10 100%)",
      position: "relative", overflow: "hidden",
    }}>

      {/* ── Dark mode decorative background ── */}
      {!isLight && (<>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:.16 }} aria-hidden="true">
          <defs>
            <pattern id="map-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(34,211,238,0.30)" strokeWidth=".6"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)"/>
        </svg>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:.10 }} aria-hidden="true">
          <defs>
            <pattern id="map-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(34,211,238,0.55)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-dots)"/>
        </svg>
        {/* Cyan glow — top left */}
        <div style={{ position:"absolute", top:"-8%", left:"-4%", width:680, height:680, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(34,211,238,.11) 0%,transparent 60%)" }}/>
        {/* Green glow — bottom right */}
        <div style={{ position:"absolute", bottom:"-6%", right:"-3%", width:560, height:560, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(0,230,118,.09) 0%,transparent 62%)" }}/>
        {/* Purple glow — centre */}
        <div style={{ position:"absolute", top:"45%", right:"22%", width:400, height:400, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(139,92,246,.07) 0%,transparent 62%)" }}/>
        {/* Amber glow — top right */}
        <div style={{ position:"absolute", top:"5%", right:"5%", width:340, height:340, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(255,192,67,.07) 0%,transparent 62%)" }}/>
        {/* Top accent line */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:1, pointerEvents:"none", background:"linear-gradient(90deg,transparent 0%,rgba(34,211,238,.38) 35%,rgba(0,230,118,.25) 70%,transparent 100%)" }}/>
        {/* Bottom accent line */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, pointerEvents:"none", background:"linear-gradient(90deg,transparent 0%,rgba(34,211,238,.20) 50%,transparent 100%)" }}/>
      </>)}

      {/* ── Light mode ambient glows ── */}
      {isLight && (<>
        <div style={{ position:"absolute", top:"10%", left:"6%", width:560, height:560, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(248,246,241,.62) 0%,transparent 65%)" }}/>
        <div style={{ position:"absolute", bottom:"8%", right:"5%", width:460, height:460, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(248,246,241,.45) 0%,transparent 65%)" }}/>
      </>)}

      {/* ── Section header ── */}
      <div style={{ textAlign: "center", marginBottom: "clamp(24px,4vw,48px)", position: "relative", paddingTop: "clamp(40px,7vw,80px)" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
          background: isLight ? "rgba(248,246,241,.66)" : "rgba(0,230,118,.07)",
          border: `1px solid ${isLight ? "rgba(0,210,106,.2)" : "rgba(0,230,118,.18)"}`,
          borderRadius: 999, padding: "5px 16px",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", background: accent,
            display: "inline-block", boxShadow: `0 0 8px ${accent}`,
            animation: "glow-pulse 2s ease-in-out infinite",
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: accent }}>LIVE MAP</span>
        </div>
        <h2 style={{
          fontFamily: "'Space Grotesk',sans-serif",
          fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 800,
          letterSpacing: "-.04em", color: tok.text, lineHeight: 1.08, marginBottom: 14,
        }}>
          Every charger. One map.<br />
          <span style={{
            background: "linear-gradient(90deg,#00E676,#22D3EE)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>Everywhere you drive.</span>
        </h2>
        <p style={{ color: tok.textSub, fontSize: 16, lineHeight: 1.75, maxWidth: 520, margin: "0 auto" }}>
          5,200+ stations across 42 cities. Plan your corridor, see real-time availability, and pre-book every stop before you leave.
        </p>
      </div>

      {/* ── Main card ── */}
      <div className="live-map-layout" style={{
        borderRadius: 24, overflow: "hidden",
        background: isLight ? "#FFFFFF" : "#0B0F10",
        border: `1.5px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)"}`,
        boxShadow: isLight
          ? "0 8px 60px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.05)"
          : "0 0 0 1px rgba(255,255,255,.06), 0 0 80px rgba(34,211,238,.06), 0 0 40px rgba(0,0,0,.5)",
        display: "grid", gridTemplateColumns: "clamp(260px,30%,320px) 1fr",
        position: "relative",
      }}>

        {/* ── Left sidebar ── */}
        <div className="live-map-sidebar" style={{
          display: "flex", flexDirection: "column",
          borderRight: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.05)"}`,
          background: isLight ? "#FBFAF7" : "#0D1213",
        }}>
          {/* Search */}
          <div style={{ padding: "24px 24px 0" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: isLight ? "#FFFFFF" : "rgba(255,255,255,.04)",
              border: `1px solid ${isLight ? "rgba(0,0,0,.1)" : "rgba(255,255,255,.08)"}`,
              borderRadius: 12, padding: "10px 14px",
              boxShadow: isLight ? "0 2px 8px rgba(0,0,0,.04)" : "none",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tok.textMuted} strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <span style={{ fontSize: 13, color: tok.textMuted }}>Search stations…</span>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ padding: "16px 24px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTER_TABS.map(tab => (
              <button key={tab} onClick={() => setActiveFilter(tab)} style={{
                padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                cursor: "pointer", border: "none",
                background: activeFilter === tab
                  ? (isLight ? "rgba(0,210,106,.12)" : "rgba(0,230,118,.12)")
                  : (isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.05)"),
                color: activeFilter === tab ? accent : tok.textMuted,
                outline: activeFilter === tab ? `1px solid ${isLight ? "rgba(0,210,106,.3)" : "rgba(0,230,118,.3)"}` : "none",
                transition: "all .15s",
              }}>{tab}</button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.05)", margin: "0 24px" }} />

          {/* Nearby stations */}
          <div style={{ padding: "16px 24px 0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: tok.textMuted, marginBottom: 12 }}>NEARBY STATIONS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {NEARBY.map((s) => (
                <div key={s.name} style={{
                  padding: "12px 14px", borderRadius: 12,
                  background: isLight ? "#FFFFFF" : "rgba(255,255,255,.03)",
                  border: `1px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.06)"}`,
                  boxShadow: isLight ? "0 2px 8px rgba(0,0,0,.04)" : "none",
                  cursor: "pointer", transition: "transform .15s, box-shadow .15s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = isLight ? "0 6px 20px rgba(0,0,0,.08)" : "0 0 0 1px rgba(255,255,255,.09)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = isLight ? "0 2px 8px rgba(0,0,0,.04)" : "none"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: tok.text, lineHeight: 1.3 }}>{s.name}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                      background: s.status === "available" ? (isLight ? "rgba(0,210,106,.1)" : "rgba(0,230,118,.1)") : (isLight ? "rgba(255,120,73,.1)" : "rgba(255,120,73,.12)"),
                      color: s.status === "available" ? accent : "#FF7849",
                    }}>{s.status === "available" ? `${s.slots} free` : "Busy"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 11, color: tok.textMuted }}>📍 {s.dist}</span>
                    <span style={{ fontSize: 11, color: tok.textMuted }}>⚡ {s.power}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live activity feed */}
          <div style={{ padding: "20px 24px 0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: tok.textMuted, marginBottom: 10 }}>LIVE ACTIVITY</div>
            <div style={{ height: 38, overflow: "hidden", position: "relative" }}>
              {LIVE_EVENTS.map((ev, i) => (
                <div key={i} style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 12px", borderRadius: 10,
                  background: isLight ? "rgba(0,0,0,.03)" : "rgba(255,255,255,.03)",
                  border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.06)"}`,
                  opacity: i === eventIdx ? 1 : 0,
                  transform: i === eventIdx ? "none" : "translateY(6px)",
                  transition: "opacity .5s, transform .5s",
                  pointerEvents: "none",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: ev.color, flexShrink: 0, boxShadow: `0 0 6px ${ev.color}` }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: tok.textSub }}>{ev.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: "auto" }}>
            {[
              { v: "4,827",  l: "Total stations", c: "#00E676" },
              { v: "892",    l: "Charging now",   c: "#22D3EE" },
              { v: "42",     l: "Cities covered", c: "#FFC043" },
              { v: "99.4%",  l: "Uptime",         c: "#C4B5FD" },
            ].map(s => (
              <div key={s.l} style={{
                padding: "10px 12px", borderRadius: 10,
                background: isLight ? "#FFFFFF" : "rgba(255,255,255,.03)",
                border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.05)"}`,
              }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, color: tok.textMuted, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ padding: "0 24px 24px" }}>
            <Link href="/plan" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 700,
              background: `linear-gradient(135deg,${isLight ? "#00D26A" : "#00C260"},${isLight ? "#00A855" : "#009A50"})`,
              color: "#FFF", textDecoration: "none",
              boxShadow: isLight ? "0 4px 16px rgba(0,210,106,.3)" : "0 0 24px rgba(0,210,106,.2)",
              transition: "transform .2s, box-shadow .2s",
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = isLight ? "0 8px 24px rgba(0,210,106,.4)" : "0 0 36px rgba(0,210,106,.3)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "none"; el.style.boxShadow = isLight ? "0 4px 16px rgba(0,210,106,.3)" : "0 0 24px rgba(0,210,106,.2)"; }}
            >
              <span>Plan My Route</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>

        {/* ── Right: real Leaflet map ── */}
        <div style={{ position: "relative", zIndex: 0, isolation: "isolate", minHeight: 520, overflow: "hidden", background: mapLoadingBg }}>

          {/* Leaflet map fills the panel */}
          <LiveMapLeaflet isLight={isLight} />

          {/* Top bar overlay */}
          <div style={{
            position: "absolute", top: 16, left: 16, right: 16, zIndex: 30,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: isLight ? "rgba(255,255,255,.88)" : "rgba(18,28,40,.88)",
            backdropFilter: "blur(14px)",
            border: `1px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.1)"}`,
            borderRadius: 12, padding: "10px 16px",
            boxShadow: isLight ? "0 4px 20px rgba(0,0,0,.1)" : "0 4px 20px rgba(0,0,0,.5)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 6px ${accent}`, animation: "glow-pulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: tok.text }}>Live Network</span>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[{ v: "5,200+", l: "Stations" }, { v: "892", l: "Active" }, { v: "42", l: "Cities" }].map(m => (
                <div key={m.l} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: accent }}>{m.v}</div>
                  <div style={{ fontSize: 9, color: tok.textMuted }}>{m.l}</div>
                </div>
              ))}
            </div>
            <div style={{
              fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 99,
              background: isLight ? "rgba(0,210,106,.1)" : "rgba(0,230,118,.1)",
              color: accent,
            }}>● LIVE</div>
          </div>

          {/* Left fade to blend with sidebar */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20,
            background: isLight
              ? "linear-gradient(90deg,rgba(250,251,252,.92) 0%,transparent 14%)"
              : "linear-gradient(90deg,rgba(11,15,16,.92) 0%,transparent 14%)",
          }}/>

          {/* Battery range widget */}
          <div style={{
            position: "absolute", bottom: 20, right: 20, zIndex: 30,
            background: isLight ? "rgba(255,255,255,.92)" : "rgba(18,28,40,.92)",
            border: `1px solid ${isLight ? "rgba(0,0,0,.09)" : "rgba(255,255,255,.1)"}`,
            borderRadius: 14, padding: "14px 16px", backdropFilter: "blur(12px)",
            boxShadow: isLight ? "0 4px 24px rgba(0,0,0,.1)" : "0 4px 24px rgba(0,0,0,.5)",
            minWidth: 152,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", color: tok.textMuted, marginBottom: 8 }}>BATTERY RANGE</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1 }}>324 km</div>
            <div style={{ height: 5, borderRadius: 3, background: isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)", overflow: "hidden", margin: "8px 0 6px" }}>
              <div style={{ width: "78%", height: "100%", borderRadius: 3, background: `linear-gradient(90deg,#22D3EE,${accent})`, boxShadow: `0 0 8px ${accent}60` }}/>
            </div>
            <div style={{ fontSize: 10, color: tok.textMuted }}>78% · 3 stops available</div>
          </div>

          {/* Pin legend */}
          <div style={{
            position: "absolute", bottom: 20, left: 20, zIndex: 30,
            background: isLight ? "rgba(255,255,255,.92)" : "rgba(18,28,40,.92)",
            border: `1px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.1)"}`,
            borderRadius: 10, padding: "10px 14px", backdropFilter: "blur(10px)",
            boxShadow: isLight ? "0 4px 24px rgba(0,0,0,.08)" : "0 4px 24px rgba(0,0,0,.5)",
          }}>
            {[{ c: "#00E676", l: "Active"       },
              { c: "#FFC043", l: "Coming soon"  },
              { c: "#22D3EE", l: "Partnered"    }].map(item => (
              <div key={item.l} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: item.c, boxShadow: `0 0 5px ${item.c}` }}/>
                <span style={{ fontSize: 10, fontWeight: 600, color: isLight ? "#64748B" : "#6B7479" }}>{item.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA — India network nodes & edges ── */
const CTA_NODES = [
  { id: "del", name: "Delhi",     x: 235, y:  95, r: 7,   c: "#00E676", stations: 340 },
  { id: "jai", name: "Jaipur",    x: 185, y: 140, r: 5,   c: "#22D3EE", stations: 128 },
  { id: "ahm", name: "Ahmedabad", x: 142, y: 205, r: 5.5, c: "#FFC043", stations: 156 },
  { id: "luc", name: "Lucknow",   x: 298, y: 122, r: 4.5, c: "#22D3EE", stations:  94 },
  { id: "pat", name: "Patna",     x: 355, y: 150, r: 4.5, c: "#00E676", stations:  72 },
  { id: "kol", name: "Kolkata",   x: 408, y: 200, r: 6.5, c: "#22D3EE", stations: 210 },
  { id: "mum", name: "Mumbai",    x: 138, y: 322, r: 8,   c: "#00E676", stations: 280 },
  { id: "pun", name: "Pune",      x: 155, y: 365, r: 5,   c: "#22D3EE", stations: 148 },
  { id: "hyd", name: "Hyderabad", x: 268, y: 362, r: 6.5, c: "#FFC043", stations: 188 },
  { id: "che", name: "Chennai",   x: 308, y: 444, r: 6,   c: "#22D3EE", stations: 175 },
  { id: "ben", name: "Bengaluru", x: 242, y: 440, r: 7.5, c: "#00E676", stations: 290 },
  { id: "koc", name: "Kochi",     x: 218, y: 512, r: 4.5, c: "#C4B5FD", stations:  64 },
] as const;

const CTA_EDGES: [string, string][] = [
  ["del","jai"],["del","luc"],["jai","ahm"],["del","ahm"],
  ["luc","pat"],["pat","kol"],["ahm","mum"],["mum","pun"],
  ["pun","hyd"],["hyd","che"],["hyd","kol"],["che","ben"],
  ["ben","koc"],["ben","pun"],["del","pat"],["mum","hyd"],
];

/* ── Final CTA ── */
function FinalCTA({ isLight }: { isLight: boolean }) {
  const [particles] = useState(() => Array.from({ length: 28 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: 1.5 + Math.random() * 3.5, dur: 3 + Math.random() * 5, del: Math.random() * 4,
    color: [
      "#00E676", "#22D3EE", "#FFC043", "#C4B5FD", "#4DFFA6",
    ][Math.floor(Math.random() * 5)],
  })));
  const sectionRef = useRef<HTMLDivElement>(null);
  const t = isLight ? L : D;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) el.classList.add("visible"); },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const accent = isLight ? "#00D26A" : "#00E676";

  return (
    <div ref={sectionRef} className="section-fade final-cta-grid" style={{
      background: isLight ? "linear-gradient(135deg,#F8F6F1 0%,#FBFAF7 50%,#F8F6F1 100%)" : t.bg,
      overflow: "hidden", position: "relative",
      minHeight: "clamp(560px,70vw,90vh)", display: "grid", gridTemplateColumns: "1fr 1fr",
    }}>
      {/* Ambient particles — left half only */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", borderRadius: "50%",
          left: `${p.x * 0.48}%`, top: `${p.y}%`,
          width: p.size, height: p.size, background: p.color,
          boxShadow: isLight ? `0 0 ${p.size * 2}px ${p.color}50` : `0 0 ${p.size * 3}px ${p.color}`,
          pointerEvents: "none", opacity: isLight ? 0.2 : 0.45,
          animation: `particle-float ${p.dur}s ease-in-out ${p.del}s infinite`,
        }} />
      ))}
      {/* Left aurora */}
      <div style={{
        position: "absolute", top: "15%", left: 0,
        width: 640, height: 640, borderRadius: "50%", pointerEvents: "none",
        background: isLight
          ? "radial-gradient(ellipse, rgba(248,246,241,.72) 0%, transparent 65%)"
          : "radial-gradient(ellipse, rgba(0,230,118,.07) 0%, transparent 65%)",
      }} />

      {/* ── Left column ── */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", zIndex: 1, padding: "clamp(48px,7vw,80px) clamp(20px,4vw,52px) clamp(48px,7vw,80px) clamp(24px,6vw,80px)" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24,
              background: isLight ? "rgba(248,246,241,.66)" : "rgba(0,230,118,.08)",
              border: `1px solid ${isLight ? "rgba(0,210,106,.2)" : "rgba(0,230,118,.2)"}`,
              borderRadius: 999, padding: "5px 16px", width: "fit-content",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, display: "inline-block", boxShadow: `0 0 8px ${accent}`, animation: "glow-pulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: accent }}>GET STARTED TODAY</span>
            </div>

            <h2 style={{
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: "clamp(34px,4vw,60px)", fontWeight: 800, letterSpacing: "-.04em",
              color: t.text, lineHeight: 1.04, marginBottom: 20,
            }}>
              Charge smarter.<br />
              <span style={{
                background: "linear-gradient(90deg,#00D26A,#22D3EE,#00E676)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>Drive further.</span>
            </h2>
            <p style={{ color: t.textSub, fontSize: 16, lineHeight: 1.75, marginBottom: 24, maxWidth: 420 }}>
              Join 50,000+ EV drivers who never worry about empty stations. Free to start — no credit card required.
            </p>

            {/* Social proof */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: "14px 18px", borderRadius: 14, background: isLight ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.04)", border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)"}`, backdropFilter: "blur(8px)" }}>
              <div style={{ display: "flex" }}>
                {["#00E676","#22D3EE","#FFC043","#C4B5FD","#4DFFA6"].map((c, i) => (
                  <div key={c} style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${isLight ? "#E0F2EC" : "#0C2319"}`, background: `linear-gradient(135deg,${c}40,${c}20)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: c, marginLeft: i > 0 ? -8 : 0, position: "relative", zIndex: 10 - i }}>
                    {["A","P","R","M","S"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>2,840 drivers joined this week</div>
                <div style={{ fontSize: 11, color: "#FFC043" }}>★★★★★ <span style={{ color: t.textMuted }}>4.9 average rating</span></div>
              </div>
            </div>

            {/* Mini stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 28 }}>
              {[
                { value: "5,200+", label: "Stations", color: accent },
                { value: "42",     label: "Cities",   color: "#22D3EE" },
                { value: "₹340",   label: "Avg saved", color: "#FFC043" },
              ].map(s => (
                <div key={s.label} style={{ padding: "12px 14px", borderRadius: 12, background: isLight ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.04)", border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)"}`, backdropFilter: "blur(6px)" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 10.5, color: t.textMuted }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <Link href="/plan" style={{
                padding: "15px 32px", borderRadius: 14, fontSize: 15, fontWeight: 700,
                background: "linear-gradient(135deg,#00D26A,#00A855)", color: "#FFF",
                textDecoration: "none",
                boxShadow: isLight ? "0 4px 20px rgba(0,210,106,.4)" : "0 0 0 1px rgba(0,210,106,.3), 0 0 40px rgba(0,210,106,.25)",
                transition: "transform .2s, box-shadow .2s",
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = isLight ? "0 8px 28px rgba(0,210,106,.5)" : "0 0 0 1px rgba(0,210,106,.4), 0 0 55px rgba(0,210,106,.35)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "none"; el.style.boxShadow = isLight ? "0 4px 20px rgba(0,210,106,.4)" : "0 0 0 1px rgba(0,210,106,.3), 0 0 40px rgba(0,210,106,.25)"; }}
              >Plan My Journey →</Link>
              <Link href="/discover" style={{
                padding: "15px 26px", borderRadius: 14, fontSize: 14.5, fontWeight: 600,
                background: "transparent", color: t.text, textDecoration: "none",
                border: `1px solid ${isLight ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.12)"}`,
                backdropFilter: "blur(8px)",
                transition: "background .2s, transform .2s",
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.background = isLight ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.07)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "none"; el.style.background = "transparent"; }}
              >Browse chargers</Link>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              {[
                { icon: "🔒", label: "PCI-DSS L1" },
                { icon: "⚡", label: "50K+ drivers" },
                { icon: "✓", label: "Free to start" },
                { icon: "🌱", label: "Carbon neutral" },
              ].map(b => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 11 }}>{b.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted }}>{b.label}</span>
                </div>
              ))}
            </div>
      </div>

      {/* ── Right column — India charging network (full bleed) ── */}
      <div className="final-cta-right" style={{ position: "relative", overflow: "hidden" }}>
        {/* Right aurora */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: isLight
            ? "radial-gradient(ellipse at 55% 38%, rgba(248,246,241,.66) 0%, rgba(34,211,238,.04) 45%, transparent 70%)"
            : "radial-gradient(ellipse at 55% 38%, rgba(0,230,118,.06) 0%, rgba(34,211,238,.03) 45%, transparent 70%)",
        }} />

        <svg width="100%" height="100%" viewBox="0 0 500 600"
          style={{ position: "absolute", inset: 0 }}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true">

          {/* Subtle grid */}
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`v${i}`} x1={i * 42} y1="0" x2={i * 42} y2="600"
              stroke={isLight ? "rgba(0,0,0,.028)" : "rgba(255,255,255,.022)"} strokeWidth="1" />
          ))}
          {Array.from({ length: 15 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 42} x2="500" y2={i * 42}
              stroke={isLight ? "rgba(0,0,0,.028)" : "rgba(255,255,255,.022)"} strokeWidth="1" />
          ))}

          {/* Network edges */}
          {CTA_EDGES.map(([a, b], i) => {
            const fn = CTA_NODES.find(n => n.id === a)!;
            const tn = CTA_NODES.find(n => n.id === b)!;
            return (
              <line key={i}
                x1={fn.x} y1={fn.y} x2={tn.x} y2={tn.y}
                stroke={isLight ? "rgba(0,184,94,.2)" : "rgba(0,230,118,.15)"}
                strokeWidth="1.2"
              />
            );
          })}

          {/* Animated energy packets */}
          {([
            { path: "M235,95 L185,140 L142,205 L138,322", color: "#00E676", dur: "5s",  begin: "0s"   },
            { path: "M408,200 L268,362 L242,440",          color: "#22D3EE", dur: "7s",  begin: "1.5s" },
            { path: "M235,95 L298,122 L355,150 L408,200",  color: "#FFC043", dur: "6s",  begin: "0.8s" },
            { path: "M138,322 L155,365 L268,362 L308,444", color: "#00E676", dur: "8s",  begin: "3s"   },
            { path: "M242,440 L218,512",                   color: "#C4B5FD", dur: "4.5s",begin: "2.2s" },
          ] as const).map((anim, i) => (
            <circle key={i} r="4" fill={anim.color}
              style={{ filter: `drop-shadow(0 0 5px ${anim.color})` }}>
              <animateMotion path={anim.path} dur={anim.dur} repeatCount="indefinite" begin={anim.begin} />
            </circle>
          ))}

          {/* City nodes */}
          {CTA_NODES.map((n, i) => (
            <g key={n.id}>
              {/* Outer pulse ring */}
              <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} opacity="0">
                <animate attributeName="r"
                  values={`${n.r};${n.r * 3.8};${n.r}`}
                  dur={`${3.2 + (i % 3) * 0.9}s`} repeatCount="indefinite"
                  begin={`${(i * 0.5) % 3}s`} />
                <animate attributeName="opacity"
                  values=".25;0;.25"
                  dur={`${3.2 + (i % 3) * 0.9}s`} repeatCount="indefinite"
                  begin={`${(i * 0.5) % 3}s`} />
              </circle>
              {/* Inner glow halo */}
              <circle cx={n.x} cy={n.y} r={n.r * 1.7}
                fill={n.c} opacity={isLight ? 0.1 : 0.09} />
              {/* Core dot */}
              <circle cx={n.x} cy={n.y} r={n.r} fill={n.c}
                style={{ filter: `drop-shadow(0 0 ${n.r + 2}px ${n.c})` }} />
              {/* City label */}
              <text x={n.x + n.r + 6} y={n.y + 3}
                fontSize="9.5" fontWeight="700" fontFamily="'Space Grotesk',sans-serif"
                fill={isLight ? "#374151" : "#C9D1D9"}>{n.name}</text>
              <text x={n.x + n.r + 6} y={n.y + 15}
                fontSize="8" fontFamily="sans-serif"
                fill={isLight ? "#9CA3AF" : "#6B7479"}>{n.stations} stations</text>
            </g>
          ))}

          {/* Header badge */}
          <rect x="18" y="18" width="174" height="40" rx="10"
            fill={isLight ? "rgba(255,255,255,.84)" : "rgba(13,18,22,.84)"}
            stroke={isLight ? "rgba(0,184,94,.22)" : "rgba(0,230,118,.18)"} strokeWidth="1" />
          <text x="30" y="34" fontSize="8.5" fontWeight="700" letterSpacing="1.2"
            fontFamily="'Space Grotesk',sans-serif"
            fill={isLight ? "#6B7280" : "#8B949E"}>INDIA COVERAGE</text>
          <text x="30" y="50" fontSize="10.5" fontWeight="700"
            fontFamily="'Space Grotesk',sans-serif"
            fill={isLight ? "#111827" : "#E6EBED"}>5,200+ charging stations</text>

          {/* Live status strip */}
          <rect x="18" y="558" width="464" height="28" rx="8"
            fill={isLight ? "rgba(255,255,255,.62)" : "rgba(13,18,22,.62)"}
            stroke={isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.05)"} strokeWidth="1" />
          <circle cx="32" cy="572" r="3.5" fill="#00E676">
            <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="42" y="576" fontSize="8.5" fontFamily="'JetBrains Mono',monospace" fontWeight="500"
            fill={isLight ? "#4B5563" : "#8B949E"}>
            42 cities · 99.8% uptime · 50,000+ drivers · live
          </text>
        </svg>

        {/* Left-edge fade to blend with left column */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 80, pointerEvents: "none",
          background: isLight
            ? "linear-gradient(90deg,#F8F6F1,transparent)"
            : `linear-gradient(90deg,${t.bg},transparent)`,
        }} />
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isLight } = useTheme();
  const t = isLight ? L : D;

  const glowRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const el = glowRef.current;
    const onMove = (e: MouseEvent) => {
      if (!el) return;
      el.style.left = `${e.clientX}px`;
      el.style.top  = `${e.clientY}px`;
    };
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text, fontFamily: "'Inter',system-ui,sans-serif", overflowX: "hidden", transition: "background .3s,color .3s", position: "relative" }}>

      {/* Mouse-follow glow */}
      <div ref={glowRef} style={{
        position: "fixed", pointerEvents: "none", zIndex: 0,
        width: 700, height: 700, borderRadius: "50%",
        transform: "translate(-50%,-50%)",
        background: isLight
          ? "radial-gradient(circle, rgba(248,246,241,.34) 0%, rgba(248,246,241,.35) 40%, transparent 65%)"
          : "radial-gradient(circle, rgba(0,230,118,.05) 0%, transparent 65%)",
        transition: "left .18s ease-out, top .18s ease-out",
      }} />

      <NavBar />

      {/* Scroll-to-top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 200,
          width: 44,
          height: 44,
          borderRadius: 14,
          border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)",
          background: isLight ? "rgba(255,255,255,0.9)" : "rgba(14,20,22,0.9)",
          backdropFilter: "blur(12px)",
          boxShadow: isLight
            ? "0 4px 20px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,184,94,0.15)"
            : "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,230,118,0.12)",
          color: isLight ? "#00B85E" : "#00E676",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: showTop ? 1 : 0,
          transform: showTop ? "translateY(0)" : "translateY(12px)",
          transition: "opacity .25s ease, transform .25s ease, box-shadow .2s ease",
          pointerEvents: showTop ? "all" : "none",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget;
          el.style.boxShadow = isLight
            ? "0 6px 28px rgba(0,0,0,0.15), 0 0 0 1.5px rgba(0,184,94,0.35)"
            : "0 6px 28px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(0,230,118,0.35), 0 0 20px rgba(0,230,118,0.15)";
          el.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget;
          el.style.boxShadow = isLight
            ? "0 4px 20px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,184,94,0.15)"
            : "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,230,118,0.12)";
          el.style.transform = "translateY(0)";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 15l-6-6-6 6"/>
        </svg>
      </button>

      <HeroSection isLight={isLight} t={t} />

      <StatsBar isLight={isLight} t={t} />

      {/* ── Journey animation section ── */}
      <div style={{
        position: "relative",
        background: isLight
          ? "linear-gradient(180deg, #F8F6F1 0%, #FBFAF7 50%, #F8F6F1 100%)"
          : "linear-gradient(160deg,#06100A 0%,#091408 35%,#070E06 65%,#050A04 100%)",
        overflow: "hidden",
      }}>
        {/* ── Dark mode decorative background ── */}
        {!isLight && (<>
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:.16 }} aria-hidden="true">
            <defs>
              <pattern id="jrny-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(0,230,118,0.32)" strokeWidth=".6"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#jrny-grid)"/>
          </svg>
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:.10 }} aria-hidden="true">
            <defs>
              <pattern id="jrny-dots" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(0,230,118,0.55)"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#jrny-dots)"/>
          </svg>
          {/* Green glow — top left */}
          <div style={{ position:"absolute", top:"-8%", left:"-5%", width:700, height:700, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(0,230,118,.12) 0%,transparent 60%)" }}/>
          {/* Cyan glow — bottom right */}
          <div style={{ position:"absolute", bottom:"-6%", right:"-4%", width:560, height:560, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(34,211,238,.09) 0%,transparent 62%)" }}/>
          {/* Amber glow — centre right */}
          <div style={{ position:"absolute", top:"40%", right:"15%", width:380, height:380, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(255,192,67,.07) 0%,transparent 62%)" }}/>
          {/* Purple glow — bottom left */}
          <div style={{ position:"absolute", bottom:"10%", left:"12%", width:320, height:320, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(139,92,246,.07) 0%,transparent 62%)" }}/>
          {/* Top accent line */}
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1, pointerEvents:"none", background:"linear-gradient(90deg,transparent 0%,rgba(0,230,118,.38) 35%,rgba(34,211,238,.25) 70%,transparent 100%)" }}/>
          {/* Bottom accent line */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, pointerEvents:"none", background:"linear-gradient(90deg,transparent 0%,rgba(0,230,118,.22) 50%,transparent 100%)" }}/>
        </>)}

        {/* ── Light mode ambient glows ── */}
        {isLight && (<>
          <div style={{ position:"absolute", top:"20%", left:"20%", transform:"translate(-50%,-50%)", width:800, height:500, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(248,246,241,.54) 0%,rgba(248,246,241,.52) 50%,transparent 70%)", pointerEvents:"none", animation:"aurora-shift 18s ease-in-out infinite" }}/>
          <div style={{ position:"absolute", bottom:"10%", right:"10%", width:500, height:300, borderRadius:"50%", background:"radial-gradient(ellipse,rgba(248,246,241,.62) 0%,transparent 70%)", pointerEvents:"none", animation:"aurora-shift 24s ease-in-out 8s infinite reverse" }}/>
          {/* Background grid */}
          <div style={{ position:"absolute", inset:0, pointerEvents:"none", backgroundImage:"linear-gradient(rgba(248,246,241,.48) 1px, transparent 1px), linear-gradient(90deg, rgba(248,246,241,.48) 1px, transparent 1px)", backgroundSize:"48px 48px", maskImage:"radial-gradient(ellipse at 50% 50%, black 40%, transparent 80%)" }}/>
        </>)}

        <div style={{ textAlign: "center", padding: "clamp(40px,8vw,80px) clamp(16px,5vw,60px) 40px", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: isLight ? "rgba(248,246,241,.66)" : "rgba(0,230,118,.08)", border: `1px solid ${isLight ? "rgba(0,210,106,.2)" : "rgba(0,230,118,.2)"}`, borderRadius: 999, padding: "5px 16px", marginBottom: 20 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: isLight ? "#00D26A" : "#00E676", display: "inline-block", boxShadow: `0 0 8px ${isLight ? "#00D26A" : "#00E676"}` }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: isLight ? "#00D26A" : "#00E676" }}>LIVE JOURNEY TRACKER</span>
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(22px,4vw,52px)", fontWeight: 700, letterSpacing: "-.03em", marginBottom: 16, color: t.text, lineHeight: 1.06 }}>
            Your route, live —<br />from plan to plug
          </h2>
          <p style={{ color: t.textSub, fontSize: "clamp(13px,1.6vw,16px)", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
            Watch a real trip unfold in real time. Noida → Patna · 1,010 km · 3 pre-booked charging stops, reserved in a single checkout.
          </p>
        </div>

        <div style={{ position: "relative", width: "100%", height: "clamp(340px,50vw,520px)" }}>
          <HeroAnimation isLight={isLight} />
        </div>
        <div style={{ height: "clamp(32px,5vw,72px)" }} />
      </div>

      <HowItWorks isLight={isLight} t={t} />

      <Features isLight={isLight} t={t} />

      <LiveMapSection isLight={isLight} />

      <Testimonials isLight={isLight} t={t} />

      <Pricing isLight={isLight} t={t} />

      <FAQSection isLight={isLight} t={t} />

      <FinalCTA isLight={isLight} />

      <Footer isLight={isLight} t={t} />
    </div>
  );
}
