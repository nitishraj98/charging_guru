"use client";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

// Compact QR stub — visual placeholder when backend token isn't available
function QRStub({ seed, size = 120 }: { seed: string; size?: number }) {
  const bits = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      if ((r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3)) return 1;
      return seed.charCodeAt((r * 9 + c) % seed.length) % 2;
    })
  );
  return (
    <svg viewBox="0 0 9 9" width={size} height={size} shapeRendering="crispEdges">
      <rect width="9" height="9" fill="#050708" />
      {bits.map((row, r) => row.map((bit, c) => bit ? (
        <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#00E676" />
      ) : null))}
    </svg>
  );
}

function JourneyNewInner() {
  const router = useRouter();
  const sp     = useSearchParams();
  const { isLight } = useTheme();

  const source      = sp.get("source") ?? "Source";
  const destination = sp.get("destination") ?? "Destination";
  const vehicle     = sp.get("vehicle") ?? "EV";
  const stopsCsv    = sp.get("stops") ?? "";
  const totalPaise  = Number(sp.get("total") ?? "0");
  const stops       = stopsCsv ? stopsCsv.split(",") : [];

  const bg          = isLight ? "#F8FAFC" : "#0A0D0E";
  const cardBg      = isLight ? "#FFFFFF" : "#101415";
  const cardBorder  = isLight ? "#E2E8F0" : "#222829";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#6B7479";
  const textMuted   = isLight ? "#94A3B8" : "#495154";
  const accent      = isLight ? "#00D26A" : "#00E676";
  const accentDim   = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBorder = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";

  const journeyId = `JRN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />
      <div className="fade-up" style={{ maxWidth: 520, margin: "0 auto", padding: "40px 24px 80px", textAlign: "center" }}>

        {/* Success header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: "0 auto 20px",
            background: isLight ? "#DCFCE7" : "radial-gradient(circle,#0E2A1C,#050708)",
            border: `1px solid ${accentBorder}`,
            display: "grid", placeItems: "center",
            boxShadow: `0 0 0 1px ${accentBorder},0 0 36px ${accent}30`,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 8, color: textPrimary }}>Journey Reserved!</h2>
          <p style={{ color: textSub, fontSize: 14, lineHeight: 1.6 }}>
            {stops.length} charging stop{stops.length !== 1 ? "s" : ""} secured for your trip from <b style={{ color: textPrimary }}>{source}</b> to <b style={{ color: textPrimary }}>{destination}</b>.
          </p>
        </div>

        {/* Journey Pass ticket */}
        <div style={{
          background: cardBg, border: `1px solid ${cardBorder}`,
          borderRadius: 28, overflow: "hidden",
          boxShadow: isLight ? "0 8px 40px rgba(0,0,0,.08)" : "0 20px 60px rgba(0,0,0,.5)",
          marginBottom: 24,
        }}>
          {/* Header strip */}
          <div style={{
            background: isLight ? "linear-gradient(135deg,#DCFCE7,#F0FDF4)" : "linear-gradient(135deg,#0E2A1C,#101415)",
            padding: "18px 22px",
            borderBottom: `1px solid ${accentBorder}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", color: accent, marginBottom: 4 }}>JOURNEY PASS</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: textPrimary }}>{source} → {destination}</div>
                <div style={{ fontSize: 12, color: textSub, marginTop: 3 }}>{vehicle} · {stops.length} charging stop{stops.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px",
                borderRadius: 999, background: accentDim, border: `1px solid ${accentBorder}`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>CONFIRMED</span>
              </div>
            </div>
          </div>

          {/* Stops with QR */}
          {stops.map((city, i) => (
            <div key={city} style={{ borderBottom: i < stops.length - 1 ? `1px dashed ${cardBorder}` : "none" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", padding: "18px 22px", gap: 16 }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: textMuted, marginBottom: 5 }}>STOP {i + 1} OF {stops.length}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: textPrimary, marginBottom: 3 }}>⚡ {city}</div>
                  <div style={{ fontSize: 12, color: textSub }}>Show QR to operator to begin charging</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: accentDim, border: `1px solid ${accentBorder}`, color: accent }}>VALID</span>
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: isLight ? "#F1F5F9" : "#181D1F", border: `1px solid ${cardBorder}`, color: textSub }}>Single use · 24h</span>
                  </div>
                </div>
                <div style={{ padding: 8, background: "#050708", borderRadius: 10, border: "1px solid #181D1F" }}>
                  <QRStub seed={`${journeyId}-${city}-${i}`} size={96} />
                </div>
              </div>
            </div>
          ))}

          {/* Perforation */}
          <div style={{ position: "relative", height: 1, borderTop: "2px dashed #222829" }}>
            {[-1, 1].map(side => (
              <div key={side} style={{
                position: "absolute", top: "50%", transform: "translateY(-50%)",
                [side === -1 ? "left" : "right"]: -14,
                width: 24, height: 24, borderRadius: "50%", background: bg, border: `1px solid ${cardBorder}`,
              }} />
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: textMuted, marginBottom: 3 }}>JOURNEY ID</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, color: textPrimary }}>{journeyId}</div>
            </div>
            {totalPaise > 0 && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: textMuted, marginBottom: 3 }}>TOTAL PAID</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 18, color: textPrimary }}>
                  ₹{(totalPaise / 100).toLocaleString("en-IN")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next steps */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "18px 20px", marginBottom: 20, textAlign: "left" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: textSub, letterSpacing: ".08em", marginBottom: 14 }}>WHAT HAPPENS NEXT</div>
          {[
            { step: "01", text: "Start driving — your first stop is reserved." },
            { step: "02", text: "Arrive at the charging station. Show the QR code above." },
            { step: "03", text: "Operator scans QR, session starts automatically." },
            { step: "04", text: "After charging, continue to your next stop." },
          ].map(s => (
            <div key={s.step} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: accent, flexShrink: 0, marginTop: 2 }}>{s.step}</span>
              <p style={{ fontSize: 13, color: textSub, lineHeight: 1.5, margin: 0 }}>{s.text}</p>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/trips")} style={{
            flex: 1, padding: "14px", borderRadius: 13,
            background: cardBg, border: `1px solid ${cardBorder}`,
            color: textPrimary, fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>View all trips</button>
          <button onClick={() => router.push("/plan")} style={{
            flex: 1, padding: "14px", borderRadius: 13,
            background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
            color: "#050708", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer",
          }}>Plan another →</button>
        </div>
      </div>
    </div>
  );
}

export default function JourneyNewPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0A0D0E", minHeight: "100vh" }}><NavBar /></div>}>
      <JourneyNewInner />
    </Suspense>
  );
}
