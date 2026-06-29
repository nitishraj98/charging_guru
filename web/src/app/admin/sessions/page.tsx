"use client";
import { useCallback, useEffect, useState } from "react";
import { Zap, Clock } from "lucide-react";
import { getTheme, BASE, getToken, fmtRupee, STATUS_BOOKING, fmtDateTime, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";

interface Booking {
  id: string; user_id: string; charger_id: string; slot_id: string;
  status: string; amount: number; hold_expires_at: string | null; created_at: string;
}
interface PagedResult { items: Booking[]; total: number; page: number; per_page: number; pages: number; }

const SESSION_STATUSES = ["CHECKED_IN", "IN_PROGRESS"];

export default function AdminSessionsPage() {
  const { isLight } = useTheme();
  const th = getTheme(isLight);

  const [data,    setData]    = useState<PagedResult | null>(null);
  const [page,    setPage]    = useState(1);
  const [status,  setStatus]  = useState("IN_PROGRESS");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/api/v1/admin/bookings?page=${p}&per_page=20&status=${status}`, {
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
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${th.border}`, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Zap size={18} color={C.blue} strokeWidth={2} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: th.text, letterSpacing: "-0.02em" }}>Charging Sessions</h1>
          {data && data.total > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: `${C.blue}12`, border: `1px solid ${C.blue}35`, fontSize: 11, color: C.blue, fontWeight: 600, marginLeft: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue, animation: "pulse 1.5s ease-in-out infinite" }} />
              {data.total} active
            </div>
          )}
        </div>
        <p style={{ fontSize: 12, color: th.sub }}>Live view of bookings currently in session</p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {SESSION_STATUSES.map(s => {
          const meta  = STATUS_BOOKING[s];
          const active = status === s;
          return (
            <button key={s} onClick={() => setStatus(s)} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400,
              cursor: "pointer", fontFamily: C.sans, transition: "all 0.1s",
              background: active ? `${meta.color}15` : th.card,
              border: `1px solid ${active ? meta.color + "40" : th.border}`,
              color: active ? meta.color : th.sub,
            }}>{meta.label}</button>
          );
        })}
      </div>

      {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Booking ID", "User ID", "Status", "Amount", "Started"].map(h => <th key={h} style={tH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading && !data && <tr><td colSpan={5} style={{ ...tD, textAlign: "center", padding: "48px", color: th.sub }}>Loading…</td></tr>}
            {!loading && data?.items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tD, textAlign: "center", padding: "60px" }}>
                  <Clock size={28} color={th.muted} style={{ marginBottom: 12 }} />
                  <div style={{ color: th.sub, fontSize: 14 }}>No active sessions right now</div>
                </td>
              </tr>
            )}
            {data?.items.map(b => {
              const meta = STATUS_BOOKING[b.status] ?? { label: b.status, color: th.sub };
              return (
                <tr key={b.id}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = th.raised; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  style={{ transition: "background 0.1s" }}>
                  <td style={tD}><span style={{ fontFamily: C.mono, fontSize: 12 }}>{b.id.slice(0, 16)}…</span></td>
                  <td style={{ ...tD, fontFamily: C.mono, fontSize: 11, color: th.sub }}>{b.user_id.slice(0, 16)}…</td>
                  <td style={tD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, animation: "pulse 1.5s ease-in-out infinite" }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                    </div>
                  </td>
                  <td style={{ ...tD, fontFamily: C.mono, fontWeight: 600, color: C.green }}>{fmtRupee(b.amount)}</td>
                  <td style={{ ...tD, fontSize: 12, color: th.sub }}>{fmtDateTime(b.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: page > 1 ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: page > 1 ? th.text : th.sub, fontFamily: C.sans }}>← Prev</button>
          <span style={{ padding: "7px 12px", fontSize: 12, color: th.sub }}>{page} / {data.pages}</span>
          <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}
            style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: page < data.pages ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: page < data.pages ? th.text : th.sub, fontFamily: C.sans }}>Next →</button>
        </div>
      )}
    </div>
  );
}
