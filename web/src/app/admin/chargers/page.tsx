"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlugZap, Download, MapPin, Building2, Zap } from "lucide-react";
import { fmtDate, fmtDateTime } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getAdminTheme, Card, DataTable, Column, StatusBadge, Button, PageHeader,
  Drawer, DrawerRow, useAdminData, AdminCharger,
} from "@/components/admin";

const TABS = ["ALL", "AVAILABLE", "OCCUPIED", "BOOKED", "OFFLINE", "MAINTENANCE"] as const;

function ChargersContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { isLight } = useTheme();
  const th = getAdminTheme(isLight);
  const { chargers, stationById, userById, loading } = useAdminData();

  const [tab, setTab] = useState<typeof TABS[number]>("ALL");
  const [drawerId, setDrawerId] = useState<string | null>(params.get("focus"));

  useEffect(() => { if (params.get("focus")) setDrawerId(params.get("focus")); }, [params]);

  const filtered = useMemo(() => tab === "ALL" ? chargers : chargers.filter(c => c.status === tab), [chargers, tab]);
  const drawerCharger = drawerId ? chargers.find(c => c.id === drawerId) ?? null : null;
  const drawerStation = drawerCharger ? stationById.get(drawerCharger.station_id) : null;
  const drawerOwner = drawerStation ? userById.get(drawerStation.owner_id) : null;

  function exportCsv() {
    const header = ["Label", "Station", "Owner", "Type", "Connector", "Power (kW)", "Price/kWh", "Status", "Created"];
    const rows = filtered.map(c => {
      const st = stationById.get(c.station_id);
      const owner = st ? userById.get(st.owner_id) : undefined;
      return [c.label, st?.name ?? "", owner?.full_name ?? "", c.charger_type, c.connector_type, String(c.power_kw), (c.price_per_kwh / 100).toFixed(2), c.status, fmtDate(c.created_at)];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `chargers-${Date.now()}.csv` }).click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<AdminCharger>[] = [
    { key: "label", header: "Charger", sortValue: c => c.label, render: c => (
      <div>
        <div style={{ fontWeight: 600, color: th.text }}>{c.label}</div>
        <div style={{ fontFamily: th.mono, fontSize: 10.5, color: th.textMuted, marginTop: 2 }}>{c.id.slice(0, 8)}…</div>
      </div>
    ) },
    { key: "station", header: "Station / Owner", render: c => {
      const st = stationById.get(c.station_id);
      const owner = st ? userById.get(st.owner_id) : undefined;
      return (
        <div>
          <div style={{ fontSize: 12.5, color: th.text, fontWeight: 500 }}>{st?.name ?? "—"}</div>
          <div style={{ fontSize: 11, color: th.textSub, marginTop: 1 }}>{owner?.full_name ?? owner?.phone ?? "—"}</div>
        </div>
      );
    } },
    { key: "type", header: "Type", render: c => <span style={{ fontFamily: th.mono, fontSize: 12, color: th.textSub }}>{c.charger_type}</span> },
    { key: "connector", header: "Connector", render: c => <span style={{ fontFamily: th.mono, fontSize: 12 }}>{c.connector_type}</span> },
    { key: "power", header: "Power", sortValue: c => c.power_kw, render: c => <span style={{ fontFamily: th.mono, fontSize: 12, color: th.info }}>{c.power_kw} kW</span> },
    { key: "price", header: "Price/kWh", sortValue: c => c.price_per_kwh, render: c => <span style={{ fontFamily: th.mono, fontSize: 12, color: th.textSub }}>₹{(c.price_per_kwh / 100).toFixed(0)}</span> },
    { key: "status", header: "Status", render: c => <StatusBadge status={c.status} th={th} /> },
    { key: "created", header: "Added", sortValue: c => c.created_at, render: c => <span style={{ fontSize: 12, color: th.textSub }}>{fmtDate(c.created_at)}</span> },
  ];

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: th.sans }}>
      <PageHeader th={th} title="Chargers"
        subtitle={loading ? "Loading…" : `${chargers.length.toLocaleString()} total across all stations`}
        actions={<Button th={th} variant="secondary" icon={<Download size={13} />} onClick={exportCsv}>Export CSV</Button>} />

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(s => (
          <button key={s} onClick={() => setTab(s)} style={{
            padding: "5px 14px", borderRadius: 8, fontSize: 11, fontWeight: tab === s ? 600 : 400,
            cursor: "pointer", fontFamily: th.sans,
            background: tab === s ? th.accentDim : th.card,
            border: `1px solid ${tab === s ? th.accentBorder : th.border}`,
            color: tab === s ? th.accent : th.textSub,
          }}>{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}</button>
        ))}
      </div>

      <Card th={th} padding={16}>
        <DataTable
          th={th} columns={columns} rows={filtered} rowKey={c => c.id}
          searchPlaceholder="Search chargers, stations…"
          searchFn={(c, q) => {
            const st = stationById.get(c.station_id);
            return c.label.toLowerCase().includes(q) || (st?.name ?? "").toLowerCase().includes(q);
          }}
          onRowClick={c => setDrawerId(c.id)}
          pageSize={14}
        />
      </Card>

      <Drawer
        th={th} open={!!drawerCharger} onClose={() => setDrawerId(null)}
        title={drawerCharger?.label ?? ""} subtitle={drawerCharger?.id}
        icon={<PlugZap size={18} color={th.accent} />}
      >
        {drawerCharger && (
          <div>
            <div style={{ marginBottom: 16 }}><StatusBadge status={drawerCharger.status} th={th} /></div>
            <DrawerRow th={th} label="Type" value={drawerCharger.charger_type} />
            <DrawerRow th={th} label="Connector" value={drawerCharger.connector_type} />
            <DrawerRow th={th} label="Power" value={`${drawerCharger.power_kw} kW`} />
            <DrawerRow th={th} label="Price" value={`₹${(drawerCharger.price_per_kwh / 100).toFixed(2)}/kWh`} />
            <DrawerRow th={th} label="Added" value={fmtDateTime(drawerCharger.created_at)} />

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: th.textMuted, marginBottom: 10 }}>Location</div>
              {drawerStation ? (
                <Button th={th} variant="secondary" icon={<MapPin size={13} color={th.accent} />} fullWidth onClick={() => router.push(`/admin/stations?focus=${drawerStation.id}`)}>
                  {drawerStation.name}
                </Button>
              ) : <span style={{ fontSize: 12, color: th.textMuted }}>Station not found</span>}
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: th.textMuted, marginBottom: 10 }}>Owner</div>
              {drawerOwner ? (
                <Button th={th} variant="secondary" icon={<Building2 size={13} color={th.accent} />} fullWidth onClick={() => router.push(`/admin/owners?focus=${drawerOwner.id}`)}>
                  {drawerOwner.full_name ?? drawerOwner.phone}
                </Button>
              ) : <span style={{ fontSize: 12, color: th.textMuted }}>Owner not found</span>}
            </div>

            <Button th={th} variant="secondary" icon={<Zap size={13} />} fullWidth style={{ marginTop: 12 }} onClick={() => router.push("/admin/sessions")}>View Sessions</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default function AdminChargersPage() {
  return <Suspense fallback={null}><ChargersContent /></Suspense>;
}
