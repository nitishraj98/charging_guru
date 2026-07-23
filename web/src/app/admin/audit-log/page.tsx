"use client";
import { useCallback, useEffect, useState } from "react";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { authFetch, fmtDateTime } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getAdminTheme, Card, DataTable, Column, Pill, Button, PageHeader, useAdminData,
} from "@/components/admin";

interface AuditLogEntry {
  id: string; actor_id: string | null; action: string;
  target_type: string | null; target_id: string | null;
  detail: Record<string, unknown> | null; created_at: string;
}
interface PagedResult { items: AuditLogEntry[]; total: number; page: number; per_page: number; pages: number; }

const ACTION_TONE: Record<string, "accent" | "warn" | "info" | "danger"> = {
  STATION_APPROVED: "accent", STATION_REJECTED: "danger",
  BOOKING_CANCELLED: "warn", BOOKING_REFUNDED: "warn",
  USER_STATUS_UPDATED: "info", HOLDS_EXPIRED: "info",
  ADMIN_GRANTED: "accent", ADMIN_REVOKED: "danger",
};

export default function AdminAuditLogPage() {
  const { isLight } = useTheme();
  const th = getAdminTheme(isLight);
  const { userById, stationById } = useAdminData();

  const [data,    setData]    = useState<PagedResult | null>(null);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/v1/admin/audit-log?page=${p}&per_page=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch { /* handled via empty state */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const columns: Column<AuditLogEntry>[] = [
    { key: "time", header: "When", render: e => <span style={{ fontSize: 12, color: th.textSub }}>{fmtDateTime(e.created_at)}</span> },
    { key: "actor", header: "Admin", render: e => {
      const actor = e.actor_id ? userById.get(e.actor_id) : null;
      return actor ? (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: th.text }}>{actor.full_name ?? actor.phone}</div>
          <div style={{ fontSize: 11, color: th.textSub, marginTop: 1 }}>{actor.phone}</div>
        </div>
      ) : <span style={{ color: th.textMuted, fontSize: 12 }}>System</span>;
    } },
    { key: "action", header: "Action", render: e => <Pill th={th} tone={ACTION_TONE[e.action] ?? "info"}>{e.action.replace(/_/g, " ")}</Pill> },
    { key: "target", header: "Target", render: e => {
      if (!e.target_type || !e.target_id) return <span style={{ fontSize: 12, color: th.textSub }}>—</span>;
      if (e.target_type === "user") {
        const u = userById.get(e.target_id);
        return u ? (
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: th.text }}>{u.full_name ?? u.phone}</div>
            <div style={{ fontSize: 11, color: th.textSub, marginTop: 1 }}>{u.phone}</div>
          </div>
        ) : <span style={{ fontSize: 12, color: th.textSub, fontFamily: th.mono }}>user · {e.target_id.slice(0, 8)}…</span>;
      }
      if (e.target_type === "station") {
        const s = stationById.get(e.target_id);
        return s ? (
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: th.text }}>{s.name}</div>
            <div style={{ fontSize: 11, color: th.textSub, marginTop: 1 }}>{s.city ?? s.address}</div>
          </div>
        ) : <span style={{ fontSize: 12, color: th.textSub, fontFamily: th.mono }}>station · {e.target_id.slice(0, 8)}…</span>;
      }
      return (
        <span style={{ fontSize: 12, color: th.textSub, fontFamily: th.mono }}>
          {e.target_type} · {e.target_id.slice(0, 8)}…
        </span>
      );
    } },
    { key: "detail", header: "Detail", render: e => (
      <span style={{ fontSize: 11.5, color: th.textMuted, fontFamily: th.mono }}>
        {e.detail ? JSON.stringify(e.detail) : "—"}
      </span>
    ) },
  ];

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: th.sans }}>
      <PageHeader th={th} title="Audit Log"
        subtitle={data ? `${data.total.toLocaleString()} recorded actions` : "Loading…"} />

      <Card th={th} padding={16}>
        <DataTable
          th={th} columns={columns} rows={data?.items ?? []} rowKey={e => e.id}
          searchPlaceholder="Search this page by action…"
          searchFn={(e, q) => e.action.toLowerCase().includes(q)}
          pageSize={100}
          emptyState={loading ? (
            <div style={{ textAlign: "center", padding: "48px", color: th.textSub }}>Loading…</div>
          ) : (
            <div style={{ textAlign: "center", padding: "48px", color: th.textSub }}>
              <ScrollText size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div>No audit entries yet.</div>
            </div>
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
    </div>
  );
}
