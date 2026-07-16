"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Download, MapPin, Zap, IndianRupee } from "lucide-react";
import { authFetch, fmtDate, fmtRupee } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getAdminTheme, Card, DataTable, Column, StatusBadge, Button, PageHeader,
  Drawer, DrawerRow, DrawerLink, useAdminData, AdminUser,
} from "@/components/admin";

const PAID = new Set(["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"]);
interface AdminBooking { id: string; station_id: string; status: string; amount: number; created_at: string; }

function OwnersContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { isLight } = useTheme();
  const th = getAdminTheme(isLight);
  const { owners, stationsByOwner, chargersByStation, loading } = useAdminData();

  const [drawerId, setDrawerId] = useState<string | null>(params.get("focus"));
  const [revenue, setRevenue] = useState<Map<string, number> | null>(null);

  useEffect(() => { if (params.get("focus")) setDrawerId(params.get("focus")); }, [params]);

  // Owner revenue — sampled bookings joined to each owner's stations (no owner-scoped
  // endpoint exists, so this mirrors the dashboard's client-side join approach).
  useEffect(() => {
    Promise.all([
      authFetch("/api/v1/admin/bookings?page=1&per_page=100"),
      authFetch("/api/v1/admin/bookings?page=2&per_page=100"),
    ]).then(async ([r1, r2]) => {
      const b1 = r1.ok ? (await r1.json()).items as AdminBooking[] : [];
      const b2 = r2.ok ? (await r2.json()).items as AdminBooking[] : [];
      const bookings = [...b1, ...b2].filter(b => PAID.has(b.status));
      const stationOwner = new Map<string, string>();
      stationsByOwner.forEach((stList, ownerId) => stList.forEach(s => stationOwner.set(s.id, ownerId)));
      const rev = new Map<string, number>();
      bookings.forEach(b => {
        const ownerId = stationOwner.get(b.station_id);
        if (ownerId) rev.set(ownerId, (rev.get(ownerId) ?? 0) + b.amount);
      });
      setRevenue(rev);
    }).catch(() => setRevenue(new Map()));
  }, [stationsByOwner]);

  const drawerOwner = drawerId ? owners.find(o => o.id === drawerId) ?? null : null;
  const drawerStations = drawerOwner ? (stationsByOwner.get(drawerOwner.id) ?? []) : [];

  function exportCsv() {
    const header = ["Name", "Phone", "Email", "Stations", "Chargers", "Revenue", "Status", "Joined"];
    const rows = owners.map(o => {
      const stList = stationsByOwner.get(o.id) ?? [];
      const chCount = stList.reduce((sum, s) => sum + (chargersByStation.get(s.id)?.length ?? 0), 0);
      return [o.full_name ?? "", o.phone, o.email ?? "", String(stList.length), String(chCount), fmtRupee(revenue?.get(o.id) ?? 0), o.status, fmtDate(o.created_at)];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `owners-${Date.now()}.csv` }).click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<AdminUser>[] = [
    { key: "name", header: "Owner", sortValue: o => o.full_name ?? o.phone, render: o => (
      <div>
        <div style={{ fontWeight: 600, color: th.text }}>{o.full_name ?? <span style={{ color: th.textMuted }}>No name</span>}</div>
        <div style={{ fontFamily: th.mono, fontSize: 11, color: th.textSub, marginTop: 2 }}>{o.phone}</div>
      </div>
    ) },
    { key: "email", header: "Email", render: o => <span style={{ fontSize: 12, color: th.textSub }}>{o.email ?? "—"}</span> },
    { key: "stations", header: "Stations", sortValue: o => (stationsByOwner.get(o.id) ?? []).length, render: o => {
      const stList = stationsByOwner.get(o.id) ?? [];
      const active = stList.filter(s => s.status === "ACTIVE").length;
      return <span style={{ fontFamily: th.mono, fontSize: 12.5 }}>{active}/{stList.length}</span>;
    } },
    { key: "chargers", header: "Chargers", render: o => {
      const stList = stationsByOwner.get(o.id) ?? [];
      const chCount = stList.reduce((sum, s) => sum + (chargersByStation.get(s.id)?.length ?? 0), 0);
      return <span style={{ fontFamily: th.mono, fontSize: 12.5 }}>{chCount}</span>;
    } },
    { key: "revenue", header: "Revenue", sortValue: o => revenue?.get(o.id) ?? 0, render: o => (
      <span style={{ fontFamily: th.mono, fontSize: 12.5, fontWeight: 700, color: th.success }}>
        {revenue ? fmtRupee(revenue.get(o.id) ?? 0) : "…"}
      </span>
    ) },
    { key: "status", header: "Status", render: o => <StatusBadge status={o.status} th={th} /> },
    { key: "created", header: "Joined", sortValue: o => o.created_at, render: o => <span style={{ fontSize: 12, color: th.textSub }}>{fmtDate(o.created_at)}</span> },
  ];

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: th.sans }}>
      <PageHeader th={th} title="Station Owners"
        subtitle={loading ? "Loading…" : `${owners.length} registered station owners`}
        actions={<Button th={th} variant="secondary" icon={<Download size={13} />} onClick={exportCsv}>Export CSV</Button>} />

      <Card th={th} padding={16}>
        <DataTable
          th={th} columns={columns} rows={owners} rowKey={o => o.id}
          searchPlaceholder="Search owners by name, phone, email…"
          searchFn={(o, q) => (o.full_name ?? "").toLowerCase().includes(q) || o.phone.includes(q) || (o.email ?? "").toLowerCase().includes(q)}
          onRowClick={o => setDrawerId(o.id)}
          pageSize={12}
        />
      </Card>

      <Drawer
        th={th} open={!!drawerOwner} onClose={() => setDrawerId(null)}
        title={drawerOwner?.full_name ?? drawerOwner?.phone ?? ""} subtitle={drawerOwner?.phone}
        icon={<Building2 size={18} color={th.accent} />}
        tabs={[{ key: "overview", label: "Overview" }, { key: "stations", label: `Stations (${drawerStations.length})` }]}
        activeTab="overview"
      >
        {drawerOwner && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              <div style={{ background: th.raised, borderRadius: 12, padding: "12px 14px", border: `1px solid ${th.border}` }}>
                <div style={{ fontSize: 10, color: th.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Revenue</div>
                <div style={{ fontFamily: th.mono, fontSize: 17, fontWeight: 700, color: th.success }}>{revenue ? fmtRupee(revenue.get(drawerOwner.id) ?? 0) : "…"}</div>
              </div>
              <div style={{ background: th.raised, borderRadius: 12, padding: "12px 14px", border: `1px solid ${th.border}` }}>
                <div style={{ fontSize: 10, color: th.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Stations</div>
                <div style={{ fontFamily: th.mono, fontSize: 17, fontWeight: 700, color: th.text }}>{drawerStations.length}</div>
              </div>
            </div>
            <DrawerRow th={th} label="Email" value={drawerOwner.email ?? "—"} />
            <DrawerRow th={th} label="Status" value={drawerOwner.status} />
            <DrawerRow th={th} label="Referral Code" value={drawerOwner.referral_code} />
            <DrawerRow th={th} label="Joined" value={fmtDate(drawerOwner.created_at)} />

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: th.textMuted, marginBottom: 10 }}>Stations</div>
              {drawerStations.length === 0 && <div style={{ fontSize: 12, color: th.textMuted }}>No stations yet.</div>}
              {drawerStations.map(s => (
                <DrawerLink key={s.id} th={th} icon={<MapPin size={14} color={th.accent} />} label={s.name}
                  sub={`${s.city ?? "—"} · ${(chargersByStation.get(s.id) ?? []).length} chargers · ${s.status}`}
                  onClick={() => router.push(`/admin/stations?focus=${s.id}`)} />
              ))}
            </div>

            <Button th={th} variant="secondary" icon={<Zap size={13} />} fullWidth style={{ marginTop: 8 }} onClick={() => router.push("/admin/bookings")}>View All Bookings</Button>
            <Button th={th} variant="secondary" icon={<IndianRupee size={13} />} fullWidth style={{ marginTop: 8 }} onClick={() => router.push("/admin/revenue")}>View Revenue Detail</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default function AdminOwnersPage() {
  return <Suspense fallback={null}><OwnersContent /></Suspense>;
}
