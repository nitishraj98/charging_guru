"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { bookings, payments, Booking, PaymentRecord } from "@/lib/api";
import { checkAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import { Skeleton, BookingDetailSkeleton } from "@/components/Skeleton";

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDING_PAYMENT: { label: "Pending Payment", color: "#FFC043", bg: "rgba(255,192,67,.1)",  icon: "⏳" },
  CONFIRMED:       { label: "Confirmed",        color: "#4DFFA6", bg: "rgba(0,230,118,.1)",   icon: "✓" },
  CHECKED_IN:      { label: "Checked In",       color: "#22D3EE", bg: "rgba(34,211,238,.1)",  icon: "📍" },
  IN_PROGRESS:     { label: "In Progress",      color: "#22D3EE", bg: "rgba(34,211,238,.1)",  icon: "⚡" },
  COMPLETED:       { label: "Completed",        color: "#98A1A6", bg: "rgba(152,161,166,.1)", icon: "✅" },
  CANCELLED:       { label: "Cancelled",        color: "#FF5A5F", bg: "rgba(255,90,95,.1)",   icon: "✕" },
  EXPIRED:         { label: "Expired",          color: "#495154", bg: "rgba(73,81,84,.1)",    icon: "⌛" },
};

// Minimal inline QR-code-like visual (SVG grid pattern)
function QRDisplay({ value, size = 160 }: { value: string; size?: number }) {
  const cells = 9;
  const cell = size / cells;
  // Deterministic fill from value hash
  const bits = Array.from({ length: cells * cells }, (_, i) => {
    const c = value.charCodeAt(i % value.length);
    return (c + i * 13 + i * i * 7) % 3 !== 0;
  });
  // Force finder patterns (top-left, top-right, bottom-left corners)
  const corners = [
    0,1,2,3,4,5,6, 7,14,21,28,35,42, 8,9,10,11,12,13,
    56,57,58,59,60,61,62, 63,70, 72,73,74,75,76,77,78,
  ];
  corners.forEach(i => { if (i < bits.length) bits[i] = true; });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", borderRadius: 8 }}>
      <rect width={size} height={size} fill="#FFFFFF" rx="8"/>
      {bits.map((on, i) => on ? (
        <rect key={i} x={(i % cells) * cell + 2} y={Math.floor(i / cells) * cell + 2} width={cell - 2} height={cell - 2} rx="1.5" fill="#050708"/>
      ) : null)}
    </svg>
  );
}

function Timeline({ status }: { status: string }) {
  const STEPS = [
    { key: "PENDING_PAYMENT", label: "Booked",    icon: "📋" },
    { key: "CONFIRMED",       label: "Confirmed", icon: "✓"  },
    { key: "CHECKED_IN",      label: "At station",icon: "📍" },
    { key: "IN_PROGRESS",     label: "Charging",  icon: "⚡" },
    { key: "COMPLETED",       label: "Done",      icon: "✅" },
  ];
  const ORDER = ["PENDING_PAYMENT","CONFIRMED","CHECKED_IN","IN_PROGRESS","COMPLETED"];
  const currentIdx = ORDER.indexOf(status);
  const isCancelled = status === "CANCELLED" || status === "EXPIRED";

  return (
    <div className="booking-timeline" style={{ gap: 0 }}>
      {STEPS.map((step, i) => {
        const done = currentIdx >= i && !isCancelled;
        const active = currentIdx === i && !isCancelled;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 13,
                background: done ? (active ? "#00E676" : "#00532B") : "transparent",
                border: done ? "none" : "1.5px solid #2E3638",
                color: done ? (active ? "#050708" : "#4DFFA6") : "#495154",
                boxShadow: active ? "0 0 0 4px rgba(0,230,118,.2)" : "none",
                transition: "all .2s",
              }}>{done ? step.icon : ""}</div>
              <span style={{ fontSize: 10, color: done ? "#98A1A6" : "#495154", whiteSpace: "nowrap" }}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done && currentIdx > i ? "#00532B" : "#1A1F21", margin: "0 4px", marginBottom: 18, transition: "background .2s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BookingDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { isLight } = useTheme();
  const [booking, setBooking]   = useState<Booking | null>(null);
  const [payment, setPayment]   = useState<PaymentRecord | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);

  const bg          = isLight ? "#F8FAFC" : "#0A0D0E";
  const cardBg      = isLight ? "#FFFFFF" : "#101415";
  const cardBorder  = isLight ? "#E2E8F0" : "#222829";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#6B7479";
  const textMuted   = isLight ? "#94A3B8" : "#495154";
  const accent      = isLight ? "#00D26A" : "#00E676";
  const accentDim   = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBrd   = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";
  const raisedBg    = isLight ? "#F1F5F9" : "#181D1F";

  function load() {
    setLoading(true); setError("");
    Promise.all([
      bookings.get(id),
      payments.getByBooking(id).catch(() => null),
    ]).then(([b, p]) => {
      setBooking(b);
      setPayment(p);
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load booking");
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    checkAuth().then(ok => { if (!ok) { router.push("/login"); return; } load(); });
    // load is stable (defined outside effect); router/id are the real deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  function downloadInvoice() {
    if (!booking) return;
    const lines = [
      "CHARGING GURU — INVOICE",
      "=".repeat(40),
      `Booking ID : ${booking.id}`,
      `Status     : ${booking.status}`,
      `Slot start : ${booking.slot_start ? new Date(booking.slot_start).toLocaleString("en-IN") : "—"}`,
      `Slot end   : ${booking.slot_end   ? new Date(booking.slot_end).toLocaleString("en-IN")   : "—"}`,
      `Charger    : ${booking.charger?.label ?? "—"} · ${booking.charger?.connector_type ?? "—"} · ${booking.charger?.power_kw ?? "—"}kW`,
      `Station    : ${booking.station?.name ?? "—"}`,
      `Address    : ${booking.station?.address ?? "—"}`,
      `Amount     : ₹${(booking.amount / 100).toLocaleString("en-IN")}`,
      "",
      "Thank you for choosing Charging Guru!",
      "Support: support@chargingguru.in",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${booking.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function cancelBooking() {
    if (!booking) return;
    setCancelling(true);
    try {
      await payments.refund(booking.id);
      setCancelDone(true);
      load();
    } catch { /* ignore */ }
    finally { setCancelling(false); }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
      weekday: "long", day: "numeric", month: "long",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatDateShort(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <Skeleton width={38} height={38} radius={10} />
          <div>
            <Skeleton width={140} height={18} style={{ marginBottom: 6 }} />
            <Skeleton width={100} height={12} />
          </div>
        </div>
        <BookingDetailSkeleton cardBg={cardBg} cardBorder={cardBorder} />
      </div>
    </div>
  );

  if (error || !booking) return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ maxWidth: 560, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠</div>
        <p style={{ color: "#FF5A5F", fontSize: 16, marginBottom: 20 }}>{error || "Booking not found."}</p>
        <button onClick={() => router.push("/trips")} style={{ padding: "12px 24px", borderRadius: 12, background: raisedBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 14, cursor: "pointer" }}>← Back to trips</button>
      </div>
    </div>
  );

  const meta = STATUS_META[booking.status] ?? { label: booking.status, color: "#98A1A6", bg: "rgba(152,161,166,.1)", icon: "•" };
  const canCancel = ["PENDING_PAYMENT", "CONFIRMED"].includes(booking.status);
  const showQR = booking.status === "CONFIRMED" && booking.qr_jti;
  const isCompleted = booking.status === "COMPLETED";

  return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />

      <div className="fade-up" style={{ maxWidth: 640, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Back + header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <button onClick={() => router.push("/trips")} style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>←</button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, marginBottom: 2 }}>Booking detail</h1>
            <p style={{ color: textSub, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>{booking.id.slice(0, 16)}…</p>
          </div>
        </div>

        {/* Status badge + timeline */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 20 }}>{meta.icon}</span>
            <span style={{ padding: "5px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, color: meta.color, background: meta.bg }}>{meta.label}</span>
          </div>
          <Timeline status={booking.status} />
        </div>

        {/* Charger info */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: textMuted, marginBottom: 14, textTransform: "uppercase" }}>Charger</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: raisedBg, border: `1px solid ${cardBorder}`, display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>⚡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: textPrimary, marginBottom: 3 }}>
                {booking.charger?.label ?? "Charger"} · {booking.charger?.connector_type ?? "CCS2"} {booking.charger?.power_kw ?? ""}kW
              </div>
              {booking.station && (
                <div style={{ fontSize: 13, color: textSub }}>{booking.station.name} · {booking.station.city}</div>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: cardBorder, margin: "16px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: textMuted, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".06em" }}>Slot start</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{booking.slot_start ? formatDateShort(booking.slot_start) : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: textMuted, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".06em" }}>Slot end</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{booking.slot_end ? formatDateShort(booking.slot_end) : "—"}</div>
            </div>
          </div>
        </div>

        {/* QR code (shown when CONFIRMED) */}
        {showQR && (
          <div style={{ background: isLight ? "linear-gradient(135deg,#F0FDF4,#ECFDF5)" : "linear-gradient(135deg,#0C2319,#101415)", border: `1px solid ${accentBrd}`, borderRadius: 20, padding: "24px", marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: accent, marginBottom: 16, textTransform: "uppercase" }}>Journey Pass · QR Code</div>
            <div style={{ display: "inline-block", padding: 16, background: "#FFFFFF", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,.15)", marginBottom: 16 }}>
              <QRDisplay value={booking.id} size={160} />
            </div>
            <p style={{ fontSize: 13, color: isLight ? "#059669" : "#4DFFA6", marginBottom: 6 }}>Show this QR at the charging station</p>
            <p style={{ fontSize: 12, color: textSub }}>Single-use · Valid for this booking only</p>
            <button onClick={() => router.push(`/qr/${booking.id}`)} style={{ marginTop: 14, padding: "10px 22px", borderRadius: 11, background: accent, color: "#050708", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
              Open full screen QR →
            </button>
          </div>
        )}

        {/* Payment info */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: textMuted, marginBottom: 14, textTransform: "uppercase" }}>Payment</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span style={{ color: textSub }}>Booking amount</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: textPrimary }}>
                {booking.amount ? `₹${(booking.amount / 100).toLocaleString("en-IN")}` : "—"}
              </span>
            </div>
            {payment && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: textSub }}>Status</span>
                  <span style={{ color: ["CAPTURED","AUTHORIZED"].includes(payment.status) ? accent : textSub, fontSize: 13, fontWeight: 600 }}>{payment.status}</span>
                </div>
                {payment.razorpay_payment_id && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: textMuted }}>Payment ID</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: textMuted, fontSize: 11 }}>{payment.razorpay_payment_id}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {booking.status === "PENDING_PAYMENT" && (
            <button onClick={() => router.push(`/pay/${booking.id}`)} style={{ width: "100%", marginTop: 16, padding: "14px", borderRadius: 12, background: "#FFC043", color: "#050708", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer" }}>
              Complete payment →
            </button>
          )}

          {isCompleted && (
            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: accentDim, border: `1px solid ${accentBrd}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: isLight ? "#059669" : "#4DFFA6" }}>Invoice available</span>
              <button onClick={downloadInvoice} style={{ padding: "6px 14px", borderRadius: 9, background: accent, color: "#050708", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>Download ↓</button>
            </div>
          )}
        </div>

        {/* Booking metadata */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", marginBottom: cancelDone ? 0 : 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: textMuted, marginBottom: 14, textTransform: "uppercase" }}>Details</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: textSub }}>Booking ID</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: textMuted, fontSize: 11 }}>{booking.id}</span>
            </div>
            {booking.slot_start && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: textSub }}>Scheduled</span>
                <span style={{ color: textPrimary }}>{formatDate(booking.slot_start)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cancel */}
        {canCancel && !cancelDone && (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={cancelBooking}
              disabled={cancelling}
              style={{ width: "100%", padding: "14px", borderRadius: 14, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 14, fontWeight: 700, cursor: cancelling ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {cancelling ? <><span className="spinner" style={{ borderColor: "rgba(255,90,95,.3)", borderTopColor: "#FF5A5F", width: 16, height: 16 }} />Cancelling…</> : "Cancel booking & refund"}
            </button>
            <p style={{ fontSize: 11, color: textMuted, textAlign: "center", marginTop: 10 }}>Refund will be processed to your original payment method in 5–7 business days.</p>
          </div>
        )}

        {cancelDone && (
          <div style={{ padding: "14px 18px", borderRadius: 14, marginTop: 16, background: "rgba(255,90,95,.06)", border: "1px solid rgba(255,90,95,.2)", color: "#FF5A5F", fontSize: 14, textAlign: "center" }}>
            Booking cancelled. Refund initiated.
          </div>
        )}
      </div>
    </div>
  );
}
