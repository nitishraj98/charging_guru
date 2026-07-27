"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, IndianRupee, Zap, BookOpen, ChevronRight } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { authFetch } from "@/lib/admin-ui";
import {
  getOwnerTheme, Card, PageHeader, StatCard, StatusBadge, DataTable, Column, Button, EmptyState, TableSkeleton, StatCardSkeleton,
} from "@/components/owner";

interface Booking {
  id: string; status: string; slot_start: string; slot_end: string; created_at: string;
  charger?: { label: string; connector_type: string; power_kw: number };
  station?: { name: string };
  // Owner-safe breakdown only — never includes Charging Guru's platform/
  // convenience fee or GST. owner_earnings_paise is what the owner actually earns.
  breakdown?: { owner_earnings_paise: number } | null;
}

const FILTERS = ["ALL", "PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

export default function OwnerBookingsPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const th = getOwnerTheme(isLight);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<typeof FILTERS[number]>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/v1/owner/bookings");
      if (res.ok) setBookings(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => filter === "ALL" ? bookings : bookings.filter(b => b.status === filter), [bookings, filter]);
  const liveCount = useMemo(() => bookings.filter(b => ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(b.status)).length, [bookings]);
  const revenue = useMemo(() => bookings.reduce((sum, b) => sum + (b.status === "COMPLETED" ? (b.breakdown?.owner_earnings_paise ?? 0) : 0), 0), [bookings]);

  const columns: Column<Booking>[] = [
    { key: "charger", header: "Charger / Station", render: b => (
      <div>
        <div style={{ fontWeight: 650, color: th.text }}>{b.charger?.label ?? "Charger"} · {b.charger?.connector_type ?? ""} {b.charger?.power_kw ?? ""}kW</div>
        <div style={{ fontSize: 11.5, color: th.textSub }}>{b.station?.name ?? ""}</div>
      </div>
    ) },
    { key: "slot_start", header: "Slot", sortValue: b => b.slot_start ?? "", render: b => (
      <span style={{ color: th.textSub, fontSize: 12.5 }}>
        {b.slot_start ? new Date(b.slot_start).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
        {b.slot_end && ` – ${new Date(b.slot_end).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
      </span>
    ) },
    { key: "amount", header: "Your Earnings", align: "right", sortValue: b => b.breakdown?.owner_earnings_paise ?? 0, render: b => (
      <span style={{ fontFamily: th.mono, fontWeight: 700, color: th.text }}>{rupees(b.breakdown?.owner_earnings_paise ?? 0)}</span>
    ) },
    { key: "status", header: "Status", render: b => <StatusBadge status={b.status} th={th} /> },
    { key: "actions", header: "", align: "right", render: b => (
      ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(b.status) ? (
        <Button th={th} variant="secondary" size="sm" onClick={() => router.push(`/owner/sessions?booking=${b.id}`)}>
          {b.status === "CONFIRMED" ? "Check in" : b.status === "CHECKED_IN" ? "Start" : "Complete"} <ChevronRight size={12} />
        </Button>
      ) : null
    ) },
  ];

  if (loading) return (
    <div className="owner-pad">
      <div style={{ width: 180, height: 26, background: th.raised, borderRadius: 8, marginBottom: 24 }} />
      <div className="owner-booking-stat-grid" style={{ marginBottom: 20 }}>
        {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} th={th} />)}
      </div>
      <TableSkeleton th={th} />
    </div>
  );

  return (
    <div className="owner-pad owner-fade-up">
      <PageHeader th={th} title="Station Bookings" subtitle="Track reservations, payments, and handoffs across your charging network." />

      <div className="owner-booking-stat-grid" style={{ marginBottom: 20 }}>
        <StatCard th={th} label="Total Bookings" value={bookings.length} icon={<CalendarClock size={15} color={th.accent} />} accentColor={th.accent} />
        <StatCard th={th} label="Live Right Now" value={liveCount} icon={<Zap size={15} color={th.info} />} accentColor={th.info} />
        <StatCard th={th} label="Earned (Completed)" value={rupees(revenue)} icon={<IndianRupee size={15} color={th.warn} />} accentColor={th.warn} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "8px 13px", borderRadius: 9, fontSize: 12, fontWeight: 650, cursor: "pointer", fontFamily: th.sans,
            background: filter === f ? th.accentDim : th.card, border: `1px solid ${filter === f ? th.accentBorder : th.border}`,
            color: filter === f ? th.accent : th.textSub,
          }}>{f === "ALL" ? "All" : f.replace(/_/g, " ")}</button>
        ))}
      </div>

      <Card th={th} padding={16}>
        {bookings.length === 0 ? (
          <EmptyState
            th={th}
            icon={<BookOpen size={22} color={th.accent} />}
            title="No bookings yet"
            description="Once customers start booking your chargers, they'll show up here."
          />
        ) : (
          <DataTable
            th={th} columns={columns} rows={filtered} rowKey={b => b.id}
            searchPlaceholder="Search by charger, station, or booking ID…"
            searchFn={(b, q) => (b.charger?.label ?? "").toLowerCase().includes(q) || (b.station?.name ?? "").toLowerCase().includes(q) || b.id.toLowerCase().includes(q)}
            pageSize={10}
          />
        )}
      </Card>

      <style suppressHydrationWarning>{`
        .owner-booking-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 700px) { .owner-booking-stat-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
