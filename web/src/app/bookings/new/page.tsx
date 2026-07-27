"use client";
import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { stations, bookings, Station, Charger, Slot, SlotStatus } from "@/lib/api";
import { checkAuth } from "@/lib/auth";
import { useStationSocket } from "@/hooks/useStationSocket";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import { Zap, Clock, ChevronRight, Calendar, ArrowLeft, SearchX, IndianRupee } from "lucide-react";

const DURATIONS = [
  { mins: 30,  label: "30 min" },
  { mins: 60,  label: "1 hr"   },
  { mins: 90,  label: "1.5 hr" },
  { mins: 120, label: "2 hr"   },
];

const POLL_INTERVAL_MS = 18_000;

function BookingNewInner() {
  const router    = useRouter();
  const params    = useSearchParams();
  const chargerIdParam = params.get("charger") ?? "";
  const stationId = params.get("station") ?? "";
  const { isLight } = useTheme();

  const [station,  setStation]  = useState<Station | null>(null);
  const [charger,  setCharger]  = useState<Charger | null>(null);
  const [slots,    setSlots]    = useState<Slot[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [duration, setDuration] = useState(60);
  const [loading,  setLoading]  = useState(true);
  const [booking,  setBooking]  = useState(false);
  const [error,    setError]    = useState("");

  const cardBg     = isLight ? "#FFFFFF"              : "#101415";
  const cardBorder = isLight ? "#CBD5E1"              : "#1E2426";
  const raisedBg   = isLight ? "#F1F5F9"              : "#181D1F";
  const textPrimary= isLight ? "#0F172A"              : "#E6EBED";
  const textSub    = isLight ? "#64748B"              : "#6B7479";
  const textMuted  = isLight ? "#64748B"              : "#495154";
  const accent     = isLight ? "#00D26A"              : "#00E676";
  const accentDim  = isLight ? "rgba(0,210,106,.08)" : "rgba(0,230,118,.07)";
  const accentBrd  = isLight ? "rgba(0,210,106,.30)" : "rgba(0,230,118,.22)";

  // Per-status visual treatment for the slot grid — only AVAILABLE is
  // selectable; the rest communicate *why* a slot can't be picked instead of
  // just disappearing, per the "show state, don't just hide" requirement.
  const STATUS_META: Record<SlotStatus, { label: string; dot: string; bg: string; border: string; fg: string; selectable: boolean }> = {
    AVAILABLE: { label: "",           dot: accent,                          bg: raisedBg, border: cardBorder, fg: textSub,   selectable: true  },
    HELD:      { label: "Held",       dot: isLight ? "#D97706" : "#FFC043", bg: isLight ? "rgba(217,119,6,.08)" : "rgba(255,192,67,.06)", border: isLight ? "rgba(217,119,6,.25)" : "rgba(255,192,67,.20)", fg: isLight ? "#D97706" : "#FFC043", selectable: false },
    BOOKED:    { label: "Booked",     dot: "#EF4444",                       bg: isLight ? "rgba(239,68,68,.06)" : "rgba(239,68,68,.05)", border: isLight ? "rgba(239,68,68,.20)" : "rgba(239,68,68,.16)", fg: "#EF4444", selectable: false },
    OFFLINE:   { label: "Offline",    dot: textMuted,                       bg: raisedBg, border: cardBorder, fg: textMuted, selectable: false },
    PAST:      { label: "",           dot: textMuted,                       bg: "transparent",                              border: cardBorder, fg: textMuted, selectable: false },
  };

  const refetchSlots = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!chargerIdParam) return;
    if (!opts.silent) setLoading(true);
    try {
      const sl = await stations.slots(chargerIdParam, undefined, duration);
      setSlots(sl);
      setSelected(prev => {
        if (prev) {
          const still = sl.find(s => s.slot_start === prev);
          if (still?.available) return prev;
        }
        return sl.find(s => s.available)?.slot_start ?? "";
      });
      if (!opts.silent) setError("");
    } catch (e: unknown) {
      if (!opts.silent) setError(e instanceof Error ? e.message : "Failed to load available slots.");
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, [chargerIdParam, duration]);

  useEffect(() => {
    checkAuth().then(ok => { if (!ok) router.push("/login"); });
  }, [router]);

  useEffect(() => {
    if (!stationId || !chargerIdParam) { setError("Missing charger or station."); setLoading(false); return; }
    stations.get(stationId).then(st => {
      setStation(st);
      setCharger(st.chargers?.find(c => c.id === chargerIdParam) ?? null);
    }).catch(() => {});
  }, [stationId, chargerIdParam]);

  useEffect(() => { refetchSlots(); }, [refetchSlots]);

  // Returning here via router.back() (e.g. backing out of /pay after
  // releasing a hold) restores this page from Next's client router cache
  // instead of remounting it, so the mount-time refetchSlots() above never
  // re-runs and the grid keeps showing the stale HELD state for the slot the
  // hold was just released from. "pageshow" fires on that restore (both the
  // bfcache case and the router-cache case) as well as on a normal fresh
  // load, so re-fetching there closes the gap without double-fetching on
  // first mount in practice (it lands effectively simultaneously with it).
  useEffect(() => {
    function onPageShow() { refetchSlots({ silent: true }); }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [refetchSlots]);

  // Live updates: instant via WS when available, ~18s poll as a fallback for
  // dropped sockets or the case where the sweep beat the socket to it.
  useStationSocket(stationId, (msg) => {
    if (msg?.type === "slot_update" && msg?.charger_id === chargerIdParam) {
      refetchSlots({ silent: true });
    }
  });
  useEffect(() => {
    const id = setInterval(() => refetchSlots({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refetchSlots]);

  async function handleBook() {
    if (!selected) { setError("Please select a slot."); return; }
    setBooking(true); setError("");
    try {
      const b = await bookings.create(chargerIdParam, selected, duration);
      router.push(`/pay/${b.id}`);
    } catch (e: unknown) {
      const code = (e as { body?: { code?: string } })?.body?.code;
      if (code === "SLOT_UNAVAILABLE") {
        setError("Sorry, this slot has just been reserved by another user.");
      } else if (code === "LOCK_CONTENDED") {
        setError("This charger is under heavy demand right now. Please try again in a moment.");
      } else {
        setError(e instanceof Error ? e.message : "Failed to create booking.");
      }
      refetchSlots({ silent: true });
      setBooking(false);
    }
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
  }
  const estCost = charger ? ((charger.price_per_kwh/100) * charger.power_kw * (duration/60)) : 0;
  const availableCount = slots.filter(s => s.available).length;

  if (loading) return (
    <div style={{ background: isLight?"#F3F7FB":"#080B0C", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${cardBorder}`, borderTopColor: accent, animation: "spin .8s linear infinite" }}/>
        <span style={{ color: textSub, fontSize: 14 }}>Loading available slots…</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: isLight?"#F3F7FB":"#080B0C", minHeight: "100vh", fontFamily: "'Space Grotesk',system-ui,sans-serif", position: "relative" }}>
      {/* Decorative glow — matches the premium background language used across Plan/Station pages */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -160, left: "50%", transform: "translateX(-50%)", width: 640, height: 420, borderRadius: "50%", background: `radial-gradient(circle, ${accent}${isLight?"14":"09"} 0%, transparent 70%)` }}/>
      </div>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fade-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .bk-fade{animation:fade-up .45s cubic-bezier(.16,1,.3,1) both}
        .slot-btn{transition:all .15s cubic-bezier(.16,1,.3,1)}
        .slot-btn:hover:not(:disabled){transform:translateY(-1px)}
        .dur-btn{transition:all .15s}
        .bk-cta{transition:all .22s cubic-bezier(.16,1,.3,1)}
        .bk-cta:hover:not(:disabled){transform:translateY(-2px);box-shadow:${isLight?"0 8px 32px rgba(0,210,106,.45)":"0 0 40px rgba(0,230,118,.28)"} !important}
        .bk-back{transition:all .15s}
        .bk-back:hover{border-color:${accentBrd} !important;color:${accent} !important;background:${accentDim} !important}
      `}</style>
      <NavBar />

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px 100px", position: "relative", zIndex: 1 }}>

        {/* Back */}
        <button onClick={() => router.back()} className="bk-back" style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, color: textSub, fontSize: 12.5, fontWeight: 600, cursor: "pointer", marginBottom: 22, padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
          <ArrowLeft size={13}/> Back to station
        </button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: textPrimary, letterSpacing: "-.02em", marginBottom: 4 }}>Book Your Slot</h1>
          <p style={{ fontSize: 13, color: textSub }}>Pick your duration, then a time — pay on the next step.</p>
        </div>

        {/* Station + charger info */}
        {station && charger && (
          <div className="bk-fade" style={{ background: isLight?"linear-gradient(135deg,#F0FDF4,#ECFDF5)":"linear-gradient(135deg,#091A0F,#101415)", border: `1px solid ${accentBrd}`, borderRadius: 20, padding: "18px 20px", marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: isLight?"#16A34A":"rgba(0,230,118,.55)", marginBottom: 10, textTransform: "uppercase" }}>You&apos;re booking</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: accentDim, border: `1px solid ${accentBrd}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Zap size={22} color={accent} fill={accent}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: textPrimary, marginBottom: 3 }}>{charger.label} · {charger.connector_type}</div>
                <div style={{ fontSize: 13, color: textSub }}>{station.name} · <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{charger.power_kw} kW</span> · ₹{(charger.price_per_kwh/100).toFixed(0)}/kWh</div>
              </div>
              <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: accent, background: accentDim, border: `1px solid ${accentBrd}`, flexShrink: 0 }}>{charger.charger_type}</span>
            </div>
          </div>
        )}

        <div className="bk-fade">
          {/* Duration picker — first, since it controls which slots can even fit */}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Clock size={14} color={accent}/>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted }}>Duration</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {DURATIONS.map(d => {
                const isAct = duration === d.mins;
                return (
                  <button key={d.mins} className="dur-btn" onClick={() => setDuration(d.mins)} style={{ padding: "12px 6px", borderRadius: 13, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center", background: isAct?accentDim:raisedBg, border: `1.5px solid ${isAct?accentBrd:cardBorder}`, color: isAct?accent:textSub }}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot picker */}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Calendar size={14} color={accent}/>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted }}>Select time slot</span>
              {slots[0] && <span style={{ marginLeft: "auto", fontSize: 12, color: textSub }}>{fmtDate(slots[0].slot_start)}</span>}
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14, fontSize: 10.5, color: textMuted }}>
              {([
                ["AVAILABLE", "Available"], ["HELD", "Held"], ["BOOKED", "Booked"], ["OFFLINE", "Offline"], ["PAST", "Past"],
              ] as [SlotStatus, string][]).map(([key, label]) => (
                <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_META[key].dot, display: "inline-block" }}/>
                  {label}
                </span>
              ))}
            </div>

            {slots.length === 0 || availableCount === 0 ? (
              <div style={{ padding: "28px 0", textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: raisedBg, border: `1px solid ${cardBorder}`, display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
                  <SearchX size={22} color={textMuted}/>
                </div>
                <div style={{ fontWeight: 700, color: textPrimary, marginBottom: 6 }}>No slots available</div>
                <div style={{ fontSize: 13, color: textSub }}>All slots are taken for this duration. Try a shorter duration or another charger.</div>
                <button onClick={() => router.back()} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, background: raisedBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <ArrowLeft size={13}/> Go back
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {slots.map(s => {
                  const isSel = selected === s.slot_start;
                  const meta = STATUS_META[s.status];
                  return (
                    <button
                      key={s.slot_start}
                      className="slot-btn"
                      disabled={!meta.selectable}
                      onClick={() => meta.selectable && setSelected(s.slot_start)}
                      style={{
                        padding: "10px 6px", borderRadius: 13, fontSize: 13, fontWeight: 600,
                        cursor: meta.selectable ? "pointer" : "not-allowed", textAlign: "center",
                        background: isSel ? accentDim : meta.bg,
                        border: `1.5px solid ${isSel ? accentBrd : meta.border}`,
                        color: isSel ? accent : meta.fg,
                        opacity: meta.selectable ? 1 : 0.7,
                        boxShadow: isSel ? (!isLight ? "0 0 16px rgba(0,230,118,.12)" : "0 0 0 3px rgba(0,210,106,.12)") : "none",
                      }}>
                      {fmt(s.slot_start)}
                      {isSel ? (
                        <div style={{ fontSize: 9, marginTop: 3, color: accent, letterSpacing: ".06em" }}>SELECTED</div>
                      ) : meta.label ? (
                        <div style={{ fontSize: 9, marginTop: 3, letterSpacing: ".06em" }}>{meta.label.toUpperCase()}</div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Compact summary + CTA */}
          {availableCount > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderRadius: 18, background: isLight?"#F0FDF4":"rgba(0,230,118,.04)", border: `1px solid ${accentBrd}`, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: accentDim, border: `1px solid ${accentBrd}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Clock size={16} color={accent}/>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{selected ? `${fmt(selected)} · ${duration} min` : "—"}</div>
                    <div style={{ fontSize: 11, color: textSub, marginTop: 2 }}>You&apos;ll have 5 minutes to pay once you reserve this slot</div>
                  </div>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 800, color: accent }}>
                  <IndianRupee size={18} strokeWidth={2.5}/>{estCost.toFixed(0)}
                </span>
              </div>

              {error && (
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.22)", color: "#FF5A5F", fontSize: 13, marginBottom: 16 }}>{error}</div>
              )}

              <button onClick={handleBook} disabled={!selected || booking} className="bk-cta" style={{ width: "100%", padding: "19px", borderRadius: 16, background: (!selected||booking)?(isLight?"#CBD5E1":"#1A2218"):`linear-gradient(135deg,${accent},${isLight?"#00A855":"#00C862"})`, color: (!selected||booking)?textSub:"#050708", fontSize: 16, fontWeight: 800, border: "none", cursor: (!selected||booking)?"not-allowed":"pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: (!selected||booking)?"none":isLight?"0 6px 24px rgba(0,210,106,.40)":"0 0 32px rgba(0,230,118,.22)" }}>
                {booking ? (
                  <><span style={{ width: 18, height: 18, borderRadius: "50%", border: `2.5px solid ${textSub}`, borderTopColor: "transparent", display: "inline-block", animation: "spin .7s linear infinite" }}/> Reserving slot…</>
                ) : (
                  <>Confirm & Pay ₹{estCost.toFixed(0)} <ChevronRight size={15}/></>
                )}
              </button>
              <p style={{ textAlign: "center", fontSize: 11, color: textMuted, marginTop: 10 }}>No charge until payment confirmed on the next step</p>
            </>
          )}
          {availableCount === 0 && error && (
            <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.22)", color: "#FF5A5F", fontSize: 13 }}>{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingNewPage() {
  return (
    <Suspense fallback={null}>
      <BookingNewInner />
    </Suspense>
  );
}
