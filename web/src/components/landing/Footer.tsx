"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { Tok } from "./tokens";

const COLS = [
  {
    heading: "Platform",
    links: [
      { label: "Discover", href: "/discover" },
      { label: "Plan Journey", href: "/plan" },
      { label: "Route Planner", href: "/plan" },
      { label: "Pricing", href: "#pricing" },
      { label: "Membership", href: "/membership" },
    ],
  },
  {
    heading: "Station Owners",
    links: [
      { label: "Partner Program", href: "#" },
      { label: "Station Portal", href: "/owner" },
      { label: "Add Station", href: "/owner" },
      { label: "Revenue Dashboard", href: "/owner" },
      { label: "API Documentation", href: "#" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "API Docs", href: "#" },
      { label: "SDK", href: "#" },
      { label: "Status", href: "#" },
      { label: "Changelog", href: "#" },
      { label: "GitHub", href: "#" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Investors", href: "#" },
      { label: "Press", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Blog", href: "#" },
      { label: "FAQs", href: "#" },
      { label: "Help Center", href: "#" },
      { label: "Support", href: "#" },
      { label: "Community", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
      { label: "Refund Policy", href: "#" },
      { label: "Grievance Officer", href: "#" },
    ],
  },
];

const SOCIALS = [
  {
    name: "Twitter/X", href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
      </svg>
    ),
  },
  {
    name: "LinkedIn", href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
        <circle cx="4" cy="4" r="2"/>
      </svg>
    ),
  },
  {
    name: "Instagram", href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    name: "YouTube", href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
      </svg>
    ),
  },
];

function NetworkVisualization({ isLight }: { isLight: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const cities = [
    { x: 120, y: 30,  label: "Delhi",     chargers: 340, color: "#00E676" },
    { x: 200, y: 60,  label: "Lucknow",   chargers: 89,  color: "#22D3EE" },
    { x: 95,  y: 80,  label: "Jaipur",    chargers: 112, color: "#00E676" },
    { x: 240, y: 100, label: "Patna",     chargers: 54,  color: "#FFC043" },
    { x: 100, y: 130, label: "Ahmedabad", chargers: 143, color: "#22D3EE" },
    { x: 170, y: 120, label: "Bhopal",    chargers: 67,  color: "#00E676" },
    { x: 110, y: 170, label: "Mumbai",    chargers: 480, color: "#00E676" },
    { x: 170, y: 160, label: "Hyderabad", chargers: 216, color: "#C4B5FD" },
    { x: 155, y: 200, label: "Bengaluru", chargers: 302, color: "#00E676" },
    { x: 200, y: 185, label: "Chennai",   chargers: 178, color: "#22D3EE" },
  ];
  const edges: [number,number][] = [[0,1],[0,2],[0,3],[1,3],[2,4],[2,5],[4,6],[5,7],[6,7],[7,8],[7,9],[8,9]];

  useEffect(() => {
    const id = setInterval(() => setActiveIdx(i => (i + 1) % cities.length), 1400);
    return () => clearInterval(id);
  }, [cities.length]);

  const active = cities[activeIdx];

  return (
    <div style={{ position: "relative", width: "100%", height: 230 }}>
      <svg width="100%" height="100%" viewBox="0 0 320 220" style={{ overflow: "visible" }}>
        {/* Edges */}
        {edges.map(([a, b], i) => (
          <line key={i}
            x1={cities[a].x} y1={cities[a].y} x2={cities[b].x} y2={cities[b].y}
            stroke={isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.06)"}
            strokeWidth="1" />
        ))}
        {/* Active pulse edge */}
        {edges.filter(([a, b]) => a === activeIdx || b === activeIdx).map(([a, b], i) => (
          <line key={`a${i}`}
            x1={cities[a].x} y1={cities[a].y} x2={cities[b].x} y2={cities[b].y}
            stroke={active.color} strokeWidth="1.5" opacity=".5"
            strokeDasharray="4 3"
            style={{ animation: "route-dash 1.5s linear infinite" }} />
        ))}
        {/* Nodes */}
        {cities.map((c, i) => (
          <g key={i}>
            {i === activeIdx && <circle cx={c.x} cy={c.y} r="14" fill={`${c.color}15`} style={{ animation: "ping-green 1.4s ease-out infinite" }} />}
            <circle cx={c.x} cy={c.y} r={i === activeIdx ? 6 : 4} fill={c.color}
              style={{ filter: i === activeIdx ? `drop-shadow(0 0 6px ${c.color})` : "none", transition: "r .3s, filter .3s" }} />
            {i === activeIdx && (
              <g>
                <rect x={c.x + 10} y={c.y - 16} width={c.label.length * 6.5 + 16} height={22} rx="5"
                  fill={isLight ? "rgba(255,255,255,.95)" : "rgba(14,20,22,.95)"}
                  stroke={c.color} strokeWidth="1" />
                <text x={c.x + 18} y={c.y - 1} fontSize="8.5" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fill={c.color}>{c.label}</text>
                <text x={c.x + 18} y={c.y + 9} fontSize="7" fontFamily="monospace" fill={isLight ? "#6B7280" : "#6B7479"}>{c.chargers} stations</text>
              </g>
            )}
          </g>
        ))}
      </svg>
      {/* Live badge */}
      <div style={{
        position: "absolute", bottom: 0, right: 0,
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 20,
        background: isLight ? "rgba(255,255,255,.85)" : "rgba(14,20,22,.85)",
        border: `1px solid ${isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.08)"}`,
        backdropFilter: "blur(6px)",
        fontSize: 9, fontWeight: 700,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E676", display: "inline-block", boxShadow: "0 0 5px #00E676", animation: "glow-pulse 2s ease-in-out infinite" }} />
        <span style={{ color: isLight ? "#374151" : "#9CA3AF" }}>LIVE NETWORK</span>
      </div>
    </div>
  );
}

function FooterLink({ label, href, isLight, accent }: { label: string; href: string; isLight: boolean; accent: string }) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 13.5,
        color: isLight ? "#6B7280" : "#6B7479",
        textDecoration: "none",
        transition: "color .15s, transform .15s",
        display: "inline-block",
        lineHeight: 1.4,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.color = accent;
        el.style.transform = "translateX(3px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.color = isLight ? "#6B7280" : "#6B7479";
        el.style.transform = "none";
      }}
    >
      {label}
    </Link>
  );
}

export default function Footer({ isLight }: { isLight: boolean; t: Tok }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [online, setOnline] = useState(1284);
  const [liveChargers, setLiveChargers] = useState(3847);
  const sectionRef = useRef<HTMLDivElement>(null);

  const accent = isLight ? "#00D26A" : "#00E676";
  const accentDim = isLight ? "rgba(0,210,106,0.1)" : "rgba(0,230,118,0.08)";

  // Simulate live counters
  useEffect(() => {
    const id = setInterval(() => {
      setOnline(v => v + Math.floor(Math.random() * 5) - 2);
      setLiveChargers(v => v + Math.floor(Math.random() * 3) - 1);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSubscribed(true);
  }

  const footerBg = isLight
    ? "linear-gradient(180deg, #F1F5F9 0%, #E8EEF2 100%)"
    : "linear-gradient(180deg, #080B0C 0%, #050708 100%)";

  return (
    <footer
      ref={sectionRef}
      style={{
        background: footerBg,
        borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 800, height: 300, borderRadius: "50%", pointerEvents: "none",
        background: isLight
          ? "radial-gradient(ellipse, rgba(0,210,106,0.05) 0%, transparent 65%)"
          : "radial-gradient(ellipse, rgba(0,230,118,0.04) 0%, transparent 65%)",
      }}/>

      {/* Background grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: isLight
          ? "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)"
          : "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        maskImage: "linear-gradient(180deg, transparent, rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.5) 70%, transparent)",
      }}/>

      {/* Main content */}
      <div style={{ position: "relative", padding: "72px 64px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1fr", gap: 40, marginBottom: 64 }}>

          {/* Left col — brand */}
          <div>
            <div style={{ marginBottom: 20 }}>
              <Logo size="lg" href="/" theme={isLight ? "light" : "dark"} />
            </div>
            <p style={{ color: isLight ? "#4B5563" : "#6B7479", fontSize: 13.5, lineHeight: 1.8, marginBottom: 28, maxWidth: 260 }}>
              India&apos;s most reliable EV charging platform. Plan every stop, reserve guaranteed slots, and charge with confidence.
            </p>

            {/* App buttons */}
            <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
              {[
                {
                  label: "App Store", sub: "Download on the",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.3.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  ),
                },
                {
                  label: "Google Play", sub: "Get it on",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.18 23.76c.38.21.82.22 1.22.04l12.34-7.13-2.65-2.64-10.91 9.73zM20.59 10.17l-2.76-1.6-3.01 3.01 3.01 3.01 2.77-1.61c.79-.46.79-1.35-.01-1.81zM1.55.43C1.21.65 1 1.01 1 1.47v20.99c0 .47.21.84.56 1.05l.1.06L12.97 12.5 1.65.37l-.1.06zM4.4.24L15.31 6.3 12.97 8.63 2.6.51 4.4.24z"/>
                    </svg>
                  ),
                },
              ].map(app => (
                <button key={app.label} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 12,
                  background: isLight ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)"}`,
                  cursor: "pointer", color: isLight ? "#111827" : "#E2E8F0",
                  transition: "all .2s",
                  backdropFilter: "blur(8px)",
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget;
                    el.style.borderColor = accent;
                    el.style.transform = "translateY(-2px)";
                    el.style.boxShadow = `0 4px 16px ${accentDim}`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    el.style.borderColor = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)";
                    el.style.transform = "none";
                    el.style.boxShadow = "none";
                  }}
                >
                  <span style={{ color: isLight ? "#374151" : "#9CA3AF" }}>{app.icon}</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 9, color: isLight ? "#6B7280" : "#6B7479", lineHeight: 1.2 }}>{app.sub}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{app.label}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Newsletter */}
            {!subscribed ? (
              <form onSubmit={handleSubscribe}>
                <div style={{ fontSize: 12, fontWeight: 600, color: isLight ? "#374151" : "#9CA3AF", marginBottom: 10, letterSpacing: ".05em" }}>
                  STAY UPDATED
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 13,
                      background: isLight ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)"}`,
                      color: isLight ? "#111827" : "#E2E8F0",
                      outline: "none",
                    }}
                  />
                  <button type="submit" style={{
                    padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    background: `linear-gradient(135deg, ${accent}, ${isLight ? "#00A348" : "#00C15A"})`,
                    color: isLight ? "#FFF" : "#020A04",
                    border: "none", cursor: "pointer",
                    transition: "transform .15s, box-shadow .15s",
                    boxShadow: `0 2px 12px ${isLight ? "rgba(0,210,106,0.4)" : "rgba(0,230,118,0.3)"}`,
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
                  >→</button>
                </div>
              </form>
            ) : (
              <div style={{
                padding: "12px 16px", borderRadius: 10,
                background: isLight ? "rgba(0,210,106,0.08)" : "rgba(0,230,118,0.08)",
                border: `1px solid ${isLight ? "rgba(0,210,106,0.2)" : "rgba(0,230,118,0.15)"}`,
                fontSize: 13, color: accent, fontWeight: 600,
              }}>
                ✓ You&apos;re on the list! We&apos;ll be in touch.
              </div>
            )}

            {/* Social icons */}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              {SOCIALS.map(s => (
                <a key={s.name} href={s.href} title={s.name} style={{
                  width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                  background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)"}`,
                  color: isLight ? "#6B7280" : "#6B7479",
                  textDecoration: "none",
                  transition: "all .2s",
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = accentDim;
                    el.style.borderColor = accent;
                    el.style.color = accent;
                    el.style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)";
                    el.style.borderColor = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)";
                    el.style.color = isLight ? "#6B7280" : "#6B7479";
                    el.style.transform = "none";
                  }}
                >{s.icon}</a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map(col => (
            <div key={col.heading}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: ".14em",
                color: isLight ? "#9CA3AF" : "#4B5563",
                marginBottom: 18,
                textTransform: "uppercase",
              }}>
                {col.heading}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {col.links.map(l => (
                  <FooterLink key={l.label} label={l.label} href={l.href} isLight={isLight} accent={accent} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* EV Illustration row */}
        <div style={{
          padding: "32px 0",
          borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"}`,
          borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"}`,
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 40, alignItems: "center",
          marginBottom: 0,
        }}>
          {/* Left: tagline */}
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16,
              background: isLight ? "rgba(0,210,106,0.08)" : "rgba(0,230,118,0.07)",
              border: `1px solid ${isLight ? "rgba(0,210,106,0.2)" : "rgba(0,230,118,0.15)"}`,
              borderRadius: 999, padding: "5px 14px",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, display: "inline-block", boxShadow: `0 0 8px ${accent}`, animation: "glow-pulse 2s ease-in-out infinite" }}/>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", color: accent }}>POWERED BY INDIA</span>
            </div>
            <h3 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 700,
              letterSpacing: "-.03em", lineHeight: 1.2,
              color: isLight ? "#0F172A" : "#E6EBED",
              marginBottom: 12,
            }}>
              Every kilometre.<br />Every charger.{" "}
              <span className="footer-covered-gradient">Covered.</span>
            </h3>
            <p style={{ color: isLight ? "#6B7280" : "#6B7479", fontSize: 14, lineHeight: 1.7, maxWidth: 360 }}>
              Join 50,000+ drivers who plan smarter routes, book guaranteed slots, and never worry about range anxiety again.
            </p>
          </div>

          {/* Right: Live India network visualization */}
          <NetworkVisualization isLight={isLight} />
        </div>

        {/* Bottom bar */}
        <div style={{
          padding: "22px 0 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16,
        }}>
          {/* Copyright */}
          <div style={{ fontSize: 12.5, color: isLight ? "#9CA3AF" : "#4B5563" }}>
            © 2026 Charging Guru Technologies Pvt. Ltd. · Made in India 🇮🇳
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {[
              { icon: "🔒", label: "PCI-DSS L1" },
              { icon: "⚡", label: "Razorpay" },
              { icon: "🛡️", label: "ISO 27001" },
            ].map(b => (
              <div key={b.label} style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 11.5, color: isLight ? "#9CA3AF" : "#4B5563",
                padding: "4px 10px", borderRadius: 7,
                background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)"}`,
              }}>
                <span>{b.icon}</span>
                <span style={{ fontWeight: 600 }}>{b.label}</span>
              </div>
            ))}

            {/* Divider */}
            <div style={{ width: 1, height: 18, background: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)" }}/>

            {/* Live status */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                color: "#00E676",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#00E676",
                  display: "inline-block",
                  boxShadow: "0 0 6px #00E676",
                  animation: "glow-pulse 2s ease-in-out infinite",
                }}/>
                <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>
                  {online.toLocaleString()} online
                </span>
              </div>
              <span style={{ color: isLight ? "#D1D5DB" : "#374151" }}>·</span>
              <span style={{ color: isLight ? "#6B7280" : "#6B7479", fontFamily: "'JetBrains Mono',monospace" }}>
                {liveChargers.toLocaleString()} chargers live
              </span>
            </div>

            {/* Server status */}
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 11.5, color: "#00E676",
              padding: "4px 10px", borderRadius: 7,
              background: "rgba(0,230,118,0.06)",
              border: "1px solid rgba(0,230,118,0.15)",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E676", display: "inline-block", boxShadow: "0 0 5px #00E676" }}/>
              <span style={{ fontWeight: 700 }}>All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
