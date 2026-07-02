"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

function getToken() {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )cg_access=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : "";
}

interface ChargerForm {
  label: string; charger_type: string; power_kw: string;
  connector_type: string; price_per_kwh: string;
}

const CONNECTOR_TYPES = ["CCS2", "TYPE2", "CHADEMO", "GBT", "BHARAT_AC", "BHARAT_DC"];
const AMENITIES_OPTIONS = ["Restroom", "Cafe", "WiFi", "Parking", "CCTV", "24/7 Access", "Covered", "EV Lounge"];

export default function NewStationPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();
  const { isLight } = useTheme();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const bg          = isLight ? "#F8FAFC" : "#0A0D0E";
  const cardBg      = isLight ? "#FFFFFF" : "#101415";
  const cardBorder  = isLight ? "#E2E8F0" : "#222829";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#6B7479";
  const accent      = isLight ? "#00D26A" : "#00E676";
  const raisedBg    = isLight ? "#F1F5F9" : "#181D1F";
  const inputBg     = isLight ? "#F8FAFC" : "#0A0D0E";
  const inputBorder = isLight ? "#CBD5E1" : "#2E3638";

  const [name, setName]         = useState("");
  const [address, setAddress]   = useState("");
  const [city, setCity]         = useState("");
  const [state, setState]       = useState("");
  const [pincode, setPincode]   = useState("");
  const [lat, setLat]           = useState("");
  const [lng, setLng]           = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [chargers, setChargers] = useState<ChargerForm[]>([
    { label: "Bay 1", charger_type: "DC", power_kw: "50", connector_type: "CCS2", price_per_kwh: "1800" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: inputBg, border: `1px solid ${inputBorder}`,
    borderRadius: 10, padding: "11px 14px",
    color: textPrimary, fontSize: 14, outline: "none", fontFamily: "inherit",
  };

  function toggleAmenity(a: string) {
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  }

  function updateCharger(i: number, field: keyof ChargerForm, value: string) {
    setChargers(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  function addCharger() {
    setChargers(prev => [
      ...prev,
      { label: `Bay ${prev.length + 1}`, charger_type: "DC", power_kw: "50", connector_type: "CCS2", price_per_kwh: "1800" },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSubmitting(true);
    try {
      const token = getToken();
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
        })),
      };
      const res = await fetch(`/api/v1/owner/stations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    <div className="owner-pad" style={{ padding: "28px 32px", maxWidth: 720 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>Add New Station</h1>
        <p style={{ fontSize: 13, color: textSub, marginBottom: 28 }}>Your station will be reviewed by admin before going live.</p>

        <form onSubmit={handleSubmit}>

          {/* Station details */}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "22px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: textPrimary, marginBottom: 18 }}>Station Details</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>Station Name *</label>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sector 18 EV Hub" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>Full Address *</label>
                <input required value={address} onChange={e => setAddress(e.target.value)} placeholder="Plot 12, Sector 18, Noida" style={inputStyle} />
              </div>
              <div className="new-station-addr-grid">
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>City</label>
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="Noida" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>State</label>
                  <input value={state} onChange={e => setState(e.target.value)} placeholder="Uttar Pradesh" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>Pincode</label>
                  <input value={pincode} onChange={e => setPincode(e.target.value)} placeholder="201301" style={inputStyle} />
                </div>
              </div>
              <div className="new-station-latlng-grid">
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>Latitude *</label>
                  <input required type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="28.5706" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>Longitude *</label>
                  <input required type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="77.3219" style={inputStyle} />
                </div>
              </div>
              <p style={{ fontSize: 12, color: textSub }}>
                💡 Find coordinates: <a href="https://maps.google.com" target="_blank" rel="noreferrer" style={{ color: accent }}>Right-click on Google Maps → &ldquo;What&apos;s here?&rdquo;</a>
              </p>
            </div>
          </div>

          {/* Amenities */}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "22px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: textPrimary, marginBottom: 14 }}>Amenities</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {AMENITIES_OPTIONS.map(a => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)} style={{
                  padding: "7px 14px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                  background: amenities.includes(a) ? (isLight ? "#DCFCE7" : "#00532B") : raisedBg,
                  border: `1px solid ${amenities.includes(a) ? (isLight ? "#86EFAC" : "#00A455") : cardBorder}`,
                  color: amenities.includes(a) ? (isLight ? "#16A34A" : "#4DFFA6") : textSub,
                  transition: "all .12s", fontFamily: "inherit",
                }}>{a}</button>
              ))}
            </div>
          </div>

          {/* Chargers */}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "22px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>Chargers</h2>
              <button type="button" onClick={addCharger} style={{
                padding: "7px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub,
                cursor: "pointer", fontFamily: "inherit",
              }}>+ Add Charger</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {chargers.map((c, i) => (
                <div key={i} style={{ background: raisedBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>Charger {i + 1}</span>
                    {chargers.length > 1 && (
                      <button type="button" onClick={() => setChargers(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background: "none", border: "none", color: "#FF5A5F", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="new-station-charger-grid">
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: textSub, marginBottom: 5 }}>Label</label>
                      <input value={c.label} onChange={e => updateCharger(i, "label", e.target.value)} style={inputStyle} placeholder="Bay 1" />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: textSub, marginBottom: 5 }}>Type</label>
                      <select value={c.charger_type} onChange={e => updateCharger(i, "charger_type", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                        <option value="DC">DC Fast</option>
                        <option value="AC">AC Slow</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: textSub, marginBottom: 5 }}>Connector</label>
                      <select value={c.connector_type} onChange={e => updateCharger(i, "connector_type", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                        {CONNECTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: textSub, marginBottom: 5 }}>Power (kW)</label>
                      <input type="number" value={c.power_kw} onChange={e => updateCharger(i, "power_kw", e.target.value)} style={inputStyle} placeholder="50" min="1" max="400" />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: textSub, marginBottom: 5 }}>Price (paise/kWh) — ₹18/kWh = 1800</label>
                      <input type="number" value={c.price_per_kwh} onChange={e => updateCharger(i, "price_per_kwh", e.target.value)} style={inputStyle} placeholder="1800" min="100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 16, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 13 }}>{error}</div>
          )}

          <button type="submit" disabled={submitting} style={{
            width: "100%", padding: "15px", borderRadius: 14, fontSize: 15, fontWeight: 700,
            background: submitting ? raisedBg : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
            color: submitting ? textSub : "#050708",
            border: "none", cursor: submitting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {submitting ? <><span className="spinner" />Creating station…</> : "Submit for Review →"}
          </button>
        </form>
    </div>
  );
}
