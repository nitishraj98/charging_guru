"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Tok } from "./tokens";

/* ── Premium SVG icons ── */
const Ic = {
  check: (color: string) => (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
      <path d="M5 12l5 5L20 7" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  cross: (color: string) => (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  star: (color: string) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  circle: (color: string) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="9"/>
    </svg>
  ),
  diamond: (color: string) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M12 2l10 10-10 10L2 12 12 2z"/>
    </svg>
  ),
  // trust strip icons
  bolt: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  lock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  rotateCcw: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v6h6"/><path d="M3 8A9 9 0 1 0 5.6 5.6"/>
    </svg>
  ),
  trophy: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4"/><path d="M7 4H4v5a8 8 0 0 0 8 8 8 8 0 0 0 8-8V4h-3"/>
      <path d="M4 9H2M22 9h-2"/>
    </svg>
  ),
  mapPin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  ),
};

const PLANS = [
  {
    name: "FREE", price: 0, period: "forever", highlight: false, color: "#6B7479",
    tierIcon: (c: string) => Ic.circle(c),
    desc: "Perfect for occasional EV trips",
    features: [
      { text: "Discover 5,200+ stations",  included: true  },
      { text: "Up to 3 bookings/month",     included: true  },
      { text: "Earn 1× reward points",      included: true  },
      { text: "Standard pricing",           included: true  },
      { text: "Email support",              included: true  },
      { text: "Peak-hour slot access",      included: false },
    ],
    cta: "Start free",
  },
  {
    name: "SILVER", price: 199, period: "/ month", highlight: false, color: "#64748B",
    tierIcon: (c: string) => Ic.diamond(c),
    desc: "For regular EV commuters",
    features: [
      { text: "Unlimited bookings",         included: true  },
      { text: "Earn 1.5× reward points",    included: true  },
      { text: "5% discount on all bookings",included: true  },
      { text: "Priority support",           included: true  },
      { text: "Access peak-hour slots",     included: true  },
      { text: "Dedicated account manager",  included: false },
    ],
    cta: "Go Silver",
  },
  {
    name: "GOLD", price: 499, period: "/ month", highlight: true, color: "#FFC043",
    tierIcon: (c: string) => Ic.star(c),
    desc: "The ultimate EV experience",
    features: [
      { text: "Earn 2× reward points",      included: true  },
      { text: "10% discount on all bookings",included: true },
      { text: "Dedicated support line",     included: true  },
      { text: "Guaranteed slot booking",    included: true  },
      { text: "Free cancellation anytime",  included: true  },
      { text: "Invoice auto-email",         included: true  },
    ],
    cta: "Go Gold",
  },
];

const TRUST_STRIP = [
  { icon: Ic.bolt,      label: "Instant confirmation" },
  { icon: Ic.lock,      label: "PCI-DSS L1 payments"  },
  { icon: Ic.rotateCcw, label: "Free cancellation"    },
  { icon: Ic.trophy,    label: "Earn reward points"   },
  { icon: Ic.mapPin,    label: "5,200+ stations"      },
  { icon: Ic.clock,     label: "15-min guaranteed hold"},
];

export default function Pricing({ isLight, t }: { isLight: boolean; t: Tok }) {
  const sectionRef  = useRef<HTMLDivElement>(null);
  const [yearly, setYearly]           = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [visible, setVisible]         = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { section.classList.add("visible"); setVisible(true); } },
      { threshold: 0.08 },
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="section-fade"
      style={{
        padding: "clamp(48px,8vw,100px) clamp(16px,5vw,60px) clamp(40px,7vw,80px)",
        background: isLight
          ? "linear-gradient(180deg,#F8F6F1 0%,#FBFAF7 50%,#F8F6F1 100%)"
          : "linear-gradient(160deg,#080E0A 0%,#091208 35%,#080E0A 65%,#060A07 100%)",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* ── Dark mode decorative background ── */}
      {!isLight && (<>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:.18 }} aria-hidden="true">
          <defs>
            <pattern id="pricing-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(0,230,118,0.35)" strokeWidth=".6"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pricing-grid)"/>
        </svg>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:.12 }} aria-hidden="true">
          <defs>
            <pattern id="pricing-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(0,230,118,0.6)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pricing-dots)"/>
        </svg>
        <div style={{ position:"absolute", bottom:"-10%", left:"50%", transform:"translateX(-50%)", width:900, height:600, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(0,230,118,.13) 0%,rgba(255,192,67,.05) 40%,transparent 70%)" }}/>
        <div style={{ position:"absolute", top:"-5%", left:"-4%", width:550, height:550, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(0,230,118,.10) 0%,transparent 62%)" }}/>
        <div style={{ position:"absolute", top:"5%", right:"-4%", width:480, height:480, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(34,211,238,.08) 0%,transparent 62%)" }}/>
        <div style={{ position:"absolute", bottom:"0%", left:"10%", width:380, height:380, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(139,92,246,.07) 0%,transparent 62%)" }}/>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:1, pointerEvents:"none", background:"linear-gradient(90deg,transparent 0%,rgba(0,230,118,.38) 30%,rgba(34,211,238,.25) 70%,transparent 100%)" }}/>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, pointerEvents:"none", background:"linear-gradient(90deg,transparent 0%,rgba(0,230,118,.20) 50%,transparent 100%)" }}/>
      </>)}
      {isLight && (
        <div style={{ position:"absolute", bottom:"-5%", left:"50%", transform:"translateX(-50%)", width:800, height:500, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(248,246,241,.52) 0%,rgba(248,246,241,.40) 40%,transparent 70%)" }}/>
      )}

      <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{
          textAlign: "center", marginBottom: 36,
          opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)",
          transition: "opacity .6s, transform .6s",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
            background: isLight ? "rgba(248,246,241,.52)" : "rgba(255,192,67,.08)", border: "1px solid rgba(255,192,67,.28)",
            borderRadius: 999, padding: "5px 16px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFC043", display: "inline-block", boxShadow: "0 0 8px #FFC043", animation: "glow-pulse 2s ease-in-out infinite" }}/>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: "#FFC043" }}>MEMBERSHIP</span>
          </div>

          <h2 style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "clamp(28px,4vw,48px)", fontWeight: 800, letterSpacing: "-.03em",
            color: t.text, marginBottom: 16, lineHeight: 1.1,
          }}>Simple, transparent pricing</h2>
          <p style={{ color: t.textSub, fontSize: 16, maxWidth: 460, margin: "0 auto 28px", lineHeight: 1.7 }}>
            Start free. Upgrade when you need priority access, higher cashback, or more peace of mind.
          </p>

          {/* Monthly/Yearly toggle */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            background: isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.05)",
            border: `1px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)"}`,
            borderRadius: 999, padding: "4px",
          }}>
            {["Monthly", "Yearly"].map(opt => {
              const active = (opt === "Yearly") === yearly;
              return (
                <button key={opt} onClick={() => setYearly(opt === "Yearly")} style={{
                  padding: "7px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: active ? (isLight ? "#fff" : "#1A2124") : "transparent",
                  color: active ? (isLight ? "#0F172A" : "#E6EBED") : t.textSub,
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                  boxShadow: active ? (isLight ? "0 1px 4px rgba(0,0,0,.1)" : "none") : "none",
                  transition: "all .2s",
                }}>
                  {opt}
                  {opt === "Yearly" && (
                    <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: "#00E676", background: "rgba(0,230,118,.12)", padding: "1px 6px", borderRadius: 999 }}>-20%</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Trust strip ── */}
        <div className="trust-strip" style={{
          display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 0, marginBottom: 32,
          background: isLight ? "rgba(255,255,255,.65)" : "rgba(255,255,255,.03)",
          border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)"}`,
          borderRadius: 16, overflow: "hidden", backdropFilter: "blur(8px)",
          opacity: visible ? 1 : 0, transition: "opacity .6s .1s",
        }}>
          {TRUST_STRIP.map((item, i) => (
            <div key={item.label} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              padding: "16px 8px",
              borderRight: `1px solid ${isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.06)"}`,
              color: isLight ? "#6B7280" : "#6B7479",
            }}>
              {item.icon}
              <span style={{ fontSize: 10.5, fontWeight: 600, color: t.textMuted, textAlign: "center", lineHeight: 1.3 }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* ── Plans ── */}
        <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
          {PLANS.map((plan, i) => {
            const price   = plan.price === 0 ? 0 : yearly ? Math.round(plan.price * 0.8) : plan.price;
            const hovered = hoveredPlan === plan.name;
            return (
              <div
                key={plan.name}
                onMouseEnter={() => setHoveredPlan(plan.name)}
                onMouseLeave={() => setHoveredPlan(null)}
                style={{
                  position: "relative",
                  background: plan.highlight
                    ? isLight ? "linear-gradient(160deg,#FFFBEB,#FFFFFF)" : "linear-gradient(160deg,#201800,#1C2026)"
                    : isLight ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.03)",
                  border: `1.5px solid ${plan.highlight
                    ? (isLight ? "rgba(255,192,67,.45)" : "rgba(255,192,67,.32)")
                    : hovered ? plan.color + "35" : (isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)")}`,
                  borderRadius: 22, padding: "32px 28px",
                  backdropFilter: "blur(10px)",
                  transition: "transform .25s cubic-bezier(.2,0,0,1), box-shadow .25s, border-color .25s",
                  transform: plan.highlight
                    ? (hovered ? "translateY(-6px) scale(1.02)" : "scale(1.02)")
                    : (hovered ? "translateY(-4px)" : "none"),
                  boxShadow: plan.highlight
                    ? isLight
                      ? "0 0 0 1px rgba(255,192,67,.2), 0 12px 40px rgba(255,192,67,.14)"
                      : "0 0 0 1px rgba(255,192,67,.22), 0 0 60px rgba(255,192,67,.13)"
                    : hovered
                      ? isLight ? "0 8px 32px rgba(0,0,0,.08)" : "0 0 0 1px rgba(255,255,255,.08)"
                      : "none",
                  opacity: visible ? 1 : 0,
                  animation: `fade-up .6s cubic-bezier(.2,0,0,1) ${i * 100}ms both`,
                }}
              >
                {/* Most popular badge */}
                {plan.highlight && (
                  <div style={{
                    position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg,#FFC043,#F59E0B)",
                    color: "#050708", borderRadius: 999,
                    fontSize: 9, fontWeight: 800, padding: "4px 16px", letterSpacing: ".1em",
                    whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(255,192,67,.35)",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    {Ic.star("#050708")} MOST POPULAR
                  </div>
                )}

                {/* Plan header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: `${plan.color}18`,
                    border: `1px solid ${plan.color}38`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: plan.color,
                  }}>
                    {plan.tierIcon(plan.color)}
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: plan.color, letterSpacing: ".15em" }}>{plan.name}</span>
                </div>

                <div style={{ fontSize: 12.5, color: t.textMuted, marginBottom: 20 }}>{plan.desc}</div>

                {/* Price */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
                  <span style={{
                    fontFamily: "'Space Grotesk',sans-serif",
                    fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: "-.03em",
                    color: plan.highlight ? plan.color : t.text,
                  }}>
                    {price === 0 ? "Free" : `₹${price}`}
                  </span>
                  {price > 0 && <span style={{ fontSize: 13, color: t.textMuted }}>{plan.period}</span>}
                  {yearly && price > 0 && (
                    <span style={{ fontSize: 11, color: "#00E676", background: "rgba(0,230,118,.10)", padding: "2px 7px", borderRadius: 6, marginLeft: 4 }}>-20%</span>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: plan.highlight ? "rgba(255,192,67,.15)" : (isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.06)"), marginBottom: 20 }}/>

                {/* Features */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                  {plan.features.map(f => (
                    <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 7, flexShrink: 0,
                        background: f.included ? `${plan.color}15` : (isLight ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.04)"),
                        border: `1px solid ${f.included ? plan.color + "38" : (isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.06)")}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {f.included ? Ic.check(plan.color) : Ic.cross(isLight ? "#94A3B8" : "#374151")}
                      </div>
                      <span style={{ fontSize: 13.5, color: f.included ? t.textSub : t.textMuted, lineHeight: 1.4 }}>{f.text}</span>
                    </div>
                  ))}
                </div>

                <Link href="/membership" style={{
                  display: "block", textAlign: "center", padding: "14px", borderRadius: 13,
                  fontSize: 14, fontWeight: 700, textDecoration: "none",
                  background: plan.highlight
                    ? "linear-gradient(135deg,#FFC043,#F59E0B)"
                    : hovered
                      ? (isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.07)")
                      : "transparent",
                  color: plan.highlight ? "#050708" : t.text,
                  border: plan.highlight ? "none" : `1px solid ${isLight ? "rgba(0,0,0,.10)" : "rgba(255,255,255,.10)"}`,
                  boxShadow: plan.highlight ? "0 4px 18px rgba(255,192,67,.28)" : "none",
                  transition: "all .2s",
                }}>{plan.cta} →</Link>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
