"use client";
import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Clock, BookOpen, Ban, RotateCcw, User, MapPin, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { authFetch, fmtDateTime, fmtRupee } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getAdminTheme, Card, DataTable, Column, StatusBadge, Button, PageHeader,
  useToast, Drawer, DrawerRow, useAdminData,
} from "@/components/admin";

interface Booking {
  id: string; user_id: string; station_id: string; charger_id: string; slot_id: string;
  status: string; amount: number; hold_expires_at: string | null; created_at: string;
  slot_start: string; slot_end: string;
}
interface PagedResult { items: Booking[]; total: number; page: number; per_page: number; pages: number; }

const TABS = ["ALL", "PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"] as const;
const CANCELLABLE = new Set(["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"]);
const REFUNDABLE  = new Set(["CONFIRMED", "CHECKED_IN"]);

function BookingsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { isLight } = useTheme();
  const th = getAdminTheme(isLight);
  const toast = useToast();
  const { userById, stationById, chargerById } = useAdminData();

  const [data,     setData]     = useState<PagedResult | null>(null);
  const [page,     setPage]     = useState(1);
  const [status,   setStatus]   = useState<typeof TABS[number]>("ALL");
  const [loading,  setLoading]  = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [acting,   setActing]   = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(params.get("focus"));

  useEffect(() => { if (params.get("focus")) setDrawerId(params.get("focus")); }, [params]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const q = status !== "ALL" ? `&status=${status}` : "";
      const res = await authFetch(`/api/v1/admin/bookings?page=${p}&per_page=20${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch { /* handled via empty state */ }
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
      toast.show("success", `Expired ${json.expired_count ?? 0} stale holds.`);
      load(page);
    } catch (e: unknown) { toast.show("error", e instanceof Error ? e.message : "Sweep failed"); }
    finally { setSweeping(false); }
  };

  const doAction = async (id: string, action: "cancel" | "refund") => {
    setActing(id + action);
    try {
      const res = await authFetch(`/api/v1/admin/bookings/${id}/${action}`, { method: "POST" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.detail ?? `HTTP ${res.status}`); }
      toast.show(action === "cancel" ? "info" : "success", action === "cancel" ? "Booking cancelled." : "Refund initiated.");
      load(page);
    } catch (e: unknown) { toast.show("error", e instanceof Error ? e.message : "Action failed"); }
    finally { setActing(null); }
  };

  const drawerBooking = drawerId ? (data?.items.find(b => b.id === drawerId) ?? null) : null;
  const drawerUser = drawerBooking ? userById.get(drawerBooking.user_id) : null;
  const drawerStation = drawerBooking ? stationById.get(drawerBooking.station_id) : null;
  const drawerCharger = drawerBooking ? chargerById.get(drawerBooking.charger_id) : null;

  const columns: Column<Booking>[] = [
    { key: "id", header: "Booking", render: b => <span style={{ fontFamily: th.mono, fontSize: 11.5 }}>{b.id.slice(0, 13)}…</span> },
    { key: "user", header: "User", render: b => {
      const u = userById.get(b.user_id);
      return u ? (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: th.text }}>{u.full_name ?? u.phone}</div>
          <div style={{ fontSize: 11, color: th.textSub, marginTop: 1 }}>{u.phone}</div>
        </div>
      ) : <span style={{ color: th.textMuted, fontSize: 12 }}>—</span>;
    } },
    { key: "station", header: "Station / Charger", render: b => {
      const st = stationById.get(b.station_id);
      const ch = chargerById.get(b.charger_id);
      return (
        <div>
          <div style={{ fontSize: 12.5, color: th.text }}>{st?.name ?? "—"}</div>
          <div style={{ fontSize: 11, color: th.textSub, marginTop: 1 }}>{ch?.label ?? ""} {ch?.connector_type ? `· ${ch.connector_type}` : ""}</div>
        </div>
      );
    } },
    { key: "slot", header: "Slot", render: b => (
      <span style={{ fontSize: 12, color: th.textSub }}>{b.slot_start ? fmtDateTime(b.slot_start) : "—"}</span>
    ) },
    { key: "amount", header: "Amount", align: "right", render: b => <span style={{ fontFamily: th.mono, fontWeight: 700, color: th.success }}>{fmtRupee(b.amount)}</span> },
    { key: "status", header: "Status", render: b => <StatusBadge status={b.status} th={th} /> },
    { key: "actions", header: "", render: b => (
      <div style={{ display: "flex", gap: 5 }} onClick={e => e.stopPropagation()}>
        {CANCELLABLE.has(b.status) && (
          <Button th={th} size="sm" variant="danger" disabled={acting !== null} loading={acting === b.id + "cancel"} icon={<Ban size={11} />} onClick={() => doAction(b.id, "cancel")}>Cancel</Button>
        )}
        {REFUNDABLE.has(b.status) && (
          <Button th={th} size="sm" variant="secondary" disabled={acting !== null} loading={acting === b.id + "refund"} icon={<RotateCcw size={11} />} onClick={() => doAction(b.id, "refund")}>Refund</Button>
        )}
      </div>
    ) },
  ];

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: th.sans }}>
      <PageHeader th={th} title="Bookings"
        subtitle={data ? `${data.total.toLocaleString()} total` : "Loading…"}
        actions={<Button th={th} variant="secondary" icon={<Clock size={13} />} loading={sweeping} onClick={expireHolds}>Expire Stale Holds</Button>} />

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(s => (
          <button key={s} onClick={() => setStatus(s)} style={{
            padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: status === s ? 600 : 400,
            cursor: "pointer", fontFamily: th.sans,
            background: status === s ? th.accentDim : th.card,
            border: `1px solid ${status === s ? th.accentBorder : th.border}`,
            color: status === s ? th.accent : th.textSub,
          }}>{s === "ALL" ? "All" : s.replace(/_/g, " ")}</button>
        ))}
      </div>

      <Card th={th} padding={16}>
        <DataTable
          th={th} columns={columns} rows={data?.items ?? []} rowKey={b => b.id}
          searchPlaceholder="Search this page by user, station…"
          searchFn={(b, q) => {
            const u = userById.get(b.user_id); const st = stationById.get(b.station_id);
            return (u?.full_name ?? "").toLowerCase().includes(q) || (u?.phone ?? "").includes(q) || (st?.name ?? "").toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
          }}
          onRowClick={b => setDrawerId(b.id)}
          pageSize={100}
          emptyState={loading ? (
            <div style={{ textAlign: "center", padding: "48px", color: th.textSub }}>Loading…</div>
          ) : (
            <div style={{ textAlign: "center", padding: "48px", color: th.textSub }}>No bookings found.</div>
          )}
        />

        {data && data.pages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${th.border}` }}>
            <Button th={th} variant="secondary" size="sm" icon={<ChevronLeft size={13} />} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span style={{ fontSize: 12.5, color: th.textSub, padding: "0 8px" }}>Page {page} of {data.pages}</span>
            <Button th={th} variant="secondary" size="sm" icon={<ChevronRight size={13} />} disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </Card>

      <Drawer th={th} open={!!drawerBooking} onClose={() => setDrawerId(null)} title="Booking Detail" subtitle={drawerBooking?.id} icon={<BookOpen size={18} color={th.accent} />}>
        {drawerBooking && (
          <div>
            <div style={{ marginBottom: 16 }}><StatusBadge status={drawerBooking.status} th={th} /></div>
            <DrawerRow th={th} label="Amount" value={fmtRupee(drawerBooking.amount)} />
            <DrawerRow th={th} label="Slot" value={drawerBooking.slot_start ? `${fmtDateTime(drawerBooking.slot_start)} – ${new Date(drawerBooking.slot_end).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "—"} />
            <DrawerRow th={th} label="Created" value={fmtDateTime(drawerBooking.created_at)} />
            {drawerBooking.hold_expires_at && <DrawerRow th={th} label="Hold Expires" value={fmtDateTime(drawerBooking.hold_expires_at)} />}

            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {drawerUser && (
                <Button th={th} variant="secondary" icon={<User size={13} color={th.accent} />} fullWidth onClick={() => router.push(`/admin/users?focus=${drawerUser.id}`)}>
                  {drawerUser.full_name ?? drawerUser.phone}
                </Button>
              )}
              {drawerStation && (
                <Button th={th} variant="secondary" icon={<MapPin size={13} color={th.accent} />} fullWidth onClick={() => router.push(`/admin/stations?focus=${drawerStation.id}`)}>
                  {drawerStation.name}
                </Button>
              )}
              {drawerCharger && (
                <Button th={th} variant="secondary" icon={<Zap size={13} color={th.accent} />} fullWidth onClick={() => router.push(`/admin/chargers?focus=${drawerCharger.id}`)}>
                  {drawerCharger.label}
                </Button>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {CANCELLABLE.has(drawerBooking.status) && <Button th={th} variant="danger" icon={<Ban size={13} />} fullWidth onClick={() => doAction(drawerBooking.id, "cancel")}>Cancel Booking</Button>}
              {REFUNDABLE.has(drawerBooking.status) && <Button th={th} variant="secondary" icon={<RotateCcw size={13} />} fullWidth onClick={() => doAction(drawerBooking.id, "refund")}>Refund</Button>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default function AdminBookingsPage() {
  return <Suspense fallback={null}><BookingsContent /></Suspense>;
}
