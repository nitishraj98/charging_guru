"use client";
import { useCallback, useEffect, useState } from "react";
import { PlugZap } from "lucide-react";
import { getTheme, BASE, getToken, fmtDate, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";

interface Charger {
  id: string; label: string; connector_type: string; charger_type: string;
  power_kw: number; price_per_kwh: number; status: string;
  station_id: string; created_at: string;
}
interface PagedResult { items: Charger[]; total: number; page: number; per_page: number; pages: number; }

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: C.green, OCCUPIED: C.blue, BOOKED: C.amber, OFFLINE: C.red, MAINTENANCE: C.orange,
};
const TABS = ["ALL", "AVAILABLE", "OCCUPIED", "BOOKED", "OFFLINE", "MAINTENANCE"];

export default function AdminChargersPage() {
  const { isLight } = useTheme();
  const th = getTheme(isLight);

  const [data,    setData]    = useState<PagedResult | null>(null);
  const [page,    setPage]    = useState(1);
  const [status,  setStatus]  = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError("");
    try {
      const q = status !== "ALL" ? `&status=${status}` : "";
      const res = await fetch(`${BASE}/api/v1/admin/chargers?page=${p}&per_page=20${q}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { setPage(1); load(1); }, [status]); // eslint-disable-line
  useEffect(() => { load(page); }, [page, load]);

  const tH: React.CSSProperties = { padding: "10px 18px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: th.sub, textAlign: "left", borderBottom: `1px solid ${th.border}`, background: th.raised, whiteSpace: "nowrap" };
  const tD: React.CSSProperties = { padding: "12px 18px", fontSize: 13, color: th.text, borderBottom: `1px solid ${th.border}`, verticalAlign: "middle" };

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: C.sans }}>
      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${th.border}`, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <PlugZap size={18} color={C.purple} strokeWidth={2} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: th.text, letterSpacing: "-0.02em" }}>Chargers</h1>
        </div>
        <p style={{ fontSize: 12, color: th.sub }}>{data ? `${data.total.toLocaleString()} total across all stations` : "Loading…"}</p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(s => {
          const color  = STATUS_COLOR[s] ?? th.sub;
          const active = status === s;
          return (
            <button key={s} onClick={() => setStatus(s)} style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 11, fontWeight: active ? 600 : 400,
              cursor: "pointer", fontFamily: C.sans, transition: "all 0.12s",
              background: active ? `${color}15` : th.card,
              border: `1px solid ${active ? color + "45" : th.border}`,
              color: active ? color : th.sub,
            }}>{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}</button>
          );
        })}
      </div>

      {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div className="admin-table-wrap" style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Label", "Type", "Connector", "Power", "Price/kWh", "Status", "Added"].map(h => <th key={h} style={tH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading && !data && <tr><td colSpan={7} style={{ ...tD, textAlign: "center", padding: "48px", color: th.sub }}>Loading…</td></tr>}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={7} style={{ ...tD, textAlign: "center", padding: "60px" }}>
                <PlugZap size={28} color={th.muted} style={{ marginBottom: 12 }} />
                <div style={{ color: th.sub, fontSize: 14 }}>No chargers found</div>
              </td></tr>
            )}
            {data?.items.map(c => {
              const color = STATUS_COLOR[c.status] ?? th.sub;
              return (
                <tr key={c.id}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = th.raised; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  style={{ transition: "background 0.1s" }}>
                  <td style={tD}>
                    <div style={{ fontWeight: 600 }}>{c.label}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 10, color: th.sub, marginTop: 2 }}>{c.id.slice(0, 8)}…</div>
                  </td>
                  <td style={{ ...tD, fontFamily: C.mono, fontSize: 12, color: th.sub }}>{c.charger_type}</td>
                  <td style={{ ...tD, fontFamily: C.mono, fontSize: 12 }}>{c.connector_type}</td>
                  <td style={{ ...tD, fontFamily: C.mono, fontSize: 12, color: C.teal }}>{c.power_kw} kW</td>
                  <td style={{ ...tD, fontFamily: C.mono, fontSize: 12, color: th.sub }}>₹{(c.price_per_kwh / 100).toFixed(0)}</td>
                  <td style={tD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color }}>{c.status.charAt(0) + c.status.slice(1).toLowerCase().replace("_", " ")}</span>
                    </div>
                  </td>
                  <td style={{ ...tD, fontSize: 12, color: th.sub }}>{fmtDate(c.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: page > 1 ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: page > 1 ? th.text : th.sub, fontFamily: C.sans }}>← Prev</button>
          <span style={{ padding: "7px 14px", fontSize: 12, color: th.sub }}>Page {page} / {data.pages}</span>
          <button disabled={page === data.pages} onClick={() => setPage(p => Math.min(data.pages, p + 1))} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: page < data.pages ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: page < data.pages ? th.text : th.sub, fontFamily: C.sans }}>Next →</button>
        </div>
      )}
    </div>
  );
}
