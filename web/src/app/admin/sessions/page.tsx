"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, User, MapPin, PlugZap } from "lucide-react";
import { authFetch, fmtRupee, fmtDateTime } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getAdminTheme, Card, DataTable, Column, StatusBadge, PageHeader,
  Drawer, DrawerRow, Button, useAdminData,
} from "@/components/admin";

interface Booking {
  id: string; user_id: string; station_id: string; charger_id: string;
  status: string; amount: number; created_at: string; slot_start: string; slot_end: string;
}
interface PagedResult { items: Booking[]; total: number; page: number; per_page: number; pages: number; }

const SESSION_STATUSES = ["CHECKED_IN", "IN_PROGRESS"] as const;

export default function AdminSessionsPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const th = getAdminTheme(isLight);
  const { userById, stationById, chargerById } = useAdminData();

  const [data, setData] = useState<PagedResult | null>(null);
  const [status, setStatus] = useState<typeof SESSION_STATUSES[number]>("IN_PROGRESS");
  const [loading, setLoading] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/v1/admin/bookings?page=1&per_page=50&status=${status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch { /* handled via empty state */ }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 20000); // real polling refresh, not a fake ticker
    return () => clearInterval(t);
  }, [load]);

  const drawerBooking = drawerId ? (data?.items.find(b => b.id === drawerId) ?? null) : null;
  const drawerUser = drawerBooking ? userById.get(drawerBooking.user_id) : null;
  const drawerStation = drawerBooking ? stationById.get(drawerBooking.station_id) : null;
  const drawerCharger = drawerBooking ? chargerById.get(drawerBooking.charger_id) : null;

  const columns: Column<Booking>[] = [
    { key: "user", header: "User", render: b => {
      const u = userById.get(b.user_id);
      return u ? (
        <div><div style={{ fontSize: 12.5, fontWeight: 500, color: th.text }}>{u.full_name ?? u.phone}</div><div style={{ fontSize: 11, color: th.textSub }}>{u.phone}</div></div>
      ) : <span style={{ color: th.textMuted }}>—</span>;
    } },
    { key: "station", header: "Station / Charger", render: b => {
      const st = stationById.get(b.station_id); const ch = chargerById.get(b.charger_id);
      return <div><div style={{ fontSize: 12.5, color: th.text }}>{st?.name ?? "—"}</div><div style={{ fontSize: 11, color: th.textSub }}>{ch?.label ?? ""} {ch?.power_kw ? `· ${ch.power_kw}kW` : ""}</div></div>;
    } },
    { key: "status", header: "Status", render: b => (
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: th.info, animation: "pulse 1.5s ease-in-out infinite" }} />
        <StatusBadge status={b.status} th={th} dot={false} />
      </div>
    ) },
    { key: "amount", header: "Amount", align: "right", render: b => <span style={{ fontFamily: th.mono, fontWeight: 700, color: th.success }}>{fmtRupee(b.amount)}</span> },
    { key: "started", header: "Started", render: b => <span style={{ fontSize: 12, color: th.textSub }}>{fmtDateTime(b.slot_start ?? b.created_at)}</span> },
  ];

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: th.sans }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      <PageHeader th={th} title="Charging Sessions" subtitle="Live view of bookings currently in session — auto-refreshes every 20s" />

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {SESSION_STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: status === s ? 600 : 400,
            cursor: "pointer", fontFamily: th.sans,
            background: status === s ? th.accentDim : th.card,
            border: `1px solid ${status === s ? th.accentBorder : th.border}`,
            color: status === s ? th.accent : th.textSub,
          }}>{s.replace(/_/g, " ")}{data && status === s ? ` (${data.total})` : ""}</button>
        ))}
      </div>

      <Card th={th} padding={16}>
        <DataTable
          th={th} columns={columns} rows={data?.items ?? []} rowKey={b => b.id}
          searchPlaceholder="Search by user, station…"
          searchFn={(b, q) => {
            const u = userById.get(b.user_id); const st = stationById.get(b.station_id);
            return (u?.full_name ?? "").toLowerCase().includes(q) || (st?.name ?? "").toLowerCase().includes(q);
          }}
          onRowClick={b => setDrawerId(b.id)}
          pageSize={50}
          emptyState={
            <div style={{ textAlign: "center", padding: "60px" }}>
              <Zap size={28} color={th.textMuted} style={{ marginBottom: 12 }} />
              <div style={{ color: th.textSub, fontSize: 14 }}>{loading ? "Loading…" : "No active sessions right now"}</div>
            </div>
          }
        />
      </Card>

      <Drawer th={th} open={!!drawerBooking} onClose={() => setDrawerId(null)} title="Session Detail" subtitle={drawerBooking?.id} icon={<Zap size={18} color={th.accent} />}>
        {drawerBooking && (
          <div>
            <div style={{ marginBottom: 16 }}><StatusBadge status={drawerBooking.status} th={th} /></div>
            <DrawerRow th={th} label="Amount" value={fmtRupee(drawerBooking.amount)} />
            <DrawerRow th={th} label="Slot" value={drawerBooking.slot_start ? fmtDateTime(drawerBooking.slot_start) : "—"} />
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {drawerUser && <Button th={th} variant="secondary" icon={<User size={13} color={th.accent} />} fullWidth onClick={() => router.push(`/admin/users?focus=${drawerUser.id}`)}>{drawerUser.full_name ?? drawerUser.phone}</Button>}
              {drawerStation && <Button th={th} variant="secondary" icon={<MapPin size={13} color={th.accent} />} fullWidth onClick={() => router.push(`/admin/stations?focus=${drawerStation.id}`)}>{drawerStation.name}</Button>}
              {drawerCharger && <Button th={th} variant="secondary" icon={<PlugZap size={13} color={th.accent} />} fullWidth onClick={() => router.push(`/admin/chargers?focus=${drawerCharger.id}`)}>{drawerCharger.label}</Button>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
