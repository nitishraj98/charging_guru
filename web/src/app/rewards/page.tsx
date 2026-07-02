"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Users, Gift, Star, Copy, Check, ChevronRight, ArrowUpRight } from "lucide-react";
import { checkAuth } from "@/lib/auth";
import { rewards, RewardSummary, RewardTransaction } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

const TIER_META: Record<string, { color: string; label: string; icon: string }> = {
  FREE:   { color: "#6B7479", label: "Free",   icon: "○" },
  SILVER: { color: "#94A3B8", label: "Silver", icon: "◈" },
  GOLD:   { color: "#FFC043", label: "Gold",   icon: "★" },
};

export default function RewardsPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [history, setHistory] = useState<RewardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [copied, setCopied]   = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");

  const cardBg     = isLight ? "#FFFFFF" : "#101415";
  const cardBorder = isLight ? "#E2E8F0" : "#222829";
  const textPrimary= isLight ? "#0F172A" : "#E6EBED";
  const textSub    = isLight ? "#64748B" : "#6B7479";
  const textMuted  = isLight ? "#94A3B8" : "#495154";
  const accent     = isLight ? "#00D26A" : "#00E676";
  const accentDim  = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBrd  = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";
  const raisedBg   = isLight ? "#F1F5F9" : "#181D1F";

  function load() {
    setLoadError("");
    Promise.all([rewards.summary(), rewards.history()])
      .then(([s, h]) => { setSummary(s); setHistory(h); })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Failed to load rewards"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    checkAuth().then(ok => { if (!ok) { router.push("/login"); return; } load(); });
  }, [router]);

  const tierMeta = TIER_META[summary?.tier ?? "FREE"] ?? TIER_META.FREE;
  const nextMeta = summary?.next_tier ? TIER_META[summary.next_tier] : null;
  const progress  = summary
    ? summary.next_tier ? Math.round((summary.points / (summary.points + summary.points_to_next)) * 100) : 100
    : 0;

  function copyCode() {
    if (!summary) return;
    navigator.clipboard.writeText(summary.referral_code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  async function redeem(points: number) {
    setRedeeming(true); setRedeemError("");
    try {
      await rewards.redeem(points);
      load();
    } catch (e: unknown) {
      setRedeemError(e instanceof Error ? e.message : "Failed to redeem points");
    } finally {
      setRedeeming(false);
    }
  }

  const TX_ICON_MAP: Record<string, React.ReactNode> = {
    EARNED:   <Zap size={16} strokeWidth={2} color={accent} />,
    REDEEMED: <Gift size={16} strokeWidth={2} color="#A78BFA" />,
    EXPIRED:  <Star size={16} strokeWidth={2} color={textMuted} />,
  };

  if (loading) return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: "#222829", borderTopColor: accent }} />
        <span style={{ color: textSub, fontSize: 14 }}>Loading rewards…</span>
      </div>
    </div>
  );

  return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div className="fade-up" style={{ maxWidth: 620, margin: "0 auto", padding: "36px 24px 100px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: textPrimary, marginBottom: 4, letterSpacing: "-.02em" }}>Rewards</h1>
            <p style={{ fontSize: 14, color: textSub }}>Earn points with every charge. Redeem for discounts.</p>
          </div>
          <button onClick={() => router.push("/membership")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 11, background: `${tierMeta.color}14`, border: `1px solid ${tierMeta.color}40`, color: tierMeta.color, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {tierMeta.icon} {tierMeta.label} Member
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* Points balance card */}
        {summary && (
          <div style={{
            background: isLight ? "linear-gradient(135deg,#F0FDF4,#ECFDF5)" : "linear-gradient(135deg,#091F13,#0C1810,#101415)",
            border: `1px solid ${accentBrd}`, borderRadius: 24, padding: "28px 26px", marginBottom: 16,
            boxShadow: isLight ? "0 4px 24px rgba(0,210,106,.12)" : "0 0 0 1px rgba(0,164,85,.1),0 8px 48px rgba(0,230,118,.06)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: isLight ? "rgba(0,210,106,.07)" : "rgba(0,230,118,.04)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".14em", color: accent, marginBottom: 10, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                <Star size={10} strokeWidth={2.5} /> Total balance
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 8 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 60, fontWeight: 800, color: textPrimary, lineHeight: 1, letterSpacing: "-.02em" }}>
                  {summary.points}
                </div>
                <div style={{ paddingBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textSub }}>pts</div>
                  <div style={{ fontSize: 12, color: textMuted }}>≈ ₹{Math.floor(summary.points * 0.2)}</div>
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: textSub, marginBottom: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: tierMeta.color, display: "inline-block" }} />
                    {tierMeta.label}
                  </span>
                  <span style={{ color: textMuted }}>
                    {nextMeta ? `${summary.points_to_next} pts to ${nextMeta.label}` : "Highest tier reached"}
                  </span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, borderRadius: 999, background: `linear-gradient(90deg,${accent},${tierMeta.color})`, transition: "width .8s cubic-bezier(.4,0,.2,1)", boxShadow: `0 0 8px ${accent}60` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: textMuted, marginTop: 6 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>0</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{summary.points + summary.points_to_next}</span>
                </div>
              </div>

              {redeemError && (
                <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 12 }}>{redeemError}</div>
              )}
              <button
                onClick={() => redeem(100)}
                disabled={redeeming || summary.points < 100}
                style={{
                  marginTop: 16, width: "100%", padding: "12px", borderRadius: 12,
                  background: summary.points < 100 ? raisedBg : accent,
                  color: summary.points < 100 ? textMuted : "#050708",
                  fontSize: 13, fontWeight: 700, border: "none",
                  cursor: redeeming || summary.points < 100 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  opacity: redeeming ? 0.6 : 1,
                }}
              >
                {redeeming
                  ? <><span className="spinner" style={{ borderColor: "rgba(5,7,8,.3)", borderTopColor: "#050708" }} />Redeeming…</>
                  : <><Gift size={14} strokeWidth={2} /> Redeem 100 pts for ₹20 off</>}
              </button>
            </div>
          </div>
        )}

        {loadError && (
          <div style={{ padding: "18px 20px", borderRadius: 16, background: "rgba(255,90,95,.07)", border: "1px solid rgba(255,90,95,.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
            <span style={{ color: "#FF5A5F", fontSize: 14 }}>{loadError}</span>
            <button onClick={() => { setLoading(true); load(); }} style={{ padding: "8px 18px", borderRadius: 10, background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 13, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <button onClick={() => router.push("/discover")} style={{ padding: "18px", borderRadius: 18, textAlign: "left", background: cardBg, border: `1px solid ${cardBorder}`, cursor: "pointer", transition: "all .15s", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accentBrd; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = "none"; }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: accentDim, border: `1px solid ${accentBrd}`, display: "grid", placeItems: "center", marginBottom: 12, color: accent }}>
              <Zap size={18} strokeWidth={2} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>Charge now</div>
            <div style={{ fontSize: 12, color: textSub }}>Earn +10 pts / session</div>
          </button>
          <button onClick={() => router.push("/membership")} style={{ padding: "18px", borderRadius: 18, textAlign: "left", background: isLight ? "linear-gradient(135deg,#FFF9EC,#FFFBF0)" : "linear-gradient(135deg,#1A1200,#2A1D00)", border: `1px solid ${isLight ? "#FCD34D60" : "#FFC04330"}`, cursor: "pointer", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,192,67,.15)", border: "1px solid rgba(255,192,67,.3)", display: "grid", placeItems: "center", marginBottom: 12, color: "#FFC043" }}>
              <Star size={18} strokeWidth={2} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>Upgrade plan</div>
            <div style={{ fontSize: 12, color: "#FFC043" }}>Earn 2× on Gold</div>
          </button>
        </div>

        {/* Referral */}
        {summary && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Users size={13} strokeWidth={2} color={textMuted} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: textMuted, textTransform: "uppercase" }}>Refer a Friend</span>
            </div>
            <p style={{ fontSize: 14, color: textSub, marginBottom: 16, lineHeight: 1.6 }}>
              Earn <strong style={{ color: accent }}>50 points</strong> for every friend who completes their first booking.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: raisedBg, border: `1px solid ${cardBorder}`, fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: textPrimary, letterSpacing: ".1em" }}>
                {summary.referral_code}
              </div>
              <button onClick={copyCode} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 20px", borderRadius: 12, background: copied ? accentDim : accent, border: copied ? `1px solid ${accentBrd}` : "none", color: copied ? (isLight ? "#059669" : "#4DFFA6") : "#050708", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all .2s" }}>
                {copied ? <><Check size={13} strokeWidth={2.5} /> Copied!</> : <><Copy size={13} strokeWidth={2} /> Copy code</>}
              </button>
            </div>
          </div>
        )}

        {/* Ways to earn */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <ArrowUpRight size={13} strokeWidth={2} color={textMuted} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: textMuted, textTransform: "uppercase" }}>Ways to Earn</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { Icon: Zap,   label: "Complete a session",  pts: "+10 pts", color: accent },
              { Icon: Gift,  label: "First booking bonus", pts: "+25 pts", color: "#FFC043" },
              { Icon: Users, label: "Refer a friend",      pts: "+50 pts", color: "#A78BFA" },
              { Icon: Star,  label: "Gold member bonus",   pts: "+2×",     color: "#FFC043" },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${cardBorder}` : "none" }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: `${item.color}14`, border: `1px solid ${item.color}25`, display: "grid", placeItems: "center", flexShrink: 0, color: item.color }}>
                  <item.Icon size={17} strokeWidth={2} />
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: textPrimary }}>{item.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: item.color, fontSize: 13, fontWeight: 700, background: `${item.color}14`, padding: "3px 10px", borderRadius: 8 }}>{item.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, overflow: "hidden", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: textMuted, textTransform: "uppercase" }}>History</div>
            <span style={{ fontSize: 12, color: textMuted }}>{history.length} transactions</span>
          </div>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: textSub }}>
              <Star size={32} strokeWidth={1.5} color={textMuted} style={{ margin: "0 auto 10px", display: "block" }} />
              <p style={{ fontSize: 14 }}>No transactions yet. Start charging to earn points!</p>
            </div>
          ) : (
            history.map((tx, i) => (
              <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: i < history.length - 1 ? `1px solid ${cardBorder}` : "none", transition: "background .1s" }}
                onMouseEnter={e => { e.currentTarget.style.background = raisedBg; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: raisedBg, border: `1px solid ${cardBorder}`, display: "grid", placeItems: "center" }}>
                  {TX_ICON_MAP[tx.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: textPrimary, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</div>
                  <div style={{ fontSize: 11, color: textMuted }}>
                    {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14, flexShrink: 0, color: tx.points > 0 ? accent : "#FF5A5F", background: tx.points > 0 ? accentDim : "rgba(255,90,95,.08)", padding: "4px 10px", borderRadius: 8 }}>
                  {tx.points > 0 ? "+" : ""}{tx.points}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
