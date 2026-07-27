"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Zap, Plus, RefreshCw, ChevronRight, Activity, IndianRupee,
  TrendingUp, ArrowUpRight, BookOpen, ScanLine, Clock3,
  ParkingSquare, Timer, Wallet, CheckCircle2, Gauge,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@/contexts/UserContext";
import { authFetch } from "@/lib/admin-ui";
import { owner as ownerApi, OwnerFinanceSummary, OwnerStationFinance } from "@/lib/api";
import {
  getOwnerTheme, Card, CardHeader, StatCard, EmptyState,
  DataTable, Column, StatusBadge, Button, ChartSkeleton, StatCardSkeleton, TableSkeleton,
} from "@/components/owner";

interface Charger {
  id: string; label: string; connector_type: string;
  power_kw: number; price_per_kwh: number; status: string;
}
interface Station {
  id: string; name: string; city: string | null; address: string;
  status: string; rating_avg: number; chargers: Charger[];
}
interface Booking {
  id: string; status: string; created_at: string;
  slot_start?: string;
  charger?: { label: string; connector_type: string; power_kw: number };
  station?: { id: string; name: string };
  // Owner-safe breakdown only — never includes Charging Guru's platform/
  // convenience fee or GST. owner_earnings_paise is what the owner actually earns.
  breakdown?: { owner_earnings_paise: number } | null;
}
const earningsOf = (b: Booking) => b.breakdown?.owner_earnings_paise ?? 0;

const PAID_STATUSES = new Set(["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"]);
const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function useDashboardData(stations: Station[], bookings: Booking[]) {
  return useMemo(() => {
    const paid = bookings.filter(b => PAID_STATUSES.has(b.status));
    const completed = bookings.filter(b => b.status === "COMPLETED");

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const monthPrefix = now.toISOString().slice(0, 7);

    const totalRevenue = paid.reduce((s, b) => s + earningsOf(b), 0);
    const todayRevenue = paid.filter(b => dayKey(b.created_at) === todayKey).reduce((s, b) => s + earningsOf(b), 0);
    const monthRevenue = paid.filter(b => b.created_at.slice(0, 7) === monthPrefix).reduce((s, b) => s + earningsOf(b), 0);

    const allChargers = stations.flatMap(s => s.chargers);
    const activeChargers = allChargers.filter(c => c.status === "AVAILABLE" || c.status === "OCCUPIED").length;
    const onlineStations = stations.filter(s => s.status === "ACTIVE").length;
    const offlineStations = stations.length - onlineStations;

    // Peak usage hour — mode of slot_start hour across paid bookings.
    const hourCounts = new Map<number, number>();
    paid.forEach(b => {
      const src = b.slot_start ?? b.created_at;
      if (!src) return;
      const h = new Date(src).getHours();
      hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
    });
    let peakHour: number | null = null, peakCount = 0;
    hourCounts.forEach((count, hour) => { if (count > peakCount) { peakCount = count; peakHour = hour; } });
    const peakLabel = peakHour === null ? "—" : new Date(2000, 0, 1, peakHour).toLocaleTimeString("en-IN", { hour: "numeric", hour12: true });

    // Last 14 days series
    const days: { key: string; label: string; revenue: number; sessions: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), revenue: 0, sessions: 0 });
    }
    const dayIndex = new Map(days.map((d, i) => [d.key, i]));
    paid.forEach(b => {
      const idx = dayIndex.get(dayKey(b.created_at));
      if (idx !== undefined) days[idx].revenue += earningsOf(b);
    });
    completed.forEach(b => {
      const idx = dayIndex.get(dayKey(b.created_at));
      if (idx !== undefined) days[idx].sessions += 1;
    });

    // Charger status breakdown
    const statusCounts: Record<string, number> = {};
    allChargers.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1; });

    // Per-station performance
    const stationPerf = stations.map(s => {
      const stBookings = paid.filter(b => b.station?.id === s.id);
      const revenue = stBookings.reduce((sum, b) => sum + earningsOf(b), 0);
      const sessions = stBookings.filter(b => b.status === "COMPLETED").length;
      const avail = s.chargers.filter(c => c.status === "AVAILABLE").length;
      const utilization = s.chargers.length ? Math.round((avail / s.chargers.length) * 100) : 0;
      return { station: s, revenue, sessions, utilization, avail };
    }).sort((a, b) => b.revenue - a.revenue);

    const recentBookings = [...bookings].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);

    return {
      totalRevenue, todayRevenue, monthRevenue, totalSessions: completed.length,
      totalChargers: allChargers.length, activeChargers, onlineStations, offlineStations,
      peakLabel, series: days, statusCounts, stationPerf, recentBookings,
    };
  }, [stations, bookings]);
}

export default function OwnerDashboard() {
  const router = useRouter();
  const { isLight } = useTheme();
  const { user } = useUser();
  const th = getOwnerTheme(isLight);

  const [stations, setStations] = useState<Station[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [finance, setFinance]   = useState<OwnerFinanceSummary | null>(null);
  const [stationFinance, setStationFinance] = useState<OwnerStationFinance[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>("all");
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState("");
  const [now, setNow]           = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    setError("");
    try {
      const [stRes, bkRes, financeData, stationFinanceData] = await Promise.all([
        authFetch("/api/v1/owner/stations"),
        authFetch("/api/v1/owner/bookings"),
        ownerApi.financeSummary().catch(() => null),
        ownerApi.financeByStation().catch(() => []),
      ]);
      if (!stRes.ok) throw new Error(`HTTP ${stRes.status}`);
      const stData = await stRes.json();
      const bkData = bkRes.ok ? await bkRes.json() : [];
      setStations(Array.isArray(stData) ? stData : []);
      setBookings(Array.isArray(bkData) ? bkData : []);
      setFinance(financeData);
      setStationFinance(Array.isArray(stationFinanceData) ? stationFinanceData : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpi = useDashboardData(stations, bookings);
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.full_name?.split(" ")[0] ?? "Partner";

  // Multi-station owners see one combined total by default (finance) — this
  // switcher lets them isolate a single station's numbers (stationFinance)
  // instead, since two stations can look identical in the combined view
  // while one is actually losing money.
  const selectedStation = selectedStationId === "all"
    ? null
    : stationFinance.find(s => s.station_id === selectedStationId) ?? null;
  const activeFinance = selectedStation ? {
    total_earnings_paise: selectedStation.total_earnings_paise,
    charging_revenue_paise: selectedStation.charging_revenue_paise,
    parking_revenue_paise: selectedStation.parking_revenue_paise,
    idle_fee_revenue_paise: selectedStation.idle_fee_revenue_paise,
    pending_payouts_paise: selectedStation.pending_payout_paise,
    completed_payouts_paise: selectedStation.paid_out_paise,
    charging_sessions_count: selectedStation.charging_sessions_count,
    energy_sold_kwh: selectedStation.energy_sold_kwh,
  } : finance;

  const CHARGER_STATUS_META: Record<string, { label: string; color: string }> = {
    AVAILABLE: { label: "Available", color: th.success },
    OCCUPIED: { label: "In session", color: th.info },
    BOOKED: { label: "Booked", color: th.warn },
    MAINTENANCE: { label: "Maintenance", color: "#EA580C" },
    OFFLINE: { label: "Offline", color: th.textMuted },
  };
  const donutData = Object.entries(kpi.statusCounts).map(([status, value]) => ({
    name: CHARGER_STATUS_META[status]?.label ?? status,
    value, color: CHARGER_STATUS_META[status]?.color ?? th.textMuted,
  }));

  const bookingColumns: Column<Booking>[] = [
    { key: "station", header: "Station", render: b => (
      <div>
        <div style={{ fontWeight: 600, color: th.text }}>{b.station?.name ?? "—"}</div>
        <div style={{ fontSize: 11.5, color: th.textSub }}>{b.charger?.label ?? ""} {b.charger?.connector_type ? `· ${b.charger.connector_type}` : ""}</div>
      </div>
    ) },
    { key: "created_at", header: "Date", sortValue: b => b.created_at, render: b => (
      <span style={{ color: th.textSub, fontSize: 12.5 }}>
        {new Date(b.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </span>
    ) },
    { key: "amount", header: "Your Earnings", align: "right", sortValue: b => earningsOf(b), render: b => (
      <span style={{ fontFamily: th.mono, fontWeight: 700, color: th.text }}>{rupees(earningsOf(b))}</span>
    ) },
    { key: "status", header: "Status", render: b => <StatusBadge status={b.status} th={th} /> },
  ];

  if (loading) return (
    <div className="owner-pad" style={{ fontFamily: th.sans }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ width: 160, height: 26, background: th.raised, borderRadius: 8, marginBottom: 8 }} />
          <div style={{ width: 240, height: 14, background: th.raised, borderRadius: 6 }} />
        </div>
      </div>
      <div className="owner-stat-grid" style={{ marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} th={th} />)}
      </div>
      <div className="owner-chart-grid" style={{ marginBottom: 24 }}>
        <ChartSkeleton th={th} />
        <ChartSkeleton th={th} />
      </div>
      <TableSkeleton th={th} />
    </div>
  );

  return (
    <div className="owner-pad owner-fade-up" style={{ fontFamily: th.sans }}>
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 20, padding: "26px 28px", marginBottom: 26,
        background: th.heroGradient,
        boxShadow: th.shadowLg,
      }}>
        <div className="owner-hero-orb" style={{
          position: "absolute", top: -80, right: -60, width: 260, height: 260, borderRadius: "50%",
          background: `radial-gradient(circle, ${th.accent}${isLight ? "22" : "30"} 0%, transparent 70%)`, pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", inset: 0, opacity: isLight ? 0.35 : 0.5, pointerEvents: "none",
          backgroundImage: `radial-gradient(${isLight ? "rgba(0,150,76,0.16)" : "rgba(0,230,118,0.14)"} 1px, transparent 1px)`,
          backgroundSize: "22px 22px", maskImage: "linear-gradient(160deg, black, transparent 70%)",
        }} />
        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 999, background: th.heroChipBg, border: `1px solid ${th.heroChipBorder}`, marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: th.accent, boxShadow: `0 0 8px ${th.accent}`, animation: "pulse-dot 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: th.heroChipText }}>
                {stations.length} station{stations.length !== 1 ? "s" : ""} · {kpi.totalChargers} charger{kpi.totalChargers !== 1 ? "s" : ""} live
              </span>
            </div>
            <h1 style={{ fontSize: 25, fontWeight: 800, color: th.heroText, letterSpacing: "-0.03em", marginBottom: 6 }}>
              {greeting}, {firstName}
            </h1>
            <p style={{ fontSize: 13.5, color: th.heroTextSub }}>
              {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · here&apos;s how your network is doing
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => load(true)} disabled={refreshing} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 11,
              background: isLight ? "rgba(11,31,20,.05)" : "rgba(255,255,255,.06)",
              border: `1px solid ${isLight ? "rgba(11,31,20,.14)" : "rgba(255,255,255,.14)"}`,
              color: th.heroText,
              fontSize: 13, fontWeight: 600, cursor: refreshing ? "not-allowed" : "pointer", fontFamily: th.sans,
              opacity: refreshing ? 0.6 : 1, transition: "background .15s",
            }}>
              <RefreshCw size={13} style={{ animation: refreshing ? "owner-spin .7s linear infinite" : "none" }} />
              Refresh
            </button>
            <button onClick={() => router.push("/owner/stations/new")} className="owner-btn owner-btn-primary" style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 11,
              background: `linear-gradient(135deg,${th.accent},${th.accentDark})`, color: "#04140A", fontSize: 13, fontWeight: 750,
              border: "none", cursor: "pointer", fontFamily: th.sans,
              boxShadow: `0 4px 20px ${th.accent}4D, 0 0 0 1px ${th.accent}33`,
            }}>
              <Plus size={14} strokeWidth={2.5} /> Add Station
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 24, background: th.dangerDim, border: `1px solid ${th.danger}30`, color: th.danger, fontSize: 13 }}>{error}</div>
      )}

      {stations.length === 0 ? (
        <EmptyState
          th={th}
          icon={<MapPin size={24} color={th.accent} />}
          title="No stations yet"
          description="Add your first charging station to start accepting bookings and earning revenue."
          action={<Button th={th} variant="primary" onClick={() => router.push("/owner/stations/new")}>Add your first station →</Button>}
        />
      ) : (
        <>
          {/* Financial KPI cards — sourced from the owner-scoped finance summary,
              which structurally excludes platform/convenience fee and Charging
              Guru revenue fields. Never add such a field here. */}
          {stations.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 650, color: th.textSub }}>Showing earnings for:</span>
              <select
                value={selectedStationId}
                onChange={e => setSelectedStationId(e.target.value)}
                style={{
                  padding: "7px 12px", borderRadius: 9, fontSize: 12.5, fontWeight: 650,
                  background: th.raised, border: `1px solid ${th.border}`, color: th.text,
                  fontFamily: th.sans, cursor: "pointer",
                }}
              >
                <option value="all">All stations (combined)</option>
                {stationFinance.map(s => (
                  <option key={s.station_id} value={s.station_id}>{s.station_name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="owner-stat-grid" style={{ marginBottom: 14 }}>
            <StatCard th={th} label="Total Earnings" value={rupees(activeFinance?.total_earnings_paise ?? 0)} numericValue={activeFinance?.total_earnings_paise ?? 0} format={n => rupees(n)} icon={<IndianRupee size={15} color={th.accent} />} accentColor={th.accent} sub="charging + parking + idle" />
            <StatCard th={th} label="Charging Revenue" value={rupees(activeFinance?.charging_revenue_paise ?? 0)} numericValue={activeFinance?.charging_revenue_paise ?? 0} format={n => rupees(n)} icon={<Zap size={15} color={th.info} />} accentColor={th.info} sub="energy sold" />
            <StatCard th={th} label="Parking Revenue" value={rupees(activeFinance?.parking_revenue_paise ?? 0)} numericValue={activeFinance?.parking_revenue_paise ?? 0} format={n => rupees(n)} icon={<ParkingSquare size={15} color={th.warn} />} accentColor={th.warn} sub="parking fees collected" />
            <StatCard th={th} label="Idle Fee Revenue" value={rupees(activeFinance?.idle_fee_revenue_paise ?? 0)} numericValue={activeFinance?.idle_fee_revenue_paise ?? 0} format={n => rupees(n)} icon={<Timer size={15} color={th.danger} />} accentColor={th.danger} sub="overtime/idle fees" />
          </div>
          <div className="owner-stat-grid" style={{ marginBottom: 24 }}>
            <StatCard th={th} label="Pending Payouts" value={rupees(activeFinance?.pending_payouts_paise ?? 0)} numericValue={activeFinance?.pending_payouts_paise ?? 0} format={n => rupees(n)} icon={<Wallet size={15} color={th.warn} />} accentColor={th.warn} sub="awaiting transfer" />
            <StatCard th={th} label="Completed Payouts" value={rupees(activeFinance?.completed_payouts_paise ?? 0)} numericValue={activeFinance?.completed_payouts_paise ?? 0} format={n => rupees(n)} icon={<CheckCircle2 size={15} color={th.success} />} accentColor={th.success} sub="paid out to date" />
            <StatCard th={th} label="Charging Sessions" value={activeFinance?.charging_sessions_count ?? 0} numericValue={activeFinance?.charging_sessions_count ?? 0} icon={<Activity size={15} color={th.accent} />} accentColor={th.accent} sub="completed + confirmed" />
            <StatCard th={th} label="Energy Sold" value={`${(activeFinance?.energy_sold_kwh ?? 0).toFixed(1)} kWh`} numericValue={activeFinance?.energy_sold_kwh ?? 0} format={n => `${n.toFixed(1)} kWh`} icon={<Gauge size={15} color={th.info} />} accentColor={th.info} sub="total kWh delivered" />
          </div>

          <div className="owner-stat-grid" style={{ marginBottom: 24 }}>
            <StatCard th={th} label="Active Chargers" value={`${kpi.activeChargers}/${kpi.totalChargers}`} numericValue={kpi.activeChargers} format={n => `${Math.round(n)}/${kpi.totalChargers}`} icon={<Activity size={15} color={th.accent} />} accentColor={th.accent} sub="available or in session" />
            <StatCard th={th} label="Stations Online" value={kpi.onlineStations} numericValue={kpi.onlineStations} icon={<MapPin size={15} color={th.success} />} accentColor={th.success} sub={kpi.offlineStations > 0 ? `${kpi.offlineStations} offline/pending` : "all stations live"} />
            <StatCard th={th} label="Peak Usage Time" value={kpi.peakLabel} icon={<Clock3 size={15} color={th.info} />} accentColor={th.info} sub="most common booking hour" />
            <StatCard th={th} label="Avg. Booking Value" value={kpi.totalSessions ? rupees(kpi.totalRevenue / Math.max(1, kpi.totalSessions)) : "—"} numericValue={kpi.totalSessions ? kpi.totalRevenue / Math.max(1, kpi.totalSessions) : 0} format={n => kpi.totalSessions ? rupees(n) : "—"} icon={<ArrowUpRight size={15} color={th.accent} />} accentColor={th.accent} sub="per completed session" />
          </div>

          {/* Charts */}
          <div className="owner-chart-grid" style={{ marginBottom: 24 }}>
            <Card th={th}>
              <CardHeader th={th} title="Revenue trend" subtitle="Last 14 days" icon={<TrendingUp size={14} color={th.accent} />} />
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={kpi.series} margin={{ left: -18, right: 8, top: 4 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={th.accent} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={th.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={th.border} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: th.textMuted }} axisLine={{ stroke: th.border }} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: th.textMuted }} axisLine={false} tickLine={false} width={40} tickFormatter={v => v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`} />
                  <Tooltip
                    contentStyle={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 10, fontSize: 12, boxShadow: th.shadowMd }}
                    labelStyle={{ color: th.textSub, marginBottom: 4 }}
                    formatter={(v) => [rupees(Number(v)), "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={th.accent} strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card th={th}>
              <CardHeader th={th} title="Charging sessions" subtitle="Completed per day, last 14 days" icon={<Zap size={14} color={th.info} />} />
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={kpi.series} margin={{ left: -18, right: 8, top: 4 }}>
                  <CartesianGrid vertical={false} stroke={th.border} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: th.textMuted }} axisLine={{ stroke: th.border }} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: th.textMuted }} axisLine={false} tickLine={false} width={26} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 10, fontSize: 12, boxShadow: th.shadowMd }}
                    labelStyle={{ color: th.textSub, marginBottom: 4 }}
                    formatter={(v) => [Number(v), "Sessions"]}
                  />
                  <Bar dataKey="sessions" fill={th.info} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Charger breakdown + station performance */}
          <div className="owner-perf-grid" style={{ marginBottom: 24 }}>
            <Card th={th}>
              <CardHeader th={th} title="Charger status" icon={<Activity size={14} color={th.accent} />} />
              {donutData.length === 0 ? (
                <p style={{ fontSize: 13, color: th.textSub, padding: "20px 0" }}>No chargers yet.</p>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
                    <ResponsiveContainer width={130} height={130}>
                      <PieChart>
                        <Pie data={donutData} dataKey="value" innerRadius={38} outerRadius={58} paddingAngle={3} strokeWidth={0}>
                          {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 10, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <span style={{ fontFamily: th.mono, fontSize: 20, fontWeight: 800, color: th.text, lineHeight: 1 }}>{kpi.totalChargers}</span>
                      <span style={{ fontSize: 9, color: th.textMuted, letterSpacing: ".05em", textTransform: "uppercase", marginTop: 2 }}>Total</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    {donutData.map(d => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                        <span style={{ color: th.textSub, flex: 1 }}>{d.name}</span>
                        <span style={{ fontWeight: 700, color: th.text, fontFamily: th.mono }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card th={th}>
              <CardHeader th={th} title="Station performance" subtitle="Ranked by revenue" icon={<MapPin size={14} color={th.accent} />} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {kpi.stationPerf.slice(0, 4).map(p => (
                  <button key={p.station.id} onClick={() => router.push(`/owner/stations/${p.station.id}`)} className="owner-table-row" style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", borderRadius: 12,
                    background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: th.sans, width: "100%",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 650, color: th.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.station.name}</span>
                        <span style={{ fontSize: 12.5, fontFamily: th.mono, fontWeight: 700, color: th.text, flexShrink: 0, marginLeft: 10 }}>{rupees(p.revenue)}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 999, background: th.raised, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${p.utilization}%`, background: `linear-gradient(90deg,${th.accent},${th.accentDark})`, borderRadius: 999 }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: th.textSub }}>{p.sessions} session{p.sessions !== 1 ? "s" : ""}</span>
                        <span style={{ fontSize: 11, color: th.textSub }}>{p.avail}/{p.station.chargers.length} available</span>
                      </div>
                    </div>
                    <ChevronRight size={14} color={th.textMuted} style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Quick actions */}
          <div className="owner-quick-actions" style={{ marginBottom: 24 }}>
            <button onClick={() => router.push("/owner/stations/new")} className="owner-card owner-card-hover" style={quickActionStyle(th)}>
              <Plus size={17} color={th.accent} />
              <span>Add Station</span>
            </button>
            <button onClick={() => router.push("/owner/bookings")} className="owner-card owner-card-hover" style={quickActionStyle(th)}>
              <BookOpen size={17} color={th.info} />
              <span>View Bookings</span>
            </button>
            <button onClick={() => router.push("/owner/sessions")} className="owner-card owner-card-hover" style={quickActionStyle(th)}>
              <ScanLine size={17} color={th.warn} />
              <span>Scan & Check In</span>
            </button>
            <button onClick={() => router.push("/owner/stations")} className="owner-card owner-card-hover" style={quickActionStyle(th)}>
              <MapPin size={17} color={th.accent} />
              <span>Manage Stations</span>
            </button>
            <button onClick={() => router.push("/owner/payouts")} className="owner-card owner-card-hover" style={quickActionStyle(th)}>
              <Wallet size={17} color={th.warn} />
              <span>Payouts</span>
            </button>
          </div>

          {/* Recent bookings */}
          <Card th={th}>
            <CardHeader th={th} title="Recent bookings" subtitle="Latest activity across all stations" icon={<BookOpen size={14} color={th.accent} />}
              action={<Button th={th} variant="ghost" size="sm" onClick={() => router.push("/owner/bookings")}>View all <ChevronRight size={13} /></Button>} />
            {kpi.recentBookings.length === 0 ? (
              <p style={{ fontSize: 13, color: th.textSub, padding: "16px 0" }}>No bookings yet — once customers start booking your chargers, they&apos;ll show up here.</p>
            ) : (
              <DataTable th={th} columns={bookingColumns} rows={kpi.recentBookings} rowKey={b => b.id} pageSize={8} />
            )}
          </Card>
        </>
      )}

      <style suppressHydrationWarning>{`
        .owner-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .owner-chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .owner-perf-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; }
        .owner-quick-actions { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        @media (max-width: 1100px) {
          .owner-stat-grid { grid-template-columns: repeat(2, 1fr); }
          .owner-chart-grid { grid-template-columns: 1fr; }
          .owner-perf-grid { grid-template-columns: 1fr; }
          .owner-quick-actions { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 560px) {
          .owner-stat-grid { grid-template-columns: 1fr; }
          .owner-quick-actions { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function quickActionStyle(th: ReturnType<typeof getOwnerTheme>): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 10, padding: "16px 18px",
    background: th.card, border: `1px solid ${th.border}`, borderRadius: 14,
    cursor: "pointer", fontFamily: th.sans, fontSize: 13.5, fontWeight: 650, color: th.text,
    boxShadow: th.shadowSm,
  };
}
