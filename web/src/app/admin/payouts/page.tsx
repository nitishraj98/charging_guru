"use client";
import { useCallback, useEffect, useState } from "react";
import { Wallet, CheckCircle2, Clock, Plus, X, IndianRupee, Calendar, Building2, ShieldCheck, Sparkles } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { admin as adminApi, OwnerPayout, PayoutQuote } from "@/lib/api";
import { fmtRupee, fmtDate } from "@/lib/admin-ui";
import {
  getAdminTheme, Card, DataTable, Column, StatusBadge, Button, PageHeader,
  useToast, useAdminData,
} from "@/components/admin";

const TABS = ["ALL", "PENDING", "SCHEDULED", "PAID", "FAILED"] as const;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function CreatePayoutModal({ th, onClose, onCreated }: {
  th: ReturnType<typeof getAdminTheme>; onClose: () => void; onCreated: () => void;
}) {
  const toast = useToast();
  const { owners, stationsByOwner } = useAdminData();
  const [ownerId, setOwnerId] = useState("");
  const [stationId, setStationId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [periodStart, setPeriodStart] = useState(firstOfMonthStr());
  const [periodEnd, setPeriodEnd] = useState(todayStr());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [quote, setQuote] = useState<PayoutQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const ownerStations = ownerId ? (stationsByOwner.get(ownerId) ?? []) : [];
  const selectedOwner = owners.find(o => o.id === ownerId);
  const selectedStation = stationId ? ownerStations.find(s => s.id === stationId) : undefined;

  // Live-quote the amount from the backend every time owner, station scope
  // (including "All stations"), or the period changes — this replaces the
  // old all-time-pending prefill with a real period-aware figure that also
  // accounts for payouts that already cover part of this window.
  useEffect(() => {
    if (!ownerId || !periodStart || !periodEnd) { setQuote(null); return; }
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    end.setDate(end.getDate() + 1); // period end is inclusive of that calendar day
    if (end <= start) { setQuote(null); return; }
    let cancelled = false;
    setLoadingQuote(true);
    adminApi.payoutQuote(ownerId, start.toISOString(), end.toISOString(), stationId || null)
      .then(q => { if (!cancelled) setQuote(q); })
      .catch(() => { if (!cancelled) setQuote(null); })
      .finally(() => { if (!cancelled) setLoadingQuote(false); });
    return () => { cancelled = true; };
  }, [ownerId, stationId, periodStart, periodEnd]);

  useEffect(() => {
    setStationId("");
    setAmountTouched(false);
  }, [ownerId]);

  // Auto-fill from the live quote, but only until the admin edits the field
  // by hand — after that we stop overwriting their input.
  useEffect(() => {
    if (quote && !amountTouched) {
      setAmount((quote.suggested_amount_paise / 100).toFixed(2));
    }
  }, [quote, amountTouched]);

  async function submit() {
    if (!ownerId || !amount || !periodStart || !periodEnd) return;
    setSaving(true);
    try {
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      end.setDate(end.getDate() + 1);
      await adminApi.payouts.create({
        owner_id: ownerId,
        station_id: stationId || null,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        amount_paise: Math.round(Number(amount) * 100),
        reference_note: note || undefined,
      });
      toast.show("success", "Payout created.");
      onCreated();
      onClose();
    } catch (e: unknown) {
      toast.show("error", e instanceof Error ? e.message : "Failed to create payout");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: th.card, border: `1px solid ${th.border}`, borderRadius: 20,
          width: 480, maxWidth: "94vw", maxHeight: "92vh", overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,.35)",
        }}
      >
        <div style={{
          padding: "20px 24px", borderBottom: `1px solid ${th.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: `linear-gradient(135deg, ${th.accentDim}, transparent)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: th.accentDim, border: `1px solid ${th.accentBorder}`, display: "grid", placeItems: "center" }}>
              <Sparkles size={16} color={th.accent} />
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: th.text, letterSpacing: "-0.01em" }}>Create Payout</div>
              <div style={{ fontSize: 11.5, color: th.textSub, marginTop: 1 }}>Pay a station owner for earnings in a chosen period</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.textSub, padding: 4 }}><X size={17} /></button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={fieldLabelStyle(th)}>
            Owner
            <select value={ownerId} onChange={e => setOwnerId(e.target.value)} style={selectStyle(th)}>
              <option value="">Select owner…</option>
              {owners.map(o => <option key={o.id} value={o.id}>{o.full_name ?? o.phone}</option>)}
            </select>
          </label>

          {ownerId && (
            <label style={fieldLabelStyle(th)}>
              Station scope
              <select value={stationId} onChange={e => setStationId(e.target.value)} style={selectStyle(th)}>
                <option value="">✦ All stations (combined)</option>
                {ownerStations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ ...fieldLabelStyle(th), flex: 1 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={11} /> Period start</span>
              <input type="date" value={periodStart} max={periodEnd || undefined} onChange={e => setPeriodStart(e.target.value)} style={inputStyle(th)} />
            </label>
            <label style={{ ...fieldLabelStyle(th), flex: 1 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={11} /> Period end</span>
              <input type="date" value={periodEnd} min={periodStart || undefined} onChange={e => setPeriodEnd(e.target.value)} style={inputStyle(th)} />
            </label>
          </div>

          {ownerId && (
            <div style={{
              borderRadius: 14, border: `1px solid ${th.border}`, background: th.raised,
              padding: 16, display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 600, color: th.textSub, textTransform: "uppercase", letterSpacing: ".03em" }}>
                <Building2 size={12} />
                {selectedStation ? selectedStation.name : "All stations combined"}
                {loadingQuote && <span style={{ fontWeight: 400, textTransform: "none", opacity: .7 }}> · calculating…</span>}
              </div>
              <QuoteRow th={th} label="Earned in period" value={quote?.earned_in_period_paise} />
              <QuoteRow th={th} label="Already covered by other payouts" value={quote ? -quote.already_covered_paise : undefined} negative />
              <div style={{ height: 1, background: th.border, margin: "2px 0" }} />
              <QuoteRow th={th} label="Suggested payout" value={quote?.suggested_amount_paise} emphasis />
            </div>
          )}

          <label style={fieldLabelStyle(th)}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><IndianRupee size={11} /> Amount to pay</span>
            <input
              type="number" value={amount}
              onChange={e => { setAmount(e.target.value); setAmountTouched(true); }}
              placeholder="0.00" style={{ ...inputStyle(th), fontFamily: th.mono, fontWeight: 700, fontSize: 15 }}
            />
            {quote && amountTouched && Math.round(Number(amount || 0) * 100) !== quote.suggested_amount_paise && (
              <span style={{ fontSize: 10.5, color: th.warn, marginTop: 4, display: "block" }}>
                Overriding the suggested amount of {fmtRupee(quote.suggested_amount_paise)}.
              </span>
            )}
          </label>

          <label style={fieldLabelStyle(th)}>
            Reference note <span style={{ opacity: 0.6, fontWeight: 400 }}>(optional)</span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="UTR number, etc." style={inputStyle(th)} />
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: th.textMuted }}>
            <ShieldCheck size={12} /> This creates a ledger entry only — no funds are transferred automatically.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "16px 24px 24px" }}>
          <Button th={th} variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button th={th} variant="primary" fullWidth loading={saving} disabled={!ownerId || !amount || !periodStart || !periodEnd} onClick={submit}>
            Create Payout{selectedOwner ? ` for ${(selectedOwner.full_name ?? selectedOwner.phone).split(" ")[0]}` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuoteRow({ th, label, value, negative, emphasis }: {
  th: ReturnType<typeof getAdminTheme>; label: string; value?: number; negative?: boolean; emphasis?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: emphasis ? 13 : 12, color: emphasis ? th.text : th.textSub, fontWeight: emphasis ? 700 : 400 }}>{label}</span>
      <span style={{
        fontFamily: th.mono, fontSize: emphasis ? 15 : 12.5, fontWeight: emphasis ? 700 : 500,
        color: emphasis ? th.success : negative ? th.warn : th.text,
      }}>
        {value === undefined ? "—" : `${negative && value !== 0 ? "−" : ""}${fmtRupee(Math.abs(value))}`}
      </span>
    </div>
  );
}

function fieldLabelStyle(th: ReturnType<typeof getAdminTheme>): React.CSSProperties {
  return { fontSize: 11.5, fontWeight: 600, color: th.textSub, display: "block" };
}
function inputStyle(th: ReturnType<typeof getAdminTheme>): React.CSSProperties {
  return {
    display: "block", width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 10,
    background: th.raised, border: `1px solid ${th.border}`, color: th.text, fontSize: 12.5,
    outline: "none", fontFamily: th.sans, boxSizing: "border-box",
  };
}
function selectStyle(th: ReturnType<typeof getAdminTheme>): React.CSSProperties {
  return inputStyle(th);
}

export default function AdminPayoutsPage() {
  const { isLight } = useTheme();
  const th = getAdminTheme(isLight);
  const toast = useToast();
  const { userById, stationById } = useAdminData();

  const [items, setItems] = useState<OwnerPayout[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<typeof TABS[number]>("ALL");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.payouts.list(status === "ALL" ? undefined : status, 1, 100);
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function markPaid(id: string) {
    setActing(id);
    try {
      await adminApi.payouts.markPaid(id);
      toast.show("success", "Payout marked as paid.");
      load();
    } catch (e: unknown) {
      toast.show("error", e instanceof Error ? e.message : "Failed to mark paid");
    } finally {
      setActing(null);
    }
  }

  const pendingTotal = items.filter(p => p.status === "PENDING" || p.status === "SCHEDULED").reduce((s, p) => s + p.amount_paise, 0);
  const paidTotal = items.filter(p => p.status === "PAID").reduce((s, p) => s + p.amount_paise, 0);

  const columns: Column<OwnerPayout>[] = [
    { key: "owner", header: "Owner", render: p => {
      const u = userById.get(p.owner_id);
      return u ? (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: th.text }}>{u.full_name ?? u.phone}</div>
          <div style={{ fontSize: 11, color: th.textSub, marginTop: 1 }}>{u.phone}</div>
        </div>
      ) : <span style={{ color: th.textMuted, fontSize: 12 }}>{p.owner_id.slice(0, 10)}…</span>;
    } },
    { key: "station", header: "Station", render: p => {
      const st = p.station_id ? stationById.get(p.station_id) : null;
      return p.station_id
        ? <span style={{ fontSize: 12, color: th.text }}>{st?.name ?? p.station_id.slice(0, 10) + "…"}</span>
        : <span style={{ fontSize: 12, color: th.textMuted, fontStyle: "italic" }}>All stations</span>;
    } },
    { key: "period", header: "Period", render: p => (
      <span style={{ fontSize: 12, color: th.textSub }}>{fmtDate(p.period_start)} – {fmtDate(p.period_end)}</span>
    ) },
    { key: "amount_paise", header: "Amount", align: "right", sortValue: p => p.amount_paise, render: p => (
      <span style={{ fontFamily: th.mono, fontWeight: 700, color: th.success }}>{fmtRupee(p.amount_paise)}</span>
    ) },
    { key: "status", header: "Status", render: p => <StatusBadge status={p.status} th={th} /> },
    { key: "reference_note", header: "Reference", render: p => <span style={{ fontSize: 12, color: th.textSub }}>{p.reference_note ?? "—"}</span> },
    { key: "actions", header: "", render: p => (
      (p.status === "PENDING" || p.status === "SCHEDULED") ? (
        <Button th={th} size="sm" variant="primary" loading={acting === p.id} onClick={() => markPaid(p.id)}>Mark Paid</Button>
      ) : null
    ) },
  ];

  return (
    <div style={{ padding: "24px 28px", background: th.bg, minHeight: "100%", fontFamily: th.sans }}>
      <PageHeader th={th} title="Station Payouts"
        subtitle={`${total.toLocaleString()} total`}
        actions={<Button th={th} variant="primary" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>Create Payout</Button>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <Card th={th}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Clock size={13} color={th.warn} /><span style={{ fontSize: 11.5, color: th.textSub }}>Pending</span>
          </div>
          <div style={{ fontFamily: th.mono, fontSize: 20, fontWeight: 700, color: th.text }}>{fmtRupee(pendingTotal)}</div>
        </Card>
        <Card th={th}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <CheckCircle2 size={13} color={th.success} /><span style={{ fontSize: 11.5, color: th.textSub }}>Paid</span>
          </div>
          <div style={{ fontFamily: th.mono, fontSize: 20, fontWeight: 700, color: th.text }}>{fmtRupee(paidTotal)}</div>
        </Card>
        <Card th={th}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Wallet size={13} color={th.accent} /><span style={{ fontSize: 11.5, color: th.textSub }}>Total Payouts</span>
          </div>
          <div style={{ fontFamily: th.mono, fontSize: 20, fontWeight: 700, color: th.text }}>{items.length}</div>
        </Card>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(s => (
          <button key={s} onClick={() => setStatus(s)} style={{
            padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: status === s ? 600 : 400,
            cursor: "pointer", fontFamily: th.sans,
            background: status === s ? th.accentDim : th.card,
            border: `1px solid ${status === s ? th.accentBorder : th.border}`,
            color: status === s ? th.accent : th.textSub,
          }}>{s === "ALL" ? "All" : s}</button>
        ))}
      </div>

      <Card th={th} padding={16}>
        <DataTable
          th={th} columns={columns} rows={items} rowKey={p => p.id}
          pageSize={100}
          emptyState={loading ? (
            <div style={{ textAlign: "center", padding: "48px", color: th.textSub }}>Loading…</div>
          ) : (
            <div style={{ textAlign: "center", padding: "48px", color: th.textSub }}>No payouts found.</div>
          )}
        />
      </Card>

      {showCreate && (
        <CreatePayoutModal th={th} onClose={() => setShowCreate(false)} onCreated={load} />
      )}
    </div>
  );
}
