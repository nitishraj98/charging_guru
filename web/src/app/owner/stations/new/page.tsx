"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, MapPin, Sparkles, Zap, ClipboardCheck } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { authFetch } from "@/lib/admin-ui";
import { getOwnerTheme, Card, Button, Breadcrumb } from "@/components/owner";

interface ChargerForm {
  label: string; charger_type: string; power_kw: string;
  connector_type: string; price_per_kwh: string;
  parking_fee_paise: string; idle_fee_paise_per_min: string;
}

const CONNECTOR_TYPES = ["CCS2", "TYPE2", "CHADEMO", "GBT", "BHARAT_AC", "BHARAT_DC"];
const AMENITIES_OPTIONS = ["Restroom", "Cafe", "WiFi", "Parking", "CCTV", "24/7 Access", "Covered", "EV Lounge"];

const STEPS = [
  { key: "basics",   label: "Basic Info", Icon: MapPin },
  { key: "amenities",label: "Amenities",  Icon: Sparkles },
  { key: "chargers", label: "Chargers",   Icon: Zap },
  { key: "review",   label: "Review",     Icon: ClipboardCheck },
] as const;

export default function NewStationPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const th = getOwnerTheme(isLight);

  const [step, setStep] = useState(0);
  const [name, setName]         = useState("");
  const [address, setAddress]   = useState("");
  const [city, setCity]         = useState("");
  const [state, setState]       = useState("");
  const [pincode, setPincode]   = useState("");
  const [lat, setLat]           = useState("");
  const [lng, setLng]           = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [chargers, setChargers] = useState<ChargerForm[]>([
    { label: "Bay 1", charger_type: "DC", power_kw: "50", connector_type: "CCS2", price_per_kwh: "1800", parking_fee_paise: "0", idle_fee_paise_per_min: "0" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [stepError, setStepError]   = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: th.raised, border: `1px solid ${th.border}`,
    borderRadius: 10, padding: "11px 14px",
    color: th.text, fontSize: 14, outline: "none", fontFamily: th.sans,
  };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: th.textSub, marginBottom: 6 };

  function toggleAmenity(a: string) {
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  }
  function updateCharger(i: number, field: keyof ChargerForm, value: string) {
    setChargers(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }
  function addCharger() {
    setChargers(prev => [...prev, { label: `Bay ${prev.length + 1}`, charger_type: "DC", power_kw: "50", connector_type: "CCS2", price_per_kwh: "1800", parking_fee_paise: "0", idle_fee_paise_per_min: "0" }]);
  }

  function validateStep(i: number): string {
    if (i === 0) {
      if (!name.trim()) return "Station name is required.";
      if (!address.trim()) return "Address is required.";
      if (!lat.trim() || isNaN(parseFloat(lat))) return "A valid latitude is required.";
      if (!lng.trim() || isNaN(parseFloat(lng))) return "A valid longitude is required.";
    }
    if (i === 2) {
      if (chargers.length === 0) return "Add at least one charger.";
      for (const c of chargers) {
        if (!c.label.trim()) return "Every charger needs a label.";
        if (!c.power_kw || parseFloat(c.power_kw) <= 0) return "Power (kW) must be greater than 0.";
        if (!c.price_per_kwh || parseInt(c.price_per_kwh) <= 0) return "Price per kWh must be greater than 0.";
      }
    }
    return "";
  }

  function goNext() {
    const err = validateStep(step);
    if (err) { setStepError(err); return; }
    setStepError("");
    setStep(s => Math.min(STEPS.length - 1, s + 1));
  }
  function goBack() {
    setStepError("");
    setStep(s => Math.max(0, s - 1));
  }

  async function handleSubmit() {
    setError(""); setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        amenities,
        chargers: chargers.map(c => ({
          label: c.label,
          charger_type: c.charger_type,
          power_kw: parseFloat(c.power_kw),
          connector_type: c.connector_type,
          price_per_kwh: parseInt(c.price_per_kwh),
          parking_fee_paise: parseInt(c.parking_fee_paise || "0"),
          idle_fee_paise_per_min: parseInt(c.idle_fee_paise_per_min || "0"),
        })),
      };
      const res = await authFetch("/api/v1/owner/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to create station");
      router.push("/owner");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create station");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="owner-pad owner-fade-up">
      <Breadcrumb th={th} items={[{ label: "My Stations" }, { label: "Add Station" }]} />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: th.text, margin: "10px 0 4px" }}>Add New Station</h1>
      <p style={{ fontSize: 13, color: th.textSub, marginBottom: 26 }}>Your station will be reviewed by admin before going live.</p>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 26 }}>
        {STEPS.map((s, i) => {
          const done = i < step, active = i === step;
          return (
            <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center",
                  background: done ? th.accent : active ? th.accentDim : th.raised,
                  border: `1.5px solid ${done || active ? th.accent : th.border}`,
                  color: done ? "#04140A" : active ? th.accent : th.textMuted,
                  transition: "all .2s",
                }}>
                  {done ? <Check size={14} /> : <s.Icon size={14} />}
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 650, color: done || active ? th.text : th.textMuted, whiteSpace: "nowrap" }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? th.accent : th.border, margin: "0 8px 18px", transition: "background .3s" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card th={th} style={{ marginBottom: 16 }}>
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: th.text, marginBottom: 2 }}>Station Details</h2>
            <div>
              <label style={labelStyle}>Station Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sector 18 EV Hub" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Full Address *</label>
              <input required value={address} onChange={e => setAddress(e.target.value)} placeholder="Plot 12, Sector 18, Noida" style={inputStyle} />
            </div>
            <div className="new-station-addr-grid">
              <div>
                <label style={labelStyle}>City</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="Noida" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <input value={state} onChange={e => setState(e.target.value)} placeholder="Uttar Pradesh" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Pincode</label>
                <input value={pincode} onChange={e => setPincode(e.target.value)} placeholder="201301" style={inputStyle} />
              </div>
            </div>
            <div className="new-station-latlng-grid">
              <div>
                <label style={labelStyle}>Latitude *</label>
                <input required type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="28.5706" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Longitude *</label>
                <input required type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="77.3219" style={inputStyle} />
              </div>
            </div>
            <p style={{ fontSize: 12, color: th.textSub }}>
              💡 Find coordinates: <a href="https://maps.google.com" target="_blank" rel="noreferrer" style={{ color: th.accent }}>Right-click on Google Maps → &ldquo;What&apos;s here?&rdquo;</a>
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: th.text, marginBottom: 4 }}>Amenities</h2>
            <p style={{ fontSize: 12.5, color: th.textSub, marginBottom: 16 }}>Optional — helps drivers know what to expect on arrival.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {AMENITIES_OPTIONS.map(a => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)} style={{
                  padding: "8px 15px", borderRadius: 999, fontSize: 13, cursor: "pointer", fontFamily: th.sans,
                  background: amenities.includes(a) ? th.accentDim : th.raised,
                  border: `1px solid ${amenities.includes(a) ? th.accentBorder : th.border}`,
                  color: amenities.includes(a) ? th.accent : th.textSub,
                  transition: "all .12s", fontWeight: amenities.includes(a) ? 650 : 450,
                }}>{amenities.includes(a) && "✓ "}{a}</button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: th.text }}>Chargers</h2>
              <Button th={th} variant="secondary" size="sm" onClick={addCharger}>+ Add Charger</Button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {chargers.map((c, i) => (
                <div key={i} style={{ background: th.raised, border: `1px solid ${th.border}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: th.text }}>Charger {i + 1}</span>
                    {chargers.length > 1 && (
                      <button type="button" onClick={() => setChargers(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background: "none", border: "none", color: th.danger, cursor: "pointer", fontSize: 13, fontFamily: th.sans }}>
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="new-station-charger-grid">
                    <div>
                      <label style={{ ...labelStyle, fontSize: 10.5 }}>Label</label>
                      <input value={c.label} onChange={e => updateCharger(i, "label", e.target.value)} style={inputStyle} placeholder="Bay 1" />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 10.5 }}>Type</label>
                      <select value={c.charger_type} onChange={e => updateCharger(i, "charger_type", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                        <option value="DC">DC Fast</option>
                        <option value="AC">AC Slow</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 10.5 }}>Connector</label>
                      <select value={c.connector_type} onChange={e => updateCharger(i, "connector_type", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                        {CONNECTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 10.5 }}>Power (kW)</label>
                      <input type="number" value={c.power_kw} onChange={e => updateCharger(i, "power_kw", e.target.value)} style={inputStyle} placeholder="50" min="1" max="400" />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ ...labelStyle, fontSize: 10.5 }}>Price (paise/kWh) — ₹18/kWh = 1800</label>
                      <input type="number" value={c.price_per_kwh} onChange={e => updateCharger(i, "price_per_kwh", e.target.value)} style={inputStyle} placeholder="1800" min="100" />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 10.5 }}>Parking Fee (paise) — optional</label>
                      <input type="number" value={c.parking_fee_paise} onChange={e => updateCharger(i, "parking_fee_paise", e.target.value)} style={inputStyle} placeholder="0" min="0" />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 10.5 }}>Idle Fee (paise/min) — optional</label>
                      <input type="number" value={c.idle_fee_paise_per_min} onChange={e => updateCharger(i, "idle_fee_paise_per_min", e.target.value)} style={inputStyle} placeholder="0" min="0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: th.text, marginBottom: 16 }}>Review &amp; Submit</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <ReviewRow th={th} label="Name" value={name} />
              <ReviewRow th={th} label="Address" value={`${address}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}${pincode ? ` – ${pincode}` : ""}`} />
              <ReviewRow th={th} label="Coordinates" value={`${lat}, ${lng}`} />
              <ReviewRow th={th} label="Amenities" value={amenities.length ? amenities.join(", ") : "None selected"} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: th.textMuted, marginBottom: 8 }}>Chargers ({chargers.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {chargers.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: th.raised, border: `1px solid ${th.border}` }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{c.label} · {c.connector_type}</span>
                      <span style={{ fontSize: 12, color: th.textSub, fontFamily: th.mono }}>
                        {c.power_kw}kW · ₹{(parseInt(c.price_per_kwh || "0") / 100).toFixed(0)}/kWh
                        {parseInt(c.parking_fee_paise || "0") > 0 && ` · +₹${(parseInt(c.parking_fee_paise) / 100).toFixed(0)} parking`}
                        {parseInt(c.idle_fee_paise_per_min || "0") > 0 && ` · +₹${(parseInt(c.idle_fee_paise_per_min) / 100).toFixed(0)}/min idle`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {(stepError || error) && (
        <div style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 16, background: th.dangerDim, border: `1px solid ${th.danger}30`, color: th.danger, fontSize: 13 }}>
          {stepError || error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        {step > 0 && (
          <Button th={th} variant="secondary" icon={<ChevronLeft size={14} />} onClick={goBack}>Back</Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button th={th} variant="primary" fullWidth onClick={goNext}>
            Continue <ChevronRight size={14} />
          </Button>
        ) : (
          <Button th={th} variant="primary" fullWidth loading={submitting} onClick={handleSubmit}>
            {submitting ? "Submitting…" : "Submit for Review →"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ th, label, value }: { th: ReturnType<typeof getOwnerTheme>; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: th.textMuted, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: th.text }}>{value}</div>
    </div>
  );
}
