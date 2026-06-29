"use client";
import { useRef, useEffect, useState } from "react";
import { Tok } from "./tokens";

const FEATURED = {
  name: "Arjun Singh", av: "AS", city: "Bengaluru", vehicle: "BYD Atto 3",
  badge: "Gold Member", badgeColor: "#FFC043",
  text: "Gold membership means I always get priority lanes at peak hours. The app even tells me my car's expected SoC when I arrive. Planned a Bengaluru → Hyderabad run last month — 500 km, 2 stops, zero drama. This is what EV ownership was supposed to feel like.",
  stats: [{ v: "12", l: "Trips planned" }, { v: "840km", l: "Longest journey" }, { v: "4,200", l: "Reward points" }],
};

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
      background: isLight ? "rgba(255,255,255,.9)" : "#0E1416",
      border: `1px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.05)"}`,
      borderRadius: 18, padding: "20px",
      margin: "0 7px",
      backdropFilter: "blur(8px)",
      boxShadow: isLight
        ? "0 2px 20px rgba(0,0,0,.07), 0 1px 4px rgba(0,0,0,.04)"
        : "0 0 0 1px rgba(255,255,255,.03)",
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
  const [hoveredStat, setHoveredStat] = useState<number | null>(null);

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

  return (
    <section
      ref={sectionRef}
      className="section-fade"
      style={{
        padding: "0 0 120px",
        background: isLight
          ? "linear-gradient(180deg, #F8FAFD 0%, #F0F5F9 50%, #F6F8FA 100%)"
          : "#060809",
        overflow: "hidden", position: "relative",
      }}
    >
      {/* Gold aurora (distinct from green in other sections) */}
      <div style={{
        position: "absolute", top: "-5%", right: "15%",
        width: 700, height: 500, borderRadius: "50%", pointerEvents: "none",
        background: isLight
          ? "radial-gradient(ellipse, rgba(255,192,67,.06) 0%, rgba(0,184,94,.03) 50%, transparent 70%)"
          : "radial-gradient(ellipse, rgba(255,192,67,.07) 0%, rgba(0,230,118,.03) 50%, transparent 70%)",
        animation: "aurora-shift 22s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "10%", left: "5%",
        width: 500, height: 400, borderRadius: "50%", pointerEvents: "none",
        background: isLight
          ? "radial-gradient(ellipse, rgba(14,165,233,.05) 0%, transparent 65%)"
          : "radial-gradient(ellipse, rgba(34,211,238,.05) 0%, transparent 65%)",
      }} />
      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: isLight
          ? "linear-gradient(rgba(0,0,0,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.03) 1px, transparent 1px)"
          : "linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
        maskImage: "linear-gradient(180deg, transparent 0%, black 10%, black 90%, transparent 100%)",
      }} />

      {/* Header */}
      <div style={{ textAlign: "center", padding: "0 60px", marginBottom: 64, position: "relative" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
          background: "rgba(255,192,67,.08)",
          border: "1px solid rgba(255,192,67,.25)",
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

      {/* ── Featured hero testimonial ── */}
      <div style={{ padding: "0 60px", marginBottom: 48, position: "relative" }}>
        <div style={{
          background: isLight
            ? "linear-gradient(145deg,#FFFBEB,#FFFFFF,#F0FFF8)"
            : "linear-gradient(145deg,#100E00,#0E1416,#0A1510)",
          border: `1.5px solid ${isLight ? "rgba(255,192,67,.3)" : "rgba(255,192,67,.2)"}`,
          borderRadius: 28, padding: "48px 52px",
          maxWidth: 1100, margin: "0 auto",
          boxShadow: isLight
            ? "0 8px 64px rgba(255,192,67,.1), 0 2px 16px rgba(0,0,0,.06), 0 0 0 1px rgba(255,255,255,.8) inset"
            : "0 0 0 1px rgba(255,192,67,.12), 0 0 80px rgba(255,192,67,.06)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Background accent */}
          <div style={{
            position: "absolute", top: -40, right: -40, width: 320, height: 320, borderRadius: "50%",
            background: isLight
              ? "radial-gradient(ellipse, rgba(255,192,67,.12) 0%, transparent 65%)"
              : "radial-gradient(ellipse, rgba(255,192,67,.08) 0%, transparent 65%)",
            pointerEvents: "none",
          }} />

          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto", gap: 48, alignItems: "center" }}>
            <div>
              <div style={{ color: "#FFC043", fontSize: 16, marginBottom: 20, letterSpacing: 2 }}>★★★★★</div>
              {/* Big quote mark */}
              <div style={{ fontFamily: "Georgia,serif", fontSize: 80, lineHeight: 0.6, color: isLight ? "rgba(255,192,67,.15)" : "rgba(255,192,67,.1)", marginBottom: 12, userSelect: "none" }}>&ldquo;</div>
              <p style={{ fontSize: 18, fontWeight: 500, color: t.text, lineHeight: 1.7, maxWidth: 560 }}>
                {FEATURED.text}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#FFC043,#F59E0B)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 16, color: "#020A04",
                  boxShadow: "0 0 16px rgba(255,192,67,.4)",
                }}>{FEATURED.av}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{FEATURED.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#FFC043", background: "rgba(255,192,67,.12)", border: "1px solid rgba(255,192,67,.3)", borderRadius: 6, padding: "2px 8px" }}>GOLD MEMBER</span>
                  </div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{FEATURED.vehicle} · {FEATURED.city}</div>
                </div>
              </div>
            </div>

            {/* Stats column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 150 }}>
              {FEATURED.stats.map((s, i) => (
                <div key={s.l}
                  onMouseEnter={() => setHoveredStat(i)}
                  onMouseLeave={() => setHoveredStat(null)}
                  style={{
                    textAlign: "center", padding: "16px 20px", borderRadius: 16,
                    background: hoveredStat === i
                      ? (isLight ? "rgba(255,192,67,.1)" : "rgba(255,192,67,.07)")
                      : (isLight ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.03)"),
                    border: `1px solid ${hoveredStat === i ? "rgba(255,192,67,.3)" : (isLight ? "rgba(0,0,0,.07)" : "rgba(255,255,255,.07)")}`,
                    transition: "all .2s",
                    cursor: "default",
                  }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 800, color: "#FFC043" }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Marquee rows ── */}
      <div style={{ position: "relative", marginBottom: 14, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: "none", background: `linear-gradient(90deg, ${isLight ? "#F8FAFD" : "#060809"}, transparent)` }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: "none", background: `linear-gradient(-90deg, ${isLight ? "#F8FAFD" : "#060809"}, transparent)` }} />
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
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: "none", background: `linear-gradient(90deg, ${isLight ? "#F0F5F9" : "#060809"}, transparent)` }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, zIndex: 2, pointerEvents: "none", background: `linear-gradient(-90deg, ${isLight ? "#F0F5F9" : "#060809"}, transparent)` }} />
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
      <div style={{ marginTop: 56, textAlign: "center", padding: "0 60px" }}>
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
