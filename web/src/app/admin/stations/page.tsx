"use client";
import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, MapPin } from "lucide-react";
import { getTheme, BASE, getToken, fmtDate, STATUS_STATION, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";

interface StationRow {
  id: string; name: string; address: string; city: string | null;
  state: string | null; status: string; owner_id: string;
  rating_avg: number; rating_count: number; created_at: string;
}
interface PagedResult { items: StationRow[]; total: number; page: number; per_page: number; pages: number; }

const TABS = ["ALL", "ACTIVE", "PENDING_APPROVAL", "SUSPENDED", "REJECTED"];

function StationsContent() {
  const params     = useSearchParams();
  const initStatus = params.get("status") ?? "ALL";
  const { isLight } = useTheme();
  const th = getTheme(isLight);

  const [data,    setData]    = useState<PagedResult | null>(null);
  const [page,    setPage]    = useState(1);
  const [status,  setStatus]  = useState(initStatus);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [acting,  setActing]  = useState<string | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError("");
    try {
      const q = status !== "ALL" ? `&status=${status}` : "";
      const res = await fetch(`${BASE}/api/v1/admin/stations?page=${p}&per_page=15${q}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { setPage(1); load(1); }, [status]); // eslint-disable-line
  useEffect(() => { load(page); }, [page, load]);

  const doApprove = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(`${BASE}/api/v1/admin/stations/${id}/approve`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("Station approved.");
      load(page);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", false); }
    finally { setActing(null); }
  };

  const doReject = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(`${BASE}/api/v1/admin/stations/${id}/reject`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Does not meet platform guidelines." }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("Station rejected.", false);
      load(page);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", false); }
    finally { setActing(null); }
  };

  const doSetStatus = async (id: string, newStatus: string, label: string) => {
    setActing(id);
    try {
      const res = await fetch(`${BASE}/api/v1/admin/stations/${id}/status`, {
        method: "PATCH", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(`Station ${label}.`, newStatus === "ACTIVE");
      load(page);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", false); }
    finally { setActing(null); }
  };

  const tH: React.CSSProperties = { padding: "10px 18px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: th.sub, textAlign: "left", borderBottom: `1px solid ${th.border}`, background: th.raised, whiteSpace: "nowrap" };
  const tD: React.CSSProperties = { padding: "12px 18px", fontSize: 13, color: th.text, borderBottom: `1px solid ${th.border}`, verticalAlign: "middle" };
  const pendingCount = status === "ALL" ? (data?.items.filter(s => s.status === "PENDING_APPROVAL").length ?? 0) : 0;

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: C.sans, position: "relative" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 18px", borderRadius: 10, background: th.card, border: `1px solid ${toast.ok ? C.green + "50" : C.red + "50"}`, color: toast.ok ? C.green : C.red, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}{toast.msg}
        </div>
      )}

      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${th.border}`, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <MapPin size={18} color={C.teal} strokeWidth={2} />
              <h1 style={{ fontSize: 22, fontWeight: 700, color: th.text, letterSpacing: "-0.02em" }}>Stations</h1>
            </div>
            <p style={{ fontSize: 12, color: th.sub }}>{data ? `${data.total.toLocaleString()} total` : "Loading…"}</p>
          </div>
          {pendingCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, background: `${C.amber}10`, border: `1px solid ${C.amber}30`, fontSize: 12, color: C.amber, fontWeight: 600 }}>
              <MapPin size={13} /> {pendingCount} pending review
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TABS.map(s => {
            const meta  = STATUS_STATION[s];
            const color = meta?.color ?? C.green;
            const active = status === s;
            return (
              <button key={s} onClick={() => setStatus(s)} style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400,
                cursor: "pointer", fontFamily: C.sans, transition: "all 0.1s",
                background: active ? `${color}15` : th.card,
                border: `1px solid ${active ? color + "45" : th.border}`,
                color: active ? color : th.sub,
              }}>{s === "ALL" ? "All" : (meta?.label ?? s.replace(/_/g, " "))}</button>
            );
          })}
        </div>
      </div>

      {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div className="admin-table-wrap" style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Station", "Location", "Status", "Rating", "Created", "Actions"].map(h => <th key={h} style={tH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading && !data && <tr><td colSpan={6} style={{ ...tD, textAlign: "center", padding: "48px", color: th.sub }}>Loading…</td></tr>}
            {!loading && data?.items.length === 0 && <tr><td colSpan={6} style={{ ...tD, textAlign: "center", padding: "48px", color: th.sub }}>No stations found.</td></tr>}
            {data?.items.map(s => {
              const meta  = STATUS_STATION[s.status] ?? { label: s.status, color: th.sub };
              const busy  = acting === s.id;
              return (
                <tr key={s.id}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = th.raised; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  style={{ transition: "background 0.1s" }}>
                  <td style={tD}>
                    <div style={{ fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 10, color: th.sub, marginTop: 2 }}>{s.id.slice(0, 8)}…</div>
                  </td>
                  <td style={tD}>
                    <div style={{ fontSize: 13 }}>{s.city ?? "—"}{s.state ? `, ${s.state}` : ""}</div>
                    <div style={{ fontSize: 11, color: th.sub, marginTop: 1 }}>{s.address.slice(0, 40)}{s.address.length > 40 ? "…" : ""}</div>
                  </td>
                  <td style={tD}>
                    <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: `${meta.color}15`, border: `1px solid ${meta.color}35`, color: meta.color }}>{meta.label}</span>
                  </td>
                  <td style={{ ...tD, fontFamily: C.mono, color: th.sub }}>{s.rating_avg > 0 ? `${s.rating_avg.toFixed(1)} (${s.rating_count})` : "—"}</td>
                  <td style={{ ...tD, fontSize: 12, color: th.sub }}>{fmtDate(s.created_at)}</td>
                  <td style={tD}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {s.status === "PENDING_APPROVAL" && (<>
                        <button disabled={busy} onClick={() => doApprove(s.id)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: busy ? "default" : "pointer", background: `${C.green}15`, border: `1px solid ${C.green}40`, color: C.green, fontFamily: C.sans, opacity: busy ? 0.5 : 1 }}>Approve</button>
                        <button disabled={busy} onClick={() => doReject(s.id)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: busy ? "default" : "pointer", background: `${C.red}12`, border: `1px solid ${C.red}35`, color: C.red, fontFamily: C.sans, opacity: busy ? 0.5 : 1 }}>Reject</button>
                      </>)}
                      {s.status === "ACTIVE" && (
                        <button disabled={busy} onClick={() => doSetStatus(s.id, "SUSPENDED", "suspended")} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: busy ? "default" : "pointer", background: `${C.amber}10`, border: `1px solid ${C.amber}35`, color: C.amber, fontFamily: C.sans, opacity: busy ? 0.5 : 1 }}>Suspend</button>
                      )}
                      {(s.status === "REJECTED" || s.status === "SUSPENDED") && (
                        <button disabled={busy} onClick={() => doSetStatus(s.id, "ACTIVE", "activated")} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: busy ? "default" : "pointer", background: `${C.green}10`, border: `1px solid ${C.green}35`, color: C.green, fontFamily: C.sans, opacity: busy ? 0.5 : 1 }}>Reactivate</button>
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
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: page > 1 ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: page > 1 ? th.text : th.sub, fontFamily: C.sans }}>← Prev</button>
          {Array.from({ length: Math.min(data.pages, 5) }, (_, i) => { const p = i + Math.max(1, page - 2); if (p > data.pages) return null; return <button key={p} onClick={() => setPage(p)} style={{ width: 34, height: 34, borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: C.sans, fontWeight: page === p ? 700 : 400, background: page === p ? `${C.green}15` : th.card, border: `1px solid ${page === p ? C.green + "50" : th.border}`, color: page === p ? C.green : th.text }}>{p}</button>; })}
          <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: page < data.pages ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: page < data.pages ? th.text : th.sub, fontFamily: C.sans }}>Next →</button>
        </div>
      )}
    </div>
  );
}

export default function AdminStationsPage() {
  return <Suspense fallback={null}><StationsContent /></Suspense>;
}
