"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { IndianRupee, TrendingUp, RefreshCw, Award, ArrowUpRight, Search, MapPin } from "lucide-react";
import { getTheme, authFetch, fmtRupee, fmtDateTime, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import { useAdminData } from "@/components/admin/AdminData";
import { admin as adminApi, StationRevenueRow, PagedResult as ApiPagedResult } from "@/lib/api";

interface DayTrend { date: string; bookings: number; revenue_paise: number; }
interface TopStation { id: string; name: string; city: string; revenue_paise: number; bookings: number; }
interface Overview {
  total_users: number; active_stations: number; total_stations: number;
  bookings_today: number; confirmed_bookings_today: number;
  revenue_today_paise: number; revenue_total_paise: number;
  gtv_today_paise: number; gtv_total_paise: number;
  charging_guru_revenue_total_paise: number;
  owner_payouts_total_paise: number; owner_payouts_pending_paise: number;
  completed_sessions_total: number;
  trend_7d: DayTrend[]; top_stations: TopStation[];
  marketplace_volume: { charging_revenue_paise: number; parking_revenue_paise: number; idle_revenue_paise: number; gtv_paise: number };
  charging_guru_revenue: { platform_fee_paise: number; convenience_fee_paise: number; subscription_fee_paise: number; ad_revenue_paise: number; total_paise: number };
  station_payouts: { total_paid_paise: number; pending_paise: number; scheduled_paise: number };
  taxes: { gst_collected_paise: number; gst_payable_paise: number };
}
interface PaymentRow {
  id: string; booking_id: string; user_id: string;
  amount: number; status: string; razorpay_order_id: string;
  razorpay_payment_id: string | null; created_at: string;
}
interface PagedResult { items: PaymentRow[]; total: number; page: number; per_page: number; pages: number; }

const PMT_COLOR: Record<string, string> = { PENDING: C.amber, CAPTURED: C.green, FAILED: C.red, REFUNDED: C.purple };
const PMT_TABS = ["ALL", "CAPTURED", "PENDING", "FAILED", "REFUNDED"];

export default function AdminRevenuePage() {
  const { isLight } = useTheme();
  const th = getTheme(isLight);
  const { userById } = useAdminData();

  const [overview,  setOverview]  = useState<Overview | null>(null);
  const [payments,  setPayments]  = useState<PagedResult | null>(null);
  const [pmtStatus, setPmtStatus] = useState("ALL");
  const [pmtQuery,  setPmtQuery]  = useState("");
  const [pmtPage,   setPmtPage]   = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [pmtLoad,   setPmtLoad]   = useState(false);
  const [error,     setError]     = useState("");

  const [stationRev,      setStationRev]      = useState<ApiPagedResult<StationRevenueRow> | null>(null);
  const [stationRevQuery, setStationRevQuery] = useState("");
  const [stationRevPage,  setStationRevPage]  = useState(1);
  const [stationRevLoad,  setStationRevLoad]  = useState(false);

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

  const loadStationRevenue = useCallback(async (p = 1, q = stationRevQuery) => {
    setStationRevLoad(true);
    try {
      setStationRev(await adminApi.stationsRevenue(p, 15, q || undefined));
    } catch { setStationRev(null); }
    finally { setStationRevLoad(false); }
  }, [stationRevQuery]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { setPmtPage(1); loadPayments(1, pmtStatus); }, [pmtStatus]); // eslint-disable-line
  useEffect(() => { loadPayments(pmtPage); }, [pmtPage, loadPayments]);
  useEffect(() => { loadStationRevenue(1, stationRevQuery); }, [stationRevQuery]); // eslint-disable-line
  useEffect(() => { loadStationRevenue(stationRevPage); }, [stationRevPage, loadStationRevenue]);

  const filteredPayments = useMemo(() => {
    const items = payments?.items ?? [];
    const q = pmtQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(p => {
      const u = userById.get(p.user_id);
      return (u?.full_name ?? "").toLowerCase().includes(q)
        || (u?.phone ?? "").toLowerCase().includes(q)
        || p.id.toLowerCase().includes(q)
        || p.razorpay_order_id.toLowerCase().includes(q)
        || (p.razorpay_payment_id ?? "").toLowerCase().includes(q);
    });
  }, [payments, pmtQuery, userById]);

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
            <p style={{ fontSize: 12, color: th.sub, marginTop: 2 }}>Charging &amp; booking payments — see <Link href="/admin/membership" style={{ color: C.purple }}>Membership</Link> for subscription revenue</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/admin/payouts"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, background: `${C.teal}10`, border: `1px solid ${C.teal}30`, color: C.teal, fontSize: 12, textDecoration: "none", fontFamily: C.sans }}>
            <IndianRupee size={12} /> Manage Payouts <ArrowUpRight size={11} />
          </Link>
          <Link href="/admin/membership"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, background: `${C.purple}10`, border: `1px solid ${C.purple}30`, color: C.purple, fontSize: 12, textDecoration: "none", fontFamily: C.sans }}>
            <Award size={12} /> Membership Revenue <ArrowUpRight size={11} />
          </Link>
          <button onClick={() => { loadOverview(); loadPayments(pmtPage); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, background: "transparent", border: `1px solid ${th.border}`, color: th.sub, fontSize: 12, cursor: "pointer", fontFamily: C.sans }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, marginBottom: 24, fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px", color: th.sub, fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          {/* Top KPI row */}
          <div className="admin-3col" style={{ marginBottom: 24 }}>
            <RevCard label="Gross Transaction Value" value={overview ? fmtRupee(overview.gtv_total_paise) : "—"} sub="all-time, total money processed" color={C.green} />
            <RevCard label="Charging Guru Revenue" value={overview ? fmtRupee(overview.charging_guru_revenue_total_paise) : "—"} sub="platform + convenience fees" color={C.purple} />
            <RevCard label="Station Owner Payouts" value={overview ? fmtRupee(overview.owner_payouts_total_paise) : "—"} sub={`${overview ? fmtRupee(overview.owner_payouts_pending_paise) : "—"} pending`} color={C.teal} />
          </div>

          {/* Marketplace Volume / Charging Guru Revenue / Station Payouts / Taxes */}
          <div className="admin-fin-row" style={{ marginBottom: 24 }}>
            <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 650, color: th.text, marginBottom: 12 }}>Marketplace Volume</div>
              {[
                ["Charging Revenue", overview?.marketplace_volume.charging_revenue_paise ?? 0],
                ["Parking Revenue", overview?.marketplace_volume.parking_revenue_paise ?? 0],
                ["Idle Fee Revenue", overview?.marketplace_volume.idle_revenue_paise ?? 0],
                ["Gross Transaction Value", overview?.marketplace_volume.gtv_paise ?? 0],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
                  <span style={{ color: th.sub }}>{label}</span>
                  <span style={{ fontFamily: C.mono, fontWeight: 700, color: th.text }}>{fmtRupee(val as number)}</span>
                </div>
              ))}
            </div>

            <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 650, color: th.text, marginBottom: 12 }}>Charging Guru Revenue</div>
              {[
                ["Platform Fees", overview?.charging_guru_revenue.platform_fee_paise ?? 0, false],
                ["Convenience Fees", overview?.charging_guru_revenue.convenience_fee_paise ?? 0, false],
                ["Subscription Revenue", overview?.charging_guru_revenue.subscription_fee_paise ?? 0, true],
                ["Advertisement Revenue", overview?.charging_guru_revenue.ad_revenue_paise ?? 0, true],
              ].map(([label, val, muted]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12, opacity: muted ? 0.55 : 1 }}>
                  <span style={{ color: th.sub }}>{label}{muted ? " (soon)" : ""}</span>
                  <span style={{ fontFamily: C.mono, fontWeight: 700, color: th.text }}>{fmtRupee(val as number)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", marginTop: 4, borderTop: `1px solid ${th.border}`, fontSize: 12.5, fontWeight: 700 }}>
                <span style={{ color: th.text }}>Total</span>
                <span style={{ fontFamily: C.mono, color: C.green }}>{fmtRupee(overview?.charging_guru_revenue.total_paise ?? 0)}</span>
              </div>
            </div>

            <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 650, color: th.text, marginBottom: 12 }}>Station Payouts</div>
              {[
                ["Total Paid", overview?.station_payouts.total_paid_paise ?? 0, C.green],
                ["Pending", overview?.station_payouts.pending_paise ?? 0, C.amber],
                ["Scheduled", overview?.station_payouts.scheduled_paise ?? 0, C.blue],
              ].map(([label, val, color]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
                  <span style={{ color: th.sub }}>{label as string}</span>
                  <span style={{ fontFamily: C.mono, fontWeight: 700, color: color as string }}>{fmtRupee(val as number)}</span>
                </div>
              ))}
            </div>

            <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 650, color: th.text, marginBottom: 12 }}>Taxes</div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
                <span style={{ color: th.sub }}>GST Collected</span>
                <span style={{ fontFamily: C.mono, fontWeight: 700, color: th.text }}>{fmtRupee(overview?.taxes.gst_collected_paise ?? 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
                <span style={{ color: th.sub }}>GST Payable</span>
                <span style={{ fontFamily: C.mono, fontWeight: 700, color: th.text }}>{fmtRupee(overview?.taxes.gst_payable_paise ?? 0)}</span>
              </div>
              <div style={{ fontSize: 10, color: th.sub, marginTop: 8, opacity: 0.7 }}>No input-credit modeling — payable mirrors collected.</div>
            </div>
          </div>

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

          <div className="admin-table-wrap" style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: th.text, display: "flex", alignItems: "center", gap: 7 }}>
                <MapPin size={13} color={th.sub} /> Revenue by Station
              </span>
              <div style={{ position: "relative", width: 260 }}>
                <Search size={12} color={th.sub} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={stationRevQuery}
                  onChange={e => { setStationRevQuery(e.target.value); setStationRevPage(1); }}
                  placeholder="Search station, owner…"
                  style={{ width: "100%", boxSizing: "border-box", padding: "6px 10px 6px 28px", borderRadius: 8, background: th.raised, border: `1px solid ${th.border}`, color: th.text, fontSize: 11.5, outline: "none", fontFamily: C.sans }}
                />
              </div>
            </div>
            {stationRevLoad ? (
              <div style={{ padding: "40px", textAlign: "center", color: th.sub, fontSize: 13 }}>Loading…</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Station", "Owner", "GTV", "Owner Earnings", "Charging Guru", "GST", "Txns"].map(h => <th key={h} style={tH}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(stationRev?.items.length ?? 0) === 0 && (
                    <tr><td colSpan={7} style={{ ...tD, textAlign: "center", padding: "40px", color: th.sub }}>
                      {stationRevQuery ? "No stations match your search." : "No stations found."}
                    </td></tr>
                  )}
                  {stationRev?.items.map(s => (
                    <tr key={s.station_id}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = th.raised; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                      style={{ transition: "background 0.1s" }}>
                      <td style={tD}>
                        <div style={{ fontWeight: 500 }}>{s.station_name}</div>
                        <div style={{ fontSize: 10.5, color: th.sub, marginTop: 1 }}>{s.city}</div>
                      </td>
                      <td style={{ ...tD, color: th.sub }}>{s.owner_name}</td>
                      <td style={{ ...tD, fontFamily: C.mono, fontWeight: 700, color: C.green }}>{fmtRupee(s.gtv_paise)}</td>
                      <td style={{ ...tD, fontFamily: C.mono, color: th.text }}>{fmtRupee(s.owner_earnings_paise)}</td>
                      <td style={{ ...tD, fontFamily: C.mono, color: C.purple }}>{fmtRupee(s.charging_guru_earnings_paise)}</td>
                      <td style={{ ...tD, fontFamily: C.mono, fontSize: 11, color: th.sub }}>{fmtRupee(s.gst_collected_paise)}</td>
                      <td style={{ ...tD, fontFamily: C.mono, fontSize: 11, color: th.sub }}>{s.transaction_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {stationRev && stationRev.pages > 1 && (
              <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "14px" }}>
                <button disabled={stationRevPage === 1} onClick={() => setStationRevPage(p => p - 1)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, cursor: stationRevPage > 1 ? "pointer" : "default", background: th.raised, border: `1px solid ${th.border}`, color: stationRevPage > 1 ? th.text : th.sub, fontFamily: C.sans }}>← Prev</button>
                <span style={{ padding: "6px 10px", fontSize: 11, color: th.sub }}>{stationRevPage} / {stationRev.pages}</span>
                <button disabled={stationRevPage === stationRev.pages} onClick={() => setStationRevPage(p => p + 1)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, cursor: stationRevPage < stationRev.pages ? "pointer" : "default", background: th.raised, border: `1px solid ${th.border}`, color: stationRevPage < stationRev.pages ? th.text : th.sub, fontFamily: C.sans }}>Next →</button>
              </div>
            )}
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
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${th.border}` }}>
              <div style={{ position: "relative", maxWidth: 340 }}>
                <Search size={13} color={th.sub} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={pmtQuery}
                  onChange={e => setPmtQuery(e.target.value)}
                  placeholder="Search by user, phone, payment or order ID…"
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 32px", borderRadius: 9, background: th.raised, border: `1px solid ${th.border}`, color: th.text, fontSize: 12, outline: "none", fontFamily: C.sans }}
                />
              </div>
            </div>
            {pmtLoad ? (
              <div style={{ padding: "40px", textAlign: "center", color: th.sub, fontSize: 13 }}>Loading…</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Payment ID", "User", "Amount", "Status", "Razorpay Order", "Time"].map(h => <th key={h} style={tH}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredPayments.length === 0 && <tr><td colSpan={6} style={{ ...tD, textAlign: "center", padding: "40px", color: th.sub }}>{pmtQuery ? "No payments match your search." : "No payments found."}</td></tr>}
                  {filteredPayments.map(p => {
                    const color = PMT_COLOR[p.status] ?? th.sub;
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
        </>
      )}
    </div>
  );
}
