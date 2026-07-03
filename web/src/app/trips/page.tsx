"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, CheckCircle, CreditCard, MapPin, QrCode, ArrowRight,
  Calendar, ChevronRight, Map, Battery, Navigation,
} from "lucide-react";
import { bookings, Booking } from "@/lib/api";
import { checkAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import { TripsSkeleton } from "@/components/Skeleton";

const TABS = ["Upcoming", "Past"];
const UPCOMING = ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  PENDING_PAYMENT: { label: "Pending Payment", color: "#FFC043", bg: "rgba(255,192,67,.12)", dot: "#FFC043" },
  CONFIRMED:       { label: "Confirmed",        color: "#00E676", bg: "rgba(0,230,118,.1)",  dot: "#00E676" },
  CHECKED_IN:      { label: "Checked In",       color: "#22D3EE", bg: "rgba(34,211,238,.1)", dot: "#22D3EE" },
  IN_PROGRESS:     { label: "In Progress",      color: "#22D3EE", bg: "rgba(34,211,238,.1)", dot: "#22D3EE" },
  COMPLETED:       { label: "Completed",        color: "#6B7479", bg: "rgba(107,116,121,.1)", dot: "#495154" },
  CANCELLED:       { label: "Cancelled",        color: "#FF5A5F", bg: "rgba(255,90,95,.1)",  dot: "#FF5A5F" },
  EXPIRED:         { label: "Expired",          color: "#495154", bg: "rgba(73,81,84,.1)",   dot: "#2E3638" },
};

function formatSlot(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtRupee(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default function TripsPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [list, setList] = useState<Booking[]>([]);
  const [tab, setTab] = useState("Upcoming");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const cardBg    = isLight ? "#FFFFFF" : "#101415";
  const cardBorder= isLight ? "#CBD5E1" : "#222829";
  const cardHover = isLight ? "#94A3B8" : "#2E3638";
  const textPrimary=isLight ? "#0F172A" : "#E6EBED";
  const textSub   = isLight ? "#64748B" : "#6B7479";
  const textMuted = isLight ? "#64748B" : "#495154";
  const accent    = isLight ? "#00D26A" : "#00E676";
  const accentDim = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBrd = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";
  const raisedBg  = isLight ? "#F1F5F9" : "#181D1F";

  function reload() {
    setLoadError(""); setLoading(true);
    bookings.list()
      .then(setList)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Failed to load trips"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    checkAuth().then(ok => { if (!ok) { router.push("/login"); return; } reload(); });
  }, [router]);

  const filtered     = list.filter(b => tab === "Upcoming" ? UPCOMING.includes(b.status) : !UPCOMING.includes(b.status));
  const upcomingList = list.filter(b => UPCOMING.includes(b.status));
  const nextBooking  = upcomingList[0];
  const completed    = list.filter(b => b.status === "COMPLETED");
  const totalPaise   = completed.reduce((sum, b) => sum + (b.amount ?? 0), 0);

  const iconProps = { size: 14, strokeWidth: 2 };

  return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div className="fade-up" style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px 100px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: textPrimary, marginBottom: 4, letterSpacing: "-.02em" }}>My Trips</h1>
            <p style={{ fontSize: 14, color: textSub }}>Your charging sessions and upcoming bookings</p>
          </div>
          <button onClick={() => router.push("/plan")} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 12,
            background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
            color: "#050708", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
            boxShadow: isLight ? "0 4px 14px rgba(0,210,106,.3)" : "0 0 0 1px rgba(0,230,118,.3)",
          }}>
            <Navigation size={14} strokeWidth={2.5} />
            Plan journey
          </button>
        </div>

        {/* Stats */}
        {!loading && list.length > 0 && (
          <div className="trips-stats-grid" style={{ marginBottom: 28 }}>
            {[
              { label: "Total sessions", value: list.length.toString(),  Icon: Zap,         color: accent },
              { label: "Completed",      value: completed.length.toString(), Icon: CheckCircle, color: "#4DFFA6" },
              { label: "Total spent",    value: totalPaise > 0 ? fmtRupee(totalPaise) : "—", Icon: CreditCard, color: "#FFC043" },
            ].map(s => (
              <div key={s.label} style={{
                background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "18px 20px",
                boxShadow: isLight ? "0 1px 6px rgba(0,0,0,.05)" : "none", position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: 14, right: 16, width: 34, height: 34, borderRadius: 10,
                  background: `${s.color}18`, display: "grid", placeItems: "center", color: s.color,
                }}>
                  <s.Icon size={16} strokeWidth={2} />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: textSub }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Hero: next stop */}
        {!loading && !loadError && nextBooking && tab === "Upcoming" && (
          <div style={{
            background: isLight ? "linear-gradient(135deg,#F0FDF4,#ECFDF5)" : "linear-gradient(135deg,#091F13,#0C1810,#101415)",
            border: `1px solid ${accentBrd}`, borderRadius: 22, padding: "24px 26px", marginBottom: 24,
            boxShadow: isLight ? "0 4px 24px rgba(0,210,106,.12)" : "0 0 0 1px rgba(0,164,85,.12),0 8px 40px rgba(0,230,118,.05)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: isLight ? "rgba(0,210,106,.06)" : "rgba(0,230,118,.04)", pointerEvents: "none" }} />
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".15em", color: accent, marginBottom: 12, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
              <Zap size={10} strokeWidth={2.5} />
              Next charging stop
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 800, fontSize: 20, color: textPrimary, marginBottom: 6 }}>
                  {nextBooking.charger?.label ?? "Charger"} &middot; {nextBooking.charger?.connector_type ?? "CCS2"} {nextBooking.charger?.power_kw ?? ""}kW
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: textSub, display: "flex", alignItems: "center", gap: 5 }}>
                    <Calendar size={12} strokeWidth={2} />
                    {nextBooking.slot_start ? formatSlot(nextBooking.slot_start) : ""}
                  </span>
                  {nextBooking.amount && (
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: textPrimary, background: accentDim, padding: "2px 9px", borderRadius: 8 }}>
                      {fmtRupee(nextBooking.amount)}
                    </span>
                  )}
                  <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: STATUS_META[nextBooking.status]?.color ?? "#98A1A6", background: STATUS_META[nextBooking.status]?.bg }}>
                    {STATUS_META[nextBooking.status]?.label ?? nextBooking.status}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {nextBooking.status === "CONFIRMED" && (
                  <button onClick={() => router.push(`/qr/${nextBooking.id}`)} style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "12px 22px", borderRadius: 12,
                    background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
                    color: "#050708", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer",
                  }}>
                    <QrCode size={15} strokeWidth={2.5} /> View QR
                  </button>
                )}
                {nextBooking.status === "PENDING_PAYMENT" && (
                  <button onClick={() => router.push(`/pay/${nextBooking.id}`)} style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "12px 22px", borderRadius: 12,
                    background: "#FFC043", color: "#050708", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer",
                  }}>
                    <CreditCard size={15} strokeWidth={2.5} /> Pay now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty upcoming */}
        {!loading && !loadError && upcomingList.length === 0 && tab === "Upcoming" && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 22, padding: "48px 28px", marginBottom: 24, textAlign: "center", boxShadow: isLight ? "0 2px 12px rgba(0,0,0,.05)" : "none" }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, margin: "0 auto 20px", background: accentDim, border: `1px solid ${accentBrd}`, display: "grid", placeItems: "center", color: accent }}>
              <Map size={30} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>Plan your next journey</h3>
            <p style={{ color: textSub, fontSize: 14, lineHeight: 1.7, maxWidth: 360, margin: "0 auto 24px" }}>
              Enter your route and we&apos;ll find the best charging stops — book them all in one go.
            </p>
            <button onClick={() => router.push("/plan")} style={{
              padding: "14px 32px", borderRadius: 14,
              background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
              color: "#050708", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer",
            }}>Plan My Journey →</button>
            <div style={{ marginTop: 14 }}>
              <button onClick={() => router.push("/discover")} style={{ background: "none", border: "none", color: textMuted, fontSize: 13, cursor: "pointer" }}>
                or browse nearby chargers →
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ display: "flex", background: raisedBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 4, gap: 2 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "8px 22px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                background: tab === t ? cardBg : "transparent",
                color: tab === t ? (isLight ? "#059669" : accent) : textSub,
                border: tab === t ? `1px solid ${cardBorder}` : "1px solid transparent",
                cursor: "pointer", transition: "all .15s",
              }}>
                {t}
                {t === "Upcoming" && upcomingList.length > 0 && (
                  <span style={{ marginLeft: 6, padding: "1px 7px", borderRadius: 999, fontSize: 11, background: accentDim, color: accent }}>{upcomingList.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loading && <TripsSkeleton cardBg={cardBg} cardBorder={cardBorder} />}

        {!loading && loadError && (
          <div style={{ padding: "18px 20px", borderRadius: 16, background: "rgba(255,90,95,.07)", border: "1px solid rgba(255,90,95,.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "#FF5A5F", fontSize: 14 }}>{loadError}</span>
            <button onClick={reload} style={{ padding: "8px 18px", borderRadius: 10, background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 13, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {!loading && !loadError && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(b => {
              const meta = STATUS_META[b.status] ?? { label: b.status, color: "#98A1A6", bg: "rgba(152,161,166,.1)", dot: "#495154" };
              const isActive = UPCOMING.includes(b.status);
              return (
                <div key={b.id} style={{
                  background: cardBg, border: `1px solid ${isActive && b.status === "CONFIRMED" ? accentBrd : cardBorder}`,
                  borderRadius: 18, padding: "18px 20px", cursor: "pointer", transition: "all .15s",
                  boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = isActive ? accentBrd : cardHover; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = isLight ? "0 4px 16px rgba(0,0,0,.08)" : "0 4px 20px rgba(0,0,0,.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isActive && b.status === "CONFIRMED" ? accentBrd : cardBorder; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none"; }}
                  onClick={() => router.push(`/bookings/${b.id}`)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: `${meta.color}12`, border: `1px solid ${meta.color}30`, display: "grid", placeItems: "center", color: meta.color }}>
                      <Zap size={20} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.dot, display: "inline-block" }} />
                          {meta.label}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: textPrimary, marginBottom: 4 }}>
                        {b.charger?.label ?? "Charger"} &middot; {b.charger?.connector_type ?? "CCS2"} {b.charger?.power_kw ?? ""}kW
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: textSub, display: "flex", alignItems: "center", gap: 4 }}>
                          <Calendar size={11} strokeWidth={2} />
                          {b.slot_start ? formatSlot(b.slot_start) : ""}
                        </span>
                        {b.amount && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: textMuted }}>{fmtRupee(b.amount)}</span>}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {b.status === "CONFIRMED" && (
                        <button onClick={e => { e.stopPropagation(); router.push(`/qr/${b.id}`); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", borderRadius: 10, background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`, color: "#050708", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>
                          <QrCode size={13} strokeWidth={2.5} /> QR
                        </button>
                      )}
                      {b.status === "PENDING_PAYMENT" && (
                        <button onClick={e => { e.stopPropagation(); router.push(`/pay/${b.id}`); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", borderRadius: 10, background: "#FFC043", color: "#050708", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>
                          <CreditCard size={13} strokeWidth={2.5} /> Pay
                        </button>
                      )}
                      {b.status === "COMPLETED" && (
                        <button onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", borderRadius: 10, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Invoice
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !loadError && tab === "Past" && filtered.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 0", gap: 14 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, display: "grid", placeItems: "center", background: cardBg, border: `1px solid ${cardBorder}`, color: textMuted }}>
              <Battery size={30} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>No past sessions yet</p>
            <p style={{ fontSize: 14, color: textSub, textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>Complete a charging session and it will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
