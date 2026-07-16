"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Award, RefreshCw, Crown, Users as UsersIcon } from "lucide-react";
import { getTheme, authFetch, fmtRupee, fmtDateTime, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import { useAdminData } from "@/components/admin/AdminData";

interface MembershipPaymentRow {
  id: string; user_id: string; tier: string;
  amount: number; status: string; razorpay_order_id: string;
  razorpay_payment_id: string | null; created_at: string;
}
interface PagedResult { items: MembershipPaymentRow[]; total: number; page: number; per_page: number; pages: number; }

const PMT_COLOR: Record<string, string> = { PENDING: C.amber, CAPTURED: C.green, FAILED: C.red, REFUNDED: C.purple };
const PMT_TABS = ["ALL", "CAPTURED", "PENDING", "FAILED", "REFUNDED"];
const TIER_COLOR: Record<string, string> = { SILVER: "#94A3B8", GOLD: C.amber };
const TIER_ICON: Record<string, typeof Crown> = { SILVER: Award, GOLD: Crown };

export default function AdminMembershipPage() {
  const { isLight } = useTheme();
  const th = getTheme(isLight);
  const { userById } = useAdminData();

  const [payments, setPayments] = useState<PagedResult | null>(null);
  const [status,   setStatus]   = useState("ALL");
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const [revenue, setRevenue] = useState<number | null>(null);
  const [sample,  setSample]  = useState<MembershipPaymentRow[]>([]);

  const loadPayments = useCallback(async (p = 1, s = status) => {
    setLoading(true); setError("");
    try {
      const q = s !== "ALL" ? `&status=${s}` : "";
      const res = await authFetch(`/api/v1/admin/membership-payments?page=${p}&per_page=15${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPayments(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [status]);

  const loadRevenue = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/admin/membership-payments/revenue");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRevenue((await res.json()).total_paise);
    } catch { setRevenue(null); }
  }, []);

  // Bounded sample for tier breakdown — same "sampled, not exhaustive" pattern as the dashboard's peak-hours analytics.
  const loadSample = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        authFetch("/api/v1/admin/membership-payments?page=1&per_page=100"),
        authFetch("/api/v1/admin/membership-payments?page=2&per_page=100"),
      ]);
      const i1 = r1.ok ? (await r1.json()).items as MembershipPaymentRow[] : [];
      const i2 = r2.ok ? (await r2.json()).items as MembershipPaymentRow[] : [];
      setSample([...i1, ...i2]);
    } catch { setSample([]); }
  }, []);

  useEffect(() => { loadRevenue(); loadSample(); }, [loadRevenue, loadSample]);
  useEffect(() => { setPage(1); loadPayments(1, status); }, [status]); // eslint-disable-line
  useEffect(() => { loadPayments(page); }, [page, loadPayments]);

  const refresh = () => { loadRevenue(); loadSample(); loadPayments(page); };

  const tierBreakdown = useMemo(() => {
    const paid = sample.filter(p => p.status === "CAPTURED");
    const tiers = ["GOLD", "SILVER"].map(tier => {
      const rows = paid.filter(p => p.tier === tier);
      const revenuePaise = rows.reduce((s, p) => s + p.amount, 0);
      return { tier, count: rows.length, revenue: revenuePaise };
    });
    const totalRevenue = tiers.reduce((s, t) => s + t.revenue, 0) || 1;
    const activeMembers = new Set(paid.map(p => p.user_id)).size;
    return { tiers, totalRevenue, activeMembers, sampledCount: paid.length };
  }, [sample]);

  const tH: React.CSSProperties = { padding: "10px 18px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: th.sub, textAlign: "left", borderBottom: `1px solid ${th.border}`, background: th.raised, whiteSpace: "nowrap" };
  const tD: React.CSSProperties = { padding: "12px 18px", fontSize: 12, color: th.text, borderBottom: `1px solid ${th.border}`, verticalAlign: "middle" };

  function RevCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "22px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
        <div style={{ fontSize: 11, fontWeight: 500, color: th.sub, marginBottom: 12, letterSpacing: "0.04em" }}>{label}</div>
        <div style={{ fontFamily: C.mono, fontSize: 28, fontWeight: 700, color, letterSpacing: "-0.03em", marginBottom: 6 }}>{value}</div>
        <div style={{ fontSize: 11, color: th.sub }}>{sub}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: C.sans }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 20, borderBottom: `1px solid ${th.border}`, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Award size={18} color={C.purple} strokeWidth={2} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: th.text, letterSpacing: "-0.02em" }}>Membership</h1>
            <p style={{ fontSize: 12, color: th.sub, marginTop: 2 }}>Subscription upgrade revenue — Silver &amp; Gold tier payments</p>
          </div>
        </div>
        <button onClick={refresh}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, background: "transparent", border: `1px solid ${th.border}`, color: th.sub, fontSize: 12, cursor: "pointer", fontFamily: C.sans }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, marginBottom: 24, fontSize: 13 }}>{error}</div>}

      <div className="admin-3col" style={{ marginBottom: 24 }}>
        <RevCard label="Membership Revenue (All Time)" value={revenue != null ? fmtRupee(revenue) : "—"} sub={`${payments?.total ?? 0} total upgrade payments`} color={C.purple} />
        <RevCard label="Active Paying Members" value={String(tierBreakdown.activeMembers)} sub={`from ${tierBreakdown.sampledCount} sampled captured payments`} color={C.green} />
        <RevCard label="Avg Revenue per Member" value={tierBreakdown.activeMembers > 0 ? fmtRupee(Math.round(tierBreakdown.totalRevenue / tierBreakdown.activeMembers)) : "—"} sub="across sampled captured payments" color={C.blue} />
      </div>

      <div className="admin-chart-row" style={{ gap: 16, marginBottom: 24 }}>
        {tierBreakdown.tiers.map(t => {
          const color = TIER_COLOR[t.tier];
          const Icon = TIER_ICON[t.tier];
          const pct = Math.round((t.revenue / tierBreakdown.totalRevenue) * 100);
          return (
            <div key={t.tier} style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}35`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} color={color} />
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: th.text }}>{t.tier.charAt(0) + t.tier.slice(1).toLowerCase()} Tier</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontFamily: C.mono, fontSize: 22, fontWeight: 700, color: th.text }}>{fmtRupee(t.revenue)}</div>
                <div style={{ fontSize: 11, color: th.sub }}>{t.count} member{t.count === 1 ? "" : "s"}</div>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: th.muted, marginBottom: 6 }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: color, transition: "width 0.6s" }} />
              </div>
              <div style={{ fontSize: 10.5, color: th.sub }}>{pct}% of sampled membership revenue</div>
            </div>
          );
        })}
        <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `${C.green}18`, border: `1px solid ${C.green}35`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UsersIcon size={15} color={C.green} />
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: th.text }}>Payment Status</span>
          </div>
          {(["CAPTURED", "PENDING", "FAILED", "REFUNDED"] as const).map(s => {
            const count = payments?.items.filter(p => p.status === s).length ?? 0;
            const color = PMT_COLOR[s];
            return (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${th.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: 11.5, color: th.text }}>{s.charAt(0) + s.slice(1).toLowerCase()}</span>
                </div>
                <span style={{ fontFamily: C.mono, fontSize: 12.5, color, fontWeight: 600 }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="admin-table-wrap" style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>Membership Payments</span>
          <div style={{ display: "flex", gap: 5 }}>
            {PMT_TABS.map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: status === s ? 600 : 400,
                cursor: "pointer", fontFamily: C.sans,
                background: status === s ? `${PMT_COLOR[s] ?? C.purple}15` : "transparent",
                border: `1px solid ${status === s ? (PMT_COLOR[s] ?? C.purple) + "40" : th.border}`,
                color: status === s ? (PMT_COLOR[s] ?? C.purple) : th.sub,
              }}>{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}</button>
            ))}
          </div>
        </div>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: th.sub, fontSize: 13 }}>Loading…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Payment ID", "User", "Tier", "Amount", "Status", "Razorpay Order", "Time"].map(h => <th key={h} style={tH}>{h}</th>)}</tr></thead>
            <tbody>
              {payments?.items.length === 0 && <tr><td colSpan={7} style={{ ...tD, textAlign: "center", padding: "40px", color: th.sub }}>No membership payments found.</td></tr>}
              {payments?.items.map(p => {
                const color = PMT_COLOR[p.status] ?? th.sub;
                const tierColor = TIER_COLOR[p.tier] ?? th.sub;
                const user = userById.get(p.user_id);
                return (
                  <tr key={p.id}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = th.raised; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    style={{ transition: "background 0.1s" }}>
                    <td style={tD}>
                      <div style={{ fontFamily: C.mono, fontSize: 11 }}>{p.id.slice(0, 13)}…</div>
                      {p.razorpay_payment_id && <div style={{ fontFamily: C.mono, fontSize: 10, color: th.sub, marginTop: 1 }}>{p.razorpay_payment_id}</div>}
                    </td>
                    <td style={tD}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{user?.full_name ?? "—"}</div>
                      <div style={{ fontSize: 10.5, color: th.sub, marginTop: 1 }}>{user?.phone ?? p.user_id.slice(0, 10) + "…"}</div>
                    </td>
                    <td style={tD}><span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: `${tierColor}14`, border: `1px solid ${tierColor}35`, color: tierColor }}>{p.tier}</span></td>
                    <td style={{ ...tD, fontFamily: C.mono, fontWeight: 700, color: C.green }}>{fmtRupee(p.amount)}</td>
                    <td style={tD}><span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: `${color}14`, border: `1px solid ${color}35`, color }}>{p.status}</span></td>
                    <td style={{ ...tD, fontFamily: C.mono, fontSize: 10, color: th.sub }}>{p.razorpay_order_id.slice(0, 20)}…</td>
                    <td style={{ ...tD, color: th.sub }}>{fmtDateTime(p.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {payments && payments.pages > 1 && (
          <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "14px" }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, cursor: page > 1 ? "pointer" : "default", background: th.raised, border: `1px solid ${th.border}`, color: page > 1 ? th.text : th.sub, fontFamily: C.sans }}>← Prev</button>
            <span style={{ padding: "6px 10px", fontSize: 11, color: th.sub }}>{page} / {payments.pages}</span>
            <button disabled={page === payments.pages} onClick={() => setPage(p => p + 1)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, cursor: page < payments.pages ? "pointer" : "default", background: th.raised, border: `1px solid ${th.border}`, color: page < payments.pages ? th.text : th.sub, fontFamily: C.sans }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
