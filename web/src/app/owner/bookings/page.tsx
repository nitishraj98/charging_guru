"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { authFetch } from "@/lib/admin-ui";
import { CalendarClock, IndianRupee, Search, TicketCheck, Zap } from "lucide-react";

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
  const cardBorder  = isLight ? "rgba(15,23,42,0.09)" : "rgba(255,255,255,0.08)";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#6B7479";
  const textMuted   = isLight ? "#64748B" : "#495154";
  const accent      = isLight ? "#00D26A" : "#00E676";
  const raisedBg    = isLight ? "#F1F5F9" : "#181D1F";
  const inputBorder = isLight ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.08)";

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
  const liveCount = bookings.filter(b => ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(b.status)).length;
  const revenue = bookings.reduce((sum, b) => sum + (b.status === "COMPLETED" ? b.amount : 0), 0);

  return (
    <div className="owner-pad" style={{ padding: "32px", position: "relative", zIndex: 1 }}>
        <div style={{
          background: isLight
            ? "linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,253,244,0.86))"
            : "linear-gradient(135deg,rgba(16,20,21,0.96),rgba(6,28,18,0.86))",
          border: `1px solid ${cardBorder}`,
          borderRadius: 24,
          padding: "24px",
          marginBottom: 18,
          boxShadow: isLight ? "0 18px 48px rgba(15,23,42,0.08)" : "0 24px 60px rgba(0,0,0,0.34)",
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{ position: "absolute", inset: "auto -70px -90px auto", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,210,106,.18),transparent 68%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap", position: "relative" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "rgba(0,210,106,.10)", border: "1px solid rgba(0,210,106,.18)", color: accent, fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 12 }}>
                <TicketCheck size={13} /> Booking Desk
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: textPrimary, marginBottom: 6, letterSpacing: "-0.04em" }}>Station Bookings</h1>
              <p style={{ fontSize: 13, color: textSub }}>Track reservations, payments, and handoffs across your charging network.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(96px, 1fr))", gap: 10, minWidth: 320 }}>
              {[
                { label: "Total", value: bookings.length, Icon: CalendarClock, color: accent },
                { label: "Live", value: liveCount, Icon: Zap, color: "#22D3EE" },
                { label: "Earned", value: `Rs ${(revenue / 100).toLocaleString("en-IN")}`, Icon: IndianRupee, color: "#FFC043" },
              ].map(({ label, value, Icon, color }) => (
                <div key={label} style={{ background: isLight ? "rgba(255,255,255,.78)" : "rgba(255,255,255,.035)", border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "12px 14px" }}>
                  <Icon size={14} color={color} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 18, fontWeight: 800, color: textPrimary, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 10, color: textSub, marginTop: 5, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 7, marginBottom: 18, flexWrap: "wrap", background: isLight ? "rgba(255,255,255,.76)" : "rgba(16,20,21,.72)", border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 8, width: "fit-content", boxShadow: isLight ? "0 10px 30px rgba(15,23,42,.05)" : "none" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "8px 14px", borderRadius: 11, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              background: filter === f ? (isLight ? "#0F172A" : accent) : "transparent",
              border: `1px solid ${filter === f ? "transparent" : inputBorder}`,
              color: filter === f ? (isLight ? "#FFFFFF" : "#050708") : textSub,
              transition: "all .12s",
            }}>{f.replace("_", " ")}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3, borderColor: "#222829", borderTopColor: accent }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "72px 20px", color: textSub, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 22 }}>
            <Search size={34} color={textMuted} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15 }}>No bookings found.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(b => (
              <div key={b.id} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: isLight ? "0 12px 34px rgba(15,23,42,.06)" : "0 1px 0 rgba(255,255,255,.03)", minHeight: 84 }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: `${STATUS_COLOR[b.status] ?? accent}14`, border: `1px solid ${STATUS_COLOR[b.status] ?? accent}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Zap size={17} color={STATUS_COLOR[b.status] ?? accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>
                      {b.charger?.label ?? "Charger"} | {b.charger?.connector_type ?? ""} {b.charger?.power_kw ?? ""}kW
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
                    {b.id.slice(0, 12)} | Rs {(b.amount / 100).toLocaleString("en-IN")}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 12, background: raisedBg, color: textPrimary, fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                  <IndianRupee size={13} color={accent} />
                  {(b.amount / 100).toLocaleString("en-IN")}
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

