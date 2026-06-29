"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { vehicles as vehiclesApi, Vehicle, VehicleCreateRequest } from "@/lib/api";
import { checkAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

const CONNECTORS = ["CCS2", "TYPE2", "CHADEMO", "GBT", "BHARAT_AC", "BHARAT_DC"];

const CONNECTOR_META: Record<string, { label: string; color: string }> = {
  CCS2:      { label: "CCS2",       color: "#00E676" },
  TYPE2:     { label: "Type 2",     color: "#22D3EE" },
  CHADEMO:   { label: "CHAdeMO",    color: "#FFC043" },
  GBT:       { label: "GB/T",       color: "#A78BFA" },
  BHARAT_AC: { label: "Bharat AC",  color: "#F472B6" },
  BHARAT_DC: { label: "Bharat DC",  color: "#FB923C" },
};

const BRAND_MODELS: Record<string, { models: string[]; connector: string; battery: number; range: number }[]> = {
  "Tata Motors": [
    { models: ["Nexon EV"],    connector: "CCS2",  battery: 40.5, range: 465 },
    { models: ["Tigor EV"],    connector: "CCS2",  battery: 26.0, range: 306 },
    { models: ["Punch EV"],    connector: "CCS2",  battery: 35.0, range: 421 },
    { models: ["Curvv EV"],    connector: "CCS2",  battery: 55.0, range: 502 },
  ],
  "MG Motor": [
    { models: ["ZS EV"],       connector: "CCS2",  battery: 50.3, range: 461 },
    { models: ["Comet EV"],    connector: "CCS2",  battery: 17.3, range: 230 },
  ],
  "Hyundai": [
    { models: ["Kona Electric"], connector: "CCS2", battery: 39.2, range: 452 },
    { models: ["Ioniq 5"],       connector: "CCS2", battery: 72.6, range: 631 },
    { models: ["Ioniq 6"],       connector: "CCS2", battery: 77.4, range: 614 },
  ],
  "Mahindra": [
    { models: ["XUV400"],      connector: "CCS2",  battery: 39.4, range: 456 },
    { models: ["BE 6e"],       connector: "CCS2",  battery: 79.0, range: 682 },
  ],
  "BYD": [
    { models: ["Atto 3"],      connector: "CCS2",  battery: 60.5, range: 521 },
    { models: ["Seal"],        connector: "CCS2",  battery: 82.56, range: 650 },
    { models: ["e6"],          connector: "CCS2",  battery: 71.7, range: 415 },
  ],
  "Kia": [
    { models: ["EV6"],         connector: "CCS2",  battery: 77.4, range: 708 },
    { models: ["EV9"],         connector: "CCS2",  battery: 99.8, range: 563 },
  ],
  "BMW": [
    { models: ["iX"],          connector: "CCS2",  battery: 111.5, range: 630 },
    { models: ["i4"],          connector: "CCS2",  battery: 83.9, range: 590 },
  ],
  "Other": [],
};

const BLANK: VehicleCreateRequest = {
  brand: "", model: "", battery_kwh: 40, range_km: undefined, connector_type: "CCS2",
};

export default function VehiclesPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [list, setList]           = useState<Vehicle[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState<VehicleCreateRequest>(BLANK);
  const [saving, setSaving]       = useState(false);
  const [saveErr, setSaveErr]     = useState("");
  const [deleting, setDeleting]   = useState<string | null>(null);

  const bg          = isLight ? "#F8FAFC" : "#0A0D0E";
  const cardBg      = isLight ? "#FFFFFF" : "#101415";
  const cardBorder  = isLight ? "#E2E8F0" : "#222829";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#6B7479";
  const textMuted   = isLight ? "#94A3B8" : "#495154";
  const accent      = isLight ? "#00D26A" : "#00E676";
  const accentDim   = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBrd   = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";
  const raisedBg    = isLight ? "#F1F5F9" : "#181D1F";
  const inputBg     = isLight ? "#F8FAFC" : "#101415";
  const inputBorder = isLight ? "#CBD5E1" : "#2E3638";

  function load() {
    setLoading(true); setError("");
    vehiclesApi.list()
      .then(setList)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load vehicles"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    checkAuth().then(ok => { if (!ok) { router.push("/login"); return; } load(); });
  }, [router]);

  // Auto-fill battery/range/connector when brand+model selected from presets
  function applyPreset(brand: string, modelName: string) {
    const group = BRAND_MODELS[brand];
    if (!group) return;
    const preset = group.find(g => g.models.includes(modelName));
    if (preset) {
      setForm(f => ({ ...f, brand, model: modelName, connector_type: preset.connector, battery_kwh: preset.battery, range_km: preset.range }));
    } else {
      setForm(f => ({ ...f, brand, model: modelName }));
    }
  }

  async function saveVehicle() {
    if (!form.brand || !form.model) { setSaveErr("Brand and model are required."); return; }
    setSaving(true); setSaveErr("");
    try {
      await vehiclesApi.create(form);
      setShowAdd(false);
      setForm(BLANK);
      load();
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : "Failed to add vehicle");
    } finally { setSaving(false); }
  }

  async function makeDefault(id: string) {
    try {
      await vehiclesApi.setDefault(id);
      load();
    } catch { /* ignore */ }
  }

  async function deleteVehicle(id: string) {
    setDeleting(id);
    try {
      await vehiclesApi.delete(id);
      load();
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: inputBg, border: `1px solid ${inputBorder}`,
    borderRadius: 10, padding: "11px 14px",
    color: textPrimary, fontSize: 14, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600,
    letterSpacing: ".08em", textTransform: "uppercase",
    color: textSub, marginBottom: 6,
  };

  const brandList = Object.keys(BRAND_MODELS);
  const selectedBrand = form.brand in BRAND_MODELS ? form.brand : "";
  const modelOptions = selectedBrand
    ? BRAND_MODELS[selectedBrand].flatMap(g => g.models)
    : [];

  return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />

      <div className="fade-up" style={{ maxWidth: 680, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>My Vehicles</h1>
            <p style={{ fontSize: 14, color: textSub }}>Add your EV so we can match compatible chargers.</p>
          </div>
          <button onClick={() => { setShowAdd(v => !v); setSaveErr(""); setForm(BLANK); }} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "11px 20px", borderRadius: 12,
            background: showAdd ? raisedBg : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
            color: showAdd ? textSub : "#050708",
            border: showAdd ? `1px solid ${cardBorder}` : "none",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>
            {showAdd ? "✕ Cancel" : "+ Add vehicle"}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "24px", marginBottom: 24, boxShadow: isLight ? "0 4px 20px rgba(0,0,0,.06)" : "none" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, marginBottom: 20 }}>Add a vehicle</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Brand</label>
                <select value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value, model: "" }))} style={inputStyle}>
                  <option value="">Select brand…</option>
                  {brandList.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Model</label>
                {modelOptions.length > 0 ? (
                  <select value={form.model} onChange={e => applyPreset(form.brand, e.target.value)} style={inputStyle}>
                    <option value="">Select model…</option>
                    {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value="__other">Other (enter manually)</option>
                  </select>
                ) : (
                  <input placeholder="e.g. Nexon EV Max" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} style={inputStyle} />
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Battery (kWh)</label>
                <input type="number" min={5} max={200} value={form.battery_kwh} onChange={e => setForm(f => ({ ...f, battery_kwh: +e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Range (km) <span style={{ color: textMuted }}>opt</span></label>
                <input type="number" min={50} max={1000} placeholder="e.g. 465" value={form.range_km ?? ""} onChange={e => setForm(f => ({ ...f, range_km: e.target.value ? +e.target.value : undefined }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Connector</label>
                <select value={form.connector_type} onChange={e => setForm(f => ({ ...f, connector_type: e.target.value }))} style={inputStyle}>
                  {CONNECTORS.map(c => <option key={c} value={c}>{CONNECTOR_META[c]?.label ?? c}</option>)}
                </select>
              </div>
            </div>

            {saveErr && (
              <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 13 }}>{saveErr}</div>
            )}

            <button onClick={saveVehicle} disabled={saving} style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: saving ? raisedBg : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
              color: saving ? textSub : "#050708",
              fontSize: 15, fontWeight: 700, border: "none", cursor: saving ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {saving ? <><span className="spinner" />Saving…</> : "Add vehicle →"}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: "16px 18px", borderRadius: 14, marginBottom: 20, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "#FF5A5F", fontSize: 14 }}>⚠ {error}</span>
            <button onClick={load} style={{ padding: "8px 16px", borderRadius: 10, background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 13, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0", color: textSub, fontSize: 14 }}>
            <span className="spinner" style={{ borderColor: cardBorder, borderTopColor: accent, width: 18, height: 18 }} />
            Loading vehicles…
          </div>
        )}

        {/* Vehicle list */}
        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {list.length === 0 && !showAdd && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, margin: "0 auto 16px", background: accentDim, border: `1px solid ${accentBrd}`, display: "grid", placeItems: "center", fontSize: 32 }}>🚗</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>No vehicles added</h3>
                <p style={{ color: textSub, fontSize: 14, maxWidth: 300, margin: "0 auto 20px" }}>Add your EV to get accurate charging recommendations and connector matching.</p>
                <button onClick={() => setShowAdd(true)} style={{ padding: "12px 24px", borderRadius: 12, background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`, color: "#050708", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
                  + Add my first vehicle
                </button>
              </div>
            )}

            {list.map(v => {
              const conn = CONNECTOR_META[v.connector_type] ?? { label: v.connector_type, color: "#98A1A6" };
              return (
                <div key={v.id} style={{ background: cardBg, border: `1px solid ${v.is_default ? accentBrd : cardBorder}`, borderRadius: 18, padding: "18px 20px", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none", position: "relative" }}>
                  {v.is_default && (
                    <div style={{ position: "absolute", top: 16, right: 16, padding: "3px 10px", borderRadius: 999, background: accentDim, border: `1px solid ${accentBrd}`, fontSize: 11, fontWeight: 600, color: accent }}>Default</div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: raisedBg, border: `1px solid ${cardBorder}`, display: "grid", placeItems: "center", fontSize: 22 }}>🔋</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: textPrimary, marginBottom: 2 }}>{v.brand} {v.model}</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: conn.color, background: `${conn.color}18`, padding: "2px 8px", borderRadius: 999 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: conn.color, display: "inline-block" }} />{conn.label}
                        </span>
                        <span style={{ fontSize: 12, color: textSub }}>{v.battery_kwh} kWh</span>
                        {v.range_km && <span style={{ fontSize: 12, color: textSub }}>{v.range_km} km range</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    {!v.is_default && (
                      <button onClick={() => makeDefault(v.id)} style={{ flex: 1, padding: "9px", borderRadius: 10, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        Set as default
                      </button>
                    )}
                    <button
                      onClick={() => deleteVehicle(v.id)}
                      disabled={deleting === v.id}
                      style={{ padding: "9px 16px", borderRadius: 10, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.2)", color: "#FF5A5F", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      {deleting === v.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info footer */}
        {!loading && !error && list.length > 0 && (
          <div style={{ marginTop: 24, padding: "14px 18px", borderRadius: 14, background: accentDim, border: `1px solid ${accentBrd}` }}>
            <p style={{ fontSize: 13, color: isLight ? "#059669" : "#4DFFA6", lineHeight: 1.6 }}>
              Your default vehicle is used when planning routes to calculate charge stops and match compatible connectors automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

