"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Users, BookOpen, ShieldOff, ShieldCheck, Trash2, X } from "lucide-react";
import { getTheme, BASE, getToken, fmtDate, fmtDateTime, ROLE_COLOR, STATUS_BOOKING, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";

interface UserRow {
  id: string; phone: string; email: string | null; full_name: string | null;
  status: string; referral_code: string; reward_points: number;
  role_names: string[]; created_at: string;
}
interface BookingRow {
  id: string; status: string; amount: number; created_at: string;
  station_id: string; charger_id: string;
}
interface PagedResult<T> { items: T[]; total: number; page: number; per_page: number; pages: number; }

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: `${color}15`, border: `1px solid ${color}30`, color }}>
      {label}
    </span>
  );
}

export default function AdminUsersPage() {
  const { isLight } = useTheme();
  const th = getTheme(isLight);

  const [data,    setData]    = useState<PagedResult<UserRow> | null>(null);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [detail,  setDetail]  = useState<UserRow | null>(null);
  const [tab,     setTab]     = useState<"info" | "bookings">("info");
  const [bkData,  setBkData]  = useState<PagedResult<BookingRow> | null>(null);
  const [bkPage,  setBkPage]  = useState(1);
  const [bkLoad,  setBkLoad]  = useState(false);
  const [actBusy, setActBusy] = useState(false);
  const [actErr,  setActErr]  = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/api/v1/admin/users?page=${p}&per_page=20`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PagedResult<UserRow> = await res.json();
      if (search.trim().length > 1) {
        const q = search.toLowerCase();
        json.items = json.items.filter(u =>
          (u.full_name ?? "").toLowerCase().includes(q) ||
          u.phone.includes(q) ||
          (u.email ?? "").toLowerCase().includes(q)
        );
      }
      setData(json);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setPage(1); load(1); }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [search]); // eslint-disable-line

  useEffect(() => { load(page); }, [page, load]);

  const loadBookings = useCallback(async (userId: string, p = 1) => {
    setBkLoad(true);
    try {
      const res = await fetch(`${BASE}/api/v1/admin/users/${userId}/bookings?page=${p}&per_page=10`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setBkData(await res.json());
    } catch { setBkData(null); }
    finally { setBkLoad(false); }
  }, []);

  const openDetail = (u: UserRow) => { setDetail(u); setTab("info"); setActErr(""); setBkData(null); setBkPage(1); };

  const setTabAndLoad = (t: "info" | "bookings") => {
    setTab(t);
    if (t === "bookings" && detail && !bkData) loadBookings(detail.id, 1);
  };

  const action = async (newStatus: string) => {
    if (!detail) return;
    setActBusy(true); setActErr("");
    try {
      const res = await fetch(`${BASE}/api/v1/admin/users/${detail.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.detail ?? `HTTP ${res.status}`); }
      const updated: UserRow = await res.json();
      setDetail(updated);
      setData(d => d ? { ...d, items: d.items.map(u => u.id === updated.id ? updated : u) } : d);
    } catch (e: unknown) { setActErr(e instanceof Error ? e.message : "Failed"); }
    finally { setActBusy(false); }
  };

  const tH: React.CSSProperties = { padding: "10px 18px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: th.sub, textAlign: "left", borderBottom: `1px solid ${th.border}`, background: th.raised, whiteSpace: "nowrap" };
  const tD: React.CSSProperties = { padding: "12px 18px", fontSize: 13, color: th.text, borderBottom: `1px solid ${th.border}`, verticalAlign: "middle" };

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: C.sans }}>
      <style>{`@keyframes modal-in{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${th.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={18} color={C.blue} strokeWidth={2} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: th.text, letterSpacing: "-0.02em" }}>Drivers</h1>
            <p style={{ fontSize: 12, color: th.sub, marginTop: 2 }}>{data ? `${data.total.toLocaleString()} registered users` : "Loading…"}</p>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <Search size={13} color={th.sub} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, email…"
            style={{ paddingLeft: 34, paddingRight: 14, paddingTop: 8, paddingBottom: 8, borderRadius: 9, background: th.inputBg, border: `1px solid ${th.border}`, color: th.text, fontSize: 13, outline: "none", fontFamily: C.sans, width: 260 }} />
        </div>
      </div>

      {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Name & Phone", "Email", "Roles", "Status", "Points", "Joined", ""].map(h => <th key={h} style={tH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading && !data && <tr><td colSpan={7} style={{ ...tD, textAlign: "center", padding: "48px", color: th.sub }}>Loading…</td></tr>}
            {!loading && data?.items.length === 0 && <tr><td colSpan={7} style={{ ...tD, textAlign: "center", padding: "48px", color: th.sub }}>No users found.</td></tr>}
            {data?.items.map(u => (
              <tr key={u.id}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = th.raised; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                style={{ transition: "background 0.1s" }}>
                <td style={tD}>
                  <div style={{ fontWeight: 600 }}>{u.full_name ?? <span style={{ color: th.sub }}>No name</span>}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 11, color: th.sub, marginTop: 2 }}>{u.phone}</div>
                </td>
                <td style={{ ...tD, color: th.sub, fontSize: 12 }}>{u.email ?? "—"}</td>
                <td style={tD}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {u.role_names.length === 0
                      ? <span style={{ fontSize: 11, color: th.sub }}>User</span>
                      : u.role_names.map(r => <Badge key={r} label={r.replace("ROLE_", "")} color={ROLE_COLOR[r] ?? th.sub} />)}
                  </div>
                </td>
                <td style={tD}><Badge label={u.status} color={u.status === "ACTIVE" ? C.green : u.status === "SUSPENDED" ? C.amber : C.red} /></td>
                <td style={{ ...tD, fontFamily: C.mono, color: th.sub }}>{u.reward_points}</td>
                <td style={{ ...tD, fontSize: 12, color: th.sub }}>{fmtDate(u.created_at)}</td>
                <td style={tD}>
                  <button onClick={() => openDetail(u)}
                    style={{ padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", border: `1px solid ${th.border}`, color: th.sub, fontFamily: C.sans }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = th.borderHi; e.currentTarget.style.color = th.text; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = th.border; e.currentTarget.style.color = th.sub; }}>
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 16 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12, cursor: page > 1 ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: page > 1 ? th.text : th.sub, fontFamily: C.sans }}>← Prev</button>
          {Array.from({ length: Math.min(data.pages, 5) }, (_, i) => { const p = i + Math.max(1, page - 2); if (p > data.pages) return null; return <button key={p} onClick={() => setPage(p)} style={{ width: 32, height: 32, borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: C.sans, fontWeight: page === p ? 700 : 400, background: page === p ? `${C.green}15` : th.card, border: `1px solid ${page === p ? C.green + "50" : th.border}`, color: page === p ? C.green : th.text }}>{p}</button>; })}
          <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12, cursor: page < data.pages ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: page < data.pages ? th.text : th.sub, fontFamily: C.sans }}>Next →</button>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 18, width: 520, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 28px 80px rgba(0,0,0,0.3)", animation: "modal-in 0.15s ease", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 0", borderBottom: `1px solid ${th.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: th.text }}>{detail.full_name ?? "User"}</h2>
                  <div style={{ fontFamily: C.mono, fontSize: 11, color: th.sub, marginTop: 2 }}>{detail.phone}</div>
                </div>
                <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", color: th.sub, cursor: "pointer", padding: 4 }}><X size={16} /></button>
              </div>
              <div style={{ display: "flex", gap: 0 }}>
                {(["info", "bookings"] as const).map(t => (
                  <button key={t} onClick={() => setTabAndLoad(t)}
                    style={{ padding: "8px 18px", fontSize: 12, fontWeight: tab === t ? 700 : 400, cursor: "pointer", background: "none", border: "none", borderBottom: `2px solid ${tab === t ? C.green : "transparent"}`, color: tab === t ? C.green : th.sub, fontFamily: C.sans, textTransform: "capitalize" }}>
                    {t === "info" ? "Profile" : "Bookings"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {tab === "info" && (
                <>
                  {[
                    { label: "ID",       val: detail.id },
                    { label: "Email",    val: detail.email ?? "—" },
                    { label: "Status",   val: detail.status },
                    { label: "Roles",    val: detail.role_names.join(", ") || "User" },
                    { label: "Points",   val: `${detail.reward_points}` },
                    { label: "Referral", val: detail.referral_code },
                    { label: "Joined",   val: fmtDate(detail.created_at) },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${th.border}` }}>
                      <span style={{ fontSize: 12, color: th.sub }}>{row.label}</span>
                      <span style={{ fontSize: 12, color: th.text, fontFamily: C.mono, textAlign: "right", maxWidth: "65%", wordBreak: "break-all" }}>{row.val}</span>
                    </div>
                  ))}

                  {actErr && <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: `${C.red}12`, color: C.red, fontSize: 12 }}>{actErr}</div>}

                  <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                    {detail.status !== "ACTIVE" && (
                      <button onClick={() => action("ACTIVE")} disabled={actBusy} style={{ flex: 1, padding: "9px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: actBusy ? "default" : "pointer", background: `${C.green}15`, border: `1px solid ${C.green}40`, color: C.green, fontFamily: C.sans, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <ShieldCheck size={13} /> Activate
                      </button>
                    )}
                    {detail.status !== "SUSPENDED" && (
                      <button onClick={() => action("SUSPENDED")} disabled={actBusy} style={{ flex: 1, padding: "9px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: actBusy ? "default" : "pointer", background: `${C.amber}12`, border: `1px solid ${C.amber}40`, color: C.amber, fontFamily: C.sans, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <ShieldOff size={13} /> Suspend
                      </button>
                    )}
                    {detail.status !== "DELETED" && (
                      <button onClick={() => action("DELETED")} disabled={actBusy} style={{ flex: 1, padding: "9px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: actBusy ? "default" : "pointer", background: `${C.red}10`, border: `1px solid ${C.red}35`, color: C.red, fontFamily: C.sans, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <Trash2 size={13} /> Ban
                      </button>
                    )}
                  </div>
                </>
              )}

              {tab === "bookings" && (
                <>
                  {bkLoad && <div style={{ textAlign: "center", padding: "32px", color: th.sub, fontSize: 13 }}>Loading bookings…</div>}
                  {!bkLoad && bkData?.items.length === 0 && <div style={{ textAlign: "center", padding: "32px", color: th.sub, fontSize: 13 }}>No bookings yet.</div>}
                  {bkData?.items.map(b => {
                    const s = STATUS_BOOKING[b.status];
                    return (
                      <div key={b.id} style={{ padding: "12px 0", borderBottom: `1px solid ${th.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontFamily: C.mono, fontSize: 11, color: th.sub }}>{b.id.slice(0, 8)}…</div>
                          <div style={{ fontSize: 11, color: th.sub, marginTop: 3 }}>{fmtDateTime(b.created_at)}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <Badge label={s?.label ?? b.status} color={s?.color ?? th.sub} />
                          <div style={{ fontFamily: C.mono, fontSize: 12, color: th.text, marginTop: 4 }}>₹{(b.amount / 100).toLocaleString("en-IN")}</div>
                        </div>
                      </div>
                    );
                  })}
                  {bkData && bkData.pages > 1 && (
                    <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 16 }}>
                      <button disabled={bkPage === 1} onClick={() => { setBkPage(p => p - 1); loadBookings(detail.id, bkPage - 1); }} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, cursor: bkPage > 1 ? "pointer" : "default", background: th.raised, border: `1px solid ${th.border}`, color: bkPage > 1 ? th.text : th.sub, fontFamily: C.sans }}>← Prev</button>
                      <span style={{ padding: "6px 10px", fontSize: 11, color: th.sub }}>{bkPage} / {bkData.pages}</span>
                      <button disabled={bkPage === bkData.pages} onClick={() => { setBkPage(p => p + 1); loadBookings(detail.id, bkPage + 1); }} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, cursor: bkPage < bkData.pages ? "pointer" : "default", background: th.raised, border: `1px solid ${th.border}`, color: bkPage < bkData.pages ? th.text : th.sub, fontFamily: C.sans }}>Next →</button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ padding: "14px 24px", borderTop: `1px solid ${th.border}` }}>
              <button onClick={() => setDetail(null)} style={{ width: "100%", padding: "10px", borderRadius: 10, background: th.raised, border: `1px solid ${th.border}`, color: th.text, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: C.sans }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// suppress unused import lint warning
const _unused = BookOpen;
void _unused;
