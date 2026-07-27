"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { MapPin, Zap, ChevronDown, Plus, BookOpen, ScanLine, Navigation, Star } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { authFetch } from "@/lib/admin-ui";
import {
  getOwnerTheme, Card, CardHeader, Breadcrumb, StatusBadge, Pill, Button, CardListSkeleton,
} from "@/components/owner";
import { useToast } from "@/components/owner/Toast";

interface Charger {
  id: string; label: string; charger_type: string; connector_type: string;
  power_kw: number; price_per_kwh: number; status: string;
  parking_fee_paise?: number; idle_fee_paise_per_min?: number;
}
interface Station {
  id: string; name: string; city: string | null; address: string; lat: number; lng: number;
  status: string; rating_avg: number; rating_count: number; amenities: string[]; chargers: Charger[];
}
interface ChargerForm {
  label: string; charger_type: string; power_kw: string;
  connector_type: string; price_per_kwh: string;
  parking_fee_paise: string; idle_fee_paise_per_min: string;
}

const CONNECTOR_TYPES = ["CCS2", "TYPE2", "CHADEMO", "GBT", "BHARAT_AC", "BHARAT_DC"];
const CHARGER_LABELS: Record<string, string> = { AVAILABLE: "Available", MAINTENANCE: "Maintenance", OFFLINE: "Offline" };

function emptyChargerForm(n: number): ChargerForm {
  return { label: `Bay ${n}`, charger_type: "DC", power_kw: "50", connector_type: "CCS2", price_per_kwh: "1800", parking_fee_paise: "0", idle_fee_paise_per_min: "0" };
}

export default function OwnerStationDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { isLight } = useTheme();
  const th = getOwnerTheme(isLight);
  const toast = useToast();

  const [station, setStation]   = useState<Station | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [updatingCharger, setUpdatingCharger] = useState<string | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm]         = useState<ChargerForm>(emptyChargerForm(1));
  const [adding, setAdding]     = useState(false);
  const [addError, setAddError] = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: th.raised, border: `1px solid ${th.border}`,
    borderRadius: 10, padding: "10px 13px", color: th.text, fontSize: 13.5, outline: "none", fontFamily: th.sans,
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
      if (res.ok) { toast.show("success", `Charger set to ${CHARGER_LABELS[newStatus] ?? newStatus}`); await load(); }
      else toast.show("error", "Failed to update charger status");
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
          parking_fee_paise: parseInt(form.parking_fee_paise || "0"),
          idle_fee_paise_per_min: parseInt(form.idle_fee_paise_per_min || "0"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? "Failed to add charger");
      setShowAddForm(false);
      setForm(emptyChargerForm((station?.chargers.length ?? 0) + 2));
      toast.show("success", `${form.label} added to ${station?.name ?? "station"}`);
      await load();
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to add charger");
    } finally {
      setAdding(false);
    }
  }

  if (loading) return (
    <div className="owner-pad">
      <div style={{ width: 120, height: 14, background: th.raised, borderRadius: 6, marginBottom: 18 }} />
      <CardListSkeleton th={th} count={2} />
    </div>
  );

  if (error || !station) return (
    <div className="owner-pad">
      <div style={{ padding: "16px 20px", borderRadius: 14, background: th.dangerDim, border: `1px solid ${th.danger}30`, color: th.danger, fontSize: 14, marginBottom: 16 }}>
        {error || "Station not found."}
      </div>
      <Button th={th} variant="secondary" onClick={() => router.push("/owner/stations")}>← Back to My Stations</Button>
    </div>
  );

  const avail = station.chargers.filter(c => c.status === "AVAILABLE").length;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  return (
    <div className="owner-pad owner-fade-up">
      <Breadcrumb th={th} items={[{ label: "My Stations" }, { label: station.name }]} />
      <button onClick={() => router.push("/owner/stations")} style={{ background: "none", border: "none", color: th.textSub, fontSize: 13, cursor: "pointer", margin: "10px 0 18px", display: "flex", alignItems: "center", gap: 6, fontFamily: th.sans }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        My Stations
      </button>

      {/* Header card */}
      <Card th={th} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: th.accentDim, border: `1.5px solid ${th.accentBorder}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <MapPin size={20} color={th.accent} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 19, fontWeight: 800, color: th.text, letterSpacing: "-0.02em" }}>{station.name}</h1>
                <StatusBadge status={station.status} th={th} />
              </div>
              <div style={{ fontSize: 13, color: th.textSub }}>{station.city ? `${station.city} · ` : ""}{station.address}</div>
              {station.rating_count > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
                  <Star size={11} fill={th.warn} color={th.warn} />
                  <span style={{ fontSize: 12, color: th.textSub }}>{station.rating_avg.toFixed(1)} ({station.rating_count} reviews)</span>
                </div>
              )}
            </div>
          </div>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <Button th={th} variant="secondary" icon={<Navigation size={13} color={th.accent} />}>Directions</Button>
          </a>
        </div>

        {station.amenities.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
            {station.amenities.map(a => <Pill key={a} th={th}>{a}</Pill>)}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <Button th={th} variant="secondary" icon={<BookOpen size={13} />} fullWidth onClick={() => router.push("/owner/bookings")}>Bookings</Button>
          <Button th={th} variant="primary" icon={<ScanLine size={13} />} fullWidth onClick={() => router.push("/owner/sessions")}>Sessions</Button>
        </div>
      </Card>

      {/* Chargers */}
      <Card th={th}>
        <CardHeader
          th={th}
          title="Chargers"
          subtitle={`${avail}/${station.chargers.length} available`}
          icon={<Zap size={14} color={th.accent} />}
          action={
            <Button th={th} variant={showAddForm ? "secondary" : "primary"} size="sm"
              icon={<Plus size={13} strokeWidth={2.5} style={{ transform: showAddForm ? "rotate(45deg)" : "none", transition: "transform .15s" }} />}
              onClick={() => { setShowAddForm(v => !v); setAddError(""); }}>
              {showAddForm ? "Cancel" : "Add Charger"}
            </Button>
          }
        />

        {/* Add charger form */}
        {showAddForm && (
          <form onSubmit={handleAddCharger} style={{ background: th.raised, border: `1px solid ${th.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div className="new-station-charger-grid">
              <div>
                <label style={labelStyle(th)}>Label</label>
                <input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={inputStyle} placeholder="Bay 2" />
              </div>
              <div>
                <label style={labelStyle(th)}>Type</label>
                <select value={form.charger_type} onChange={e => setForm(f => ({ ...f, charger_type: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="DC">DC Fast</option>
                  <option value="AC">AC Slow</option>
                </select>
              </div>
              <div>
                <label style={labelStyle(th)}>Connector</label>
                <select value={form.connector_type} onChange={e => setForm(f => ({ ...f, connector_type: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                  {CONNECTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle(th)}>Power (kW)</label>
                <input required type="number" value={form.power_kw} onChange={e => setForm(f => ({ ...f, power_kw: e.target.value }))} style={inputStyle} placeholder="50" min="1" max="400" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle(th)}>Price (paise/kWh) — ₹18/kWh = 1800</label>
                <input required type="number" value={form.price_per_kwh} onChange={e => setForm(f => ({ ...f, price_per_kwh: e.target.value }))} style={inputStyle} placeholder="1800" min="100" />
              </div>
              <div>
                <label style={labelStyle(th)}>Parking Fee (paise) — optional</label>
                <input type="number" value={form.parking_fee_paise} onChange={e => setForm(f => ({ ...f, parking_fee_paise: e.target.value }))} style={inputStyle} placeholder="0" min="0" />
              </div>
              <div>
                <label style={labelStyle(th)}>Idle Fee (paise/min) — optional</label>
                <input type="number" value={form.idle_fee_paise_per_min} onChange={e => setForm(f => ({ ...f, idle_fee_paise_per_min: e.target.value }))} style={inputStyle} placeholder="0" min="0" />
              </div>
            </div>
            {addError && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: th.dangerDim, border: `1px solid ${th.danger}30`, color: th.danger, fontSize: 12 }}>{addError}</div>
            )}
            <Button th={th} type="submit" variant="primary" loading={adding} fullWidth style={{ marginTop: 14 }}>
              {adding ? "Adding…" : "Add Charger"}
            </Button>
          </form>
        )}

        {station.chargers.length === 0 ? (
          <p style={{ fontSize: 13, color: th.textSub, padding: "12px 0" }}>No chargers configured yet — add one above.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {station.chargers.map(c => {
              const meta = { AVAILABLE: th.success, MAINTENANCE: "#EA580C", OFFLINE: th.textMuted, OCCUPIED: th.info, BOOKED: th.warn }[c.status] ?? th.textSub;
              const open = openMenuFor === c.id;
              return (
                <div key={c.id} style={{ position: "relative", background: th.raised, border: `1px solid ${open ? meta + "50" : th.border}`, borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta, flexShrink: 0, boxShadow: `0 0 8px ${meta}` }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: th.text, flex: 1 }}>{c.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: th.textSub, fontFamily: th.mono }}>{c.power_kw}kW</span>
                  </div>
                  <div style={{ fontSize: 11, color: th.textSub, marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ padding: "2px 7px", borderRadius: 6, background: `${meta}18`, color: meta, fontSize: 10, fontWeight: 700 }}>{c.connector_type}</span>
                    <span style={{ padding: "2px 7px", borderRadius: 6, background: th.card, fontSize: 10, color: th.textSub }}>₹{(c.price_per_kwh / 100).toFixed(0)}/kWh</span>
                    {!!c.parking_fee_paise && (
                      <span style={{ padding: "2px 7px", borderRadius: 6, background: th.card, fontSize: 10, color: th.textSub }}>+₹{(c.parking_fee_paise / 100).toFixed(0)} parking</span>
                    )}
                    {!!c.idle_fee_paise_per_min && (
                      <span style={{ padding: "2px 7px", borderRadius: 6, background: th.card, fontSize: 10, color: th.textSub }}>+₹{(c.idle_fee_paise_per_min / 100).toFixed(0)}/min idle</span>
                    )}
                  </div>
                  <button
                    onClick={() => setOpenMenuFor(open ? null : c.id)}
                    disabled={updatingCharger === c.id}
                    style={{
                      width: "100%", padding: "7px 12px", borderRadius: 9,
                      background: open ? `${meta}12` : th.card, border: `1px solid ${open ? meta + "40" : th.border}`,
                      color: open ? meta : th.textSub, fontSize: 12, fontWeight: 600,
                      cursor: updatingCharger === c.id ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: th.sans,
                    }}>
                    <span>{CHARGER_LABELS[c.status] ?? c.status}</span>
                    <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                  </button>

                  {open && (
                    <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20, background: th.card, border: `1px solid ${th.border}`, borderRadius: 12, overflow: "hidden", boxShadow: th.shadowLg }}>
                      {["AVAILABLE", "MAINTENANCE", "OFFLINE"].map(opt => {
                        const optColor = { AVAILABLE: th.success, MAINTENANCE: "#EA580C", OFFLINE: th.textMuted }[opt]!;
                        return (
                          <button key={opt} onClick={() => { setOpenMenuFor(null); if (opt !== c.status) setChargerStatus(c.id, opt); }}
                            style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, background: opt === c.status ? `${optColor}10` : "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: th.sans }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: optColor, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: opt === c.status ? 700 : 500, color: opt === c.status ? optColor : th.text }}>{CHARGER_LABELS[opt]}</span>
                            {opt === c.status && <span style={{ marginLeft: "auto", fontSize: 11, color: optColor }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function labelStyle(th: ReturnType<typeof getOwnerTheme>): React.CSSProperties {
  return { display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: th.textSub, marginBottom: 5 };
}
