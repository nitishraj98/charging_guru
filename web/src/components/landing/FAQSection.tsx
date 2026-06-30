"use client";
import { useEffect, useRef, useState } from "react";
import { Tok } from "./tokens";

const FAQS = [
  { q: "How does slot booking work?",          a: "Pick a station and time slot — we hold it for 15 minutes while you complete payment. Once paid, the slot is locked to your booking ID and a QR pass is issued instantly. No one else can take your slot.",    cat: "Booking"  },
  { q: "Can I cancel a booking?",              a: "Yes, any time before check-in. Cancellations more than 30 minutes before your slot get a 100% refund. Within 30 minutes, a ₹10 processing fee applies. Once charging starts, sessions cannot be cancelled.", cat: "Booking"  },
  { q: "Can I book multiple stops in one trip?", a: "Absolutely. Journey Planner lets you pick your destination and pre-book every charging stop on your corridor in a single checkout — one payment, all stops confirmed, zero stress.",                           cat: "Booking"  },
  { q: "Is my payment data safe?",             a: "Payments run through Razorpay's PCI-DSS Level 1 infrastructure. We never store raw card data. All API traffic is TLS 1.3 encrypted. Booking tokens are HMAC-SHA256 signed and single-use replay-protected.", cat: "Payments" },
  { q: "How do refunds work?",                 a: "Eligible refunds are processed within 2 hours — back to your original payment method. For disputed sessions, our support team reviews and resolves within 24 hours guaranteed.",                               cat: "Payments" },
  { q: "What if a charger is faulty?",         a: "Tap 'Report issue' in the app. We'll try to allocate a nearby alternative slot immediately. If no alternative is available, a full refund processes automatically within 2 hours — no questions asked.",      cat: "Stations" },
  { q: "How do I list my charging station?",   a: "Apply as a Station Owner in the app. Our team verifies and approves within 48 hours. You get a real-time admin dashboard, per-session revenue reports, and optional hardware discounts.",                    cat: "Stations" },
  { q: "Which EV connectors are supported?",   a: "All major types: CCS2, CHAdeMO, Type 2 AC, Bharat AC-001, and GB/T. Every charger listing shows connector types and power levels clearly so you always know before you drive.",                             cat: "Stations" },
];

const CATS = ["All", "Booking", "Payments", "Stations"];

const ACCENT_LIGHT = "#00D26A";
const ACCENT_DARK  = "#00E676";

/* ── Single FAQ item ── */
function FAQItem({
  q, a, cat, index, isOpen, onToggle, isLight, tok,
}: {
  q: string; a: string; cat: string; index: number;
  isOpen: boolean; onToggle: () => void;
  isLight: boolean; tok: Tok;
}) {
  const bodyRef  = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const accent   = isLight ? ACCENT_LIGHT : ACCENT_DARK;
  const num      = String(index + 1).padStart(2, "0");

  useEffect(() => {
    if (!bodyRef.current) return;
    setH(isOpen ? bodyRef.current.scrollHeight : 0);
  }, [isOpen]);

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${isOpen
          ? (isLight ? "rgba(0,210,106,.28)" : "rgba(0,230,118,.25)")
          : (isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.06)")}`,
        borderLeft: `${isOpen ? 3 : 1}px solid ${isOpen ? accent : (isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.06)")}`,
        background: isOpen
          ? (isLight ? "rgba(0,210,106,.03)" : "rgba(0,230,118,.04)")
          : (isLight ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.02)"),
        overflow: "hidden",
        transition: "border-color .22s, background .22s, border-left-width .22s",
        backdropFilter: "blur(6px)",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 16,
          padding: "20px 24px", background: "none", border: "none",
          cursor: "pointer", color: tok.text, fontFamily: "inherit", textAlign: "left",
        }}
      >
        {/* Number */}
        <span style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 11, fontWeight: 700, flexShrink: 0, width: 22,
          color: isOpen ? accent : tok.textMuted,
          transition: "color .2s",
        }}>{num}</span>

        {/* Category chip */}
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: ".09em",
          padding: "2px 8px", borderRadius: 99, flexShrink: 0,
          background: isOpen
            ? (isLight ? "rgba(0,210,106,.1)" : "rgba(0,230,118,.12)")
            : (isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.05)"),
          color: isOpen ? accent : tok.textMuted,
          transition: "all .2s",
        }}>{cat}</span>

        {/* Question */}
        <span style={{
          flex: 1, fontSize: 15, fontWeight: 600, lineHeight: 1.4,
          color: isOpen ? tok.text : tok.textSub,
          transition: "color .2s",
        }}>{q}</span>

        {/* Chevron */}
        <div style={{
          width: 30, height: 30, borderRadius: 10, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isOpen
            ? (isLight ? "rgba(0,210,106,.1)" : "rgba(0,230,118,.12)")
            : (isLight ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.04)"),
          border: `1px solid ${isOpen
            ? (isLight ? "rgba(0,210,106,.25)" : "rgba(0,230,118,.2)")
            : (isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)")}`,
          transition: "all .22s",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .3s cubic-bezier(.4,0,.2,1)" }}>
            <path d="M6 9l6 6 6-6" stroke={isOpen ? accent : tok.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {/* Animated answer */}
      <div style={{ height: h, overflow: "hidden", transition: "height .38s cubic-bezier(.4,0,.2,1)" }}>
        <div ref={bodyRef} style={{ padding: "0 24px 0 62px" }}>
          <div style={{
            paddingBottom: 22,
            color: tok.textSub, fontSize: 14.5, lineHeight: 1.85,
            borderTop: `1px solid ${isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.05)"}`,
            paddingTop: 16,
          }}>
            {a}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Uptime bar ── */
function UptimeBar({ isLight, accent }: { isLight: boolean; accent: string }) {
  const DOWN = new Set([18, 43]);
  return (
    <div style={{
      background: isLight ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.03)",
      border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.06)"}`,
      borderRadius: 16, padding: "18px 20px", backdropFilter: "blur(8px)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: isLight ? "#374151" : "#6B7479", letterSpacing: ".06em" }}>
          UPTIME · LAST 90 DAYS
        </span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: accent }}>99.8%</span>
      </div>
      <div style={{ display: "flex", gap: 2, height: 18 }}>
        {Array.from({ length: 90 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, borderRadius: 2,
            background: DOWN.has(i)
              ? (isLight ? "#FCA5A5" : "rgba(239,68,68,.45)")
              : isLight ? `${accent}BB` : `${accent}70`,
          }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9.5, color: isLight ? "#9CA3AF" : "#4B5563" }}>
        <span>90 days ago</span><span>Today</span>
      </div>
    </div>
  );
}

/* ── Main export ── */
export default function FAQSection({ isLight, t }: { isLight: boolean; t: Tok }) {
  const sectionRef            = useRef<HTMLDivElement>(null);
  const [activeCat, setActiveCat]   = useState("All");
  const [openIdx, setOpenIdx]       = useState<number | null>(0);
  const [visible, setVisible]       = useState(false);
  const accent = isLight ? ACCENT_LIGHT : ACCENT_DARK;

  /* Scroll reveal */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); setVisible(true); } },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const filtered = FAQS.filter(f => activeCat === "All" || f.cat === activeCat);

  /* When category changes, reset open item */
  const handleCat = (cat: string) => {
    setActiveCat(cat);
    setOpenIdx(0);
  };

  const toggle = (i: number) => setOpenIdx(prev => (prev === i ? null : i));

  const stats = [
    { label: "Avg check-in", value: "8 sec",  color: "#22D3EE" },
    { label: "Support reply", value: "< 2 hr", color: "#FFC043" },
    { label: "Refund rate",   value: "100%",   color: accent     },
    { label: "Verified stations", value: "1,240+", color: "#C4B5FD" },
  ];

  return (
    <section
      ref={sectionRef}
      className="section-fade"
      style={{
        padding: "100px 60px 80px",
        background: isLight
          ? "linear-gradient(180deg,#EEF3F7 0%,#F6F8FA 100%)"
          : t.bg,
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Ambient glows */}
      <div style={{
        position: "absolute", top: "30%", left: "15%", transform: "translate(-50%,-50%)",
        width: 700, height: 600, borderRadius: "50%", pointerEvents: "none",
        background: isLight
          ? "radial-gradient(ellipse,rgba(0,210,106,.05) 0%,transparent 65%)"
          : "radial-gradient(ellipse,rgba(0,230,118,.06) 0%,transparent 65%)",
        animation: "aurora-shift 22s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "20%", right: "5%",
        width: 500, height: 500, borderRadius: "50%", pointerEvents: "none",
        background: isLight
          ? "radial-gradient(ellipse,rgba(0,184,94,.04) 0%,transparent 65%)"
          : "radial-gradient(ellipse,rgba(0,230,118,.04) 0%,transparent 65%)",
      }} />

      <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Section header ── */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
            background: isLight ? "rgba(0,210,106,.08)" : "rgba(0,230,118,.08)",
            border: `1px solid ${isLight ? "rgba(0,210,106,.2)" : "rgba(0,230,118,.2)"}`,
            borderRadius: 999, padding: "5px 16px",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: accent,
              display: "inline-block", boxShadow: `0 0 8px ${accent}`,
              animation: "glow-pulse 2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: accent }}>FAQ</span>
          </div>

          <h2 style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "clamp(28px,3.5vw,46px)", fontWeight: 800,
            letterSpacing: "-.04em", color: t.text, lineHeight: 1.08, marginBottom: 14,
          }}>
            Everything you need<br />
            <span style={{
              background: `linear-gradient(90deg,${accent},${isLight ? "#06B6D4" : "#22D3EE"})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              color: "transparent", display: "inline-block",
            }}>to know.</span>
          </h2>
          <p style={{ color: t.textSub, fontSize: 16, lineHeight: 1.75, maxWidth: 480, margin: "0 auto" }}>
            Quick answers about booking, payments, and getting started with India&apos;s fastest EV charging network.
          </p>
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 48, alignItems: "start" }}>

          {/* ── Left: sticky panel ── */}
          <div style={{ position: "sticky", top: 100, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Category filter */}
            <div style={{
              background: isLight ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.03)",
              border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.06)"}`,
              borderRadius: 16, padding: "18px 20px", backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: t.textMuted, marginBottom: 12 }}>FILTER BY TOPIC</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {CATS.map(cat => {
                  const count = cat === "All" ? FAQS.length : FAQS.filter(f => f.cat === cat).length;
                  const active = activeCat === cat;
                  return (
                    <button key={cat} onClick={() => handleCat(cat)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: 10, border: "none",
                      cursor: "pointer", width: "100%", textAlign: "left",
                      background: active
                        ? (isLight ? "rgba(0,210,106,.08)" : "rgba(0,230,118,.1)")
                        : "transparent",
                      transition: "background .15s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {active && (
                          <div style={{ width: 3, height: 16, borderRadius: 99, background: accent, flexShrink: 0 }} />
                        )}
                        {!active && <div style={{ width: 3, height: 16, borderRadius: 99, background: "transparent", flexShrink: 0 }} />}
                        <span style={{
                          fontSize: 13.5, fontWeight: active ? 700 : 500,
                          color: active ? accent : t.textSub,
                          transition: "color .15s, font-weight .15s",
                        }}>{cat}</span>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: "2px 8px", borderRadius: 99,
                        background: active
                          ? (isLight ? "rgba(0,210,106,.12)" : "rgba(0,230,118,.15)")
                          : (isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.06)"),
                        color: active ? accent : t.textMuted,
                        fontFamily: "'JetBrains Mono',monospace",
                        transition: "all .15s",
                      }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Uptime bar */}
            <UptimeBar isLight={isLight} accent={accent} />

            {/* Stats 2×2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {stats.map((s, i) => (
                <div key={s.label} style={{
                  padding: "14px 16px", borderRadius: 14,
                  background: isLight ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.03)",
                  border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.06)"}`,
                  backdropFilter: "blur(6px)",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "none" : "translateY(10px)",
                  transition: `opacity .5s ${i * 80}ms, transform .5s ${i * 80}ms`,
                }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 18, fontWeight: 800, color: s.color, marginBottom: 4,
                  }}>{s.value}</div>
                  <div style={{ fontSize: 10.5, color: t.textMuted, lineHeight: 1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Security badge */}
            <div style={{
              background: isLight ? "rgba(139,92,246,.04)" : "rgba(139,92,246,.06)",
              border: `1px solid ${isLight ? "rgba(139,92,246,.15)" : "rgba(139,92,246,.2)"}`,
              borderRadius: 14, padding: "14px 18px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: isLight ? "rgba(139,92,246,.1)" : "rgba(139,92,246,.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>🛡️</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#C4B5FD", marginBottom: 3 }}>
                  PCI-DSS L1 · ISO 27001 · TLS 1.3
                </div>
                <div style={{ fontSize: 10.5, color: t.textMuted, lineHeight: 1.45 }}>
                  HMAC-signed tokens. Zero card data stored.
                </div>
              </div>
            </div>

            {/* ── Need help? quick actions ── */}
            <div style={{
              background: isLight ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.03)",
              border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.06)"}`,
              borderRadius: 16, padding: "18px 20px", backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 14 }}>
                Need a hand? 👋
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { icon: "💬", label: "Live chat", sub: "< 2 min reply", color: accent },
                  { icon: "📧", label: "Email support", sub: "2 hr response", color: "#22D3EE" },
                  { icon: "📞", label: "Call us", sub: "Mon–Sat · 9–6", color: "#FFC043" },
                ].map(opt => (
                  <button key={opt.label} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 10, border: "none",
                    background: isLight ? "rgba(0,0,0,.03)" : "rgba(255,255,255,.03)",
                    cursor: "pointer", transition: "background .15s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.06)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isLight ? "rgba(0,0,0,.03)" : "rgba(255,255,255,.03)"; }}
                  >
                    <span style={{ fontSize: 16 }}>{opt.icon}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>{opt.label}</div>
                      <div style={{ fontSize: 10, color: t.textMuted }}>{opt.sub}</div>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: opt.color,
                      padding: "2px 7px", borderRadius: 6,
                      background: `${opt.color}15`,
                    }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: accordion + contact ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {/* Quick stats bar */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0,
              background: isLight ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.03)",
              border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.06)"}`,
              borderRadius: 14, overflow: "hidden", marginBottom: 4,
              backdropFilter: "blur(8px)",
              opacity: visible ? 1 : 0,
              transition: "opacity .5s",
            }}>
              {[
                { value: "< 2h",   label: "Support reply", color: "#22D3EE" },
                { value: "99.8%",  label: "Uptime",        color: accent      },
                { value: "100%",   label: "Refund rate",   color: "#00E676"   },
                { value: "8 sec",  label: "Avg check-in",  color: "#FFC043"   },
              ].map((s, i) => (
                <div key={s.label} style={{
                  padding: "14px 16px",
                  borderRight: i < 3 ? `1px solid ${isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.05)"}` : "none",
                }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: t.textMuted }}>{s.label}</div>
                </div>
              ))}
            </div>

            {filtered.map((f, i) => (
              <div
                key={`${activeCat}-${f.q}`}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "none" : "translateY(16px)",
                  transition: `opacity .55s ${i * 60}ms cubic-bezier(.2,0,0,1), transform .55s ${i * 60}ms cubic-bezier(.2,0,0,1)`,
                }}
              >
                <FAQItem
                  q={f.q} a={f.a} cat={f.cat}
                  index={i}
                  isOpen={openIdx === i}
                  onToggle={() => toggle(i)}
                  isLight={isLight}
                  tok={t}
                />
              </div>
            ))}

            {/* Contact strip */}
            <div style={{
              marginTop: 8, padding: "20px 24px", borderRadius: 16,
              background: isLight ? "rgba(0,210,106,.05)" : "rgba(0,230,118,.06)",
              border: `1px solid ${isLight ? "rgba(0,210,106,.15)" : "rgba(0,230,118,.18)"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
              opacity: visible ? 1 : 0,
              transition: "opacity .6s .45s",
            }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: t.text, marginBottom: 3 }}>
                  Still have questions?
                </div>
                <div style={{ fontSize: 12.5, color: t.textSub }}>Our support team responds within 2 hours.</div>
              </div>
              <a href="mailto:support@chargingguru.in" style={{
                padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C260"})`,
                color: "#050708", textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap",
                boxShadow: isLight ? "0 4px 14px rgba(0,210,106,.3)" : "0 0 20px rgba(0,230,118,.25)",
                transition: "transform .18s, box-shadow .18s",
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = isLight ? "0 8px 22px rgba(0,210,106,.4)" : "0 0 32px rgba(0,230,118,.4)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "none"; el.style.boxShadow = isLight ? "0 4px 14px rgba(0,210,106,.3)" : "0 0 20px rgba(0,230,118,.25)"; }}
              >
                Contact support →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
