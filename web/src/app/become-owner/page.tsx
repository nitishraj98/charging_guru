"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, TrendingUp, Activity, ShieldCheck, Building2, MapPin, Hash,
  FileText, Clock, CheckCircle2, XCircle, Info, ArrowRight, Sparkles,
} from "lucide-react";
import { checkAuth } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

interface ApplicationStatus {
  id: string;
  status: string;
  business_name: string;
  created_at: string;
  review_note?: string | null;
}

async function fetchMyApplication(token: string): Promise<ApplicationStatus | null> {
  const res = await fetch(`/api/v1/owner-applications/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function submitApplication(token: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/v1/owner-applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Submission failed");
  return data;
}

function getToken(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )cg_access=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : "";
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; Icon: typeof Clock }> = {
  PENDING:  { label: "Under Review", color: "#FFC043", bg: "rgba(255,192,67,.08)", border: "rgba(255,192,67,.28)", Icon: Clock },
  APPROVED: { label: "Approved!",    color: "#00E676", bg: "rgba(0,230,118,.08)",  border: "rgba(0,230,118,.28)",  Icon: CheckCircle2 },
  REJECTED: { label: "Not Approved", color: "#FF5A5F", bg: "rgba(255,90,95,.08)",  border: "rgba(255,90,95,.28)",  Icon: XCircle },
};

const BENEFITS = [
  { Icon: TrendingUp,  title: "Earn Revenue",   desc: "Set your own pricing per kWh and keep full control of your margins" },
  { Icon: Activity,    title: "Real-time Data", desc: "Live bookings, charger status, and utilisation analytics" },
  { Icon: ShieldCheck, title: "Secure Payouts", desc: "Weekly settlements straight to your account via Razorpay" },
];

const STATS = [
  { value: "1,240+", label: "Active stations" },
  { value: "₹340", label: "Avg. earning / day / charger" },
  { value: "24h", label: "Application review" },
];

export default function BecomeOwnerPage() {
  const router = useRouter();
  const { isLight } = useTheme();

  const bg          = isLight ? "#F3F7FB" : "#0A0D0E";
  const cardBg      = isLight ? "#FFFFFF" : "#101415";
  const cardBorder  = isLight ? "#CBD5E1" : "#1B2224";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#8A97A5";
  const textMuted   = isLight ? "#64748B" : "#5C666E";
  const accent      = isLight ? "#00A855" : "#00E676";
  const accentDim   = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBrd   = isLight ? "#86EFAC" : "rgba(0,230,118,.22)";
  const raisedBg    = isLight ? "#F1F5F9" : "#161B1D";
  const inputBg     = isLight ? "#F3F7FB" : "#0C1011";
  const inputBorder = isLight ? "#94A3B8" : "#242C2E";

  const [loading, setLoading]           = useState(true);
  const [existing, setExisting]         = useState<ApplicationStatus | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState("");
  const [done, setDone]                 = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [gst, setGst]                   = useState("");
  const [city, setCity]                 = useState("");
  const [address, setAddress]           = useState("");
  const [planned, setPlanned]           = useState("1");
  const [message, setMessage]           = useState("");

  useEffect(() => { void (async () => {
    if (!(await checkAuth())) { router.push("/login"); return; }
    const token = getToken();
    fetchMyApplication(token)
      .then(setExisting)
      .finally(() => setLoading(false));
  })(); }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(""); setSubmitting(true);
    try {
      const token = getToken();
      await submitApplication(token, {
        business_name: businessName,
        gst_number: gst || null,
        city,
        address,
        planned_stations: parseInt(planned) || 1,
        message: message || null,
      });
      setDone(true);
      const updated = await fetchMyApplication(token);
      setExisting(updated);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: inputBg, border: `1px solid ${inputBorder}`,
    borderRadius: 12, padding: "12px 14px 12px 40px",
    color: textPrimary, fontSize: 14, outline: "none",
    fontFamily: "inherit", transition: "border-color .15s, box-shadow .15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
    textTransform: "uppercase", color: textSub, marginBottom: 7,
  };

  if (loading) return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16, flexDirection: "column" }}>
        <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3, borderColor: cardBorder, borderTopColor: accent }} />
        <span style={{ color: textSub, fontSize: 14 }}>Checking your status…</span>
      </div>
    </div>
  );

  return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <style suppressHydrationWarning>{`
        @keyframes bo-glow-drift {
          0%, 100% { transform: translate(-6%, -4%) scale(1); }
          50%      { transform: translate(4%, 3%) scale(1.08); }
        }
        .bo-input:focus { border-color: ${accent} !important; box-shadow: 0 0 0 3px ${accent}22 !important; }
        .bo-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 32px ${accent}45 !important; }
        .bo-hero-glow { animation: bo-glow-drift 14s ease-in-out infinite; }
      `}</style>

      <NavBar />

      {/* ── Hero ── */}
      <div style={{ position: "relative", overflow: "hidden", borderBottom: `1px solid ${cardBorder}` }}>
        <div className="bo-hero-glow" style={{
          position: "absolute", top: "-30%", left: "-10%", width: 560, height: 560, borderRadius: "50%",
          background: `radial-gradient(circle, ${isLight ? "rgba(0,168,85,.14)" : "rgba(0,230,118,.14)"} 0%, transparent 70%)`,
          pointerEvents: "none", filter: "blur(20px)",
        }} />
        <div style={{
          position: "absolute", bottom: "-40%", right: "-8%", width: 460, height: 460, borderRadius: "50%",
          background: `radial-gradient(circle, ${isLight ? "rgba(34,211,238,.10)" : "rgba(34,211,238,.10)"} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div className="fade-up" style={{ position: "relative", maxWidth: 720, margin: "0 auto", padding: "56px 24px 44px", textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 20,
            padding: "6px 16px", borderRadius: 999,
            background: accentDim, border: `1px solid ${accentBrd}`,
          }}>
            <Sparkles size={12} color={accent} strokeWidth={2.5} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: accent, textTransform: "uppercase" }}>
              Partner Program
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk',system-ui,sans-serif",
            fontSize: "clamp(28px,4vw,42px)", fontWeight: 800, letterSpacing: "-.03em",
            color: textPrimary, marginBottom: 14, lineHeight: 1.12,
          }}>
            Turn your charger into a<br/>revenue stream
          </h1>
          <p style={{ fontSize: 15, color: textSub, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
            List your EV charging station on Charging Guru. Reach thousands of drivers,
            set your own pricing, and manage every booking in real time.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "clamp(20px,5vw,48px)", flexWrap: "wrap" }}>
            {STATS.map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 800, color: textPrimary, marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: textMuted, letterSpacing: ".02em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fade-up" style={{ maxWidth: 620, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Existing application status */}
        {existing && (() => {
          const meta = STATUS_META[existing.status] ?? STATUS_META.PENDING;
          return (
            <div style={{ background: meta.bg, border: `1.5px solid ${meta.border}`, borderRadius: 22, padding: "24px 26px", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: `${meta.color}18`, border: `1px solid ${meta.color}35`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <meta.Icon size={20} color={meta.color} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: meta.color, letterSpacing: "-.01em" }}>{meta.label}</div>
                  <div style={{ fontSize: 12.5, color: textSub }}>Application for <strong style={{ color: textPrimary }}>{existing.business_name}</strong></div>
                </div>
              </div>
              {existing.status === "APPROVED" && (
                <div>
                  <p style={{ fontSize: 14, color: textPrimary, lineHeight: 1.6, marginBottom: 18 }}>
                    Congratulations! Your account now has station owner access. Add your first charging station to start accepting bookings.
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => router.push("/owner/stations/new")} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "13px 24px", borderRadius: 13,
                      background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
                      color: "#050708", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer",
                      boxShadow: `0 4px 18px ${accent}35`,
                    }}>
                      <Zap size={15} strokeWidth={2.5} /> Add Station <ArrowRight size={14} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => router.push("/owner")} style={{
                      padding: "13px 24px", borderRadius: 13,
                      background: "transparent", color: textSub,
                      fontSize: 14, fontWeight: 700, border: `1px solid ${cardBorder}`, cursor: "pointer",
                    }}>
                      Station Portal
                    </button>
                  </div>
                </div>
              )}
              {existing.status === "PENDING" && (
                <p style={{ fontSize: 14, color: textSub, lineHeight: 1.6 }}>
                  Our team reviews applications within 24 hours. You&apos;ll be notified the moment a decision is made.
                </p>
              )}
              {existing.status === "REJECTED" && (
                <div>
                  {existing.review_note && (
                    <p style={{ fontSize: 14, color: textSub, lineHeight: 1.6, marginBottom: 12 }}>
                      <strong style={{ color: textPrimary }}>Reason:</strong> {existing.review_note}
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: textMuted }}>
                    You may re-apply after addressing the above concerns.
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Benefits */}
        {!existing && (
          <div className="become-benefits-grid" style={{ marginBottom: 32 }}>
            {BENEFITS.map(b => (
              <div key={b.title} style={{
                background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "20px 16px",
                boxShadow: isLight ? "0 1px 6px rgba(0,0,0,.04)" : "none",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11, background: accentDim, border: `1px solid ${accentBrd}`,
                  display: "grid", placeItems: "center", marginBottom: 14, color: accent,
                }}>
                  <b.Icon size={18} strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 5 }}>{b.title}</div>
                <div style={{ fontSize: 12, color: textSub, lineHeight: 1.55 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* Application form — only show if no existing or rejected */}
        {(!existing || existing.status === "REJECTED") && !done && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 22, padding: "28px", boxShadow: isLight ? "0 2px 16px rgba(0,0,0,.05)" : "0 4px 32px rgba(0,0,0,.25)" }}>
            <h2 style={{ fontFamily: "'Space Grotesk',system-ui,sans-serif", fontSize: 18, fontWeight: 800, color: textPrimary, marginBottom: 22, letterSpacing: "-.01em" }}>
              {existing?.status === "REJECTED" ? "Re-apply" : "Partner Application"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                <div>
                  <label style={labelStyle}>Business / Organisation name *</label>
                  <div style={{ position: "relative" }}>
                    <Building2 size={15} color={textMuted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <input
                      required value={businessName} onChange={e => setBusinessName(e.target.value)}
                      placeholder="e.g. GreenCharge Pvt Ltd"
                      className="bo-input" style={inputStyle}
                    />
                  </div>
                </div>

                <div className="become-form-row" style={{ gap: 14 }}>
                  <div>
                    <label style={labelStyle}>GST Number (optional)</label>
                    <div style={{ position: "relative" }}>
                      <Hash size={15} color={textMuted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      <input
                        value={gst} onChange={e => setGst(e.target.value)}
                        placeholder="22AAAAA0000A1Z5"
                        className="bo-input" style={inputStyle}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>City *</label>
                    <div style={{ position: "relative" }}>
                      <MapPin size={15} color={textMuted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      <input
                        required value={city} onChange={e => setCity(e.target.value)}
                        placeholder="Delhi"
                        className="bo-input" style={inputStyle}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Station address *</label>
                  <div style={{ position: "relative" }}>
                    <MapPin size={15} color={textMuted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <input
                      required value={address} onChange={e => setAddress(e.target.value)}
                      placeholder="Plot 12, Sector 18, Noida"
                      className="bo-input" style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>How many stations do you plan to list?</label>
                  <div style={{ position: "relative" }}>
                    <Zap size={15} color={textMuted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <select value={planned} onChange={e => setPlanned(e.target.value)} className="bo-input" style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}>
                      {["1","2","3","4","5","6-10","10+"].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Tell us about your setup (optional)</label>
                  <div style={{ position: "relative" }}>
                    <FileText size={15} color={textMuted} style={{ position: "absolute", left: 14, top: 14, pointerEvents: "none" }} />
                    <textarea
                      value={message} onChange={e => setMessage(e.target.value)}
                      placeholder="E.g. We have a commercial parking lot with existing power infrastructure…"
                      rows={3}
                      className="bo-input" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                    />
                  </div>
                </div>

                {/* Terms */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "13px 15px", background: raisedBg, borderRadius: 13, border: `1px solid ${cardBorder}` }}>
                  <Info size={15} color={textMuted} style={{ marginTop: 1, flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: textSub, lineHeight: 1.55 }}>
                    By submitting, you agree to Charging Guru&apos;s Partner Terms. Our team will review your application and reach out within 24 hours.
                  </p>
                </div>

                {submitError && (
                  <div style={{ padding: "11px 15px", borderRadius: 12, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 13 }}>
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="bo-submit"
                  style={{
                    padding: "15px", borderRadius: 14, fontSize: 15, fontWeight: 800,
                    background: submitting ? raisedBg : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
                    color: submitting ? textSub : "#050708",
                    border: "none", cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: submitting ? "none" : `0 4px 20px ${accent}30`,
                    transition: "all .2s cubic-bezier(.16,1,.3,1)",
                  }}
                >
                  {submitting
                    ? <><span className="spinner" style={{ borderColor: cardBorder, borderTopColor: textSub }} />Submitting…</>
                    : <>Submit Application <ArrowRight size={16} strokeWidth={2.5} /></>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Done state */}
        {done && !existing?.status && (
          <div style={{ background: accentDim, border: `1px solid ${accentBrd}`, borderRadius: 22, padding: "36px 28px", textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, background: `${accent}18`, border: `1px solid ${accentBrd}`,
              display: "grid", placeItems: "center", margin: "0 auto 18px", color: accent,
            }}>
              <CheckCircle2 size={30} strokeWidth={1.8} />
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk',system-ui,sans-serif", fontSize: 21, fontWeight: 800, color: textPrimary, marginBottom: 8 }}>Application Submitted!</h2>
            <p style={{ fontSize: 14, color: textSub, lineHeight: 1.6 }}>Our team will review your application and contact you within 24 hours.</p>
          </div>
        )}

      </div>
    </div>
  );
}
