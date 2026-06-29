"use client";
import { useEffect, useRef, useState } from "react";
import { Tok } from "./tokens";

const STEPS = [
  { id: "source",    label: "Set Your Route",    sub: "Enter origin & destination",  color: "#22D3EE", icon: "🗺",  screen: "route",    detail: "AI calculates the optimal charging corridor for your vehicle range" },
  { id: "available", label: "Chargers Found",     sub: "Live availability checked",   color: "#00E676", icon: "⚡",  screen: "chargers", detail: "3 fast-chargers on your route · All available right now" },
  { id: "book",      label: "Slot Reserved",      sub: "15-min guaranteed hold",      color: "#4DFFA6", icon: "📅",  screen: "booking",  detail: "Your slot is locked — no one else can take it" },
  { id: "pay",       label: "Payment Done",       sub: "Single checkout · all stops", color: "#FFC043", icon: "💳",  screen: "payment",  detail: "₹840 for all 3 charging stops · Razorpay PCI-DSS L1" },
  { id: "qr",        label: "QR Pass Ready",      sub: "HMAC-signed · single-use",    color: "#C4B5FD", icon: "📱",  screen: "qr",       detail: "Scan at station gate — zero friction check-in" },
  { id: "charge",    label: "Charging",           sub: "Plug in · earn rewards",      color: "#00E676", icon: "🔌",  screen: "charging", detail: "42 kWh · 2× reward points · Session ends automatically" },
  { id: "done",      label: "Arrive Confident",   sub: "Range anxiety eliminated",    color: "#22D3EE", icon: "🏁",  screen: "done",     detail: "Delhi → Jaipur · 287 km · Arrived with 28% SoC" },
];

/* ─── Shared style helpers ─── */
function screenVars(isLight: boolean) {
  return {
    card:   isLight ? "#FFFFFF" : "#111920",
    border: isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)",
    text:   isLight ? "#0D1621" : "#E6EBED",
    sub:    isLight ? "#6B7280" : "#6B7479",
  };
}

/* ─── Individual screen components (hooks at top level) ─── */

function RouteScreen({ step, isLight }: { step: typeof STEPS[0]; isLight: boolean }) {
  const { card, border, text, sub } = screenVars(isLight);
  return (
    <div style={{ padding: "14px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: step.color, letterSpacing: ".08em" }}>ROUTE PLANNER</div>
      {[{ label: "From", val: "Noida, UP", icon: "📍" }, { label: "To", val: "Jaipur, RJ", icon: "🏁" }].map(f => (
        <div key={f.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>{f.icon}</span>
          <div>
            <div style={{ fontSize: 9, color: sub, fontWeight: 600 }}>{f.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{f.val}</div>
          </div>
        </div>
      ))}
      <div style={{ flex: 1, position: "relative", borderRadius: 10, overflow: "hidden", background: card, border: `1px solid ${border}` }}>
        <svg width="100%" height="100%" viewBox="0 0 180 90" preserveAspectRatio="none">
          <path d="M20 70 Q60 20 100 45 Q140 70 160 25" fill="none" stroke={isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.06)"} strokeWidth="4" strokeLinecap="round" />
          <path d="M20 70 Q60 20 100 45 Q140 70 160 25" fill="none" stroke={step.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="300" style={{ animation: "route-dash-fwd 2.5s linear infinite" }} />
          {[{ x: 60, y: 32 }, { x: 100, y: 45 }, { x: 140, y: 55 }].map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="8" fill={`${step.color}20`} style={{ animation: "ping-green 2s ease-in-out infinite" }} />
              <circle cx={p.x} cy={p.y} r="4" fill={step.color} />
            </g>
          ))}
          <circle cx="20" cy="70" r="5" fill="#22D3EE" style={{ filter: "drop-shadow(0 0 4px #22D3EE)" }} />
          <circle cx="160" cy="25" r="5" fill="#FFC043" style={{ filter: "drop-shadow(0 0 4px #FFC043)" }} />
        </svg>
        <div style={{ position: "absolute", bottom: 8, left: 10, fontSize: 9, color: sub }}>287 km · 3 stops planned</div>
      </div>
      <div style={{ background: "linear-gradient(135deg,#22D3EE,#00E676)", borderRadius: 10, padding: "10px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#020A04" }}>Find Chargers →</div>
    </div>
  );
}

function ChargersScreen({ step, isLight }: { step: typeof STEPS[0]; isLight: boolean }) {
  const { card, border, text, sub } = screenVars(isLight);
  const stations = [
    { name: "FastCharge NH8", dist: "112 km", kw: "150kW", slots: 3 },
    { name: "EV Hub Alwar",   dist: "198 km", kw: "50kW",  slots: 1 },
    { name: "GreenStop 21",   dist: "256 km", kw: "100kW", slots: 5 },
  ];
  return (
    <div style={{ padding: "14px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: step.color, letterSpacing: ".08em" }}>3 CHARGERS FOUND</div>
      {stations.map((s, i) => (
        <div key={s.name} style={{
          background: i === 0 ? `${step.color}10` : card,
          border: `1px solid ${i === 0 ? step.color + "40" : border}`,
          borderRadius: 10, padding: "10px 12px",
          display: "flex", alignItems: "center", gap: 10,
          animation: `fade-up .4s cubic-bezier(.2,0,0,1) ${i * 120}ms both`,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${step.color}15`, border: `1px solid ${step.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>⚡</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
            <div style={{ fontSize: 9, color: sub }}>{s.dist} · {s.kw}</div>
          </div>
          <div style={{ fontSize: 9, color: step.color, fontWeight: 700 }}>{s.slots} free</div>
        </div>
      ))}
      <div style={{ marginTop: "auto", background: "linear-gradient(135deg,#00E676,#00A855)", borderRadius: 10, padding: "10px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#020A04" }}>Book All 3 →</div>
    </div>
  );
}

function BookingScreen({ step, isLight }: { step: typeof STEPS[0]; isLight: boolean }) {
  const { card, border, text, sub } = screenVars(isLight);
  const [countdown, setCountdown] = useState(15 * 60);
  useEffect(() => {
    const id = setInterval(() => setCountdown(c => (c <= 0 ? 15 * 60 : c - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const m = Math.floor(countdown / 60);
  const s = countdown % 60;
  return (
    <div style={{ padding: "14px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: step.color, letterSpacing: ".08em" }}>SLOT HELD</div>
      <div style={{ background: `${step.color}08`, border: `1px solid ${step.color}30`, borderRadius: 12, padding: "12px", textAlign: "center" }}>
        <div style={{ fontSize: 9, color: sub, marginBottom: 4 }}>Hold expires in</div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 26, fontWeight: 800, color: step.color }}>
          {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </div>
        <div style={{ fontSize: 9, color: sub, marginTop: 4 }}>Pay to confirm your slot</div>
      </div>
      {["FastCharge NH8 · 11:30 AM", "EV Hub Alwar · 2:15 PM", "GreenStop 21 · 5:00 PM"].map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: card, border: `1px solid ${border}` }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: step.color, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: text }}>{item}</span>
          <div style={{ marginLeft: "auto", fontSize: 9, color: step.color, fontWeight: 700 }}>HELD</div>
        </div>
      ))}
      <div style={{ marginTop: "auto", background: "linear-gradient(135deg,#4DFFA6,#00D26A)", borderRadius: 10, padding: "10px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#020A04" }}>Proceed to Pay →</div>
    </div>
  );
}

function PaymentScreen({ step, isLight }: { step: typeof STEPS[0]; isLight: boolean }) {
  const { border, text, sub } = screenVars(isLight);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 1400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ padding: "14px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: step.color, letterSpacing: ".08em" }}>CHECKOUT</div>
      <div style={{ background: isLight ? "#FFFFFF" : "#111920", border: `1px solid ${border}`, borderRadius: 12, padding: "12px" }}>
        {[["FastCharge NH8", "₹280"], ["EV Hub Alwar", "₹210"], ["GreenStop 21", "₹350"]].map(([n, p]) => (
          <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${border}` }}>
            <span style={{ fontSize: 10, color: sub }}>{n}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: text }}>{p}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", marginTop: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: text }}>Total</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 800, color: step.color }}>₹840</span>
        </div>
      </div>
      {!done ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${border}`, borderTopColor: step.color, borderRadius: "50%", animation: "spin .6s linear infinite" }} />
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${step.color}15`, border: `2px solid ${step.color}`, display: "flex", alignItems: "center", justifyContent: "center", animation: "pop-in .4s cubic-bezier(.16,1,.3,1)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke={step.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: text }}>Payment Confirmed!</div>
          <div style={{ fontSize: 10, color: sub }}>QR passes being issued…</div>
        </div>
      )}
    </div>
  );
}

function QRScreen({ step, isLight }: { step: typeof STEPS[0]; isLight: boolean }) {
  const { border, text, sub } = screenVars(isLight);
  const cells = Array.from({ length: 64 }, () => Math.random() > 0.45);
  return (
    <div style={{ padding: "14px 12px", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: step.color, letterSpacing: ".08em" }}>YOUR QR PASS</div>
      <div style={{ padding: "12px", background: isLight ? "#FFFFFF" : "#111920", border: `1px solid ${border}`, borderRadius: 14, display: "inline-block" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8,9px)", gap: 1.5 }}>
          {cells.map((on, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: 1.5, background: on ? (isLight ? "#0D1621" : "#E6EBED") : "transparent" }} />
          ))}
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: text }}>FastCharge NH8 · Stop 1</div>
        <div style={{ fontSize: 9, color: sub }}>11:30 AM · Valid for 2h</div>
      </div>
      <div style={{ background: `${step.color}10`, border: `1px solid ${step.color}25`, borderRadius: 8, padding: "7px 12px", fontSize: 9, color: step.color, fontWeight: 700, textAlign: "center" }}>
        🔒 HMAC-signed · Single-use
      </div>
      <div style={{ fontSize: 9, color: sub, textAlign: "center", lineHeight: 1.6 }}>
        Scan at the station gate.<br />Replay attacks prevented.
      </div>
    </div>
  );
}

function ChargingScreen({ step, isLight }: { step: typeof STEPS[0]; isLight: boolean }) {
  const { border, text, sub } = screenVars(isLight);
  const [pct, setPct] = useState(24);
  useEffect(() => {
    const id = setInterval(() => setPct(p => p >= 78 ? 78 : p + 0.7), 80);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ padding: "14px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: step.color, letterSpacing: ".08em" }}>CHARGING · SESSION LIVE</div>
      <div style={{ background: isLight ? "#FFFFFF" : "#111920", border: `1px solid ${border}`, borderRadius: 14, padding: "14px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "baseline" }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 800, color: step.color }}>{pct.toFixed(0)}%</span>
          <span style={{ fontSize: 10, color: sub }}>→ 80% target</span>
        </div>
        <div style={{ height: 10, borderRadius: 99, background: isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, #22D3EE, ${step.color})`, borderRadius: 99, transition: "width .08s linear", boxShadow: `0 0 8px ${step.color}60` }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          {[{ l: "Power", v: "100kW" }, { l: "Time left", v: "22 min" }, { l: "Added", v: `${((pct - 24) * 0.6).toFixed(1)} kWh` }, { l: "Cost", v: `₹${((pct - 24) * 0.6 * 18).toFixed(0)}` }].map(m => (
            <div key={m.l}>
              <div style={{ fontSize: 9, color: sub }}>{m.l}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: text }}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "rgba(255,192,67,.08)", border: "1px solid rgba(255,192,67,.2)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <span>🏆</span>
        <span style={{ fontSize: 10, color: "#FFC043", fontWeight: 600 }}>Earning 2× reward points</span>
      </div>
    </div>
  );
}

function DoneScreen({ step, isLight }: { step: typeof STEPS[0]; isLight: boolean }) {
  const { card, border, sub } = screenVars(isLight);
  const textColor = isLight ? "#0D1621" : "#E6EBED";
  return (
    <div style={{ padding: "14px 12px", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <div style={{ fontSize: 36 }}>🏁</div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 800, color: textColor, textAlign: "center", lineHeight: 1.2 }}>
        You arrived.<br />
        <span style={{ color: step.color }}>Anxiety-free.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
        {[{ l: "Distance", v: "287 km" }, { l: "Stops", v: "3" }, { l: "Arrived SoC", v: "28%" }, { l: "Points", v: "+840" }].map(m => (
          <div key={m.l} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: "10px", textAlign: "center" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 800, color: step.color }}>{m.v}</div>
            <div style={{ fontSize: 9, color: sub, marginTop: 2 }}>{m.l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: sub, textAlign: "center", lineHeight: 1.6 }}>
        Delhi → Jaipur · No range anxiety.<br />Just drive.
      </div>
    </div>
  );
}

/* ─── Phone wrapper ─── */
function PhoneScreen({ step, isLight }: { step: typeof STEPS[0]; isLight: boolean }) {
  if (step.screen === "route")    return <RouteScreen    step={step} isLight={isLight} />;
  if (step.screen === "chargers") return <ChargersScreen step={step} isLight={isLight} />;
  if (step.screen === "booking")  return <BookingScreen  step={step} isLight={isLight} />;
  if (step.screen === "payment")  return <PaymentScreen  step={step} isLight={isLight} />;
  if (step.screen === "qr")       return <QRScreen       step={step} isLight={isLight} />;
  if (step.screen === "charging") return <ChargingScreen step={step} isLight={isLight} />;
  return <DoneScreen step={step} isLight={isLight} />;
}

/* ─── Main section ─── */
export default function HowItWorks({ isLight, t }: { isLight: boolean; t: Tok }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          section.classList.add("visible");
          setVisible(true);
        }
      },
      { threshold: 0.1 },
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    intervalRef.current = setInterval(() => {
      setActiveStep(s => (s + 1) % STEPS.length);
    }, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible]);

  function handleStepClick(i: number) {
    setActiveStep(i);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setActiveStep(s => (s + 1) % STEPS.length), 3000);
  }

  const step = STEPS[activeStep];

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="section-fade"
      style={{
        padding: "100px 60px 120px",
        background: isLight
          ? "linear-gradient(180deg, #F0F5F8 0%, #F6F8FA 50%, #EDF4F9 100%)"
          : "#050708",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Cyan aurora — distinct from green in other sections */}
      <div style={{
        position: "absolute", top: "-5%", right: "-5%",
        width: 600, height: 600, borderRadius: "50%", pointerEvents: "none",
        background: isLight
          ? "radial-gradient(ellipse, rgba(14,165,233,.08) 0%, transparent 60%)"
          : "radial-gradient(ellipse, rgba(34,211,238,.08) 0%, transparent 60%)",
        animation: "aurora-shift 20s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "10%", left: "-5%",
        width: 500, height: 500, borderRadius: "50%", pointerEvents: "none",
        background: isLight
          ? "radial-gradient(ellipse, rgba(124,58,237,.05) 0%, transparent 65%)"
          : "radial-gradient(ellipse, rgba(139,92,246,.05) 0%, transparent 65%)",
        animation: "aurora-shift 26s ease-in-out 8s infinite reverse",
      }} />
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: isLight
          ? "radial-gradient(rgba(0,0,0,.12) 1px, transparent 1px)"
          : "radial-gradient(rgba(255,255,255,.06) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        maskImage: "radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)",
      }} />

      <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
            background: "rgba(34,211,238,.08)",
            border: "1px solid rgba(34,211,238,.22)",
            borderRadius: 999, padding: "5px 16px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22D3EE", display: "inline-block", boxShadow: "0 0 8px #22D3EE" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: "#22D3EE" }}>HOW IT WORKS</span>
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "clamp(28px,4vw,50px)", fontWeight: 800, letterSpacing: "-.04em",
            color: t.text, marginBottom: 16, lineHeight: 1.06,
          }}>A booking in motion.</h2>
          <p style={{ color: t.textSub, fontSize: 16, maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
            Watch a real Delhi → Jaipur trip unfold — from empty battery to destination, every step automated.
          </p>
        </div>

        {/* Main 2-column */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 60, alignItems: "center" }}>

          {/* Left: step list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {STEPS.map((s, i) => {
              const isActive = i === activeStep;
              const isPast   = i < activeStep;
              return (
                <button
                  key={s.id}
                  onClick={() => handleStepClick(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: isActive ? "16px 20px" : "11px 20px",
                    borderRadius: 16, cursor: "pointer", textAlign: "left",
                    background: isActive
                      ? isLight ? `${s.color}0E` : `${s.color}0A`
                      : "transparent",
                    border: `1.5px solid ${isActive ? s.color + "35" : "transparent"}`,
                    transition: "all .3s cubic-bezier(.2,0,0,1)",
                    position: "relative",
                    fontFamily: "inherit",
                  }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                    background: isActive
                      ? `${s.color}18`
                      : isPast
                        ? "rgba(0,230,118,.1)"
                        : (isLight ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.04)"),
                    border: `1.5px solid ${isActive ? s.color + "50" : isPast ? "#00E67630" : (isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.07)")}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: isPast ? 14 : 18,
                    boxShadow: isActive ? `0 0 20px ${s.color}30` : "none",
                    transition: "all .3s",
                  }}>
                    {isPast
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      : s.icon
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                      color: isActive ? s.color : isPast ? (isLight ? "#9CA3AF" : "#4B5563") : t.textSub,
                      marginBottom: isActive ? 4 : 0, transition: "color .3s",
                    }}>{s.label}</div>
                    {isActive && (
                      <div style={{ fontSize: 11.5, color: t.textMuted, lineHeight: 1.5, animation: "fade-up .3s ease both" }}>{s.detail}</div>
                    )}
                  </div>
                  {/* Progress bar at bottom when active */}
                  {isActive && (
                    <div style={{ position: "absolute", bottom: 0, left: 20, right: 20, height: 2, borderRadius: 2, background: isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)", overflow: "hidden" }}>
                      <div key={activeStep} style={{ height: "100%", background: s.color, borderRadius: 2, animation: "progress-fill 3s linear forwards" }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: phone */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              width: 280, height: 380, borderRadius: "50%", pointerEvents: "none",
              background: `radial-gradient(ellipse, ${step.color}20 0%, transparent 65%)`,
              transition: "background .5s",
              animation: "float-slow 6s ease-in-out infinite",
            }} />

            {/* Phone frame */}
            <div style={{
              position: "relative",
              width: 220, height: 440,
              background: isLight ? "#1A1A2E" : "#0A0D0E",
              borderRadius: 34,
              border: isLight ? "7px solid #2D2D3F" : "7px solid #1A1D1F",
              boxShadow: isLight
                ? `0 28px 70px rgba(0,0,0,.22), 0 0 0 1px rgba(255,255,255,.06) inset, 0 0 50px ${step.color}20`
                : `0 28px 70px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.04) inset, 0 0 70px ${step.color}22`,
              overflow: "hidden",
              transition: "box-shadow .5s",
            }}>
              {/* Notch */}
              <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 68, height: 16, background: isLight ? "#2D2D3F" : "#1A1D1F", borderRadius: 99, zIndex: 10 }} />

              {/* Screen */}
              <div style={{ position: "absolute", inset: 0, background: isLight ? "#F6F8FA" : "#0C1115", borderRadius: 27, paddingTop: 30, overflow: "hidden" }}>
                {/* Status bar */}
                <div style={{ padding: "4px 14px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: isLight ? "#374151" : "#6B7479" }}>9:41</span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {[3, 4, 5].map(w => <div key={w} style={{ width: 2.5, height: w, borderRadius: 1, background: isLight ? "#374151" : "#6B7479" }} />)}
                    <div style={{ width: 12, height: 7, borderRadius: 2, border: `1px solid ${isLight ? "#374151" : "#6B7479"}`, padding: "1px", marginLeft: 2, display: "flex" }}>
                      <div style={{ width: "70%", height: "100%", background: "#00E676", borderRadius: 1 }} />
                    </div>
                  </div>
                </div>

                {/* App header */}
                <div style={{ padding: "4px 12px 8px", display: "flex", alignItems: "center", gap: 7, borderBottom: `1px solid ${isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.06)"}` }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: "linear-gradient(135deg,#00E676,#22D3EE)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 9 }}>⚡</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: isLight ? "#0D1621" : "#E6EBED", letterSpacing: "-.02em" }}>ChargingGuru</span>
                  <span style={{ marginLeft: "auto", fontSize: 8, color: "#00E676", fontWeight: 700 }}>●</span>
                </div>

                {/* Dynamic content */}
                <div key={activeStep} style={{ height: "calc(100% - 64px)", animation: "fade-up .3s cubic-bezier(.2,0,0,1)" }}>
                  <PhoneScreen step={step} isLight={isLight} />
                </div>
              </div>
            </div>

            {/* Step label below phone */}
            <div style={{
              position: "absolute", bottom: -44, left: "50%", transform: "translateX(-50%)",
              background: isLight ? "rgba(255,255,255,.9)" : "rgba(14,20,22,.9)",
              border: `1px solid ${step.color}30`,
              borderRadius: 999, padding: "5px 14px",
              backdropFilter: "blur(8px)",
              textAlign: "center", whiteSpace: "nowrap",
              transition: "border-color .3s",
            }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: step.color }}>Step {activeStep + 1}/{STEPS.length}</span>
              <span style={{ fontSize: 10.5, color: t.textMuted, marginLeft: 5 }}>· {step.label}</span>
            </div>
          </div>
        </div>

        {/* Bottom metrics */}
        <div style={{ marginTop: 88, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {[
            { icon: "⚡", stat: "< 10s", label: "QR check-in time",  color: "#22D3EE" },
            { icon: "🛡", stat: "100%",  label: "Slot guarantee",     color: "#00E676" },
            { icon: "🏆", stat: "2× pts", label: "Points per kWh",   color: "#FFC043" },
          ].map(item => (
            <div key={item.label} style={{
              background: isLight ? "#FFFFFF" : "rgba(255,255,255,.03)",
              border: `1px solid ${isLight ? "rgba(0,0,0,.08)" : item.color + "18"}`,
              borderRadius: 18, padding: "22px 24px",
              display: "flex", alignItems: "center", gap: 14,
              backdropFilter: "blur(8px)",
              boxShadow: isLight ? "0 2px 20px rgba(0,0,0,.07)" : "none",
              transition: "transform .2s, box-shadow .2s",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = isLight
                  ? `0 8px 32px rgba(0,0,0,.1), 0 0 0 1.5px ${item.color}25`
                  : `0 0 24px ${item.color}18, 0 0 0 1px ${item.color}30`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "none";
                (e.currentTarget as HTMLDivElement).style.boxShadow = isLight ? "0 2px 20px rgba(0,0,0,.07)" : "none";
              }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: `${item.color}12`, border: `1px solid ${item.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{item.icon}</div>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.stat}</div>
                <div style={{ fontSize: 12, color: t.textSub, marginTop: 4 }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes route-dash-fwd { to { stroke-dashoffset: -300; } }
        @keyframes progress-fill { from { width: 0% } to { width: 100% } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
