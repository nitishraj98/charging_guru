"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { authFetch } from "@/lib/admin-ui";

interface Booking {
  id: string; status: string; slot_start: string; slot_end: string; amount: number;
  charger?: { label: string; connector_type: string; power_kw: number };
  station?: { name: string };
}

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "#FFC043", CONFIRMED: "#4DFFA6",
  CHECKED_IN: "#22D3EE", IN_PROGRESS: "#22D3EE",
  COMPLETED: "#6B7479", CANCELLED: "#FF5A5F", EXPIRED: "#495154",
};

export default function OwnerBookingsPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();
  const { isLight } = useTheme();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const bg          = isLight ? "#F3F7FB" : "#0A0D0E";
  const cardBg      = isLight ? "#FFFFFF" : "#101415";
  const cardBorder  = isLight ? "#CBD5E1" : "#222829";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#6B7479";
  const textMuted   = isLight ? "#64748B" : "#495154";
  const accent      = isLight ? "#00D26A" : "#00E676";
  const _raisedBg   = isLight ? "#F1F5F9" : "#181D1F"; void _raisedBg;
  const inputBg     = isLight ? "#F1F5F9" : "#101415";
  const inputBorder = isLight ? "#CBD5E1" : "#222829";

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

  const FILTERS = ["ALL", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"];
  const filtered = filter === "ALL" ? bookings : bookings.filter(b => b.status === filter);

  return (
    <div className="owner-pad" style={{ padding: "28px 32px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>Station Bookings</h1>
        <p style={{ fontSize: 13, color: textSub, marginBottom: 24 }}>All bookings across your charging stations.</p>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 7, marginBottom: 20, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
              background: filter === f ? (isLight ? "#DCFCE7" : "#00532B") : inputBg,
              border: `1px solid ${filter === f ? (isLight ? "#86EFAC" : "#00A455") : inputBorder}`,
              color: filter === f ? (isLight ? "#16A34A" : "#4DFFA6") : textSub,
              transition: "all .12s",
            }}>{f.replace("_", " ")}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3, borderColor: "#222829", borderTopColor: accent }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: textSub }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>??</div>
            <p style={{ fontSize: 15 }}>No bookings found.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(b => (
              <div key={b.id} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.04)" : "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>
                      {b.charger?.label ?? "Charger"} - {b.charger?.connector_type ?? ""} {b.charger?.power_kw ?? ""}kW
                    </span>
                    <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: STATUS_COLOR[b.status] ?? textMuted, background: `${STATUS_COLOR[b.status] ?? textMuted}18` }}>
                      {b.status.replace("_", " ")}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: textSub }}>
                    {b.slot_start ? new Date(b.slot_start).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                    {" - "}
                    {b.slot_end ? new Date(b.slot_end).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </div>
                  <div style={{ fontSize: 11, color: textMuted, fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                    {b.id.slice(0, 12)} - Rs {(b.amount / 100).toLocaleString("en-IN")}
                  </div>
                </div>
                {(b.status === "CONFIRMED" || b.status === "CHECKED_IN" || b.status === "IN_PROGRESS") && (
                  <button onClick={() => router.push(`/owner/sessions?booking=${b.id}`)} style={{
                    padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: accent, color: "#050708", border: "none", cursor: "pointer", flexShrink: 0,
                  }}>
                    {b.status === "CONFIRMED" ? "Check in" : b.status === "CHECKED_IN" ? "Start" : "Complete"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

