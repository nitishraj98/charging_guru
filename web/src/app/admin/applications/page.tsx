"use client";
import { useCallback, useEffect, useState } from "react";
import { Building2, CheckCircle, XCircle, MapPin, User } from "lucide-react";
import { getTheme, getToken, fmtDate, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OwnerApp {
  id: string;
  user_id: string;
  business_name: string;
  gst_number: string | null;
  city: string;
  address: string;
  planned_stations: number;
  message: string | null;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface StationRow {
  id: string; name: string; address: string; city: string | null;
  state: string | null; status: string; owner_id: string;
  created_at: string;
}

interface Paged<T> { items: T[]; total: number; page: number; per_page: number; pages: number; }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminApplicationsPage() {
  const { isLight } = useTheme();
  const th = getTheme(isLight);

  const [tab, setTab] = useState<"owner" | "station">("owner");

  // owner applications state
  const [ownerData, setOwnerData] = useState<Paged<OwnerApp> | null>(null);
  const [ownerPage, setOwnerPage] = useState(1);

  // station applications state
  const [stationData, setStationData] = useState<Paged<StationRow> | null>(null);
  const [stationPage, setStationPage] = useState(1);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [acting,   setActing]   = useState<string | null>(null);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectType, setRejectType] = useState<"owner" | "station">("owner");
  const [reason,   setReason]   = useState("");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadOwner = useCallback(async (p = 1) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/v1/admin/owner-applications?status=PENDING&page=${p}&per_page=15`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOwnerData(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, []);

  const loadStation = useCallback(async (p = 1) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/v1/admin/stations?status=PENDING_APPROVAL&page=${p}&per_page=15`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStationData(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab === "owner") loadOwner(ownerPage); }, [tab, ownerPage, loadOwner]);
  useEffect(() => { if (tab === "station") loadStation(stationPage); }, [tab, stationPage, loadStation]);

  // ── Owner application actions ──────────────────────────────────────────────

  const approveOwner = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/v1/admin/owner-applications/${id}/approve`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("Application approved — user now has station owner access.");
      loadOwner(ownerPage);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", false); }
    finally { setActing(null); }
  };

  const rejectOwner = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/v1/admin/owner-applications/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note: reason.trim() || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("Application rejected.", false);
      setRejectId(null); setReason("");
      loadOwner(ownerPage);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", false); }
    finally { setActing(null); }
  };

  // ── Station approval actions ───────────────────────────────────────────────

  const approveStation = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/v1/admin/stations/${id}/approve`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("Station approved and now live.");
      loadStation(stationPage);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", false); }
    finally { setActing(null); }
  };

  const rejectStation = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/v1/admin/stations/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("Station rejected.", false);
      setRejectId(null); setReason("");
      loadStation(stationPage);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", false); }
    finally { setActing(null); }
  };

  // ── Shared styles ──────────────────────────────────────────────────────────

  const tH: React.CSSProperties = {
    padding: "10px 18px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
    textTransform: "uppercase", color: th.sub, textAlign: "left",
    borderBottom: `1px solid ${th.border}`, background: th.raised, whiteSpace: "nowrap",
  };
  const tD: React.CSSProperties = {
    padding: "14px 18px", fontSize: 13, color: th.text,
    borderBottom: `1px solid ${th.border}`, verticalAlign: "middle",
  };

  const ownerTotal   = ownerData?.total ?? 0;
  const stationTotal = stationData?.total ?? 0;

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: C.sans, position: "relative" }}>
      <style>{`@keyframes modal-in{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 18px", borderRadius: 10, background: th.card, border: `1px solid ${toast.ok ? C.green + "50" : C.red + "50"}`, color: toast.ok ? C.green : C.red, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${th.border}`, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Building2 size={18} color={C.amber} strokeWidth={2} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: th.text, letterSpacing: "-0.02em" }}>Applications</h1>
        </div>
        <p style={{ fontSize: 12, color: th.sub }}>Review partner and station applications before they go live.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {([
          { key: "owner",   label: "Partner Applications", icon: <User size={13} />,     count: ownerTotal   },
          { key: "station", label: "Station Approvals",    icon: <MapPin size={13} />,   count: stationTotal },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: C.sans, transition: "all .12s",
            background: tab === t.key ? `${C.green}15` : th.card,
            border: `1px solid ${tab === t.key ? C.green + "50" : th.border}`,
            color: tab === t.key ? C.green : th.sub,
          }}>
            {t.icon}{t.label}
            {t.count > 0 && (
              <span style={{ background: tab === t.key ? C.green : C.amber, color: "#050708", borderRadius: 999, fontSize: 10, fontWeight: 800, padding: "1px 6px", marginLeft: 2 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* ── Owner applications tab ── */}
      {tab === "owner" && (
        <>
          {!loading && ownerData?.items.length === 0 ? (
            <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "60px", textAlign: "center" }}>
              <CheckCircle size={36} color={C.green} style={{ marginBottom: 14 }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: th.text, marginBottom: 6 }}>All clear!</div>
              <div style={{ fontSize: 13, color: th.sub }}>No pending partner applications.</div>
            </div>
          ) : (
            <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Business", "Location", "Planned Stations", "Message", "Submitted", "Actions"].map(h => <th key={h} style={tH}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {loading && !ownerData && <tr><td colSpan={6} style={{ ...tD, textAlign: "center", padding: "48px", color: th.sub }}>Loading…</td></tr>}
                  {ownerData?.items.map(app => {
                    const busy = acting === app.id;
                    return (
                      <tr key={app.id}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = th.raised; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                        style={{ transition: "background 0.1s" }}>
                        <td style={tD}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{app.business_name}</div>
                          {app.gst_number && <div style={{ fontFamily: C.mono, fontSize: 10, color: th.sub, marginTop: 2 }}>GST: {app.gst_number}</div>}
                        </td>
                        <td style={tD}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: th.sub, fontSize: 12 }}>
                            <MapPin size={11} />{app.city}
                          </div>
                          <div style={{ fontSize: 11, color: th.sub, marginTop: 3, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.address}</div>
                        </td>
                        <td style={{ ...tD, textAlign: "center" }}>
                          <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: th.text }}>{app.planned_stations}</span>
                        </td>
                        <td style={{ ...tD, fontSize: 12, color: th.sub, maxWidth: 200 }}>
                          {app.message
                            ? <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{app.message}</span>
                            : <span style={{ color: th.muted }}>—</span>}
                        </td>
                        <td style={{ ...tD, fontSize: 12, color: th.sub, whiteSpace: "nowrap" }}>{fmtDate(app.created_at)}</td>
                        <td style={tD}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button disabled={busy} onClick={() => approveOwner(app.id)}
                              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer", background: `${C.green}15`, border: `1px solid ${C.green}45`, color: C.green, fontFamily: C.sans, opacity: busy ? 0.5 : 1 }}>
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button disabled={busy} onClick={() => { setRejectId(app.id); setRejectType("owner"); setReason(""); }}
                              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer", background: `${C.red}10`, border: `1px solid ${C.red}35`, color: C.red, fontFamily: C.sans, opacity: busy ? 0.5 : 1 }}>
                              <XCircle size={12} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {ownerData && ownerData.pages > 1 && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20 }}>
              <button disabled={ownerPage === 1} onClick={() => setOwnerPage(p => p - 1)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: ownerPage > 1 ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: ownerPage > 1 ? th.text : th.sub, fontFamily: C.sans }}>← Prev</button>
              <span style={{ padding: "7px 12px", fontSize: 12, color: th.sub }}>{ownerPage} / {ownerData.pages}</span>
              <button disabled={ownerPage === ownerData.pages} onClick={() => setOwnerPage(p => p + 1)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: ownerPage < ownerData.pages ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: ownerPage < ownerData.pages ? th.text : th.sub, fontFamily: C.sans }}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* ── Station approvals tab ── */}
      {tab === "station" && (
        <>
          {!loading && stationData?.items.length === 0 ? (
            <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "60px", textAlign: "center" }}>
              <CheckCircle size={36} color={C.green} style={{ marginBottom: 14 }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: th.text, marginBottom: 6 }}>All clear!</div>
              <div style={{ fontSize: 13, color: th.sub }}>No pending station approvals.</div>
            </div>
          ) : (
            <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Station", "Location", "Owner", "Submitted", "Actions"].map(h => <th key={h} style={tH}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {loading && !stationData && <tr><td colSpan={5} style={{ ...tD, textAlign: "center", padding: "48px", color: th.sub }}>Loading…</td></tr>}
                  {stationData?.items.map(s => {
                    const busy = acting === s.id;
                    return (
                      <tr key={s.id}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = th.raised; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                        style={{ transition: "background 0.1s" }}>
                        <td style={tD}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                          <div style={{ fontFamily: C.mono, fontSize: 10, color: th.sub, marginTop: 2 }}>{s.id.slice(0, 12)}…</div>
                        </td>
                        <td style={tD}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: th.sub, fontSize: 12 }}>
                            <MapPin size={11} />{s.city ?? "—"}{s.state ? `, ${s.state}` : ""}
                          </div>
                          <div style={{ fontSize: 11, color: th.sub, marginTop: 3, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.address}</div>
                        </td>
                        <td style={{ ...tD, fontFamily: C.mono, fontSize: 11, color: th.sub }}>{s.owner_id.slice(0, 14)}…</td>
                        <td style={{ ...tD, fontSize: 12, color: th.sub }}>{fmtDate(s.created_at)}</td>
                        <td style={tD}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button disabled={busy} onClick={() => approveStation(s.id)}
                              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer", background: `${C.green}15`, border: `1px solid ${C.green}45`, color: C.green, fontFamily: C.sans, opacity: busy ? 0.5 : 1 }}>
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button disabled={busy} onClick={() => { setRejectId(s.id); setRejectType("station"); setReason(""); }}
                              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer", background: `${C.red}10`, border: `1px solid ${C.red}35`, color: C.red, fontFamily: C.sans, opacity: busy ? 0.5 : 1 }}>
                              <XCircle size={12} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {stationData && stationData.pages > 1 && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20 }}>
              <button disabled={stationPage === 1} onClick={() => setStationPage(p => p - 1)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: stationPage > 1 ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: stationPage > 1 ? th.text : th.sub, fontFamily: C.sans }}>← Prev</button>
              <span style={{ padding: "7px 12px", fontSize: 12, color: th.sub }}>{stationPage} / {stationData.pages}</span>
              <button disabled={stationPage === stationData.pages} onClick={() => setStationPage(p => p + 1)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: stationPage < stationData.pages ? "pointer" : "default", background: th.card, border: `1px solid ${th.border}`, color: stationPage < stationData.pages ? th.text : th.sub, fontFamily: C.sans }}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div onClick={() => setRejectId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: "26px", width: 400, animation: "modal-in 0.15s ease", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: th.text, marginBottom: 6 }}>
              {rejectType === "owner" ? "Reject Partner Application" : "Reject Station"}
            </h3>
            <p style={{ fontSize: 12, color: th.sub, marginBottom: 16 }}>Provide a reason (optional — shown to the applicant).</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder={rejectType === "owner" ? "E.g. Insufficient information provided…" : "E.g. Incomplete documentation, invalid location…"}
              style={{ width: "100%", background: th.inputBg, border: `1px solid ${th.border}`, borderRadius: 9, padding: "10px 14px", color: th.text, fontSize: 13, outline: "none", fontFamily: C.sans, resize: "vertical", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setRejectId(null)} style={{ flex: 1, padding: "10px", borderRadius: 9, background: th.raised, border: `1px solid ${th.border}`, color: th.sub, fontSize: 13, cursor: "pointer", fontFamily: C.sans }}>Cancel</button>
              <button onClick={() => rejectType === "owner" ? rejectOwner(rejectId) : rejectStation(rejectId)}
                style={{ flex: 1, padding: "10px", borderRadius: 9, background: `${C.red}14`, border: `1px solid ${C.red}40`, color: C.red, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: C.sans }}>
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
