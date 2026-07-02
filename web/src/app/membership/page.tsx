"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Star, Shield, Zap, CreditCard, ChevronDown, ChevronRight } from "lucide-react";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import { isLoggedIn } from "@/lib/auth";
import { membership, MembershipTier as TierId } from "@/lib/api";

const TIER_STATIC = {
  FREE: {
    name: "Free", color: "#6B7479", gradient: null as string | null, badge: null as string | null,
    features: ["Earn 1× reward points", "Standard pricing", "All connector types", "Email support"],
  },
  SILVER: {
    name: "Silver", color: "#94A3B8", gradient: "linear-gradient(135deg,#0E1B2A,#101D2A)", badge: null as string | null,
    features: ["Earn 1.5× reward points", "5% discount on all bookings", "Priority support", "Access peak-hour slots", "Monthly usage report"],
  },
  GOLD: {
    name: "Gold", color: "#FFC043", gradient: "linear-gradient(135deg,#1A1200,#2D1F00)", badge: "MOST POPULAR" as string | null,
    features: ["Earn 2× reward points", "10% discount on all bookings", "Dedicated support line", "Guaranteed slot booking", "Free cancellation anytime", "Invoice auto-email"],
  },
} as const;

const TIER_ORDER: TierId[] = ["FREE", "SILVER", "GOLD"];

const COMPARE_ROWS = [
  { feature: "Points multiplier", free: "1×",       silver: "1.5×",     gold: "2×"        },
  { feature: "Booking discount",  free: "—",         silver: "5%",       gold: "10%"       },
  { feature: "Cancellation",      free: "₹50 fee",  silver: "₹50 fee",  gold: "Free"      },
  { feature: "Support",           free: "Email",    silver: "Priority",  gold: "Dedicated" },
  { feature: "Peak-hour slots",   free: "—",         silver: "✓",        gold: "✓"         },
  { feature: "Invoice email",     free: "—",         silver: "—",        gold: "✓"         },
];

const FAQS = [
  { q: "Does membership auto-renew?",                    a: "Yes, memberships auto-renew monthly. You can cancel anytime from your account settings before the renewal date." },
  { q: "Can I downgrade my plan?",                       a: "You can downgrade at any time. The change takes effect at the start of your next billing cycle." },
  { q: "What happens to my points if I downgrade?",      a: "Your existing points are never lost when you change plans. Only the earning rate changes going forward." },
];

const TRUST = [
  { Icon: Shield,     label: "Cancel anytime",     sub: "No lock-in period"              },
  { Icon: Zap,        label: "Instant activation",  sub: "Points credited immediately"    },
  { Icon: CreditCard, label: "Secure payment",      sub: "Powered by Razorpay"            },
];

interface ApiTier { tier: TierId; price_paise: number; points_multiplier: number; discount_pct: number; }

export default function MembershipPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [toast, setToast]     = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [apiTiers, setApiTiers] = useState<ApiTier[] | null>(null);
  const [currentTier, setCurrentTier] = useState<TierId | null>(null);
  const [upgrading, setUpgrading] = useState<TierId | null>(null);

  const cardBg     = isLight ? "#FFFFFF" : "#101415";
  const cardBorder = isLight ? "#E2E8F0" : "#222829";
  const textPrimary= isLight ? "#0F172A" : "#E6EBED";
  const textSub    = isLight ? "#64748B" : "#6B7479";
  const textMuted  = isLight ? "#94A3B8" : "#495154";
  const raisedBg   = isLight ? "#F1F5F9" : "#181D1F";
  const accent     = isLight ? "#00D26A" : "#00E676";
  const accentDim  = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBrd  = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";

  useEffect(() => {
    membership.tiers().then(setApiTiers).catch(() => setApiTiers(null));
    if (isLoggedIn()) {
      membership.me().then(m => setCurrentTier(m.tier)).catch(() => {});
    }
  }, []);

  const tiers = TIER_ORDER.map(id => {
    const api = apiTiers?.find(t => t.tier === id);
    const meta = TIER_STATIC[id];
    return {
      id,
      name: meta.name,
      color: meta.color,
      gradient: meta.gradient,
      badge: meta.badge,
      features: meta.features,
      price: api ? Math.round(api.price_paise / 100) : id === "SILVER" ? 199 : id === "GOLD" ? 499 : null,
      current: currentTier === id,
      cta: currentTier === id ? "Current Plan" : `Upgrade to ${meta.name}`,
    };
  });

  async function handleUpgrade(tier: (typeof tiers)[number]) {
    if (tier.current) return;
    if (!isLoggedIn()) { router.push("/login"); return; }
    setUpgrading(tier.id);
    try {
      await membership.upgrade(tier.id);
      setCurrentTier(tier.id);
      setToast(`You're now on the ${tier.name} plan!`);
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Failed to upgrade");
    } finally {
      setUpgrading(null);
      setTimeout(() => setToast(""), 4000);
    }
  }

  return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: isLight ? "#FFFFFF" : "#101415", border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "14px 24px", color: textPrimary, fontSize: 14, fontWeight: 500, zIndex: 999, boxShadow: "0 8px 40px rgba(0,0,0,.35)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}>
          <Star size={14} strokeWidth={2} color={accent} /> {toast}
        </div>
      )}

      <div className="fade-up" style={{ maxWidth: 740, margin: "0 auto", padding: "36px 24px 100px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 999, marginBottom: 16, background: accentDim, border: `1px solid ${accentBrd}`, fontSize: 11, fontWeight: 700, color: accent, letterSpacing: ".1em", textTransform: "uppercase" }}>
            <Star size={11} strokeWidth={2.5} /> MEMBERSHIP
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: textPrimary, marginBottom: 10, letterSpacing: "-.03em" }}>Charge smarter. Save more.</h1>
          <p style={{ fontSize: 15, color: textSub, maxWidth: 460, margin: "0 auto", lineHeight: 1.7 }}>
            Unlock discounts, faster booking, and more points on every charge.
          </p>
        </div>

        {/* Tier cards */}
        <div className="membership-tiers" style={{ marginBottom: 52 }}>
          {tiers.map(tier => {
            const isUpgrading = upgrading === tier.id;
            return (
            <div key={tier.id} style={{
              borderRadius: 24, padding: "24px 20px",
              background: tier.gradient ?? (isLight ? "#FFFFFF" : "#101415"),
              border: tier.current ? `1.5px solid ${isLight ? "#E2E8F0" : "#2E3638"}` : `1.5px solid ${tier.color}40`,
              boxShadow: tier.id === "GOLD" ? `0 0 0 1px ${tier.color}30,0 4px 40px ${tier.color}14` : isLight ? "0 2px 8px rgba(0,0,0,.06)" : "none",
              position: "relative", display: "flex", flexDirection: "column",
              cursor: tier.current ? "default" : "pointer", transition: "transform .15s,box-shadow .15s",
            }}
              onMouseEnter={e => { if (!tier.current) { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = tier.id === "GOLD" ? `0 0 0 1px ${tier.color}50,0 12px 48px ${tier.color}20` : "0 8px 32px rgba(0,0,0,.2)"; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = tier.id === "GOLD" ? `0 0 0 1px ${tier.color}30,0 4px 40px ${tier.color}14` : isLight ? "0 2px 8px rgba(0,0,0,.06)" : "none"; }}
              onClick={() => handleUpgrade(tier)}
            >
              {tier.badge && (
                <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", padding: "4px 14px", borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: ".12em", background: tier.color, color: "#050708", whiteSpace: "nowrap" }}>
                  {tier.badge}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${tier.color}18`, border: `1px solid ${tier.color}35`, display: "grid", placeItems: "center", flexShrink: 0, color: tier.color }}>
                  {tier.id === "GOLD" ? <Star size={16} strokeWidth={2} fill={tier.color} /> : tier.id === "SILVER" ? <Star size={16} strokeWidth={2} /> : <Shield size={16} strokeWidth={2} />}
                </div>
                <span style={{ fontWeight: 800, fontSize: 17, color: tier.color }}>{tier.name}</span>
              </div>

              <div style={{ marginBottom: 22 }}>
                {tier.price ? (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 34, fontWeight: 800, color: textPrimary, letterSpacing: "-.02em" }}>₹{tier.price}</span>
                    <span style={{ fontSize: 13, color: textSub }}>/mo</span>
                  </div>
                ) : (
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 34, fontWeight: 800, color: textPrimary }}>Free</div>
                )}
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
                {tier.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: textSub }}>
                    <Check size={13} strokeWidth={2.5} color={tier.color} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <button onClick={e => { e.stopPropagation(); handleUpgrade(tier); }} disabled={tier.current || isUpgrading} style={{
                width: "100%", padding: "13px", borderRadius: 13, fontSize: 13, fontWeight: 700,
                cursor: tier.current || isUpgrading ? "not-allowed" : "pointer",
                border: tier.current ? `1px solid ${cardBorder}` : "none",
                background: tier.current ? raisedBg : tier.id === "GOLD" ? `linear-gradient(135deg,${tier.color},#E6A000)` : tier.id === "SILVER" ? "linear-gradient(135deg,#94A3B8,#64748B)" : raisedBg,
                color: tier.current ? textMuted : "#050708",
                opacity: tier.current ? 0.7 : isUpgrading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                {isUpgrading
                  ? <><span className="spinner" style={{ borderColor: "rgba(5,7,8,.3)", borderTopColor: "#050708" }} />Upgrading…</>
                  : <>{!tier.current && <ChevronRight size={14} strokeWidth={2.5} />}{tier.cta}</>}
              </button>
            </div>
            );
          })}
        </div>

        {/* Comparison table */}
        <div className="membership-compare-wrap" style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, overflow: "hidden", marginBottom: 40, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div className="membership-compare-row" style={{ padding: "16px 22px", borderBottom: `1px solid ${cardBorder}`, background: raisedBg }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: textSub }}>Feature</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7479", textAlign: "center" }}>Free</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textAlign: "center" }}>Silver</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#FFC043", textAlign: "center" }}>Gold</span>
          </div>
          {COMPARE_ROWS.map((row, i) => (
            <div key={row.feature} className="membership-compare-row" style={{ padding: "13px 22px", fontSize: 13, background: i % 2 === 1 ? raisedBg : "transparent", borderBottom: i < COMPARE_ROWS.length - 1 ? `1px solid ${cardBorder}` : "none" }}>
              <span style={{ color: textSub }}>{row.feature}</span>
              <span style={{ color: textMuted, textAlign: "center" }}>{row.free}</span>
              <span style={{ color: "#94A3B8", textAlign: "center", fontWeight: row.silver !== "—" ? 600 : 400 }}>{row.silver}</span>
              <span style={{ color: "#FFC043", textAlign: "center", fontWeight: row.gold !== "—" ? 600 : 400 }}>{row.gold}</span>
            </div>
          ))}
        </div>

        {/* Trust row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 40 }}>
          {TRUST.map(item => (
            <div key={item.label} style={{ padding: "18px 16px", borderRadius: 18, textAlign: "center", background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.04)" : "none" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, margin: "0 auto 12px", background: accentDim, border: `1px solid ${accentBrd}`, display: "grid", placeItems: "center", color: accent }}>
                <item.Icon size={20} strokeWidth={1.8} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: textMuted }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <h2 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, marginBottom: 18, letterSpacing: "-.01em" }}>Frequently asked questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ background: cardBg, border: `1px solid ${openFaq === i ? accentBrd : cardBorder}`, borderRadius: 16, overflow: "hidden", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.04)" : "none", transition: "border-color .15s" }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{faq.q}</span>
                <ChevronDown size={16} strokeWidth={2} color={openFaq === i ? accent : textMuted} style={{ flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform .2s, color .15s" }} />
              </button>
              {openFaq === i && (
                <div style={{ padding: "0 20px 18px", fontSize: 14, color: textSub, lineHeight: 1.7 }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 36 }}>
          <button onClick={() => router.push("/rewards")} style={{ background: "none", border: "none", color: textMuted, fontSize: 13, cursor: "pointer" }}>
            ← Back to Rewards
          </button>
        </div>
      </div>
    </div>
  );
}
