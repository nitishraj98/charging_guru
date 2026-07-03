"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { checkAuth } from "@/lib/auth";
import { membership, MembershipTier as TierId, MembershipOrder } from "@/lib/api";
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

const TIER_META: Record<string, { name: string; color: string }> = {
  SILVER: { name: "Silver", color: "#64748B" },
  GOLD: { name: "Gold", color: "#FFC043" },
};

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

export default function MembershipCheckoutPage() {
  const router = useRouter();
  const { tier: tierParam } = useParams<{ tier: string }>();
  const tier = (tierParam ?? "").toUpperCase() as TierId;
  const { isLight } = useTheme();
  const [order, setOrder] = useState<MembershipOrder | null>(null);
  const [method, setMethod] = useState("upi");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const bg          = isLight ? "#F3F7FB"              : "#080B0C";
  const cardBg      = isLight ? "#FFFFFF"              : "#101415";
  const cardBorder  = isLight ? "#CBD5E1"              : "#1E2426";
  const textPrimary = isLight ? "#0F172A"              : "#E6EBED";
  const textSub     = isLight ? "#64748B"              : "#6B7479";
  const textMuted   = isLight ? "#64748B"              : "#495154";
  const accent      = isLight ? "#00D26A"              : "#00E676";
  const accentDim   = isLight ? "rgba(0,210,106,.08)" : "rgba(0,230,118,.07)";
  const accentBrd   = isLight ? "rgba(0,210,106,.30)" : "rgba(0,230,118,.22)";

  const meta = TIER_META[tier] ?? { name: tier, color: accent };

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
      if (!TIER_META[tier]) { setError("Unknown membership tier."); setLoading(false); return; }
      try {
        const o = await membership.createOrder(tier);
        setOrder(o);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to start upgrade");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [tier, router]);

  async function handlePay() {
    if (!order) return;
    setPaying(true); setError("");

    if (!window.Razorpay || !RZP_KEY) {
      try {
        const result = await membership.verify(order.razorpay_order_id, `pay_test_${Date.now()}`, "valid_sig");
        router.push(`/membership?upgraded=${result.tier}`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Payment failed. Ensure the backend is running.");
        setPaying(false);
      }
      return;
    }

    const options: Record<string, unknown> = {
      key: RZP_KEY,
      amount: order.amount,
      currency: "INR",
      name: "Charging Guru",
      description: `${meta.name} Membership`,
      order_id: order.razorpay_order_id,
      theme: { color: "#00E676" },
      modal: { ondismiss: () => { setPaying(false); } },
      handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
        try {
          const result = await membership.verify(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
          router.push(`/membership?upgraded=${result.tier}`);
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

  const totalRs = (order?.amount ?? 0) / 100;

  if (loading) return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${cardBorder}`, borderTopColor: accent, animation: "spin .8s linear infinite" }}/>
        <span style={{ color: textSub, fontSize: 14 }}>Preparing checkout…</span>
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
          <button onClick={() => router.push("/membership")} style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, cursor: "pointer", flexShrink: 0 }}>
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

        {/* Plan summary */}
        {order && (
          <div style={{ background: isLight?"linear-gradient(135deg,#F0FDF4,#ECFDF5)":"linear-gradient(135deg,#091A0F,#101415)", border: `1px solid ${accentBrd}`, borderRadius: 20, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: isLight?"#16A34A":accent, marginBottom: 12, opacity: .7 }}>Plan Summary</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: meta.color, display: "inline-block" }} />
                  <span style={{ fontWeight: 700, fontSize: 15, color: textPrimary }}>{meta.name} Membership</span>
                </div>
                <div style={{ fontSize: 13, color: textSub }}>Billed monthly · Cancel anytime</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                <div style={{ fontSize: 10, color: textMuted, marginBottom: 3, letterSpacing: ".06em" }}>TOTAL</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 30, color: textPrimary, lineHeight: 1 }}>
                  ₹{totalRs.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment method */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 12 }}>Payment Method</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
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
          Membership active immediately after payment
        </p>
      </div>
    </div>
  );
}
