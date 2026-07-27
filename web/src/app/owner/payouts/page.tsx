"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Wallet, IndianRupee, CheckCircle2, Clock3 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { owner as ownerApi, OwnerPayout } from "@/lib/api";
import {
  getOwnerTheme, Card, PageHeader, StatCard, StatusBadge, DataTable, Column, EmptyState, TableSkeleton, StatCardSkeleton,
} from "@/components/owner";

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

export default function OwnerPayoutsPage() {
  const { isLight } = useTheme();
  const th = getOwnerTheme(isLight);

  const [payouts, setPayouts] = useState<OwnerPayout[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ownerApi.payouts(1, 100);
      setPayouts(res.items);
    } catch {
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = useMemo(
    () => payouts.filter(p => p.status === "PENDING" || p.status === "SCHEDULED").reduce((s, p) => s + p.amount_paise, 0),
    [payouts],
  );
  const paid = useMemo(
    () => payouts.filter(p => p.status === "PAID").reduce((s, p) => s + p.amount_paise, 0),
    [payouts],
  );

  const columns: Column<OwnerPayout>[] = [
    { key: "period", header: "Period", sortValue: p => p.period_start, render: p => (
      <span style={{ color: th.textSub, fontSize: 12.5 }}>
        {new Date(p.period_start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        {" – "}
        {new Date(p.period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </span>
    ) },
    { key: "amount_paise", header: "Amount", align: "right", sortValue: p => p.amount_paise, render: p => (
      <span style={{ fontFamily: th.mono, fontWeight: 700, color: th.text }}>{rupees(p.amount_paise)}</span>
    ) },
    { key: "status", header: "Status", render: p => <StatusBadge status={p.status} th={th} /> },
    { key: "reference_note", header: "Reference", render: p => (
      <span style={{ color: th.textSub, fontSize: 12 }}>{p.reference_note ?? "—"}</span>
    ) },
    { key: "paid_at", header: "Paid On", sortValue: p => p.paid_at ?? "", render: p => (
      <span style={{ color: th.textSub, fontSize: 12 }}>
        {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
      </span>
    ) },
  ];

  if (loading) return (
    <div className="owner-pad">
      <div style={{ width: 180, height: 26, background: th.raised, borderRadius: 8, marginBottom: 24 }} />
      <div className="owner-payout-stat-grid" style={{ marginBottom: 20 }}>
        {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} th={th} />)}
      </div>
      <TableSkeleton th={th} />
    </div>
  );

  return (
    <div className="owner-pad owner-fade-up">
      <PageHeader th={th} title="Payouts" subtitle="Track how much Charging Guru owes you and what's already been transferred." />

      <div className="owner-payout-stat-grid" style={{ marginBottom: 20 }}>
        <StatCard th={th} label="Pending Payouts" value={rupees(pending)} icon={<Clock3 size={15} color={th.warn} />} accentColor={th.warn} sub="awaiting transfer" />
        <StatCard th={th} label="Completed Payouts" value={rupees(paid)} icon={<CheckCircle2 size={15} color={th.success} />} accentColor={th.success} sub="paid out to date" />
        <StatCard th={th} label="Total Payouts" value={payouts.length} icon={<Wallet size={15} color={th.accent} />} accentColor={th.accent} sub="all-time count" />
      </div>

      <Card th={th} padding={16}>
        {payouts.length === 0 ? (
          <EmptyState
            th={th}
            icon={<IndianRupee size={22} color={th.accent} />}
            title="No payouts yet"
            description="Payouts are created by the Charging Guru finance team on a regular cadence — they'll show up here once scheduled."
          />
        ) : (
          <DataTable th={th} columns={columns} rows={payouts} rowKey={p => p.id} pageSize={10} />
        )}
      </Card>

      <style suppressHydrationWarning>{`
        .owner-payout-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 700px) { .owner-payout-stat-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
