"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { loadGoogleMaps, getPlacePredictions, getPlaceDetail, mapsReady, PlacePrediction, PlaceDetail } from "@/lib/services/googleMaps";

// ── Nominatim fallback (no API key required) ────────────────────────────────
type Prediction = PlacePrediction & { _lat?: number; _lng?: number };

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: { city?: string; state?: string; country?: string; town?: string; village?: string };
}

async function fetchNominatim(query: string, signal: AbortSignal): Promise<Prediction[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=IN&limit=6&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal, headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  const data: NominatimResult[] = await res.json();
  return data.map(r => {
    const addr = r.address ?? {};
    const city = addr.city ?? addr.town ?? addr.village ?? "";
    const state = addr.state ?? "";
    const parts = r.display_name.split(",");
    const main = parts[0].trim();
    const secondary = [city, state].filter(Boolean).join(", ") || parts.slice(1, 3).join(",").trim();
    return {
      place_id: `nominatim-${r.place_id}`,
      description: r.display_name,
      main_text: main,
      secondary_text: secondary,
      _lat: parseFloat(r.lat),
      _lng: parseFloat(r.lon),
    };
  });
}

interface Props {
  value: string;
  onChange: (display: string, detail?: PlaceDetail) => void;
  placeholder?: string;
  inputStyle?: React.CSSProperties;
  className?: string;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  accentColor?: string;
  dropdownBg?: string;
  dropdownBorder?: string;
  textPrimary?: string;
  textSub?: string;
}

export default function PlacesAutocomplete({
  value, onChange, placeholder, inputStyle, className, id, onKeyDown,
  accentColor = "#00E676",
  dropdownBg = "#13161C",
  dropdownBorder = "rgba(255,255,255,0.08)",
  textPrimary = "#E2E8F0",
  textSub = "#8896A4",
}: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [useNominatim, setUseNominatim] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  // Load Google Maps SDK once on mount; fall back to Nominatim if unavailable
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        if (mapsReady()) {
          setMapsLoaded(true);
        } else {
          setUseNominatim(true);
        }
      })
      .catch(() => setUseNominatim(true));
  }, []);

  const fetchPredictions = useCallback(async (text: string) => {
    abortRef.current?.abort();
    if (justSelectedRef.current) { justSelectedRef.current = false; return; }
    if (!text.trim() || text.length < 2) {
      setPredictions([]); setOpen(false); return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      let results: Prediction[];
      if (mapsLoaded) {
        results = await getPlacePredictions(text, ctrl.signal);
      } else if (useNominatim) {
        results = await fetchNominatim(text, ctrl.signal);
      } else {
        return;
      }
      setPredictions(results);
      setOpen(results.length > 0);
      setActiveIdx(-1);
    } catch { /* aborted */ }
  }, [mapsLoaded, useNominatim]);

  useEffect(() => {
    const t = setTimeout(() => fetchPredictions(value), 300);
    return () => clearTimeout(t);
  }, [value, fetchPredictions]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function selectPrediction(p: Prediction) {
    justSelectedRef.current = true;
    setOpen(false);
    setPredictions([]);
    onChange(p.main_text || p.description);
    try {
      if (useNominatim && p._lat != null && p._lng != null) {
        const detail: PlaceDetail = {
          place_id: p.place_id,
          formatted_address: p.description,
          name: p.main_text,
          lat: p._lat,
          lng: p._lng,
        };
        onChange(p.main_text || p.description, detail);
      } else if (mapsLoaded) {
        const detail = await getPlaceDetail(p.place_id);
        onChange(detail.formatted_address || p.description, detail);
      }
    } catch {
      onChange(p.main_text || p.description);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (open && predictions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, predictions.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); return; }
      if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); selectPrediction(predictions[activeIdx]); return; }
      if (e.key === "Escape") { setOpen(false); return; }
    }
    onKeyDown?.(e);
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <input
        id={id}
        className={className}
        value={value}
        placeholder={placeholder}
        style={inputStyle}
        autoComplete="off"
        onChange={e => { onChange(e.target.value); }}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {open && predictions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 999,
          background: dropdownBg,
          border: `1px solid ${dropdownBorder}`,
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          overflow: "hidden",
        }}>
          {predictions.map((p, i) => (
            <button
              key={p.place_id}
              onMouseDown={() => selectPrediction(p)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                width: "100%", padding: "11px 14px", textAlign: "left",
                background: i === activeIdx ? `${accentColor}12` : "transparent",
                border: "none", borderBottom: i < predictions.length - 1 ? `1px solid ${dropdownBorder}` : "none",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                transition: "background .1s",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill={i === activeIdx ? accentColor : textSub}/>
              </svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 1 }}>{p.main_text}</div>
                <div style={{ fontSize: 11, color: textSub }}>{p.secondary_text}</div>
              </div>
            </button>
          ))}
          <div style={{ padding: "6px 14px", fontSize: 10, color: textSub, borderTop: `1px solid ${dropdownBorder}`, textAlign: "right" }}>
            {useNominatim ? "© OpenStreetMap" : "Powered by Google"}
          </div>
        </div>
      )}
    </div>
  );
}
