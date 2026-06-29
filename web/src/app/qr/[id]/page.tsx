"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { bookings, Booking } from "@/lib/api";
import NavBar from "@/components/NavBar";

function QRSvg({ token }: { token: string }) {
  const seed = token.length > 0 ? token : "fallback-token-for-display-only";
  const bits = Array.from({ length: 7 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => {
      const v = seed.charCodeAt((r * 7 + c) % seed.length);
      if ((r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3)) return 1;
      return v % 2;
    })
  );
  return (
    <svg viewBox="0 0 7 7" width={180} height={180} shapeRendering="crispEdges">
      <rect width="7" height="7" fill="#050708"/>
      {bits.map((row, r) => row.map((bit, c) => bit ? (
        <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#00E676"/>
      ) : null))}
    </svg>
  );
}

export default function QrPage() {
  const router = useRouter();
  const { id: bookingId } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const qrToken = sp.get("token") ?? "";
  const [booking, setBooking] = useState<Booking | null>(null);

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
    <div style={{ background: "#0A0D0E", minHeight: "100vh" }}>
      <NavBar />
      <div className="fade-up" style={{ maxWidth: 480, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>

        {/* Success header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
            background: "radial-gradient(circle,#0E2A1C,#050708)",
            border: "1px solid rgba(0,230,118,.3)",
            display: "grid", placeItems: "center",
            boxShadow: "0 0 0 1px rgba(0,230,118,.2),0 0 30px rgba(0,230,118,.15)",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 24, marginBottom: 6 }}>Booking Confirmed!</h2>
          <p style={{ color: "#6B7479", fontSize: 14 }}>
            Show this QR pass to the operator to begin your session.
          </p>
        </div>

        {/* Ticket */}
        <div style={{
          background: "#101415", border: "1px solid #222829",
          borderRadius: 24, overflow: "hidden",
          maxWidth: 320, margin: "0 auto 28px",
          boxShadow: "0 20px 60px rgba(0,0,0,.5)",
        }}>
          {/* Ticket header */}
          <div style={{
            background: "linear-gradient(135deg,#0E2A1C 0%,#0d1e13 50%,#0A0D0E 100%)",
            padding: "18px 20px",
            borderBottom: "1px solid rgba(0,230,118,.1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, color: "#4DFFA6", fontWeight: 600, letterSpacing: ".06em", marginBottom: 4 }}>CHARGING PASS</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#E6EBED" }}>
                  {booking?.charger?.label ?? "Bay 1"}
                </div>
                <div style={{ fontSize: 12, color: "#6B7479", marginTop: 2 }}>
                  {booking?.charger?.connector_type ?? "CCS2"} · {booking?.charger?.power_kw ?? "60"}kW
                </div>
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "5px 10px", borderRadius: 999,
                background: "rgba(0,230,118,.1)", border: "1px solid rgba(0,164,85,.4)",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E676", display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#4DFFA6", fontWeight: 600 }}>VALID</span>
              </div>
            </div>
          </div>

          {/* QR code */}
          <div style={{
            padding: "24px 20px",
            background: "#050708",
            display: "flex", justifyContent: "center",
          }}>
            <div style={{ padding: 10, background: "#050708", borderRadius: 12, border: "1px solid #181D1F" }}>
              <QRSvg token={qrToken} />
            </div>
          </div>

          {/* Perforation */}
          <div style={{
            position: "relative", height: 1, margin: "0 0",
            borderTop: "2px dashed #222829",
          }}>
            <div style={{
              position: "absolute", left: -14, top: "50%", transform: "translateY(-50%)",
              width: 24, height: 24, borderRadius: "50%", background: "#0A0D0E",
              border: "1px solid #222829",
            }} />
            <div style={{
              position: "absolute", right: -14, top: "50%", transform: "translateY(-50%)",
              width: 24, height: 24, borderRadius: "50%", background: "#0A0D0E",
              border: "1px solid #222829",
            }} />
          </div>

          {/* Booking info grid */}
          <div style={{ padding: "18px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", textAlign: "left" }}>
              {[
                { label: "DATE", value: slotDate || "Today" },
                { label: "TIME", value: slotTime || "07:00" },
                { label: "DURATION", value: `${duration} min` },
                { label: "AMOUNT", value: `₹${amountRs}` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 10, color: "#495154", fontWeight: 600, letterSpacing: ".06em", marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: item.label === "AMOUNT" ? "'JetBrains Mono',monospace" : "inherit" }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: "rgba(0,230,118,.05)", border: "1px solid rgba(0,164,85,.2)" }}>
              <p style={{ fontSize: 11, color: "#4DFFA6", textAlign: "center" }}>
                Show to operator · Single use · Valid 24h
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20, maxWidth: 320, margin: "0 auto 20px" }}>
          <button onClick={() => router.push("/discover")} style={{
            flex: 1, padding: "12px 16px", borderRadius: 12,
            background: "#101415", border: "1px solid #222829",
            color: "#E6EBED", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>📍 Directions</button>
          <button style={{
            flex: 1, padding: "12px 16px", borderRadius: 12,
            background: "#101415", border: "1px solid #222829",
            color: "#00E676", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>+ Add to Wallet</button>
        </div>

        <button
          onClick={() => router.push("/trips")}
          style={{
            display: "block", margin: "0 auto", padding: "10px 24px",
            background: "none", border: "none", color: "#6B7479",
            fontSize: 13, cursor: "pointer", textDecoration: "underline",
            textUnderlineOffset: 3,
          }}>
          View all trips →
        </button>
      </div>
    </div>
  );
}
