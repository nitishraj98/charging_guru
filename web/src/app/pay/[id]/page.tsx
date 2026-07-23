"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { bookings, payments, beaconRefund, Booking, PaymentOrder } from "@/lib/api";
import { checkAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Lock, ShieldCheck, AlertCircle, RotateCcw } from "lucide-react";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (resp: unknown) => void) => void;
    };
  }
}

const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

function HoldTimer({ expiresAt, isLight, onExpire }: { expiresAt?: string; isLight: boolean; onExpire?: () => void }) {
  function calcSecs() {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  }
  // Capture the real hold duration once (from the actual expiresAt), instead of
  // assuming a fixed window — the ring needs to know the true 100% baseline.
  const totalRef = useRef<number>(Math.max(calcSecs(), 1));
  const [secs, setSecs] = useState(calcSecs);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    totalRef.current = Math.max(calcSecs(), 1);
    setSecs(calcSecs());
    ref.current = setInterval(() => setSecs(calcSecs()), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);
  const expired = secs === 0;
  useEffect(() => { if (expired) onExpire?.(); }, [expired, onExpire]);
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  const pct = Math.min(100, (secs / totalRef.current) * 100);
  const timerColor = expired ? "#FF5A5F" : "#FFC043";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: isLight?"rgba(255,192,67,.07)":"rgba(255,192,67,.04)", border: `1px solid rgba(255,192,67,${expired?".35":".18"})` }}>
      <svg width="32" height="32" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
        <circle cx="18" cy="18" r="15" fill="none" stroke={isLight?"#CBD5E1":"#222829"} strokeWidth="3"/>
        <circle cx="18" cy="18" r="15" fill="none" stroke={timerColor} strokeWidth="3"
          strokeLinecap="round" strokeDasharray="94.2"
          strokeDashoffset={94.2 * (1 - pct / 100)}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <div>
        <div style={{ fontSize: 11, color: timerColor, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 2 }}>
          {expired ? "Slot hold expired" : "Slot hold expires in"}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 20, color: timerColor }}>
          {expired ? "00:00" : `${m}:${s}`}
        </div>
      </div>
    </div>
  );
}

export default function PayPage() {
  const router = useRouter();
  const { id: bookingId } = useParams<{ id: string }>();
  const { isLight } = useTheme();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [holdExpired, setHoldExpired] = useState(false);
  // Tracks an active Razorpay attempt so the pagehide/back-button release
  // logic never cancels a booking that's genuinely mid-payment — some flows
  // (UPI intent apps, net-banking redirects) can trigger a page-hide while
  // still legitimately in progress. Only cleared on failure/dismiss, never
  // on success (success navigates away before any of this could matter).
  const paymentInFlightRef = useRef(false);

  const bg          = isLight ? "#F3F7FB"              : "#080B0C";
  const cardBg      = isLight ? "#FFFFFF"              : "#101415";
  const cardBorder  = isLight ? "#CBD5E1"              : "#1E2426";
  const textPrimary = isLight ? "#0F172A"              : "#E6EBED";
  const textSub     = isLight ? "#64748B"              : "#6B7479";
  const textMuted   = isLight ? "#64748B"              : "#495154";
  const accent      = isLight ? "#00D26A"              : "#00E676";
  const accentBrd   = isLight ? "rgba(0,210,106,.30)" : "rgba(0,230,118,.22)";

  useEffect(() => {
    if (typeof window === "undefined" || window.Razorpay) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    async function init() {
      const ok = await checkAuth(); if (!ok) { router.push("/login"); return; }
      bookings.get(bookingId)
        .then(async b => {
          setBooking(b);
          const o = await payments.createOrder(b.id);
          setOrder(o);
        })
        .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
        .finally(() => setLoading(false));
    }
    init();
  }, [bookingId, router]);

  async function handlePay() {
    if (!order || !booking || holdExpired) return;
    setPaying(true); setError("");
    paymentInFlightRef.current = true;

    if (!window.Razorpay || !RZP_KEY) {
      try {
        const result = await payments.verify(
          order.razorpay_order_id,
          `pay_test_${Date.now()}`,
          "valid_sig",
        );
        router.push(`/qr/${result.booking_id}?token=${encodeURIComponent(result.qr_token ?? "")}`);
      } catch {
        setError("Payment failed. Ensure the backend is running.");
        setPaying(false);
        paymentInFlightRef.current = false;
      }
      return;
    }

    const options: Record<string, unknown> = {
      key: RZP_KEY,
      amount: order.amount,
      currency: order.currency ?? "INR",
      name: "Charging Guru",
      description: `EV Charging · ${booking.charger?.connector_type ?? "CCS2"} ${booking.charger?.power_kw ?? ""}kW`,
      order_id: order.razorpay_order_id,
      prefill: {},
      theme: { color: "#00E676" },
      modal: { ondismiss: () => { setPaying(false); paymentInFlightRef.current = false; } },
      handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
        try {
          const result = await payments.verify(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
          );
          router.push(`/qr/${result.booking_id}?token=${encodeURIComponent(result.qr_token ?? "")}`);
        } catch {
          setError("Payment verification failed. Please contact support.");
          setPaying(false);
          paymentInFlightRef.current = false;
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (resp: unknown) => {
      const r = resp as { error?: { description?: string } };
      setError(`Payment failed: ${r?.error?.description ?? "Unknown error"}`);
      setPaying(false);
      paymentInFlightRef.current = false;
    });
    rzp.open();
  }

  // Explicit exit — release the hold immediately instead of letting it sit
  // for the full 5 minutes. Best-effort: navigation proceeds either way.
  async function handleBack() {
    if (booking?.status === "PENDING_PAYMENT" && !paymentInFlightRef.current) {
      try { await payments.refund(booking.id); } catch { /* best-effort */ }
    }
    router.back();
  }

  // Tab/browser close — pagehide is the correct signal (unlike
  // visibilitychange, it doesn't fire on ordinary tab-switch/minimize, e.g.
  // switching to a banking app for OTP mid-payment, which must not cancel it).
  useEffect(() => {
    function onHide() {
      if (booking?.status === "PENDING_PAYMENT" && !paymentInFlightRef.current) {
        beaconRefund(booking.id);
      }
    }
    document.addEventListener("pagehide", onHide);
    return () => document.removeEventListener("pagehide", onHide);
  }, [booking]);

  const totalRs = ((booking?.amount ?? 0) / 100);
  const slotTime = booking?.slot_start
    ? new Date(booking.slot_start).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";

  if (loading) return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${cardBorder}`, borderTopColor: accent, animation: "spin .8s linear infinite" }}/>
        <span style={{ color: textSub, fontSize: 14 }}>Preparing payment…</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Space Grotesk',system-ui,sans-serif", position: "relative" }}>
      {/* Decorative glow — matches the premium background language used across Plan/Station/Slot pages */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -160, left: "50%", transform: "translateX(-50%)", width: 640, height: 420, borderRadius: "50%", background: `radial-gradient(circle, ${accent}${isLight?"14":"09"} 0%, transparent 70%)` }}/>
      </div>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fade-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes glow-pulse{0%,100%{box-shadow:0 0 24px ${accentBrd}}50%{box-shadow:0 0 48px rgba(0,230,118,.4)}}
        .pay-fade{animation:fade-up .4s cubic-bezier(.16,1,.3,1) both}
        .pay-btn-active{animation:glow-pulse 2.2s ease-in-out infinite}
        .pay-btn{transition:all .2s cubic-bezier(.16,1,.3,1)}
        .pay-btn:hover:not(:disabled){transform:translateY(-2px)}
      `}</style>
      <NavBar />

      <div className="pay-fade" style={{ maxWidth: 500, margin: "0 auto", padding: "36px 24px 80px", position: "relative", zIndex: 1 }}>

        {/* Back + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <button onClick={handleBack} style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, cursor: "pointer", flexShrink: 0 }}>
            <ArrowLeft size={16}/>
          </button>
          <div>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: textPrimary, marginBottom: 3 }}>Secure Checkout</h2>
            <p style={{ color: textSub, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
              <ShieldCheck size={12} color={accent}/>
              256-bit SSL · PCI-DSS · Powered by Razorpay
            </p>
          </div>
        </div>

        {/* Booking summary */}
        {booking && (
          <div style={{ background: isLight?"linear-gradient(135deg,#F0FDF4,#ECFDF5)":"linear-gradient(135deg,#091A0F,#101415)", border: `1px solid ${accentBrd}`, borderRadius: 20, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: isLight?"#16A34A":accent, marginBottom: 12, opacity: .7 }}>Booking Summary</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: textPrimary, marginBottom: 3 }}>
                  {booking.charger?.label ?? "Bay 1"} · {booking.charger?.connector_type ?? "CCS2"} {booking.charger?.power_kw ?? ""}kW
                </div>
                <div style={{ fontSize: 13, color: textSub }}>{slotTime}</div>
                {booking.station?.name && <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{booking.station.name}</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                <div style={{ fontSize: 10, color: textMuted, marginBottom: 3, letterSpacing: ".06em" }}>TOTAL</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 30, color: textPrimary, lineHeight: 1 }}>
                  ₹{totalRs.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
            {order && <HoldTimer expiresAt={booking.hold_expires_at} isLight={isLight} onExpire={() => setHoldExpired(true)}/>}
          </div>
        )}

        {holdExpired && (
          <div style={{ padding: "14px 16px", borderRadius: 12, marginBottom: 16, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }}/>
            Your slot hold expired before payment. Book the slot again to continue.
          </div>
        )}

        {/* Accepted methods — informational only; Razorpay's own checkout is where you actually pick one */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 24, flexWrap: "wrap" }}>
          {["UPI", "Cards", "Net Banking", "Wallets"].map(m => (
            <span key={m} style={{ fontSize: 11.5, fontWeight: 600, color: textMuted, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: textMuted }}/>{m}
            </span>
          ))}
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 16, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.22)", color: "#FF5A5F", fontSize: 13 }}>{error}</div>
        )}

        {/* Pay button — swaps to a rebook CTA once the hold has expired */}
        {holdExpired ? (
          <button
            onClick={() => router.push(booking?.station?.id ? `/station/${booking.station.id}` : "/discover")}
            className="pay-btn"
            style={{ width: "100%", padding: "20px 20px", borderRadius: 16, background: accent, color: "#050708", fontSize: 16.5, fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <RotateCcw size={16} strokeWidth={2.4}/> Book This Slot Again
          </button>
        ) : (
          <button
            onClick={handlePay}
            disabled={paying || !order}
            className={`pay-btn ${order && !paying ? "pay-btn-active" : ""}`}
            style={{ width: "100%", padding: "20px 20px", borderRadius: 16, background: paying||!order?(isLight?"#CBD5E1":"#1A2218"):accent, color: paying||!order?textSub:"#050708", fontSize: 16.5, fontWeight: 800, border: "none", cursor: paying||!order?"not-allowed":"pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: paying||!order?"none":isLight?"0 6px 28px rgba(0,210,106,.45)":"0 0 40px rgba(0,230,118,.28)" }}>
            {paying ? (
              <><span style={{ width: 18, height: 18, borderRadius: "50%", border: `2.5px solid ${textMuted}`, borderTopColor: "transparent", display: "inline-block", animation: "spin .7s linear infinite" }}/> Opening payment…</>
            ) : (
              <>
                <Lock size={16} color="#050708" strokeWidth={2.4}/>
                Pay ₹{totalRs.toLocaleString("en-IN")} →
              </>
            )}
          </button>
        )}

        <p style={{ fontSize: 11, color: textMuted, textAlign: "center", marginTop: 12 }}>
          {holdExpired ? "No payment was taken · Free to plan again" : "Slot confirmed immediately after payment · No extra charges"}
        </p>
      </div>
    </div>
  );
}
