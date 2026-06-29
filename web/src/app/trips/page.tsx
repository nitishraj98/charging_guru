"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bookings, Booking } from "@/lib/api";
import { checkAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

const TABS = ["Upcoming", "Past"];
const UPCOMING = ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_PAYMENT: { label: "Pending Payment", color: "#FFC043", bg: "rgba(255,192,67,.12)" },
  CONFIRMED:       { label: "Confirmed",        color: "#4DFFA6", bg: "rgba(0,230,118,.1)"  },
  CHECKED_IN:      { label: "Checked In",       color: "#22D3EE", bg: "rgba(34,211,238,.1)" },
  IN_PROGRESS:     { label: "In Progress",      color: "#22D3EE", bg: "rgba(34,211,238,.1)" },
  COMPLETED:       { label: "Completed",        color: "#98A1A6", bg: "rgba(152,161,166,.1)" },
  CANCELLED:       { label: "Cancelled",        color: "#FF5A5F", bg: "rgba(255,90,95,.1)"  },
  EXPIRED:         { label: "Expired",          color: "#495154", bg: "rgba(73,81,84,.1)"   },
};

export default function TripsPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [list, setList] = useState<Booking[]>([]);
  const [tab, setTab] = useState("Upcoming");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const bg           = isLight ? "#F8FAFC" : "#0A0D0E";
  const cardBg       = isLight ? "#FFFFFF" : "#101415";
  const cardBorder   = isLight ? "#E2E8F0" : "#222829";
  const cardBorderHover = isLight ? "#CBD5E1" : "#2E3638";
  const textPrimary  = isLight ? "#0F172A" : "#E6EBED";
  const textSub      = isLight ? "#64748B" : "#6B7479";
  const accent       = isLight ? "#00D26A" : "#00E676";
  const accentDim    = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBorder = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";
  const tabBarBg     = isLight ? "#F1F5F9" : "#101415";
  const tabActiveBg  = isLight ? "#FFFFFF" : "#181D1F";
  const tabActiveColor = isLight ? "#059669" : "#00E676";
  const raisedBg     = isLight ? "#F1F5F9" : "#181D1F";

  function reload() {
    setLoadError("");
    setLoading(true);
    bookings.list()
      .then(setList)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Failed to load trips"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    checkAuth().then(ok => { if (!ok) { router.push("/login"); return; } reload(); });
  }, [router]);

  const filtered = list.filter(b =>
    tab === "Upcoming" ? UPCOMING.includes(b.status) : !UPCOMING.includes(b.status)
  );

  function formatSlot(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  }

  const statusMeta = (s: string) => STATUS_META[s] ?? { label: s, color: "#98A1A6", bg: "rgba(152,161,166,.1)" };
  const upcoming = filtered.filter(b => UPCOMING.includes(b.status));
  const nextBooking = upcoming[0];

  return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />

      <div className="fade-up" style={{ maxWidth: 780, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* ── Hero: next charging stop ── */}
        {!loading && !loadError && nextBooking && tab === "Upcoming" && (
          <div style={{
            background: isLight ? "linear-gradient(135deg,#F0FDF4,#ECFDF5)" : "linear-gradient(135deg,#0C2319,#101415)",
            border: `1px solid ${accentBorder}`,
            borderRadius: 22, padding: "22px 24px", marginBottom: 28,
            boxShadow: isLight ? "0 4px 20px rgba(0,210,106,.1)" : "0 0 0 1px rgba(0,164,85,.15)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: accent, marginBottom: 10 }}>NEXT CHARGING STOP</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, color: textPrimary, marginBottom: 4 }}>
                  {nextBooking.charger?.label ?? "Charger"} · {nextBooking.charger?.connector_type ?? "CCS2"} {nextBooking.charger?.power_kw ?? ""}kW
                </div>
                <div style={{ fontSize: 13, color: textSub }}>
                  {nextBooking.slot_start ? formatSlot(nextBooking.slot_start) : ""}
                  {nextBooking.amount ? <span style={{ fontFamily: "'JetBrains Mono',monospace", marginLeft: 8 }}>· ₹{(nextBooking.amount / 100).toLocaleString("en-IN")}</span> : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {nextBooking.status === "CONFIRMED" && (
                  <button onClick={() => router.push(`/qr/${nextBooking.id}`)} style={{
                    padding: "12px 20px", borderRadius: 12,
                    background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
                    color: "#050708", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer",
                    boxShadow: isLight ? "0 4px 14px rgba(0,210,106,.35)" : "0 0 0 1px rgba(0,230,118,.4)",
                  }}>View QR →</button>
                )}
                {nextBooking.status === "PENDING_PAYMENT" && (
                  <button onClick={() => router.push(`/pay/${nextBooking.id}`)} style={{
                    padding: "12px 20px", borderRadius: 12,
                    background: "#FFC043", color: "#050708", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer",
                  }}>Pay now →</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Plan Journey CTA (when no upcoming bookings) ── */}
        {!loading && !loadError && upcoming.length === 0 && tab === "Upcoming" && (
          <div style={{
            background: cardBg, border: `1px solid ${cardBorder}`,
            borderRadius: 22, padding: "36px 28px", marginBottom: 28, textAlign: "center",
            boxShadow: isLight ? "0 2px 12px rgba(0,0,0,.05)" : "none",
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 16px", background: accentDim, border: `1px solid ${accentBorder}`, display: "grid", placeItems: "center", fontSize: 28 }}>🗺</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>Plan your next journey</h3>
            <p style={{ color: textSub, fontSize: 14, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 24px" }}>
              Enter your route and we&apos;ll find the best charging stops — book them all in one go.
            </p>
            <button onClick={() => router.push("/plan")} style={{
              padding: "14px 28px", borderRadius: 14,
              background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
              color: "#050708", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer",
              boxShadow: isLight ? "0 4px 18px rgba(0,210,106,.35)" : "0 0 0 1px rgba(0,230,118,.4),0 0 24px rgba(0,230,118,.18)",
            }}>Plan My Journey →</button>
            <div style={{ marginTop: 16 }}>
              <button onClick={() => router.push("/discover")} style={{
                background: "none", border: "none", color: textSub, fontSize: 13, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3,
              }}>or find a nearby charger</button>
            </div>
          </div>
        )}

        {/* ── Stats row ── */}
        {!loading && !loadError && list.length > 0 && (() => {
          const completed = list.filter(b => b.status === "COMPLETED");
          const totalPaise = completed.reduce((sum, b) => sum + (b.amount ?? 0), 0);
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { icon: "⚡", label: "Total sessions", value: `${list.length}` },
                { icon: "✅", label: "Completed", value: `${completed.length}` },
                { icon: "💳", label: "Total spent", value: totalPaise > 0 ? `₹${(totalPaise / 100).toLocaleString("en-IN")}` : "—" },
              ].map(s => (
                <div key={s.label} style={{
                  background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "16px 18px",
                  boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none",
                }}>
                  <div style={{ fontSize: 18, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, marginBottom: 4, color: textPrimary }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: textSub }}>{s.label}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── Tab header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", background: tabBarBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 4, gap: 2 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "8px 20px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                background: tab === t ? tabActiveBg : "transparent",
                color: tab === t ? tabActiveColor : textSub,
                border: tab === t ? `1px solid ${cardBorder}` : "1px solid transparent",
                cursor: "pointer", transition: "all .15s",
              }}>{t}</button>
            ))}
          </div>
          <button onClick={() => router.push("/plan")} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 16px", borderRadius: 11,
            background: accentDim, border: `1px solid ${accentBorder}`,
            color: accent, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M13 6l6 6-6 6" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Plan journey
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0", color: textSub, fontSize: 14 }}>
            <span className="spinner" style={{ borderColor: cardBorder, borderTopColor: accent, width: 18, height: 18 }} />
            Loading trips…
          </div>
        )}

        {/* Error */}
        {!loading && loadError && (
          <div style={{ padding: "18px 20px", borderRadius: 14, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "#FF5A5F", fontSize: 14 }}>⚠ {loadError}</span>
            <button onClick={reload} style={{ padding: "8px 16px", borderRadius: 10, background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>Retry</button>
          </div>
        )}

        {/* Booking list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(b => {
            const meta = statusMeta(b.status);
            return (
              <div key={b.id} style={{
                background: cardBg, border: `1px solid ${cardBorder}`,
                borderRadius: 18, padding: "18px 20px",
                transition: "all .15s", cursor: b.status === "CONFIRMED" ? "pointer" : "default",
                boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = cardBorderHover; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = "none"; }}
              onClick={() => router.push(`/bookings/${b.id}`)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg }}>{meta.label}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: textPrimary }}>
                      {b.charger?.label ?? "Charger"} · {b.charger?.connector_type ?? "CCS2"} {b.charger?.power_kw ?? ""}kW
                    </div>
                    <div style={{ fontSize: 13, color: textSub }}>
                      {b.slot_start ? formatSlot(b.slot_start) : ""}
                      {b.amount ? <span style={{ fontFamily: "'JetBrains Mono',monospace", marginLeft: 8 }}>· ₹{(b.amount / 100).toLocaleString("en-IN")}</span> : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {b.status === "CONFIRMED" && (
                      <button onClick={e => { e.stopPropagation(); router.push(`/qr/${b.id}`); }} style={{ padding: "8px 16px", borderRadius: 10, background: accent, color: "#050708", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>View QR →</button>
                    )}
                    {b.status === "PENDING_PAYMENT" && (
                      <button onClick={e => { e.stopPropagation(); router.push(`/pay/${b.id}`); }} style={{ padding: "8px 16px", borderRadius: 10, background: "#FFC043", color: "#050708", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>Pay now →</button>
                    )}
                    {b.status === "COMPLETED" && (
                      <button style={{ padding: "8px 16px", borderRadius: 10, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Invoice ↓</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Past empty */}
        {!loading && !loadError && tab === "Past" && filtered.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, display: "grid", placeItems: "center", background: cardBg, border: `1px solid ${cardBorder}`, fontSize: 32 }}>🔋</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: textPrimary }}>No past sessions yet</p>
            <p style={{ fontSize: 14, color: textSub, textAlign: "center", maxWidth: 280 }}>Complete a charging session to see it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

