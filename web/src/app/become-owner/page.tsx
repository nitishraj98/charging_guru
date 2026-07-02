"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDING:  { label: "Under Review",  color: "#FFC043", bg: "rgba(255,192,67,.1)",  icon: "⏳" },
  APPROVED: { label: "Approved!",     color: "#00E676", bg: "rgba(0,230,118,.1)",   icon: "✓" },
  REJECTED: { label: "Not Approved",  color: "#FF5A5F", bg: "rgba(255,90,95,.1)",   icon: "✕" },
};

export default function BecomeOwnerPage() {
  const router = useRouter();
  const { isLight } = useTheme();

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
  const inputBg     = isLight ? "#F8FAFC" : "#0A0D0E";
  const inputBorder = isLight ? "#CBD5E1" : "#2E3638";

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
    borderRadius: 10, padding: "11px 14px",
    color: textPrimary, fontSize: 14, outline: "none",
    fontFamily: "inherit",
  };

  if (loading) return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16, flexDirection: "column" }}>
        <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3, borderColor: "#222829", borderTopColor: accent }} />
        <span style={{ color: textSub, fontSize: 14 }}>Checking your status…</span>
      </div>
    </div>
  );

  return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />

      <div className="fade-up" style={{ maxWidth: 600, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>Become a Charging Partner</h1>
          <p style={{ fontSize: 14, color: textSub, lineHeight: 1.6 }}>
            List your EV charging station on Charging Guru. Reach thousands of EV drivers and manage bookings in real-time.
          </p>
        </div>

        {/* Existing application status */}
        {existing && (() => {
          const meta = STATUS_META[existing.status] ?? STATUS_META.PENDING;
          return (
            <div style={{ background: meta.bg, border: `1.5px solid ${meta.color}30`, borderRadius: 20, padding: "20px 22px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>{meta.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: meta.color }}>{meta.label}</div>
                  <div style={{ fontSize: 12, color: textSub }}>Application for <strong>{existing.business_name}</strong></div>
                </div>
              </div>
              {existing.status === "APPROVED" && (
                <div>
                  <p style={{ fontSize: 14, color: textPrimary, marginBottom: 16 }}>
                    Congratulations! Your account now has station owner access. Add your first charging station to start accepting bookings.
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => router.push("/owner/stations/new")} style={{
                      padding: "12px 24px", borderRadius: 12,
                      background: accent, color: "#050708",
                      fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
                    }}>
                      + Add Station →
                    </button>
                    <button onClick={() => router.push("/owner")} style={{
                      padding: "12px 24px", borderRadius: 12,
                      background: "transparent", color: textSub,
                      fontSize: 14, fontWeight: 600, border: `1px solid ${cardBorder}`, cursor: "pointer",
                    }}>
                      Station Portal
                    </button>
                  </div>
                </div>
              )}
              {existing.status === "PENDING" && (
                <p style={{ fontSize: 14, color: textSub }}>
                  Our team reviews applications within 24 hours. You will be notified once a decision is made.
                </p>
              )}
              {existing.status === "REJECTED" && (
                <div>
                  {existing.review_note && (
                    <p style={{ fontSize: 14, color: textSub, marginBottom: 12 }}>
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
          <div className="become-benefits-grid" style={{ marginBottom: 28 }}>
            {[
              { icon: "💰", title: "Earn Revenue",    desc: "Set your own pricing per kWh" },
              { icon: "📊", title: "Real-time Data",  desc: "Live bookings & charger status" },
              { icon: "🔒", title: "Secure Payouts",  desc: "Weekly settlements via Razorpay" },
            ].map(b => (
              <div key={b.title} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{b.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>{b.title}</div>
                <div style={{ fontSize: 11, color: textSub }}>{b.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* Application form — only show if no existing or rejected */}
        {(!existing || existing.status === "REJECTED") && !done && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "24px", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: textPrimary, marginBottom: 20 }}>
              {existing?.status === "REJECTED" ? "Re-apply" : "Partner Application"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>
                    Business / Organisation name *
                  </label>
                  <input
                    required value={businessName} onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. GreenCharge Pvt Ltd"
                    style={inputStyle}
                  />
                </div>

                <div className="become-form-row" style={{ gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>
                      GST Number (optional)
                    </label>
                    <input
                      value={gst} onChange={e => setGst(e.target.value)}
                      placeholder="22AAAAA0000A1Z5"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>
                      City *
                    </label>
                    <input
                      required value={city} onChange={e => setCity(e.target.value)}
                      placeholder="Delhi"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>
                    Station address *
                  </label>
                  <input
                    required value={address} onChange={e => setAddress(e.target.value)}
                    placeholder="Plot 12, Sector 18, Noida"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>
                    How many stations do you plan to list?
                  </label>
                  <select value={planned} onChange={e => setPlanned(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {["1","2","3","4","5","6-10","10+"].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>
                    Tell us about your setup (optional)
                  </label>
                  <textarea
                    value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="E.g. We have a commercial parking lot with existing power infrastructure…"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>

                {/* Terms */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: raisedBg, borderRadius: 12 }}>
                  <span style={{ fontSize: 16, marginTop: 1 }}>ℹ️</span>
                  <p style={{ fontSize: 12, color: textSub, lineHeight: 1.5 }}>
                    By submitting, you agree to Charging Guru&apos;s Partner Terms. Our team will review your application and reach out within 24 hours.
                  </p>
                </div>

                {submitError && (
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 13 }}>
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "14px", borderRadius: 13, fontSize: 15, fontWeight: 700,
                    background: submitting ? raisedBg : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
                    color: submitting ? textSub : "#050708",
                    border: "none", cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "opacity .15s",
                  }}
                >
                  {submitting ? <><span className="spinner" />Submitting…</> : "Submit Application →"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Done state */}
        {done && !existing?.status && (
          <div style={{ background: accentDim, border: `1px solid ${accentBrd}`, borderRadius: 20, padding: "28px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>Application Submitted!</h2>
            <p style={{ fontSize: 14, color: textSub }}>Our team will review your application and contact you within 24 hours.</p>
          </div>
        )}

      </div>
    </div>
  );
}

