"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const STATIONS = [
  { name: "Delhi NCR",  lat: 28.6139, lng: 77.2090, chargers: 340, power: "150 kW", color: "#00E676" },
  { name: "Jaipur",    lat: 26.9124, lng: 75.7873, chargers: 88,  power: "50 kW",  color: "#00E676" },
  { name: "Patna",     lat: 25.5941, lng: 85.1376, chargers: 52,  power: "30 kW",  color: "#FFC043" },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714, chargers: 125, power: "100 kW", color: "#00E676" },
  { name: "Varanasi",  lat: 25.3176, lng: 82.9739, chargers: 34,  power: "30 kW",  color: "#22D3EE" },
  { name: "Mumbai",    lat: 19.0760, lng: 72.8777, chargers: 480, power: "150 kW", color: "#00E676" },
  { name: "Hyderabad", lat: 17.3850, lng: 78.4867, chargers: 216, power: "100 kW", color: "#00E676" },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946, chargers: 302, power: "150 kW", color: "#4DFFA6" },
  { name: "Chennai",   lat: 13.0827, lng: 80.2707, chargers: 178, power: "100 kW", color: "#00E676" },
  { name: "Kolkata",   lat: 22.5726, lng: 88.3639, chargers: 143, power: "50 kW",  color: "#FFC043" },
  { name: "Lucknow",   lat: 26.8467, lng: 80.9462, chargers: 67,  power: "50 kW",  color: "#22D3EE" },
  { name: "Pune",      lat: 18.5204, lng: 73.8567, chargers: 210, power: "100 kW", color: "#00E676" },
];

// Main charging corridor: Delhi → Jaipur → Ahmedabad → Mumbai → Pune → Hyderabad → Bengaluru
const ROUTE: [number, number][] = [
  [28.6139, 77.2090],
  [26.9124, 75.7873],
  [23.0225, 72.5714],
  [19.0760, 72.8777],
  [18.5204, 73.8567],
  [17.3850, 78.4867],
  [12.9716, 77.5946],
];

// Secondary route: Delhi → Lucknow → Varanasi → Patna → Kolkata
const ROUTE2: [number, number][] = [
  [28.6139, 77.2090],
  [26.8467, 80.9462],
  [25.3176, 82.9739],
  [25.5941, 85.1376],
  [22.5726, 88.3639],
];

function makeIcon(color: string, pulsing: boolean, isLight: boolean) {
  const bg = isLight ? "#ffffff" : "#1d2535";
  const glow = pulsing ? `0 0 14px ${color}` : `0 0 6px ${color}60`;
  return L.divIcon({
    className: "",
    iconSize:   [26, 26],
    iconAnchor: [13, 13],
    tooltipAnchor: [13, -13],
    html: `
      <div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center">
        ${pulsing ? `<div class="ping-green" style="position:absolute;inset:-7px;border-radius:50%;border:1.5px solid ${color};opacity:.6;"></div>` : ""}
        <div style="width:22px;height:22px;border-radius:50%;background:${bg};border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:${glow},0 2px 8px rgba(0,0,0,.35)">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 5px ${color}"></div>
        </div>
      </div>
    `,
  });
}

interface Props { isLight: boolean }

export default function LiveMapLeaflet({ isLight }: Props) {
  const [pulseIdx, setPulseIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPulseIdx(i => (i + 1) % STATIONS.length), 1600);
    return () => clearInterval(id);
  }, []);

  const tileUrl = isLight
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  const accent  = isLight ? "#00D26A" : "#00E676";
  const ttBg    = isLight ? "#ffffff"  : "#16202c";
  const ttBd    = isLight ? "#e2e8f0"  : "#2a3a4a";
  const ttMuted = isLight ? "#64748b"  : "#6b7479";

  return (
    <MapContainer
      center={[22, 80]}
      zoom={5}
      zoomControl={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      dragging={false}
      keyboard={false}
      attributionControl={false}
      style={{ height: "100%", width: "100%", minHeight: 520 }}
    >
      <TileLayer url={tileUrl} subdomains="abcd" maxZoom={20} />

      {/* Primary charging corridor */}
      <Polyline positions={ROUTE}  color={accent}    weight={3.5} opacity={.9} dashArray="10 6" />
      {/* Secondary route */}
      <Polyline positions={ROUTE2} color="#FFC043" weight={2.5} opacity={.7} dashArray="7 7" />

      {/* EV station markers */}
      {STATIONS.map((s, i) => (
        <Marker
          key={s.name}
          position={[s.lat, s.lng]}
          icon={makeIcon(s.color, i === pulseIdx, isLight)}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={1}>
            <div style={{
              background: ttBg, border: `1px solid ${ttBd}`,
              borderRadius: 10, padding: "8px 12px",
              fontFamily: "'Space Grotesk',sans-serif",
              boxShadow: "0 4px 20px rgba(0,0,0,.25)",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 3 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: ttMuted }}>{s.chargers} chargers · {s.power}</div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
