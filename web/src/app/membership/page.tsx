"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

const TIERS = [
  {
    id: "FREE",
    name: "Free",
    price: null,
    color: "#6B7479",
    gradient: null,
    badge: null,
    current: true,
    features: [
      "Earn 1× reward points",
      "Standard pricing",
      "All connector types",
      "Email support",
    ],
    cta: "Current Plan",
  },
  {
    id: "SILVER",
    name: "Silver",
    price: 199,
    color: "#94A3B8",
    gradient: "linear-gradient(135deg,#1E293B,#0F172A)",
    badge: null,
    current: false,
    features: [
      "Earn 1.5× reward points",
      "5% discount on all bookings",
      "Priority support",
      "Access peak-hour slots",
      "Monthly usage report",
    ],
    cta: "Upgrade to Silver →",
  },
  {
    id: "GOLD",
    name: "Gold",
    price: 499,
    color: "#FFC043",
    gradient: "linear-gradient(135deg,#2D1F00,#1A1200)",
    badge: "MOST POPULAR",
    current: false,
    features: [
      "Earn 2× reward points",
      "10% discount on all bookings",
      "Dedicated support line",
      "Guaranteed slot booking",
      "Free cancellation anytime",
      "Invoice auto-email",
    ],
    cta: "Upgrade to Gold →",
  },
];

const FAQS = [
  {
    q: "Does membership auto-renew?",
    a: "Yes, memberships auto-renew monthly. You can cancel anytime from your account settings before the renewal date.",
  },
  {
    q: "Can I downgrade my plan?",
    a: "You can downgrade at any time. The change takes effect at the start of your next billing cycle.",
  },
  {
    q: "What happens to my points if I downgrade?",
    a: "Your existing points are never lost when you change plans. Only the earning rate changes going forward.",
  },
];

export default function MembershipPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [toast, setToast] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const bg         = isLight ? "#F8FAFC" : "#0A0D0E";
  const cardBg     = isLight ? "#FFFFFF" : "#101415";
  const cardBorder = isLight ? "#E2E8F0" : "#222829";
  const textPrimary= isLight ? "#0F172A" : "#E6EBED";
  const textSub    = isLight ? "#64748B" : "#6B7479";
  const textMuted  = isLight ? "#94A3B8" : "#495154";
  const raisedBg   = isLight ? "#F1F5F9" : "#181D1F";

  function handleUpgrade(tier: typeof TIERS[0]) {
    if (tier.current) return;
    setToast(`${tier.name} membership payments coming soon! Stay tuned.`);
    setTimeout(() => setToast(""), 4000);
  }

  return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#101415", border: "1px solid #222829", borderRadius: 14,
          padding: "14px 24px", color: "#E6EBED", fontSize: 14, fontWeight: 500,
          zIndex: 999, boxShadow: "0 8px 32px rgba(0,0,0,.4)", whiteSpace: "nowrap",
        }}>
          🎉 {toast}
        </div>
      )}

      <div className="fade-up" style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>Membership Plans</h1>
          <p style={{ fontSize: 15, color: textSub, maxWidth: 460, margin: "0 auto" }}>
            Unlock discounts, faster booking, and more points on every charge.
          </p>
        </div>

        {/* Tier cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 48 }}>
          {TIERS.map(tier => (
            <div key={tier.id} style={{
              borderRadius: 22, padding: "24px 20px",
              background: tier.gradient ?? (isLight ? "#FFFFFF" : "#101415"),
              border: tier.current
                ? `2px solid ${isLight ? "#E2E8F0" : "#2E3638"}`
                : `2px solid ${tier.color}40`,
              boxShadow: tier.id === "GOLD"
                ? `0 0 0 1px ${tier.color}30, 0 4px 32px ${tier.color}10`
                : isLight ? "0 1px 6px rgba(0,0,0,.06)" : "none",
              position: "relative", display: "flex", flexDirection: "column",
              transition: "transform .15s, box-shadow .15s",
            }}
              onMouseEnter={e => {
                if (!tier.current) {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = tier.id === "GOLD"
                    ? `0 0 0 1px ${tier.color}50, 0 8px 40px ${tier.color}18`
                    : `0 4px 24px rgba(0,0,0,.15)`;
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "none";
                (e.currentTarget as HTMLDivElement).style.boxShadow = tier.id === "GOLD"
                  ? `0 0 0 1px ${tier.color}30, 0 4px 32px ${tier.color}10`
                  : isLight ? "0 1px 6px rgba(0,0,0,.06)" : "none";
              }}
            >
              {/* Badge */}
              {tier.badge && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  padding: "4px 14px", borderRadius: 999, fontSize: 10, fontWeight: 800,
                  letterSpacing: ".1em", background: tier.color, color: "#050708", whiteSpace: "nowrap",
                }}>
                  {tier.badge}
                </div>
              )}

              {/* Tier name */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${tier.color}20`, border: `1px solid ${tier.color}40`, display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>
                  {tier.id === "FREE" ? "○" : tier.id === "SILVER" ? "◈" : "★"}
                </div>
                <span style={{ fontWeight: 700, fontSize: 18, color: tier.color }}>{tier.name}</span>
              </div>

              {/* Price */}
              <div style={{ marginBottom: 20 }}>
                {tier.price ? (
                  <div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 32, fontWeight: 700, color: textPrimary }}>₹{tier.price}</span>
                    <span style={{ fontSize: 13, color: textSub }}>/month</span>
                  </div>
                ) : (
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 32, fontWeight: 700, color: textPrimary }}>Free</div>
                )}
              </div>

              {/* Features */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {tier.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: textSub }}>
                    <span style={{ color: tier.color, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleUpgrade(tier)}
                disabled={tier.current}
                style={{
                  width: "100%", padding: "13px", borderRadius: 13, fontSize: 14, fontWeight: 700,
                  border: tier.current ? `1px solid ${cardBorder}` : "none",
                  background: tier.current
                    ? raisedBg
                    : tier.id === "GOLD"
                      ? `linear-gradient(135deg,${tier.color},#E6A000)`
                      : tier.id === "SILVER"
                        ? "linear-gradient(135deg,#94A3B8,#64748B)"
                        : raisedBg,
                  color: tier.current ? textMuted : "#050708",
                  cursor: tier.current ? "not-allowed" : "pointer",
                  transition: "opacity .15s",
                  opacity: tier.current ? 0.7 : 1,
                }}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, overflow: "hidden", marginBottom: 40, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${cardBorder}` }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>Plan comparison</h2>
          </div>
          {[
            { feature: "Points multiplier",  free: "1×",         silver: "1.5×",      gold: "2×" },
            { feature: "Booking discount",   free: "—",          silver: "5%",         gold: "10%" },
            { feature: "Cancellation",       free: "₹50 fee",    silver: "₹50 fee",   gold: "Free" },
            { feature: "Support",            free: "Email",       silver: "Priority",  gold: "Dedicated" },
            { feature: "Peak-hour slots",    free: "—",          silver: "✓",          gold: "✓" },
            { feature: "Invoice email",      free: "—",          silver: "—",          gold: "✓" },
          ].map((row, i) => (
            <div key={row.feature} style={{
              display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
              padding: "13px 22px", fontSize: 13,
              background: i % 2 === 1 ? raisedBg : "transparent",
              borderBottom: i < 5 ? `1px solid ${cardBorder}` : "none",
            }}>
              <span style={{ color: textSub }}>{row.feature}</span>
              <span style={{ color: textMuted, textAlign: "center" }}>{row.free}</span>
              <span style={{ color: "#94A3B8", textAlign: "center", fontWeight: 600 }}>{row.silver}</span>
              <span style={{ color: "#FFC043", textAlign: "center", fontWeight: 600 }}>{row.gold}</span>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: textPrimary, marginBottom: 16 }}>Frequently asked questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: "hidden", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.04)" : "none" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                  }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{faq.q}</span>
                  <span style={{ color: textMuted, fontSize: 18, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform .2s", flexShrink: 0, marginLeft: 8 }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 20px 16px", fontSize: 14, color: textSub, lineHeight: 1.6 }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Back to rewards */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button onClick={() => router.push("/rewards")} style={{ background: "none", border: "none", color: textSub, fontSize: 13, cursor: "pointer" }}>
            ← Back to Rewards
          </button>
        </div>

      </div>
    </div>
  );
}
