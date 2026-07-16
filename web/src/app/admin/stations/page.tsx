"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin, Download, Zap, Building2, BookOpen, Star, Navigation, Check, X as XIcon,
} from "lucide-react";
import { authFetch, fmtDate, fmtDateTime } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getAdminTheme, Card, DataTable, Column, StatusBadge, Button, PageHeader,
  useToast, Drawer, DrawerRow, DrawerLink, useAdminData, AdminStation,
} from "@/components/admin";

const TABS = ["ALL", "ACTIVE", "PENDING_APPROVAL", "SUSPENDED", "REJECTED"] as const;

function StationsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { isLight } = useTheme();
  const th = getAdminTheme(isLight);
  const toast = useToast();
  const { stations, userById, chargersByStation, loading, refresh } = useAdminData();

  const [tab, setTab] = useState<typeof TABS[number]>((params.get("status") as typeof TABS[number]) ?? "ALL");
  const [acting, setActing] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(params.get("focus"));
  const [drawerTab, setDrawerTab] = useState("overview");

  useEffect(() => { if (params.get("focus")) setDrawerId(params.get("focus")); }, [params]);

  const filtered = useMemo(() => tab === "ALL" ? stations : stations.filter(s => s.status === tab), [stations, tab]);
  const drawerStation = drawerId ? stations.find(s => s.id === drawerId) ?? null : null;

  async function doAction(id: string, action: "approve" | "reject" | "SUSPENDED" | "ACTIVE") {
    setActing(id);
    try {
      let res: Response;
      if (action === "approve") res = await authFetch(`/api/v1/admin/stations/${id}/approve`, { method: "POST" });
      else if (action === "reject") res = await authFetch(`/api/v1/admin/stations/${id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Does not meet platform guidelines." }) });
      else res = await authFetch(`/api/v1/admin/stations/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: action }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.show("success", `Station ${action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "SUSPENDED" ? "suspended" : "reactivated"}.`);
      refresh();
    } catch (e: unknown) {
      toast.show("error", e instanceof Error ? e.message : "Action failed");
    } finally { setActing(null); }
  }

  function exportCsv() {
    const header = ["Name", "Owner", "Owner Phone", "City", "State", "Chargers", "Status", "Rating", "Created"];
    const rows = filtered.map(s => {
      const owner = userById.get(s.owner_id);
      const chargers = chargersByStation.get(s.id) ?? [];
      return [s.name, owner?.full_name ?? "", owner?.phone ?? "", s.city ?? "", s.state ?? "", String(chargers.length), s.status, s.rating_avg.toFixed(1), fmtDate(s.created_at)];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `stations-${Date.now()}.csv` }).click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<AdminStation>[] = [
    { key: "name", header: "Station", sortValue: s => s.name, render: s => (
      <div>
        <div style={{ fontWeight: 600, color: th.text }}>{s.name}</div>
        <div style={{ fontFamily: th.mono, fontSize: 10.5, color: th.textMuted, marginTop: 2 }}>{s.id.slice(0, 8)}…</div>
      </div>
    ) },
    { key: "owner", header: "Owner", render: s => {
      const owner = userById.get(s.owner_id);
      return owner ? (
        <div>
          <div style={{ fontSize: 12.5, color: th.text, fontWeight: 500 }}>{owner.full_name ?? owner.phone}</div>
          <div style={{ fontSize: 11, color: th.textSub, marginTop: 1 }}>{owner.phone}{owner.email ? ` · ${owner.email}` : ""}</div>
        </div>
      ) : <span style={{ color: th.textMuted, fontSize: 12 }}>—</span>;
    } },
    { key: "location", header: "Location", render: s => (
      <div>
        <div style={{ fontSize: 12.5 }}>{s.city ?? "—"}{s.state ? `, ${s.state}` : ""}</div>
        <div style={{ fontSize: 11, color: th.textSub, marginTop: 1, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.address}</div>
      </div>
    ) },
    { key: "chargers", header: "Chargers", render: s => {
      const list = chargersByStation.get(s.id) ?? [];
      const avail = list.filter(c => c.status === "AVAILABLE").length;
      return <span style={{ fontFamily: th.mono, fontSize: 12.5, color: avail > 0 ? th.success : th.textSub }}>{avail}/{list.length}</span>;
    } },
    { key: "status", header: "Status", render: s => <StatusBadge status={s.status} th={th} /> },
    { key: "rating", header: "Rating", render: s => s.rating_avg > 0 ? (
      <span style={{ fontFamily: th.mono, fontSize: 12, display: "flex", alignItems: "center", gap: 3 }}><Star size={11} fill={th.warn} color={th.warn} />{s.rating_avg.toFixed(1)} ({s.rating_count})</span>
    ) : <span style={{ color: th.textMuted }}>—</span> },
    { key: "created", header: "Created", sortValue: s => s.created_at, render: s => <span style={{ fontSize: 12, color: th.textSub }}>{fmtDate(s.created_at)}</span> },
    { key: "actions", header: "", render: s => {
      const busy = acting === s.id;
      return (
        <div style={{ display: "flex", gap: 5 }} onClick={e => e.stopPropagation()}>
          {s.status === "PENDING_APPROVAL" && (<>
            <Button th={th} size="sm" variant="primary" loading={busy} onClick={() => doAction(s.id, "approve")}>Approve</Button>
            <Button th={th} size="sm" variant="danger" disabled={busy} onClick={() => doAction(s.id, "reject")}>Reject</Button>
          </>)}
          {s.status === "ACTIVE" && <Button th={th} size="sm" variant="secondary" disabled={busy} onClick={() => doAction(s.id, "SUSPENDED")}>Suspend</Button>}
          {(s.status === "REJECTED" || s.status === "SUSPENDED") && <Button th={th} size="sm" variant="primary" loading={busy} onClick={() => doAction(s.id, "ACTIVE")}>Reactivate</Button>}
        </div>
      );
    } },
  ];

  const pendingCount = stations.filter(s => s.status === "PENDING_APPROVAL").length;
  const owner = drawerStation ? userById.get(drawerStation.owner_id) : null;
  const drawerChargers = drawerStation ? (chargersByStation.get(drawerStation.id) ?? []) : [];

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: th.sans }}>
      <PageHeader th={th} title="Stations"
        subtitle={loading ? "Loading…" : `${stations.length.toLocaleString()} total`}
        actions={<Button th={th} variant="secondary" icon={<Download size={13} />} onClick={exportCsv}>Export CSV</Button>} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TABS.map(s => (
            <button key={s} onClick={() => setTab(s)} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: tab === s ? 600 : 400,
              cursor: "pointer", fontFamily: th.sans,
              background: tab === s ? th.accentDim : th.card,
              border: `1px solid ${tab === s ? th.accentBorder : th.border}`,
              color: tab === s ? th.accent : th.textSub,
            }}>{s === "ALL" ? "All" : s.replace(/_/g, " ")}</button>
          ))}
        </div>
        {pendingCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 9, background: th.warnDim, border: `1px solid ${th.warn}30`, fontSize: 12, color: th.warn, fontWeight: 600 }}>
            <MapPin size={13} /> {pendingCount} pending review
          </div>
        )}
      </div>

      <Card th={th} padding={16}>
        <DataTable
          th={th} columns={columns} rows={filtered} rowKey={s => s.id}
          searchPlaceholder="Search stations, owners, cities…"
          searchFn={(s, q) => {
            const owner = userById.get(s.owner_id);
            return s.name.toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q) || (owner?.full_name ?? "").toLowerCase().includes(q) || (owner?.phone ?? "").includes(q);
          }}
          onRowClick={s => { setDrawerId(s.id); setDrawerTab("overview"); }}
          pageSize={12}
        />
      </Card>

      <Drawer
        th={th} open={!!drawerStation} onClose={() => setDrawerId(null)}
        title={drawerStation?.name ?? ""} subtitle={drawerStation?.id}
        icon={<MapPin size={18} color={th.accent} />}
        tabs={[{ key: "overview", label: "Overview" }, { key: "chargers", label: `Chargers (${drawerChargers.length})` }, { key: "owner", label: "Owner" }]}
        activeTab={drawerTab} onTabChange={setDrawerTab}
      >
        {drawerStation && drawerTab === "overview" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <StatusBadge status={drawerStation.status} th={th} />
              {drawerStation.rating_avg > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: th.textSub }}>
                  <Star size={12} fill={th.warn} color={th.warn} />{drawerStation.rating_avg.toFixed(1)} ({drawerStation.rating_count})
                </span>
              )}
            </div>
            <DrawerRow th={th} label="Address" value={drawerStation.address} />
            <DrawerRow th={th} label="City" value={drawerStation.city ?? "—"} />
            <DrawerRow th={th} label="State" value={drawerStation.state ?? "—"} />
            <DrawerRow th={th} label="Coordinates" value={`${drawerStation.lat}, ${drawerStation.lng}`} />
            <DrawerRow th={th} label="Created" value={fmtDateTime(drawerStation.created_at)} />
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${drawerStation.lat},${drawerStation.lng}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <Button th={th} variant="secondary" icon={<Navigation size={13} />} fullWidth style={{ marginTop: 16 }}>Open in Maps</Button>
            </a>
            <Button th={th} variant="secondary" icon={<BookOpen size={13} />} fullWidth style={{ marginTop: 8 }} onClick={() => router.push("/admin/bookings")}>View Bookings at This Station</Button>
            {drawerStation.status === "PENDING_APPROVAL" && (
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <Button th={th} variant="primary" icon={<Check size={13} />} fullWidth onClick={() => doAction(drawerStation.id, "approve")}>Approve</Button>
                <Button th={th} variant="danger" icon={<XIcon size={13} />} fullWidth onClick={() => doAction(drawerStation.id, "reject")}>Reject</Button>
              </div>
            )}
          </div>
        )}
        {drawerStation && drawerTab === "chargers" && (
          <div>
            {drawerChargers.length === 0 && <div style={{ textAlign: "center", padding: "24px", color: th.textSub, fontSize: 13 }}>No chargers at this station.</div>}
            {drawerChargers.map(c => (
              <DrawerLink key={c.id} th={th} icon={<Zap size={14} color={th.accent} />} label={`${c.label} · ${c.connector_type}`}
                sub={`${c.power_kw}kW · ₹${(c.price_per_kwh / 100).toFixed(0)}/kWh · ${c.status}`}
                onClick={() => router.push(`/admin/chargers?focus=${c.id}`)} />
            ))}
          </div>
        )}
        {drawerStation && drawerTab === "owner" && (
          owner ? (
            <div>
              <DrawerRow th={th} label="Name" value={owner.full_name ?? "—"} />
              <DrawerRow th={th} label="Phone" value={owner.phone} />
              <DrawerRow th={th} label="Email" value={owner.email ?? "—"} />
              <DrawerRow th={th} label="Status" value={owner.status} />
              <DrawerRow th={th} label="Joined" value={fmtDate(owner.created_at)} />
              <Button th={th} variant="secondary" icon={<Building2 size={13} />} fullWidth style={{ marginTop: 16 }} onClick={() => router.push(`/admin/owners?focus=${owner.id}`)}>View Owner Profile</Button>
            </div>
          ) : <div style={{ textAlign: "center", padding: "24px", color: th.textSub, fontSize: 13 }}>Owner not found.</div>
        )}
      </Drawer>
    </div>
  );
}

export default function AdminStationsPage() {
  return <Suspense fallback={null}><StationsContent /></Suspense>;
}
