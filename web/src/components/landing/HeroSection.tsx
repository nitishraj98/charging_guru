"use client";
import Link from "next/link";
import { Tok } from "./tokens";

function CopyContent({ isLight }: { isLight: boolean }) {
  return (
    <>
      {/* Badge */}
      <div className="hero-badge" style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        padding: "8px 16px 8px 10px", borderRadius: 999, marginBottom: 36,
        background: isLight ? "rgba(0,210,106,0.09)" : "rgba(0,230,118,0.05)",
        border: isLight ? "1px solid rgba(0,210,106,0.22)" : "1px solid rgba(0,230,118,0.18)",
        width: "fit-content", backdropFilter: "blur(8px)",
      }}>
        <span style={{ position: "relative", display: "flex", width: 10, height: 10, flexShrink: 0 }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: isLight ? "#00D26A" : "#00E676", opacity: .7, animation: "ping-green 1.8s cubic-bezier(0,0,.2,1) infinite" }} />
          <span style={{ position: "relative", width: 10, height: 10, borderRadius: "50%", background: isLight ? "#00D26A" : "#00E676" }} />
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", color: isLight ? "#059669" : "#4DFFA6" }}>
          India&apos;s Fastest Growing EV Network
        </span>
        <span style={{ padding: "2px 8px", borderRadius: 999, background: isLight ? "#DCFCE7" : "rgba(0,230,118,0.15)", border: isLight ? "1px solid #86EFAC" : "1px solid rgba(0,230,118,0.25)", fontSize: 10, fontWeight: 700, color: isLight ? "#16A34A" : "#00E676", letterSpacing: ".06em" }}>LIVE</span>
      </div>

      {/* Headline */}
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(40px,4.6vw,66px)", lineHeight: 1.06, letterSpacing: "-.04em" }}>
        <span style={{ display: "block" }}>
          <span className="hero-word hero-w1" style={{ color: isLight ? "#0F172A" : "#B2FFD6" }}>Plan&nbsp;</span>
          <span className="hero-word hero-w2 hero-grad-smarter" style={{
            color: isLight ? undefined : "#00E676",
            textShadow: isLight ? "none" : "0 0 32px rgba(0,230,118,.7)",
            animation: isLight ? "hero-word-in .9s cubic-bezier(.16,1,.3,1) .18s both" : "hero-word-in .9s cubic-bezier(.16,1,.3,1) .18s both,glow-green-pulse 3s ease-in-out 1.2s infinite",
          }}>Smarter.</span>
        </span>
        <span style={{ display: "block", marginTop: "0.06em" }}>
          <span className="hero-word hero-w3" style={{ color: isLight ? "#0F172A" : "#A5F3FC" }}>Charge&nbsp;</span>
          <span className="hero-word hero-w4 hero-grad-faster" style={{
            color: isLight ? undefined : "#22D3EE",
            textShadow: isLight ? "none" : "0 0 32px rgba(34,211,238,.65)",
            animation: isLight ? "hero-word-in .9s cubic-bezier(.16,1,.3,1) .48s both" : "hero-word-in .9s cubic-bezier(.16,1,.3,1) .48s both,glow-cyan-pulse 3.4s ease-in-out 1.5s infinite",
          }}>Faster.</span>
        </span>
        <span style={{ display: "block", marginTop: "0.06em" }}>
          <span className="hero-word hero-w5" style={{ color: isLight ? "#0F172A" : "#C4B5FD" }}>Travel&nbsp;</span>
          <span className="hero-word hero-w6 hero-grad-text" style={{
            animation: "hero-word-in .9s cubic-bezier(.16,1,.3,1) .76s both",
            filter: isLight ? "none" : "drop-shadow(0 0 18px rgba(77,255,166,.5))",
          }}>Further.</span>
        </span>
      </h1>

      {/* Sub-copy */}
      <div className="hero-sub" style={{ margin: "28px 0 40px", maxWidth: 420 }}>
        <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.45, color: isLight ? "#1E293B" : "#D4EDE0", marginBottom: 10 }}>
          Never worry about range anxiety again.
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.8, color: isLight ? "#475569" : "#5A6368" }}>
          Discover chargers on your route, reserve guaranteed slots, pay seamlessly, and arrive knowing your charger is waiting.
        </p>
      </div>

      {/* CTAs */}
      <div className="hero-ctas" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/plan" style={{
          display: "inline-flex", alignItems: "center", gap: 9,
          padding: "16px 30px", borderRadius: 14, fontSize: 15, fontWeight: 700,
          background: "linear-gradient(135deg,#00D26A,#00A855)",
          color: "#FFF", textDecoration: "none",
          boxShadow: isLight ? "0 4px 16px rgba(0,210,106,0.4),0 1px 3px rgba(0,0,0,0.1)" : "0 0 0 1px rgba(0,210,106,0.5),0 0 40px rgba(0,210,106,0.3)",
          transition: "transform .2s,box-shadow .2s",
        }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = isLight ? "0 8px 24px rgba(0,210,106,0.5)" : "0 0 0 1px rgba(0,210,106,0.7),0 0 55px rgba(0,210,106,0.4)"; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "none"; el.style.boxShadow = isLight ? "0 4px 16px rgba(0,210,106,0.4),0 1px 3px rgba(0,0,0,0.1)" : "0 0 0 1px rgba(0,210,106,0.5),0 0 40px rgba(0,210,106,0.3)"; }}
        >
          Plan My Journey
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <Link href="/discover" style={{
          display: "inline-flex", alignItems: "center", gap: 9,
          padding: "16px 26px", borderRadius: 14, fontSize: 15, fontWeight: 600,
          background: isLight ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.07)",
          color: isLight ? "#1E293B" : "#B8C8BE",
          textDecoration: "none",
          border: isLight ? "1px solid rgba(15,23,42,0.14)" : "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(14px)",
          transition: "background .2s,transform .2s",
        }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.background = isLight ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.1)"; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "none"; el.style.background = isLight ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.07)"; }}
        >
          Browse Chargers
        </Link>
      </div>
    </>
  );
}

export default function HeroSection({ isLight }: { isLight: boolean; t: Tok }) {

  const bg   = isLight ? "#F8FAFC" : "#060809";
  const fade = isLight ? "#F8FAFC" : "#060809";

  return (
    <div className="hero-two-col" style={{
      position: "relative", minHeight: "clamp(520px,56vw,720px)", background: bg,
      display: "grid", gridTemplateColumns: "42% 58%", overflow: "hidden",
    }}>
      {/* Left: copy */}
      <div className="hero-left-col" style={{ position: "relative", zIndex: 3, display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(40px,5vw,64px) clamp(20px,4vw,52px) clamp(72px,10vw,120px) clamp(20px,4vw,52px)" }}>
        <CopyContent isLight={isLight} />
      </div>

      {/* Right: hero image */}
      <div className="hero-right-col" style={{ position: "relative", height: "100%", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={isLight ? "/hero-banner-light.png" : "/hero-banner.png"}
          alt="EV charging station"
          style={isLight
            ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "right center" }
            : { position: "absolute", top: "50%", left: 0, width: "100%", height: "auto", transform: "translateY(-50%)" }
          }
        />
        <div style={{
          position: "absolute", inset: 0,
          background: isLight
            ? `linear-gradient(to right, ${bg} 0%, rgba(248,250,252,.8) 12%, rgba(248,250,252,.3) 30%, transparent 55%)`
            : `linear-gradient(to right,${bg} 0%,rgba(6,8,9,.18) 20%,transparent 45%)`,
          pointerEvents: "none",
        }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: `linear-gradient(transparent,${fade})`, pointerEvents: "none" }} />
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, zIndex: 8, background: `linear-gradient(transparent,${fade})`, pointerEvents: "none" }} />
    </div>
  );
}
