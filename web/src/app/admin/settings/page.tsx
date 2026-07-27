"use client";
import { useState, useCallback, useEffect } from "react";
import { Settings, Copy, CheckCircle, AlertTriangle, RefreshCw, Clock, MapPin, Zap, ShieldCheck, IndianRupee, Percent, ParkingSquare, Timer, ReceiptText } from "lucide-react";
import { getTheme, BASE, getToken, authFetch, C } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import { admin, PricingSettings, FeeMode } from "@/lib/api";

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

function RowResultBadge({ result }: { result?: { ok: boolean; msg: string } }) {
  if (!result) return null;
  return (
    <span style={{ fontSize: 11, color: result.ok ? C.green : C.red, fontWeight: 500 }}>{result.msg}</span>
  );
}

function SaveBtn({ onClick, saving, disabled }: { onClick: () => void; saving: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      style={{
        padding: "6px 14px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
        cursor: saving || disabled ? "default" : "pointer",
        background: `${C.green}15`, border: `1px solid ${C.green}35`, color: C.green,
        fontFamily: C.sans, opacity: saving || disabled ? 0.6 : 1,
      }}
    >
      {saving ? "Saving…" : "Save"}
    </button>
  );
}

function ModeToggle({ th, mode, onChange }: { th: Theme; mode: FeeMode; onChange: (m: FeeMode) => void }) {
  return (
    <div style={{ display: "flex", borderRadius: 8, border: `1px solid ${th.border}`, overflow: "hidden" }}>
      {(["FIXED", "PERCENTAGE"] as FeeMode[]).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            padding: "5px 10px", fontSize: 10.5, fontWeight: 600, cursor: "pointer", border: "none",
            background: mode === m ? `${C.green}18` : "transparent",
            color: mode === m ? C.green : th.sub, fontFamily: C.sans,
          }}
        >
          {m === "FIXED" ? "₹ Fixed" : "% Percent"}
        </button>
      ))}
    </div>
  );
}

function NumInput({ th, value, onChange, width = 90, placeholder }: {
  th: Theme; value: number; onChange: (n: number) => void; width?: number; placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      placeholder={placeholder}
      style={{
        width, fontSize: 12, fontFamily: C.mono, background: th.raised, border: `1px solid ${th.border}`,
        borderRadius: 7, color: th.text, padding: "5px 8px", outline: "none",
      }}
    />
  );
}

function EnableToggle({ th, enabled, onChange }: { th: Theme; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: 38, height: 21, borderRadius: 999, border: "none", cursor: "pointer", position: "relative",
        background: enabled ? C.green : th.raised, transition: "background 0.15s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: enabled ? 19 : 2, width: 17, height: 17, borderRadius: "50%",
        background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,.3)",
      }} />
    </button>
  );
}

function PricingFeeRow({
  th, icon, label, desc, mode, fixedPaise, percent, minPaise, maxPaise, enabled, saving, result, onSave,
}: {
  th: Theme; icon: React.ReactNode; label: string; desc: string;
  mode: FeeMode; fixedPaise: number; percent: number; minPaise: number; maxPaise: number; enabled: boolean;
  saving: boolean; result?: { ok: boolean; msg: string };
  onSave: (v: { mode: FeeMode; fixedPaise: number; percent: number; minPaise: number; maxPaise: number; enabled: boolean }) => void;
}) {
  const [localMode, setLocalMode] = useState(mode);
  const [localFixed, setLocalFixed] = useState(fixedPaise);
  const [localPercent, setLocalPercent] = useState(percent);
  const [localMin, setLocalMin] = useState(minPaise);
  const [localMax, setLocalMax] = useState(maxPaise);
  const [localEnabled, setLocalEnabled] = useState(enabled);

  return (
    <div style={{ padding: "14px 0", borderBottom: `1px solid ${th.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: th.text, display: "flex", alignItems: "center", gap: 6 }}>
            {icon} {label}
          </div>
          <div style={{ fontSize: 11, color: th.sub, marginTop: 3 }}>{desc}</div>
        </div>
        <EnableToggle th={th} enabled={localEnabled} onChange={setLocalEnabled} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <ModeToggle th={th} mode={localMode} onChange={setLocalMode} />
        {localMode === "FIXED" ? (
          <NumInput th={th} value={localFixed} onChange={setLocalFixed} placeholder="paise" />
        ) : (
          <NumInput th={th} value={localPercent} onChange={setLocalPercent} width={70} placeholder="%" />
        )}
        <span style={{ fontSize: 10, color: th.sub }}>min</span>
        <NumInput th={th} value={localMin} onChange={setLocalMin} width={70} />
        <span style={{ fontSize: 10, color: th.sub }}>max (0=uncapped)</span>
        <NumInput th={th} value={localMax} onChange={setLocalMax} width={70} />
        <RowResultBadge result={result} />
        <div style={{ marginLeft: "auto" }}>
          <SaveBtn saving={saving} onClick={() => onSave({
            mode: localMode, fixedPaise: localFixed, percent: localPercent,
            minPaise: localMin, maxPaise: localMax, enabled: localEnabled,
          })} />
        </div>
      </div>
    </div>
  );
}

function GstRow({ th, percent, enabled, saving, result, onSave }: {
  th: Theme; percent: number; enabled: boolean; saving: boolean;
  result?: { ok: boolean; msg: string }; onSave: (percent: number, enabled: boolean) => void;
}) {
  const [localPercent, setLocalPercent] = useState(percent);
  const [localEnabled, setLocalEnabled] = useState(enabled);
  return (
    <Row th={th} label="GST" desc="Applied to the full pre-tax subtotal (energy + parking + idle + platform + convenience - discount).">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Percent size={11} color={th.sub} />
        <NumInput th={th} value={localPercent} onChange={setLocalPercent} width={60} />
        <EnableToggle th={th} enabled={localEnabled} onChange={setLocalEnabled} />
        <RowResultBadge result={result} />
        <SaveBtn saving={saving} onClick={() => onSave(localPercent, localEnabled)} />
      </div>
    </Row>
  );
}

function ToggleRow({ th, icon, label, desc, enabled, saving, result, onSave }: {
  th: Theme; icon: React.ReactNode; label: string; desc: string; enabled: boolean; saving: boolean;
  result?: { ok: boolean; msg: string }; onSave: (enabled: boolean) => void;
}) {
  const [localEnabled, setLocalEnabled] = useState(enabled);
  return (
    <Row th={th} label={label} desc={desc}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {icon}
        <EnableToggle th={th} enabled={localEnabled} onChange={setLocalEnabled} />
        <RowResultBadge result={result} />
        <SaveBtn saving={saving} onClick={() => onSave(localEnabled)} />
      </div>
    </Row>
  );
}

function IdleRow({ th, enabled, graceMinutes, saving, result, onSave }: {
  th: Theme; enabled: boolean; graceMinutes: number; saving: boolean;
  result?: { ok: boolean; msg: string }; onSave: (enabled: boolean, grace: number) => void;
}) {
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localGrace, setLocalGrace] = useState(graceMinutes);
  return (
    <Row th={th} label="Idle Fee" desc="Charged per minute beyond the grace period after a session's booked window ends.">
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Timer size={11} color={th.sub} />
        <span style={{ fontSize: 10, color: th.sub }}>grace (min)</span>
        <NumInput th={th} value={localGrace} onChange={setLocalGrace} width={60} />
        <EnableToggle th={th} enabled={localEnabled} onChange={setLocalEnabled} />
        <RowResultBadge result={result} />
        <SaveBtn saving={saving} onClick={() => onSave(localEnabled, localGrace)} />
      </div>
    </Row>
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

  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [rowResult, setRowResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  useEffect(() => {
    admin.pricingSettings.get().then(setPricing).catch(() => {}).finally(() => setPricingLoading(false));
  }, []);

  const savePricingRow = useCallback(async (rowKey: string, patch: Partial<PricingSettings>) => {
    setSavingRow(rowKey);
    setRowResult(r => ({ ...r, [rowKey]: undefined as unknown as { ok: boolean; msg: string } }));
    try {
      const updated = await admin.pricingSettings.update(patch);
      setPricing(updated);
      setRowResult(r => ({ ...r, [rowKey]: { ok: true, msg: "Saved" } }));
    } catch (e: unknown) {
      setRowResult(r => ({ ...r, [rowKey]: { ok: false, msg: e instanceof Error ? e.message : "Save failed" } }));
    } finally {
      setSavingRow(null);
    }
  }, []);

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

      <Section th={th} title="Pricing & Fees">
        {pricingLoading || !pricing ? (
          <Row th={th} label="Loading…" desc="Fetching current pricing configuration">
            <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} color={th.sub} />
          </Row>
        ) : (
          <>
            <PricingFeeRow
              th={th}
              icon={<IndianRupee size={11} />}
              label="Platform Fee"
              desc="Charging Guru's marketplace fee, charged on top of the energy cost."
              mode={pricing.platform_fee_mode}
              fixedPaise={pricing.platform_fee_fixed_paise}
              percent={pricing.platform_fee_percent}
              minPaise={pricing.platform_fee_min_paise}
              maxPaise={pricing.platform_fee_max_paise}
              enabled={pricing.platform_fee_enabled}
              saving={savingRow === "platform"}
              result={rowResult["platform"]}
              onSave={patch => savePricingRow("platform", {
                platform_fee_mode: patch.mode, platform_fee_fixed_paise: patch.fixedPaise,
                platform_fee_percent: patch.percent, platform_fee_min_paise: patch.minPaise,
                platform_fee_max_paise: patch.maxPaise, platform_fee_enabled: patch.enabled,
              })}
            />
            <PricingFeeRow
              th={th}
              icon={<ReceiptText size={11} />}
              label="Convenience Fee"
              desc="Booking convenience fee shown at checkout."
              mode={pricing.convenience_fee_mode}
              fixedPaise={pricing.convenience_fee_fixed_paise}
              percent={pricing.convenience_fee_percent}
              minPaise={pricing.convenience_fee_min_paise}
              maxPaise={pricing.convenience_fee_max_paise}
              enabled={pricing.convenience_fee_enabled}
              saving={savingRow === "convenience"}
              result={rowResult["convenience"]}
              onSave={patch => savePricingRow("convenience", {
                convenience_fee_mode: patch.mode, convenience_fee_fixed_paise: patch.fixedPaise,
                convenience_fee_percent: patch.percent, convenience_fee_min_paise: patch.minPaise,
                convenience_fee_max_paise: patch.maxPaise, convenience_fee_enabled: patch.enabled,
              })}
            />
            <GstRow
              th={th}
              percent={pricing.gst_percentage}
              enabled={pricing.gst_enabled}
              saving={savingRow === "gst"}
              result={rowResult["gst"]}
              onSave={(percent, enabled) => savePricingRow("gst", { gst_percentage: percent, gst_enabled: enabled })}
            />
            <ToggleRow
              th={th}
              icon={<ParkingSquare size={11} />}
              label="Parking Fee"
              desc="Global switch — when off, no charger's parking fee is billed even if configured."
              enabled={pricing.parking_fee_enabled}
              saving={savingRow === "parking"}
              result={rowResult["parking"]}
              onSave={enabled => savePricingRow("parking", { parking_fee_enabled: enabled })}
            />
            <IdleRow
              th={th}
              enabled={pricing.idle_fee_enabled}
              graceMinutes={pricing.idle_grace_minutes}
              saving={savingRow === "idle"}
              result={rowResult["idle"]}
              onSave={(enabled, grace) => savePricingRow("idle", { idle_fee_enabled: enabled, idle_grace_minutes: grace })}
            />
          </>
        )}
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
