"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/api";
import { checkAuth, bffLogout } from "@/lib/auth";
import { getTheme, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import Logo from "@/components/Logo";
import {
  LayoutDashboard, Zap, BookOpen, Users, MapPin,
  IndianRupee, Settings, ChevronRight,
  Building2, PlugZap, LogOut, Sun, Moon, ClipboardCheck,
} from "lucide-react";

const NAV = [
  {
    section: "OVERVIEW",
    items: [
      { href: "/admin",          label: "Dashboard",          Icon: LayoutDashboard, exact: true },
    ],
  },
  {
    section: "OPERATIONS",
    items: [
      { href: "/admin/sessions", label: "Charging Sessions",  Icon: Zap      },
      { href: "/admin/bookings", label: "Route Reservations", Icon: BookOpen },
    ],
  },
  {
    section: "FLEET",
    items: [
      { href: "/admin/stations", label: "Stations",           Icon: MapPin    },
      { href: "/admin/chargers", label: "Chargers",           Icon: PlugZap   },
      { href: "/admin/users",    label: "Drivers",            Icon: Users     },
      { href: "/admin/owners",       label: "Station Owners",   Icon: Building2     },
      { href: "/admin/applications", label: "Applications",     Icon: ClipboardCheck },
    ],
  },
  {
    section: "FINANCE",
    items: [
      { href: "/admin/revenue",  label: "Revenue",            Icon: IndianRupee },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { href: "/admin/settings", label: "Settings",           Icon: Settings  },
    ],
  },
];

type Status = "checking" | "login" | "ready";
type LoginStep = "phone" | "otp";

async function checkAdminRole(): Promise<"admin" | "not-admin" | "unauthenticated"> {
  try {
    // Run auth check and profile fetch in parallel — auth.me() auto-retries on 401
    const [ok, me] = await Promise.all([checkAuth(), auth.me().catch(() => null)]);
    if (!ok || !me) return "unauthenticated";
    return (me.roles ?? []).includes("ROLE_ADMIN") ? "admin" : "not-admin";
  } catch {
    return "unauthenticated";
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path    = usePathname();
  const { isLight, toggle } = useTheme();
  const [status,  setStatus]  = useState<Status>("checking");
  const [hovered, setHovered] = useState<string | null>(null);

  // Login form state
  const [loginStep, setLoginStep] = useState<LoginStep>("phone");
  const [phone,     setPhone]     = useState("");
  const [requestId, setRequestId] = useState("");
  const [otp,       setOtp]       = useState(["", "", "", "", "", ""]);
  const [loginErr,  setLoginErr]  = useState("");
  const [sending,   setSending]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown,  setCooldown]  = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const th = getTheme(isLight);

  useEffect(() => {
    checkAdminRole().then(result => {
      if (result === "admin") setStatus("ready");
      else setStatus("login");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendOtp() {
    setLoginErr(""); setSending(true);
    try {
      const normalized = `+91${phone}`;

      // Check admin role before sending OTP — fail fast without wasting an OTP send
      const check = await fetch("/api/v1/admin/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      if (!check.ok) {
        setLoginErr("This number is not registered as an admin account.");
        return;
      }

      const res = await auth.otpRequest(normalized);
      setRequestId(res.request_id);
      if (res.debug_code) setOtp(res.debug_code.split(""));
      setLoginStep("otp");
      setCooldown(30);
    } catch (e: unknown) {
      setLoginErr(e instanceof Error ? e.message : "Failed to send OTP");
    } finally { setSending(false); }
  }

  async function verifyOtp() {
    const code = otp.join("");
    if (code.length < 6) return;
    setLoginErr(""); setVerifying(true);
    try {
      await auth.otpVerify(requestId, code);
      const result = await checkAdminRole();
      if (result === "admin") { setStatus("ready"); return; }
      setLoginErr("Your account does not have admin access.");
      setOtp(["", "", "", "", "", ""]);
      setLoginStep("phone");
      await bffLogout().catch(() => {});
    } catch {
      setLoginErr("Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally { setVerifying(false); }
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

  function isActive(href: string, exact?: boolean) {
    if (exact) return path === href;
    return path === href || path.startsWith(href + "/");
  }

  // ── Checking spinner ──────────────────────────────────────────────────────────
  if (status === "checking") return (
    <div style={{ background: th.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 28, height: 28, border: `3px solid ${th.border}`, borderTopColor: C.green, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  // ── Inline login screen ───────────────────────────────────────────────────────
  if (status === "login") {
    const green    = C.green;
    const pageBg   = isLight ? "#F4F7F3" : "#060A07";
    const leftBg   = isLight
      ? "linear-gradient(145deg,#0A1F12 0%,#0D2B18 50%,#071610 100%)"
      : "linear-gradient(145deg,#060D08 0%,#0A1A0D 50%,#040C07 100%)";
    const panelBg  = isLight ? "#FFFFFF" : "#0C1410";
    const inputBg  = isLight ? "#F8FAF9" : "#0A1209";
    const inputBdr = isLight ? "rgba(15,23,42,0.12)" : "rgba(0,210,106,0.12)";
    const inputFg  = isLight ? "#0F172A" : "#E6EBED";
    const sub      = isLight ? "#64748B" : "#6B8070";
    const headFg   = isLight ? "#0F172A" : "#E8F0EB";
    const errBg    = "rgba(239,68,68,.08)";
    const errBdr   = "rgba(239,68,68,.25)";
    const errFg    = isLight ? "#DC2626" : "#FF6B6B";
    const btnOn    = { background: `linear-gradient(135deg,${green},#00A855)`, color: "#050708", boxShadow: `0 0 0 1px rgba(0,210,106,.25),0 8px 32px rgba(0,210,106,.35)` };
    const btnOff   = { background: isLight ? "#E2E8F0" : "#111A13", color: isLight ? "#94A3B8" : "#4A5E50", boxShadow: "none" };

    const STATS = [
      { value: "2.4k", label: "Active Sessions" },
      { value: "142",  label: "Live Stations"   },
      { value: "₹8.2L", label: "Today's Revenue" },
    ];

    return (
      <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", background: pageBg, fontFamily: C.sans }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
          * { box-sizing: border-box; }
          @keyframes spin-r   { to { transform: rotate(360deg) } }
          @keyframes float-up { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
          @keyframes glow-pulse { 0%,100% { opacity:.6 } 50% { opacity:1 } }
          @keyframes adm-fadein { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
          .adm-input:focus  { outline: none; }
          .adm-phone:focus-within { border-color: ${green} !important; box-shadow: 0 0 0 3px rgba(0,210,106,0.14) !important; }
          .adm-otp:focus    { border-color: ${green} !important; box-shadow: 0 0 0 3px rgba(0,210,106,0.18) !important; outline: none; }
          @media (max-width: 768px) { .adm-grid { grid-template-columns: 1fr !important; } .adm-left { display: none !important; } }
        `}</style>

        {/* ── LEFT — dark brand panel ── */}
        <div className="adm-left" style={{
          position: "relative", overflow: "hidden",
          background: leftBg,
          display: "flex", flexDirection: "column",
          padding: "52px 56px",
        }}>
          {/* Grid overlay */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: `linear-gradient(rgba(0,210,106,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,210,106,0.04) 1px,transparent 1px)`,
            backgroundSize: "48px 48px",
          }} />

          {/* Green glow orbs */}
          <div style={{ position: "absolute", top: -100, right: -100, width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,210,106,0.12) 0%,transparent 65%)", pointerEvents: "none", animation: "glow-pulse 4s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: -80, left: -60, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,180,100,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />

          {/* Floating icon */}
          <div style={{ position: "absolute", top: 72, right: 64, fontSize: 56, opacity: 0.07, animation: "float-up 6s ease-in-out infinite", pointerEvents: "none", userSelect: "none" as const }}>⚡</div>
          <div style={{ position: "absolute", bottom: 200, right: 100, fontSize: 36, opacity: 0.05, animation: "float-up 5s ease-in-out infinite 1.5s", pointerEvents: "none", userSelect: "none" as const }}>🔋</div>

          {/* Logo */}
          <Logo size="md" href="/" theme="dark" />

          {/* Main copy */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {/* Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, marginBottom: 28, background: "rgba(0,210,106,0.10)", border: "1px solid rgba(0,210,106,0.22)", width: "fit-content" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: green, display: "inline-block", boxShadow: `0 0 8px ${green}`, animation: "glow-pulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: green, textTransform: "uppercase" as const }}>Live Operations</span>
            </div>

            <h1 style={{ fontFamily: C.sans, fontWeight: 800, fontSize: 48, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#E8F0EB", marginBottom: 18 }}>
              Command &<br />
              <span style={{ color: green }}>Control.</span>
            </h1>
            <p style={{ color: "rgba(232,240,235,0.45)", fontSize: 15, lineHeight: 1.75, maxWidth: 320 }}>
              Real-time visibility across every station, session, and transaction in the network.
            </p>

            {/* Live stats row */}
            <div style={{ display: "flex", gap: 0, marginTop: 44, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(0,210,106,0.12)", background: "rgba(0,210,106,0.04)" }}>
              {STATS.map((s, i) => (
                <div key={s.label} style={{
                  flex: 1, padding: "18px 20px", textAlign: "center",
                  borderRight: i < STATS.length - 1 ? "1px solid rgba(0,210,106,0.10)" : "none",
                }}>
                  <div style={{ fontFamily: C.sans, fontSize: 22, fontWeight: 800, color: green, letterSpacing: "-0.03em", marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "rgba(232,240,235,0.38)", letterSpacing: "0.03em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom note */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 40 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(0,210,106,0.10)", border: "1px solid rgba(0,210,106,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔒</div>
            <span style={{ fontSize: 12, color: "rgba(232,240,235,0.30)", lineHeight: 1.5 }}>Restricted access · Admin credentials required</span>
          </div>
        </div>

        {/* ── RIGHT — form panel ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 56px", background: pageBg }}>
          <div style={{ width: "100%", maxWidth: 400, animation: "adm-fadein 0.4s ease both" }}>

            {/* OPS CENTER badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: isLight ? "#0A1F12" : "rgba(0,210,106,0.10)", border: `1px solid ${isLight ? "transparent" : "rgba(0,210,106,0.20)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 16 }}>⚡</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: headFg, letterSpacing: "-0.01em" }}>Charging Guru</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: green, textTransform: "uppercase" as const, marginTop: 1, opacity: 0.8 }}>Ops Center</div>
              </div>
            </div>

            {/* Card */}
            <div style={{ background: panelBg, borderRadius: 24, padding: "40px 36px", boxShadow: isLight ? "0 4px 40px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.04)" : "0 0 0 1px rgba(0,210,106,0.08),0 24px 64px rgba(0,0,0,0.5)", border: isLight ? "1px solid rgba(15,23,42,0.06)" : "1px solid rgba(0,210,106,0.08)" }}>

              {loginStep === "phone" ? (
                <>
                  <div style={{ marginBottom: 32 }}>
                    <h2 style={{ fontFamily: C.sans, fontSize: 26, fontWeight: 800, color: headFg, letterSpacing: "-0.04em", marginBottom: 8 }}>Admin Sign In</h2>
                    <p style={{ color: sub, fontSize: 13.5, lineHeight: 1.65 }}>Enter your registered admin number to receive a one-time passcode.</p>
                  </div>

                  {loginErr && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, marginBottom: 20, background: errBg, border: `1px solid ${errBdr}` }}>
                      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚠</span>
                      <span style={{ color: errFg, fontSize: 13, lineHeight: 1.5 }}>{loginErr}</span>
                    </div>
                  )}

                  <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" as const, color: sub, marginBottom: 8 }}>Mobile number</label>
                  <div className="adm-phone" style={{ display: "flex", alignItems: "center", background: inputBg, border: `1.5px solid ${inputBdr}`, borderRadius: 16, padding: "0 18px", marginBottom: 24, transition: "border-color .15s,box-shadow .15s" }}>
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

                  <button onClick={sendOtp} disabled={sending}
                    style={{ width: "100%", padding: "17px 20px", borderRadius: 16, fontSize: 14.5, fontWeight: 700, border: "none", cursor: (sending || phone.length !== 10) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: C.sans, transition: "all .15s", letterSpacing: "-0.01em", ...(sending || phone.length !== 10 ? btnOff : btnOn) }}>
                    {sending
                      ? <><span style={{ width: 16, height: 16, border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin-r 0.7s linear infinite" }} />Sending code…</>
                      : <>Get OTP <span style={{ opacity: 0.7 }}>→</span></>}
                  </button>

                  <p style={{ fontSize: 12, color: isLight ? "#94A3B8" : "#3A4D40", textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
                    Access is restricted to authorised administrators only.
                  </p>
                </>
              ) : (
                <>
                  <button onClick={() => { setLoginStep("phone"); setLoginErr(""); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: isLight ? "rgba(15,23,42,0.04)" : "rgba(0,210,106,0.06)", border: `1px solid ${isLight ? "rgba(15,23,42,0.08)" : "rgba(0,210,106,0.14)"}`, borderRadius: 10, color: sub, fontSize: 12, cursor: "pointer", marginBottom: 28, padding: "6px 12px", fontFamily: C.sans, transition: "all .12s" }}>
                    ← +91 {phone}
                  </button>

                  <div style={{ marginBottom: 28 }}>
                    <h2 style={{ fontFamily: C.sans, fontSize: 26, fontWeight: 800, color: headFg, letterSpacing: "-0.04em", marginBottom: 8 }}>Enter OTP</h2>
                    <p style={{ color: sub, fontSize: 13.5, lineHeight: 1.65 }}>6-digit code sent to your phone.</p>
                  </div>

                  {/* OTP boxes */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { otpRefs.current[idx] = el; }}
                        className="adm-otp"
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
                          boxShadow: digit ? `0 0 0 3px rgba(0,210,106,0.12)` : "none",
                          transition: "all .15s",
                        }}
                      />
                    ))}
                  </div>

                  {loginErr && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, marginBottom: 20, background: errBg, border: `1px solid ${errBdr}` }}>
                      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚠</span>
                      <span style={{ color: errFg, fontSize: 13, lineHeight: 1.5 }}>{loginErr}</span>
                    </div>
                  )}

                  <button onClick={verifyOtp} disabled={verifying || otp.some(d => !d)}
                    style={{ width: "100%", padding: "17px 20px", borderRadius: 16, fontSize: 14.5, fontWeight: 700, border: "none", cursor: (verifying || otp.some(d => !d)) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: C.sans, transition: "all .15s", letterSpacing: "-0.01em", ...((verifying || otp.some(d => !d)) ? btnOff : btnOn) }}>
                    {verifying
                      ? <><span style={{ width: 16, height: 16, border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin-r 0.7s linear infinite" }} />Verifying…</>
                      : <>Unlock Admin Panel <span style={{ opacity: 0.7 }}>→</span></>}
                  </button>

                  <button onClick={() => { setCooldown(0); sendOtp(); }} disabled={cooldown > 0 || verifying}
                    style={{ width: "100%", marginTop: 14, padding: "11px", background: "none", border: "none", color: cooldown > 0 ? (isLight ? "#CBD5E1" : "#2E4035") : sub, fontSize: 12.5, cursor: cooldown > 0 ? "not-allowed" : "pointer", fontFamily: C.sans, transition: "color .15s" }}>
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Didn't receive it? Resend OTP"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin panel ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: th.bg, fontFamily: C.sans }}>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar       { width: 4px; height: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)"}; border-radius: 4px }
        ::-webkit-scrollbar-thumb:hover { background: ${isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.14)"}; }
        @keyframes pulse-sidebar { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 224, flexShrink: 0, display: "flex", flexDirection: "column",
        background: th.panel,
        borderRight: `1px solid ${th.border}`,
        boxShadow: isLight ? "2px 0 16px rgba(0,0,0,0.06)" : "4px 0 28px rgba(0,0,0,0.4)",
      }}>

        {/* Brand */}
        <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${th.border}` }}>
          <Logo size="sm" href="/admin" theme={isLight ? "light" : "dark"} />
          <div style={{
            marginTop: 6, paddingLeft: 42,
            fontSize: 8, fontWeight: 700, letterSpacing: "0.22em",
            color: C.green, opacity: 0.7,
            textTransform: "uppercase" as const,
            fontFamily: "'Space Grotesk',system-ui,sans-serif",
          }}>OPS CENTER</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          {NAV.map(({ section, items }, si) => (
            <div key={section} style={{ marginTop: si === 0 ? 0 : 20 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.17em",
                color: isLight ? "rgba(15,23,42,0.28)" : "rgba(255,255,255,0.2)",
                textTransform: "uppercase" as const,
                padding: "0 8px", marginBottom: 3,
              }}>{section}</div>

              {items.map(({ href, label, Icon }) => {
                const active   = isActive(href, href === "/admin");
                const hovering = hovered === href && !active;
                return (
                  <Link key={href} href={href}
                    onMouseEnter={() => setHovered(href)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 9,
                      padding: "7px 10px", borderRadius: 9, marginBottom: 1,
                      textDecoration: "none",
                      fontWeight: active ? 600 : 400,
                      color: active ? C.green
                        : hovering ? th.text
                        : isLight ? "#5A6478" : "#6B7A8D",
                      background: active
                        ? "rgba(0,192,96,0.10)"
                        : hovering
                        ? isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)"
                        : "transparent",
                      borderLeft: active ? `2px solid ${C.green}` : "2px solid transparent",
                      transition: "all 0.11s",
                    }}
                  >
                    <Icon size={14} strokeWidth={active ? 2 : 1.6}
                      style={{ flexShrink: 0, opacity: active ? 1 : hovering ? 0.85 : 0.5 }} />
                    <span style={{ fontSize: 12.5, flex: 1, letterSpacing: "-0.01em" }}>{label}</span>
                    {active && <ChevronRight size={10} style={{ opacity: 0.3 }} />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer: theme toggle + user */}
        <div style={{ borderTop: `1px solid ${th.border}` }}>
          {/* Theme toggle row */}
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: th.sub }}>{isLight ? "Light mode" : "Dark mode"}</span>
            <button
              onClick={toggle}
              style={{
                width: 32, height: 18, borderRadius: 999, position: "relative" as const,
                background: isLight ? C.green : th.raised,
                border: `1px solid ${isLight ? C.green : th.border}`,
                cursor: "pointer", transition: "all 0.2s", padding: 0,
              }}
            >
              <div style={{
                position: "absolute" as const,
                top: 2, left: isLight ? 15 : 2,
                width: 12, height: 12, borderRadius: "50%",
                background: isLight ? "#fff" : th.sub,
                transition: "left 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isLight
                  ? <Sun size={7} color={C.green} strokeWidth={2.5} />
                  : <Moon size={7} color={th.text} strokeWidth={2} />}
              </div>
            </button>
          </div>

          {/* User row */}
          <div style={{ padding: "10px 10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, background: isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)" }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#00D26A,#00B4A0)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color: "#020E07",
                boxShadow: "0 0 0 2px rgba(0,210,106,0.22), 0 0 12px rgba(0,210,106,0.1)",
                position: "relative" as const,
              }}>
                AD
                <div style={{ position: "absolute" as const, bottom: -1, right: -1, width: 8, height: 8, borderRadius: "50%", background: C.green, border: `1.5px solid ${th.panel}`, animation: "pulse-sidebar 2.5s ease-in-out infinite" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: th.text, letterSpacing: "-0.01em" }}>Admin</div>
                <div style={{ fontSize: 10, color: th.sub, marginTop: 1 }}>Super Admin</div>
              </div>
              <button
                title="Sign out"
                onClick={() => {
                  bffLogout().finally(() => {
                    setStatus("login");
                    setLoginStep("phone");
                    setPhone("");
                    setOtp(["", "", "", "", "", ""]);
                    setLoginErr("");
                  });
                }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", color: th.sub, transition: "color 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.color = C.red; }}
                onMouseLeave={e => { e.currentTarget.style.color = th.sub; }}
              >
                <LogOut size={12} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: "auto", background: th.bg }}>
        {children}
      </main>
    </div>
  );
}
