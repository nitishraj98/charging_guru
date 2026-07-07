"use client";
import { useEffect, useRef, useState } from "react";
import { Tok } from "./tokens";

/* ── SVG icon set ── */
const Icons = {
  calendar: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
    </svg>
  ),
  undo: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6"/><path d="M3 13A9 9 0 1 0 5.4 6.4"/>
    </svg>
  ),
  map: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  ),
  shield: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  refund: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
      <path d="M14.5 9a3.5 3.5 0 0 0-5 0v.5"/><path d="M9 15l1.5-1.5L12 15l1.5-1.5L15 15"/>
    </svg>
  ),
  bolt: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  building: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l7-4 7 4v14"/>
      <path d="M9 21V12h6v9"/><path d="M9 9h.01M15 9h.01M9 12h.01M15 12h.01"/>
    </svg>
  ),
  plug: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5"/><path d="M9 8V2M15 8V2"/>
      <path d="M6 13a6 6 0 0 0 12 0V8H6v5z"/>
    </svg>
  ),
  // sidebar icons
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  ),
  activity: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  rotateCcw: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v6h6"/><path d="M3 8A9 9 0 1 0 5.6 5.6"/>
    </svg>
  ),
  zap: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  lock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  chat: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  mail: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  phone: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.59 1.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.27 6.27l.88-.88a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  arrowRight: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  chevronDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  ),
};

const FAQS = [
  { q: "How does slot booking work?",            a: "Pick a station and time slot — we hold it for 15 minutes while you complete payment. Once paid, the slot is locked to your booking ID and a QR pass is issued instantly. No one else can take your slot.",     cat: "Booking",  icon: Icons.calendar },
  { q: "Can I cancel a booking?",                a: "Yes, any time before check-in. Cancellations more than 30 minutes before your slot get a 100% refund. Within 30 minutes, a ₹10 processing fee applies. Once charging starts, sessions cannot be cancelled.",  cat: "Booking",  icon: Icons.undo     },
  { q: "Can I book multiple stops in one trip?",  a: "Absolutely. Journey Planner lets you pick your destination and pre-book every charging stop on your corridor in a single checkout — one payment, all stops confirmed, zero stress.",                            cat: "Booking",  icon: Icons.map      },
  { q: "Is my payment data safe?",               a: "Payments run through Razorpay's PCI-DSS Level 1 infrastructure. We never store raw card data. All API traffic is TLS 1.3 encrypted. Booking tokens are HMAC-SHA256 signed and single-use replay-protected.",  cat: "Payments", icon: Icons.shield   },
  { q: "How do refunds work?",                   a: "Eligible refunds are processed within 2 hours — back to your original payment method. For disputed sessions, our support team reviews and resolves within 24 hours guaranteed.",                                cat: "Payments", icon: Icons.refund   },
  { q: "What if a charger is faulty?",           a: "Tap 'Report issue' in the app. We'll try to allocate a nearby alternative slot immediately. If no alternative is available, a full refund processes automatically within 2 hours — no questions asked.",       cat: "Stations", icon: Icons.bolt     },
  { q: "How do I list my charging station?",     a: "Apply as a Station Owner in the app. Our team verifies and approves within 48 hours. You get a real-time admin dashboard, per-session revenue reports, and optional hardware discounts.",                     cat: "Stations", icon: Icons.building },
  { q: "Which EV connectors are supported?",     a: "All major types: CCS2, CHAdeMO, Type 2 AC, Bharat AC-001, and GB/T. Every charger listing shows connector types and power levels clearly so you always know before you drive.",                              cat: "Stations", icon: Icons.plug     },
];

const CATS = ["All", "Booking", "Payments", "Stations"];

const CAT_META: Record<string, { color: string; darkColor: string; bg: string; darkBg: string }> = {
  All:      { color: "#00C85A", darkColor: "#00E676", bg: "rgba(248,246,241,.70)",   darkBg: "rgba(0,230,118,.10)"  },
  Booking:  { color: "#0EA5E9", darkColor: "#38BDF8", bg: "rgba(14,165,233,.10)", darkBg: "rgba(56,189,248,.10)" },
  Payments: { color: "#8B5CF6", darkColor: "#A78BFA", bg: "rgba(139,92,246,.10)", darkBg: "rgba(167,139,250,.10)"},
  Stations: { color: "#F59E0B", darkColor: "#FFC043", bg: "rgba(245,158,11,.10)", darkBg: "rgba(255,192,67,.10)" },
};

const ACCENT_LIGHT = "#00C85A";
const ACCENT_DARK  = "#00E676";

/* ── Single FAQ item ── */
function FAQItem({
  q, a, cat, icon, isOpen, onToggle, isLight, tok,
}: {
  q: string; a: string; cat: string; icon: React.ReactNode;
  isOpen: boolean; onToggle: () => void; isLight: boolean; tok: Tok;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const accent   = isLight ? ACCENT_LIGHT : ACCENT_DARK;
  const cm       = CAT_META[cat];
  const catColor = isLight ? cm.color : cm.darkColor;
  const catBg    = isLight ? cm.bg    : cm.darkBg;

  useEffect(() => {
    if (!bodyRef.current) return;
    setH(isOpen ? bodyRef.current.scrollHeight : 0);
  }, [isOpen]);

  return (
    <div style={{
      borderRadius: 18,
      border: `1px solid ${isOpen
        ? (isLight ? "rgba(0,200,90,.28)" : "rgba(0,230,118,.20)")
        : (isLight ? "rgba(0,0,0,.07)"    : "rgba(255,255,255,.07)")}`,
      background: isOpen
        ? (isLight ? "rgba(255,255,255,.98)" : "rgba(255,255,255,.06)")
        : (isLight ? "rgba(255,255,255,.65)" : "rgba(255,255,255,.025)"),
      boxShadow: isOpen
        ? (isLight ? "0 8px 36px rgba(248,246,241,.70), 0 2px 8px rgba(0,0,0,.05)" : "0 8px 36px rgba(0,230,118,.07)")
        : "none",
      overflow: "hidden",
      transition: "border-color .25s, background .25s, box-shadow .25s",
      backdropFilter: "blur(10px)",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 14,
          padding: "13px 16px", background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        }}
      >
        {/* Icon bubble */}
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isOpen ? catColor : (isLight ? "#6B7280" : "#6B7480"),
          background: isOpen ? catBg : (isLight ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.05)"),
          border: `1px solid ${isOpen
            ? `${catColor}40`
            : (isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.08)")}`,
          transition: "all .25s",
        }}>{icon}</div>

        {/* Question + category tag */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 600, lineHeight: 1.35,
            color: isOpen ? tok.text : tok.textSub,
            transition: "color .22s", marginBottom: 3,
          }}>{q}</div>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: ".08em",
            padding: "2px 9px", borderRadius: 99,
            background: catBg, color: catColor,
          }}>{cat.toUpperCase()}</span>
        </div>

        {/* Chevron */}
        <div style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isOpen ? accent : (isLight ? "#9CA3AF" : "#4B5563"),
          background: isOpen
            ? (isLight ? "rgba(248,246,241,.70)" : "rgba(0,230,118,.10)")
            : (isLight ? "rgba(0,0,0,.04)"    : "rgba(255,255,255,.05)"),
          border: `1px solid ${isOpen
            ? (isLight ? "rgba(0,200,90,.25)" : "rgba(0,230,118,.20)")
            : (isLight ? "rgba(0,0,0,.07)"    : "rgba(255,255,255,.08)")}`,
          transition: "all .25s",
        }}>
          <div style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .32s cubic-bezier(.4,0,.2,1)", display: "flex" }}>
            {Icons.chevronDown}
          </div>
        </div>
      </button>

      {/* Animated answer */}
      <div style={{ height: h, overflow: "hidden", transition: "height .38s cubic-bezier(.4,0,.2,1)" }}>
        <div ref={bodyRef}>
          <div style={{
            margin: "0 16px 14px 62px",
            padding: "12px 16px", borderRadius: 10,
            background: isLight ? "rgba(0,0,0,.025)" : "rgba(255,255,255,.04)",
            border: `1px solid ${isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.06)"}`,
            color: tok.textSub, fontSize: 13.5, lineHeight: 1.75,
          }}>{a}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Main export ── */
export default function FAQSection({ isLight, t }: { isLight: boolean; t: Tok }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeCat, setActiveCat] = useState("All");
  const [openIdx, setOpenIdx]     = useState<number | null>(0);
  const [visible, setVisible]     = useState(false);
  const accent = isLight ? ACCENT_LIGHT : ACCENT_DARK;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const filtered = FAQS.filter(f => activeCat === "All" || f.cat === activeCat);
  const handleCat = (cat: string) => { setActiveCat(cat); setOpenIdx(0); };
  const toggle = (i: number) => setOpenIdx(prev => (prev === i ? null : i));

  const STATS = [
    { value: "< 2h",  label: "Support reply",  color: "#22D3EE", icon: Icons.clock     },
    { value: "99.8%", label: "Uptime",          color: accent,    icon: Icons.activity  },
    { value: "100%",  label: "Refund rate",     color: "#A78BFA", icon: Icons.rotateCcw },
    { value: "8 sec", label: "Avg check-in",    color: "#FFC043", icon: Icons.zap       },
  ];

  const HELP = [
    { icon: Icons.chat,  label: "Live chat",     sub: "< 2 min reply", color: accent    },
    { icon: Icons.mail,  label: "Email support", sub: "2 hr response", color: "#22D3EE" },
    { icon: Icons.phone, label: "Call us",       sub: "Mon–Sat · 9–6", color: "#FFC043" },
  ];

  return (
    <section
      ref={sectionRef}
      style={{
        padding: "clamp(36px,6vw,72px) clamp(16px,5vw,60px) clamp(32px,5vw,64px)",
        background: isLight
          ? "linear-gradient(180deg,#F8F6F1 0%,#FBFAF7 100%)"
          : "linear-gradient(160deg,#080E18 0%,#0B1422 40%,#0A1019 70%,#091018 100%)",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* ── Dark mode decorative background ── */}
      {!isLight && (<>
        {/* Grid lines */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:.18 }} aria-hidden="true">
          <defs>
            <pattern id="faq-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(0,230,118,0.35)" strokeWidth=".6"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#faq-grid)"/>
        </svg>

        {/* Dot pattern overlay */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:.12 }} aria-hidden="true">
          <defs>
            <pattern id="faq-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(0,230,118,0.6)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#faq-dots)"/>
        </svg>

        {/* Large green glow — top left */}
        <div style={{
          position:"absolute", top:"-10%", left:"-5%",
          width:700, height:700, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(0,230,118,.13) 0%,transparent 62%)",
        }}/>
        {/* Cyan glow — bottom right */}
        <div style={{
          position:"absolute", bottom:"-8%", right:"-4%",
          width:580, height:580, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(34,211,238,.10) 0%,transparent 62%)",
        }}/>
        {/* Purple glow — centre right */}
        <div style={{
          position:"absolute", top:"40%", right:"18%",
          width:380, height:380, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(139,92,246,.08) 0%,transparent 62%)",
        }}/>
        {/* Amber glow — bottom left */}
        <div style={{
          position:"absolute", bottom:"12%", left:"12%",
          width:320, height:320, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(255,192,67,.07) 0%,transparent 62%)",
        }}/>

        {/* Horizontal accent line — top */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:1, pointerEvents:"none",
          background:"linear-gradient(90deg,transparent 0%,rgba(0,230,118,.35) 30%,rgba(34,211,238,.25) 70%,transparent 100%)",
        }}/>
        {/* Horizontal accent line — bottom */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:1, pointerEvents:"none",
          background:"linear-gradient(90deg,transparent 0%,rgba(0,230,118,.20) 50%,transparent 100%)",
        }}/>
      </>)}

      {/* ── Light mode ambient glows ── */}
      {isLight && (<>
        <div style={{
          position:"absolute", top:"18%", left:"8%",
          width:600, height:600, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(248,246,241,.58) 0%,transparent 65%)",
        }}/>
        <div style={{
          position:"absolute", bottom:"10%", right:"6%",
          width:480, height:480, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(248,246,241,.58) 0%,transparent 65%)",
        }}/>
      </>)}

      <div style={{ position: "relative", maxWidth: 1120, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{
          textAlign: "center", marginBottom: 28,
          opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(22px)",
          transition: "opacity .6s, transform .6s",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12,
            background: isLight ? "rgba(248,246,241,.62)" : "rgba(0,230,118,.08)",
            border: `1px solid ${isLight ? "rgba(0,200,90,.22)" : "rgba(0,230,118,.22)"}`,
            borderRadius: 999, padding: "6px 18px",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: accent,
              display: "inline-block", boxShadow: `0 0 8px ${accent}`,
              animation: "glow-pulse 2s ease-in-out infinite",
            }}/>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".13em", color: accent }}>FAQ</span>
          </div>

          <h2 style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "clamp(24px,2.8vw,38px)", fontWeight: 800,
            letterSpacing: "-.04em", color: t.text, lineHeight: 1.08, marginBottom: 10,
          }}>
            Everything you need<br/>
            <span className="faq-heading-gradient">to know.</span>
          </h2>
          <p style={{ color: t.textSub, fontSize: 14, lineHeight: 1.65, maxWidth: 480, margin: "0 auto" }}>
            Quick answers about booking, payments, and getting started with India&apos;s fastest EV charging network.
          </p>
        </div>

        {/* ── Category pills ── */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 6, marginBottom: 28, flexWrap: "wrap",
          opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(12px)",
          transition: "opacity .6s .1s, transform .6s .1s",
        }}>
          {CATS.map(cat => {
            const active = activeCat === cat;
            const count  = cat === "All" ? FAQS.length : FAQS.filter(f => f.cat === cat).length;
            const cm     = CAT_META[cat];
            const cc     = isLight ? cm.color : cm.darkColor;
            const cb     = isLight ? cm.bg    : cm.darkBg;
            return (
              <button key={cat} onClick={() => handleCat(cat)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 14px", borderRadius: 99, cursor: "pointer",
                fontFamily: "inherit", fontSize: 13.5, fontWeight: active ? 700 : 500,
                background: active ? cb : (isLight ? "rgba(255,255,255,.72)" : "rgba(255,255,255,.05)"),
                color: active ? cc : t.textSub,
                border: `1.5px solid ${active ? `${cc}50` : (isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)")}`,
                boxShadow: active ? `0 4px 18px ${cc}22` : "none",
                backdropFilter: "blur(8px)",
                transition: "all .22s",
              } as React.CSSProperties}>
                {cat}
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                  padding: "1px 7px", borderRadius: 99,
                  background: active ? `${cc}22` : (isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.08)"),
                  color: active ? cc : t.textMuted,
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Two-column layout ── */}
        <div className="faq-two-col" style={{ display: "grid", gridTemplateColumns: "1fr clamp(240px,28%,340px)", gap: "clamp(16px,3vw,24px)", alignItems: "start" }}>

          {/* ── Left: accordion ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {filtered.map((f, i) => (
              <div key={`${activeCat}-${f.q}`} style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : "translateY(18px)",
                transition: `opacity .5s ${i * 55}ms cubic-bezier(.2,0,0,1), transform .5s ${i * 55}ms cubic-bezier(.2,0,0,1)`,
              }}>
                <FAQItem
                  q={f.q} a={f.a} cat={f.cat} icon={f.icon}
                  isOpen={openIdx === i}
                  onToggle={() => toggle(i)}
                  isLight={isLight} tok={t}
                />
              </div>
            ))}

            {/* Contact strip */}
            <div style={{
              marginTop: 4, padding: "14px 18px", borderRadius: 14,
              background: isLight ? "rgba(248,246,241,.45)" : "rgba(0,230,118,.06)",
              border: `1px solid ${isLight ? "rgba(0,200,90,.18)" : "rgba(0,230,118,.18)"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
              opacity: visible ? 1 : 0, transition: "opacity .6s .5s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: accent,
                  background: isLight ? "rgba(248,246,241,.70)" : "rgba(0,230,118,.10)",
                  border: `1px solid ${isLight ? "rgba(0,200,90,.22)" : "rgba(0,230,118,.18)"}`,
                }}>
                  {Icons.chat}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>Still have questions?</div>
                  <div style={{ fontSize: 11.5, color: t.textSub }}>Our support team responds within 2 hours, guaranteed.</div>
                </div>
              </div>
              <a href="mailto:support@chargingguru.in" style={{
                padding: "9px 18px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C260"})`,
                color: "#050708", textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap",
                boxShadow: isLight ? "0 4px 16px rgba(0,200,90,.35)" : "0 0 22px rgba(0,230,118,.28)",
                transition: "transform .18s, box-shadow .18s",
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = isLight ? "0 8px 24px rgba(0,200,90,.45)" : "0 0 36px rgba(0,230,118,.42)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "none"; el.style.boxShadow = isLight ? "0 4px 16px rgba(0,200,90,.35)" : "0 0 22px rgba(0,230,118,.28)"; }}
              >
                Contact support →
              </a>
            </div>
          </div>

          {/* ── Right: sticky sidebar ── */}
          <div className="faq-sidebar" style={{
            position: "sticky", top: 100, display: "flex", flexDirection: "column", gap: 10,
            opacity: visible ? 1 : 0, transform: visible ? "none" : "translateX(20px)",
            transition: "opacity .6s .2s, transform .6s .2s",
          }}>

            {/* 2×2 stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {STATS.map(s => (
                <div key={s.label} style={{
                  padding: "12px", borderRadius: 14,
                  background: isLight ? "rgba(255,255,255,.88)" : "rgba(255,255,255,.04)",
                  border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)"}`,
                  backdropFilter: "blur(8px)",
                }}>
                  <div style={{ color: s.color, marginBottom: 7, display: "flex" }}>{s.icon}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 800, color: s.color, marginBottom: 3 }}>{s.value}</div>
                  <div style={{ fontSize: 10.5, color: t.textMuted, lineHeight: 1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Uptime bar */}
            <div style={{
              background: isLight ? "rgba(255,255,255,.88)" : "rgba(255,255,255,.04)",
              border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)"}`,
              borderRadius: 14, padding: "14px 16px", backdropFilter: "blur(8px)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: t.textMuted }}>UPTIME · LAST 90 DAYS</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: accent }}>99.8%</span>
              </div>
              <div style={{ display: "flex", gap: 2, height: 20 }}>
                {Array.from({ length: 90 }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, borderRadius: 3,
                    background: (i === 18 || i === 43)
                      ? (isLight ? "#FCA5A5" : "rgba(239,68,68,.45)")
                      : (isLight ? `${accent}CC` : `${accent}65`),
                  }}/>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9.5, color: t.textMuted }}>
                <span>90 days ago</span><span>Today</span>
              </div>
            </div>

            {/* Security */}
            <div style={{
              background: isLight ? "rgba(139,92,246,.05)" : "rgba(139,92,246,.07)",
              border: `1px solid ${isLight ? "rgba(139,92,246,.18)" : "rgba(139,92,246,.22)"}`,
              borderRadius: 14, padding: "12px 14px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#A78BFA",
                background: isLight ? "rgba(139,92,246,.10)" : "rgba(139,92,246,.14)",
                border: `1px solid ${isLight ? "rgba(139,92,246,.20)" : "rgba(139,92,246,.25)"}`,
              }}>{Icons.lock}</div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#C4B5FD", marginBottom: 4, letterSpacing: ".02em" }}>
                  PCI-DSS L1 · ISO 27001 · TLS 1.3
                </div>
                <div style={{ fontSize: 10.5, color: t.textMuted, lineHeight: 1.5 }}>
                  HMAC-signed tokens. Zero card data stored.
                </div>
              </div>
            </div>

            {/* Help options */}
            <div style={{
              background: isLight ? "rgba(255,255,255,.88)" : "rgba(255,255,255,.04)",
              border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)"}`,
              borderRadius: 14, padding: "14px 16px", backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 10 }}>Need a hand?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {HELP.map(opt => (
                  <button key={opt.label} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 10, border: "none",
                    background: isLight ? "rgba(0,0,0,.03)" : "rgba(255,255,255,.04)",
                    cursor: "pointer", transition: "background .15s", fontFamily: "inherit",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.08)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isLight ? "rgba(0,0,0,.03)" : "rgba(255,255,255,.04)"; }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: opt.color,
                      background: `${opt.color}14`,
                      border: `1px solid ${opt.color}28`,
                    }}>{opt.icon}</div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>{opt.label}</div>
                      <div style={{ fontSize: 10, color: t.textMuted }}>{opt.sub}</div>
                    </div>
                    <div style={{ color: opt.color, display: "flex" }}>{Icons.arrowRight}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
