"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap, Users, IndianRupee, PlugZap, Activity,
  ArrowUpRight, RefreshCw, AlertCircle,
  CheckCircle, TrendingUp, Download, UserPlus,
  MapPin, Wifi, Shield, Clock, BarChart2, Building2,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { getTheme, authFetch, fmtRupee, fmtDateTime, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemeTokens } from "@/lib/admin-ui";
import { useAdminData } from "@/components/admin/AdminData";

interface Overview {
  total_users: number; total_stations: number; active_stations: number;
  pending_stations: number; total_chargers: number;
  bookings_today: number; confirmed_bookings_today: number;
  revenue_today_paise: number; revenue_total_paise: number;
  trend_7d: { date: string; bookings: number; revenue_paise: number }[];
  charger_breakdown: Record<string, number>;
  top_stations: { id: string; name: string; city: string; revenue_paise: number; bookings: number }[];
}
interface AdminBooking {
  id: string; user_id: string; station_id: string; charger_id: string;
  status: string; amount: number; created_at: string; slot_start: string; slot_end: string;
}
const PAID = new Set(["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"]);

// ─── Card shell ───────────────────────────────────────────────────────────────
function Card({ title, Icon, action, children, th, pad = true, style }: {
  title: string; Icon?: React.ElementType; action?: React.ReactNode;
  children: React.ReactNode; th: ThemeTokens; pad?: boolean; style?: React.CSSProperties;
}) {
  return (
    <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column", ...style }}>
      <div style={{ padding: "11px 16px", borderBottom: `1px solid ${th.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {Icon && <Icon size={12} color={th.sub} strokeWidth={1.75} />}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: th.text, flex: 1, letterSpacing: "-0.01em" }}>{title}</span>
        {action}
      </div>
      <div style={{ flex: 1, minHeight: 0, ...(pad ? { padding: "14px 16px" } : {}) }}>{children}</div>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, Icon: I, color, href, th }: {
  label: string; value: string; sub?: string; Icon: React.ElementType;
  color: string; href?: string; th: ThemeTokens;
}) {
  const [hov, setHov] = useState(false);
  const inner = (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: th.card, border: `1px solid ${hov && href ? color + "45" : th.border}`, borderRadius: 14,
      padding: "16px 18px", position: "relative", overflow: "hidden", cursor: href ? "pointer" : "default",
      transition: "all 0.15s", transform: hov && href ? "translateY(-1px)" : "none",
      boxShadow: hov && href ? `0 6px 20px rgba(0,0,0,0.1), 0 0 0 1px ${color}18` : "none", height: "100%",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color} 0%, ${color}00 100%)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}12`, border: `1px solid ${color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <I size={15} color={color} strokeWidth={1.75} />
        </div>
        {href && <ArrowUpRight size={12} color={hov ? color : th.muted} style={{ transition: "color 0.15s" }} />}
      </div>
      <div style={{ fontFamily: C.mono, fontSize: 26, fontWeight: 700, color: th.text, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 5 }}>{value}</div>
      <div style={{ fontSize: 11, color: th.sub, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color, marginTop: 4, fontWeight: 600, opacity: 0.8 }}>{sub}</div>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none", display: "block", height: "100%" }}>{inner}</Link> : inner;
}

function ActionBtn({ Icon: I, label, onClick, badge, color = C.green, th }: {
  Icon: React.ElementType; label: string; onClick?: () => void;
  badge?: string; color?: string; th: ThemeTokens;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 9, background: hov ? `${color}09` : "transparent", border: `1px solid ${hov ? color + "40" : th.border}`, cursor: "pointer", fontFamily: C.sans, transition: "all 0.12s" }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: hov ? `${color}16` : th.raised, border: `1px solid ${hov ? color + "30" : th.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.12s" }}>
        <I size={13} color={hov ? color : th.sub} strokeWidth={1.75} />
      </div>
      <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: hov ? th.text : th.sub, textAlign: "left" }}>{label}</span>
      {badge && <span style={{ padding: "1px 6px", borderRadius: 999, fontSize: 9, fontWeight: 700, fontFamily: C.mono, background: `${C.amber}15`, border: `1px solid ${C.amber}30`, color: C.amber }}>{badge}</span>}
    </button>
  );
}

function tooltipStyle(th: ThemeTokens) {
  return { background: th.card, border: `1px solid ${th.border}`, borderRadius: 10, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,.2)" };
}

function hourLabel(h: number): string {
  const period = h < 12 ? "a" : "p";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${period}`;
}

function DonutLegend({ items, th }: { items: { name: string; value: number; color: string }[]; th: ThemeTokens }) {
  return (
    <div style={{ width: "100%", marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
      {items.map(d => (
        <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", opacity: d.value > 0 ? 1 : 0.4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: th.sub }}>{d.name}</span>
          </div>
          <span style={{ fontSize: 11, fontFamily: C.mono, fontWeight: 700, color: th.text }}>{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const { isLight } = useTheme();
  const th = getTheme(isLight);
  const { stationById, loading: refLoading } = useAdminData();

  const [data,     setData]     = useState<Overview | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [clock,    setClock]    = useState("");
  const [dbOk,     setDbOk]     = useState<boolean | null>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })), 1000);
    setClock(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [ovRes, bkRes1, bkRes2] = await Promise.all([
        authFetch("/api/v1/admin/analytics/overview"),
        authFetch("/api/v1/admin/bookings?page=1&per_page=100"),
        authFetch("/api/v1/admin/bookings?page=2&per_page=100"),
      ]);
      if (ovRes.status === 403) { router.push("/"); return; }
      if (!ovRes.ok) throw new Error(`HTTP ${ovRes.status}`);
      setData(await ovRes.json());
      setDbOk(true);
      const b1 = bkRes1.ok ? (await bkRes1.json()).items as AdminBooking[] : [];
      const b2 = bkRes2.ok ? (await bkRes2.json()).items as AdminBooking[] : [];
      setBookings([...b1, ...b2]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
      setDbOk(false);
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);
  // Gentle real auto-refresh of the recent-activity feed — not a fake ticker.
  useEffect(() => {
    const t = setInterval(() => {
      authFetch("/api/v1/admin/bookings?page=1&per_page=100")
        .then(r => r.ok ? r.json() : null)
        .then(json => { if (json) setBookings(prev => [...(json.items as AdminBooking[]), ...prev.slice(100)]); })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  // ── Real derived analytics (no fabricated data) ──
  const analytics = useMemo(() => {
    const paid = bookings.filter(b => PAID.has(b.status));

    // Peak charging hours — real histogram from slot_start across sampled bookings.
    const hourCounts = new Array(24).fill(0);
    paid.forEach(b => { if (b.slot_start) hourCounts[new Date(b.slot_start).getHours()]++; });
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakData = hourCounts.map((v, h) => ({ hour: h, value: v }));
    const hourTotal = hourCounts.reduce((s, v) => s + v, 0);

    // Time-of-day split — real, derived from the same hour histogram.
    const dayParts = [
      { label: "Night",     range: "12a–6a",  hours: [0, 1, 2, 3, 4, 5],       color: C.purple },
      { label: "Morning",   range: "6a–12p",  hours: [6, 7, 8, 9, 10, 11],     color: C.amber },
      { label: "Afternoon", range: "12p–6p",  hours: [12, 13, 14, 15, 16, 17], color: C.blue },
      { label: "Evening",   range: "6p–12a",  hours: [18, 19, 20, 21, 22, 23], color: C.green },
    ].map(p => ({ ...p, value: p.hours.reduce((s, h) => s + hourCounts[h], 0) }));

    // Revenue by city — real join: booking -> station -> city.
    const cityRevenue = new Map<string, number>();
    paid.forEach(b => {
      const st = stationById.get(b.station_id);
      const city = st?.city ?? "Unknown";
      cityRevenue.set(city, (cityRevenue.get(city) ?? 0) + b.amount);
    });
    const cityData = Array.from(cityRevenue.entries())
      .map(([city, revenue]) => ({ city, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
    const maxCityRev = Math.max(...cityData.map(c => c.revenue), 1);

    // Recent activity — real, sorted by creation time.
    const recent = [...bookings].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);

    return { peakHour, peakData, hourTotal, dayParts, cityData, maxCityRev, recent };
  }, [bookings, stationById]);

  if (loading && !data) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: th.bg, flexDirection: "column", gap: 14 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${th.muted}`, borderTopColor: C.green, animation: "spin 0.7s linear infinite" }} />
      <span style={{ fontSize: 12, color: th.sub }}>Loading…</span>
    </div>
  );
  if (error && !data) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: th.bg, flexDirection: "column", gap: 14 }}>
      <AlertCircle size={26} color={C.red} />
      <p style={{ color: C.red, fontSize: 13 }}>{error}</p>
      <button onClick={load} style={{ padding: "8px 18px", borderRadius: 9, background: C.green, color: "#020E07", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer" }}>Retry</button>
    </div>
  );

  const bd       = data?.charger_breakdown ?? {};
  const pending  = data?.pending_stations  ?? 0;
  const topSt    = data?.top_stations      ?? [];
  const totalCh  = Object.values(bd).reduce((s, v) => s + v, 0) || 0;
  const utilPct  = totalCh > 0 ? Math.round(((bd.OCCUPIED ?? 0) / totalCh) * 100) : 0;
  const totalSt  = data?.total_stations ?? 0;
  const maxBk    = Math.max(...topSt.map(s => s.bookings), 1);

  const trend = (data?.trend_7d ?? []).map(d => ({
    label: new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" }),
    revenue: d.revenue_paise, bookings: d.bookings,
  }));

  const chargerDonutAll = [
    { name: "Available",   value: bd.AVAILABLE   ?? 0, color: C.green },
    { name: "Occupied",    value: bd.OCCUPIED    ?? 0, color: C.blue },
    { name: "Booked",      value: bd.BOOKED      ?? 0, color: C.amber },
    { name: "Offline",     value: bd.OFFLINE     ?? 0, color: C.red },
    { name: "Maintenance", value: bd.MAINTENANCE ?? 0, color: C.purple },
  ];
  const chargerDonut = chargerDonutAll.filter(d => d.value > 0);
  const stationDonutAll = [
    { name: "Active",   value: data?.active_stations ?? 0, color: C.green },
    { name: "Pending",  value: data?.pending_stations ?? 0, color: C.amber },
    { name: "Other",    value: Math.max(0, totalSt - (data?.active_stations ?? 0) - (data?.pending_stations ?? 0)), color: C.red },
  ];
  const stationDonut = stationDonutAll.filter(d => d.value > 0);

  return (
    <div style={{ minHeight: "100%", background: th.bg, fontFamily: C.sans, color: th.text }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pdot{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>

      {/* ─── Header ─── */}
      <div className="admin-header" style={{
        padding: "13px 24px", borderBottom: `1px solid ${th.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: isLight ? "rgba(255,255,255,0.92)" : "rgba(10,13,18,0.92)",
        backdropFilter: "blur(14px)", position: "sticky", top: 0, zIndex: 20,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: th.text, letterSpacing: "-0.03em", margin: 0 }}>Operations Center</h1>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: C.green, padding: "2px 7px", borderRadius: 4, background: "rgba(0,192,96,0.1)", border: "1px solid rgba(0,192,96,0.22)" }}>ADMIN</span>
          </div>
          <p style={{ fontSize: 10.5, color: th.sub, margin: "2px 0 0" }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            <span style={{ fontFamily: C.mono, marginLeft: 8, opacity: 0.55 }}>{clock}</span>
          </p>
        </div>
        <div className="admin-header-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: "rgba(0,192,96,0.08)", border: "1px solid rgba(0,192,96,0.2)" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, animation: "pdot 1.4s ease-in-out infinite", boxShadow: "0 0 5px rgba(0,192,96,.6)" }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: C.green, letterSpacing: "0.1em" }}>LIVE</span>
          </div>
          <div style={{ padding: "5px 11px", borderRadius: 999, background: `${C.blue}09`, border: `1px solid ${C.blue}22`, fontSize: 10.5, fontWeight: 600, color: C.blue }}>
            {data?.confirmed_bookings_today ?? 0} active sessions
          </div>
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 8, background: "transparent", border: `1px solid ${th.border}`, color: th.sub, fontSize: 10.5, cursor: "pointer", fontFamily: C.sans }}>
            <RefreshCw size={10} strokeWidth={2} style={{ animation: loading ? "spin .7s linear infinite" : "none" }} /> Refresh
          </button>
        </div>
      </div>

      <div className="admin-pad" style={{ padding: "16px 24px 36px" }}>

        {pending > 0 && (
          <Link href="/admin/stations?status=PENDING_APPROVAL" style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", borderRadius: 9, marginBottom: 16, background: `${C.amber}08`, border: `1px solid ${C.amber}25`, cursor: "pointer" }}>
              <AlertCircle size={13} color={C.amber} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: th.text, fontWeight: 500 }}>
                <strong style={{ color: C.amber }}>{pending} station{pending > 1 ? "s" : ""}</strong> awaiting approval
              </span>
              <span style={{ fontSize: 11, color: C.amber, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>Review <ArrowUpRight size={11} /></span>
            </div>
          </Link>
        )}

        {/* ROW 1 — KPIs */}
        <div className="admin-kpi-grid" style={{ marginBottom: 14, alignItems: "stretch" }}>
          <KPI label="Charging Now"      value={String(data?.confirmed_bookings_today ?? 0)} sub="active sessions" Icon={Zap} color={C.green} href="/admin/sessions" th={th} />
          <KPI label="Revenue Today"     value={data ? fmtRupee(data.revenue_today_paise) : "—"} sub="via Razorpay" Icon={IndianRupee} color={C.green} href="/admin/revenue" th={th} />
          <KPI label="Total Revenue"     value={data ? fmtRupee(data.revenue_total_paise) : "—"} sub="all-time" Icon={IndianRupee} color={C.teal} href="/admin/revenue" th={th} />
          <KPI label="Reservations"      value={String(data?.bookings_today ?? 0)} sub={`${data?.confirmed_bookings_today ?? 0} confirmed`} Icon={TrendingUp} color={C.purple} href="/admin/bookings" th={th} />
          <KPI label="Fleet Utilisation" value={`${utilPct}%`} sub={`${bd.OCCUPIED ?? 0}/${totalCh} in session`} Icon={PlugZap} color={C.amber} href="/admin/chargers" th={th} />
          <KPI label="Total Users"       value={(data?.total_users ?? 0).toLocaleString("en-IN")} sub="registered" Icon={Users} color={C.blue} href="/admin/users" th={th} />
        </div>

        {/* ROW 2 — Charts (real trend_7d) */}
        <div className="admin-chart-row" style={{ gap: 12, marginBottom: 14 }}>
          <Card title="Revenue — Last 7 Days" Icon={IndianRupee} th={th}
            action={<span style={{ fontFamily: C.mono, fontSize: 11, color: C.green, fontWeight: 700 }}>{data ? fmtRupee(data.revenue_total_paise) : "—"} total</span>}>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={trend} margin={{ left: -20, right: 4, top: 4 }}>
                <defs>
                  <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.green} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={th.border} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: th.sub }} axisLine={{ stroke: th.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: th.sub }} axisLine={false} tickLine={false} width={36} tickFormatter={v => v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`} />
                <Tooltip contentStyle={tooltipStyle(th)} formatter={v => [fmtRupee(Number(v)), "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke={C.green} strokeWidth={2} fill="url(#dashRevGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Bookings This Week" Icon={BarChart2} th={th}
            action={<Link href="/admin/bookings" style={{ fontSize: 10, color: C.green, textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>All <ArrowUpRight size={9} /></Link>}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={trend} margin={{ left: -20, right: 4, top: 4 }}>
                <CartesianGrid vertical={false} stroke={th.border} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: th.sub }} axisLine={{ stroke: th.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: th.sub }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle(th)} formatter={v => [Number(v), "Bookings"]} />
                <Bar dataKey="bookings" fill={C.blue} radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* ROW 3 — Top stations | Peak hours (real) | Revenue by city (real) */}
        <div className="admin-mid-row" style={{ gap: 12, marginBottom: 14 }}>
          <Card title="Top Stations by Bookings" Icon={MapPin} th={th}
            action={<Link href="/admin/stations" style={{ fontSize: 10, color: C.green, textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>All <ArrowUpRight size={9} /></Link>}>
            {topSt.length === 0 && <div style={{ color: th.sub, fontSize: 12.5, textAlign: "center", padding: "20px 0" }}>No booking data yet.</div>}
            {topSt.slice(0, 5).map((s, i) => {
              const color = [C.green, C.blue, C.purple, C.amber, C.teal][i];
              const pct = Math.round((s.bookings / maxBk) * 100);
              return (
                <button key={s.id} onClick={() => router.push(`/admin/stations?focus=${s.id}`)} style={{ marginBottom: 11, background: "none", border: "none", padding: 0, width: "100%", cursor: "pointer", fontFamily: C.sans, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: `${color}14`, border: `1px solid ${color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, fontFamily: C.mono, color, flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: th.text }}>{s.name}</span>
                      <span style={{ fontSize: 10, color: th.sub, marginLeft: 6 }}>{s.city}</span>
                    </div>
                    <span style={{ fontFamily: C.mono, fontSize: 11, color, fontWeight: 700 }}>{s.bookings}</span>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: th.sub }}>{fmtRupee(s.revenue_paise)}</span>
                  </div>
                  <div style={{ height: 3.5, borderRadius: 999, background: th.muted }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: color }} />
                  </div>
                </button>
              );
            })}
          </Card>

          <Card title="Peak Charging Hours" Icon={Clock} th={th}
            action={!refLoading && bookings.length > 0 && (
              <span style={{ fontSize: 9.5, color: th.sub, fontFamily: C.mono }}>{analytics.hourTotal} sampled</span>
            )}>
            {refLoading || bookings.length === 0 ? (
              <div style={{ color: th.sub, fontSize: 12.5, textAlign: "center", padding: "20px 0" }}>Gathering session data…</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: th.sub, textTransform: "uppercase" }}>Peak Hour</div>
                    <div style={{ fontFamily: C.mono, fontSize: 19, fontWeight: 700, color: th.text, marginTop: 3, lineHeight: 1 }}>
                      {String(analytics.peakHour).padStart(2, "0")}:00
                      <span style={{ fontSize: 11, color: th.sub, fontWeight: 500 }}> – {String((analytics.peakHour + 1) % 24).padStart(2, "0")}:00</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: C.mono, fontSize: 19, fontWeight: 700, color: C.green, lineHeight: 1 }}>{analytics.peakData[analytics.peakHour]?.value ?? 0}</div>
                    <div style={{ fontSize: 9, color: th.sub, marginTop: 3 }}>bookings that hour</div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={84}>
                  <BarChart data={analytics.peakData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                    <XAxis dataKey="hour" tick={{ fontSize: 8.5, fill: th.sub }} axisLine={false} tickLine={false} interval={2} tickFormatter={h => hourLabel(Number(h))} />
                    <Tooltip
                      cursor={{ fill: th.muted, opacity: 0.35 }}
                      contentStyle={tooltipStyle(th)}
                      labelFormatter={h => `${String(h).padStart(2, "0")}:00 – ${String((Number(h) + 1) % 24).padStart(2, "0")}:00`}
                      formatter={v => [`${v} booking${v === 1 ? "" : "s"}`, ""]}
                    />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={13}>
                      {analytics.peakData.map((d, i) => {
                        const peakVal = analytics.peakData[analytics.peakHour]?.value || 1;
                        const isPeak = d.hour === analytics.peakHour;
                        return (
                          <Cell key={i} fill={d.value === 0 ? th.muted : C.green}
                            opacity={isPeak ? 1 : d.value === 0 ? 0.3 : 0.25 + 0.55 * (d.value / peakVal)} />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 12 }}>
                  {analytics.dayParts.map(p => {
                    const pct = analytics.hourTotal > 0 ? Math.round((p.value / analytics.hourTotal) * 100) : 0;
                    return (
                      <div key={p.label} style={{ padding: "6px 7px", borderRadius: 8, background: th.raised, border: `1px solid ${th.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 8.5, color: th.sub, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.label}</span>
                        </div>
                        <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: th.text }}>{p.value}</div>
                        <div style={{ fontSize: 8, color: th.sub, marginTop: 1 }}>{pct}% · {p.range}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>

          <Card title="Revenue by City" Icon={IndianRupee} th={th}>
            {analytics.cityData.length === 0 ? (
              <div style={{ color: th.sub, fontSize: 12.5, textAlign: "center", padding: "20px 0" }}>No revenue data yet.</div>
            ) : analytics.cityData.map((r, i) => {
              const color = [C.green, C.blue, C.purple, C.amber, C.red, C.teal][i % 6];
              const pct = Math.round((r.revenue / analytics.maxCityRev) * 100);
              return (
                <div key={r.city} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, color: th.text, fontWeight: 500 }}>{r.city}</span>
                    </div>
                    <span style={{ fontFamily: C.mono, fontSize: 11, color, fontWeight: 700 }}>{fmtRupee(r.revenue)}</span>
                  </div>
                  <div style={{ height: 3.5, borderRadius: 999, background: th.muted }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: color }} />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        {/* ROW 4 — Fleet overview | Recent activity (real) | Actions */}
        <div className="admin-bot-row" style={{ gap: 12 }}>
          <Card title="Fleet Overview" Icon={PlugZap} th={th}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              <div style={{ padding: "4px 20px 4px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", color: th.sub, marginBottom: 8, textTransform: "uppercase", alignSelf: "flex-start" }}>CHARGERS</div>
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie data={chargerDonut} dataKey="value" innerRadius={38} outerRadius={58} paddingAngle={3} strokeWidth={0}>
                      {chargerDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle(th)} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 11, color: th.sub, marginTop: 6 }}>{totalCh} total</div>
                <DonutLegend items={chargerDonutAll} th={th} />
              </div>
              <div style={{ borderLeft: `1px solid ${th.border}`, padding: "4px 0 4px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", color: th.sub, marginBottom: 8, textTransform: "uppercase", alignSelf: "flex-start" }}>STATIONS</div>
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie data={stationDonut} dataKey="value" innerRadius={38} outerRadius={58} paddingAngle={3} strokeWidth={0}>
                      {stationDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle(th)} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 11, color: th.sub, marginTop: 6 }}>{totalSt} total</div>
                <DonutLegend items={stationDonutAll} th={th} />
              </div>
            </div>
          </Card>

          <Card title="Recent Activity" Icon={Activity} th={th} pad={false}
            action={<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, animation: "pdot 1.4s ease-in-out infinite" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: C.green, letterSpacing: "0.1em" }}>LIVE</span>
            </div>}>
            <div style={{ padding: "2px 16px 10px", height: "100%", overflowY: "auto" }}>
              {analytics.recent.length === 0 && <div style={{ color: th.sub, fontSize: 12.5, textAlign: "center", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>No recent activity.</div>}
              {analytics.recent.map(b => {
                const st = stationById.get(b.station_id);
                const statusColor: Record<string, string> = { COMPLETED: C.green, IN_PROGRESS: C.blue, CHECKED_IN: C.teal, CONFIRMED: C.green, CANCELLED: C.red, PENDING_PAYMENT: C.amber, EXPIRED: C.amber };
                return (
                  <button key={b.id} onClick={() => router.push(`/admin/bookings?focus=${b.id}`)} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "7px 0", borderBottom: `1px solid ${th.border}`, width: "100%", background: "none", border: "none", borderBottomWidth: 1, cursor: "pointer", textAlign: "left", fontFamily: C.sans }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor[b.status] ?? th.sub, flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 500, color: th.text, lineHeight: 1.3 }}>{st?.name ?? "Booking"} — {fmtRupee(b.amount)}</div>
                      <div style={{ fontSize: 10, color: th.sub, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.status.replace(/_/g, " ")}</div>
                    </div>
                    <span style={{ fontSize: 9, color: th.sub, fontFamily: C.mono, flexShrink: 0, opacity: 0.7 }}>{fmtDateTime(b.created_at)}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Quick Actions" Icon={Zap} th={th}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
              <ActionBtn Icon={CheckCircle} label="Approve Stations" badge={pending > 0 ? String(pending) : undefined} color={C.green} th={th} onClick={() => router.push("/admin/stations?status=PENDING_APPROVAL")} />
              <ActionBtn Icon={Building2}   label="Manage Owners"    color={C.amber} th={th} onClick={() => router.push("/admin/owners")} />
              <ActionBtn Icon={UserPlus}    label="Manage Users"     color={C.blue}  th={th} onClick={() => router.push("/admin/users")} />
              <ActionBtn Icon={Download}    label="Export Report"    color={C.purple} th={th} onClick={() => {
                if (!data) return;
                const url = URL.createObjectURL(new Blob([[
                  "CHARGING GURU — Report",
                  `Generated: ${new Date().toLocaleString("en-IN")}`,
                  `Stations: ${data.active_stations}/${data.total_stations}`,
                  `Revenue Today: ${fmtRupee(data.revenue_today_paise)}`,
                  `Total Revenue: ${fmtRupee(data.revenue_total_paise)}`,
                  `Bookings Today: ${data.bookings_today}`,
                  `Fleet Utilisation: ${utilPct}%`,
                  `Peak Hour: ${analytics.peakHour}:00`,
                ].join("\n")], { type: "text/plain" }));
                Object.assign(document.createElement("a"), { href: url, download: `cg-report-${Date.now()}.txt` }).click();
                URL.revokeObjectURL(url);
              }} />
            </div>

            <div style={{ paddingTop: 12, borderTop: `1px solid ${th.border}` }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: th.sub, marginBottom: 8 }}>System Health</div>
              {[
                { l: "API server",  Icon: Wifi,   ok: dbOk === true },
                { l: "Database",    Icon: Shield, ok: dbOk === true },
              ].map(s => (
                <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: s.ok ? "rgba(0,192,96,0.08)" : "rgba(239,68,68,0.1)", border: `1px solid ${s.ok ? "rgba(0,192,96,0.18)" : "rgba(239,68,68,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <s.Icon size={8} color={s.ok ? C.green : C.red} strokeWidth={2} />
                  </div>
                  <span style={{ flex: 1, fontSize: 10, color: th.sub }}>{s.l}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontFamily: C.mono, color: s.ok ? C.green : C.red, fontWeight: 600 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: s.ok ? C.green : C.red }} />{s.ok ? "ok" : "down"}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 9, color: th.sub, marginTop: 6, opacity: 0.7 }}>Based on the last dashboard refresh — a real request, not a simulated status.</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
