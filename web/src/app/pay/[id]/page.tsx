"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { bookings, payments, Booking, PaymentOrder } from "@/lib/api";
import { checkAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (resp: unknown) => void) => void;
    };
  }
}

const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

const PAY_METHODS = [
  {
    id: "upi", label: "UPI",
    desc: "PhonePe, GPay, Paytm & more",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#5F259F"/>
        <path d="M7 17L12 7l2.5 5L17 9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "card", label: "Credit / Debit Card",
    desc: "Visa, Mastercard, RuPay",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#1A56DB"/>
        <rect x="3" y="7" width="18" height="10" rx="2" stroke="#fff" strokeWidth="1.5"/>
        <path d="M3 10h18" stroke="#fff" strokeWidth="1.5"/>
        <rect x="5" y="13" width="4" height="2" rx="1" fill="#fff" opacity=".6"/>
      </svg>
    ),
  },
  {
    id: "nb", label: "Net Banking",
    desc: "All major Indian banks",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#0D7377"/>
        <path d="M12 4l7 4H5l7-4Z" fill="#fff"/>
        <rect x="7" y="10" width="2" height="6" fill="#fff" opacity=".8"/>
        <rect x="11" y="10" width="2" height="6" fill="#fff" opacity=".8"/>
        <rect x="15" y="10" width="2" height="6" fill="#fff" opacity=".8"/>
        <rect x="5" y="17" width="14" height="1.5" rx=".75" fill="#fff"/>
      </svg>
    ),
  },
];

function HoldTimer({ expiresAt, isLight }: { expiresAt?: string; isLight: boolean }) {
  const total = 15 * 60;
  function calcSecs() {
    if (!expiresAt) return total;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  }
  const [secs, setSecs] = useState(calcSecs);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    setSecs(calcSecs());
    ref.current = setInterval(() => setSecs(calcSecs()), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  const pct = Math.min(100, (secs / total) * 100);
  const expired = secs === 0;
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
  const [method, setMethod] = useState("upi");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const bg          = isLight ? "#F3F7FB"              : "#080B0C";
  const cardBg      = isLight ? "#FFFFFF"              : "#101415";
  const cardBorder  = isLight ? "#CBD5E1"              : "#1E2426";
  const raisedBg    = isLight ? "#F1F5F9"              : "#181D1F";
  const textPrimary = isLight ? "#0F172A"              : "#E6EBED";
  const textSub     = isLight ? "#64748B"              : "#6B7479";
  const textMuted   = isLight ? "#64748B"              : "#495154";
  const accent      = isLight ? "#00D26A"              : "#00E676";
  const accentDim   = isLight ? "rgba(0,210,106,.08)" : "rgba(0,230,118,.07)";
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
    if (!order || !booking) return;
    setPaying(true); setError("");

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
      modal: { ondismiss: () => { setPaying(false); } },
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
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (resp: unknown) => {
      const r = resp as { error?: { description?: string } };
      setError(`Payment failed: ${r?.error?.description ?? "Unknown error"}`);
      setPaying(false);
    });
    rzp.open();
  }

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
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Space Grotesk',system-ui,sans-serif" }}>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fade-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes glow-pulse{0%,100%{box-shadow:0 0 24px ${accentBrd}}50%{box-shadow:0 0 48px rgba(0,230,118,.4)}}
        .pay-fade{animation:fade-up .4s cubic-bezier(.16,1,.3,1) both}
        .method-row{transition:all .15s cubic-bezier(.16,1,.3,1)}
        .method-row:hover{transform:translateX(3px)}
        .pay-btn-active{animation:glow-pulse 2.2s ease-in-out infinite}
        .pay-btn{transition:all .2s cubic-bezier(.16,1,.3,1)}
        .pay-btn:hover:not(:disabled){transform:translateY(-2px)}
      `}</style>
      <NavBar />

      <div className="pay-fade" style={{ maxWidth: 500, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Back + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, cursor: "pointer", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: textPrimary, marginBottom: 3 }}>Secure Checkout</h2>
            <p style={{ color: textSub, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
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
            {order && <HoldTimer expiresAt={booking.hold_expires_at} isLight={isLight}/>}
          </div>
        )}

        {/* Payment method */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 12 }}>Payment Method</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {PAY_METHODS.map(m => {
            const isSel = method === m.id;
            return (
              <div key={m.id} className="method-row" onClick={() => setMethod(m.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 16, cursor: "pointer", background: isSel?accentDim:cardBg, border: `1.5px solid ${isSel?accentBrd:cardBorder}`, boxShadow: isSel?(isLight?"0 0 0 3px rgba(0,210,106,.10)":"0 0 0 3px rgba(0,230,118,.08)"):"none" }}>
                <span style={{ flexShrink: 0 }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: textPrimary, marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: textSub }}>{m.desc}</div>
                </div>
                <span style={{ fontSize: 18, color: isSel?accent:textMuted, transition: "color .15s", flexShrink: 0 }}>
                  {isSel ? "◉" : "○"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Rewards row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center", background: raisedBg, border: `1px solid ${cardBorder}`, fontSize: 16, flexShrink: 0 }}>🎁</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 2 }}>Use 120 reward points</div>
            <div style={{ fontSize: 12, color: textSub }}>Save ₹24 on this booking</div>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", color: accent, fontSize: 14, fontWeight: 700 }}>−₹24</div>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 16, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.22)", color: "#FF5A5F", fontSize: 13 }}>{error}</div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={paying || !order}
          className={`pay-btn ${order && !paying ? "pay-btn-active" : ""}`}
          style={{ width: "100%", padding: "18px 20px", borderRadius: 16, background: paying||!order?(isLight?"#CBD5E1":"#1A2218"):accent, color: paying||!order?textSub:"#050708", fontSize: 16, fontWeight: 800, border: "none", cursor: paying||!order?"not-allowed":"pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: paying||!order?"none":isLight?"0 6px 28px rgba(0,210,106,.45)":"0 0 40px rgba(0,230,118,.28)" }}>
          {paying ? (
            <><span style={{ width: 18, height: 18, borderRadius: "50%", border: `2.5px solid ${textMuted}`, borderTopColor: "transparent", display: "inline-block", animation: "spin .7s linear infinite" }}/> Opening payment…</>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="#050708"/></svg>
              Pay ₹{totalRs.toLocaleString("en-IN")} →
            </>
          )}
        </button>

        <p style={{ fontSize: 11, color: textMuted, textAlign: "center", marginTop: 12 }}>
          Slot confirmed immediately after payment · No extra charges
        </p>
      </div>
    </div>
  );
}
