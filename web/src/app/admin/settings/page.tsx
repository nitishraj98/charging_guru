"use client";
import { useState, useCallback } from "react";
import { Settings, Copy, CheckCircle, AlertTriangle, RefreshCw, Clock, MapPin, Zap, ShieldCheck } from "lucide-react";
import { getTheme, BASE, getToken, authFetch, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";

type Theme = ReturnType<typeof getTheme>;

function Section({ title, th, children }: { title: string; th: Theme; children: React.ReactNode }) {
  return (
    <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "4px 22px", marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: th.sub, padding: "14px 0 8px" }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, desc, th, children }: { label: string; desc: string; th: Theme; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "14px 0", borderBottom: `1px solid ${th.border}` }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: th.text }}>{label}</div>
        <div style={{ fontSize: 11, color: th.sub, marginTop: 3 }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { isLight } = useTheme();
  const th = getTheme(isLight);

  const [copied,      setCopied]      = useState(false);
  const [testing,     setTesting]     = useState(false);
  const [testResult,  setTestResult]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [sweeping,    setSweeping]    = useState(false);
  const [sweepResult, setSweepResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [invitePhone,  setInvitePhone]  = useState("");
  const [inviting,     setInviting]     = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function copyToken() {
    const t = getToken();
    if (!t) return;
    navigator.clipboard.writeText(t).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const testAPI = useCallback(async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await authFetch("/api/v1/admin/analytics/overview");
      setTestResult(res.ok
        ? { ok: true,  msg: `Backend healthy — HTTP ${res.status}` }
        : { ok: false, msg: `HTTP ${res.status} — check auth or backend status` }
      );
    } catch { setTestResult({ ok: false, msg: "Network error — is the backend running?" }); }
    finally { setTesting(false); }
  }, []);

  const expireHolds = useCallback(async () => {
    setSweeping(true); setSweepResult(null);
    try {
      const res = await authFetch("/api/v1/admin/maintenance/expire-holds", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSweepResult({ ok: true, msg: `Expired ${json.expired_count ?? 0} stale holds.` });
    } catch (e: unknown) {
      setSweepResult({ ok: false, msg: e instanceof Error ? e.message : "Sweep failed" });
    } finally { setSweeping(false); }
  }, []);

  const grantAdmin = useCallback(async () => {
    setInviting(true); setInviteResult(null);
    try {
      const res = await authFetch("/api/v1/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${invitePhone}` }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail ?? `HTTP ${res.status}`);
      setInviteResult({ ok: true, msg: `Granted admin access to ${json.phone}.` });
      setInvitePhone("");
    } catch (e: unknown) {
      setInviteResult({ ok: false, msg: e instanceof Error ? e.message : "Failed to grant access" });
    } finally { setInviting(false); }
  }, [invitePhone]);

  return (
    <div className="admin-pad" style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: C.sans }}>
      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${th.border}`, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Settings size={18} color={th.sub} strokeWidth={1.75} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: th.text, letterSpacing: "-0.02em" }}>Settings</h1>
        </div>
        <p style={{ fontSize: 12, color: th.sub }}>Admin panel configuration and diagnostic tools</p>
      </div>

      <Section th={th} title="API Connection">
        <Row th={th} label="Backend URL" desc="FastAPI server endpoint">
          <span style={{ fontFamily: C.mono, fontSize: 12, color: th.sub, background: th.raised, padding: "5px 10px", borderRadius: 7, border: `1px solid ${th.border}` }}>{BASE}</span>
        </Row>
        <Row th={th} label="Auth Token" desc="Your current access token (cg_access cookie)">
          <button onClick={copyToken} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", background: th.raised, border: `1px solid ${th.border}`, color: copied ? C.green : th.text, fontFamily: C.sans, transition: "color 0.15s" }}>
            {copied ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy Token</>}
          </button>
        </Row>
        <Row th={th} label="API Health Check" desc="Test connectivity to the backend">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {testResult && (
              <span style={{ fontSize: 12, color: testResult.ok ? C.green : C.red, fontWeight: 500, maxWidth: 260 }}>{testResult.msg}</span>
            )}
            <button onClick={testAPI} disabled={testing}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: testing ? "default" : "pointer", background: `${C.green}15`, border: `1px solid ${C.green}35`, color: C.green, fontFamily: C.sans, opacity: testing ? 0.6 : 1 }}>
              <RefreshCw size={11} style={{ animation: testing ? "spin 1s linear infinite" : "none" }} /> {testing ? "Testing…" : "Test API"}
            </button>
          </div>
        </Row>
      </Section>

      <Section th={th} title="Maintenance Operations">
        <Row th={th} label="Expire Stale Holds" desc="Sweep PENDING_PAYMENT bookings past their hold_expires_at. Safe to run repeatedly.">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {sweepResult && (
              <span style={{ fontSize: 12, color: sweepResult.ok ? C.green : C.red, fontWeight: 500 }}>{sweepResult.msg}</span>
            )}
            <button onClick={expireHolds} disabled={sweeping}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: sweeping ? "default" : "pointer", background: `${C.amber}12`, border: `1px solid ${C.amber}35`, color: C.amber, fontFamily: C.sans, opacity: sweeping ? 0.6 : 1 }}>
              <Clock size={11} /> {sweeping ? "Running…" : "Run Sweep"}
            </button>
          </div>
        </Row>
        <Row th={th} label="Station Approvals" desc="Review pending station submissions awaiting approval.">
          <a href="/admin/applications" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: `${C.teal}12`, border: `1px solid ${C.teal}35`, color: C.teal, fontFamily: C.sans, textDecoration: "none" }}>
            <MapPin size={11} /> View Applications →
          </a>
        </Row>
        <Row th={th} label="Live Sessions" desc="Monitor charging sessions currently in progress.">
          <a href="/admin/sessions" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: `${C.blue}12`, border: `1px solid ${C.blue}35`, color: C.blue, fontFamily: C.sans, textDecoration: "none" }}>
            <Zap size={11} /> Live Sessions →
          </a>
        </Row>
      </Section>

      <Section th={th} title="Admin Access">
        <Row th={th} label="Grant admin access" desc="Promote an existing user (by phone, E.164 format) to ROLE_ADMIN.">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", width: 160, padding: "6px 10px", borderRadius: 8, background: th.raised, border: `1px solid ${th.border}` }}>
              <span style={{ fontSize: 12, fontFamily: C.mono, color: th.sub, marginRight: 4, flexShrink: 0, userSelect: "none" }}>+91</span>
              <input
                value={invitePhone}
                onChange={e => setInvitePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                style={{ width: "100%", fontSize: 12, fontFamily: C.mono, background: "transparent", border: "none", color: th.text, outline: "none" }}
              />
            </div>
            <button onClick={grantAdmin} disabled={inviting || invitePhone.length !== 10}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: (inviting || invitePhone.length !== 10) ? "default" : "pointer", background: `${C.purple}12`, border: `1px solid ${C.purple}35`, color: C.purple, fontFamily: C.sans, opacity: (inviting || invitePhone.length !== 10) ? 0.6 : 1 }}>
              <ShieldCheck size={11} /> {inviting ? "Granting…" : "Grant Admin"}
            </button>
          </div>
        </Row>
        {inviteResult && (
          <Row th={th} label=" " desc="">
            <span style={{ fontSize: 12, color: inviteResult.ok ? C.green : C.red, fontWeight: 500 }}>{inviteResult.msg}</span>
          </Row>
        )}
        <Row th={th} label="Manage admins" desc="View and revoke admin access for existing admins.">
          <a href="/admin/users" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: `${C.purple}12`, border: `1px solid ${C.purple}35`, color: C.purple, fontFamily: C.sans, textDecoration: "none" }}>
            <ShieldCheck size={11} /> View Drivers/Admins →
          </a>
        </Row>
      </Section>

      <Section th={th} title="Platform Info">
        <Row th={th} label="Version" desc="Admin panel version"><span style={{ fontFamily: C.mono, fontSize: 12, color: th.sub }}>1.0.0</span></Row>
        <Row th={th} label="Framework" desc="Built with"><span style={{ fontSize: 12, color: th.sub }}>Next.js 14 · FastAPI · PostgreSQL 16</span></Row>
        <Row th={th} label="Auth" desc="Authentication mechanism"><span style={{ fontSize: 12, color: th.sub }}>JWT HS256 · OTP phone login · rotating refresh</span></Row>
        <Row th={th} label="Payments" desc="Payment processor"><span style={{ fontSize: 12, color: th.sub }}>Razorpay · HMAC-SHA256 webhooks</span></Row>
        <Row th={th} label="QR" desc="QR code signing"><span style={{ fontSize: 12, color: th.sub }}>HMAC-SHA256 + Redis single-use jti</span></Row>
      </Section>

      <Section th={th} title="Environment">
        <Row th={th} label="Debug Mode" desc="CG_OTP_DEBUG — returns debug_code in OTP responses">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={12} color={C.amber} />
            <span style={{ fontSize: 12, color: C.amber, fontWeight: 500 }}>Check CG_OTP_DEBUG in backend .env</span>
          </div>
        </Row>
        <Row th={th} label="Razorpay Mode" desc="Live vs test mode depends on CG_RAZORPAY_KEY_ID prefix">
          <span style={{ fontSize: 12, color: th.sub, fontFamily: C.mono }}>rzp_test_* = test · rzp_live_* = production</span>
        </Row>
      </Section>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
