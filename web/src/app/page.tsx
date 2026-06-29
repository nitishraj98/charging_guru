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
    <section ref={sectionRef} className="section-fade" style={{ padding: "0 60px 100px" }}>

      {/* ── Section header ── */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
          background: isLight ? "rgba(0,210,106,.08)" : "rgba(0,230,118,.07)",
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
      <div style={{
        borderRadius: 24, overflow: "hidden",
        background: isLight ? "#FFFFFF" : "#0B0F10",
        border: `1.5px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.06)"}`,
        boxShadow: isLight
          ? "0 8px 60px rgba(0,0,0,.1), 0 2px 8px rgba(0,0,0,.05)"
          : "0 0 0 1px rgba(255,255,255,.04), 0 0 100px rgba(0,230,118,.05)",
        display: "grid", gridTemplateColumns: "320px 1fr",
      }}>

        {/* ── Left sidebar ── */}
        <div style={{
          display: "flex", flexDirection: "column",
          borderRight: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.05)"}`,
          background: isLight ? "#FAFBFC" : "#0D1213",
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
        <div style={{ position: "relative", minHeight: 520, overflow: "hidden", background: mapLoadingBg }}>

          {/* Leaflet map fills the panel */}
          <LiveMapLeaflet isLight={isLight} />

          {/* Top bar overlay — zIndex > Leaflet controls (800) */}
          <div style={{
            position: "absolute", top: 16, left: 16, right: 16, zIndex: 1100,
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
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1050,
            background: isLight
              ? "linear-gradient(90deg,rgba(250,251,252,.92) 0%,transparent 14%)"
              : "linear-gradient(90deg,rgba(11,15,16,.92) 0%,transparent 14%)",
          }}/>

          {/* Battery range widget */}
          <div style={{
            position: "absolute", bottom: 20, right: 20, zIndex: 1100,
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
            position: "absolute", bottom: 20, left: 20, zIndex: 1100,
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
    <div ref={sectionRef} className="section-fade" style={{
      padding: "0 60px 80px",
      background: isLight ? "linear-gradient(180deg, #F6F8FA, #EEF3F7)" : t.bg,
    }}>
      <div style={{
        position: "relative", overflow: "hidden",
        background: isLight
          ? "linear-gradient(145deg,#E0F2EC,#EEF8F2 40%,#E4F0FB 80%,#EEF8F2)"
          : "linear-gradient(145deg,#040C08,#0C2319 40%,#07101A 80%,#0A1A10)",
        border: `1.5px solid ${isLight ? "rgba(0,184,94,.25)" : "rgba(0,230,118,.15)"}`,
        borderRadius: 28, padding: "80px 0",
        boxShadow: isLight
          ? "0 8px 80px rgba(0,0,0,.12), 0 0 0 1px rgba(0,184,94,.12), inset 0 1px 0 rgba(255,255,255,.8)"
          : "0 0 0 1px rgba(0,230,118,.1), 0 0 140px rgba(0,230,118,.06)",
      }}>
        {/* Particles */}
        {particles.map(p => (
          <div key={p.id} style={{
            position: "absolute", borderRadius: "50%",
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            background: p.color,
            boxShadow: isLight ? `0 0 ${p.size * 2}px ${p.color}50` : `0 0 ${p.size * 3}px ${p.color}`,
            pointerEvents: "none",
            opacity: isLight ? 0.3 : 0.55,
            animation: `particle-float ${p.dur}s ease-in-out ${p.del}s infinite`,
          }} />
        ))}

        {/* Central radial glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: 900, height: 450, borderRadius: "50%", pointerEvents: "none",
          background: `radial-gradient(ellipse, ${isLight ? "rgba(0,210,106,.12)" : "rgba(0,230,118,.1)"} 0%, ${isLight ? "rgba(14,165,233,.05)" : "rgba(34,211,238,.04)"} 50%, transparent 70%)`,
          animation: "float-slow 8s ease-in-out infinite",
        }} />

        {/* Two-column layout */}
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, maxWidth: 1200, margin: "0 auto", padding: "0 60px" }}>

          {/* Left — copy */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24,
              background: isLight ? "rgba(0,210,106,.08)" : "rgba(0,230,118,.08)",
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
            <p style={{ color: t.textSub, fontSize: 16, lineHeight: 1.75, marginBottom: 40, maxWidth: 420 }}>
              Join 50,000+ EV drivers who never worry about empty stations. Free to start — no credit card required.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
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

            {/* App store buttons */}
            <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
              {[
                { label: "App Store", sub: "Download on the", icon: "🍎" },
                { label: "Google Play", sub: "Get it on", icon: "▶" },
              ].map(store => (
                <div key={store.label} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 18px", borderRadius: 12,
                  background: isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.06)",
                  border: `1px solid ${isLight ? "rgba(0,0,0,.1)" : "rgba(255,255,255,.1)"}`,
                  cursor: "pointer", transition: "all .2s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.06)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
                >
                  <span style={{ fontSize: 20 }}>{store.icon}</span>
                  <div>
                    <div style={{ fontSize: 9, color: t.textMuted, fontWeight: 600 }}>{store.sub}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{store.label}</div>
                  </div>
                </div>
              ))}
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

          {/* Vertical divider */}
          <div style={{ width: 1, margin: "0 60px", background: isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.07)" }} />

          {/* Right — animated EV + charging station illustration */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="300" height="320" viewBox="0 0 300 320" style={{ overflow: "visible" }}>
              {/* Ground shadow */}
              <ellipse cx="150" cy="305" rx="120" ry="10" fill={isLight ? "rgba(0,0,0,.06)" : "rgba(0,0,0,.4)"} />

              {/* Charging station pole */}
              <rect x="220" y="60" width="14" height="220" rx="5" fill={isLight ? "#D1D9E0" : "#1A2226"} />
              {/* Station housing */}
              <rect x="205" y="60" width="44" height="80" rx="10" fill={isLight ? "#E8EFF4" : "#1E2830"} stroke={isLight ? "#C8D5DE" : "#2A3640"} strokeWidth="1.5" />
              {/* Station screen */}
              <rect x="212" y="68" width="30" height="20" rx="5" fill={isLight ? "#BAE6FD" : "#0C2A3A"} />
              <rect x="214" y="70" width="26" height="16" rx="3" fill={isLight ? "#E0F2FE" : "#0A1F2D"} />
              {/* Screen glow + percentage */}
              <text x="227" y="81" textAnchor="middle" fontSize="9" fontFamily="'JetBrains Mono',monospace" fontWeight="700" fill={accent}>78%</text>
              {/* Charging bolt on station */}
              <circle cx="227" cy="100" r="10" fill={`${accent}20`} />
              <text x="227" y="104" textAnchor="middle" fontSize="14" fill={accent}>⚡</text>
              {/* Station status LED */}
              <circle cx="240" cy="64" r="3" fill="#00E676" style={{ filter: "drop-shadow(0 0 4px #00E676)", animation: "glow-pulse 2s ease-in-out infinite" }} />

              {/* Charging cable — from station down to car */}
              <path d="M219 140 Q219 200 180 210 Q160 215 145 215"
                fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round"
                strokeDasharray="8 5"
                style={{ animation: "route-dash 1.8s linear infinite" }} />
              {/* Cable plug circle */}
              <circle cx="143" cy="215" r="6" fill={accent} style={{ filter: `drop-shadow(0 0 6px ${accent})` }} />

              {/* EV Car body */}
              <rect x="30" y="195" width="140" height="55" rx="14" fill={isLight ? "#E2EAF0" : "#1A2226"} stroke={isLight ? "#C8D5DE" : "#2A3640"} strokeWidth="1.5" />
              {/* Car roof */}
              <path d="M55 195 Q80 158 120 155 Q150 152 175 165 L180 195Z"
                fill={isLight ? "#E2EAF0" : "#1A2226"} stroke={isLight ? "#C8D5DE" : "#2A3640"} strokeWidth="1.5" />
              {/* Windshield */}
              <path d="M62 195 Q83 165 115 162 Q140 160 160 172 L163 195Z"
                fill={isLight ? "#BAE6FD" : "#0C2A3A"} opacity=".75" />
              {/* Front window */}
              <rect x="33" y="200" width="35" height="24" rx="4"
                fill={isLight ? "#BAE6FD" : "#0C2A3A"} opacity=".6" />

              {/* Charge port area */}
              <rect x="136" y="208" width="16" height="10" rx="3"
                fill={isLight ? "#CBD5E1" : "#2A3640"} stroke={isLight ? "#94A3B8" : "#374151"} strokeWidth="1" />

              {/* Battery bar inside car */}
              <rect x="70" y="208" width="60" height="9" rx="4.5"
                fill={isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.08)"} />
              <rect x="70" y="208" width="0" height="9" rx="4.5"
                fill={accent} className="charge-fill"
                style={{ filter: `drop-shadow(0 0 3px ${accent})` }} />

              {/* Battery label */}
              <text x="100" y="217" textAnchor="middle" fontSize="6.5" fontFamily="'JetBrains Mono',monospace" fontWeight="700" fill={isLight ? "#374151" : "#6B7479"}>78%</text>

              {/* Headlight glow */}
              <ellipse cx="172" cy="218" rx="7" ry="5" fill="#22D3EE" opacity=".7"
                style={{ animation: "glow-pulse 2.5s ease-in-out infinite" }} />

              {/* Wheels */}
              <circle cx="72"  cy="250" r="16" fill={isLight ? "#D1D9E0" : "#1E2830"} />
              <circle cx="72"  cy="250" r="10" fill={isLight ? "#B8C5D0" : "#263038"} />
              <circle cx="72"  cy="250" r="4"  fill={isLight ? "#94A3B8" : "#374151"} />
              <circle cx="148" cy="250" r="16" fill={isLight ? "#D1D9E0" : "#1E2830"} />
              <circle cx="148" cy="250" r="10" fill={isLight ? "#B8C5D0" : "#263038"} />
              <circle cx="148" cy="250" r="4"  fill={isLight ? "#94A3B8" : "#374151"} />

              {/* Floating reward card */}
              <g style={{ animation: "float 4s ease-in-out infinite" }}>
                <rect x="20" y="120" width="88" height="50" rx="8"
                  fill={isLight ? "rgba(255,255,255,.92)" : "rgba(14,20,22,.92)"}
                  stroke={isLight ? "rgba(255,192,67,.3)" : "rgba(255,192,67,.25)"}
                  strokeWidth="1.5" />
                <rect x="20" y="120" width="88" height="50" rx="8" fill="none"
                  style={{ filter: `drop-shadow(0 4px 16px rgba(255,192,67,.2))` }} />
                <text x="30" y="139" fontSize="7.5" fontWeight="700" fontFamily="'Space Grotesk',sans-serif" fill="#FFC043">🏆 REWARDS</text>
                <text x="30" y="154" fontSize="11" fontWeight="800" fontFamily="'JetBrains Mono',monospace" fill={isLight ? "#0D1621" : "#E6EBED"}>+840 pts</text>
                <text x="30" y="163" fontSize="7" fontFamily="sans-serif" fill={isLight ? "#6B7280" : "#6B7479"}>Gold tier · This session</text>
              </g>

              {/* Floating session card */}
              <g style={{ animation: "float 5s ease-in-out 1.5s infinite" }}>
                <rect x="188" y="175" width="96" height="56" rx="8"
                  fill={isLight ? "rgba(255,255,255,.92)" : "rgba(14,20,22,.92)"}
                  stroke={isLight ? "rgba(0,184,94,.25)" : "rgba(0,230,118,.2)"}
                  strokeWidth="1.5" />
                <text x="198" y="194" fontSize="7.5" fontWeight="700" fontFamily="'Space Grotesk',sans-serif" fill={accent}>⚡ CHARGING</text>
                <text x="198" y="208" fontSize="11" fontWeight="800" fontFamily="'JetBrains Mono',monospace" fill={isLight ? "#0D1621" : "#E6EBED"}>100 kW</text>
                <text x="198" y="220" fontSize="7" fontFamily="sans-serif" fill={isLight ? "#6B7280" : "#6B7479"}>22 min remaining</text>
                {/* Mini progress bar */}
                <rect x="198" y="223" width="66" height="3" rx="1.5" fill={isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)"} />
                <rect x="198" y="223" width="51" height="3" rx="1.5" fill={accent} style={{ filter: `drop-shadow(0 0 3px ${accent})` }} />
              </g>

              {/* Ambient energy particles */}
              {[
                { cx: 140, cy: 170, r: 2.5, c: "#00E676", del: "0s" },
                { cx: 200, cy: 155, r: 2, c: "#22D3EE", del: ".7s" },
                { cx: 105, cy: 175, r: 1.8, c: "#FFC043", del: "1.4s" },
                { cx: 165, cy: 140, r: 2.2, c: "#C4B5FD", del: "2.1s" },
              ].map((p, i) => (
                <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.c}
                  style={{ filter: `drop-shadow(0 0 4px ${p.c})`, animation: `particle-float 3s ease-in-out ${p.del} infinite` }} />
              ))}
            </svg>
          </div>
        </div>
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
          ? "radial-gradient(circle, rgba(0,184,94,.035) 0%, rgba(14,165,233,.02) 40%, transparent 65%)"
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
          ? "linear-gradient(180deg, #EDF5F0 0%, #F4FAF7 50%, #EDF5F0 100%)"
          : "#050708",
        borderTop:    `1px solid ${isLight ? "rgba(0,184,94,.15)" : "rgba(0,230,118,.10)"}`,
        borderBottom: `1px solid ${isLight ? "rgba(0,184,94,.15)" : "rgba(0,230,118,.10)"}`,
        overflow: "hidden",
      }}>
        {/* Aurora glows */}
        <div style={{ position: "absolute", top: "20%", left: "20%", transform: "translate(-50%,-50%)", width: 800, height: 500, borderRadius: "50%", background: isLight ? "radial-gradient(ellipse,rgba(0,184,94,.08) 0%,rgba(14,165,233,.04) 50%,transparent 70%)" : "radial-gradient(ellipse,rgba(0,230,118,.07) 0%,transparent 68%)", pointerEvents: "none", animation: "aurora-shift 18s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 500, height: 300, borderRadius: "50%", background: isLight ? "radial-gradient(ellipse,rgba(14,165,233,.06) 0%,transparent 70%)" : "radial-gradient(ellipse,rgba(34,211,238,.05) 0%,transparent 70%)", pointerEvents: "none", animation: "aurora-shift 24s ease-in-out 8s infinite reverse" }} />

        {/* Background grid */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: isLight
            ? "linear-gradient(rgba(0,184,94,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,184,94,.06) 1px, transparent 1px)"
            : "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at 50% 50%, black 40%, transparent 80%)",
        }} />

        <div style={{ textAlign: "center", padding: "80px 60px 40px", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: isLight ? "rgba(0,210,106,.08)" : "rgba(0,230,118,.08)", border: `1px solid ${isLight ? "rgba(0,210,106,.2)" : "rgba(0,230,118,.2)"}`, borderRadius: 999, padding: "5px 16px", marginBottom: 20 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: isLight ? "#00D26A" : "#00E676", display: "inline-block", boxShadow: `0 0 8px ${isLight ? "#00D26A" : "#00E676"}` }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: isLight ? "#00D26A" : "#00E676" }}>LIVE JOURNEY TRACKER</span>
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(30px,4vw,52px)", fontWeight: 700, letterSpacing: "-.03em", marginBottom: 16, color: t.text, lineHeight: 1.06 }}>
            Your route, live —<br />from plan to plug
          </h2>
          <p style={{ color: t.textSub, fontSize: 16, maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
            Watch a real trip unfold in real time. Noida → Patna · 1,010 km · 3 pre-booked charging stops, reserved in a single checkout.
          </p>
        </div>

        <div style={{ position: "relative", width: "100%", height: 480 }}>
          <HeroAnimation isLight={isLight} />
        </div>
        <div style={{ height: 72 }} />
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
