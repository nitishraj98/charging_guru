"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import { fetchNearbyStations, StationSummary } from "@/lib/services/chargingStations";
import { checkAuth } from "@/lib/auth";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import type { PlaceDetail } from "@/lib/services/googleMaps";

const FILTERS = ["Near me", "⚡ Fast DC", "CCS2", "Type 2", "≥50kW", "★4.5+"];

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "#00E676", BOOKED: "#FFC043", OCCUPIED: "#22D3EE",
  IN_USE: "#22D3EE", MAINTENANCE: "#FF7849", OFFLINE: "#495154",
};

const DEFAULT_LAT = 28.628;
const DEFAULT_LNG = 77.365;

// ── Map popup card HTML (injected into Leaflet popup) ──
function buildPopupHTML(s: StationSummary, free: number, total: number, status: string, isLight: boolean) {
  const statusColor = STATUS_COLOR[status] ?? "#98A1A6";
  const statusLabel = status === "AVAILABLE" ? "Open" : status === "OCCUPIED" ? "Busy" : "Closed";
  const dots = Array.from({ length: Math.min(total, 5) }, (_, i) =>
    `<span style="width:8px;height:8px;border-radius:50%;background:${i < free ? "#00E676" : "#FFC043"};display:inline-block;${i < free ? "box-shadow:0 0 4px rgba(0,230,118,.6)" : ""}"></span>`
  ).join("");

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;

  const bg     = isLight ? "#FFFFFF" : "#101415";
  const border = isLight ? "#E2E8F0" : "#222829";
  const text   = isLight ? "#0F172A" : "#E6EBED";
  const sub    = isLight ? "#64748B" : "#6B7479";
  const raised = isLight ? "#F1F5F9" : "#181D1F";
  const accent = isLight ? "#00D26A" : "#00E676";

  return `
    <div style="
      background:${bg};border:1px solid ${border};border-radius:18px;
      padding:16px 18px;width:260px;font-family:'Inter',system-ui,sans-serif;
      box-shadow:0 8px 40px rgba(0,0,0,.25);
    ">
      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:12px;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:14px;color:${text};line-height:1.35;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.name}</div>
          ${s.address ? `<div style="font-size:11px;color:${sub};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.address}</div>` : ""}
        </div>
        <span style="flex-shrink:0;padding:3px 9px;border-radius:999px;font-size:10px;font-weight:700;color:${statusColor};background:${statusColor}18;border:1px solid ${statusColor}35;">
          ${statusLabel}
        </span>
      </div>

      <!-- Charger dots -->
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:12px;padding:10px 12px;background:${raised};border-radius:10px;border:1px solid ${border};">
        <div style="display:flex;gap:5px;align-items:center;">${dots}</div>
        <span style="font-size:12px;color:${sub};margin-left:4px;font-family:'JetBrains Mono',monospace;font-weight:600;">
          ${free}/${total} free
        </span>
        ${s.distance_km != null ? `<span style="margin-left:auto;font-size:11px;color:${sub};">${s.distance_km.toFixed(1)} km</span>` : ""}
      </div>

      <!-- Rating -->
      ${s.rating_avg > 0 ? `
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:12px;font-size:12px;color:${sub};">
          <span style="color:#FFC043;font-size:13px;">★</span>
          <span style="color:${text};font-weight:600;">${s.rating_avg.toFixed(1)}</span>
          <span style="color:${sub};">(${s.rating_count} reviews)</span>
        </div>
      ` : ""}

      <!-- Actions -->
      <div style="display:flex;gap:8px;">
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="
          flex:1;display:flex;align-items:center;justify-content:center;gap:6px;
          padding:10px;border-radius:10px;border:1px solid ${border};
          background:${raised};color:${text};font-size:12px;font-weight:600;
          text-decoration:none;cursor:pointer;
        ">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3,11 22,2 13,21 11,13 3,11"/>
          </svg>
          Directions
        </a>
        <a href="/station/${s.id}" style="
          flex:1;display:flex;align-items:center;justify-content:center;gap:6px;
          padding:10px;border-radius:10px;border:none;
          background:linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"});
          color:#050708;font-size:12px;font-weight:700;
          text-decoration:none;cursor:pointer;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          Book slot
        </a>
      </div>
    </div>
  `;
}

// ── Premium marker HTML ──
function buildMarkerHTML(free: number, total: number, isSelected: boolean) {
  const avail   = free > 0;
  const color   = avail ? "#00E676" : total > 0 ? "#FFC043" : "#495154";
  const glow    = avail ? "0 0 0 3px rgba(0,230,118,.2),0 0 12px rgba(0,230,118,.25)" : total > 0 ? "0 0 0 3px rgba(255,192,67,.2)" : "none";
  const scale   = isSelected ? "scale(1.25)" : "scale(1)";
  const ring    = isSelected ? `0 0 0 4px ${color}40,0 4px 20px ${color}50` : glow;

  return `
    <div style="
      position:relative;display:flex;flex-direction:column;align-items:center;
      transform:${scale};transition:transform .2s cubic-bezier(.34,1.56,.64,1);
    ">
      <!-- Pin body -->
      <div style="
        background:${color};color:#050708;font-weight:800;font-size:12px;
        padding:5px 11px;border-radius:20px;white-space:nowrap;
        border:2.5px solid rgba(255,255,255,0.9);
        box-shadow:${ring};
        display:flex;align-items:center;gap:5px;
        font-family:'JetBrains Mono',monospace;
        min-width:44px;justify-content:center;
      ">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        ${free}
      </div>
      <!-- Stem -->
      <div style="
        width:2px;height:7px;
        background:${color};
        margin-top:-1px;
        border-radius:0 0 2px 2px;
        opacity:.7;
      "></div>
      <!-- Tip dot -->
      <div style="
        width:5px;height:5px;border-radius:50%;
        background:${color};margin-top:-1px;
        opacity:.5;
      "></div>
    </div>
  `;
}

function LeafletMap({
  stations, userLat, userLng, flyToLat, flyToLng, hoveredId, onStationClick, isLight,
}: {
  stations: StationSummary[];
  userLat: number; userLng: number;
  flyToLat?: number; flyToLng?: number;
  hoveredId: string | null;
  onStationClick: (id: string) => void;
  isLight: boolean;
}) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const leafletMap  = useRef<L.Map | null>(null);
  const markersRef  = useRef<Record<string, L.Marker>>({});
  const popupRef    = useRef<L.Popup | null>(null);
  const selectedRef = useRef<string | null>(null);
  const userDotRef  = useRef<L.Marker | null>(null);
  const isFirstGeo  = useRef(true);

  // Helper: rebuild a marker's icon (normal or selected)
  function refreshMarkerIcon(L: typeof import("leaflet"), s: StationSummary, selected: boolean) {
    const free  = s.available_chargers ?? s.chargers.filter(c => c.status === "AVAILABLE").length;
    const total = s.total_chargers ?? s.chargers.length;
    const icon  = L.divIcon({
      className: "",
      html: buildMarkerHTML(free, total, selected),
      iconSize: [52, 44], iconAnchor: [26, 44],
      popupAnchor: [0, -46],
    });
    markersRef.current[s.id]?.setIcon(icon);
  }

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      if (!leafletMap.current) {
        const map = L.map(mapRef.current, {
          zoomControl: false, attributionControl: true,
          // Smoother zoom
          zoomAnimation: true, fadeAnimation: true, markerZoomAnimation: true,
        }).setView([userLat, userLng], 12);

        // Premium tile layer — CartoDB rastertiles (stable URLs)
        L.tileLayer(
          isLight
            ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution: "© <a href='https://openstreetmap.org'>OSM</a> © <a href='https://carto.com'>CARTO</a>",
            maxZoom: 20, subdomains: "abcd",
          },
        ).addTo(map);

        L.control.zoom({ position: "topright" }).addTo(map);

        // User dot — glowing green pulse
        const userIcon = L.divIcon({
          className: "",
          html: `
            <div style="position:relative;width:22px;height:22px;">
              <div style="
                position:absolute;inset:0;border-radius:50%;
                background:rgba(0,230,118,.25);
                animation:pulse-ring 2s cubic-bezier(0,0,.2,1) infinite;
              "></div>
              <div style="
                position:absolute;top:3px;left:3px;right:3px;bottom:3px;
                border-radius:50%;background:#00E676;
                border:2.5px solid #fff;
                box-shadow:0 0 0 2px rgba(0,230,118,.4),0 2px 8px rgba(0,230,118,.5);
              "></div>
            </div>
          `,
          iconSize: [22, 22], iconAnchor: [11, 11],
        });
        userDotRef.current = L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);

        // Close popup on map click
        map.on("click", () => {
          if (popupRef.current) { map.closePopup(popupRef.current); popupRef.current = null; }
          if (selectedRef.current) {
            const prev = selectedRef.current;
            selectedRef.current = null;
            const prevStation = stations.find(s => s.id === prev);
            if (prevStation) refreshMarkerIcon(L, prevStation, false);
          }
        });

        leafletMap.current = map;
      }

      const map = leafletMap.current;
      const existing = new Set(Object.keys(markersRef.current));

      for (const s of stations) {
        if (!s.lat || !s.lng) continue;
        const free  = s.available_chargers ?? s.chargers.filter(c => c.status === "AVAILABLE").length;
        const total = s.total_chargers ?? s.chargers.length;
        const status = free > 0 ? "AVAILABLE" : total > 0 ? "OCCUPIED" : "OFFLINE";

        if (!markersRef.current[s.id]) {
          const icon = L.divIcon({
            className: "",
            html: buildMarkerHTML(free, total, false),
            iconSize: [52, 44], iconAnchor: [26, 44],
            popupAnchor: [0, -46],
          });

          const marker = L.marker([s.lat, s.lng], { icon }).addTo(map);

          marker.on("click", () => {
            onStationClick(s.id);

            // Deselect previous
            if (selectedRef.current && selectedRef.current !== s.id) {
              const prev = selectedRef.current;
              const prevStation = stations.find(st => st.id === prev);
              if (prevStation) refreshMarkerIcon(L, prevStation, false);
            }

            // Select this marker
            selectedRef.current = s.id;
            refreshMarkerIcon(L, s, true);

            // Close old popup
            if (popupRef.current) { map.closePopup(popupRef.current); }

            // Open custom popup
            const popup = L.popup({
              maxWidth: 280, minWidth: 270,
              className: "cg-popup",
              closeButton: false,
              offset: [0, -8],
            })
              .setLatLng([s.lat, s.lng])
              .setContent(buildPopupHTML(s, free, total, status, isLight));

            popup.on("remove", () => {
              if (selectedRef.current === s.id) {
                selectedRef.current = null;
                refreshMarkerIcon(L, s, false);
              }
            });

            popup.openOn(map);
            popupRef.current = popup;
            map.panTo([s.lat, s.lng], { animate: true, duration: 0.4 });
          });

          markersRef.current[s.id] = marker;
        }
        existing.delete(s.id);
      }

      // Remove stale markers
      Array.from(existing).forEach(id => {
        markersRef.current[id]?.remove();
        delete markersRef.current[id];
      });
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, userLat, userLng]);

  // Theme change: replace tile layers
  useEffect(() => {
    if (!leafletMap.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = leafletMap.current!;
      map.eachLayer(layer => { if ((layer as L.TileLayer).setUrl) map.removeLayer(layer); });

      L.tileLayer(
        isLight
          ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png",
        { attribution: "© OSM © CARTO", maxZoom: 20, subdomains: "abcd" },
      ).addTo(map);
    })();
  }, [isLight]);

  // Update user dot + re-center when GPS resolves (or changes)
  useEffect(() => {
    if (!leafletMap.current || !userDotRef.current) return;
    userDotRef.current.setLatLng([userLat, userLng]);
    // Only auto-pan on the first real GPS fix, not on every re-render
    if (isFirstGeo.current) {
      isFirstGeo.current = false;
      leafletMap.current.flyTo([userLat, userLng], 13, { animate: true, duration: 1.0 });
    }
  }, [userLat, userLng]);

  // Fly to city when user selects autocomplete suggestion
  useEffect(() => {
    if (flyToLat == null || flyToLng == null || !leafletMap.current) return;
    leafletMap.current.flyTo([flyToLat, flyToLng], 13, { animate: true, duration: 0.8 });
  }, [flyToLat, flyToLng]);

  // Pan on hover from list
  useEffect(() => {
    if (!hoveredId || !leafletMap.current) return;
    const marker = markersRef.current[hoveredId];
    if (marker) leafletMap.current.panTo(marker.getLatLng(), { animate: true, duration: 0.25 });
  }, [hoveredId]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}

export default function DiscoverPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [list, setList]               = useState<StationSummary[]>([]);
  const [activeFilter, setActiveFilter] = useState("Near me");
  const [loading, setLoading]         = useState(true);
  const [apiError, setApiError]       = useState("");
  const [search, setSearch]           = useState("");
  const [searchLat, setSearchLat]     = useState<number | undefined>();
  const [searchLng, setSearchLng]     = useState<number | undefined>();
  const [hoveredId, setHoveredId]     = useState<string | null>(null);
  const [authed, setAuthed]           = useState(false);
  const [userLat, setUserLat]         = useState(DEFAULT_LAT);
  const [userLng, setUserLng]         = useState(DEFAULT_LNG);
  const [geoGranted, setGeoGranted]   = useState(false);
  const [dataSource, setDataSource]   = useState<"backend" | "ocm" | "">("");

  const panelBg   = isLight ? "#FFFFFF"  : "#0A0D0E";
  const border    = isLight ? "#E2E8F0"  : "#1a1f20";
  const cardBg    = isLight ? "#FFFFFF"  : "#101415";
  const cardBgHover = isLight ? "#F8FAFC" : "#181D1F";
  const cardBorder  = isLight ? "#E2E8F0" : "#222829";
  const cardBorderHover = isLight ? "#CBD5E1" : "#2E3638";
  const inputBg   = isLight ? "#F1F5F9"  : "#101415";
  const inputBorder = isLight ? "#E2E8F0" : "#222829";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub   = isLight ? "#64748B"  : "#6B7479";
  const accent    = isLight ? "#00D26A"  : "#00E676";
  const accentDim = isLight ? "#DCFCE7"  : "rgba(0,230,118,.08)";
  const accentBrd = isLight ? "#86EFAC"  : "rgba(0,230,118,.25)";

  useEffect(() => { checkAuth().then(ok => setAuthed(ok)); }, []);

  const load = useCallback(async (lat: number, lng: number) => {
    setApiError(""); setLoading(true);
    try {
      const result = await fetchNearbyStations({ lat, lng, radius_km: 50 });
      setList(result);
      if (result.length > 0) setDataSource(result[0].source as "backend" | "ocm");
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : "Failed to load stations");
    } finally { setLoading(false); }
  }, []);

  // Initial load — use geolocation if available
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { load(DEFAULT_LAT, DEFAULT_LNG); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setGeoGranted(true); load(pos.coords.latitude, pos.coords.longitude); },
      () => load(DEFAULT_LAT, DEFAULT_LNG),
      { timeout: 5000 },
    );
  }, [load]);

  // Re-fetch when user picks a city from autocomplete
  useEffect(() => {
    if (searchLat != null && searchLng != null) {
      load(searchLat, searchLng);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLat, searchLng]);

  function firstStatus(s: StationSummary) {
    if (s.available_chargers != null) {
      if (s.available_chargers > 0) return "AVAILABLE";
      if ((s.total_chargers ?? 0) > 0) return "OCCUPIED";
      return "OFFLINE";
    }
    if (!s.chargers?.length) return "OFFLINE";
    if (s.chargers.find(c => c.status === "AVAILABLE")) return "AVAILABLE";
    if (s.chargers.find(c => c.status === "OCCUPIED" || c.status === "IN_USE")) return "OCCUPIED";
    return "MAINTENANCE";
  }

  function freeCount(s: StationSummary) {
    if (s.available_chargers != null) return s.available_chargers;
    return s.chargers?.filter(c => c.status === "AVAILABLE").length ?? 0;
  }

  function totalCount(s: StationSummary) {
    if (s.total_chargers != null) return s.total_chargers;
    return s.chargers?.length ?? 0;
  }

  const filtered = list.filter(s => {
    if (search.length >= 2) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q);
    }
    if (s.source === "backend") return true;
    if (activeFilter === "⚡ Fast DC") return s.chargers.some(c => c.power_kw >= 50 && c.connector_type.includes("CCS"));
    if (activeFilter === "CCS2")       return s.chargers.some(c => c.connector_type.includes("CCS"));
    if (activeFilter === "Type 2")     return s.chargers.some(c => c.connector_type.includes("Type 2") || c.connector_type.includes("AC"));
    if (activeFilter === "≥50kW")      return s.chargers.some(c => c.power_kw >= 50);
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "transparent" }}>
      <NavBar />

      {/* Popup chrome removal + user dot pulse animation */}
      <style suppressHydrationWarning>{`
        .cg-popup .leaflet-popup-content-wrapper {
          background: transparent !important; border: none !important;
          box-shadow: none !important; padding: 0 !important; border-radius: 0 !important;
        }
        .cg-popup .leaflet-popup-content { margin: 0 !important; }
        .cg-popup .leaflet-popup-tip-container { display: none !important; }
        @keyframes pulse-ring {
          0%   { transform: scale(.8); opacity: .8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .leaflet-control-zoom a {
          background: ${isLight ? "#ffffff" : "#101415"} !important;
          color: ${textPrimary} !important;
          border-color: ${border} !important;
        }
        .leaflet-control-zoom a:hover {
          background: ${isLight ? "#F1F5F9" : "#181D1F"} !important;
        }
      `}</style>

      <div className="discover-layout" style={{ flex: 1, overflow: "hidden" }}>

        {/* ── Left panel ── */}
        <div style={{ borderRight: `1px solid ${border}`, background: panelBg, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Search with city autocomplete */}
          <div style={{ padding: "14px 16px 0", position: "relative" }}>
            <div style={{ position: "absolute", left: 29, top: "50%", transform: "translateY(-30%)", zIndex: 2, pointerEvents: "none" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke={textSub} strokeWidth="2"/>
                <path d="M21 21l-4-4" stroke={textSub} strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <PlacesAutocomplete
              value={search}
              onChange={(display, detail?: PlaceDetail) => {
                setSearch(display);
                if (detail) { setSearchLat(detail.lat); setSearchLng(detail.lng); }
              }}
              placeholder="Search city or station…"
              inputStyle={{
                width: "100%", padding: "10px 36px 10px 38px",
                background: inputBg, border: `1px solid ${inputBorder}`,
                borderRadius: 14, fontSize: 14, color: textPrimary,
                outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit",
              }}
              accentColor={accent}
              dropdownBg={isLight ? "#FFFFFF" : "#101415"}
              dropdownBorder={isLight ? "#E2E8F0" : "#222829"}
              textPrimary={textPrimary}
              textSub={textSub}
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setSearchLat(undefined); setSearchLng(undefined); }}
                style={{ position: "absolute", right: 27, top: "50%", transform: "translateY(-30%)", background: "none", border: "none", color: textSub, cursor: "pointer", fontSize: 18, lineHeight: 1, zIndex: 3 }}
              >×</button>
            )}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 7, padding: "10px 16px", overflowX: "auto", scrollbarWidth: "none" }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)} style={{
                padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                whiteSpace: "nowrap", cursor: "pointer", transition: "all .15s",
                background: activeFilter === f ? accentDim : inputBg,
                border: `1px solid ${activeFilter === f ? accentBrd : inputBorder}`,
                color: activeFilter === f ? (isLight ? "#16A34A" : "#4DFFA6") : textSub,
              }}>{f}</button>
            ))}
          </div>

          {/* Results count */}
          <div style={{ padding: "4px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: textSub }}>
              {loading ? "Loading…" : apiError ? "Error loading" : `${filtered.length} stations`}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {dataSource === "ocm" && !loading && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(255,192,67,.1)", color: "#FFC043", border: "1px solid rgba(255,192,67,.2)" }}>
                  Open Charge Map
                </span>
              )}
              {geoGranted && !loading && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: accentDim, color: accent, border: `1px solid ${accentBrd}` }}>
                  ● Your location
                </span>
              )}
            </div>
          </div>

          {/* Station list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px" }}>

            {/* Loading skeletons */}
            {loading && [1, 2, 3].map(i => (
              <div key={i} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "14px 16px", marginBottom: 8, height: 96, opacity: 1 - i * 0.2 }} />
            ))}

            {/* Error */}
            {!loading && apiError && (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 14, color: textPrimary, fontWeight: 600, marginBottom: 6 }}>Could not load stations</p>
                <p style={{ fontSize: 12, color: textSub, marginBottom: 16 }}>Make sure the backend is running.</p>
                <button onClick={() => load(userLat, userLng)} style={{ padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: accent, color: "#050708", border: "none", cursor: "pointer" }}>Retry</button>
              </div>
            )}

            {/* Station cards */}
            {!loading && !apiError && filtered.map(s => {
              const free   = freeCount(s);
              const total  = totalCount(s);
              const status = firstStatus(s);
              const sc     = STATUS_COLOR[status] ?? "#98A1A6";
              return (
                <div key={s.id}
                  onClick={() => router.push(`/station/${s.id}`)}
                  onMouseEnter={() => setHoveredId(s.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    background: hoveredId === s.id ? cardBgHover : cardBg,
                    border: `1px solid ${hoveredId === s.id ? cardBorderHover : cardBorder}`,
                    borderRadius: 16, padding: "14px 16px", marginBottom: 8,
                    cursor: "pointer", transition: "all .15s",
                    transform: hoveredId === s.id ? "translateX(2px)" : "none",
                    boxShadow: isLight && hoveredId === s.id ? "0 2px 12px rgba(0,0,0,.06)" : "none",
                  }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ flex: 1, marginRight: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, color: textPrimary }}>
                        {s.name}
                        {s.source === "ocm" && <span style={{ fontSize: 10, color: "#FFC043", marginLeft: 6 }}>OCM</span>}
                      </div>
                      <div style={{ fontSize: 11, color: textSub }}>
                        {s.distance_km != null && <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{s.distance_km.toFixed(1)} km away</span>}
                        {s.address && <span style={{ marginLeft: 4 }}>· {s.address.slice(0, 30)}{s.address.length > 30 ? "…" : ""}</span>}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); router.push(`/station/${s.id}`); }} style={{ padding: "6px 14px", borderRadius: 9, background: accent, color: "#050708", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", flexShrink: 0 }}>
                      Book
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {Array.from({ length: Math.min(total, 5) }, (_, i) => (
                      <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < free ? "#00E676" : "#FFC043", boxShadow: i < free ? "0 0 4px rgba(0,230,118,.5)" : "none", flexShrink: 0 }} />
                    ))}
                    <span style={{ fontSize: 11, color: textSub, marginLeft: 2, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{free}/{total} free</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: sc, background: `${sc}18`, border: `1px solid ${sc}30` }}>
                      {status === "AVAILABLE" ? "Open" : status === "OCCUPIED" ? "Busy" : "Closed"}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Empty */}
            {!loading && !apiError && filtered.length === 0 && (
              <div style={{ padding: "40px 0", textAlign: "center", color: textSub }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 6 }}>No stations found</p>
                <p style={{ fontSize: 12 }}>Try a different search or adjust your filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Map ── */}
        <div className="discover-map" style={{ position: "relative", overflow: "hidden" }}>
          <LeafletMap
            stations={filtered}
            userLat={userLat} userLng={userLng}
            flyToLat={searchLat} flyToLng={searchLng}
            hoveredId={hoveredId}
            onStationClick={() => {/* handled inside LeafletMap */}}
            isLight={isLight}
          />

          {/* Legend */}
          <div style={{
            position: "absolute", bottom: 24, left: 16,
            background: isLight ? "rgba(255,255,255,.92)" : "rgba(10,13,14,.88)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            border: `1px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.07)"}`,
            borderRadius: 14, padding: "10px 16px",
            display: "flex", gap: 14, fontSize: 11, color: textSub,
            zIndex: 800, boxShadow: "0 4px 20px rgba(0,0,0,.2)",
          }}>
            {[["#00E676", "Available"], ["#FFC043", "Busy"], ["#495154", "Offline"]].map(([c, l]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block", boxShadow: c === "#00E676" ? "0 0 4px rgba(0,230,118,.6)" : "none" }} />{l}
              </span>
            ))}
          </div>

          {/* Sign-in CTA */}
          {!authed && (
            <div style={{
              position: "absolute", top: 16, right: 16,
              background: isLight ? "rgba(255,255,255,.96)" : "rgba(16,20,21,.92)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: `1px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(0,230,118,.2)"}`,
              borderRadius: 16, padding: "16px 20px", maxWidth: 230, zIndex: 800,
              boxShadow: "0 8px 32px rgba(0,0,0,.25)",
            }}>
              <p style={{ fontSize: 13, color: textSub, marginBottom: 12, lineHeight: 1.5 }}>
                Sign in to book a slot and pay online.
              </p>
              <button onClick={() => router.push("/login")} style={{
                width: "100%", padding: "10px 16px", borderRadius: 10,
                background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
                color: "#050708", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
              }}>Sign in →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
