"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

interface RewardSummary {
  points: number;
  tier: string;
  next_tier: string;
  points_to_next: number;
}

interface RewardTransaction {
  id: string;
  type: "earned" | "redeemed" | "expired";
  points: number;
  description: string;
  created_at: string;
}

const MOCK_SUMMARY: RewardSummary = {
  points: 340,
  tier: "SILVER",
  next_tier: "GOLD",
  points_to_next: 160,
};

const MOCK_HISTORY: RewardTransaction[] = [
  { id: "1", type: "earned",   points: 25,  description: "First booking bonus",                  created_at: new Date(Date.now() - 7  * 864e5).toISOString() },
  { id: "2", type: "earned",   points: 10,  description: "Completed session at DLF Cyber Hub",  created_at: new Date(Date.now() - 5  * 864e5).toISOString() },
  { id: "3", type: "redeemed", points: -50, description: "Discount applied on booking",         created_at: new Date(Date.now() - 3  * 864e5).toISOString() },
  { id: "4", type: "earned",   points: 10,  description: "Completed session at Sector 18 Hub",  created_at: new Date(Date.now() - 1  * 864e5).toISOString() },
];

const TIER_COLOR: Record<string, string> = {
  FREE: "#6B7479", SILVER: "#94A3B8", GOLD: "#FFC043",
};

const TIER_LABEL: Record<string, string> = {
  FREE: "Free", SILVER: "Silver", GOLD: "Gold",
};

export default function RewardsPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [history, setHistory] = useState<RewardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const bg         = isLight ? "#F8FAFC" : "#0A0D0E";
  const cardBg     = isLight ? "#FFFFFF" : "#101415";
  const cardBorder = isLight ? "#E2E8F0" : "#222829";
  const textPrimary= isLight ? "#0F172A" : "#E6EBED";
  const textSub    = isLight ? "#64748B" : "#6B7479";
  const textMuted  = isLight ? "#94A3B8" : "#495154";
  const accent     = isLight ? "#00D26A" : "#00E676";
  const accentDim  = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBrd  = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";
  const raisedBg   = isLight ? "#F1F5F9" : "#181D1F";

  useEffect(() => {
    async function load() {
      try {
        const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        const tok = document.cookie.match(/(?:^|; )cg_access=([^;]*)/);
        const token = tok ? decodeURIComponent(tok[1]) : "";
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const [sRes, hRes] = await Promise.all([
          fetch(`${BASE}/api/v1/rewards/summary`, { headers }),
          fetch(`${BASE}/api/v1/rewards/history`, { headers }),
        ]);

        setSummary(sRes.ok ? await sRes.json() : MOCK_SUMMARY);
        setHistory(hRes.ok ? await hRes.json() : MOCK_HISTORY);
      } catch {
        setSummary(MOCK_SUMMARY);
        setHistory(MOCK_HISTORY);
      } finally {
        setLoading(false);
      }
    }
    checkAuth().then(ok => { if (!ok) { router.push("/login"); return; } load(); });
  }, [router]);

  const tierColor = TIER_COLOR[summary?.tier ?? "FREE"];
  const progress = summary
    ? Math.round((summary.points / (summary.points + summary.points_to_next)) * 100)
    : 0;

  const referralCode = "GURU-DEMO";
  function copyCode() {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: "#222829", borderTopColor: accent }} />
        <span style={{ color: textSub, fontSize: 14 }}>Loading rewards…</span>
      </div>
    </div>
  );

  return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />

      <div className="fade-up" style={{ maxWidth: 600, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>Rewards</h1>
          <p style={{ fontSize: 14, color: textSub }}>Earn points with every charge. Redeem for discounts.</p>
        </div>

        {/* Points balance card */}
        {summary && (
          <div style={{
            background: isLight
              ? "linear-gradient(135deg,#F0FDF4,#ECFDF5)"
              : "linear-gradient(135deg,#0C2319,#101415)",
            border: `1px solid ${accentBrd}`,
            borderRadius: 20, padding: "24px", marginBottom: 16,
            boxShadow: isLight ? "0 2px 12px rgba(0,210,106,.1)" : "0 0 0 1px rgba(0,230,118,.08)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: accent, marginBottom: 6, textTransform: "uppercase" }}>Total Points</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 52, fontWeight: 700, color: textPrimary, lineHeight: 1 }}>
                  {summary.points}
                </div>
                <div style={{ fontSize: 13, color: textSub, marginTop: 6 }}>≈ ₹{Math.floor(summary.points * 0.2)} redeemable</div>
              </div>
              <div style={{
                padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                background: `${tierColor}20`,
                border: `1.5px solid ${tierColor}`,
                color: tierColor,
              }}>
                {TIER_LABEL[summary.tier] ?? summary.tier} Member
              </div>
            </div>

            {/* Progress to next tier */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: textSub, marginBottom: 8 }}>
                <span>{summary.points} pts</span>
                <span>{summary.points_to_next} pts to {TIER_LABEL[summary.next_tier] ?? summary.next_tier}</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${progress}%`, borderRadius: 999,
                  background: `linear-gradient(90deg,${accent},${tierColor})`,
                  transition: "width .6s ease",
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Referral card */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: textMuted, marginBottom: 14, textTransform: "uppercase" }}>Refer a Friend</div>
          <p style={{ fontSize: 14, color: textSub, marginBottom: 16 }}>Earn <strong style={{ color: accent }}>50 points</strong> for every friend who completes their first booking.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{
              flex: 1, padding: "12px 16px", borderRadius: 12,
              background: raisedBg, border: `1px solid ${cardBorder}`,
              fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700,
              color: textPrimary, letterSpacing: ".1em",
            }}>{referralCode}</div>
            <button onClick={copyCode} style={{
              padding: "12px 20px", borderRadius: 12,
              background: copied ? accentDim : accent,
              border: copied ? `1px solid ${accentBrd}` : "none",
              color: copied ? (isLight ? "#059669" : "#4DFFA6") : "#050708",
              fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              transition: "all .15s",
            }}>
              {copied ? "Copied!" : "Copy code"}
            </button>
          </div>
        </div>

        {/* Ways to earn */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: textMuted, marginBottom: 14, textTransform: "uppercase" }}>Ways to Earn</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "⚡", label: "Complete a session",   pts: "+10 pts" },
              { icon: "🎉", label: "First booking bonus",  pts: "+25 pts" },
              { icon: "👥", label: "Refer a friend",       pts: "+50 pts" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 14, background: raisedBg }}>
                <span style={{ fontSize: 22, width: 40, height: 40, borderRadius: 12, background: cardBg, border: `1px solid ${cardBorder}`, display: "grid", placeItems: "center", flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: textPrimary }}>{item.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: accent, fontSize: 14, fontWeight: 700 }}>{item.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction history */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: textMuted, marginBottom: 14, textTransform: "uppercase" }}>History</div>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: textSub }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⭐</div>
              <p style={{ fontSize: 14 }}>No transactions yet. Start charging to earn points!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {history.map((tx, i) => (
                <div key={tx.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "13px 0",
                  borderBottom: i < history.length - 1 ? `1px solid ${cardBorder}` : "none",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: raisedBg, border: `1px solid ${cardBorder}`,
                    display: "grid", placeItems: "center", fontSize: 16,
                  }}>
                    {tx.type === "earned" ? "⭐" : tx.type === "redeemed" ? "🔄" : "⏱"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: textPrimary, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</div>
                    <div style={{ fontSize: 11, color: textMuted }}>
                      {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 15,
                    color: tx.points > 0 ? accent : "#FF5A5F",
                    flexShrink: 0,
                  }}>
                    {tx.points > 0 ? "+" : ""}{tx.points}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

