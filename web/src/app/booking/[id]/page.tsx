"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { stations, bookings, Slot } from "@/lib/api";
import { checkAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

const DURATIONS = [30, 45, 60, 90];

function getNextDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short" }),
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    };
  });
}

function HoldTimer() {
  const [secs, setSecs] = useState(15 * 60);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    ref.current = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return (
    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#B7791F" }}>{m}:{s}</span>
  );
}

export default function BookingPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const { id: chargerId } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const stationId = sp.get("station") ?? "";

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [duration, setDuration] = useState(60);
  const [dayIdx, setDayIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [chargerLabel, setChargerLabel] = useState("Bay");
  const [pricePerKwh, setPricePerKwh] = useState(1800);
  const [connectorType, setConnectorType] = useState("CCS2");
  const [powerKw, setPowerKw] = useState(60);
  const [stationName, setStationName] = useState("");

  const days = getNextDays(5);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await stations.slots(chargerId);
      setSlots(data);
      const first = data.find(s => s.available);
      if (first) setSelectedSlot(first);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load available slots");
    } finally { setLoading(false); }
  }, [chargerId]);

  useEffect(() => {
    checkAuth().then(ok => { if (!ok) router.push("/login"); });
    if (stationId) {
      stations.get(stationId).then(s => {
        setStationName(s.name);
        const c = s.chargers?.find(ch => ch.id === chargerId);
        if (c) {
          setChargerLabel(c.label);
          setPricePerKwh(c.price_per_kwh);
          setConnectorType(c.connector_type);
          setPowerKw(c.power_kw);
        }
      }).catch(() => {});
    }
    loadSlots();
  }, [chargerId, stationId, router, loadSlots]);

  const estimatedKwh = (duration / 60) * powerKw;
  const estimatedAmount = Math.round(estimatedKwh * (pricePerKwh / 100));
  const bookingFee = 10;
  const total = estimatedAmount + bookingFee;

  const bg = isLight ? "#F3F7FB" : "#0A0D0E";
  const cardBg = isLight ? "#FFFFFF" : "#101415";
  const cardBorder = isLight ? "#CBD5E1" : "#222829";
  const raisedBg = isLight ? "#E8EEF5" : "#181D1F";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub = isLight ? "#334155" : "#98A1A6";
  const textMuted = isLight ? "#64748B" : "#6B7479";
  const disabledText = isLight ? "#94A3B8" : "#495154";
  const accent = isLight ? "#00B85E" : "#00E676";
  const accentSoft = isLight ? "#DDF8EA" : "#00532B";
  const accentBorder = isLight ? "#86EFAC" : "#00A455";
  const amberText = isLight ? "#9A5B00" : "#FFC043";

  async function createBooking() {
    if (!selectedSlot) return;
    setBooking(true); setError("");
    try {
      const b = await bookings.create(chargerId, selectedSlot.slot_start, duration);
      router.push(`/pay/${b.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Booking failed. Please try again.");
      setBooking(false);
    }
  }

  return (
    <div style={{ background: bg, color: textPrimary, minHeight: "100vh" }}>
      <NavBar />
      <div className="fade-up" style={{ maxWidth: 640, margin: "0 auto", padding: "36px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <button onClick={() => router.back()} style={{
            width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center",
            background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary,
            cursor: "pointer", fontSize: 16, flexShrink: 0,
          }}>{"<"}</button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>
              {chargerLabel} - {connectorType} {powerKw}kW
            </h2>
            <p style={{ color: textMuted, fontSize: 13 }}>
              {stationName || "Select slot and duration"}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: textMuted, marginBottom: 10 }}>Date</div>
          <div style={{ display: "flex", gap: 8 }}>
            {days.map((d, i) => (
              <button key={i} onClick={() => setDayIdx(i)} style={{
                flex: 1, padding: "10px 6px", borderRadius: 12, cursor: "pointer",
                background: dayIdx === i ? accentSoft : cardBg,
                border: `1.5px solid ${dayIdx === i ? accentBorder : cardBorder}`,
                color: dayIdx === i ? (isLight ? "#047857" : "#4DFFA6") : textMuted,
                transition: "all .15s",
                boxShadow: dayIdx === i && isLight ? "0 2px 10px rgba(0,184,94,.12)" : "none",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{d.label}</div>
                <div style={{ fontSize: 10, opacity: .85 }}>{d.date}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: textMuted, marginBottom: 10 }}>Available slots</div>
          {loading ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ width: 64, height: 36, borderRadius: 10, background: cardBg, border: `1px solid ${cardBorder}` }} />
              ))}
            </div>
          ) : error ? (
            <div style={{ padding: "16px", borderRadius: 12, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ color: "#D92D35", fontSize: 13 }}>Could not load slots - {error}</span>
              <button onClick={loadSlots} style={{ padding: "6px 14px", borderRadius: 8, background: raisedBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 12, cursor: "pointer" }}>Retry</button>
            </div>
          ) : slots.length === 0 ? (
            <div style={{ padding: "16px", borderRadius: 12, background: "rgba(255,192,67,.12)", border: "1px solid rgba(180,105,0,.28)", color: amberText, fontSize: 13 }}>
              No available slots for today. Try selecting another date.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {slots.map((s, i) => {
                const time = s.slot_start.includes("T")
                  ? new Date(s.slot_start).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
                  : s.slot_start;
                const selected = selectedSlot?.slot_start === s.slot_start;
                return (
                  <button key={i} onClick={() => s.available && setSelectedSlot(s)} style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: s.available ? "pointer" : "not-allowed",
                    opacity: s.available ? 1 : .45,
                    background: selected ? accentSoft : cardBg,
                    border: `1.5px solid ${selected ? accentBorder : cardBorder}`,
                    color: selected ? (isLight ? "#047857" : "#4DFFA6") : s.available ? textPrimary : disabledText,
                    boxShadow: selected ? (isLight ? "0 0 0 3px rgba(0,184,94,.14)" : "0 0 0 3px rgba(0,164,85,.15)") : "none",
                    transition: "all .15s",
                  }}>{time}</button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: textMuted, marginBottom: 10 }}>Duration</div>
          <div style={{
            display: "flex", gap: 4,
            background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 4,
          }}>
            {DURATIONS.map(d => (
              <button key={d} onClick={() => setDuration(d)} style={{
                flex: 1, padding: "11px 8px", borderRadius: 11,
                fontSize: 13, fontWeight: 700,
                background: duration === d ? raisedBg : "transparent",
                color: duration === d ? accent : textMuted,
                border: duration === d ? `1px solid ${cardBorder}` : "1px solid transparent",
                cursor: "pointer", transition: "all .2s",
              }}>{d}m</button>
            ))}
          </div>
        </div>

        <div style={{
          background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18,
          padding: "18px 20px", marginBottom: selectedSlot ? 16 : 24,
          boxShadow: isLight ? "0 8px 24px rgba(15,23,42,.06)" : "none",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: textMuted, marginBottom: 14 }}>Order summary</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: textSub }}>Energy ~{estimatedKwh.toFixed(0)} kWh</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>Rs {estimatedAmount.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: textSub }}>Booking fee</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>Rs {bookingFee}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: textSub }}>Rate</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: textMuted }}>Rs {(pricePerKwh / 100).toFixed(0)}/kWh</span>
            </div>
          </div>
          <div style={{ height: 1, background: cardBorder, margin: "14px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ fontSize: 15 }}>Total</b>
            <b style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 26 }}>Rs {total.toLocaleString("en-IN")}</b>
          </div>
        </div>

        {selectedSlot && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
            padding: "12px 16px", borderRadius: 12,
            background: "rgba(255,192,67,.12)", border: "1px solid rgba(180,105,0,.28)",
          }}>
            <span style={{ fontSize: 16 }}>Hold</span>
            <span style={{ fontSize: 13, color: amberText }}>Slot held for </span>
            <HoldTimer />
            <span style={{ fontSize: 13, color: textSub, marginLeft: 4 }}>- Complete payment to confirm</span>
          </div>
        )}

        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, marginBottom: 16,
            background: "rgba(255,90,95,.1)", border: "1px solid rgba(255,90,95,.3)",
            color: "#D92D35", fontSize: 13,
          }}>{error}</div>
        )}

        <button
          onClick={createBooking}
          disabled={!selectedSlot || booking}
          className={selectedSlot && !booking ? "pulse-glow" : ""}
          style={{
            width: "100%", padding: "18px 20px", borderRadius: 14,
            background: (!selectedSlot || booking) ? raisedBg : accent,
            color: (!selectedSlot || booking) ? textMuted : "#050708",
            fontSize: 16, fontWeight: 700, border: "none",
            cursor: (!selectedSlot || booking) ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background .15s",
          }}>
          {booking
            ? <><span className="spinner" />Creating booking...</>
            : selectedSlot
              ? `Continue to pay - Rs ${total.toLocaleString("en-IN")} ->`
              : "Select a slot to continue"}
        </button>

        <p style={{ fontSize: 11, color: textMuted, textAlign: "center", marginTop: 14 }}>
          Your slot is held for 15 minutes - Cancel any time before check-in
        </p>
      </div>
    </div>
  );
}
