"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Users as UsersIcon, ShieldOff, ShieldCheck, ShieldX, Trash2, Download } from "lucide-react";
import { authFetch, fmtDate, fmtDateTime, fmtRupee } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@/contexts/UserContext";
import {
  getAdminTheme, Card, DataTable, Column, StatusBadge, Pill, Button, PageHeader,
  useToast, Drawer, DrawerRow, useAdminData,
} from "@/components/admin";

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

const ROLE_TONE: Record<string, "accent" | "warn" | "info"> = { ROLE_ADMIN: "accent", ROLE_STATION_OWNER: "warn" };

export default function AdminUsersPage() {
  const params = useSearchParams();
  const { isLight } = useTheme();
  const th = getAdminTheme(isLight);
  const toast = useToast();
  const { stationById, chargerById } = useAdminData();
  const { user: me } = useUser();

  const [data,    setData]    = useState<PagedResult<UserRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(params.get("focus"));
  const [tab, setTab] = useState<"info" | "bookings">("info");
  const [bkData, setBkData] = useState<PagedResult<BookingRow> | null>(null);
  const [bkLoad, setBkLoad] = useState(false);
  const [actBusy, setActBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/v1/admin/users?page=1&per_page=100");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch { /* handled via empty state */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (params.get("focus")) setDrawerId(params.get("focus")); }, [params]);

  const loadBookings = useCallback(async (userId: string) => {
    setBkLoad(true);
    try {
      const res = await authFetch(`/api/v1/admin/users/${userId}/bookings?page=1&per_page=10`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setBkData(await res.json());
    } catch { setBkData(null); }
    finally { setBkLoad(false); }
  }, []);

  const drawerUser = drawerId ? (data?.items.find(u => u.id === drawerId) ?? null) : null;

  function openDrawer(id: string) {
    setDrawerId(id); setTab("info"); setBkData(null);
  }
  function switchTab(t: "info" | "bookings") {
    setTab(t);
    if (t === "bookings" && drawerId && !bkData) loadBookings(drawerId);
  }

  async function setStatus(newStatus: string) {
    if (!drawerUser) return;
    setActBusy(true);
    try {
      const res = await authFetch(`/api/v1/admin/users/${drawerUser.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.detail ?? `HTTP ${res.status}`); }
      const updated: UserRow = await res.json();
      setData(d => d ? { ...d, items: d.items.map(u => u.id === updated.id ? updated : u) } : d);
      toast.show("success", `User set to ${newStatus}.`);
    } catch (e: unknown) { toast.show("error", e instanceof Error ? e.message : "Failed"); }
    finally { setActBusy(false); }
  }

  async function revokeAdmin() {
    if (!drawerUser) return;
    setActBusy(true);
    try {
      const res = await authFetch(`/api/v1/admin/admins/${drawerUser.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.detail ?? `HTTP ${res.status}`); }
      const updated: UserRow = await res.json();
      setData(d => d ? { ...d, items: d.items.map(u => u.id === updated.id ? updated : u) } : d);
      toast.show("success", "Admin access revoked.");
    } catch (e: unknown) { toast.show("error", e instanceof Error ? e.message : "Failed"); }
    finally { setActBusy(false); }
  }

  function exportCsv() {
    const rows = data?.items ?? [];
    const header = ["Name", "Phone", "Email", "Roles", "Status", "Points", "Joined"];
    const csvRows = rows.map(u => [u.full_name ?? "", u.phone, u.email ?? "", u.role_names.join("|"), u.status, String(u.reward_points), fmtDate(u.created_at)]);
    const csv = [header, ...csvRows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `users-${Date.now()}.csv` }).click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<UserRow>[] = [
    { key: "name", header: "Name & Phone", sortValue: u => u.full_name ?? u.phone, render: u => (
      <div>
        <div style={{ fontWeight: 600, color: th.text }}>{u.full_name ?? <span style={{ color: th.textMuted }}>No name</span>}</div>
        <div style={{ fontFamily: th.mono, fontSize: 11, color: th.textSub, marginTop: 2 }}>{u.phone}</div>
      </div>
    ) },
    { key: "email", header: "Email", render: u => <span style={{ fontSize: 12, color: th.textSub }}>{u.email ?? "—"}</span> },
    { key: "roles", header: "Roles", render: u => (
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {u.role_names.length === 0 ? <span style={{ fontSize: 11, color: th.textSub }}>User</span> : u.role_names.map(r => (
          <Pill key={r} th={th} tone={ROLE_TONE[r] ?? "neutral"}>{r.replace("ROLE_", "")}</Pill>
        ))}
      </div>
    ) },
    { key: "status", header: "Status", render: u => <StatusBadge status={u.status} th={th} /> },
    { key: "points", header: "Points", sortValue: u => u.reward_points, render: u => <span style={{ fontFamily: th.mono, color: th.textSub }}>{u.reward_points}</span> },
    { key: "created", header: "Joined", sortValue: u => u.created_at, render: u => <span style={{ fontSize: 12, color: th.textSub }}>{fmtDate(u.created_at)}</span> },
  ];

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: th.sans }}>
      <PageHeader th={th} title="Users"
        subtitle={data ? `${data.total.toLocaleString()} registered users` : "Loading…"}
        actions={<Button th={th} variant="secondary" icon={<Download size={13} />} onClick={exportCsv}>Export CSV</Button>} />

      <Card th={th} padding={16}>
        <DataTable
          th={th} columns={columns} rows={data?.items ?? []} rowKey={u => u.id}
          searchPlaceholder="Search name, phone, email…"
          searchFn={(u, q) => (u.full_name ?? "").toLowerCase().includes(q) || u.phone.includes(q) || (u.email ?? "").toLowerCase().includes(q)}
          onRowClick={u => openDrawer(u.id)}
          pageSize={12}
          emptyState={<div style={{ textAlign: "center", padding: "48px", color: th.textSub }}>{loading ? "Loading…" : "No users found."}</div>}
        />
      </Card>

      <Drawer
        th={th} open={!!drawerUser} onClose={() => setDrawerId(null)}
        title={drawerUser?.full_name ?? "User"} subtitle={drawerUser?.phone}
        icon={<UsersIcon size={18} color={th.accent} />}
        tabs={[{ key: "info", label: "Profile" }, { key: "bookings", label: "Bookings" }]}
        activeTab={tab} onTabChange={t => switchTab(t as "info" | "bookings")}
      >
        {drawerUser && tab === "info" && (
          <div>
            <DrawerRow th={th} label="Email" value={drawerUser.email ?? "—"} />
            <DrawerRow th={th} label="Status" value={drawerUser.status} />
            <DrawerRow th={th} label="Roles" value={drawerUser.role_names.join(", ") || "User"} />
            <DrawerRow th={th} label="Reward Points" value={drawerUser.reward_points} />
            <DrawerRow th={th} label="Referral Code" value={drawerUser.referral_code} />
            <DrawerRow th={th} label="Joined" value={fmtDate(drawerUser.created_at)} />

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              {drawerUser.status !== "ACTIVE" && <Button th={th} variant="primary" icon={<ShieldCheck size={13} />} fullWidth loading={actBusy} onClick={() => setStatus("ACTIVE")}>Activate</Button>}
              {drawerUser.status !== "SUSPENDED" && <Button th={th} variant="secondary" icon={<ShieldOff size={13} />} fullWidth disabled={actBusy} onClick={() => setStatus("SUSPENDED")}>Suspend</Button>}
              {drawerUser.status !== "DELETED" && <Button th={th} variant="danger" icon={<Trash2 size={13} />} fullWidth disabled={actBusy} onClick={() => setStatus("DELETED")}>Ban</Button>}
            </div>

            {drawerUser.role_names.includes("ROLE_ADMIN") && me?.id !== drawerUser.id && (
              <div style={{ marginTop: 8 }}>
                <Button th={th} variant="danger" icon={<ShieldX size={13} />} fullWidth disabled={actBusy} onClick={revokeAdmin}>Revoke Admin Access</Button>
              </div>
            )}
          </div>
        )}
        {drawerUser && tab === "bookings" && (
          <div>
            {bkLoad && <div style={{ textAlign: "center", padding: "24px", color: th.textSub, fontSize: 13 }}>Loading bookings…</div>}
            {!bkLoad && bkData?.items.length === 0 && <div style={{ textAlign: "center", padding: "24px", color: th.textSub, fontSize: 13 }}>No bookings yet.</div>}
            {bkData?.items.map(b => {
              const st = stationById.get(b.station_id); const ch = chargerById.get(b.charger_id);
              return (
                <div key={b.id} style={{ padding: "12px 0", borderBottom: `1px solid ${th.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{st?.name ?? "—"}</div>
                    <div style={{ fontSize: 11, color: th.textSub, marginTop: 2 }}>{ch?.label ?? ""} · {fmtDateTime(b.created_at)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <StatusBadge status={b.status} th={th} />
                    <div style={{ fontFamily: th.mono, fontSize: 12, color: th.text, marginTop: 4 }}>{fmtRupee(b.amount)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Drawer>
    </div>
  );
}
