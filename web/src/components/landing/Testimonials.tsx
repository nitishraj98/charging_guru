"use client";
import { useRef, useEffect } from "react";
import { Tok } from "./tokens";

const TESTIMONIALS = [
  { name: "Ravi Menon",   av: "RM", city: "Delhi",     vehicle: "Tata Nexon EV",    badge: "Gold Member",     badgeColor: "#FFC043", text: "Did Delhi→Jaipur in my Nexon EV. Charging Guru pre-booked both stops. Zero anxiety, zero wait. This is how EV road trips should work." },
  { name: "Priya Kapoor", av: "PK", city: "Mumbai",    vehicle: "MG ZS EV",          badge: "Verified Driver", badgeColor: "#22D3EE",  text: "The QR check-in is seamless. Scan, plug, done. No arguing with broken RFID cards. Switched from another app and never looked back." },
  { name: "Sana Qureshi", av: "SQ", city: "Hyderabad", vehicle: "Hyundai IONIQ 5",   badge: "Silver Member",   badgeColor: "#94A3B8",  text: "Finally an Indian charging app that doesn't look like it was made in 2014. The map is gorgeous. Customer support actually responds." },
  { name: "Deepak Nair",  av: "DN", city: "Bengaluru", vehicle: "Station Owner",     badge: "Partner",         badgeColor: "#00E676",  text: "Listed my station 3 months ago. Revenue up 40%. The admin dashboard shows utilisation hour-by-hour. Absolute game changer." },
  { name: "Anita Sharma", av: "AN", city: "Pune",      vehicle: "BYD Atto 3",        badge: "Verified Driver", badgeColor: "#22D3EE",  text: "Love how the app shows live availability. No more driving to a station to find all bays occupied. The pre-booking hold is a lifesaver." },
  { name: "Karan Mehta",  av: "KM", city: "Ahmedabad", vehicle: "Tata Tigor EV",     badge: "Silver Member",   badgeColor: "#94A3B8",  text: "Planned a trip Ahmedabad to Mumbai. Three stops, one checkout. Arrived at every station to find my charger free and waiting." },
  { name: "Nisha Verma",  av: "NV", city: "Chennai",   vehicle: "Mahindra XUV400",   badge: "Gold Member",     badgeColor: "#FFC043",  text: "The rewards system actually adds up. Got a completely free charging session after 3 months. Best EV app in India, hands down." },
  { name: "Rohan Gupta",  av: "RG", city: "Noida",     vehicle: "Tata Nexon EV Max", badge: "Verified Driver", badgeColor: "#22D3EE",  text: "Smart slot hold is brilliant. 15 minutes is exactly enough to complete payment. Never lost a slot since I started using Charging Guru." },
];

function SmallCard({ r, isLight, t }: { r: typeof TESTIMONIALS[0]; isLight: boolean; t: Tok }) {
  return (
    <div style={{
      flexShrink: 0, width: 320,
      background: isLight ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.045)",
      border: `1px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.10)"}`,
      borderRadius: 18, padding: "20px",
      margin: "0 7px",
      backdropFilter: "blur(12px)",
      boxShadow: isLight
        ? "0 2px 20px rgba(0,0,0,.07), 0 1px 4px rgba(0,0,0,.04)"
        : "0 0 0 1px rgba(255,255,255,.06), 0 8px 32px rgba(0,0,0,.4)",
    }}>
      <div style={{ color: "#FFC043", fontSize: 12, marginBottom: 12, letterSpacing: 2 }}>★★★★★</div>
      <p style={{ color: t.textSub, fontSize: 13.5, lineHeight: 1.75, marginBottom: 16 }}>
        &ldquo;{r.text}&rdquo;
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg,#00D26A,#00A855)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 12, color: "#FFF",
          boxShadow: "0 0 10px rgba(0,210,106,.25)",
        }}>{r.av}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{r.name}</span>
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: r.badgeColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#050708" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 1 }}>{r.vehicle} · {r.city}</div>
        </div>
        <span style={{
          fontSize: 8.5, fontWeight: 800, letterSpacing: ".06em",
          color: r.badgeColor, background: `${r.badgeColor}12`,
          border: `1px solid ${r.badgeColor}30`, borderRadius: 6, padding: "3px 7px", flexShrink: 0,
        }}>{r.badge}</span>
      </div>
    </div>
  );
}

export default function Testimonials({ isLight, t }: { isLight: boolean; t: Tok }) {
  const sectionRef = useRef<HTMLDivElement>(null);
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

  const accent = isLight ? "#00D26A" : "#00E676";

  /* Marquee fade edge colours must match section bg exactly */
  const edgeColor1 = isLight ? "#F0F5F9" : "#07090F";
  const edgeColor2 = isLight ? "#EDF1F6" : "#060810";

  return (
    <section
      ref={sectionRef}
      className="section-fade"
      style={{
        padding: "0 0 120px",
        background: isLight
          ? "linear-gradient(180deg, #F0F5F9 0%, #EDF1F6 60%, #F0F5F9 100%)"
          : "linear-gradient(160deg,#07090F 0%,#0A0E18 35%,#080C14 65%,#060810 100%)",
        overflow: "hidden", position: "relative",
      }}
    >
      {/* ── Dark mode decorative background ── */}
      {!isLight && (<>
        {/* Grid lines */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:.16 }} aria-hidden="true">
          <defs>
            <pattern id="testi-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,192,67,0.30)" strokeWidth=".6"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#testi-grid)"/>
        </svg>

        {/* Dot pattern */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:.10 }} aria-hidden="true">
          <defs>
            <pattern id="testi-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(255,192,67,0.55)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#testi-dots)"/>
        </svg>

        {/* Gold glow — top right */}
        <div style={{
          position:"absolute", top:"-8%", right:"-4%",
          width:700, height:700, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(255,192,67,.12) 0%,transparent 60%)",
        }}/>
        {/* Cyan glow — bottom left */}
        <div style={{
          position:"absolute", bottom:"-6%", left:"-3%",
          width:580, height:580, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(34,211,238,.09) 0%,transparent 62%)",
        }}/>
        {/* Green glow — centre */}
        <div style={{
          position:"absolute", top:"40%", left:"30%",
          width:500, height:500, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(0,230,118,.07) 0%,transparent 62%)",
        }}/>
        {/* Purple glow — top left */}
        <div style={{
          position:"absolute", top:"8%", left:"10%",
          width:380, height:380, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(139,92,246,.07) 0%,transparent 62%)",
        }}/>

        {/* Top accent line */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:1, pointerEvents:"none",
          background:"linear-gradient(90deg,transparent 0%,rgba(255,192,67,.40) 35%,rgba(34,211,238,.25) 70%,transparent 100%)",
        }}/>
        {/* Bottom accent line */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:1, pointerEvents:"none",
          background:"linear-gradient(90deg,transparent 0%,rgba(255,192,67,.22) 50%,transparent 100%)",
        }}/>
      </>)}

      {/* ── Light mode ambient glows ── */}
      {isLight && (<>
        <div style={{
          position:"absolute", top:"5%", right:"8%",
          width:620, height:620, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(255,192,67,.07) 0%,transparent 65%)",
        }}/>
        <div style={{
          position:"absolute", bottom:"8%", left:"5%",
          width:480, height:480, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(14,165,233,.05) 0%,transparent 65%)",
        }}/>
      </>)}

      {/* Header */}
      <div style={{ textAlign: "center", padding: "clamp(40px,7vw,80px) clamp(16px,5vw,60px) 0", marginBottom: "clamp(28px,4vw,56px)", position: "relative" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
          background: "rgba(255,192,67,.08)",
          border: "1px solid rgba(255,192,67,.28)",
          borderRadius: 999, padding: "5px 16px",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFC043", display: "inline-block", boxShadow: "0 0 8px #FFC043" }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: "#FFC043" }}>TESTIMONIALS</span>
        </div>
        <h2 style={{
          fontFamily: "'Space Grotesk',sans-serif",
          fontSize: "clamp(26px,3.5vw,46px)", fontWeight: 800, letterSpacing: "-.04em",
          color: t.text, marginBottom: 16, lineHeight: 1.06,
        }}>Loved by EV drivers across India</h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ color: "#FFC043", fontSize: 18, letterSpacing: 2 }}>★★★★★</div>
          <div style={{ fontSize: 14, color: t.textSub }}>4.8 / 5 · 2,400+ reviews</div>
        </div>
      </div>

      {/* ── Marquee rows ── */}
      <div style={{ position: "relative", marginBottom: 14, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: "none", background: `linear-gradient(90deg, ${edgeColor1}, transparent)` }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: "none", background: `linear-gradient(-90deg, ${edgeColor1}, transparent)` }} />
        <div
          style={{ display: "flex", width: "max-content", animation: "slide-left 44s linear infinite" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.animationPlayState = "paused"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.animationPlayState = "running"; }}
        >
          {[...TESTIMONIALS, ...TESTIMONIALS].map((r, i) => (
            <SmallCard key={i} r={r} isLight={isLight} t={t} />
          ))}
        </div>
      </div>

      <div style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: "none", background: `linear-gradient(90deg, ${edgeColor2}, transparent)` }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: "none", background: `linear-gradient(-90deg, ${edgeColor2}, transparent)` }} />
        <div
          style={{ display: "flex", width: "max-content", animation: "slide-left 60s linear infinite reverse" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.animationPlayState = "paused"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.animationPlayState = "running"; }}
        >
          {[...TESTIMONIALS.slice(3), ...TESTIMONIALS, ...TESTIMONIALS.slice(0, 3)].map((r, i) => (
            <SmallCard key={i} r={r} isLight={isLight} t={t} />
          ))}
        </div>
      </div>

      {/* Platform trust row */}
      <div style={{ marginTop: "clamp(28px,4vw,56px)", textAlign: "center", padding: `0 clamp(16px,5vw,60px)`, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
          {[
            { label: "4.8/5 App Store", color: accent },
            { label: "50,000+ EV Drivers", color: "#FFC043" },
            { label: "42 Cities", color: "#22D3EE" },
            { label: "99.8% Uptime", color: "#C4B5FD" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: t.textSub }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
