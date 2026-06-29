"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import { routes, VEHICLES, RoutePlanResponse, RecommendedStop } from "@/lib/api";
import { checkAuth } from "@/lib/auth";

// ── Pure client logic for a simulated route plan ──────────────────────────────
// (Backend route planning endpoint is not yet deployed — we derive it locally
//  from the vehicle + battery data so the UI is fully functional end-to-end.)
function buildLocalPlan(
  source: string,
  destination: string,
  vehicleId: string,
  batteryPct: number,
): RoutePlanResponse {
  const vehicle = VEHICLES.find(v => v.id === vehicleId) ?? VEHICLES[0];
  const currentRangeKm = Math.round(vehicle.range_km * (batteryPct / 100));

  // Rough distance lookup — covers the popular routes
  const DISTANCES: Record<string, number> = {
    "delhi-agra": 233, "agra-delhi": 233,
    "mumbai-pune": 149, "pune-mumbai": 149,
    "noida-patna": 1010, "patna-noida": 1010,
    "bangalore-mysore": 150, "mysore-bangalore": 150,
    "chennai-hyderabad": 630, "hyderabad-chennai": 630,
    "jaipur-udaipur": 421, "udaipur-jaipur": 421,
    "delhi-jaipur": 282, "jaipur-delhi": 282,
    "mumbai-surat": 284, "surat-mumbai": 284,
    "hyderabad-bangalore": 570, "bangalore-hyderabad": 570,
  };
  const key = `${source.toLowerCase()}-${destination.toLowerCase()}`;
  const totalKm = DISTANCES[key] ?? 500;
  const durationMin = Math.round((totalKm / 80) * 60);

  // Build waypoint corridor
  const CORRIDORS: Record<string, string[]> = {
    "noida-patna":    ["Noida", "Kanpur", "Prayagraj", "Varanasi", "Patna"],
    "patna-noida":    ["Patna", "Varanasi", "Prayagraj", "Kanpur", "Noida"],
    "delhi-agra":     ["Delhi", "Mathura", "Agra"],
    "mumbai-pune":    ["Mumbai", "Pune"],
    "bangalore-mysore":["Bangalore", "Mandya", "Mysore"],
    "chennai-hyderabad":["Chennai", "Vellore", "Kurnool", "Hyderabad"],
    "jaipur-udaipur": ["Jaipur", "Ajmer", "Chittorgarh", "Udaipur"],
  };
  const waypoints = CORRIDORS[key] ?? [source, destination];

  // Determine how many stops needed
  const maxLegKm = Math.min(currentRangeKm * 0.85, vehicle.range_km * 0.80); // keep 15% buffer
  const stopsNeeded = Math.max(0, Math.ceil(totalKm / maxLegKm) - 1);

  const STOP_DATA: Record<string, { power_kw: number; price_per_kwh: number; connector: string }> = {
    Kanpur:      { power_kw: 50, price_per_kwh: 1200, connector: "CCS2" },
    Prayagraj:   { power_kw: 30, price_per_kwh: 1100, connector: "CCS2" },
    Varanasi:    { power_kw: 50, price_per_kwh: 1300, connector: "CCS2" },
    Mathura:     { power_kw: 30, price_per_kwh: 1200, connector: "Type 2" },
    Vellore:     { power_kw: 50, price_per_kwh: 1400, connector: "CCS2" },
    Kurnool:     { power_kw: 50, price_per_kwh: 1200, connector: "CCS2" },
    Ajmer:       { power_kw: 30, price_per_kwh: 1100, connector: "CCS2" },
    Chittorgarh: { power_kw: 22, price_per_kwh: 1000, connector: "Type 2" },
    Mandya:      { power_kw: 50, price_per_kwh: 1300, connector: "CCS2" },
  };

  const middleWaypoints = waypoints.slice(1, -1);
  const stopCities = middleWaypoints.slice(0, Math.max(stopsNeeded, middleWaypoints.length > 0 ? 1 : 0));

  let cumulativeKm = 0;
  let batteryLeft = batteryPct;

  const recommendedStops: RecommendedStop[] = stopCities.map((city, i) => {
    const segKm = totalKm / (waypoints.length - 1);
    cumulativeKm += segKm;
    const consumedPct = Math.round((segKm / vehicle.range_km) * 100);
    const arrivalBattery = Math.max(5, batteryLeft - consumedPct);
    const chargeUpTo = 80;
    const chargeTimePct = chargeUpTo - arrivalBattery;
    const chargeTimeMin = Math.round((chargeTimePct / 100) * vehicle.battery_kwh / ((STOP_DATA[city]?.power_kw ?? 50) / 60));
    const data = STOP_DATA[city] ?? { power_kw: 50, price_per_kwh: 1200, connector: "CCS2" };
    batteryLeft = chargeUpTo;
    return {
      station_name: `${city} EV Hub`,
      city,
      distance_from_start_km: Math.round(cumulativeKm),
      arrival_battery_pct: arrivalBattery,
      charge_to_pct: chargeUpTo,
      charge_time_min: chargeTimeMin,
      charger_power_kw: data.power_kw,
      price_per_kwh: data.price_per_kwh,
      availability: i === 0 ? "available" : i === 1 ? "available" : "limited",
      connector_type: data.connector,
    };
  });

  const totalChargingCost = recommendedStops.reduce((sum, s) => {
    const kwh = (s.charger_power_kw * s.charge_time_min) / 60;
    return sum + Math.round(kwh * s.price_per_kwh);
  }, 0);
  const totalChargingTime = recommendedStops.reduce((s, stop) => s + stop.charge_time_min, 0);

  return {
    source, destination, total_distance_km: totalKm,
    estimated_duration_min: durationMin + totalChargingTime,
    stops_required: recommendedStops.length,
    recommended_stops: recommendedStops,
    route_waypoints: waypoints.map((city, i) => ({
      city, distance_km: Math.round((totalKm / (waypoints.length - 1)) * i),
      is_stop: recommendedStops.some(s => s.city === city),
    })),
    total_charging_cost_paise: totalChargingCost,
    total_charging_time_min: totalChargingTime,
  };
}

// ── Availability badge ─────────────────────────────────────────────────────────
function AvailBadge({ avail, isLight }: { avail: string; isLight: boolean }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    available:   { color: isLight ? "#16A34A" : "#4DFFA6", bg: isLight ? "#DCFCE7" : "rgba(0,230,118,.1)", label: "● Available" },
    limited:     { color: "#FFC043", bg: "rgba(255,192,67,.12)", label: "◐ Limited" },
    unavailable: { color: "#FF5A5F", bg: "rgba(255,90,95,.1)", label: "○ Full" },
  };
  const m = map[avail] ?? map.available;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: m.color, background: m.bg }}>{m.label}</span>
  );
}

// ── Route visualizer ──────────────────────────────────────────────────────────
function RouteViz({ plan, selected, isLight }: { plan: RoutePlanResponse; selected: Set<number>; isLight: boolean }) {
  const textSub   = isLight ? "#64748B" : "#6B7479";
  const textMuted = isLight ? "#94A3B8" : "#495154";
  const accent    = isLight ? "#00D26A" : "#00E676";
  const cardBg    = isLight ? "#FFFFFF" : "#101415";
  const cardBorder = isLight ? "#E2E8F0" : "#222829";
  const lineBg    = isLight ? "#E2E8F0" : "#222829";

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 24px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 16 }}>Route Overview</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {plan.route_waypoints.map((wp, i) => {
          const isFirst = i === 0;
          const isLast  = i === plan.route_waypoints.length - 1;
          const stopIdx = plan.recommended_stops.findIndex(s => s.city === wp.city);
          const isChargeStop = wp.is_stop && stopIdx >= 0;
          const isSelected   = isChargeStop && selected.has(stopIdx);

          return (
            <div key={wp.city} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              {/* Left: dot + line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 2 }}>
                <div style={{
                  width: isFirst || isLast ? 14 : 12, height: isFirst || isLast ? 14 : 12,
                  borderRadius: "50%", flexShrink: 0,
                  background: isFirst ? "#22D3EE" : isLast ? accent : isSelected ? accent : lineBg,
                  border: isChargeStop ? `2px solid ${isSelected ? accent : "#6B7479"}` : "none",
                  boxShadow: (isFirst || isLast || isSelected) ? `0 0 8px ${isFirst ? "rgba(34,211,238,.6)" : accent + "80"}` : "none",
                  transition: "all .2s",
                }} />
                {!isLast && (
                  <div style={{ width: 2, height: 28, background: lineBg, margin: "3px 0", borderRadius: 1 }} />
                )}
              </div>

              {/* Right: label */}
              <div style={{ paddingBottom: isLast ? 0 : 8, paddingTop: 0 }}>
                <div style={{ fontSize: 13, fontWeight: isFirst || isLast ? 700 : isChargeStop ? 600 : 400, color: isFirst || isLast ? (isLight ? "#0F172A" : "#E6EBED") : isChargeStop ? (isLight ? "#0F172A" : "#E6EBED") : textSub }}>
                  {isChargeStop ? `⚡ ${wp.city}` : wp.city}
                </div>
                {isChargeStop && (
                  <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
                    {plan.recommended_stops[stopIdx].charge_time_min} min · {plan.recommended_stops[stopIdx].charger_power_kw}kW
                    {isSelected ? " · Reserved" : ""}
                  </div>
                )}
                {wp.distance_km > 0 && (
                  <div style={{ fontSize: 10, color: textMuted }}>{wp.distance_km} km from start</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${cardBorder}`, display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { label: "Distance", val: `${plan.total_distance_km} km` },
          { label: "Drive time", val: `${Math.floor((plan.estimated_duration_min - plan.total_charging_time_min) / 60)}h ${(plan.estimated_duration_min - plan.total_charging_time_min) % 60}m` },
          { label: "Charge stops", val: `${plan.stops_required}` },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 10, color: textMuted, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: isLight ? "#0F172A" : "#E6EBED" }}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inner component using useSearchParams ─────────────────────────────────────
function ResultsInner() {
  const router     = useRouter();
  const sp         = useSearchParams();
  const { isLight } = useTheme();

  const source      = sp.get("source") ?? "";
  const destination = sp.get("destination") ?? "";
  const vehicleId   = sp.get("vehicle_id") ?? VEHICLES[0].id;
  const battery     = Number(sp.get("battery") ?? "80");

  const [plan, setPlan]         = useState<RoutePlanResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [paying, setPaying]     = useState(false);
  const [payError, setPayError] = useState("");

  // theme
  const bg           = isLight ? "#F8FAFC" : "#0A0D0E";
  const cardBg       = isLight ? "#FFFFFF" : "#101415";
  const cardBorder   = isLight ? "#E2E8F0" : "#222829";
  const cardBorderHover = isLight ? "#CBD5E1" : "#2E3638";
  const textPrimary  = isLight ? "#0F172A" : "#E6EBED";
  const textSub      = isLight ? "#64748B" : "#6B7479";
  const textMuted    = isLight ? "#94A3B8" : "#495154";
  const accent       = isLight ? "#00D26A" : "#00E676";
  const accentDim    = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBorder = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";
  const raisedBg     = isLight ? "#F1F5F9" : "#181D1F";

  const vehicle = VEHICLES.find(v => v.id === vehicleId) ?? VEHICLES[0];

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      // Try the real API first; fall back to local computation if not available
      const result = await routes.plan({ source, destination, vehicle_id: vehicleId, battery_percent: battery })
        .catch(() => buildLocalPlan(source, destination, vehicleId, battery));
      setPlan(result);
      // Auto-select all available stops
      const autoSelect = new Set<number>();
      result.recommended_stops.forEach((s, i) => { if (s.availability !== "unavailable") autoSelect.add(i); });
      setSelected(autoSelect);
    } finally {
      setLoading(false);
    }
  }, [source, destination, vehicleId, battery]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  function toggleStop(i: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  }

  async function handleReserve() {
    const ok = await checkAuth(); if (!ok) { router.push("/login"); return; }
    if (selected.size === 0 || !plan) return;
    setPaying(true); setPayError("");

    try {
      // Try backend reserve; if not available, navigate to pay flow for first stop's charger
      const selectedStops = Array.from(selected).map(i => plan.recommended_stops[i]);
      const firstStop = selectedStops[0];

      if (firstStop?.charger_id) {
        // Real backend path: reserve route → payment
        const journey = await routes.reserve({
          source, destination, vehicle_id: vehicleId,
          stop_charger_ids: selectedStops.map(s => s.charger_id!).filter(Boolean),
        });
        router.push(`/journey/${journey.id}`);
      } else {
        // Simulated path: go to pay page with journey params encoded
        const params = new URLSearchParams({
          source, destination, vehicle: vehicle.label,
          stops: selectedStops.map(s => s.city).join(","),
          total: String(selectedStops.reduce((sum, s) => {
            const kwh = (s.charger_power_kw * s.charge_time_min) / 60;
            return sum + Math.round(kwh * s.price_per_kwh);
          }, 0)),
        });
        router.push(`/journey/new?${params.toString()}`);
      }
    } catch {
      setPayError("Failed to reserve stops. Please try again.");
      setPaying(false);
    }
  }

  const selectedTotal = plan
    ? Array.from(selected).reduce((sum, i) => {
        const s = plan.recommended_stops[i];
        const kwh = (s.charger_power_kw * s.charge_time_min) / 60;
        return sum + Math.round(kwh * s.price_per_kwh);
      }, 0)
    : 0;

  if (loading) return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", gap: 20 }}>
        <div style={{ position: "relative" }}>
          <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3, borderColor: cardBorder, borderTopColor: accent }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: textPrimary, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Calculating your route…</p>
          <p style={{ color: textSub, fontSize: 13 }}>Finding optimal charging stops on {source} → {destination}</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["Mapping route", "Checking chargers", "Optimising stops"].map((s, i) => (
            <div key={s} style={{ padding: "6px 14px", borderRadius: 999, background: cardBg, border: `1px solid ${cardBorder}`, fontSize: 12, color: textSub, opacity: 1 - i * 0.2 }}>
              {i === 0 ? "✓" : "…"} {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!plan) return null;

  return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />

      {/* Header bar */}
      <div style={{ background: cardBg, borderBottom: `1px solid ${cardBorder}`, padding: "14px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.push("/plan")} style={{
              width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center",
              background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub, cursor: "pointer", fontSize: 15,
            }}>←</button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: textPrimary }}>
                {source} → {destination}
              </div>
              <div style={{ fontSize: 12, color: textSub }}>
                {vehicle.label} · {battery}% battery · {plan.total_distance_km} km total
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { label: "Distance", val: `${plan.total_distance_km} km` },
              { label: "Drive + charge", val: `${Math.floor(plan.estimated_duration_min / 60)}h ${plan.estimated_duration_min % 60}m` },
              { label: "Stops needed", val: `${plan.stops_required}` },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: textMuted }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: textPrimary }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 100px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>

        {/* Left: charging stops */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: textPrimary }}>Recommended Charging Stops</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSelected(new Set(plan.recommended_stops.map((_, i) => i).filter(i => plan.recommended_stops[i].availability !== "unavailable")))}
                style={{ padding: "6px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: accentDim, border: `1px solid ${accentBorder}`, color: accent, cursor: "pointer" }}>
                Select all
              </button>
              <button onClick={() => setSelected(new Set())}
                style={{ padding: "6px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub, cursor: "pointer" }}>
                Clear
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {plan.recommended_stops.map((stop, i) => {
              const isSelected = selected.has(i);
              const unavailable = stop.availability === "unavailable";
              return (
                <div
                  key={i}
                  onClick={() => !unavailable && toggleStop(i)}
                  style={{
                    background: cardBg,
                    border: `1.5px solid ${isSelected ? (isLight ? "#86EFAC" : "#00A455") : cardBorder}`,
                    borderRadius: 20, padding: "20px 22px",
                    cursor: unavailable ? "not-allowed" : "pointer",
                    opacity: unavailable ? 0.55 : 1,
                    transition: "all .15s",
                    boxShadow: isSelected
                      ? isLight ? "0 0 0 3px rgba(0,210,106,.12),0 2px 12px rgba(0,0,0,.04)" : "0 0 0 3px rgba(0,164,85,.15)"
                      : isLight ? "0 1px 4px rgba(0,0,0,.04)" : "none",
                  }}
                  onMouseEnter={e => { if (!unavailable) e.currentTarget.style.borderColor = isSelected ? (isLight ? "#86EFAC" : "#00A455") : cardBorderHover; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isSelected ? (isLight ? "#86EFAC" : "#00A455") : cardBorder; }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", gap: 14, flex: 1 }}>
                      {/* Stop number */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: isSelected ? (isLight ? "#DCFCE7" : "#00532B") : raisedBg,
                        border: `1px solid ${isSelected ? accentBorder : cardBorder}`,
                        display: "grid", placeItems: "center",
                        fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14,
                        color: isSelected ? accent : textSub, transition: "all .15s",
                      }}>
                        {String(i + 1).padStart(2, "0")}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 16, color: textPrimary }}>
                            ⚡ {stop.station_name}
                          </span>
                          <AvailBadge avail={stop.availability} isLight={isLight} />
                        </div>

                        {/* Stats grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px 16px", marginTop: 12 }}>
                          {[
                            { label: "Arrival battery", val: `${stop.arrival_battery_pct}%`, warn: stop.arrival_battery_pct < 15 },
                            { label: "Charge time", val: `${stop.charge_time_min} min` },
                            { label: "Charger power", val: `${stop.charger_power_kw} kW` },
                            { label: "Price", val: `₹${(stop.price_per_kwh / 100).toFixed(0)}/kWh` },
                          ].map(s => (
                            <div key={s.label}>
                              <div style={{ fontSize: 10, color: textMuted, marginBottom: 3 }}>{s.label}</div>
                              <div style={{
                                fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                                color: s.warn ? "#FF5A5F" : textPrimary,
                              }}>{s.val}</div>
                            </div>
                          ))}
                        </div>

                        {/* Connector + distance */}
                        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub }}>
                            {stop.connector_type}
                          </span>
                          <span style={{ fontSize: 12, color: textMuted }}>
                            {stop.distance_from_start_km} km from {source}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Checkbox */}
                    <div style={{
                      width: 24, height: 24, borderRadius: 7, flexShrink: 0, marginTop: 2,
                      background: isSelected ? accent : "transparent",
                      border: `2px solid ${isSelected ? accent : cardBorder}`,
                      display: "grid", placeItems: "center", transition: "all .15s",
                    }}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12l5 5L20 7" stroke="#050708" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Battery journey bar */}
                  {i === 0 && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${cardBorder}`, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, color: textMuted, flexShrink: 0 }}>Journey battery</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 999, background: raisedBg, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${battery}%`, background: `linear-gradient(90deg,#FF5A5F ${stop.arrival_battery_pct}%,#00E676 ${stop.arrival_battery_pct}%,#00E676 ${stop.charge_to_pct}%)`, borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 11, color: textMuted, flexShrink: 0 }}>{battery}% → {stop.arrival_battery_pct}% → {stop.charge_to_pct}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {plan.recommended_stops.length === 0 && (
            <div style={{
              background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20,
              padding: "40px 24px", textAlign: "center",
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>No charging stop needed!</p>
              <p style={{ color: textSub, fontSize: 14 }}>
                Your {vehicle.label} can complete the {plan.total_distance_km} km journey on your current {battery}% charge.
              </p>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>

          {/* Route visualization */}
          <RouteViz plan={plan} selected={selected} isLight={isLight} />

          {/* Booking summary */}
          {selected.size > 0 && (
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 14 }}>Journey Summary</div>

              {Array.from(selected).sort().map(i => {
                const s = plan.recommended_stops[i];
                const kwh = (s.charger_power_kw * s.charge_time_min) / 60;
                const cost = Math.round(kwh * s.price_per_kwh);
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: textPrimary }}>⚡ {s.city}</div>
                      <div style={{ fontSize: 11, color: textSub }}>{kwh.toFixed(1)} kWh · {s.charge_time_min} min</div>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: textPrimary }}>₹{(cost / 100).toLocaleString("en-IN")}</span>
                  </div>
                );
              })}

              <div style={{ height: 1, background: cardBorder, margin: "12px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontWeight: 700, color: textPrimary }}>Total estimated</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 22, color: textPrimary }}>
                  ₹{(selectedTotal / 100).toLocaleString("en-IN")}
                </span>
              </div>

              {payError && (
                <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 12, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 12 }}>{payError}</div>
              )}

              <button
                onClick={handleReserve}
                disabled={paying}
                style={{
                  width: "100%", padding: "16px", borderRadius: 14,
                  background: paying ? (isLight ? "#E2E8F0" : "#222829") : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
                  color: paying ? textMuted : "#050708",
                  fontSize: 15, fontWeight: 800, border: "none",
                  cursor: paying ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: paying ? "none" : isLight ? "0 4px 16px rgba(0,210,106,.35)" : "0 0 0 1px rgba(0,230,118,.4),0 0 24px rgba(0,230,118,.18)",
                  transition: "all .2s",
                }}>
                {paying
                  ? <><span className="spinner" style={{ borderColor: cardBorder, borderTopColor: textMuted, width: 16, height: 16 }} />Reserving…</>
                  : `Reserve ${selected.size} stop${selected.size !== 1 ? "s" : ""} →`}
              </button>
              <p style={{ fontSize: 11, color: textMuted, textAlign: "center", marginTop: 10 }}>
                Slots held for 15 min · Cancel anytime before check-in
              </p>
            </div>
          )}

          {/* No stop selected nudge */}
          {selected.size === 0 && plan.recommended_stops.length > 0 && (
            <div style={{ background: "rgba(255,192,67,.06)", border: "1px solid rgba(255,192,67,.2)", borderRadius: 16, padding: "16px 18px", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#FFC043", fontWeight: 600 }}>Select at least one charging stop to continue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page export wrapped in Suspense (required for useSearchParams) ─────────────
export default function PlanResultsPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0A0D0E", minHeight: "100vh" }}><NavBar /></div>}>
      <ResultsInner />
    </Suspense>
  );
}

