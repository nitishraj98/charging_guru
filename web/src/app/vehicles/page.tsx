"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Plus, X, Battery, Zap, Trash2, Star } from "lucide-react";
import { vehicles as vehiclesApi, Vehicle, VehicleCreateRequest } from "@/lib/api";
import { checkAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

const CONNECTORS = ["CCS2", "TYPE2", "CHADEMO", "GBT", "BHARAT_AC", "BHARAT_DC"];

const CONNECTOR_META: Record<string, { label: string; color: string }> = {
  CCS2:      { label: "CCS2",      color: "#00E676" },
  TYPE2:     { label: "Type 2",    color: "#22D3EE" },
  CHADEMO:   { label: "CHAdeMO",   color: "#FFC043" },
  GBT:       { label: "GB/T",      color: "#A78BFA" },
  BHARAT_AC: { label: "Bharat AC", color: "#F472B6" },
  BHARAT_DC: { label: "Bharat DC", color: "#FB923C" },
};

const BRAND_MODELS: Record<string, { models: string[]; connector: string; battery: number; range: number }[]> = {
  "Tata Motors": [
    { models: ["Nexon EV"],   connector: "CCS2", battery: 40.5, range: 465 },
    { models: ["Tigor EV"],   connector: "CCS2", battery: 26.0, range: 306 },
    { models: ["Punch EV"],   connector: "CCS2", battery: 35.0, range: 421 },
    { models: ["Curvv EV"],   connector: "CCS2", battery: 55.0, range: 502 },
  ],
  "MG Motor": [
    { models: ["ZS EV"],      connector: "CCS2", battery: 50.3, range: 461 },
    { models: ["Comet EV"],   connector: "CCS2", battery: 17.3, range: 230 },
  ],
  "Hyundai": [
    { models: ["Kona Electric"], connector: "CCS2", battery: 39.2, range: 452 },
    { models: ["Ioniq 5"],       connector: "CCS2", battery: 72.6, range: 631 },
    { models: ["Ioniq 6"],       connector: "CCS2", battery: 77.4, range: 614 },
  ],
  "Mahindra": [
    { models: ["XUV400"], connector: "CCS2", battery: 39.4, range: 456 },
    { models: ["BE 6e"],  connector: "CCS2", battery: 79.0, range: 682 },
  ],
  "BYD": [
    { models: ["Atto 3"], connector: "CCS2", battery: 60.5,  range: 521 },
    { models: ["Seal"],   connector: "CCS2", battery: 82.56, range: 650 },
    { models: ["e6"],     connector: "CCS2", battery: 71.7,  range: 415 },
  ],
  "Kia": [
    { models: ["EV6"], connector: "CCS2", battery: 77.4, range: 708 },
    { models: ["EV9"], connector: "CCS2", battery: 99.8, range: 563 },
  ],
  "BMW": [
    { models: ["iX"], connector: "CCS2", battery: 111.5, range: 630 },
    { models: ["i4"], connector: "CCS2", battery: 83.9,  range: 590 },
  ],
  "Other": [],
};

const BLANK: VehicleCreateRequest = {
  brand: "", model: "", battery_kwh: 40, range_km: undefined, connector_type: "CCS2",
};

export default function VehiclesPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [list, setList]         = useState<Vehicle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState<VehicleCreateRequest>(BLANK);
  const [saving, setSaving]     = useState(false);
  const [saveErr, setSaveErr]   = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const cardBg     = isLight ? "#FFFFFF" : "#101415";
  const cardBorder = isLight ? "#CBD5E1" : "#222829";
  const textPrimary= isLight ? "#0F172A" : "#E6EBED";
  const textSub    = isLight ? "#64748B" : "#6B7479";
  const textMuted  = isLight ? "#64748B" : "#495154";
  const accent     = isLight ? "#00D26A" : "#00E676";
  const accentDim  = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBrd  = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";
  const raisedBg   = isLight ? "#F1F5F9" : "#181D1F";
  const inputBg    = isLight ? "#F3F7FB" : "#101415";
  const inputBorder= isLight ? "#94A3B8" : "#2E3638";

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
    try { await vehiclesApi.create(form); setShowAdd(false); setForm(BLANK); load(); }
    catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : "Failed to add vehicle"); }
    finally { setSaving(false); }
  }

  async function makeDefault(id: string) {
    try { await vehiclesApi.setDefault(id); load(); } catch { /* ignore */ }
  }

  async function deleteVehicle(id: string) {
    setDeleting(id);
    try { await vehiclesApi.delete(id); load(); } catch { /* ignore */ }
    finally { setDeleting(null); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: inputBg, border: `1px solid ${inputBorder}`,
    borderRadius: 10, padding: "11px 14px",
    color: textPrimary, fontSize: 14, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700,
    letterSpacing: ".08em", textTransform: "uppercase",
    color: textSub, marginBottom: 6,
  };

  const brandList = Object.keys(BRAND_MODELS);
  const selectedBrand = form.brand in BRAND_MODELS ? form.brand : "";
  const modelOptions = selectedBrand ? BRAND_MODELS[selectedBrand].flatMap(g => g.models) : [];

  return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div className="fade-up" style={{ maxWidth: 840, margin: "0 auto", padding: "36px 24px 100px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: textPrimary, marginBottom: 4, letterSpacing: "-.02em" }}>My Garage</h1>
            <p style={{ fontSize: 14, color: textSub }}>Manage your EVs — we match compatible chargers automatically.</p>
          </div>
          <button onClick={() => { setShowAdd(v => !v); setSaveErr(""); setForm(BLANK); }} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 12,
            background: showAdd ? raisedBg : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
            color: showAdd ? textSub : "#050708",
            border: showAdd ? `1px solid ${cardBorder}` : "none",
            fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all .15s",
          }}>
            {showAdd ? <><X size={14} strokeWidth={2.5} /> Cancel</> : <><Plus size={14} strokeWidth={2.5} /> Add vehicle</>}
          </button>
        </div>

        {/* Stats strip */}
        {!loading && list.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
            {[
              { label: "Vehicles",        value: list.length,                                              Icon: Car },
              { label: "Default set",     value: list.some(v => v.is_default) ? "Yes" : "No",             Icon: Star },
              { label: "Connector types", value: Array.from(new Set(list.map(v => v.connector_type))).length, Icon: Zap },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, minWidth: 120, padding: "14px 18px", borderRadius: 16, background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <s.Icon size={14} strokeWidth={2} color={textMuted} />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: textPrimary, marginBottom: 3 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: textSub }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 22, padding: "24px", marginBottom: 24, boxShadow: isLight ? "0 4px 24px rgba(0,0,0,.06)" : "0 0 0 1px rgba(0,230,118,.06)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: textPrimary, marginBottom: 22 }}>Add a vehicle</h3>
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
                <label style={labelStyle}>Range (km) <span style={{ color: textMuted, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>opt</span></label>
                <input type="number" min={50} max={1000} placeholder="e.g. 465" value={form.range_km ?? ""} onChange={e => setForm(f => ({ ...f, range_km: e.target.value ? +e.target.value : undefined }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Connector</label>
                <select value={form.connector_type} onChange={e => setForm(f => ({ ...f, connector_type: e.target.value }))} style={inputStyle}>
                  {CONNECTORS.map(c => <option key={c} value={c}>{CONNECTOR_META[c]?.label ?? c}</option>)}
                </select>
              </div>
            </div>
            {saveErr && <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 13 }}>{saveErr}</div>}
            <button onClick={saveVehicle} disabled={saving} style={{ width: "100%", padding: "14px", borderRadius: 13, background: saving ? raisedBg : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`, color: saving ? textSub : "#050708", fontSize: 15, fontWeight: 700, border: "none", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {saving ? <><span className="spinner" />Saving…</> : "Add to garage →"}
            </button>
          </div>
        )}

        {error && (
          <div style={{ padding: "16px 18px", borderRadius: 14, marginBottom: 20, background: "rgba(255,90,95,.07)", border: "1px solid rgba(255,90,95,.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "#FF5A5F", fontSize: 14 }}>{error}</span>
            <button onClick={load} style={{ padding: "8px 16px", borderRadius: 10, background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 13, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 0", color: textSub, fontSize: 14 }}>
            <span className="spinner" style={{ borderColor: cardBorder, borderTopColor: accent, width: 20, height: 20 }} />
            Loading garage…
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {list.length === 0 && !showAdd && (
              <div style={{ textAlign: "center", padding: "64px 20px" }}>
                <div style={{ width: 80, height: 80, borderRadius: 24, margin: "0 auto 20px", background: accentDim, border: `1px solid ${accentBrd}`, display: "grid", placeItems: "center", color: accent }}>
                  <Car size={36} strokeWidth={1.5} />
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 700, color: textPrimary, marginBottom: 10 }}>Your garage is empty</h3>
                <p style={{ color: textSub, fontSize: 14, maxWidth: 300, margin: "0 auto 24px", lineHeight: 1.7 }}>
                  Add your EV to get accurate charging recommendations and automatic connector matching.
                </p>
                <button onClick={() => setShowAdd(true)} style={{ padding: "13px 28px", borderRadius: 13, background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`, color: "#050708", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
                  Add my first vehicle →
                </button>
              </div>
            )}

            {list.map(v => {
              const conn = CONNECTOR_META[v.connector_type] ?? { label: v.connector_type, color: "#98A1A6" };
              const batteryPct = Math.min(100, Math.round((v.battery_kwh / 120) * 100));
              return (
                <div key={v.id} style={{ background: cardBg, border: `1px solid ${v.is_default ? accentBrd : cardBorder}`, borderRadius: 20, padding: "20px 22px", boxShadow: v.is_default ? (isLight ? "0 2px 16px rgba(0,210,106,.08)" : "0 0 0 1px rgba(0,230,118,.06)") : (isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none"), position: "relative", transition: "all .15s" }}>
                  {v.is_default && (
                    <div style={{ position: "absolute", top: 16, right: 18, display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", background: accentDim, border: `1px solid ${accentBrd}`, color: accent }}>
                      <Star size={9} strokeWidth={2.5} fill={accent} />
                      Default
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0, background: raisedBg, border: `1px solid ${cardBorder}`, display: "grid", placeItems: "center", color: textMuted }}>
                      <Car size={24} strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 17, color: textPrimary, marginBottom: 6 }}>{v.brand} {v.model}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: conn.color, background: `${conn.color}14`, padding: "2px 9px", borderRadius: 999 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: conn.color, display: "inline-block" }} />
                          {conn.label}
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: textSub, display: "flex", alignItems: "center", gap: 4 }}>
                          <Battery size={12} strokeWidth={2} />{v.battery_kwh} kWh
                        </span>
                        {v.range_km && <span style={{ fontSize: 12, color: textMuted }}>{v.range_km} km range</span>}
                      </div>
                    </div>
                  </div>

                  {/* Battery bar */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: textMuted, marginBottom: 5 }}>
                      <span>Usable capacity</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{v.battery_kwh} kWh</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: isLight ? "#CBD5E1" : "#1A2022", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${batteryPct}%`, borderRadius: 999, background: `linear-gradient(90deg,${accent},${isLight ? "#00A855" : "#00C862"})`, transition: "width .6s ease" }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {!v.is_default && (
                      <button onClick={() => makeDefault(v.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 10, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        <Star size={13} strokeWidth={2} /> Set as default
                      </button>
                    )}
                    <button onClick={() => deleteVehicle(v.id)} disabled={deleting === v.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: "rgba(255,90,95,.07)", border: "1px solid rgba(255,90,95,.18)", color: "#FF5A5F", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      <Trash2 size={13} strokeWidth={2} />{deleting === v.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && list.length > 0 && (
          <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 16, background: accentDim, border: `1px solid ${accentBrd}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Zap size={14} strokeWidth={2} color={isLight ? "#059669" : "#4DFFA6"} style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: isLight ? "#059669" : "#4DFFA6", lineHeight: 1.7, margin: 0 }}>
              Your default vehicle is used for route planning to calculate charge stops and match compatible connectors automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
