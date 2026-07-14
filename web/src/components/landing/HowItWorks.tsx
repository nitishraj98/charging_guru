"use client";
import { useEffect, useRef, useState } from "react";
import { Tok } from "./tokens";

/* ── SVG icon set ── */
const Ic = {
  map: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  ),
  zap: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  creditCard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="3"/><path d="M1 10h22"/>
    </svg>
  ),
  qr: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M14 21h.01M21 14h.01M21 18h.01M21 21h.01"/>
    </svg>
  ),
  plug: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5"/><path d="M9 8V2M15 8V2"/>
      <path d="M6 13a6 6 0 0 0 12 0V8H6v5z"/>
    </svg>
  ),
  checkCircle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/>
    </svg>
  ),
  check: (c = "currentColor") => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M5 12l5 5L20 7" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  zapSm: (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  trophy: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M17 5H7v6a5 5 0 0 0 10 0V5z"/>
      <path d="M17 5h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4M7 5H5a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4"/>
    </svg>
  ),
  flag: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  ),
  mapPin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  lock: (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
};

const STEP_ICONS = [Ic.map, Ic.zap, Ic.calendar, Ic.creditCard, Ic.qr, Ic.plug, Ic.checkCircle];

const STEPS = [
  { id: "source",    label: "Set Your Route",    sub: "Enter origin & destination",  color: "#22D3EE", screen: "route",    detail: "AI calculates the optimal charging corridor for your vehicle range" },
  { id: "available", label: "Chargers Found",     sub: "Live availability checked",   color: "#00E676", screen: "chargers", detail: "3 fast-chargers on your route · All available right now" },
  { id: "book",      label: "Slot Reserved",      sub: "15-min guaranteed hold",      color: "#4DFFA6", screen: "booking",  detail: "Your slot is locked — no one else can take it" },
  { id: "pay",       label: "Payment Done",       sub: "Single checkout · all stops", color: "#FFC043", screen: "payment",  detail: "₹840 for all 3 charging stops · Razorpay PCI-DSS L1" },
  { id: "qr",        label: "QR Pass Ready",      sub: "HMAC-signed · single-use",    color: "#C4B5FD", screen: "qr",       detail: "Scan at station gate — zero friction check-in" },
  { id: "charge",    label: "Charging",           sub: "Plug in · earn rewards",      color: "#00E676", screen: "charging", detail: "42 kWh · 2× reward points · Session ends automatically" },
  { id: "done",      label: "Arrive Confident",   sub: "Range anxiety eliminated",    color: "#22D3EE", screen: "done",     detail: "Delhi → Jaipur · 287 km · Arrived with 28% SoC" },
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

/* ─── Individual screen components ─── */

function RouteScreen({ step, isLight }: { step: typeof STEPS[0]; isLight: boolean }) {
  const { card, border, text, sub } = screenVars(isLight);
  return (
    <div style={{ padding: "14px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: step.color, letterSpacing: ".08em" }}>ROUTE PLANNER</div>
      {[
        { label: "From", val: "Noida, UP",  svgColor: "#22D3EE" },
        { label: "To",   val: "Jaipur, RJ", svgColor: "#FFC043" },
      ].map(f => (
        <div key={f.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ color: f.svgColor, flexShrink: 0 }}>{Ic.mapPin}</div>
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
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${step.color}15`, border: `1px solid ${step.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: step.color, flexShrink: 0 }}>
            {Ic.zapSm}
          </div>
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
            {Ic.check(step.color)}
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
      <div style={{ background: `${step.color}10`, border: `1px solid ${step.color}25`, borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", gap: 5, color: step.color }}>
        <span style={{ color: step.color }}>{Ic.lock}</span>
        <span style={{ fontSize: 9, fontWeight: 700 }}>HMAC-signed · Single-use</span>
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
      <div style={{ background: isLight ? "rgba(248,246,241,.52)" : "rgba(255,192,67,.08)", border: "1px solid rgba(255,192,67,.22)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ color: "#FFC043", display: "flex" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M17 5H7v6a5 5 0 0 0 10 0V5z"/>
            <path d="M17 5h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4M7 5H5a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4"/>
          </svg>
        </div>
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
      <div style={{ width: 52, height: 52, borderRadius: 16, background: `${step.color}15`, border: `1.5px solid ${step.color}40`, display: "flex", alignItems: "center", justifyContent: "center", color: step.color }}>
        {Ic.flag}
      </div>
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
      ([e]) => { if (e.isIntersecting) { section.classList.add("visible"); setVisible(true); } },
      { threshold: 0.1 },
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    intervalRef.current = setInterval(() => setActiveStep(s => (s + 1) % STEPS.length), 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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
        padding: "clamp(48px,8vw,100px) clamp(16px,5vw,60px) clamp(60px,10vw,120px)",
        background: isLight
          ? "linear-gradient(180deg, #F8F6F1 0%, #F8F6F1 50%, #FBFAF7 100%)"
          : "linear-gradient(160deg,#080C10 0%,#0A1016 35%,#080D14 65%,#060A10 100%)",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* ── Dark mode decorative background ── */}
      {!isLight && (<>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:.16 }} aria-hidden="true">
          <defs>
            <pattern id="hiw-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(34,211,238,0.28)" strokeWidth=".6"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hiw-grid)"/>
        </svg>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:.10 }} aria-hidden="true">
          <defs>
            <pattern id="hiw-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(34,211,238,0.50)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hiw-dots)"/>
        </svg>
        <div style={{ position:"absolute", top:"-7%", right:"-4%", width:650, height:650, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(34,211,238,.11) 0%,transparent 60%)" }}/>
        <div style={{ position:"absolute", bottom:"-5%", left:"-4%", width:540, height:540, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(139,92,246,.09) 0%,transparent 62%)" }}/>
        <div style={{ position:"absolute", top:"42%", left:"35%", width:420, height:420, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(0,230,118,.07) 0%,transparent 62%)" }}/>
        <div style={{ position:"absolute", top:"5%", left:"8%", width:320, height:320, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(255,192,67,.07) 0%,transparent 62%)" }}/>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:1, pointerEvents:"none", background:"linear-gradient(90deg,transparent 0%,rgba(34,211,238,.38) 35%,rgba(139,92,246,.25) 70%,transparent 100%)" }}/>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, pointerEvents:"none", background:"linear-gradient(90deg,transparent 0%,rgba(34,211,238,.20) 50%,transparent 100%)" }}/>
      </>)}

      {/* ── Light mode ambient glows ── */}
      {isLight && (<>
        <div style={{ position:"absolute", top:"-4%", right:"-4%", width:560, height:560, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(248,246,241,.62) 0%,transparent 65%)" }}/>
        <div style={{ position:"absolute", bottom:"8%", left:"-4%", width:460, height:460, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(ellipse,rgba(124,58,237,.05) 0%,transparent 65%)" }}/>
      </>)}

      <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(36px,5vw,72px)" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
            background: "rgba(34,211,238,.08)", border: "1px solid rgba(34,211,238,.22)",
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
        <div className="hiw-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 60, alignItems: "center" }}>

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
                    position: "relative", fontFamily: "inherit",
                    boxShadow: isActive
                      ? isLight ? `0 4px 24px ${s.color}14` : `0 4px 32px ${s.color}12`
                      : "none",
                  }}>

                  {/* Step number connector line */}
                  {i < STEPS.length - 1 && (
                    <div style={{
                      position: "absolute", left: 36, bottom: isActive ? -4 : -2,
                      width: 2, height: isActive ? 8 : 4,
                      background: isPast
                        ? "rgba(0,230,118,.5)"
                        : (isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)"),
                      borderRadius: 1, transition: "background .3s",
                    }}/>
                  )}

                  {/* Icon bubble */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: isActive
                      ? `${s.color}18`
                      : isPast
                        ? "rgba(0,230,118,.10)"
                        : (isLight ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.04)"),
                    border: `1.5px solid ${isActive ? s.color + "50" : isPast ? "#00E67628" : (isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.07)")}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isActive ? s.color : isPast ? "#00E676" : (isLight ? "#9CA3AF" : "#4B5563"),
                    boxShadow: isActive ? `0 0 20px ${s.color}28` : "none",
                    transition: "all .3s",
                  }}>
                    {isPast
                      ? Ic.check("#00E676")
                      : STEP_ICONS[i]
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                        color: isActive ? s.color : isPast ? (isLight ? "#9CA3AF" : "#4B5563") : t.textSub,
                        transition: "color .3s",
                      }}>{s.label}</div>
                      {isActive && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
                          background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30`,
                          letterSpacing: ".05em",
                        }}>LIVE</span>
                      )}
                    </div>
                    {isActive && (
                      <div style={{ fontSize: 11.5, color: t.textMuted, lineHeight: 1.5, marginTop: 3, animation: "fade-up .3s ease both" }}>{s.detail}</div>
                    )}
                    {!isActive && (
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>{s.sub}</div>
                    )}
                  </div>

                  {/* Step counter badge */}
                  <div style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700,
                    color: isActive ? s.color : (isLight ? "#9CA3AF" : "#374151"),
                    background: isActive ? `${s.color}12` : (isLight ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.04)"),
                    border: `1px solid ${isActive ? s.color + "25" : (isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.06)")}`,
                    transition: "all .3s",
                  }}>{i + 1}</div>

                  {/* Progress bar at bottom when active */}
                  {isActive && (
                    <div style={{ position: "absolute", bottom: 0, left: 20, right: 20, height: 2, borderRadius: 2, background: isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)", overflow: "hidden" }}>
                      <div key={activeStep} style={{ height: "100%", background: `linear-gradient(90deg,${s.color},${s.color}80)`, borderRadius: 2, animation: "progress-fill 3s linear forwards" }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: phone */}
          <div className="hiw-phone-col" style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            {/* Glow behind phone */}
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              width: 280, height: 380, borderRadius: "50%", pointerEvents: "none",
              background: `radial-gradient(ellipse, ${step.color}22 0%, transparent 65%)`,
              transition: "background .5s", animation: "float-slow 6s ease-in-out infinite",
            }} />

            {/* Phone frame */}
            <div style={{
              position: "relative", width: 220, height: 440,
              background: isLight ? "#1A1A2E" : "#0A0D0E",
              borderRadius: 36,
              border: isLight ? "7px solid #2D2D3F" : "7px solid #1C1F22",
              boxShadow: isLight
                ? `0 32px 80px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.08) inset, 0 0 60px ${step.color}22`
                : `0 32px 80px rgba(0,0,0,.80), 0 0 0 1px rgba(255,255,255,.05) inset, 0 0 80px ${step.color}25`,
              overflow: "hidden", transition: "box-shadow .5s",
            }}>
              {/* Side button detail */}
              <div style={{ position: "absolute", right: -9, top: 80, width: 4, height: 28, background: isLight ? "#2D2D3F" : "#1C1F22", borderRadius: "0 3px 3px 0" }}/>
              <div style={{ position: "absolute", left: -9, top: 70, width: 4, height: 20, background: isLight ? "#2D2D3F" : "#1C1F22", borderRadius: "3px 0 0 3px" }}/>
              <div style={{ position: "absolute", left: -9, top: 98, width: 4, height: 20, background: isLight ? "#2D2D3F" : "#1C1F22", borderRadius: "3px 0 0 3px" }}/>

              {/* Notch */}
              <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 68, height: 18, background: isLight ? "#2D2D3F" : "#0A0D0E", borderRadius: 99, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: isLight ? "#3D3D50" : "#1A1D20" }}/>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: isLight ? "#4A4A60" : "#22262A" }}/>
              </div>

              {/* Screen */}
              <div style={{ position: "absolute", inset: 0, background: isLight ? "#F8F6F1" : "#0C1115", borderRadius: 29, paddingTop: 32, overflow: "hidden" }}>
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
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: "linear-gradient(135deg,#00E676,#22D3EE)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#050708" }}>
                    {Ic.zapSm}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: isLight ? "#0D1621" : "#E6EBED", letterSpacing: "-.02em" }}>ChargingGuru</span>
                  <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#00E676", boxShadow: "0 0 6px #00E676" }}/>
                </div>

                {/* Dynamic content */}
                <div key={activeStep} style={{ height: "calc(100% - 66px)", animation: "fade-up .3s cubic-bezier(.2,0,0,1)" }}>
                  <PhoneScreen step={step} isLight={isLight} />
                </div>
              </div>
            </div>

            {/* Step pill below phone */}
            <div style={{
              position: "absolute", bottom: -48, left: "50%", transform: "translateX(-50%)",
              background: isLight ? "rgba(255,255,255,.92)" : "rgba(10,14,18,.92)",
              border: `1px solid ${step.color}35`,
              borderRadius: 999, padding: "6px 16px",
              backdropFilter: "blur(12px)",
              textAlign: "center", whiteSpace: "nowrap",
              boxShadow: isLight ? `0 4px 20px rgba(0,0,0,.08)` : `0 4px 20px rgba(0,0,0,.4), 0 0 16px ${step.color}12`,
              transition: "border-color .3s, box-shadow .3s",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: step.color, boxShadow: `0 0 6px ${step.color}`, animation: "glow-pulse 2s ease-in-out infinite" }}/>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: step.color }}>Step {activeStep + 1}/{STEPS.length}</span>
              <span style={{ fontSize: 10.5, color: t.textMuted }}>· {step.label}</span>
            </div>
          </div>
        </div>

        {/* Bottom metric cards */}
        <div className="hiw-bottom-grid" style={{ marginTop: "clamp(48px,6vw,96px)", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {[
            { icon: Ic.zap,    stat: "< 10s",  label: "QR check-in time", color: "#22D3EE" },
            { icon: Ic.shield, stat: "100%",   label: "Slot guarantee",   color: "#00E676" },
            { icon: Ic.trophy, stat: "2× pts", label: "Points per kWh",  color: "#FFC043" },
          ].map(item => (
            <div key={item.label} style={{
              background: isLight ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.035)",
              border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : `${item.color}18`}`,
              borderRadius: 20, padding: "24px 26px",
              display: "flex", alignItems: "center", gap: 18,
              backdropFilter: "blur(10px)",
              boxShadow: isLight
                ? "0 2px 24px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.04)"
                : `0 0 0 1px ${item.color}10`,
              transition: "transform .22s, box-shadow .22s",
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(-4px)";
                el.style.boxShadow = isLight
                  ? `0 12px 40px rgba(0,0,0,.10), 0 0 0 1.5px ${item.color}28`
                  : `0 0 32px ${item.color}18, 0 0 0 1px ${item.color}32`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "none";
                el.style.boxShadow = isLight
                  ? "0 2px 24px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.04)"
                  : `0 0 0 1px ${item.color}10`;
              }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                background: `${item.color}12`, border: `1.5px solid ${item.color}28`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: item.color,
                boxShadow: `0 0 20px ${item.color}14`,
              }}>{item.icon}</div>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 26, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.stat}</div>
                <div style={{ fontSize: 12.5, color: t.textSub, marginTop: 5, fontWeight: 500 }}>{item.label}</div>
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
