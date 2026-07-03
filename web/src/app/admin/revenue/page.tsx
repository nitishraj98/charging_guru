"use client";
import { useEffect, useState, useCallback } from "react";
import { IndianRupee, TrendingUp, RefreshCw } from "lucide-react";
import { getTheme, authFetch, fmtRupee, fmtDateTime, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";

interface DayTrend { date: string; bookings: number; revenue_paise: number; }
interface TopStation { id: string; name: string; city: string; revenue_paise: number; bookings: number; }
interface Overview {
  total_users: number; active_stations: number; total_stations: number;
  bookings_today: number; confirmed_bookings_today: number;
  revenue_today_paise: number; revenue_total_paise: number;
  trend_7d: DayTrend[]; top_stations: TopStation[];
}
interface PaymentRow {
  id: string; booking_id: string; user_id: string;
  amount: number; status: string; razorpay_order_id: string;
  razorpay_payment_id: string | null; created_at: string;
}
interface PagedResult { items: PaymentRow[]; total: number; page: number; per_page: number; pages: number; }

interface MembershipPaymentRow {
  id: string; user_id: string; tier: string;
  amount: number; status: string; razorpay_order_id: string;
  razorpay_payment_id: string | null; created_at: string;
}
interface MembershipPagedResult { items: MembershipPaymentRow[]; total: number; page: number; per_page: number; pages: number; }

const PMT_COLOR: Record<string, string> = { PENDING: C.amber, CAPTURED: C.green, FAILED: C.red, REFUNDED: C.purple };
const PMT_TABS = ["ALL", "CAPTURED", "PENDING", "FAILED", "REFUNDED"];
const TIER_COLOR: Record<string, string> = { SILVER: C.blue, GOLD: C.amber };

export default function AdminRevenuePage() {
  const { isLight } = useTheme();
  const th = getTheme(isLight);

  const [overview,  setOverview]  = useState<Overview | null>(null);
  const [payments,  setPayments]  = useState<PagedResult | null>(null);
  const [pmtStatus, setPmtStatus] = useState("ALL");
  const [pmtPage,   setPmtPage]   = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [pmtLoad,   setPmtLoad]   = useState(false);
  const [error,     setError]     = useState("");

  const [memPayments, setMemPayments] = useState<MembershipPagedResult | null>(null);
  const [memRevenue,  setMemRevenue]  = useState<number | null>(null);
  const [memPage,     setMemPage]     = useState(1);
  const [memLoad,     setMemLoad]     = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await authFetch("/api/v1/admin/analytics/overview");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOverview(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, []);

  const loadPayments = useCallback(async (p = 1, s = pmtStatus) => {
    setPmtLoad(true);
    try {
      const q = s !== "ALL" ? `&status=${s}` : "";
      const res = await authFetch(`/api/v1/admin/payments?page=${p}&per_page=15${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPayments(await res.json());
    } catch { setPayments(null); }
    finally { setPmtLoad(false); }
  }, [pmtStatus]);

  const loadMembershipPayments = useCallback(async (p = 1) => {
    setMemLoad(true);
    try {
      const res = await authFetch(`/api/v1/admin/membership-payments?page=${p}&per_page=15`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMemPayments(await res.json());
    } catch { setMemPayments(null); }
    finally { setMemLoad(false); }
  }, []);

  const loadMembershipRevenue = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/admin/membership-payments/revenue");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setMemRevenue(body.total_paise);
    } catch { setMemRevenue(null); }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { setPmtPage(1); loadPayments(1, pmtStatus); }, [pmtStatus]); // eslint-disable-line
  useEffect(() => { loadPayments(pmtPage); }, [pmtPage, loadPayments]);
  useEffect(() => { loadMembershipRevenue(); }, [loadMembershipRevenue]);
  useEffect(() => { loadMembershipPayments(memPage); }, [memPage, loadMembershipPayments]);

  const topSt  = overview?.top_stations ?? [];
  const maxRev = topSt.length > 0 ? Math.max(...topSt.map(s => s.revenue_paise)) || 1 : 1;
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

  function TrendChart({ data }: { data: DayTrend[] }) {
    if (!data.length) return null;
    const maxRev2 = Math.max(...data.map(d => d.revenue_paise)) || 1;
    const maxBk   = Math.max(...data.map(d => d.bookings)) || 1;
    const W = 560, H = 110, PAD = 8;
    const pts = (key: "revenue_paise" | "bookings", max: number) =>
      data.map((d, i) => {
        const x = PAD + (i / (data.length - 1)) * (W - 2 * PAD);
        const y = H - PAD - (d[key] / max) * (H - 2 * PAD);
        return `${x},${y}`;
      }).join(" ");
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: th.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={14} color={th.sub} /> 7-Day Trend
          <div style={{ display: "flex", gap: 16, marginLeft: "auto" }}>
            <span style={{ fontSize: 11, color: C.green, display: "flex", alignItems: "center", gap: 4 }}><span style={{ display: "inline-block", width: 20, height: 2, background: C.green, borderRadius: 1 }} />Revenue</span>
            <span style={{ fontSize: 11, color: C.blue, display: "flex", alignItems: "center", gap: 4 }}><span style={{ display: "inline-block", width: 20, height: 2, background: C.blue, borderRadius: 1 }} />Bookings</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
          <polyline points={pts("revenue_paise", maxRev2)} fill="none" stroke={C.green} strokeWidth={2} strokeLinejoin="round" />
          {data.map((d, i) => { const x = PAD + (i / (data.length - 1)) * (W - 2 * PAD); const y = H - PAD - (d.revenue_paise / maxRev2) * (H - 2 * PAD); return <circle key={i} cx={x} cy={y} r={3} fill={C.green} />; })}
          <polyline points={pts("bookings", maxBk)} fill="none" stroke={C.blue} strokeWidth={1.5} strokeLinejoin="round" strokeDasharray="4 3" />
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          {data.map((d, i) => (
            <div key={i} style={{ fontSize: 9, color: th.sub, textAlign: "center" }}>
              <div>{d.date}</div>
              <div style={{ color: th.muted, marginTop: 1 }}>{d.bookings}bk</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: C.sans }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 20, borderBottom: `1px solid ${th.border}`, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IndianRupee size={18} color={C.green} strokeWidth={2} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: th.text, letterSpacing: "-0.02em" }}>Revenue</h1>
            <p style={{ fontSize: 12, color: th.sub, marginTop: 2 }}>Financial overview from the operations backend</p>
          </div>
        </div>
        <button onClick={() => { loadOverview(); loadPayments(pmtPage); loadMembershipRevenue(); loadMembershipPayments(memPage); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, background: "transparent", border: `1px solid ${th.border}`, color: th.sub, fontSize: 12, cursor: "pointer", fontFamily: C.sans }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, marginBottom: 24, fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px", color: th.sub, fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          <div className="admin-3col" style={{ marginBottom: 24 }}>
            <RevCard label="Revenue Today" value={overview ? fmtRupee(overview.revenue_today_paise) : "—"} sub={`${overview?.confirmed_bookings_today ?? 0} confirmed bookings`} color={C.green} />
            <RevCard label="Total Revenue (All Time)" value={overview ? fmtRupee(overview.revenue_total_paise) : "—"} sub={`${overview?.bookings_today ?? 0} bookings today`} color={C.blue} />
            <RevCard label="Avg per Booking Today" value={overview && overview.bookings_today > 0 ? fmtRupee(Math.round(overview.revenue_today_paise / overview.bookings_today)) : "—"} sub={`${payments?.total ?? 0} total transactions`} color={C.purple} />
          </div>

          {overview?.trend_7d && overview.trend_7d.length > 0 && (
            <div style={{ marginBottom: 24 }}><TrendChart data={overview.trend_7d} /></div>
          )}

          <div className="admin-chart-row" style={{ gap: 16, marginBottom: 24 }}>
            <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${th.border}`, fontSize: 13, fontWeight: 600, color: th.text, display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={13} color={th.sub} /> Top Stations by Revenue
              </div>
              <div style={{ padding: "14px 20px" }}>
                {topSt.length === 0 && <div style={{ color: th.sub, fontSize: 13, textAlign: "center", padding: "24px" }}>No revenue data yet.</div>}
                {topSt.map((s, i) => {
                  const pct   = Math.round((s.revenue_paise / maxRev) * 100);
                  const color = [C.green, C.blue, C.purple, C.amber, C.teal][i % 5];
                  return (
                    <div key={s.id} style={{ marginBottom: i < topSt.length - 1 ? 14 : 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: th.text }}>{s.name} <span style={{ fontSize: 10, color: th.sub }}>{s.city}</span></div>
                        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                          <span style={{ fontFamily: C.mono, fontSize: 10, color: th.sub }}>{s.bookings}bk</span>
                          <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 600, color }}>{fmtRupee(s.revenue_paise)}</span>
                        </div>
                      </div>
                      <div style={{ height: 4, borderRadius: 999, background: th.muted }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: color, transition: "width 0.6s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "14px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: th.text, marginBottom: 14 }}>Payment Status</div>
              {(["CAPTURED", "PENDING", "FAILED", "REFUNDED"] as const).map(s => {
                const count = payments?.items.filter(p => p.status === s).length ?? 0;
                const color = PMT_COLOR[s];
                return (
                  <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${th.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: 12, color: th.text }}>{s.charAt(0) + s.slice(1).toLowerCase()}</span>
                    </div>
                    <span style={{ fontFamily: C.mono, fontSize: 13, color, fontWeight: 600 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="admin-table-wrap" style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>Payment Transactions</span>
              <div style={{ display: "flex", gap: 5 }}>
                {PMT_TABS.map(s => (
                  <button key={s} onClick={() => setPmtStatus(s)} style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: pmtStatus === s ? 600 : 400,
                    cursor: "pointer", fontFamily: C.sans,
                    background: pmtStatus === s ? `${PMT_COLOR[s] ?? C.green}15` : "transparent",
                    border: `1px solid ${pmtStatus === s ? (PMT_COLOR[s] ?? C.green) + "40" : th.border}`,
                    color: pmtStatus === s ? (PMT_COLOR[s] ?? C.green) : th.sub,
                  }}>{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}</button>
                ))}
              </div>
            </div>
            {pmtLoad ? (
              <div style={{ padding: "40px", textAlign: "center", color: th.sub, fontSize: 13 }}>Loading…</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Payment ID", "Amount", "Status", "Razorpay Order", "Time"].map(h => <th key={h} style={tH}>{h}</th>)}</tr></thead>
                <tbody>
                  {payments?.items.length === 0 && <tr><td colSpan={5} style={{ ...tD, textAlign: "center", padding: "40px", color: th.sub }}>No payments found.</td></tr>}
                  {payments?.items.map(p => {
                    const color = PMT_COLOR[p.status] ?? th.sub;
                    return (
                      <tr key={p.id}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = th.raised; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                        style={{ transition: "background 0.1s" }}>
                        <td style={tD}>
                          <div style={{ fontFamily: C.mono, fontSize: 11 }}>{p.id.slice(0, 13)}…</div>
                          {p.razorpay_payment_id && <div style={{ fontFamily: C.mono, fontSize: 10, color: th.sub, marginTop: 1 }}>{p.razorpay_payment_id}</div>}
                        </td>
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
                <button disabled={pmtPage === 1} onClick={() => setPmtPage(p => p - 1)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, cursor: pmtPage > 1 ? "pointer" : "default", background: th.raised, border: `1px solid ${th.border}`, color: pmtPage > 1 ? th.text : th.sub, fontFamily: C.sans }}>← Prev</button>
                <span style={{ padding: "6px 10px", fontSize: 11, color: th.sub }}>{pmtPage} / {payments.pages}</span>
                <button disabled={pmtPage === payments.pages} onClick={() => setPmtPage(p => p + 1)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, cursor: pmtPage < payments.pages ? "pointer" : "default", background: th.raised, border: `1px solid ${th.border}`, color: pmtPage < payments.pages ? th.text : th.sub, fontFamily: C.sans }}>Next →</button>
              </div>
            )}
          </div>

          {/* ── Membership payments ── */}
          <div style={{ marginTop: 24 }}>
            <RevCard label="Membership Revenue (All Time)" value={memRevenue != null ? fmtRupee(memRevenue) : "—"} sub={`${memPayments?.total ?? 0} total upgrade payments`} color={C.purple} />
          </div>

          <div className="admin-table-wrap" style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden", marginTop: 16 }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>Membership Payments</span>
            </div>
            {memLoad ? (
              <div style={{ padding: "40px", textAlign: "center", color: th.sub, fontSize: 13 }}>Loading…</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Payment ID", "Tier", "Amount", "Status", "Razorpay Order", "Time"].map(h => <th key={h} style={tH}>{h}</th>)}</tr></thead>
                <tbody>
                  {memPayments?.items.length === 0 && <tr><td colSpan={6} style={{ ...tD, textAlign: "center", padding: "40px", color: th.sub }}>No membership payments found.</td></tr>}
                  {memPayments?.items.map(p => {
                    const color = PMT_COLOR[p.status] ?? th.sub;
                    const tierColor = TIER_COLOR[p.tier] ?? th.sub;
                    return (
                      <tr key={p.id}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = th.raised; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                        style={{ transition: "background 0.1s" }}>
                        <td style={tD}>
                          <div style={{ fontFamily: C.mono, fontSize: 11 }}>{p.id.slice(0, 13)}…</div>
                          {p.razorpay_payment_id && <div style={{ fontFamily: C.mono, fontSize: 10, color: th.sub, marginTop: 1 }}>{p.razorpay_payment_id}</div>}
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
            {memPayments && memPayments.pages > 1 && (
              <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "14px" }}>
                <button disabled={memPage === 1} onClick={() => setMemPage(p => p - 1)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, cursor: memPage > 1 ? "pointer" : "default", background: th.raised, border: `1px solid ${th.border}`, color: memPage > 1 ? th.text : th.sub, fontFamily: C.sans }}>← Prev</button>
                <span style={{ padding: "6px 10px", fontSize: 11, color: th.sub }}>{memPage} / {memPayments.pages}</span>
                <button disabled={memPage === memPayments.pages} onClick={() => setMemPage(p => p + 1)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, cursor: memPage < memPayments.pages ? "pointer" : "default", background: th.raised, border: `1px solid ${th.border}`, color: memPage < memPayments.pages ? th.text : th.sub, fontFamily: C.sans }}>Next →</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
