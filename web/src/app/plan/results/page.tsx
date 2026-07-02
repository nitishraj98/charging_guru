"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import { checkAuth } from "@/lib/auth";
import { planRoute, PlanResult, ChargingStop } from "@/lib/services/routePlanner";
import { listVehicles, STATIC_VEHICLES } from "@/lib/services/vehicleService";
import type { UserVehicle } from "@/lib/services/vehicleService";
import { decodePolyline } from "@/lib/services/googleMaps";
import { routes } from "@/lib/api";

function RouteMap({ plan, isLight }: { plan: PlanResult; isLight: boolean }) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      if (!leafletMap.current) {
        leafletMap.current = L.map(mapRef.current, { zoomControl: false, attributionControl: true });
        L.control.zoom({ position: "topright" }).addTo(leafletMap.current);
      }
      const map = leafletMap.current;

      // Clear previous layers (route redraw on plan change)
      map.eachLayer(l => map.removeLayer(l));

      L.tileLayer(
        isLight
          ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png",
        { attribution: "© OSM © CARTO", maxZoom: 20, subdomains: "abcd" },
      ).addTo(map);

      const bounds: Array<[number, number]> = [];

      if (plan.polyline) {
        const points = decodePolyline(plan.polyline);
        L.polyline(points, { color: isLight ? "#00A855" : "#00E676", weight: 4, opacity: 0.85 }).addTo(map);
        bounds.push(...points);
      }

      const pinIcon = (label: string, color: string) => L.divIcon({
        className: "",
        html: `<div style="
          background:${color};color:#050708;font-weight:800;font-size:11px;
          width:26px;height:26px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
          border:2.5px solid rgba(255,255,255,.9);box-shadow:0 2px 8px rgba(0,0,0,.35);
        "><span style="transform:rotate(45deg);">${label}</span></div>`,
        iconSize: [26, 26], iconAnchor: [13, 26],
      });

      if (bounds.length > 0) {
        L.marker(bounds[0], { icon: pinIcon("A", isLight ? "#00A855" : "#00E676") }).addTo(map);
        L.marker(bounds[bounds.length - 1], { icon: pinIcon("B", "#FF5A5F") }).addTo(map);
      }

      plan.recommended_stops.forEach((stop, i) => {
        if (!stop.lat || !stop.lng) return;
        L.marker([stop.lat, stop.lng], { icon: pinIcon(String(i + 1), "#FFC043") })
          .addTo(map)
          .bindTooltip(stop.station_name, { direction: "top", offset: [0, -24] });
        bounds.push([stop.lat, stop.lng]);
      });

      if (bounds.length > 0) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [32, 32] });
      } else {
        map.setView([20.5937, 78.9629], 5); // India-wide fallback
      }
    })();

    return () => { cancelled = true; };
  }, [plan, isLight]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}

function AvailBadge({ avail, isLight }: { avail: string; isLight: boolean }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    available:   { color: isLight ? "#16A34A" : "#4DFFA6", bg: isLight ? "#DCFCE7" : "rgba(0,230,118,.1)", label: "● Available" },
    limited:     { color: "#FFC043", bg: "rgba(255,192,67,.12)", label: "◐ Limited" },
    unavailable: { color: "#FF5A5F", bg: "rgba(255,90,95,.1)", label: "○ Full" },
  };
  const m = map[avail] ?? map.available;
  return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: m.color, background: m.bg }}>{m.label}</span>;
}

function DataSourceBadge({ source, isLight }: { source: PlanResult["data_source"]; isLight: boolean }) {
  if (source === "google+backend") return null;
  const labels: Record<string, string> = {
    "google+ocm": "Open Charge Map data",
    "offline": "Estimated (Maps unavailable)",
  };
  return (
    <div style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,192,67,.08)", border: "1px solid rgba(255,192,67,.2)", fontSize: 12, color: "#FFC043", marginBottom: 16 }}>
      ⚠ {labels[source]} — connect to internet for live charger availability
    </div>
  );
}

function ResultsInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { isLight } = useTheme();

  const source      = sp.get("source") ?? "";
  const destination = sp.get("destination") ?? "";
  const vehicleId   = sp.get("vehicle_id") ?? "";
  const battery     = Number(sp.get("battery") ?? "80");
  const srcLat      = sp.get("src_lat") ? Number(sp.get("src_lat")) : undefined;
  const srcLng      = sp.get("src_lng") ? Number(sp.get("src_lng")) : undefined;
  const dstLat      = sp.get("dst_lat") ? Number(sp.get("dst_lat")) : undefined;
  const dstLng      = sp.get("dst_lng") ? Number(sp.get("dst_lng")) : undefined;

  const [plan,      setPlan]      = useState<PlanResult | null>(null);
  const [vehicle,   setVehicle]   = useState<UserVehicle>(STATIC_VEHICLES[0]);
  const [loading,   setLoading]   = useState(true);
  const [planError, setPlanError] = useState("");
  const [selected,  setSelected]  = useState<Set<number>>(new Set());
  const [paying,    setPaying]    = useState(false);
  const [payError,  setPayError]  = useState("");

  const cardBg       = isLight ? "#FFFFFF"  : "#101415";
  const cardBorder   = isLight ? "#E2E8F0"  : "#222829";
  const cardBorderHover = isLight ? "#CBD5E1" : "#2E3638";
  const raisedBg     = isLight ? "#F1F5F9"  : "#181D1F";
  const textPrimary  = isLight ? "#0F172A"  : "#E6EBED";
  const textSub      = isLight ? "#64748B"  : "#6B7479";
  const textMuted    = isLight ? "#94A3B8"  : "#495154";
  const accent       = isLight ? "#00D26A"  : "#00E676";
  const accentDim    = isLight ? "#DCFCE7"  : "rgba(0,230,118,.08)";
  const accentBorder = isLight ? "#86EFAC"  : "rgba(0,230,118,.25)";

  const loadPlan = useCallback(async () => {
    if (!source || !destination) return;
    setLoading(true); setPlanError("");
    try {
      // Resolve vehicle from user's list
      const allVehicles = await listVehicles().catch(() => STATIC_VEHICLES);
      const v = allVehicles.find(x => x.id === vehicleId) ?? allVehicles[0] ?? STATIC_VEHICLES[0];
      setVehicle(v);

      const result = await planRoute({
        source, destination,
        sourceLat: srcLat, sourceLng: srcLng,
        destLat: dstLat, destLng: dstLng,
        vehicle: v, batteryPercent: battery,
      });
      setPlan(result);
      // Auto-select all available stops
      const autoSelect = new Set<number>();
      result.recommended_stops.forEach((s, i) => { if (s.availability !== "unavailable") autoSelect.add(i); });
      setSelected(autoSelect);
    } catch (e: unknown) {
      setPlanError(e instanceof Error ? e.message : "Failed to plan route");
    } finally {
      setLoading(false);
    }
  }, [source, destination, vehicleId, battery, srcLat, srcLng, dstLat, dstLng]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  function toggleStop(i: number) {
    setSelected(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; });
  }

  async function handleReserve() {
    const ok = await checkAuth(); if (!ok) { router.push("/login"); return; }
    if (selected.size === 0 || !plan) return;
    setPaying(true); setPayError("");
    try {
      const selectedStops = Array.from(selected).map(i => plan.recommended_stops[i]);
      const chargerIds = selectedStops.map(s => s.charger_id).filter(Boolean) as string[];

      if (chargerIds.length > 0) {
        const journey = await routes.reserve({ source, destination, vehicle_id: vehicleId, stop_charger_ids: chargerIds });
        router.push(`/journey/${journey.id}`);
      } else {
        // No real charger IDs — send to journey/new with params
        const params = new URLSearchParams({
          source, destination,
          vehicle: vehicle.label,
          stops: selectedStops.map(s => s.station_name).join(","),
          total: String(selectedStops.reduce((sum, s) => sum + s.price_per_kwh, 0)),
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
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", gap: 20 }}>
        <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3, borderColor: cardBorder, borderTopColor: accent }} />
        <div style={{ textAlign: "center" }}>
          <p style={{ color: textPrimary, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Planning your route…</p>
          <p style={{ color: textSub, fontSize: 13 }}>{source} → {destination}</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["Fetching route", "Finding chargers", "Optimising stops"].map((s, i) => (
            <div key={s} style={{ padding: "6px 14px", borderRadius: 999, background: cardBg, border: `1px solid ${cardBorder}`, fontSize: 12, color: textSub, opacity: 1 - i * 0.2 }}>
              {i === 0 ? "✓" : "…"} {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (planError) return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: textPrimary, marginBottom: 8 }}>Could not plan route</h2>
        <p style={{ color: textSub, marginBottom: 24 }}>{planError}</p>
        <button onClick={() => router.push("/plan")} style={{ padding: "12px 24px", borderRadius: 12, background: accent, color: "#050708", fontWeight: 700, border: "none", cursor: "pointer" }}>Try again</button>
      </div>
    </div>
  );

  if (!plan) return null;

  const driveMin = plan.estimated_duration_min - plan.total_charging_time_min;

  return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />

      {/* Header */}
      <div style={{ background: cardBg, borderBottom: `1px solid ${cardBorder}`, padding: "14px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.push("/plan")} style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub, cursor: "pointer", fontSize: 15 }}>←</button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: textPrimary }}>{source} → {destination}</div>
              <div style={{ fontSize: 12, color: textSub }}>{vehicle.label} · {battery}% battery · {plan.total_distance_km} km</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { label: "Distance", val: `${plan.total_distance_km} km` },
              { label: "Drive time", val: plan.estimated_duration_traffic_min ? `${Math.floor(plan.estimated_duration_traffic_min / 60)}h ${plan.estimated_duration_traffic_min % 60}m` : `${Math.floor(driveMin / 60)}h ${driveMin % 60}m` },
              { label: "Charge stops", val: `${plan.stops_required}` },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: textMuted }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: textPrimary }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="plan-results-layout" style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 100px" }}>

        {/* Left: stops */}
        <div>
          <DataSourceBadge source={plan.data_source} isLight={isLight} />

          {plan.polyline && (
            <div style={{ height: 280, borderRadius: 20, overflow: "hidden", border: `1px solid ${cardBorder}`, marginBottom: 20 }}>
              <RouteMap plan={plan} isLight={isLight} />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: textPrimary }}>Recommended Charging Stops</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSelected(new Set(plan.recommended_stops.map((_, i) => i).filter(i => plan.recommended_stops[i].availability !== "unavailable")))}
                style={{ padding: "6px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: accentDim, border: `1px solid ${accentBorder}`, color: accent, cursor: "pointer" }}>Select all</button>
              <button onClick={() => setSelected(new Set())}
                style={{ padding: "6px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub, cursor: "pointer" }}>Clear</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {plan.recommended_stops.map((stop, i) => {
              const isSel = selected.has(i);
              const unavail = stop.availability === "unavailable";
              const isEstimated = stop.source === "estimated";
              return (
                <div key={i} onClick={() => !unavail && toggleStop(i)} style={{
                  background: cardBg,
                  border: `1.5px solid ${isSel ? (isLight ? "#86EFAC" : "#00A455") : cardBorder}`,
                  borderRadius: 20, padding: "20px 22px",
                  cursor: unavail ? "not-allowed" : "pointer",
                  opacity: unavail ? 0.55 : 1,
                  transition: "all .15s",
                  boxShadow: isSel ? (isLight ? "0 0 0 3px rgba(0,210,106,.12)" : "0 0 0 3px rgba(0,164,85,.15)") : isLight ? "0 1px 4px rgba(0,0,0,.04)" : "none",
                }}
                  onMouseEnter={e => { if (!unavail) e.currentTarget.style.borderColor = isSel ? (isLight ? "#86EFAC" : "#00A455") : cardBorderHover; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isSel ? (isLight ? "#86EFAC" : "#00A455") : cardBorder; }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", gap: 14, flex: 1 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: isSel ? (isLight ? "#DCFCE7" : "#00532B") : raisedBg, border: `1px solid ${isSel ? accentBorder : cardBorder}`, display: "grid", placeItems: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14, color: isSel ? accent : textSub, transition: "all .15s" }}>
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 16, color: textPrimary }}>
                            ⚡ {stop.station_name}
                            {isEstimated && <span style={{ fontSize: 11, fontWeight: 500, color: "#FFC043", marginLeft: 8 }}>(estimated)</span>}
                          </span>
                          <AvailBadge avail={stop.availability} isLight={isLight} />
                          {stop.source === "ocm" && <span style={{ fontSize: 10, color: textMuted, padding: "2px 7px", borderRadius: 999, border: `1px solid ${cardBorder}` }}>OCM</span>}
                          {stop.source === "backend" && <span style={{ fontSize: 10, color: accent, padding: "2px 7px", borderRadius: 999, border: `1px solid ${accentBorder}` }}>Live</span>}
                        </div>
                        {stop.city && stop.city !== "En route" && (
                          <div style={{ fontSize: 12, color: textSub, marginBottom: 10 }}>{stop.city}</div>
                        )}
                        <div className="stop-stats-grid" style={{ marginTop: 12 }}>
                          {[
                            { label: "Arrival battery", val: `${stop.arrival_battery_pct}%`, warn: stop.arrival_battery_pct < 15 },
                            { label: "Charge time", val: `${stop.charge_time_min} min` },
                            { label: "Charger power", val: `${stop.charger_power_kw} kW` },
                            { label: "Price", val: stop.price_per_kwh > 0 ? `₹${(stop.price_per_kwh / 100).toFixed(0)}/kWh` : "—" },
                          ].map(s => (
                            <div key={s.label}>
                              <div style={{ fontSize: 10, color: textMuted, marginBottom: 3 }}>{s.label}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: s.warn ? "#FF5A5F" : textPrimary }}>{s.val}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub }}>{stop.connector_type}</span>
                          <span style={{ fontSize: 12, color: textMuted }}>{stop.distance_from_start_km} km from {source}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, marginTop: 2, background: isSel ? accent : "transparent", border: `2px solid ${isSel ? accent : cardBorder}`, display: "grid", placeItems: "center", transition: "all .15s" }}>
                      {isSel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#050708" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {plan.recommended_stops.length === 0 && (
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "40px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>No charging stop needed!</p>
              <p style={{ color: textSub, fontSize: 14 }}>Your {vehicle.label} can complete this {plan.total_distance_km} km journey on {battery}% charge.</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="plan-results-sidebar" style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>

          {/* Summary strip */}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 16 }}>Route Summary</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Total distance",  val: `${plan.total_distance_km} km` },
                { label: "Drive time",      val: plan.estimated_duration_traffic_min ? `${Math.floor(plan.estimated_duration_traffic_min / 60)}h ${plan.estimated_duration_traffic_min % 60}m (with traffic)` : `${Math.floor(driveMin / 60)}h ${driveMin % 60}m` },
                { label: "Charging time",   val: plan.total_charging_time_min > 0 ? `${plan.total_charging_time_min} min` : "None needed" },
                { label: "Charging stops",  val: `${plan.stops_required}` },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span style={{ color: textSub }}>{s.label}</span>
                  <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: textPrimary }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Booking summary */}
          {selected.size > 0 && (
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 14 }}>Journey Summary</div>

              {Array.from(selected).sort().map(i => {
                const s = plan.recommended_stops[i];
                const kwh = (s.charger_power_kw * s.charge_time_min) / 60;
                const cost = s.price_per_kwh > 0 ? Math.round(kwh * s.price_per_kwh) : null;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: textPrimary }}>⚡ {s.station_name}</div>
                      <div style={{ fontSize: 11, color: textSub }}>{kwh.toFixed(1)} kWh · {s.charge_time_min} min</div>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: textPrimary }}>
                      {cost != null ? `₹${(cost / 100).toLocaleString("en-IN")}` : "—"}
                    </span>
                  </div>
                );
              })}

              {selectedTotal > 0 && (
                <>
                  <div style={{ height: 1, background: cardBorder, margin: "12px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, color: textPrimary }}>Total estimated</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 22, color: textPrimary }}>₹{(selectedTotal / 100).toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}

              {payError && (
                <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 12, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 12 }}>{payError}</div>
              )}

              <button onClick={handleReserve} disabled={paying} style={{
                width: "100%", padding: "16px", borderRadius: 14,
                background: paying ? (isLight ? "#E2E8F0" : "#222829") : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
                color: paying ? textMuted : "#050708", fontSize: 15, fontWeight: 800, border: "none",
                cursor: paying ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: paying ? "none" : isLight ? "0 4px 16px rgba(0,210,106,.35)" : "0 0 0 1px rgba(0,230,118,.4),0 0 24px rgba(0,230,118,.18)",
                transition: "all .2s",
              }}>
                {paying
                  ? <><span className="spinner" style={{ borderColor: cardBorder, borderTopColor: textMuted, width: 16, height: 16 }} />Reserving…</>
                  : `Reserve ${selected.size} stop${selected.size !== 1 ? "s" : ""} →`}
              </button>
              <p style={{ fontSize: 11, color: textMuted, textAlign: "center", marginTop: 10 }}>Slots held 15 min · Cancel anytime before check-in</p>
            </div>
          )}

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

export default function PlanResultsPage() {
  return (
    <Suspense fallback={<div style={{ background: "transparent", minHeight: "100vh" }}><NavBar /></div>}>
      <ResultsInner />
    </Suspense>
  );
}
