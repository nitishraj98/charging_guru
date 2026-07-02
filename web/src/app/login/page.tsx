"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import Logo from "@/components/Logo";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@/contexts/UserContext";

const STATS = [
  { value: "50+",   label: "Cities"       },
  { value: "5,000+", label: "Stations"    },
  { value: "98%",   label: "Uptime"       },
];

const TRUST = [
  { icon: "⚡", label: "Instant booking", desc: "Reserve in under 2 minutes" },
  { icon: "🔒", label: "Secure payments", desc: "Powered by Razorpay" },
  { icon: "🎁", label: "Earn rewards",    desc: "Points on every charge" },
];

export default function LoginPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const { reload: reloadUser } = useUser();

  const [step,          setStep]          = useState<"phone" | "otp">("phone");
  const [phone,         setPhone]         = useState("");
  const [requestId,     setRequestId]     = useState("");
  const [otp,           setOtp]           = useState(["", "", "", "", "", ""]);
  const [loading,       setLoading]       = useState(false);
  const [resending,     setResending]     = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error,         setError]         = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const green   = "#00D26A";
  const pageBg  = isLight ? "#F4F7F3" : "#080E09";
  const leftBg  = isLight
    ? "linear-gradient(145deg,#071A0D 0%,#0B2714 50%,#061209 100%)"
    : "linear-gradient(145deg,#060D08 0%,#091508 50%,#040C05 100%)";
  const panelBg = isLight ? "#FFFFFF" : "#101810";
  const inputBg = isLight ? "#F6FAF7" : "#0C1A0C";
  const inputBdr = isLight ? "rgba(15,23,42,0.12)" : "rgba(0,210,106,0.15)";
  const inputFg  = isLight ? "#0F172A" : "#D4E8D6";
  const sub      = isLight ? "#64748B" : "#8BA896";
  const headFg   = isLight ? "#0F172A" : "#E8F5EB";
  const errBg    = "rgba(239,68,68,.08)";
  const errBdr   = "rgba(239,68,68,.25)";
  const errFg    = isLight ? "#DC2626" : "#FF6B6B";
  const greenDim = isLight ? "rgba(0,180,100,0.08)" : "rgba(0,210,106,0.08)";
  const greenBdr = isLight ? "rgba(0,160,80,0.25)"  : "rgba(0,210,106,0.25)";
  const greenFg  = isLight ? "#006632" : "#4DFFA6";

  const btnOn: React.CSSProperties = {
    background: `linear-gradient(135deg,${green},#00A855)`,
    color: "#050708",
    boxShadow: `0 0 0 1px rgba(0,210,106,.25),0 8px 32px rgba(0,210,106,.35)`,
  };
  const btnOff: React.CSSProperties = {
    background: isLight ? "#E2E8F0" : "#0F1A10",
    color: isLight ? "#94A3B8" : "#3A5040",
    boxShadow: "none",
  };

  async function sendOtp() {
    setError(""); setLoading(true);
    try {
      const res = await auth.otpRequest(`+91${phone}`);
      setRequestId(res.request_id);
      if (res.debug_code) setOtp(res.debug_code.split(""));
      setStep("otp");
      setResendCooldown(30);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally { setLoading(false); }
  }

  async function resendOtp() {
    if (resendCooldown > 0 || resending) return;
    setError(""); setResending(true);
    try {
      const res = await auth.otpRequest(`+91${phone}`);
      setRequestId(res.request_id);
      setOtp(["", "", "", "", "", ""]);
      if (res.debug_code) setOtp(res.debug_code.split(""));
      setResendCooldown(30);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend OTP");
    } finally { setResending(false); }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function verifyOtp() {
    const code = otp.join("");
    if (code.length < 6) return;
    setError(""); setLoading(true);
    try {
      await auth.otpVerify(requestId, code);
      reloadUser();
      try {
        const me = await auth.me();
        const roles = me.roles ?? [];
        if (roles.includes("ROLE_ADMIN")) { router.push("/admin"); return; }
        if (roles.includes("ROLE_STATION_OWNER")) { router.push("/owner"); return; }
      } catch { /* fall through */ }
      router.push("/");
    } catch {
      setError("Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally { setLoading(false); }
  }

  function handleOtpChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[idx] = digit; setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (next.every(d => d !== "")) setTimeout(() => verifyOtp(), 80);
  }

  function handleOtpKey(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  }

  return (
    <div className="lg-grid" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", background: pageBg, fontFamily: "'Space Grotesk',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin-r    { to { transform: rotate(360deg) } }
        @keyframes float-up  { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes glow-p    { 0%,100% { opacity:.55 } 50% { opacity:1 } }
        @keyframes fadein    { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        .lg-phone:focus-within { border-color: ${green} !important; box-shadow: 0 0 0 3px rgba(0,210,106,0.14) !important; }
        .otp-box:focus { border-color: ${green} !important; box-shadow: 0 0 0 3px rgba(0,210,106,0.18) !important; outline: none; }
        .back-btn:hover { background: ${isLight ? "rgba(0,0,0,0.05)" : "rgba(0,210,106,0.08)"} !important; }
        @media (max-width: 768px) { .lg-grid { grid-template-columns: 1fr !important; } .lg-left { display: none !important; } }
      `}</style>

      {/* ── LEFT — dark brand panel ── */}
      <div className="lg-left" style={{
        position: "relative", overflow: "hidden",
        background: leftBg,
        display: "flex", flexDirection: "column",
        padding: "clamp(36px,5vw,52px) clamp(24px,4vw,56px)",
      }}>
        {/* Subtle grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(rgba(0,210,106,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,210,106,0.035) 1px,transparent 1px)`,
          backgroundSize: "52px 52px",
        }} />

        {/* Glow orbs */}
        <div style={{ position: "absolute", top: -120, right: -120, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,210,106,0.11) 0%,transparent 65%)", pointerEvents: "none", animation: "glow-p 4.5s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: -100, left: -80, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,160,200,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />

        {/* Floating icons */}
        <div style={{ position: "absolute", top: 80, right: 60, fontSize: 64, opacity: 0.06, animation: "float-up 6s ease-in-out infinite", pointerEvents: "none", userSelect: "none" as const }}>⚡</div>
        <div style={{ position: "absolute", bottom: 180, right: 90, fontSize: 40, opacity: 0.04, animation: "float-up 5s ease-in-out infinite 1.5s", pointerEvents: "none", userSelect: "none" as const }}>🔋</div>

        {/* Logo */}
        <Logo size="md" href="/" theme="dark" />

        {/* Main copy */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {/* Live badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, marginBottom: 28, background: "rgba(0,210,106,0.09)", border: "1px solid rgba(0,210,106,0.20)", width: "fit-content" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: green, display: "inline-block", boxShadow: `0 0 8px ${green}`, animation: "glow-p 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: green, textTransform: "uppercase" as const }}>Now live across 50+ cities</span>
          </div>

          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 50, lineHeight: 1.04, letterSpacing: "-0.04em", color: "#E8F0EB", marginBottom: 18 }}>
            Charge with<br />
            <span style={{ color: green }}>certainty.</span>
          </h1>
          <p style={{ color: "rgba(232,240,235,0.42)", fontSize: 15.5, lineHeight: 1.75, maxWidth: 330 }}>
            Reserve your slot before you leave.<br />
            Your charger will be waiting.
          </p>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 0, marginTop: 44, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(0,210,106,0.12)", background: "rgba(0,210,106,0.04)" }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{
                flex: 1, padding: "18px 16px", textAlign: "center",
                borderRight: i < STATS.length - 1 ? "1px solid rgba(0,210,106,0.10)" : "none",
              }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: green, letterSpacing: "-0.02em", marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "rgba(232,240,235,0.35)", letterSpacing: "0.03em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {TRUST.map(t => (
            <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,210,106,0.08)", border: "1px solid rgba(0,210,106,0.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{t.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,240,235,0.75)", lineHeight: 1.3 }}>{t.label}</div>
                <div style={{ fontSize: 11.5, color: "rgba(232,240,235,0.32)", marginTop: 1 }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT — form panel ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(32px,5vw,48px) clamp(16px,4vw,56px)", background: pageBg }}>
        <div style={{ width: "100%", maxWidth: 400, animation: "fadein 0.35s ease both" }}>

          {/* Top badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: isLight ? "#071A0D" : "rgba(0,210,106,0.10)", border: `1px solid ${isLight ? "transparent" : "rgba(0,210,106,0.20)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 16 }}>⚡</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: headFg, letterSpacing: "-0.01em" }}>Charging Guru</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: green, textTransform: "uppercase" as const, marginTop: 1, opacity: 0.8 }}>EV Network</div>
            </div>
          </div>

          {/* Card */}
          <div style={{
            background: panelBg, borderRadius: 24, padding: "40px 36px",
            boxShadow: isLight
              ? "0 4px 40px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.04)"
              : "0 0 0 1px rgba(0,210,106,0.08),0 24px 64px rgba(0,0,0,0.5)",
            border: isLight ? "1px solid rgba(15,23,42,0.06)" : "1px solid rgba(0,210,106,0.08)",
          }}>

            {step === "phone" ? (
              <>
                <div style={{ marginBottom: 32 }}>
                  <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 800, color: headFg, letterSpacing: "-0.04em", marginBottom: 8 }}>Welcome back</h2>
                  <p style={{ color: sub, fontSize: 13.5, lineHeight: 1.65 }}>Enter your mobile number to get a one-time passcode.</p>
                </div>

                {error && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, marginBottom: 20, background: errBg, border: `1px solid ${errBdr}` }}>
                    <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚠</span>
                    <span style={{ color: errFg, fontSize: 13, lineHeight: 1.5 }}>{error}</span>
                  </div>
                )}

                <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: sub, marginBottom: 8 }}>Mobile number</label>
                <div className="lg-phone" style={{ display: "flex", alignItems: "center", background: inputBg, border: `1.5px solid ${inputBdr}`, borderRadius: 16, padding: "0 18px", marginBottom: 24, transition: "border-color .15s,box-shadow .15s" }}>
                  <span style={{ fontSize: 18, marginRight: 8, flexShrink: 0 }}>🇮🇳</span>
                  <span style={{ fontSize: 15, fontFamily: "'JetBrains Mono',monospace", color: inputFg, opacity: 0.4, marginRight: 4, flexShrink: 0, userSelect: "none" as const }}>+91</span>
                  <input
                    type="tel" value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onKeyDown={e => e.key === "Enter" && phone.length === 10 && sendOtp()}
                    placeholder="98765 43210"
                    maxLength={10}
                    autoFocus
                    style={{ flex: 1, background: "none", border: "none", outline: "none", color: inputFg, fontSize: 15, padding: "17px 0", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.02em" }}
                  />
                  {phone.length > 0 && (
                    <span style={{ fontSize: 11, color: phone.length === 10 ? green : sub, flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", transition: "color .15s", opacity: 0.7 }}>
                      {phone.length}/10
                    </span>
                  )}
                </div>

                <button onClick={sendOtp} disabled={loading || phone.length !== 10}
                  style={{ width: "100%", padding: "17px 20px", borderRadius: 16, fontSize: 14.5, fontWeight: 700, border: "none", cursor: (loading || phone.length !== 10) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "'Space Grotesk',sans-serif", transition: "all .15s", letterSpacing: "-0.01em", ...((loading || phone.length !== 10) ? btnOff : btnOn) }}>
                  {loading
                    ? <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin-r 0.7s linear infinite" }} />Sending code…</>
                    : <>Get OTP <span style={{ opacity: 0.7 }}>→</span></>}
                </button>

                <p style={{ fontSize: 12, color: isLight ? "#94A3B8" : "#5A7A62", textAlign: "center", marginTop: 20, lineHeight: 1.7 }}>
                  By continuing you agree to our{" "}
                  <a href="#" style={{ color: sub, textDecoration: "underline" }}>Terms</a>
                  {" "}& <a href="#" style={{ color: sub, textDecoration: "underline" }}>Privacy Policy</a>.
                </p>
              </>
            ) : (
              <>
                <button className="back-btn" onClick={() => { setStep("phone"); setError(""); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: isLight ? "rgba(15,23,42,0.04)" : "rgba(0,210,106,0.05)", border: `1px solid ${isLight ? "rgba(15,23,42,0.08)" : "rgba(0,210,106,0.13)"}`, borderRadius: 10, color: sub, fontSize: 12, cursor: "pointer", marginBottom: 28, padding: "6px 12px", fontFamily: "'Space Grotesk',sans-serif", transition: "all .12s" }}>
                  ← +91 {phone}
                </button>

                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 800, color: headFg, letterSpacing: "-0.04em", marginBottom: 8 }}>Enter OTP</h2>
                  <p style={{ color: sub, fontSize: 13.5, lineHeight: 1.65 }}>6-digit code sent to your phone.</p>
                </div>

                {/* OTP boxes */}
                <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { otpRefs.current[idx] = el; }}
                      className="otp-box"
                      type="text" inputMode="numeric" maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKey(idx, e)}
                      style={{
                        flex: 1, minWidth: 0, height: 60, textAlign: "center",
                        background: digit
                          ? isLight ? "rgba(0,210,106,0.06)" : "rgba(0,210,106,0.08)"
                          : inputBg,
                        border: `1.5px solid ${digit ? green : inputBdr}`,
                        borderRadius: 14, outline: "none",
                        color: digit ? (isLight ? "#065f32" : green) : inputFg,
                        fontSize: 24, fontWeight: 700,
                        fontFamily: "'JetBrains Mono',monospace",
                        boxShadow: digit ? "0 0 0 3px rgba(0,210,106,0.12)" : "none",
                        transition: "all .15s",
                      }}
                    />
                  ))}
                </div>

                {otp.every(d => d !== "") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 11, marginBottom: 16, background: greenDim, border: `1px solid ${greenBdr}` }}>
                    <span style={{ fontSize: 13, color: greenFg }}>✓</span>
                    <span style={{ color: greenFg, fontSize: 12.5, fontWeight: 600 }}>OTP pre-filled — debug mode</span>
                  </div>
                )}

                {error && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, marginBottom: 16, background: errBg, border: `1px solid ${errBdr}` }}>
                    <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚠</span>
                    <span style={{ color: errFg, fontSize: 13, lineHeight: 1.5 }}>{error}</span>
                  </div>
                )}

                <button onClick={verifyOtp} disabled={loading || otp.some(d => !d)}
                  style={{ width: "100%", padding: "17px 20px", borderRadius: 16, fontSize: 14.5, fontWeight: 700, border: "none", cursor: (loading || otp.some(d => !d)) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "'Space Grotesk',sans-serif", transition: "all .15s", letterSpacing: "-0.01em", ...((loading || otp.some(d => !d)) ? btnOff : btnOn) }}>
                  {loading
                    ? <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin-r 0.7s linear infinite" }} />Verifying…</>
                    : <>Sign in <span style={{ opacity: 0.7 }}>→</span></>}
                </button>

                <button onClick={resendOtp} disabled={resendCooldown > 0 || resending}
                  style={{ width: "100%", marginTop: 14, padding: "11px", background: "none", border: "none", color: resendCooldown > 0 ? (isLight ? "#CBD5E1" : "#3D5A44") : sub, fontSize: 12.5, cursor: resendCooldown > 0 ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk',sans-serif", transition: "color .15s" }}>
                  {resending ? "Sending…" : resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Didn't receive it? Resend OTP"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
