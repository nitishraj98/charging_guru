"use client";
import { useCallback, useEffect, useState } from "react";
import { Building2, ArrowUpRight, MapPin, X } from "lucide-react";
import { getTheme, authFetch, fmtDate, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";

interface UserRow {
  id: string; phone: string; email: string | null; full_name: string | null;
  status: string; role_names: string[]; created_at: string;
}
interface StationRow {
  id: string; name: string; city: string | null; state: string | null;
  status: string; rating_avg: number; rating_count: number; created_at: string;
  owner_id: string;
}
interface PagedResult<T> { items: T[]; total: number; page: number; per_page: number; pages: number; }

const STATUS_COLOR: Record<string, string> = { ACTIVE: C.green, PENDING_APPROVAL: C.amber, SUSPENDED: C.orange, REJECTED: C.red };

export default function AdminOwnersPage() {
  const { isLight } = useTheme();
  const th = getTheme(isLight);

  const [owners,   setOwners]   = useState<UserRow[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [detail,   setDetail]   = useState<UserRow | null>(null);
  const [stations, setStations] = useState<PagedResult<StationRow> | null>(null);
  const [stLoad,   setStLoad]   = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true); setError("");
    const all: UserRow[] = [];
    let p = 1, pages = 1;
    try {
      while (p <= pages) {
        const res = await authFetch(`/api/v1/admin/users?page=${p}&per_page=100`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: PagedResult<UserRow> = await res.json();
        pages = json.pages;
        all.push(...json.items.filter(u => u.role_names.includes("ROLE_STATION_OWNER")));
        p++;
      }
      setOwners(all);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadStations = useCallback(async (ownerId: string, p = 1) => {
    setStLoad(true);
    try {
      const res = await authFetch(`/api/v1/admin/stations?page=${p}&per_page=10`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PagedResult<StationRow> = await res.json();
      data.items = data.items.filter((s: StationRow) => s.owner_id === ownerId);
      setStations(data);
    } catch { setStations(null); }
    finally { setStLoad(false); }
  }, []);

  const openDetail = (u: UserRow) => { setDetail(u); setStations(null); loadStations(u.id, 1); };

  const tH: React.CSSProperties = { padding: "10px 18px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: th.sub, textAlign: "left", borderBottom: `1px solid ${th.border}`, background: th.raised, whiteSpace: "nowrap" };
  const tD: React.CSSProperties = { padding: "12px 18px", fontSize: 13, color: th.text, borderBottom: `1px solid ${th.border}`, verticalAlign: "middle" };

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: C.sans }}>
      <style>{`@keyframes modal-in{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>

      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${th.border}`, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Building2 size={18} color={C.amber} strokeWidth={2} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: th.text, letterSpacing: "-0.02em" }}>Station Owners</h1>
        </div>
        <p style={{ fontSize: 12, color: th.sub }}>{loading ? "Loading…" : `${owners.length} registered station owners`}</p>
      </div>

      {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div className="admin-table-wrap" style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Name & Phone", "Email", "Status", "Joined", ""].map(h => <th key={h} style={tH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ ...tD, textAlign: "center", padding: "48px", color: th.sub }}>Loading owners…</td></tr>}
            {!loading && owners.length === 0 && (
              <tr><td colSpan={5} style={{ ...tD, textAlign: "center", padding: "60px" }}>
                <Building2 size={28} color={th.muted} style={{ marginBottom: 12 }} />
                <div style={{ color: th.sub, fontSize: 14 }}>No station owners yet</div>
              </td></tr>
            )}
            {owners.map(u => (
              <tr key={u.id}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = th.raised; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                style={{ transition: "background 0.1s" }}>
                <td style={tD}>
                  <div style={{ fontWeight: 600 }}>{u.full_name ?? <span style={{ color: th.sub }}>No name</span>}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 11, color: th.sub, marginTop: 2 }}>{u.phone}</div>
                </td>
                <td style={{ ...tD, fontSize: 12, color: th.sub }}>{u.email ?? "—"}</td>
                <td style={tD}>
                  <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: u.status === "ACTIVE" ? `${C.green}15` : `${C.red}12`, border: `1px solid ${u.status === "ACTIVE" ? C.green + "35" : C.red + "30"}`, color: u.status === "ACTIVE" ? C.green : C.red }}>
                    {u.status}
                  </span>
                </td>
                <td style={{ ...tD, fontSize: 12, color: th.sub }}>{fmtDate(u.created_at)}</td>
                <td style={tD}>
                  <button onClick={() => openDetail(u)}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", border: `1px solid ${th.border}`, color: th.sub, fontFamily: C.sans }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = th.borderHi; e.currentTarget.style.color = th.text; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = th.border; e.currentTarget.style.color = th.sub; }}>
                    View Stations <ArrowUpRight size={10} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 18, width: "min(560px, calc(100vw - 32px))", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 28px 80px rgba(0,0,0,0.25)", animation: "modal-in 0.15s ease", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${th.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <Building2 size={15} color={C.amber} />
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: th.text }}>{detail.full_name ?? "Station Owner"}</h2>
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 11, color: th.sub }}>{detail.phone}</div>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", color: th.sub, cursor: "pointer", padding: 4 }}><X size={16} /></button>
            </div>

            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${th.border}` }}>
              {[
                { label: "ID",     val: detail.id },
                { label: "Email",  val: detail.email ?? "—" },
                { label: "Status", val: detail.status },
                { label: "Joined", val: fmtDate(detail.created_at) },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${th.border}` }}>
                  <span style={{ fontSize: 12, color: th.sub }}>{row.label}</span>
                  <span style={{ fontSize: 12, color: th.text, fontFamily: C.mono, textAlign: "right" }}>{row.val}</span>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: th.sub, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Their Stations</div>
              {stLoad && <div style={{ textAlign: "center", padding: "24px", color: th.sub, fontSize: 13 }}>Loading…</div>}
              {!stLoad && stations?.items.length === 0 && <div style={{ textAlign: "center", padding: "24px", color: th.sub, fontSize: 13 }}>No stations found for this owner.</div>}
              {stations?.items.map(s => {
                const color = STATUS_COLOR[s.status] ?? th.sub;
                return (
                  <div key={s.id} style={{ padding: "12px 0", borderBottom: `1px solid ${th.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{s.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: th.sub, marginTop: 3 }}>
                        <MapPin size={10} />{s.city ?? "—"}{s.state ? `, ${s.state}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: `${color}14`, border: `1px solid ${color}35`, color }}>{s.status.replace("_", " ")}</span>
                      {s.rating_avg > 0 && <div style={{ fontSize: 10, color: th.sub, marginTop: 4 }}>★ {s.rating_avg.toFixed(1)} ({s.rating_count})</div>}
                    </div>
                  </div>
                );
              })}
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
