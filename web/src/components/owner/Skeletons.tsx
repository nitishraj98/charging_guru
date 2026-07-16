"use client";
import { Skeleton } from "@/components/Skeleton";
import { OwnerTheme } from "./theme";

export function StatCardSkeleton({ th }: { th: OwnerTheme }) {
  return (
    <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: "20px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <Skeleton width={70} height={11} />
        <Skeleton width={32} height={32} radius={10} />
      </div>
      <Skeleton width={90} height={26} style={{ marginBottom: 8 }} />
      <Skeleton width={110} height={12} />
    </div>
  );
}

export function ChartSkeleton({ th, height = 260 }: { th: OwnerTheme; height?: number }) {
  return (
    <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: 22 }}>
      <Skeleton width={140} height={14} style={{ marginBottom: 20 }} />
      <Skeleton width="100%" height={height} radius={12} />
    </div>
  );
}

export function TableSkeleton({ th, rows = 5 }: { th: OwnerTheme; rows?: number }) {
  return (
    <div style={{ border: `1px solid ${th.border}`, borderRadius: 14, overflow: "hidden", background: th.card }}>
      <div style={{ padding: "13px 16px", background: th.raised, borderBottom: `1px solid ${th.border}` }}>
        <Skeleton width={120} height={11} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: "14px 16px", borderBottom: i < rows - 1 ? `1px solid ${th.border}` : "none", display: "flex", alignItems: "center", gap: 16 }}>
          <Skeleton width={36} height={36} radius={10} />
          <div style={{ flex: 1 }}>
            <Skeleton width="40%" height={13} style={{ marginBottom: 6 }} />
            <Skeleton width="25%" height={11} />
          </div>
          <Skeleton width={70} height={22} radius={999} />
        </div>
      ))}
    </div>
  );
}

export function CardListSkeleton({ th, count = 3 }: { th: OwnerTheme; count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <Skeleton width={44} height={44} radius={13} />
          <div style={{ flex: 1 }}>
            <Skeleton width="35%" height={15} style={{ marginBottom: 8 }} />
            <Skeleton width="55%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}
