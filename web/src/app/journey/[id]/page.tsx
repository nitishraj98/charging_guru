"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import { routes, Journey } from "@/lib/api";

const STATUS_META = {
  pending:     { color: "#FFC043", bg: "rgba(255,192,67,.12)", label: "Pending" },
  confirmed:   { color: "#4DFFA6", bg: "rgba(0,230,118,.1)",  label: "Confirmed" },
  checked_in:  { color: "#22D3EE", bg: "rgba(34,211,238,.1)", label: "At Charger" },
  completed:   { color: "#6B7479", bg: "rgba(107,116,121,.1)", label: "Done" },
};

function QRStub({ seed, size = 100 }: { seed: string; size?: number }) {
  const bits = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      if ((r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3)) return 1;
      return seed.charCodeAt((r * 9 + c) % seed.length) % 2;
    })
  );
  return (
    <svg viewBox="0 0 9 9" width={size} height={size} shapeRendering="crispEdges">
      <rect width="9" height="9" fill="#050708"/>
      {bits.map((row, r) => row.map((bit, c) => bit ? (
        <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#00E676"/>
      ) : null))}
    </svg>
  );
}

export default function JourneyDetailPage() {
  const router = useRouter();
  const { id }  = useParams<{ id: string }>();
  const { isLight } = useTheme();

  const [journey, setJourney]   = useState<Journey | null>(null);
  const [loading, setLoading]   = useState(true);
  const [activeStop, setActiveStop] = useState(0);

  const bg          = isLight ? "#F8FAFC" : "#0A0D0E";
  const cardBg      = isLight ? "#FFFFFF" : "#101415";
  const cardBorder  = isLight ? "#E2E8F0" : "#222829";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#6B7479";
  const textMuted   = isLight ? "#94A3B8" : "#495154";
  const accent      = isLight ? "#00D26A" : "#00E676";
  const accentDim   = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBorder = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";
  const raisedBg    = isLight ? "#F1F5F9" : "#181D1F";

  useEffect(() => {
    routes.get(id)
      .then(j => { setJourney(j); })
      .catch(() => setJourney(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: cardBorder, borderTopColor: accent }} />
      </div>
    </div>
  );

  if (!journey) return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ padding: 40, color: "#FF5A5F" }}>Journey not found.</div>
    </div>
  );

  const stop = journey.stops[activeStop];
  const meta = stop ? STATUS_META[stop.status] ?? STATUS_META.pending : null;
  const nextStop = journey.stops.find(s => s.status === "pending" || s.status === "confirmed");

  return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />

      <div className="fade-up" style={{ maxWidth: 760, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <button onClick={() => router.push("/trips")} style={{
            width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center",
            background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, cursor: "pointer", fontSize: 16, flexShrink: 0,
          }}>←</button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", color: textPrimary, marginBottom: 2 }}>
              {journey.source} → {journey.destination}
            </h2>
            <p style={{ color: textSub, fontSize: 13 }}>
              {journey.vehicle_label} · {journey.total_distance_km} km · {journey.stops.length} stop{journey.stops.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Next stop alert */}
        {nextStop && (
          <div style={{
            background: accentDim, border: `1px solid ${accentBorder}`,
            borderRadius: 16, padding: "16px 20px", marginBottom: 24,
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>⚡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: textPrimary, marginBottom: 2 }}>Next: {nextStop.station_name}</div>
              <div style={{ fontSize: 12, color: textSub }}>{nextStop.charge_time_min} min charge · {nextStop.distance_from_start_km} km from start</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>RESERVED</span>
          </div>
        )}

        <div className="journey-layout" style={{ gap: 20, alignItems: "start" }}>
          {/* Left: stop tabs + QR */}
          <div>
            {/* Stop selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
              {journey.stops.map((s, i) => {
                const m = STATUS_META[s.status] ?? STATUS_META.pending;
                return (
                  <button key={s.id} onClick={() => setActiveStop(i)} style={{
                    padding: "10px 16px", borderRadius: 12, flexShrink: 0,
                    background: activeStop === i ? accentDim : cardBg,
                    border: `1.5px solid ${activeStop === i ? accentBorder : cardBorder}`,
                    color: activeStop === i ? accent : textSub,
                    fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                  }}>
                    Stop {i + 1}
                    <span style={{ marginLeft: 6, padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color }}>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {stop && (
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, overflow: "hidden" }}>
                {/* Stop header */}
                <div style={{
                  background: isLight ? "linear-gradient(135deg,#F0FDF4,#ECFDF5)" : "linear-gradient(135deg,#0E2A1C,#101415)",
                  padding: "18px 22px", borderBottom: `1px solid ${accentBorder}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: accent, marginBottom: 4 }}>STOP {activeStop + 1} OF {journey.stops.length}</div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: textPrimary }}>{stop.station_name}</div>
                      <div style={{ fontSize: 12, color: textSub, marginTop: 3 }}>{stop.charge_time_min} min · Arrival {stop.arrival_battery_pct}%</div>
                    </div>
                    {meta && (
                      <span style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, color: meta.color, background: meta.bg }}>
                        {meta.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* QR */}
                <div style={{ padding: "28px 22px", display: "flex", justifyContent: "center", background: "#050708" }}>
                  <div style={{ padding: 12, background: "#050708", borderRadius: 14, border: "1px solid #181D1F" }}>
                    {stop.qr_token
                      ? <QRStub seed={stop.qr_token} size={160} />
                      : <QRStub seed={`${stop.id}-fallback`} size={160} />}
                  </div>
                </div>

                {/* Stop details */}
                <div style={{ padding: "18px 22px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                    {[
                      { label: "Arrival battery", val: `${stop.arrival_battery_pct}%` },
                      { label: "Charge time", val: `${stop.charge_time_min} min` },
                      { label: "Distance", val: `${stop.distance_from_start_km} km from start` },
                      { label: "Status", val: STATUS_META[stop.status]?.label ?? stop.status },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ fontSize: 10, color: textMuted, marginBottom: 3 }}>{s.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: accentDim, border: `1px solid ${accentBorder}` }}>
                    <p style={{ fontSize: 11, color: isLight ? "#16A34A" : "#4DFFA6", textAlign: "center" }}>
                      Show to operator · Single use · Valid 24h
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: journey timeline */}
          <div className="journey-sidebar">
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 16 }}>Journey Timeline</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {/* Origin */}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22D3EE", boxShadow: "0 0 8px rgba(34,211,238,.5)" }} />
                    <div style={{ width: 2, height: 24, background: cardBorder, margin: "3px 0" }} />
                  </div>
                  <div style={{ paddingBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>{journey.source}</div>
                    <div style={{ fontSize: 11, color: textMuted }}>Start</div>
                  </div>
                </div>

                {/* Stops */}
                {journey.stops.map((s, i) => {
                  const m = STATUS_META[s.status] ?? STATUS_META.pending;
                  const isLast = i === journey.stops.length - 1;
                  return (
                    <div key={s.id}>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: m.color, border: `2px solid ${m.color}40`, transition: "all .2s" }} />
                          {!isLast && <div style={{ width: 2, height: 24, background: cardBorder, margin: "3px 0" }} />}
                        </div>
                        <div style={{ paddingBottom: isLast ? 0 : 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>⚡ {s.city}</div>
                          <div style={{ fontSize: 11, color: textSub }}>{s.charge_time_min} min · <span style={{ color: m.color }}>{m.label}</span></div>
                        </div>
                      </div>
                      {!isLast && (
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                            <div style={{ width: 2, height: 16, background: cardBorder }} />
                          </div>
                          <div />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Destination */}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 4 }}>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}80` }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>{journey.destination}</div>
                    <div style={{ fontSize: 11, color: textMuted }}>Destination</div>
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: cardBorder, margin: "16px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 10, color: textMuted }}>Total paid</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 16, color: textPrimary }}>
                    ₹{(journey.total_amount_paise / 100).toLocaleString("en-IN")}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: textMuted }}>Status</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: journey.status === "completed" ? "#6B7479" : accent, textTransform: "capitalize" }}>{journey.status.replace("_", " ")}</div>
                </div>
              </div>
            </div>

            <button onClick={() => router.push("/plan")} style={{
              width: "100%", marginTop: 12, padding: "12px", borderRadius: 12,
              background: raisedBg, border: `1px solid ${cardBorder}`,
              color: textSub, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Plan another journey →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
