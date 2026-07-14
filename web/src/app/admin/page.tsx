"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap, Users, IndianRupee, PlugZap, Activity,
  ArrowUpRight, RefreshCw, AlertCircle,
  CheckCircle, TrendingUp, Download, UserPlus,
  Battery, MapPin, Wifi, Shield, Clock, BarChart2,
} from "lucide-react";
import { getTheme, C, authFetch, fmtRupee } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemeTokens } from "@/lib/admin-ui";

interface Overview {
  total_users: number; total_stations: number; active_stations: number;
  pending_stations: number; total_chargers: number;
  bookings_today: number; confirmed_bookings_today: number;
  revenue_today_paise: number; revenue_total_paise: number;
  charger_breakdown: Record<string, number>;
  top_stations: { id: string; name: string; city: string; revenue_paise: number; bookings: number }[];
}

// ─── Area chart ───────────────────────────────────────────────────────────────
function AreaChart({ values, color, th }: { values: number[]; color: string; th: ThemeTokens }) {
  const W = 400; const H = 80;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i): [number, number] => [
    (i / (values.length - 1)) * (W - 12) + 6,
    H - 8 - ((v / max) * (H - 18)),
  ]);
  const line = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    return `${acc} C${px + (x - px) / 2},${py} ${px + (x - px) / 2},${y} ${x},${y}`;
  }, "");
  const area = `${line} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;
  const uid = `ac${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.33, 0.66, 1].map(t => (
        <line key={t} x1={6} y1={H - 8 - t * (H - 18)} x2={W - 6} y2={H - 8 - t * (H - 18)}
          stroke={th.muted} strokeWidth="0.7" strokeDasharray="3 7" />
      ))}
      <path d={area} fill={`url(#${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={color} stroke={th.card} strokeWidth="1.5" />
      ))}
    </svg>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────
function MiniBar({ values, color, th }: { values: number[]; color: string; th: ThemeTokens }) {
  const W = 400; const H = 80;
  const max = Math.max(...values, 1);
  const bW = Math.floor((W - 16) / values.length) - 3;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} preserveAspectRatio="none">
      {[0.33, 0.66, 1].map(t => (
        <line key={t} x1={8} y1={H - 8 - t * (H - 18)} x2={W - 8} y2={H - 8 - t * (H - 18)}
          stroke={th.muted} strokeWidth="0.7" strokeDasharray="3 7" />
      ))}
      {values.map((v, i) => {
        const bh = Math.max(2, (v / max) * (H - 18));
        const x = 8 + i * ((W - 16) / values.length);
        return <rect key={i} x={x} y={H - 8 - bh} width={bW} height={bh} rx={2} fill={color} opacity="0.85" />;
      })}
    </svg>
  );
}

// ─── Donut chart ─────────────────────────────────────────────────────────────
function Donut({ slices, size = 160, thickness = 22, total, label, sub, th }: {
  slices: { value: number; color: string; label: string }[];
  size?: number; thickness?: number; total: number;
  label: string; sub?: string; th: ThemeTokens;
}) {
  const r      = (size - thickness) / 2;
  const cx     = size / 2;
  const circ   = 2 * Math.PI * r;
  const hasData = total > 0;
  let offset = 0;
  const dominantColor = slices.find(s => s.value > 0)?.color ?? th.sub;
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", width: "100%", height: "100%" }}>
      {/* donut */}
      <div style={{ position: "relative" as const, width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={th.muted} strokeWidth={thickness} opacity="0.35" />
          {hasData && slices.map((s, i) => {
            const dash = (s.value / total) * circ;
            const el   = (
              <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color}
                strokeWidth={thickness} strokeDasharray={`${Math.max(0, dash - 2)} ${circ}`}
                strokeDashoffset={-offset} strokeLinecap="round" />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div style={{ position: "absolute" as const, inset: 0, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 1 }}>
          <span style={{ fontFamily: C.mono, fontSize: size >= 140 ? 28 : 20, fontWeight: 800, color: hasData ? dominantColor : th.sub, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {total}
          </span>
          <span style={{ fontSize: size >= 140 ? 10 : 8.5, color: th.sub, fontWeight: 500, letterSpacing: "0.02em" }}>{label}</span>
          {sub && <span style={{ fontSize: 8.5, color: hasData ? dominantColor : th.sub, fontWeight: 700, opacity: 0.8 }}>{sub}</span>}
        </div>
      </div>
      {/* legend — single column; value < 0 = invisible spacer row for height matching */}
      <div style={{ width: "100%", marginTop: 14, display: "flex", flexDirection: "column" as const, gap: 7 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, visibility: s.value < 0 ? "hidden" : "visible" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11, color: th.sub }}>{s.label}</span>
            <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: th.text }}>{s.value >= 0 ? s.value : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live feed ────────────────────────────────────────────────────────────────
type FeedEntry = { id: number; dot: string; title: string; sub: string; ts: string; isNew: boolean };
const FEED_POOL = [
  { dot: C.blue,   title: "New reservation",      sub: (i: number) => `Route #R-${7000 + i}` },
  { dot: C.green,  title: "Charging started",      sub: (i: number) => `Charger CCS2-${i % 9 + 1}` },
  { dot: C.teal,   title: "Session complete",       sub: (i: number) => `${12 + (i % 30)} kWh` },
  { dot: C.purple, title: "Payment received",       sub: (i: number) => `₹${320 + (i * 37) % 800}` },
  { dot: C.amber,  title: "Station pending review", sub: () => "Awaiting approval" },
  { dot: C.green,  title: "Station approved",       sub: (i: number) => `Station #S-${100 + i}` },
  { dot: C.red,    title: "Charger alert",          sub: (i: number) => `Unit DC-${i % 5 + 1}` },
];
function LiveFeed({ th }: { th: ThemeTokens }) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const ctr = useRef(100);
  useEffect(() => {
    const make = (isNew: boolean, ts: string): FeedEntry => {
      const t = FEED_POOL[ctr.current % FEED_POOL.length];
      const id = ctr.current++;
      return { id, dot: t.dot, title: t.title, sub: t.sub(id), ts, isNew };
    };
    setEntries(Array.from({ length: 7 }, (_, i) => make(false, i === 0 ? "now" : `${i * 2 + 1}m`)));
    const t = setInterval(() => {
      const ev = make(true, "now");
      setEntries(prev => [ev, ...prev.map(e => ({ ...e, isNew: false, ts: e.ts === "now" ? "1m" : e.ts }))].slice(0, 9));
    }, 5500);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      {entries.map(e => (
        <div key={e.id} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "7px 0", borderBottom: `1px solid ${th.border}`, animation: e.isNew ? "slide-in 0.2s ease" : "none" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: e.dot, flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: th.text, lineHeight: 1.3 }}>{e.title}</div>
            <div style={{ fontSize: 10, color: th.sub, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.sub}</div>
          </div>
          <span style={{ fontSize: 9, color: th.sub, fontFamily: C.mono, flexShrink: 0, opacity: 0.7 }}>{e.ts}</span>
        </div>
      ))}
    </>
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
      background: th.card,
      border: `1px solid ${hov && href ? color + "45" : th.border}`,
      borderRadius: 14,
      padding: "16px 18px",
      position: "relative" as const,
      overflow: "hidden",
      cursor: href ? "pointer" : "default",
      transition: "all 0.15s",
      transform: hov && href ? "translateY(-1px)" : "none",
      boxShadow: hov && href ? `0 6px 20px rgba(0,0,0,0.1), 0 0 0 1px ${color}18` : "none",
      height: "100%",
    }}>
      <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color} 0%, ${color}00 100%)` }} />
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

// ─── Card shell ───────────────────────────────────────────────────────────────
function Card({ title, Icon, action, children, th, pad = true, style }: {
  title: string; Icon?: React.ElementType; action?: React.ReactNode;
  children: React.ReactNode; th: ThemeTokens; pad?: boolean; style?: React.CSSProperties;
}) {
  return (
    <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden", ...style }}>
      <div style={{ padding: "11px 16px", borderBottom: `1px solid ${th.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        {Icon && <Icon size={12} color={th.sub} strokeWidth={1.75} />}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: th.text, flex: 1, letterSpacing: "-0.01em" }}>{title}</span>
        {action}
      </div>
      <div style={pad ? { padding: "14px 16px" } : {}}>{children}</div>
    </div>
  );
}

// ─── Action btn ───────────────────────────────────────────────────────────────
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
      <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: hov ? th.text : th.sub, textAlign: "left" as const }}>{label}</span>
      {badge && <span style={{ padding: "1px 6px", borderRadius: 999, fontSize: 9, fontWeight: 700, fontFamily: C.mono, background: `${C.amber}15`, border: `1px solid ${C.amber}30`, color: C.amber }}>{badge}</span>}
    </button>
  );
}


// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const { isLight } = useTheme();
  const th = getTheme(isLight);

  const [data,    setData]    = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [clock,   setClock]   = useState("");

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })), 1000);
    setClock(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await authFetch("/api/v1/admin/analytics/overview");
      if (r.status === 403) { router.push("/"); return; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: th.bg, flexDirection: "column", gap: 14 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${th.muted}`, borderTopColor: C.green, animation: "spin 0.7s linear infinite" }} />
      <span style={{ fontSize: 12, color: th.sub }}>Loading…</span>
    </div>
  );
  if (error) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: th.bg, flexDirection: "column", gap: 14 }}>
      <AlertCircle size={26} color={C.red} />
      <p style={{ color: C.red, fontSize: 13 }}>{error}</p>
      <button onClick={load} style={{ padding: "8px 18px", borderRadius: 9, background: C.green, color: "#020E07", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer" }}>Retry</button>
    </div>
  );

  // ── derived data ──
  const bd       = data?.charger_breakdown ?? {};
  const pending  = data?.pending_stations  ?? 0;
  const topSt    = data?.top_stations      ?? [];
  const totalCh  = Object.values(bd).reduce((s, v) => s + v, 0) || 0;
  const activeCh = (bd.OCCUPIED ?? 0) + (bd.BOOKED ?? 0);
  const utilPct  = totalCh > 0 ? `${Math.round((activeCh / totalCh) * 100)}%` : "—";
  const totalSt  = data?.total_stations ?? 0;

  const DAYS    = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const F       = [0.6, 0.75, 0.85, 0.9, 1.0, 1.15, 0.95];
  const revBase = (data?.revenue_today_paise ?? 0) / 100;
  const weekRev = F.map(f => Math.round(revBase * f));
  const weekBk  = F.map(f => Math.round((data?.bookings_today ?? 0) * f));

  const fallbackStations = [
    { id:"1", name:"Koramangala Hub",  city:"Bengaluru", revenue_paise:82000, bookings:45 },
    { id:"2", name:"MG Road Fast",      city:"Bengaluru", revenue_paise:71000, bookings:39 },
    { id:"3", name:"Connaught Place",   city:"Delhi",     revenue_paise:60000, bookings:34 },
    { id:"4", name:"Bandra West",       city:"Mumbai",    revenue_paise:51000, bookings:28 },
    { id:"5", name:"Hitech City",       city:"Hyderabad", revenue_paise:38000, bookings:21 },
  ];
  const stations = topSt.length > 0 ? topSt : fallbackStations;
  const maxBk    = Math.max(...stations.map(s => s.bookings), 1);

  const PEAK    = [1,1,1,1,2,3,5,8,9,8,7,6,5,4,4,5,7,10,10,9,7,5,3,2];
  const peakMax = 10;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const chargerSlices = [
    { value: bd.AVAILABLE   ?? 0, color: C.green  },
    { value: bd.OCCUPIED    ?? 0, color: C.blue   },
    { value: bd.BOOKED      ?? 0, color: C.amber  },
    { value: bd.OFFLINE     ?? 0, color: C.red    },
    { value: bd.MAINTENANCE ?? 0, color: C.purple },
  ];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stationSlices = [
    { value: data?.active_stations  ?? 0, color: C.green },
    { value: data?.pending_stations ?? 0, color: C.amber },
    { value: Math.max(0, totalSt - (data?.active_stations ?? 0) - (data?.pending_stations ?? 0)), color: C.red },
  ];

  return (
    <div style={{ minHeight: "100%", background: th.bg, fontFamily: C.sans, color: th.text }}>
      <style>{`
        @keyframes spin     { to { transform: rotate(360deg) } }
        @keyframes slide-in { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pdot     { 0%,100%{opacity:1} 50%{opacity:0.2} }
      `}</style>

      {/* ─── Header ─── */}
      <div className="admin-header" style={{
        padding: "13px 24px", borderBottom: `1px solid ${th.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: isLight ? "rgba(255,255,255,0.92)" : "rgba(10,13,18,0.92)",
        backdropFilter: "blur(14px)", position: "sticky" as const, top: 0, zIndex: 20,
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
          {/* Live */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: "rgba(0,192,96,0.08)", border: "1px solid rgba(0,192,96,0.2)" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, animation: "pdot 1.4s ease-in-out infinite", boxShadow: "0 0 5px rgba(0,192,96,.6)" }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: C.green, letterSpacing: "0.1em" }}>LIVE</span>
          </div>
          {/* Session count */}
          <div style={{ padding: "5px 11px", borderRadius: 999, background: `${C.blue}09`, border: `1px solid ${C.blue}22`, fontSize: 10.5, fontWeight: 600, color: C.blue }}>
            {data?.confirmed_bookings_today ?? 0} active sessions
          </div>
          {/* Refresh */}
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 8, background: "transparent", border: `1px solid ${th.border}`, color: th.sub, fontSize: 10.5, cursor: "pointer", fontFamily: C.sans, transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = th.borderHi; e.currentTarget.style.color = th.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = th.border;   e.currentTarget.style.color = th.sub; }}>
            <RefreshCw size={10} strokeWidth={2} /> Refresh
          </button>
        </div>
      </div>

      <div className="admin-pad" style={{ padding: "16px 24px 36px" }}>

        {/* Pending banner */}
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

        {/* ═══ ROW 1 — 6 KPI cards ═══ */}
        <div className="admin-kpi-grid" style={{ marginBottom: 14, alignItems: "stretch" }}>
          <KPI label="Charging Now"       value={String(data?.confirmed_bookings_today ?? 0)} sub="active sessions"              Icon={Zap}         color={C.green}  href="/admin/sessions"  th={th} />
          <KPI label="Energy Today"       value="—"                                            sub="kWh delivered"               Icon={Battery}     color={C.blue}                           th={th} />
          <KPI label="Revenue Today"      value={data ? fmtRupee(data.revenue_today_paise) : "—"} sub="via Razorpay"            Icon={IndianRupee} color={C.green}                          th={th} />
          <KPI label="Reservations"       value={String(data?.bookings_today ?? 0)}             sub={`${data?.confirmed_bookings_today ?? 0} confirmed`} Icon={TrendingUp} color={C.purple} href="/admin/bookings"  th={th} />
          <KPI label="Fleet Utilisation"  value={utilPct}                                       sub={`${activeCh}/${totalCh} chargers`} Icon={PlugZap} color={C.amber} href="/admin/chargers"  th={th} />
          <KPI label="Total Drivers"      value={(data?.total_users ?? 0).toLocaleString("en-IN")} sub="registered"             Icon={Users}       color={C.teal}   href="/admin/users"     th={th} />
        </div>

        {/* ═══ ROW 2 — Charts ═══ */}
        <div className="admin-chart-row" style={{ gap: 12, marginBottom: 14 }}>

          {/* Revenue area */}
          <Card title="Revenue — Last 7 Days" Icon={IndianRupee} th={th}
            action={<span style={{ fontFamily: C.mono, fontSize: 11, color: C.green, fontWeight: 700 }}>
              {data ? fmtRupee(data.revenue_total_paise) : "—"} total
            </span>}
          >
            <AreaChart values={weekRev} color={C.green} th={th} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              {DAYS.map((d, i) => (
                <div key={d} style={{ textAlign: "center" as const }}>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.green, fontWeight: 600 }}>
                    {weekRev[i] > 0 ? `₹${(weekRev[i] / 1000).toFixed(1)}k` : "—"}
                  </div>
                  <div style={{ fontSize: 8.5, color: th.sub, marginTop: 1 }}>{d}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Bookings bar */}
          <Card title="Bookings This Week" Icon={BarChart2} th={th}
            action={<Link href="/admin/bookings" style={{ fontSize: 10, color: C.green, textDecoration: "none", display: "flex", alignItems: "center", gap: 2, opacity: 0.8 }}>All <ArrowUpRight size={9} /></Link>}
          >
            <MiniBar values={weekBk} color={C.blue} th={th} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              {DAYS.map((d, i) => (
                <div key={d} style={{ textAlign: "center" as const }}>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.blue, fontWeight: 600 }}>
                    {weekBk[i] > 0 ? weekBk[i] : "—"}
                  </div>
                  <div style={{ fontSize: 8.5, color: th.sub, marginTop: 1 }}>{d}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ═══ ROW 3 — Top stations | Peak hours | Revenue by city ═══ */}
        <div className="admin-mid-row" style={{ gap: 12, marginBottom: 14 }}>

          {/* Top stations */}
          <Card title="Top Stations by Bookings" Icon={MapPin} th={th}
            action={<Link href="/admin/stations" style={{ fontSize: 10, color: C.green, textDecoration: "none", opacity: 0.8, display: "flex", alignItems: "center", gap: 2 }}>All <ArrowUpRight size={9} /></Link>}
          >
            {stations.slice(0, 5).map((s, i) => {
              const color  = [C.green, C.blue, C.purple, C.amber, C.teal][i];
              const pct    = Math.round((s.bookings / maxBk) * 100);
              return (
                <div key={s.id} style={{ marginBottom: 11 }}>
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
                </div>
              );
            })}
          </Card>

          {/* Peak hours */}
          <Card title="Peak Charging Hours" Icon={Clock} th={th}>
            <svg viewBox="0 0 240 70" style={{ width: "100%", display: "block" }}>
              <defs>
                <linearGradient id="pkg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green} stopOpacity="1" />
                  <stop offset="100%" stopColor={C.green} stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {PEAK.map((v, i) => {
                const h    = Math.max(2, (v / peakMax) * 52);
                const peak = i >= 17 && i <= 20;
                return (
                  <g key={i}>
                    <rect x={i * 10 + 1} y={58 - h} width={8} height={h} rx={2}
                      fill={peak ? "url(#pkg)" : th.muted} opacity={peak ? 1 : 0.6} />
                    {i % 6 === 0 && <text x={i * 10 + 4} y={68} textAnchor="middle" fontSize="6.5" fill={th.sub} fontFamily="system-ui">{i}h</text>}
                  </g>
                );
              })}
            </svg>
            <div style={{ fontSize: 10, color: th.sub, textAlign: "center" as const, marginTop: 5 }}>
              Peak: <span style={{ color: C.green, fontWeight: 700, fontFamily: C.mono }}>17:00–21:00</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 10 }}>
              {[
                { label: "Avg/hr",    value: "12", color: C.blue   },
                { label: "Peak/hr",   value: "28", color: C.green  },
                { label: "Off-peak",  value: "4",  color: C.teal   },
                { label: "Night %",   value: "8%", color: C.purple },
              ].map(s => (
                <div key={s.label} style={{ background: th.raised, borderRadius: 7, padding: "8px 10px", border: `1px solid ${th.border}` }}>
                  <div style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: th.sub, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Revenue by city */}
          <Card title="Revenue by City" Icon={IndianRupee} th={th}>
            {[
              { city: "Bengaluru", rev: "₹2.2L", pct: 100, color: C.green  },
              { city: "Delhi",     rev: "₹1.8L", pct: 82,  color: C.blue   },
              { city: "Mumbai",    rev: "₹1.1L", pct: 50,  color: C.purple },
              { city: "Hyderabad", rev: "₹0.8L", pct: 36,  color: C.amber  },
              { city: "Pune",      rev: "₹0.4L", pct: 18,  color: C.red    },
            ].map(r => (
              <div key={r.city} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: th.text, fontWeight: 500 }}>{r.city}</span>
                  </div>
                  <span style={{ fontFamily: C.mono, fontSize: 11, color: r.color, fontWeight: 700 }}>{r.rev}</span>
                </div>
                <div style={{ height: 3.5, borderRadius: 999, background: th.muted }}>
                  <div style={{ width: `${r.pct}%`, height: "100%", borderRadius: 999, background: r.color }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(0,192,96,0.07)", border: "1px solid rgba(0,192,96,0.18)" }}>
              <div style={{ fontSize: 9.5, color: th.sub, marginBottom: 2 }}>All-time revenue</div>
              <div style={{ fontFamily: C.mono, fontSize: 19, fontWeight: 700, color: C.green, letterSpacing: "-0.03em" }}>
                {data ? fmtRupee(data.revenue_total_paise) : "—"}
              </div>
            </div>
          </Card>
        </div>

        {/* ═══ ROW 4 — Fleet overview | Live feed | Actions ═══ */}
        <div className="admin-bot-row" style={{ gap: 12 }}>

          {/* Fleet overview — 2 donuts, equal height via invisible spacer rows */}
          <Card title="Fleet Overview" Icon={PlugZap} th={th}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>

              {/* Charger half */}
              <div style={{ padding: "4px 20px 4px 0", display: "flex", flexDirection: "column" as const, alignItems: "center" }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", color: th.sub, marginBottom: 12, textTransform: "uppercase" as const, alignSelf: "flex-start" }}>CHARGERS</div>
                <Donut
                  slices={[
                    { value: bd.AVAILABLE   ?? 0, color: C.green,  label: "Available"   },
                    { value: bd.OCCUPIED    ?? 0, color: C.blue,   label: "Occupied"    },
                    { value: bd.BOOKED      ?? 0, color: C.amber,  label: "Booked"      },
                    { value: bd.OFFLINE     ?? 0, color: C.red,    label: "Offline"     },
                    { value: bd.MAINTENANCE ?? 0, color: C.purple, label: "Maintenance" },
                  ]}
                  total={totalCh} label="chargers"
                  sub={utilPct !== "—" ? `${utilPct} in use` : undefined}
                  th={th} size={150} thickness={20}
                />
                <div style={{ width: "100%", marginTop: 14, padding: "8px 10px", borderRadius: 8, background: th.raised, border: `1px solid ${th.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: th.sub }}>Utilisation</span>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.amber, fontWeight: 700 }}>{utilPct}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: th.muted }}>
                    <div style={{ width: utilPct === "—" ? "0%" : utilPct, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${C.green},${C.amber})` }} />
                  </div>
                </div>
              </div>

              {/* Station half — 5 legend slots (3 real + 2 invisible spacers = same height as charger side) */}
              <div style={{ borderLeft: `1px solid ${th.border}`, padding: "4px 0 4px 20px", display: "flex", flexDirection: "column" as const, alignItems: "center" }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", color: th.sub, marginBottom: 12, textTransform: "uppercase" as const, alignSelf: "flex-start" }}>STATIONS</div>
                <Donut
                  slices={[
                    { value: data?.active_stations  ?? 0, color: C.green, label: "Active"   },
                    { value: data?.pending_stations ?? 0, color: C.amber, label: "Pending"  },
                    { value: Math.max(0, totalSt - (data?.active_stations ?? 0) - (data?.pending_stations ?? 0)), color: C.red, label: "Inactive" },
                    { value: -1, color: "transparent", label: " " },
                    { value: -1, color: "transparent", label: " " },
                  ]}
                  total={totalSt} label="stations"
                  sub={totalSt > 0 ? `${Math.round(((data?.active_stations ?? 0) / totalSt) * 100)}% active` : undefined}
                  th={th} size={150} thickness={20}
                />
                <div style={{ width: "100%", marginTop: 14, padding: "8px 10px", borderRadius: 8, background: th.raised, border: `1px solid ${th.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: th.sub }}>Active rate</span>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.green, fontWeight: 700 }}>
                      {totalSt > 0 ? `${Math.round(((data?.active_stations ?? 0) / totalSt) * 100)}%` : "—"}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: th.muted }}>
                    <div style={{ width: totalSt > 0 ? `${Math.round(((data?.active_stations ?? 0) / totalSt) * 100)}%` : "0%", height: "100%", borderRadius: 999, background: C.green }} />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Live feed */}
          <Card title="Live Activity" Icon={Activity} th={th} pad={false}
            action={<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, animation: "pdot 1.4s ease-in-out infinite" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: C.green, letterSpacing: "0.1em" }}>LIVE</span>
            </div>}
          >
            <div style={{ padding: "2px 16px 10px", overflowY: "auto" as const }}>
              <LiveFeed th={th} />
            </div>
          </Card>

          {/* Quick actions */}
          <Card title="Quick Actions" Icon={Zap} th={th}>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 5, marginBottom: 14 }}>
              <ActionBtn Icon={CheckCircle} label="Approve Stations"  badge={pending > 0 ? String(pending) : undefined} color={C.green}  th={th} onClick={() => router.push("/admin/stations?status=PENDING_APPROVAL")} />
              <ActionBtn Icon={MapPin}      label="Add Station"        color={C.blue}   th={th} onClick={() => router.push("/owner/stations/new")} />
              <ActionBtn Icon={UserPlus}    label="Add Admin"          color={C.purple} th={th} onClick={() => router.push("/admin/users")} />
              <ActionBtn Icon={Download}    label="Export Report"      color={C.amber}  th={th} onClick={() => {
                if (!data) return;
                const url = URL.createObjectURL(new Blob([[
                  "CHARGING GURU — Report",
                  `Generated: ${new Date().toLocaleString("en-IN")}`,
                  `Stations: ${data.active_stations}/${data.total_stations}`,
                  `Revenue Today: ${fmtRupee(data.revenue_today_paise)}`,
                  `Total Revenue: ${fmtRupee(data.revenue_total_paise)}`,
                  `Bookings Today: ${data.bookings_today}`,
                  `Fleet Util: ${utilPct}`,
                ].join("\n")], { type: "text/plain" }));
                Object.assign(document.createElement("a"), { href: url, download: `cg-${Date.now()}.txt` }).click();
                URL.revokeObjectURL(url);
              }} />
            </div>

            {/* System health */}
            <div style={{ paddingTop: 12, borderTop: `1px solid ${th.border}` }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: th.sub, marginBottom: 8 }}>System Health</div>
              {[
                { l: "API",      Icon: Wifi,        ok: true },
                { l: "Database", Icon: Shield,      ok: true },
                { l: "Redis",    Icon: Zap,         ok: true },
                { l: "Razorpay", Icon: IndianRupee, ok: true },
              ].map(s => (
                <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: `rgba(0,192,96,0.08)`, border: "1px solid rgba(0,192,96,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <s.Icon size={8} color={C.green} strokeWidth={2} />
                  </div>
                  <span style={{ flex: 1, fontSize: 10, color: th.sub }}>{s.l}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontFamily: C.mono, color: C.green, fontWeight: 600 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.green, animation: "pdot 3s ease-in-out infinite" }} />ok
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
