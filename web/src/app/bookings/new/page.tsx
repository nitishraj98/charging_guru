"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { stations, bookings, Station, Charger, Slot } from "@/lib/api";
import { checkAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import { Zap, Clock, ChevronRight, Calendar, Check } from "lucide-react";

const DURATIONS = [
  { mins: 30,  label: "30 min" },
  { mins: 60,  label: "1 hr"   },
  { mins: 90,  label: "1.5 hr" },
  { mins: 120, label: "2 hr"   },
];

function StepBadge({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  const accent = "#00E676";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, background: done ? accent : active ? "rgba(0,230,118,.15)" : "rgba(255,255,255,.05)", border: `1.5px solid ${done||active ? accent : "rgba(255,255,255,.12)"}`, color: done ? "#050708" : active ? accent : "#495154", transition: "all .2s" }}>
        {done ? <Check size={13}/> : n}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: done||active ? (done?"#4DFFA6":"#E6EBED") : "#495154", letterSpacing: ".01em" }}>{label}</span>
    </div>
  );
}

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
  const [step,     setStep]     = useState<1|2>(1);
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

  useEffect(() => {
    checkAuth().then(ok => { if (!ok) router.push("/login"); });
  }, [router]);

  useEffect(() => {
    if (!stationId || !chargerIdParam) { setError("Missing charger or station."); setLoading(false); return; }
    Promise.all([stations.get(stationId), stations.slots(chargerIdParam)])
      .then(([st, sl]) => {
        setStation(st);
        setCharger(st.chargers?.find(c => c.id === chargerIdParam) ?? null);
        const avail = sl.filter(s => s.available);
        setSlots(avail);
        if (avail.length > 0) setSelected(avail[0].slot_start);
      })
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, [stationId, chargerIdParam]);

  async function handleBook() {
    if (!selected) { setError("Please select a slot."); return; }
    setBooking(true); setError("");
    try {
      const b = await bookings.create(chargerIdParam, selected, duration);
      router.push(`/bookings/${b.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create booking.");
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
    <div style={{ background: isLight?"#F3F7FB":"#080B0C", minHeight: "100vh", fontFamily: "'Space Grotesk',system-ui,sans-serif" }}>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fade-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .bk-fade{animation:fade-up .45s cubic-bezier(.16,1,.3,1) both}
        .slot-btn{transition:all .15s cubic-bezier(.16,1,.3,1)}
        .slot-btn:hover{transform:translateY(-1px)}
        .dur-btn{transition:all .15s}
        .bk-cta{transition:all .22s cubic-bezier(.16,1,.3,1)}
        .bk-cta:hover:not(:disabled){transform:translateY(-2px);box-shadow:${isLight?"0 8px 32px rgba(0,210,106,.45)":"0 0 40px rgba(0,230,118,.28)"} !important}
      `}</style>
      <NavBar />

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px 100px" }}>

        {/* Back */}
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: textSub, fontSize: 13, cursor: "pointer", marginBottom: 28, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to station
        </button>

        {/* Step progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "14px 20px" }}>
          <StepBadge n={1} label="Pick slot" active={step===1} done={step>1}/>
          <div style={{ flex: 1, height: 1.5, background: step>1?accent:cardBorder, margin: "0 12px", transition: "background .3s" }}/>
          <StepBadge n={2} label="Confirm" active={step===2} done={false}/>
          <div style={{ flex: 1, height: 1.5, background: cardBorder, margin: "0 12px" }}/>
          <StepBadge n={3} label="Payment" active={false} done={false}/>
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

        {/* ── STEP 1: Slot + duration ── */}
        {step === 1 && (
          <div className="bk-fade">
            {/* Slot picker */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Calendar size={14} color={accent}/>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted }}>Select time slot</span>
                {selected && <span style={{ marginLeft: "auto", fontSize: 12, color: textSub }}>{fmtDate(selected)}</span>}
              </div>

              {slots.length === 0 ? (
                <div style={{ padding: "28px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>😔</div>
                  <div style={{ fontWeight: 700, color: textPrimary, marginBottom: 6 }}>No slots available</div>
                  <div style={{ fontSize: 13, color: textSub }}>All slots are taken. Try another charger.</div>
                  <button onClick={() => router.back()} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, background: raisedBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 13, cursor: "pointer" }}>← Go back</button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {slots.map(s => {
                    const isSel = selected === s.slot_start;
                    return (
                      <button key={s.slot_start} className="slot-btn" onClick={() => setSelected(s.slot_start)} style={{ padding: "12px 6px", borderRadius: 13, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center", background: isSel?accentDim:raisedBg, border: `1.5px solid ${isSel?accentBrd:cardBorder}`, color: isSel?accent:textSub, boxShadow: isSel?(!isLight?"0 0 16px rgba(0,230,118,.12)":"0 0 0 3px rgba(0,210,106,.12)"):"none" }}>
                        {fmt(s.slot_start)}
                        {isSel && <div style={{ fontSize: 9, marginTop: 3, color: accent, letterSpacing: ".06em" }}>SELECTED</div>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Duration picker */}
            {slots.length > 0 && (
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px", marginBottom: 24 }}>
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
            )}

            {slots.length > 0 && (
              <button onClick={() => setStep(2)} className="bk-cta" style={{ width: "100%", padding: "17px", borderRadius: 16, background: selected?`linear-gradient(135deg,${accent},${isLight?"#00A855":"#00C862"})`:(isLight?"#CBD5E1":"#1A2218"), color: selected?"#050708":textSub, fontSize: 15, fontWeight: 800, border: "none", cursor: selected?"pointer":"not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: selected?isLight?"0 6px 24px rgba(0,210,106,.40)":"0 0 32px rgba(0,230,118,.22)":"none" }} disabled={!selected}>
                Continue → Review booking
              </button>
            )}
          </div>
        )}

        {/* ── STEP 2: Review + confirm ── */}
        {step === 2 && (
          <div className="bk-fade">
            {/* Order summary */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "16px 20px", background: raisedBg, borderBottom: `1px solid ${cardBorder}`, fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted }}>Order summary</div>
              {[
                { label: "Charger",   val: `${charger?.label} · ${charger?.connector_type}` },
                { label: "Station",   val: station?.name ?? "—" },
                { label: "Slot time", val: selected ? fmt(selected) : "—" },
                { label: "Date",      val: selected ? fmtDate(selected) : "—" },
                { label: "Duration",  val: `${duration} minutes` },
                { label: "Power",     val: `${charger?.power_kw} kW` },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 20px", borderBottom: i < arr.length-1?`1px solid ${cardBorder}`:"none" }}>
                  <span style={{ fontSize: 13, color: textSub }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{row.val}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: isLight?"#F0FDF4":"rgba(0,230,118,.04)", borderTop: `1px solid ${accentBrd}` }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>Estimated total</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 800, color: accent }}>₹{estCost.toFixed(0)}</span>
              </div>
            </div>

            {/* Hold note */}
            <div style={{ background: isLight?"#FFFBEB":"rgba(255,192,67,.06)", border: isLight?"1px solid #FDE68A":"1px solid rgba(255,192,67,.2)", borderRadius: 14, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⏳</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isLight?"#92400E":"#FFC043", marginBottom: 2 }}>Slot will be held for 10 minutes</div>
                <div style={{ fontSize: 12, color: textSub }}>Complete payment before the hold expires to confirm your booking.</div>
              </div>
            </div>

            {error && (
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.22)", color: "#FF5A5F", fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ padding: "16px 20px", borderRadius: 16, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>← Back</button>
              <button onClick={handleBook} disabled={booking} className="bk-cta" style={{ padding: "16px", borderRadius: 16, background: booking?(isLight?"#CBD5E1":"#1A2218"):`linear-gradient(135deg,${accent},${isLight?"#00A855":"#00C862"})`, color: booking?textSub:"#050708", fontSize: 15, fontWeight: 800, border: "none", cursor: booking?"not-allowed":"pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: booking?"none":isLight?"0 6px 24px rgba(0,210,106,.40)":"0 0 32px rgba(0,230,118,.22)" }}>
                {booking ? (
                  <><span style={{ width: 18, height: 18, borderRadius: "50%", border: `2.5px solid ${textSub}`, borderTopColor: "transparent", display: "inline-block", animation: "spin .7s linear infinite" }}/> Reserving slot…</>
                ) : (
                  <><Zap size={16} fill="#050708"/> Confirm & Hold Slot <ChevronRight size={15}/></>
                )}
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: 11, color: textMuted, marginTop: 10 }}>No charge until payment · Cancel anytime before payment</p>
          </div>
        )}
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
