"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { MapPin, Zap, ChevronDown, Plus, BookOpen, ScanLine, Navigation } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { authFetch } from "@/lib/admin-ui";

interface Charger {
  id: string; label: string; charger_type: string; connector_type: string;
  power_kw: number; price_per_kwh: number; status: string;
}
interface Station {
  id: string; name: string; city: string | null; address: string; lat: number; lng: number;
  status: string; rating_avg: number; rating_count: number; amenities: string[]; chargers: Charger[];
}
interface ChargerForm {
  label: string; charger_type: string; power_kw: string;
  connector_type: string; price_per_kwh: string;
}

const CONNECTOR_TYPES = ["CCS2", "TYPE2", "CHADEMO", "GBT", "BHARAT_AC", "BHARAT_DC"];

const CHARGER_COLOR: Record<string, string> = {
  AVAILABLE:   "#00E676",
  BOOKED:      "#FFC043",
  OCCUPIED:    "#22D3EE",
  MAINTENANCE: "#FF7849",
  OFFLINE:     "#495154",
};
const CHARGER_LABELS: Record<string, string> = {
  AVAILABLE: "Available", MAINTENANCE: "Maintenance", OFFLINE: "Offline",
};
const STATION_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  ACTIVE:           { color: "#00E676", bg: "rgba(0,230,118,.12)",  label: "Active" },
  PENDING_APPROVAL: { color: "#FFC043", bg: "rgba(255,192,67,.12)", label: "Pending Review" },
  SUSPENDED:        { color: "#FF7849", bg: "rgba(255,120,73,.12)", label: "Suspended" },
  REJECTED:         { color: "#FF5A5F", bg: "rgba(255,90,95,.12)",  label: "Rejected" },
};

function emptyChargerForm(n: number): ChargerForm {
  return { label: `Bay ${n}`, charger_type: "DC", power_kw: "50", connector_type: "CCS2", price_per_kwh: "1800" };
}

export default function OwnerStationDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { isLight } = useTheme();

  const [station, setStation]   = useState<Station | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [updatingCharger, setUpdatingCharger] = useState<string | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm]         = useState<ChargerForm>(emptyChargerForm(1));
  const [adding, setAdding]     = useState(false);
  const [addError, setAddError] = useState("");

  const cardBg      = isLight ? "#FFFFFF" : "#101415";
  const cardBorder  = isLight ? "#CBD5E1" : "#222829";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#6B7479";
  const accent      = isLight ? "#00D26A" : "#00E676";
  const raisedBg    = isLight ? "#F1F5F9" : "#181D1F";
  const inputBg     = isLight ? "#F3F7FB" : "#0A0D0E";
  const inputBorder = isLight ? "#94A3B8" : "#2E3638";

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: inputBg, border: `1px solid ${inputBorder}`,
    borderRadius: 10, padding: "11px 14px", color: textPrimary, fontSize: 14, outline: "none", fontFamily: "inherit",
  };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await authFetch(`/api/v1/owner/stations/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
      setStation(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load station");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function setChargerStatus(chargerId: string, newStatus: string) {
    setUpdatingCharger(chargerId);
    try {
      const res = await authFetch(`/api/v1/chargers/${chargerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await load();
    } finally {
      setUpdatingCharger(null);
    }
  }

  async function handleAddCharger(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true); setAddError("");
    try {
      const res = await authFetch(`/api/v1/owner/stations/${id}/chargers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label,
          charger_type: form.charger_type,
          power_kw: parseFloat(form.power_kw),
          connector_type: form.connector_type,
          price_per_kwh: parseInt(form.price_per_kwh),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? "Failed to add charger");
      setShowAddForm(false);
      setForm(emptyChargerForm((station?.chargers.length ?? 0) + 2));
      await load();
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to add charger");
    } finally {
      setAdding(false);
    }
  }

  if (loading) return (
    <div className="owner-pad" style={{ padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${cardBorder}`, borderTopColor: accent, animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !station) return (
    <div className="owner-pad" style={{ padding: "28px 32px" }}>
      <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 14, marginBottom: 16 }}>
        {error || "Station not found."}
      </div>
      <button onClick={() => router.push("/owner/stations")} style={{ padding: "10px 20px", borderRadius: 11, background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 13, cursor: "pointer" }}>← Back to My Stations</button>
    </div>
  );

  const badge = STATION_BADGE[station.status] ?? { color: textSub, bg: raisedBg, label: station.status };
  const avail = station.chargers.filter(c => c.status === "AVAILABLE").length;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  return (
    <div className="owner-pad" style={{ padding: "28px 32px", maxWidth: 760 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Back */}
      <button onClick={() => router.push("/owner/stations")} style={{ background: "none", border: "none", color: textSub, fontSize: 13, cursor: "pointer", marginBottom: 18, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        My Stations
      </button>

      {/* Header card */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "22px 24px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: isLight ? "#F0FDF4" : "#0C1F12", border: `1.5px solid ${badge.color}30`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <MapPin size={19} color={badge.color} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 19, fontWeight: 800, color: textPrimary }}>{station.name}</h1>
                <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg }}>{badge.label}</span>
              </div>
              <div style={{ fontSize: 13, color: textSub }}>{station.city ? `${station.city} · ` : ""}{station.address}</div>
              {station.rating_count > 0 && (
                <div style={{ fontSize: 12, color: textSub, marginTop: 4 }}>⭐ {station.rating_avg.toFixed(1)} ({station.rating_count} reviews)</div>
              )}
            </div>
          </div>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 11, background: raisedBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 12, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
            <Navigation size={13} color={accent} /> Directions
          </a>
        </div>

        {station.amenities.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
            {station.amenities.map(a => (
              <span key={a} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub }}>{a}</span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={() => router.push("/owner/bookings")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", borderRadius: 11, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <BookOpen size={13} /> Bookings
          </button>
          <button onClick={() => router.push("/owner/sessions")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", borderRadius: 11, background: `${accent}12`, border: `1px solid ${accent}35`, color: accent, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <ScanLine size={13} /> Sessions
          </button>
        </div>
      </div>

      {/* Chargers */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "22px 24px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={13} color={accent} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>Chargers</h2>
            <span style={{ fontSize: 12, color: textSub }}>({avail}/{station.chargers.length} available)</span>
          </div>
          <button onClick={() => { setShowAddForm(v => !v); setAddError(""); }} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
            background: showAddForm ? raisedBg : `${accent}14`, border: `1px solid ${showAddForm ? cardBorder : accent + "40"}`,
            color: showAddForm ? textSub : accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            <Plus size={13} strokeWidth={2.5} style={{ transform: showAddForm ? "rotate(45deg)" : "none", transition: "transform .15s" }} />
            {showAddForm ? "Cancel" : "Add Charger"}
          </button>
        </div>

        {/* Add charger form */}
        {showAddForm && (
          <form onSubmit={handleAddCharger} style={{ background: raisedBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div className="new-station-charger-grid">
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: textSub, marginBottom: 5 }}>Label</label>
                <input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={inputStyle} placeholder="Bay 2" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: textSub, marginBottom: 5 }}>Type</label>
                <select value={form.charger_type} onChange={e => setForm(f => ({ ...f, charger_type: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="DC">DC Fast</option>
                  <option value="AC">AC Slow</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: textSub, marginBottom: 5 }}>Connector</label>
                <select value={form.connector_type} onChange={e => setForm(f => ({ ...f, connector_type: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                  {CONNECTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: textSub, marginBottom: 5 }}>Power (kW)</label>
                <input required type="number" value={form.power_kw} onChange={e => setForm(f => ({ ...f, power_kw: e.target.value }))} style={inputStyle} placeholder="50" min="1" max="400" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: textSub, marginBottom: 5 }}>Price (paise/kWh) — ₹18/kWh = 1800</label>
                <input required type="number" value={form.price_per_kwh} onChange={e => setForm(f => ({ ...f, price_per_kwh: e.target.value }))} style={inputStyle} placeholder="1800" min="100" />
              </div>
            </div>
            {addError && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 12 }}>{addError}</div>
            )}
            <button type="submit" disabled={adding} style={{
              marginTop: 14, width: "100%", padding: "12px", borderRadius: 11, fontSize: 13, fontWeight: 700,
              background: adding ? cardBg : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
              color: adding ? textSub : "#050708", border: "none", cursor: adding ? "not-allowed" : "pointer",
            }}>{adding ? "Adding…" : "Add Charger"}</button>
          </form>
        )}

        {station.chargers.length === 0 ? (
          <p style={{ fontSize: 13, color: textSub, padding: "12px 0" }}>No chargers configured yet — add one above.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {station.chargers.map(c => {
              const color = CHARGER_COLOR[c.status] ?? textSub;
              const open = openMenuFor === c.id;
              return (
                <div key={c.id} style={{ position: "relative", background: raisedBg, border: `1px solid ${open ? color + "50" : cardBorder}`, borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: textPrimary, flex: 1 }}>{c.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: textSub, fontFamily: "'JetBrains Mono',monospace" }}>{c.power_kw}kW</span>
                  </div>
                  <div style={{ fontSize: 11, color: textSub, marginBottom: 12, display: "flex", gap: 6 }}>
                    <span style={{ padding: "2px 7px", borderRadius: 6, background: `${color}12`, color, fontSize: 10, fontWeight: 700 }}>{c.connector_type}</span>
                    <span style={{ padding: "2px 7px", borderRadius: 6, background: cardBg, fontSize: 10, color: textSub }}>₹{(c.price_per_kwh / 100).toFixed(0)}/kWh</span>
                  </div>
                  <button
                    onClick={() => setOpenMenuFor(open ? null : c.id)}
                    disabled={updatingCharger === c.id}
                    style={{
                      width: "100%", padding: "7px 12px", borderRadius: 9,
                      background: open ? `${color}12` : cardBg, border: `1px solid ${open ? color + "40" : cardBorder}`,
                      color: open ? color : textSub, fontSize: 12, fontWeight: 600,
                      cursor: updatingCharger === c.id ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit",
                    }}>
                    <span>{CHARGER_LABELS[c.status] ?? c.status}</span>
                    <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                  </button>

                  {open && (
                    <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
                      {["AVAILABLE", "MAINTENANCE", "OFFLINE"].map(opt => (
                        <button key={opt} onClick={() => { setOpenMenuFor(null); if (opt !== c.status) setChargerStatus(c.id, opt); }}
                          style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, background: opt === c.status ? `${CHARGER_COLOR[opt]}10` : "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: CHARGER_COLOR[opt], flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: opt === c.status ? 700 : 500, color: opt === c.status ? CHARGER_COLOR[opt] : textPrimary }}>{CHARGER_LABELS[opt]}</span>
                          {opt === c.status && <span style={{ marginLeft: "auto", fontSize: 11, color: CHARGER_COLOR[opt] }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
