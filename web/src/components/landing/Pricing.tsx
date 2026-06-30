"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Tok } from "./tokens";

const PLANS = [
  {
    name: "FREE", price: 0, period: "forever", highlight: false, color: "#6B7479",
    desc: "Perfect for occasional EV trips",
    features: [
      { text: "Discover 5,200+ stations",   included: true  },
      { text: "Up to 3 bookings/month",      included: true  },
      { text: "10-min slot hold",            included: true  },
      { text: "Basic trip history",          included: true  },
      { text: "Priority booking lanes",      included: false },
      { text: "Cashback rewards",            included: false },
    ],
    cta: "Start free",
  },
  {
    name: "SILVER", price: 149, period: "/ month", highlight: false, color: "#94A3B8",
    desc: "For regular EV commuters",
    features: [
      { text: "Unlimited bookings",          included: true  },
      { text: "15-min guaranteed hold",      included: true  },
      { text: "Priority support",            included: true  },
      { text: "5% cashback via rewards",     included: true  },
      { text: "Cancel protection",           included: true  },
      { text: "Dedicated account manager",   included: false },
    ],
    cta: "Go Silver",
  },
  {
    name: "GOLD", price: 399, period: "/ month", highlight: true, color: "#FFC043",
    desc: "The ultimate EV experience",
    features: [
      { text: "Everything in Silver",        included: true  },
      { text: "Priority lanes at peak hours",included: true  },
      { text: "SoC arrival predictions",     included: true  },
      { text: "10% cashback",                included: true  },
      { text: "Dedicated account manager",   included: true  },
      { text: "Early access to new stations",included: true  },
    ],
    cta: "Go Gold",
  },
];

const TRUST_STRIP = [
  { icon: "⚡", label: "Instant booking confirmation" },
  { icon: "🔒", label: "PCI-DSS L1 payments" },
  { icon: "🔄", label: "Free cancellation" },
  { icon: "🏆", label: "Earn reward points" },
  { icon: "📍", label: "5,200+ charging stations" },
  { icon: "⏱️", label: "15-min guaranteed hold" },
];


export default function Pricing({ isLight, t }: { isLight: boolean; t: Tok }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [yearly, setYearly] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) section.classList.add("visible"); },
      { threshold: 0.1 },
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
        padding: "100px 60px 80px",
        background: isLight
          ? "linear-gradient(180deg, #F6F8FA 0%, #EFF4F8 50%, #F6F8FA 100%)"
          : t.bg,
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Spotlight from center-bottom */}
      <div style={{
        position: "absolute", bottom: "-5%", left: "50%", transform: "translateX(-50%)",
        width: 800, height: 500, borderRadius: "50%", pointerEvents: "none",
        background: isLight
          ? "radial-gradient(ellipse, rgba(255,192,67,.08) 0%, rgba(0,184,94,.04) 40%, transparent 70%)"
          : "radial-gradient(ellipse, rgba(255,192,67,.07) 0%, rgba(0,230,118,.03) 40%, transparent 70%)",
      }} />
      {/* Diagonal grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: isLight
          ? "linear-gradient(rgba(0,0,0,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.04) 1px, transparent 1px)"
          : "linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse at 50% 100%, black 40%, transparent 75%)",
      }} />

      <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
            background: "rgba(255,192,67,.08)",
            border: "1px solid rgba(255,192,67,.28)",
            borderRadius: 999, padding: "5px 16px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFC043", display: "inline-block", boxShadow: "0 0 8px #FFC043" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: "#FFC043" }}>MEMBERSHIP</span>
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "clamp(28px,4vw,48px)", fontWeight: 700, letterSpacing: "-.03em",
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
                <button key={opt}
                  onClick={() => setYearly(opt === "Yearly")}
                  style={{
                    padding: "7px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                    background: active ? (isLight ? "#fff" : "#1A2124") : "transparent",
                    color: active ? (isLight ? "#0F172A" : "#E6EBED") : t.textSub,
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    boxShadow: active ? (isLight ? "0 1px 4px rgba(0,0,0,.1)" : "none") : "none",
                    transition: "all .2s",
                  }}>
                  {opt}
                  {opt === "Yearly" && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: "#00E676", background: "rgba(0,230,118,.12)", padding: "1px 6px", borderRadius: 999 }}>-20%</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Trust strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
          gap: 0, marginBottom: 32,
          background: isLight ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.025)",
          border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.06)"}`,
          borderRadius: 16, overflow: "hidden",
          backdropFilter: "blur(8px)",
        }}>
          {TRUST_STRIP.map((item, i) => (
            <div key={item.label} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "14px 8px",
              borderRight: i < TRUST_STRIP.length - 1 ? `1px solid ${isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.05)"}` : "none",
            }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: t.textMuted, textAlign: "center", lineHeight: 1.3 }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {PLANS.map((plan, i) => {
            const price = plan.price === 0 ? 0 : yearly ? Math.round(plan.price * 0.8) : plan.price;
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
                    : isLight ? "rgba(255,255,255,.8)" : "#1C2430",
                  border: `1.5px solid ${plan.highlight
                    ? (isLight ? "rgba(255,192,67,.4)" : "rgba(255,192,67,.3)")
                    : hovered ? plan.color + "30" : (isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.05)")}`,
                  borderRadius: 22, padding: "32px 28px",
                  transition: "transform .25s cubic-bezier(.2,0,0,1), box-shadow .25s, border-color .25s",
                  transform: plan.highlight ? (hovered ? "translateY(-6px) scale(1.02)" : "scale(1.02)") : (hovered ? "translateY(-4px)" : "none"),
                  boxShadow: plan.highlight
                    ? isLight
                      ? "0 0 0 1px rgba(255,192,67,.2), 0 12px 40px rgba(255,192,67,.12), 0 0 80px rgba(255,192,67,.06)"
                      : "0 0 0 1px rgba(255,192,67,.2), 0 0 60px rgba(255,192,67,.12)"
                    : hovered
                      ? isLight ? "0 8px 32px rgba(0,0,0,.08)" : "0 0 0 1px rgba(255,255,255,.07)"
                      : "none",
                  animation: `fade-up .6s cubic-bezier(.2,0,0,1) ${i * 100}ms both`,
                }}>

                {plan.highlight && (
                  <div style={{
                    position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg,#FFC043,#F59E0B)",
                    color: "#050708", borderRadius: 999,
                    fontSize: 9, fontWeight: 800, padding: "4px 16px", letterSpacing: ".1em",
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 12px rgba(255,192,67,.3)",
                  }}>⭐ MOST POPULAR</div>
                )}

                {/* Plan name */}
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: plan.color, letterSpacing: ".15em", marginBottom: 10 }}>{plan.name}</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 16 }}>{plan.desc}</div>

                {/* Price */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 42, fontWeight: 800, color: plan.highlight ? plan.color : t.text, lineHeight: 1, letterSpacing: "-.03em" }}>
                    {price === 0 ? "Free" : `₹${price}`}
                  </span>
                  {price > 0 && <span style={{ fontSize: 13, color: t.textMuted }}>{plan.period}</span>}
                  {yearly && price > 0 && (
                    <span style={{ fontSize: 11, color: "#00E676", background: "rgba(0,230,118,.1)", padding: "2px 6px", borderRadius: 6, marginLeft: 4 }}>-20%</span>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: plan.highlight ? "rgba(255,192,67,.15)" : (isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.06)"), marginBottom: 20 }} />

                {/* Features */}
                <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 28 }}>
                  {plan.features.map(f => (
                    <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                        background: f.included ? `${plan.color}15` : (isLight ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.04)"),
                        border: `1px solid ${f.included ? plan.color + "35" : (isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.06)")}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {f.included
                          ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke={plan.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          : <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke={isLight ? "#CBD5E1" : "#374151"} strokeWidth="2" strokeLinecap="round" /></svg>
                        }
                      </div>
                      <span style={{ fontSize: 13.5, color: f.included ? t.textSub : t.textMuted, lineHeight: 1.4 }}>{f.text}</span>
                    </div>
                  ))}
                </div>

                <Link href="/login" style={{
                  display: "block", textAlign: "center", padding: "14px", borderRadius: 13,
                  fontSize: 14, fontWeight: 700, textDecoration: "none",
                  background: plan.highlight
                    ? "linear-gradient(135deg,#FFC043,#F59E0B)"
                    : hovered
                      ? (isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.06)")
                      : "transparent",
                  color: plan.highlight ? "#050708" : t.text,
                  border: plan.highlight ? "none" : `1px solid ${isLight ? "rgba(0,0,0,.1)" : "rgba(255,255,255,.1)"}`,
                  boxShadow: plan.highlight ? "0 4px 16px rgba(255,192,67,.25)" : "none",
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
