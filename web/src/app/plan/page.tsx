"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import { listVehicles, STATIC_VEHICLES } from "@/lib/services/vehicleService";
import type { UserVehicle } from "@/lib/services/vehicleService";
import type { PlaceDetail } from "@/lib/services/googleMaps";

const POPULAR_ROUTES = [
  { from: "Delhi",     to: "Agra",      km: 233  },
  { from: "Mumbai",    to: "Pune",      km: 149  },
  { from: "Noida",     to: "Patna",     km: 1010 },
  { from: "Bangalore", to: "Mysore",    km: 150  },
  { from: "Chennai",   to: "Hyderabad", km: 630  },
  { from: "Jaipur",    to: "Udaipur",   km: 421  },
];

const STATS = [
  { value: "5,200+", label: "Chargers" },
  { value: "42",     label: "Cities"   },
  { value: "30s",    label: "Booking"  },
  { value: "99.2%",  label: "Uptime"   },
];

function VehicleIcon({ active, accent }: { active: boolean; accent: string }) {
  const c = active ? accent : "#6B8070";
  return (
    <svg width="36" height="22" viewBox="0 0 72 36" fill="none">
      <rect x="8" y="20" width="56" height="10" rx="5" fill={c} opacity=".12"/>
      <path d="M10 26 C10 26 13 14 22 12 L36 10 L50 12 C59 14 62 26 62 26" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <rect x="8" y="23" width="56" height="8" rx="4" stroke={c} strokeWidth="2" fill="none"/>
      <circle cx="20" cy="31" r="4" stroke={c} strokeWidth="2" fill="none"/>
      <circle cx="52" cy="31" r="4" stroke={c} strokeWidth="2" fill="none"/>
      <rect x="28" y="13" width="16" height="7" rx="2.5" stroke={c} strokeWidth="1.5" fill="none"/>
      <path d="M63 22 L67 22 M63 26 L67 26" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>
      {active && (
        <path d="M36 6 L33 11 H36 L35 16 L39 11 H36 L36 6Z" fill={accent} opacity=".9"/>
      )}
    </svg>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const { isLight } = useTheme();

  const [source,       setSource]      = useState("");
  const [sourceLat,    setSourceLat]   = useState<number | undefined>();
  const [sourceLng,    setSourceLng]   = useState<number | undefined>();
  const [dest,         setDest]        = useState("");
  const [destLat,      setDestLat]     = useState<number | undefined>();
  const [destLng,      setDestLng]     = useState<number | undefined>();
  const [vehicleId,    setVehicleId]   = useState(STATIC_VEHICLES[0].id);
  const [userVehicles, setUserVehicles]= useState<UserVehicle[]>(STATIC_VEHICLES);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [battery,      setBattery]     = useState(80);
  const [planning,     setPlanning]    = useState(false);
  const [error,        setError]       = useState("");

  // Load real vehicles from backend (falls back to static)
  useEffect(() => {
    const ctrl = new AbortController();
    listVehicles(ctrl.signal)
      .then(v => { setUserVehicles(v); setVehicleId(v.find(x => x.is_default)?.id ?? v[0]?.id ?? STATIC_VEHICLES[0].id); })
      .catch(() => {})
      .finally(() => setLoadingVehicles(false));
    return () => ctrl.abort();
  }, []);

  const cardBg      = isLight ? "#FFFFFF"                 : "#111318";
  const cardBorder  = isLight ? "rgba(15,23,42,0.10)"    : "rgba(255,255,255,0.07)";
  const sectionBg   = isLight ? "rgba(15,23,42,0.03)"    : "rgba(255,255,255,0.04)";
  const inputBg     = isLight ? "#F8FAFC"                 : "#0C0E12";
  const inputBorder = isLight ? "rgba(15,23,42,0.12)"    : "rgba(255,255,255,0.09)";
  const textPrimary = isLight ? "#0F172A"                 : "#E2E8F0";
  const textSub     = isLight ? "#64748B"                 : "#8896A4";
  const textMuted   = isLight ? "#94A3B8"                 : "#4A5568";
  const accent      = isLight ? "#00D26A"                 : "#00E676";
  const accentDim   = isLight ? "rgba(0,210,106,0.08)"   : "rgba(0,230,118,0.07)";
  const accentBorder= isLight ? "rgba(0,210,106,0.30)"   : "rgba(0,230,118,0.22)";
  const raisedBg    = isLight ? "#F1F5F9"                 : "#181C22";
  const panelBg     = isLight
    ? "linear-gradient(145deg,#0A1F12,#0D2B18)"
    : "linear-gradient(145deg,#060D08,#0A1A0D)";

  const selectedVehicle = userVehicles.find(v => v.id === vehicleId) ?? userVehicles[0] ?? STATIC_VEHICLES[0];
  const currentRangeKm  = Math.round((selectedVehicle.range_km ?? 400) * (battery / 100));
  const batteryColor    = battery >= 60 ? "#00E676" : battery >= 30 ? "#FFC043" : "#FF5A5F";

  function handlePopular(from: string, to: string) {
    setSource(from); setDest(to); setError("");
  }

  function handlePlan() {
    if (!source.trim() || !dest.trim()) { setError("Please enter both origin and destination."); return; }
    if (source.trim().toLowerCase() === dest.trim().toLowerCase()) { setError("Origin and destination can't be the same."); return; }
    setError("");
    setPlanning(true);
    const params = new URLSearchParams({
      source:      source.trim(),
      destination: dest.trim(),
      vehicle_id:  vehicleId,
      battery:     String(battery),
    });
    if (sourceLat != null) params.set("src_lat", String(sourceLat));
    if (sourceLng != null) params.set("src_lng", String(sourceLng));
    if (destLat   != null) params.set("dst_lat", String(destLat));
    if (destLng   != null) params.set("dst_lng", String(destLng));
    router.push(`/plan/results?${params.toString()}`);
  }

  return (
    <div style={{ background: "transparent", minHeight: "100vh", fontFamily: "'Space Grotesk',system-ui,sans-serif" }}>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @keyframes ping-green  { 75%,100%{transform:scale(2);opacity:0} }
        @keyframes fade-up     { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        @keyframes spin        { to{transform:rotate(360deg)} }
        @keyframes glow-pulse  { 0%,100%{opacity:.6} 50%{opacity:1} }
        .plan-fade   { animation:fade-up .55s cubic-bezier(.16,1,.3,1) both; }
        .plan-fade-2 { animation:fade-up .55s cubic-bezier(.16,1,.3,1) .08s both; }
        .plan-fade-3 { animation:fade-up .55s cubic-bezier(.16,1,.3,1) .16s both; }

        .plan-input { transition:border-color .18s,box-shadow .18s; }
        .plan-input:focus { outline:none; border-color:${accent} !important; box-shadow:0 0 0 3px ${isLight ? "rgba(0,210,106,0.13)" : "rgba(0,230,118,0.09)"} !important; }
        .plan-input::placeholder { color:${textMuted}; }

        .plan-vchip { transition:all .18s cubic-bezier(.16,1,.3,1); border:none; }
        .plan-vchip:hover:not(.active-chip) { border-color:${accentBorder} !important; background:${accentDim} !important; transform:translateY(-1px); }

        .plan-swap { transition:all .22s cubic-bezier(.16,1,.3,1); }
        .plan-swap:hover { border-color:${accentBorder} !important; color:${accent} !important; background:${accentDim} !important; transform:rotate(180deg); }

        .plan-route-chip { transition:all .15s; }
        .plan-route-chip:hover { border-color:${accentBorder} !important; background:${accentDim} !important; }

        .plan-cta { transition:all .22s cubic-bezier(.16,1,.3,1); }
        .plan-cta:hover:not(:disabled) { transform:translateY(-2px); box-shadow:${isLight ? "0 10px 36px rgba(0,210,106,.50)" : "0 0 0 1px rgba(0,230,118,.55),0 0 52px rgba(0,230,118,.30)"} !important; }
        .plan-cta:active:not(:disabled) { transform:translateY(0px); }

        /* Battery range — hide default track, show custom bar via sibling */
        .battery-range { -webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:transparent;cursor:pointer;width:100%;display:block; }
        .battery-range::-webkit-slider-thumb { -webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:${batteryColor};border:3px solid ${isLight ? "#fff" : "#0B1410"};box-shadow:0 0 14px ${batteryColor}80;cursor:pointer;transition:transform .18s,box-shadow .18s; }
        .battery-range::-webkit-slider-thumb:hover { transform:scale(1.25);box-shadow:0 0 22px ${batteryColor}A0; }
        .battery-range::-moz-range-thumb { width:22px;height:22px;border-radius:50%;background:${batteryColor};border:3px solid ${isLight ? "#fff" : "#0B1410"};box-shadow:0 0 14px ${batteryColor}80;cursor:pointer; }

        @media(max-width:900px){.plan-two-col{grid-template-columns:1fr !important;}.plan-left-panel{display:none !important;}}
        @media(max-width:600px){.plan-vgrid{grid-template-columns:repeat(2,1fr) !important;}.plan-pgrid{grid-template-columns:repeat(2,1fr) !important;}}
      `}</style>

      <NavBar />

      <div className="plan-two-col" style={{
        display: "grid", gridTemplateColumns: "1fr 540px",
        minHeight: "calc(100vh - 68px)", maxWidth: 1180, margin: "0 auto",
        padding: "48px 24px 80px", gap: 52, alignItems: "start",
        position: "relative", zIndex: 1,
      }}>

        {/* ─────────────── LEFT panel ─────────────── */}
        <div className="plan-left-panel plan-fade" style={{ position: "sticky", top: 96 }}>
          {/* live badge */}
          <div style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px 6px 10px",borderRadius:999,marginBottom:28,background:accentDim,border:`1px solid ${accentBorder}` }}>
            <span style={{ position:"relative",display:"flex",width:8,height:8 }}>
              <span style={{ position:"absolute",inset:0,borderRadius:"50%",background:accent,opacity:.7,animation:"ping-green 1.8s cubic-bezier(0,0,.2,1) infinite" }}/>
              <span style={{ position:"relative",width:8,height:8,borderRadius:"50%",background:accent }}/>
            </span>
            <span style={{ fontSize:11,fontWeight:700,letterSpacing:".08em",color:accent }}>ROUTE PLANNER</span>
          </div>

          <h1 style={{ fontWeight:800,fontSize:"clamp(32px,3.6vw,52px)",lineHeight:1.06,letterSpacing:"-.04em",color:textPrimary,marginBottom:18 }}>
            Plan smarter.<br/>
            <span style={{ color:accent,textShadow:isLight?"none":`0 0 32px ${accent}80` }}>Charge faster.</span>
          </h1>
          <p style={{ fontSize:16,lineHeight:1.8,color:textSub,maxWidth:380,marginBottom:40 }}>
            Enter your route and we instantly find optimal charging stops, show live availability, and let you reserve every slot in one go.
          </p>

          <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:40 }}>
            {STATS.map(s => (
              <div key={s.label} style={{ padding:"18px 20px",borderRadius:16,background:isLight?cardBg:"rgba(0,210,106,0.04)",border:`1px solid ${cardBorder}`,boxShadow:isLight?"0 2px 12px rgba(0,0,0,.05)":"none" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:22,color:accent,letterSpacing:"-.02em",marginBottom:4,textShadow:isLight?"none":`0 0 16px ${accent}60` }}>{s.value}</div>
                <div style={{ fontSize:12,color:textSub,fontWeight:500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* How it works dark card */}
          <div style={{ borderRadius:20,padding:"24px 28px",background:panelBg,border:"1px solid rgba(0,210,106,0.14)",boxShadow:"0 0 0 1px rgba(0,210,106,0.06),0 20px 60px rgba(0,0,0,0.35)",position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:-60,right:-60,width:240,height:240,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,210,106,0.12) 0%,transparent 65%)",pointerEvents:"none",animation:"glow-pulse 4s ease-in-out infinite" }}/>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:".1em",color:"rgba(0,230,118,0.5)",marginBottom:12 }}>HOW IT WORKS</div>
            {[
              { n:"01",t:"Enter your route",     d:"City names or landmarks" },
              { n:"02",t:"Pick your vehicle",     d:"We calculate real range" },
              { n:"03",t:"Review charging stops", d:"AI-optimised waypoints"  },
              { n:"04",t:"Reserve & pay",         d:"All slots in one tap"    },
            ].map((step,i) => (
              <div key={step.n} style={{ display:"flex",alignItems:"flex-start",gap:14,paddingBottom:i<3?16:0,marginBottom:i<3?16:0,borderBottom:i<3?"1px solid rgba(0,210,106,0.07)":"none" }}>
                <div style={{ width:28,height:28,borderRadius:8,flexShrink:0,background:"rgba(0,210,106,0.10)",border:"1px solid rgba(0,210,106,0.20)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:700,color:accent }}>{step.n}</div>
                <div>
                  <div style={{ fontSize:13,fontWeight:600,color:"#D4EDE0",marginBottom:2 }}>{step.t}</div>
                  <div style={{ fontSize:11,color:"rgba(212,237,224,0.4)" }}>{step.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─────────────── RIGHT — premium planner card ─────────────── */}
        <div className="plan-fade-2">
          <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 28,
            overflow: "hidden",
            boxShadow: isLight
              ? "0 4px 48px rgba(0,0,0,.09),0 1px 3px rgba(0,0,0,.04)"
              : "0 0 0 1px rgba(0,210,106,0.09),0 32px 80px rgba(0,0,0,0.55)",
          }}>

            {/* ── Header ── */}
            <div style={{
              padding: "22px 32px",
              background: isLight
                ? "linear-gradient(135deg,rgba(0,210,106,0.07),rgba(34,211,238,0.04))"
                : "linear-gradient(135deg,rgba(0,210,106,0.08),rgba(34,211,238,0.04))",
              borderBottom: `1px solid ${cardBorder}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:42,height:42,borderRadius:13,background:isLight?"rgba(0,210,106,0.12)":"rgba(0,210,106,0.10)",border:`1px solid ${accentBorder}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  {/* lightning bolt */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L4.5 13.5H11.5L11 22L19.5 10.5H12.5L13 2Z" fill={accent} strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize:15,fontWeight:700,color:textPrimary,letterSpacing:"-.02em" }}>Journey Planner</div>
                  <div style={{ fontSize:11,color:textSub,marginTop:2 }}>AI-powered route optimisation</div>
                </div>
              </div>
              {/* LIVE pill */}
              <div style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:999,background:accentDim,border:`1px solid ${accentBorder}`,flexShrink:0 }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:accent,boxShadow:`0 0 6px ${accent}` }}/>
                <span style={{ fontSize:10,fontWeight:700,letterSpacing:".08em",color:accent }}>LIVE</span>
              </div>
            </div>

            <div style={{ padding:"28px 32px 0" }}>

              {/* ══ § 1 — ROUTE ══ */}
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill={accent} opacity=".85"/>
                </svg>
                <span style={{ fontSize:10,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:textMuted }}>Route</span>
              </div>

              {/* Route inputs + connector */}
              <div style={{ position:"relative",marginBottom:22 }}>
                {/* vertical connector */}
                <div style={{ position:"absolute",left:19,top:56,height:56,width:2,background:`linear-gradient(to bottom,#22D3EE,${accent})`,borderRadius:2,opacity:.4,zIndex:0,pointerEvents:"none" }}/>

                {/* FROM */}
                <div style={{ position:"relative",marginBottom:8 }}>
                  <div style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",zIndex:2 }}>
                    <div style={{ width:14,height:14,borderRadius:"50%",background:"#22D3EE",boxShadow:"0 0 12px rgba(34,211,238,.80),0 0 0 3px rgba(34,211,238,.20)" }}/>
                  </div>
                  <PlacesAutocomplete
                    value={source}
                    onChange={(display, detail?: PlaceDetail) => {
                      setSource(display); setError("");
                      setSourceLat(detail?.lat); setSourceLng(detail?.lng);
                    }}
                    onKeyDown={e => e.key==="Enter" && document.getElementById("plan-dest")?.focus()}
                    placeholder="From — Delhi, Mumbai, Noida…"
                    className="plan-input"
                    inputStyle={{ width:"100%",padding:"16px 16px 16px 42px",background:inputBg,border:`1.5px solid ${inputBorder}`,borderRadius:14,fontSize:14,color:textPrimary,outline:"none",boxSizing:"border-box",fontFamily:"inherit" }}
                    accentColor={accent} dropdownBg={cardBg} dropdownBorder={cardBorder} textPrimary={textPrimary} textSub={textSub}
                  />
                </div>

                {/* SWAP */}
                <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:8,position:"relative",zIndex:2 }}>
                  <button
                    className="plan-swap"
                    onClick={() => { const t=source; setSource(dest); setDest(t); }}
                    title="Swap origin & destination"
                    style={{ width:32,height:32,borderRadius:9,border:`1px solid ${cardBorder}`,background:raisedBg,color:textSub,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* TO */}
                <div style={{ position:"relative" }}>
                  <div style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",zIndex:2 }}>
                    <div style={{ width:14,height:14,borderRadius:"50%",background:accent,boxShadow:`0 0 12px ${accent}90,0 0 0 3px ${accent}25` }}/>
                  </div>
                  <PlacesAutocomplete
                    id="plan-dest"
                    value={dest}
                    onChange={(display, detail?: PlaceDetail) => {
                      setDest(display); setError("");
                      setDestLat(detail?.lat); setDestLng(detail?.lng);
                    }}
                    onKeyDown={e => e.key==="Enter" && handlePlan()}
                    placeholder="To — Agra, Pune, Patna…"
                    className="plan-input"
                    inputStyle={{ width:"100%",padding:"16px 16px 16px 42px",background:inputBg,border:`1.5px solid ${inputBorder}`,borderRadius:14,fontSize:14,color:textPrimary,outline:"none",boxSizing:"border-box",fontFamily:"inherit" }}
                    accentColor={accent} dropdownBg={cardBg} dropdownBorder={cardBorder} textPrimary={textPrimary} textSub={textSub}
                  />
                </div>
              </div>

              {/* divider */}
              <div style={{ height:1,background:cardBorder,margin:"0 -32px 24px" }}/>

              {/* ══ § 2 — VEHICLE ══ */}
              <div style={{ marginBottom:24 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M5 17H3a2 2 0 01-2-2V7a2 2 0 012-2h14l4 4v6a2 2 0 01-2 2h-2" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".85"/>
                    <circle cx="7" cy="17" r="2" stroke={accent} strokeWidth="2" opacity=".85"/>
                    <circle cx="17" cy="17" r="2" stroke={accent} strokeWidth="2" opacity=".85"/>
                  </svg>
                  <span style={{ fontSize:10,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:textMuted }}>Vehicle</span>
                </div>

                <div className="plan-vgrid" style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
                  {userVehicles.map(v => {
                    const active = vehicleId === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setVehicleId(v.id)}
                        className={`plan-vchip${active ? " active-chip" : ""}`}
                        style={{
                          padding:"14px 8px 12px",borderRadius:14,cursor:"pointer",
                          background: active ? accentDim : raisedBg,
                          border: `1.5px solid ${active ? accentBorder : cardBorder}`,
                          textAlign:"center",lineHeight:1.3,
                          boxShadow: active ? (isLight?"0 0 0 3px rgba(0,210,106,0.12)":"0 0 22px rgba(0,230,118,0.11)") : "none",
                          position:"relative",overflow:"hidden",
                          transition:"all .18s cubic-bezier(.16,1,.3,1)",
                        }}
                      >
                        {active && (
                          <div style={{ position:"absolute",inset:0,background:`radial-gradient(ellipse at 50% 0%,${accent}14,transparent 70%)`,pointerEvents:"none" }}/>
                        )}
                        <div style={{ display:"flex",justifyContent:"center",marginBottom:8 }}>
                          <VehicleIcon active={active} accent={accent}/>
                        </div>
                        <div style={{ fontSize:11.5,fontWeight:700,color:active?accent:textPrimary,letterSpacing:"-.01em",marginBottom:2 }}>{v.label}</div>
                        <div style={{ fontSize:10,color:textMuted,fontFamily:"'JetBrains Mono',monospace" }}>{v.range_km} km</div>
                        {active && (
                          <div style={{ marginTop:6,display:"flex",alignItems:"center",justifyContent:"center",gap:3 }}>
                            <svg width="7" height="7" viewBox="0 0 16 16" fill={accent}><path d="M8 1L3 7h4v7l5-6H8V1z"/></svg>
                            <span style={{ fontSize:9,fontWeight:700,color:accent,letterSpacing:".07em" }}>SELECTED</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* divider */}
              <div style={{ height:1,background:cardBorder,margin:"0 -32px 24px" }}/>

              {/* ══ § 3 — CHARGING PREFERENCES ══ */}
              <div style={{ marginBottom:24 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="2" width="12" height="18" rx="2" stroke={accent} strokeWidth="2" opacity=".85"/>
                    <path d="M10 2v2h4V2" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity=".85"/>
                    <path d="M8 10h8M8 14h6" stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity=".6"/>
                  </svg>
                  <span style={{ fontSize:10,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:textMuted }}>Charging Preferences</span>
                </div>

                {/* Battery header row */}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                  <span style={{ fontSize:13,fontWeight:500,color:textSub }}>Current battery</span>
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:700,color:batteryColor,textShadow:isLight?"none":`0 0 14px ${batteryColor}70` }}>{battery}%</span>
                    <span style={{ padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:raisedBg,border:`1px solid ${cardBorder}`,color:textSub }}>≈ {currentRangeKm} km</span>
                  </div>
                </div>

                {/* Custom battery visual */}
                <div style={{ position:"relative",height:8,borderRadius:999,background:isLight?"rgba(0,0,0,0.07)":"rgba(255,255,255,0.05)",border:`1px solid ${cardBorder}`,overflow:"hidden",marginBottom:4 }}>
                  <div style={{ position:"absolute",left:0,top:0,bottom:0,width:`${battery}%`,borderRadius:999,background:`linear-gradient(90deg,${batteryColor}BB,${batteryColor})`,boxShadow:`0 0 10px ${batteryColor}70`,transition:"width .2s,background .2s" }}/>
                </div>

                {/* Slider thumb */}
                <input
                  type="range" min={5} max={100} step={5}
                  value={battery}
                  onChange={e => setBattery(Number(e.target.value))}
                  className="battery-range"
                />

                <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:textMuted,marginTop:6,fontFamily:"'JetBrains Mono',monospace" }}>
                  <span>5%</span><span>50%</span><span>100%</span>
                </div>

                {/* Battery state pills */}
                <div style={{ marginTop:14,display:"flex",gap:8 }}>
                  {([ ["Low","#FF5A5F",battery<30], ["Medium","#FFC043",battery>=30&&battery<60], ["Optimal","#00E676",battery>=60] ] as [string,string,boolean][]).map(([lbl,col,isActive]) => (
                    <div key={lbl} style={{ flex:1,padding:"8px 6px",borderRadius:10,border:`1px solid ${isActive?col+"55":cardBorder}`,background:isActive?col+"14":"transparent",textAlign:"center",transition:"all .18s" }}>
                      <div style={{ fontSize:10,fontWeight:700,color:isActive?col:textMuted,letterSpacing:".04em" }}>{lbl}</div>
                      <div style={{ fontSize:9,color:textMuted,marginTop:1,fontFamily:"'JetBrains Mono',monospace" }}>{lbl==="Low"?"0–30%":lbl==="Medium"?"31–59%":"60%+"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* divider */}
              <div style={{ height:1,background:cardBorder,margin:"0 -32px 24px" }}/>

              {/* ══ § 4 — TRIP SUMMARY ══ */}
              <div style={{ marginBottom:24 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity=".85"/>
                    <rect x="9" y="3" width="6" height="4" rx="1" stroke={accent} strokeWidth="2" opacity=".85"/>
                    <path d="M9 12h6M9 16h4" stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity=".6"/>
                  </svg>
                  <span style={{ fontSize:10,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:textMuted }}>Trip Summary</span>
                </div>

                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
                  {[
                    {
                      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H11.5L11 22L19.5 10.5H12.5L13 2Z" fill={batteryColor}/></svg>,
                      label: "Battery",
                      val: `${battery}%`,
                    },
                    {
                      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={accent} strokeWidth="2" fill="none"/></svg>,
                      label: "Est. Range",
                      val: `${currentRangeKm} km`,
                    },
                    {
                      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill={accent}/></svg>,
                      label: "Vehicle",
                      val: selectedVehicle.label.split(" ")[0],
                    },
                  ].map(item => (
                    <div key={item.label} style={{ padding:"13px 10px",borderRadius:12,background:sectionBg,border:`1px solid ${cardBorder}`,textAlign:"center" }}>
                      <div style={{ display:"flex",justifyContent:"center",marginBottom:7 }}>{item.icon}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:700,color:textPrimary,marginBottom:3 }}>{item.val}</div>
                      <div style={{ fontSize:9,color:textMuted,letterSpacing:".07em",textTransform:"uppercase" }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ margin:"0 32px 16px",padding:"12px 16px",borderRadius:12,background:"rgba(255,90,95,.08)",border:"1px solid rgba(255,90,95,.22)",color:"#FF5A5F",fontSize:13,display:"flex",alignItems:"center",gap:8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#FF5A5F" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#FF5A5F" strokeWidth="2" strokeLinecap="round"/></svg>
                {error}
              </div>
            )}

            {/* ══ § 5 — ACTION ══ */}
            <div style={{ padding:"0 32px 28px" }}>
              <button
                className="plan-cta"
                onClick={handlePlan}
                disabled={planning}
                style={{
                  width:"100%", padding:"19px 24px", borderRadius:16,
                  background: planning
                    ? (isLight?"#E2E8F0":"#1A2218")
                    : `linear-gradient(135deg,${accent},${isLight?"#00A855":"#00C862"})`,
                  color: planning ? textSub : "#050708",
                  fontSize:15.5, fontWeight:800, border:"none",
                  cursor: planning ? "not-allowed" : "pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                  boxShadow: planning ? "none"
                    : isLight ? "0 6px 24px rgba(0,210,106,.40)"
                    : "0 0 0 1px rgba(0,230,118,.40),0 0 32px rgba(0,230,118,.22)",
                  letterSpacing:"-.01em",
                }}
              >
                {planning ? (
                  <>
                    <span style={{ width:18,height:18,borderRadius:"50%",border:`2px solid ${textMuted}`,borderTopColor:"transparent",display:"inline-block",animation:"spin .7s linear infinite" }}/>
                    Calculating route…
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M13 2L4.5 13.5H11.5L11 22L19.5 10.5H12.5L13 2Z" fill="#050708" strokeLinejoin="round"/>
                    </svg>
                    Plan My Journey
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="#050708" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>

              <div style={{ textAlign:"center",marginTop:10,fontSize:11,color:textMuted }}>
                Free to plan · Pay only when you book
              </div>
            </div>
          </div>

          {/* ── Popular routes ── */}
          <div className="plan-fade-3" style={{ marginTop:24 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
              <div style={{ height:1,flex:1,background:cardBorder }}/>
              <span style={{ fontSize:10,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:textMuted }}>Popular Routes</span>
              <div style={{ height:1,flex:1,background:cardBorder }}/>
            </div>
            <div className="plan-pgrid" style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
              {POPULAR_ROUTES.map(r => (
                <button
                  key={`${r.from}-${r.to}`}
                  className="plan-route-chip"
                  onClick={() => handlePopular(r.from, r.to)}
                  style={{ padding:"11px 13px",borderRadius:13,background:cardBg,border:`1px solid ${cardBorder}`,cursor:"pointer",textAlign:"left",boxShadow:isLight?"0 1px 4px rgba(0,0,0,.04)":"none" }}
                >
                  <div style={{ fontSize:11,fontWeight:700,color:textPrimary,marginBottom:3,letterSpacing:"-.01em" }}>
                    {r.from} <span style={{ color:accent }}>→</span> {r.to}
                  </div>
                  <div style={{ fontSize:10,color:textMuted,fontFamily:"'JetBrains Mono',monospace" }}>{r.km} km</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
