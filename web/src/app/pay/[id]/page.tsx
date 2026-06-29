"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { bookings, payments, Booking, PaymentOrder } from "@/lib/api";
import { checkAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";

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

function HoldTimer({ expiresAt }: { expiresAt?: string }) {
  const total = 15 * 60;
  function calcSecs() {
    if (!expiresAt) return total;
    const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    return remaining;
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
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width="28" height="28" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
        <circle cx="18" cy="18" r="15" fill="none" stroke="#222829" strokeWidth="3"/>
        <circle cx="18" cy="18" r="15" fill="none" stroke={expired ? "#FF5A5F" : "#FFC043"} strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="94.2"
          strokeDashoffset={94.2 * (1 - pct / 100)}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <div>
        <div style={{ fontSize: 11, color: expired ? "#FF5A5F" : "#FFC043", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
          {expired ? "Slot hold expired" : "Slot held for"}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 18, color: expired ? "#FF5A5F" : "#FFC043" }}>
          {expired ? "00:00" : `${m}:${s}`}
        </div>
      </div>
    </div>
  );
}

export default function PayPage() {
  const router = useRouter();
  const { id: bookingId } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [method, setMethod] = useState("upi");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // Load Razorpay Checkout.js
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
    setPaying(true);
    setError("");

    // Test-mode fallback when no live Razorpay key is configured
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
    <div style={{ background: "#0A0D0E", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: "#222829", borderTopColor: "#00E676" }} />
        <span style={{ color: "#6B7479", fontSize: 14 }}>Preparing payment…</span>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#0A0D0E", minHeight: "100vh" }}>
      <NavBar />
      <div className="fade-up" style={{ maxWidth: 520, margin: "0 auto", padding: "36px 24px" }}>

        {/* Back + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <button onClick={() => router.back()} style={{
            width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center",
            background: "#101415", border: "1px solid #222829", color: "#E6EBED",
            cursor: "pointer", flexShrink: 0,
          }}>←</button>
          <div>
            <h2 style={{ fontSize: 20, marginBottom: 2 }}>Secure Checkout</h2>
            <p style={{ color: "#6B7479", fontSize: 13 }}>🔒 256-bit SSL · Powered by Razorpay</p>
          </div>
        </div>

        {/* Booking summary */}
        {booking && (
          <div style={{
            background: "linear-gradient(135deg,#0E2A1C,#101415)",
            border: "1px solid rgba(0,230,118,.2)", borderRadius: 18, padding: "18px 20px",
            marginBottom: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6B7479", marginBottom: 4, fontWeight: 500 }}>BOOKING SUMMARY</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>
                  {booking.charger?.label ?? "Bay 1"} · {booking.charger?.connector_type ?? "CCS2"} {booking.charger?.power_kw ?? ""}kW
                </div>
                <div style={{ fontSize: 13, color: "#98A1A6" }}>{slotTime}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#6B7479", marginBottom: 4 }}>TOTAL</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 28, color: "#E6EBED" }}>
                  ₹{totalRs.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
            {order && <HoldTimer expiresAt={booking.hold_expires_at} />}
          </div>
        )}

        {/* Payment method */}
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#6B7479", marginBottom: 12 }}>
          Payment Method
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {PAY_METHODS.map(m => (
            <div
              key={m.id}
              onClick={() => setMethod(m.id)}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                borderRadius: 14, cursor: "pointer", transition: "all .15s",
                background: method === m.id ? "#181D1F" : "#101415",
                border: `1.5px solid ${method === m.id ? "#00A455" : "#222829"}`,
                boxShadow: method === m.id ? "0 0 0 3px rgba(0,164,85,.1)" : "none",
              }}
            >
              <span style={{ flexShrink: 0 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: "#6B7479" }}>{m.desc}</div>
              </div>
              <span style={{ color: method === m.id ? "#00E676" : "#495154", fontSize: 18, flexShrink: 0 }}>
                {method === m.id ? "◉" : "○"}
              </span>
            </div>
          ))}
        </div>

        {/* Rewards row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
          background: "#101415", border: "1px solid #222829", borderRadius: 14, marginBottom: 24,
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center",
            background: "#181D1F", border: "1px solid #222829", fontSize: 16, flexShrink: 0,
          }}>🎁</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Use 120 reward points</div>
            <div style={{ fontSize: 12, color: "#6B7479" }}>Save ₹24 on this booking</div>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", color: "#26F593", fontSize: 14, fontWeight: 700 }}>−₹24</div>
        </div>

        {/* Security row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 24 }}>
          {["🔒 256-bit SSL", "✓ PCI-DSS", "⚡ Razorpay"].map(b => (
            <span key={b} style={{ fontSize: 11, color: "#495154", fontWeight: 500 }}>{b}</span>
          ))}
        </div>

        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, marginBottom: 16,
            background: "rgba(255,90,95,.1)", border: "1px solid rgba(255,90,95,.3)",
            color: "#FF5A5F", fontSize: 13,
          }}>{error}</div>
        )}

        <button
          onClick={handlePay}
          disabled={paying || !order}
          className={order && !paying ? "pulse-glow" : ""}
          style={{
            width: "100%", padding: "18px 20px", borderRadius: 14,
            background: (paying || !order) ? "#222829" : "#00E676",
            color: (paying || !order) ? "#6B7479" : "#050708",
            fontSize: 16, fontWeight: 700, border: "none",
            cursor: (paying || !order) ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background .15s",
          }}>
          {paying
            ? <><span className="spinner" />Opening payment…</>
            : `Pay ₹${totalRs.toLocaleString("en-IN")} →`}
        </button>

        <p style={{ fontSize: 11, color: "#495154", textAlign: "center", marginTop: 12 }}>
          Slot will be confirmed immediately after payment
        </p>
      </div>
    </div>
  );
}
