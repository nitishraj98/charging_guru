"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { bookings, Booking } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

function QRSvg({ token, accent }: { token: string; accent: string }) {
  const seed = token.length > 0 ? token : "fallback-token-for-display-only";
  const size = 9;
  const bits = Array.from({ length: size * size }, (_, i) => {
    const r = Math.floor(i / size), c = i % size;
    const v = seed.charCodeAt(i % seed.length);
    // finder patterns at corners
    if ((r < 3 && c < 3) || (r < 3 && c > size - 4) || (r > size - 4 && c < 3)) return true;
    return (v + i * 13 + i * i * 7) % 3 !== 0;
  });
  const cell = 180 / size;
  return (
    <svg width="180" height="180" viewBox={`0 0 180 180`} style={{ display: "block" }}>
      <rect width="180" height="180" fill="#050708" rx="10"/>
      {bits.map((on, i) => on ? (
        <rect key={i} x={(i % size) * cell + 1} y={Math.floor(i / size) * cell + 1} width={cell - 1.5} height={cell - 1.5} rx="1.5" fill={accent}/>
      ) : null)}
    </svg>
  );
}

function QrInner() {
  const router = useRouter();
  const { id: bookingId } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const qrToken = sp.get("token") ?? "";
  const { isLight } = useTheme();
  const [booking, setBooking] = useState<Booking | null>(null);

  const accent      = isLight ? "#00D26A" : "#00E676";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#6B7479";
  const textMuted   = isLight ? "#94A3B8" : "#495154";
  const accentDim   = isLight ? "rgba(0,210,106,.08)" : "rgba(0,230,118,.07)";
  const accentBrd   = isLight ? "rgba(0,210,106,.30)" : "rgba(0,230,118,.20)";

  useEffect(() => {
    bookings.get(bookingId).then(setBooking).catch(() => {});
  }, [bookingId]);

  const slot = booking?.slot_start ? new Date(booking.slot_start) : null;
  const slotDate = slot?.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) ?? "";
  const slotTime = slot?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) ?? "";
  const duration = booking?.slot_start && booking?.slot_end
    ? Math.round((new Date(booking.slot_end).getTime() - new Date(booking.slot_start).getTime()) / 60000)
    : 60;
  const amountRs = booking?.amount ? (booking.amount / 100).toLocaleString("en-IN") : "—";

  return (
    <div style={{ background: isLight?"#F8FAFC":"#080B0C", minHeight: "100vh", fontFamily: "'Space Grotesk',system-ui,sans-serif" }}>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @keyframes fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes check-pop{0%{transform:scale(0)}70%{transform:scale(1.15)}100%{transform:scale(1)}}
        @keyframes glow-ring{0%,100%{box-shadow:0 0 0 0 ${accentBrd},0 0 30px ${accentBrd}}50%{box-shadow:0 0 0 6px rgba(0,230,118,.05),0 0 50px rgba(0,230,118,.2)}}
        .qr-fade{animation:fade-up .5s cubic-bezier(.16,1,.3,1) both}
        .check-icon{animation:check-pop .5s cubic-bezier(.36,1.5,.6,1) .2s both}
        .glow-ring{animation:glow-ring 2.5s ease-in-out infinite}
        .action-btn{transition:all .18s cubic-bezier(.16,1,.3,1)}
        .action-btn:hover{transform:translateY(-2px)}
      `}</style>
      <NavBar />

      <div className="qr-fade" style={{ maxWidth: 400, margin: "0 auto", padding: "40px 20px 80px", textAlign: "center" }}>

        {/* Success icon */}
        <div className="check-icon glow-ring" style={{ width: 70, height: 70, borderRadius: 22, margin: "0 auto 20px", background: isLight?"linear-gradient(135deg,#DCFCE7,#F0FDF4)":"linear-gradient(135deg,#0E2A1C,#050708)", border: `1.5px solid ${accentBrd}`, display: "grid", placeItems: "center" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke={accent} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2 style={{ fontSize: 26, fontWeight: 800, color: textPrimary, marginBottom: 8 }}>Booking Confirmed!</h2>
        <p style={{ color: textSub, fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>
          Show this QR pass to the charging station<br/>operator to begin your session.
        </p>

        {/* Ticket card */}
        <div style={{ background: isLight?"#FFFFFF":"#101415", border: `1px solid ${isLight?"#E2E8F0":"#1E2426"}`, borderRadius: 24, overflow: "hidden", maxWidth: 340, margin: "0 auto 28px", boxShadow: isLight?"0 12px 40px rgba(0,0,0,.10)":"0 20px 60px rgba(0,0,0,.5)" }}>

          {/* Ticket header */}
          <div style={{ background: isLight?"linear-gradient(135deg,#F0FDF4,#ECFDF5)":"linear-gradient(135deg,#0E2A1C,#0d1e13)", padding: "18px 20px", borderBottom: `1px solid ${accentBrd}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 10, color: accent, fontWeight: 700, letterSpacing: ".1em", marginBottom: 6, textTransform: "uppercase", opacity: .8 }}>Charging Pass</div>
                <div style={{ fontWeight: 800, fontSize: 17, color: textPrimary, marginBottom: 2 }}>
                  {booking?.charger?.label ?? "Bay 1"}
                </div>
                <div style={{ fontSize: 12, color: textSub }}>
                  {booking?.charger?.connector_type ?? "CCS2"} · {booking?.charger?.power_kw ?? "60"}kW
                </div>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 999, background: accentDim, border: `1px solid ${accentBrd}` }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, display: "inline-block", boxShadow: `0 0 6px ${accent}` }} />
                <span style={{ fontSize: 11, color: accent, fontWeight: 700, letterSpacing: ".04em" }}>VALID</span>
              </div>
            </div>
          </div>

          {/* QR code */}
          <div style={{ padding: "24px 20px", background: "#050708", display: "flex", justifyContent: "center" }}>
            <div style={{ padding: 12, background: "#050708", borderRadius: 14, border: `1px solid rgba(0,230,118,.12)`, boxShadow: `0 0 30px rgba(0,230,118,.12)` }}>
              <QRSvg token={qrToken} accent={accent}/>
            </div>
          </div>

          {/* Perforation */}
          <div style={{ position: "relative", height: 0, borderTop: `2px dashed ${isLight?"#E2E8F0":"#222829"}` }}>
            <div style={{ position: "absolute", left: -14, top: "50%", transform: "translateY(-50%)", width: 26, height: 26, borderRadius: "50%", background: isLight?"#F8FAFC":"#080B0C", border: `1px solid ${isLight?"#E2E8F0":"#222829"}` }}/>
            <div style={{ position: "absolute", right: -14, top: "50%", transform: "translateY(-50%)", width: 26, height: 26, borderRadius: "50%", background: isLight?"#F8FAFC":"#080B0C", border: `1px solid ${isLight?"#E2E8F0":"#222829"}` }}/>
          </div>

          {/* Booking info grid */}
          <div style={{ padding: "20px 20px 20px", background: isLight?"#FFFFFF":"#101415" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px", textAlign: "left", marginBottom: 14 }}>
              {[
                { label: "DATE",     val: slotDate || "Today",       mono: false },
                { label: "TIME",     val: slotTime || "07:00 AM",    mono: false },
                { label: "DURATION", val: `${duration} min`,         mono: false },
                { label: "AMOUNT",   val: `₹${amountRs}`,            mono: true  },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 10, color: textMuted, fontWeight: 700, letterSpacing: ".08em", marginBottom: 4, textTransform: "uppercase" }}>{r.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, fontFamily: r.mono?"'JetBrains Mono',monospace":undefined }}>{r.val}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 11, background: accentDim, border: `1px solid ${accentBrd}` }}>
              <p style={{ fontSize: 11, color: accent, textAlign: "center", fontWeight: 600 }}>
                Single use · Valid 24 hours · Non-transferable
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, maxWidth: 340, margin: "0 auto 16px" }}>
          <button className="action-btn" onClick={() => router.push("/discover")} style={{ flex: 1, padding: "13px 16px", borderRadius: 14, background: isLight?"#FFFFFF":"#101415", border: `1px solid ${isLight?"#E2E8F0":"#1E2426"}`, color: textPrimary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            📍 Get directions
          </button>
          <button className="action-btn" onClick={() => router.push(`/bookings/${bookingId}`)} style={{ flex: 1, padding: "13px 16px", borderRadius: 14, background: accentDim, border: `1px solid ${accentBrd}`, color: accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            📋 View booking
          </button>
        </div>

        <button onClick={() => router.push("/trips")} style={{ background: "none", border: "none", color: textMuted, fontSize: 13, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: "8px 0" }}>
          View all trips →
        </button>
      </div>
    </div>
  );
}

export default function QrPage() {
  return (
    <Suspense fallback={null}>
      <QrInner />
    </Suspense>
  );
}
