"use client";
import { useState, useCallback } from "react";
import { Settings, Copy, CheckCircle, AlertTriangle, RefreshCw, Clock, MapPin, Zap } from "lucide-react";
import { getTheme, BASE, getToken, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";

export default function AdminSettingsPage() {
  const { isLight } = useTheme();
  const th = getTheme(isLight);

  const [copied,      setCopied]      = useState(false);
  const [testing,     setTesting]     = useState(false);
  const [testResult,  setTestResult]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [sweeping,    setSweeping]    = useState(false);
  const [sweepResult, setSweepResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 14, padding: "4px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: th.sub, padding: "14px 0 8px" }}>{title}</div>
        {children}
      </div>
    );
  }

  function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${th.border}` }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: th.text }}>{label}</div>
          <div style={{ fontSize: 11, color: th.sub, marginTop: 3 }}>{desc}</div>
        </div>
        <div style={{ flexShrink: 0, marginLeft: 20 }}>{children}</div>
      </div>
    );
  }

  function copyToken() {
    const t = getToken();
    if (!t) return;
    navigator.clipboard.writeText(t).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const testAPI = useCallback(async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch(`${BASE}/api/v1/admin/analytics/overview`, { headers: { Authorization: `Bearer ${getToken()}` } });
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
      const res = await fetch(`${BASE}/api/v1/admin/maintenance/expire-holds`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSweepResult({ ok: true, msg: `Expired ${json.expired_count ?? 0} stale holds.` });
    } catch (e: unknown) {
      setSweepResult({ ok: false, msg: e instanceof Error ? e.message : "Sweep failed" });
    } finally { setSweeping(false); }
  }, []);

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: C.sans }}>
      <div style={{ paddingBottom: 20, borderBottom: `1px solid ${th.border}`, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Settings size={18} color={th.sub} strokeWidth={1.75} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: th.text, letterSpacing: "-0.02em" }}>Settings</h1>
        </div>
        <p style={{ fontSize: 12, color: th.sub }}>Admin panel configuration and diagnostic tools</p>
      </div>

      <Section title="API Connection">
        <Row label="Backend URL" desc="FastAPI server endpoint">
          <span style={{ fontFamily: C.mono, fontSize: 12, color: th.sub, background: th.raised, padding: "5px 10px", borderRadius: 7, border: `1px solid ${th.border}` }}>{BASE}</span>
        </Row>
        <Row label="Auth Token" desc="Your current access token (cg_access cookie)">
          <button onClick={copyToken} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", background: th.raised, border: `1px solid ${th.border}`, color: copied ? C.green : th.text, fontFamily: C.sans, transition: "color 0.15s" }}>
            {copied ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy Token</>}
          </button>
        </Row>
        <Row label="API Health Check" desc="Test connectivity to the backend">
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

      <Section title="Maintenance Operations">
        <Row label="Expire Stale Holds" desc="Sweep PENDING_PAYMENT bookings past their hold_expires_at. Safe to run repeatedly.">
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
        <Row label="Station Approvals" desc="Review pending station submissions awaiting approval.">
          <a href="/admin/applications" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: `${C.teal}12`, border: `1px solid ${C.teal}35`, color: C.teal, fontFamily: C.sans, textDecoration: "none" }}>
            <MapPin size={11} /> View Applications →
          </a>
        </Row>
        <Row label="Live Sessions" desc="Monitor charging sessions currently in progress.">
          <a href="/admin/sessions" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: `${C.blue}12`, border: `1px solid ${C.blue}35`, color: C.blue, fontFamily: C.sans, textDecoration: "none" }}>
            <Zap size={11} /> Live Sessions →
          </a>
        </Row>
      </Section>

      <Section title="Platform Info">
        <Row label="Version" desc="Admin panel version"><span style={{ fontFamily: C.mono, fontSize: 12, color: th.sub }}>1.0.0</span></Row>
        <Row label="Framework" desc="Built with"><span style={{ fontSize: 12, color: th.sub }}>Next.js 14 · FastAPI · PostgreSQL 16</span></Row>
        <Row label="Auth" desc="Authentication mechanism"><span style={{ fontSize: 12, color: th.sub }}>JWT HS256 · OTP phone login · rotating refresh</span></Row>
        <Row label="Payments" desc="Payment processor"><span style={{ fontSize: 12, color: th.sub }}>Razorpay · HMAC-SHA256 webhooks</span></Row>
        <Row label="QR" desc="QR code signing"><span style={{ fontSize: 12, color: th.sub }}>HMAC-SHA256 + Redis single-use jti</span></Row>
      </Section>

      <Section title="Environment">
        <Row label="Debug Mode" desc="CG_OTP_DEBUG — returns debug_code in OTP responses">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={12} color={C.amber} />
            <span style={{ fontSize: 12, color: C.amber, fontWeight: 500 }}>Check CG_OTP_DEBUG in backend .env</span>
          </div>
        </Row>
        <Row label="Razorpay Mode" desc="Live vs test mode depends on CG_RAZORPAY_KEY_ID prefix">
          <span style={{ fontSize: 12, color: th.sub, fontFamily: C.mono }}>rzp_test_* = test · rzp_live_* = production</span>
        </Row>
      </Section>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
