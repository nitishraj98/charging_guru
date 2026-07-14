"use client";
import { useCallback, useEffect, useState } from "react";
import { Clock, CheckCircle, XCircle, BookOpen, Ban, RotateCcw } from "lucide-react";
import { getTheme, authFetch, fmtDate, fmtDateTime, fmtRupee, STATUS_BOOKING, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";

interface Booking {
  id: string; user_id: string; charger_id: string; slot_id: string;
  status: string; amount: number; hold_expires_at: string | null; created_at: string;
}
interface PagedResult { items: Booking[]; total: number; page: number; per_page: number; pages: number; }

const TABS = ["ALL", "PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"];
const CANCELLABLE  = new Set(["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"]);
const REFUNDABLE   = new Set(["CONFIRMED", "CHECKED_IN"]);

export default function AdminBookingsPage() {
  const { isLight } = useTheme();
  const th = getTheme(isLight);

  const [data,     setData]     = useState<PagedResult | null>(null);
  const [page,     setPage]     = useState(1);
  const [status,   setStatus]   = useState("ALL");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [sweeping, setSweeping] = useState(false);
  const [acting,   setActing]   = useState<string | null>(null);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError("");
    try {
      const q = status !== "ALL" ? `&status=${status}` : "";
      const res = await authFetch(`/api/v1/admin/bookings?page=${p}&per_page=20${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { setPage(1); load(1); }, [status]); // eslint-disable-line
  useEffect(() => { load(page); }, [page, load]);

  const expireHolds = async () => {
    setSweeping(true);
    try {
      const res = await authFetch("/api/v1/admin/maintenance/expire-holds", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      showToast(`Expired ${json.expired_count ?? 0} stale holds.`);
      load(page);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Sweep failed", false); }
    finally { setSweeping(false); }
  };

  const doAction = async (id: string, action: "cancel" | "refund") => {
    setActing(id + action);
    try {
      const res = await authFetch(`/api/v1/admin/bookings/${id}/${action}`, { method: "POST" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.detail ?? `HTTP ${res.status}`); }
      showToast(action === "cancel" ? "Booking cancelled." : "Refund initiated.", action === "refund");
      load(page);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Action failed", false); }
    finally { setActing(null); }
  };

  const tH: React.CSSProperties = { padding: "10px 18px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: th.sub, textAlign: "left", borderBottom: `1px solid ${th.border}`, background: th.raised, whiteSpace: "nowrap" };
  const tD: React.CSSProperties = { padding: "12px 18px", fontSize: 13, color: th.text, borderBottom: `1px solid ${th.border}`, verticalAlign: "middle" };

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: C.sans, position: "relative" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 18px", borderRadius: 10, background: th.card, border: `1px solid ${toast.ok ? C.green + "50" : C.red + "50"}`, color: toast.ok ? C.green : C.red, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}{toast.msg}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 20, borderBottom: `1px solid ${th.border}`, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BookOpen size={18} color={C.blue} strokeWidth={2} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: th.text, letterSpacing: "-0.02em" }}>Bookings</h1>
            <p style={{ fontSize: 12, color: th.sub, marginTop: 2 }}>{data ? `${data.total.toLocaleString()} total` : "Loading…"}</p>
          </div>
        </div>
        <button onClick={expireHolds} disabled={sweeping}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: sweeping ? "default" : "pointer", fontFamily: C.sans, background: `${C.amber}12`, border: `1px solid ${C.amber}35`, color: C.amber, opacity: sweeping ? 0.6 : 1 }}>
          <Clock size={13} /> {sweeping ? "Sweeping…" : "Expire Stale Holds"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(s => {
          const meta  = STATUS_BOOKING[s];
          const color = meta?.color ?? C.green;
          const active = status === s;
          return (
            <button key={s} onClick={() => setStatus(s)} style={{
              padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: active ? 600 : 400,
              cursor: "pointer", fontFamily: C.sans, transition: "all 0.1s",
              background: active ? `${color}15` : th.card,
              border: `1px solid ${active ? color + "40" : th.border}`,
              color: active ? color : th.sub,
            }}>{s === "ALL" ? "All" : (meta?.label ?? s.replace(/_/g, " "))}</button>
          );
        })}
      </div>

      {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div className="admin-table-wrap" style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Booking", "Amount", "Status", "Hold Expires", "Created", "Actions"].map(h => <th key={h} style={tH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading && !data && <tr><td colSpan={6} style={{ ...tD, textAlign: "center", padding: "48px", color: th.sub }}>Loading…</td></tr>}
            {!loading && data?.items.length === 0 && <tr><td colSpan={6} style={{ ...tD, textAlign: "center", padding: "48px", color: th.sub }}>No bookings found.</td></tr>}
            {data?.items.map(b => {
              const meta = STATUS_BOOKING[b.status] ?? { label: b.status, color: th.sub };
              const busy = acting !== null;
              return (
                <tr key={b.id}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = th.raised; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  style={{ transition: "background 0.1s" }}>
                  <td style={tD}>
                    <div style={{ fontFamily: C.mono, fontSize: 12 }}>{b.id.slice(0, 13)}…</div>
                    <div style={{ fontSize: 10, color: th.sub, marginTop: 2, fontFamily: C.mono }}>uid: {b.user_id.slice(0, 8)}…</div>
                  </td>
                  <td style={{ ...tD, fontFamily: C.mono, fontWeight: 700, color: C.green }}>{fmtRupee(b.amount)}</td>
                  <td style={tD}>
                    <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: `${meta.color}15`, border: `1px solid ${meta.color}35`, color: meta.color }}>
                      {meta.label}
                    </span>
                  </td>
                  <td style={{ ...tD, fontSize: 12, color: th.sub }}>{b.hold_expires_at ? fmtDateTime(b.hold_expires_at) : "—"}</td>
                  <td style={{ ...tD, fontSize: 12, color: th.sub }}>{fmtDate(b.created_at)}</td>
                  <td style={tD}>
                    <div style={{ display: "flex", gap: 5 }}>
                      {CANCELLABLE.has(b.status) && (
                        <button disabled={busy} onClick={() => doAction(b.id, "cancel")}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: busy ? "default" : "pointer", background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, fontFamily: C.sans, opacity: acting === b.id + "cancel" ? 0.5 : 1 }}>
                          <Ban size={10} /> Cancel
                        </button>
                      )}
                      {REFUNDABLE.has(b.status) && (
                        <button disabled={busy} onClick={() => doAction(b.id, "refund")}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: busy ? "default" : "pointer", background: `${C.amber}10`, border: `1px solid ${C.amber}30`, color: C.amber, fontFamily: C.sans, opacity: acting === b.id + "refund" ? 0.5 : 1 }}>
                          <RotateCcw size={10} /> Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: page > 1 ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: page > 1 ? th.text : th.sub, fontFamily: C.sans }}>← Prev</button>
          {Array.from({ length: Math.min(data.pages, 5) }, (_, i) => { const p = i + Math.max(1, page - 2); if (p > data.pages) return null; return <button key={p} onClick={() => setPage(p)} style={{ width: 34, height: 34, borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: C.sans, fontWeight: page === p ? 700 : 400, background: page === p ? `${C.green}15` : th.card, border: `1px solid ${page === p ? C.green + "50" : th.border}`, color: page === p ? C.green : th.text }}>{p}</button>; })}
          <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}
            style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: page < data.pages ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: page < data.pages ? th.text : th.sub, fontFamily: C.sans }}>Next →</button>
        </div>
      )}
    </div>
  );
}
