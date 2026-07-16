"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, X, ScanLine, Search, Zap, CheckCircle2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { authFetch } from "@/lib/admin-ui";
import { getOwnerTheme, Card, CardHeader, PageHeader, StatusBadge, Button } from "@/components/owner";
import { useToast } from "@/components/owner/Toast";

const SCAN_REGION_ID = "qr-camera-scan-region";

interface Booking {
  id: string; status: string; slot_start: string; amount: number;
  qr_jti?: string;
  charger?: { label: string; connector_type: string; power_kw: number };
  station?: { name: string };
}

async function apiPost(path: string) {
  const res = await authFetch(path, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data;
}

function SessionManagerInner() {
  const params = useSearchParams();
  const { isLight } = useTheme();
  const th = getOwnerTheme(isLight);
  const toast = useToast();

  const [bookingId, setBookingId]   = useState(params.get("booking") ?? "");
  const [booking, setBooking]       = useState<Booking | null>(null);
  const [loading, setLoading]       = useState(false);
  const [acting, setActing]         = useState(false);
  const [message, setMessage]       = useState("");
  const [isError, setIsError]       = useState(false);
  const [qrToken, setQrToken]       = useState("");
  const [scanning, setScanning]     = useState(false);
  const [scanError, setScanError]   = useState("");
  const [ownerBookings, setOwnerBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  const inputStyle: React.CSSProperties = {
    flex: 1, background: th.raised, border: `1px solid ${th.border}`,
    borderRadius: 10, padding: "11px 14px", color: th.text, fontSize: 13,
    outline: "none", fontFamily: th.sans,
  };

  async function loadOwnerBookings() {
    setBookingsError("");
    setBookingsLoading(true);
    try {
      const res = await authFetch("/api/v1/owner/bookings");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOwnerBookings(await res.json());
    } catch (e: unknown) {
      setBookingsError(e instanceof Error ? e.message : "Failed to load sessions");
    } finally {
      setBookingsLoading(false);
    }
  }

  async function lookupBooking() {
    if (!bookingId.trim()) return;
    setLoading(true); setMessage(""); setIsError(false);
    try {
      const res = await authFetch(`/api/v1/bookings/${bookingId.trim()}`);
      if (!res.ok) { setIsError(true); setMessage("Booking not found."); setBooking(null); return; }
      setBooking(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOwnerBookings();
    if (bookingId) lookupBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyQR(tokenOverride?: string) {
    const token = (tokenOverride ?? qrToken).trim();
    if (!token) return;
    if (!token.includes(".")) {
      const preview = token.length > 60 ? `${token.slice(0, 60)}…` : token;
      setIsError(true);
      setMessage(`That doesn't look like a valid Charging Pass QR — scanned text was: "${preview}". A real pass token always contains a "." — this looks like a booking ID or something else was on screen instead.`);
      return;
    }
    setActing(true); setMessage(""); setIsError(false);
    try {
      const res = await authFetch("/api/v1/qr/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token: token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setIsError(true); setMessage(data.detail ?? "QR verification failed"); return; }
      setMessage("QR verified! Booking is now CHECKED_IN.");
      toast.show("success", "Customer checked in");
      setQrToken(token);
      setBookingId(data.booking_id ?? bookingId);
      await lookupBooking();
      await loadOwnerBookings();
    } finally {
      setActing(false);
    }
  }

  // Live camera QR scanning — works in any modern mobile/desktop browser,
  // no native app required. Loaded dynamically since html5-qrcode touches
  // `navigator.mediaDevices` at import time and must never run on the server.
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    // Html5Qrcode keeps decoding frames (at `fps`) until .stop() actually
    // resolves — which only happens in this effect's cleanup, itself gated
    // behind a React re-render. Without this guard, a static/easy-to-read
    // QR can fire the success callback several times before teardown
    // completes, each one racing to call verifyQR().
    let handled = false;
    setScanError("");

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(SCAN_REGION_ID);
      scannerRef.current = scanner;
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText: string) => {
          if (cancelled || handled) return;
          handled = true;
          setScanning(false);
          verifyQR(decodedText);
        },
        () => { /* per-frame scan miss — expected while aiming, ignore */ },
      ).catch((err: unknown) => {
        if (!cancelled) setScanError(err instanceof Error ? err.message : "Could not access camera. Check permissions.");
      });
    });

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  async function startSession() {
    if (!booking) return;
    setActing(true); setMessage(""); setIsError(false);
    try {
      await apiPost(`/api/v1/sessions/${booking.id}/start`);
      setMessage("Session started! Charging is now IN_PROGRESS.");
      toast.show("success", "Charging session started");
      await lookupBooking();
      await loadOwnerBookings();
    } catch (e: unknown) {
      setIsError(true); setMessage(e instanceof Error ? e.message : "Failed");
    } finally { setActing(false); }
  }

  async function completeSession() {
    if (!booking) return;
    setActing(true); setMessage(""); setIsError(false);
    try {
      await apiPost(`/api/v1/sessions/${booking.id}/complete`);
      setMessage("Session completed! Booking is now COMPLETED.");
      toast.show("success", "Session completed");
      await lookupBooking();
      await loadOwnerBookings();
    } catch (e: unknown) {
      setIsError(true); setMessage(e instanceof Error ? e.message : "Failed");
    } finally { setActing(false); }
  }

  const activeSessions = ownerBookings.filter(b => ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(b.status));
  const waitingCount = ownerBookings.filter(b => b.status === "CONFIRMED").length;
  const checkedInCount = ownerBookings.filter(b => b.status === "CHECKED_IN").length;
  const inProgressCount = ownerBookings.filter(b => b.status === "IN_PROGRESS").length;

  return (
    <div className="owner-pad owner-fade-up">
      <style suppressHydrationWarning>{`
        @keyframes scan-glow-pulse { 0%,100% { box-shadow: 0 4px 20px ${isLight?"rgba(0,184,94,.32)":"rgba(0,230,118,.22)"} } 50% { box-shadow: 0 4px 32px ${isLight?"rgba(0,184,94,.5)":"rgba(0,230,118,.4)"} } }
        @keyframes scan-frame-pulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        .scan-cta { transition: transform .18s cubic-bezier(.16,1,.3,1), box-shadow .18s; animation: scan-glow-pulse 2.4s ease-in-out infinite; }
        .scan-cta:hover { transform: translateY(-2px); }
        .scan-cta:active { transform: translateY(0); }
        .scan-frame-corner { position: absolute; width: 22px; height: 22px; border-color: ${th.accent}; animation: scan-frame-pulse 1.8s ease-in-out infinite; }
        .owner-sessions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
        @media (max-width: 900px) { .owner-sessions-grid { grid-template-columns: 1fr; } }
      `}</style>

      <PageHeader th={th} title="Session Manager" subtitle="Verify QR codes, start and complete charging sessions." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Waiting to check in", value: waitingCount, color: th.accent, bg: th.accentDim },
          { label: "Checked in", value: checkedInCount, color: th.info, bg: th.infoDim },
          { label: "In progress", value: inProgressCount, color: th.success, bg: th.successDim },
        ].map(card => (
          <Card key={card.label} th={th} padding="18px 20px">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: th.textSub, textTransform: "uppercase", marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: th.text }}>{card.value}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: card.bg, color: card.color, fontWeight: 800 }}>{card.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="owner-sessions-grid" style={{ marginBottom: 16 }}>
      {/* QR verify */}
      <Card th={th}>
        <CardHeader th={th} title="Verify Customer QR" icon={<ScanLine size={14} color={th.accent} />} />

        {scanning ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ position: "relative", width: "100%", maxWidth: 360, margin: "0 auto", borderRadius: 18, overflow: "hidden", background: "#000", boxShadow: "0 12px 40px rgba(0,0,0,.35)" }}>
              <div id={SCAN_REGION_ID} style={{ width: "100%" }} />
              {/* Decorative viewfinder corners */}
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <div className="scan-frame-corner" style={{ top: 16, left: 16, borderTop: "3px solid", borderLeft: "3px solid", borderRadius: "6px 0 0 0" }}/>
                <div className="scan-frame-corner" style={{ top: 16, right: 16, borderTop: "3px solid", borderRight: "3px solid", borderRadius: "0 6px 0 0" }}/>
                <div className="scan-frame-corner" style={{ bottom: 16, left: 16, borderBottom: "3px solid", borderLeft: "3px solid", borderRadius: "0 0 0 6px" }}/>
                <div className="scan-frame-corner" style={{ bottom: 16, right: 16, borderBottom: "3px solid", borderRight: "3px solid", borderRadius: "0 0 6px 0" }}/>
              </div>
            </div>
            {scanError && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: th.dangerDim, border: `1px solid ${th.danger}30`, color: th.danger, fontSize: 12 }}>{scanError}</div>
            )}
            <Button th={th} variant="secondary" icon={<X size={14} />} fullWidth onClick={() => setScanning(false)} style={{ marginTop: 12 }}>Cancel scan</Button>
          </div>
        ) : (
          <button onClick={() => setScanning(true)} className="scan-cta" style={{
            width: "100%", marginBottom: 14, padding: "15px", borderRadius: 14,
            background: `linear-gradient(135deg, ${th.accent}, ${th.accentDark})`, color: "#04140A",
            fontSize: 14, fontWeight: 800, letterSpacing: "-.01em",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            fontFamily: th.sans,
          }}><Camera size={17} strokeWidth={2.3}/> Scan with Camera</button>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={qrToken} onChange={e => setQrToken(e.target.value)}
            placeholder="…or paste QR token"
            style={inputStyle}
          />
          <Button th={th} variant="primary" onClick={() => verifyQR()} disabled={!qrToken} loading={acting}>Verify QR</Button>
        </div>
      </Card>

      {/* Booking lookup */}
      <Card th={th}>
        <CardHeader th={th} title="Manage Session by Booking ID" icon={<Search size={14} color={th.accent} />} />
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={bookingId} onChange={e => setBookingId(e.target.value)}
            placeholder="Booking UUID…"
            style={{ ...inputStyle, fontFamily: th.mono }}
          />
          <Button th={th} variant="secondary" onClick={lookupBooking} loading={loading}>Look up</Button>
        </div>
      </Card>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: "12px 16px", borderRadius: 12, marginBottom: 16, fontSize: 13,
          background: isError ? th.dangerDim : th.successDim,
          border: `1px solid ${isError ? th.danger + "30" : th.accentBorder}`,
          color: isError ? th.danger : th.success,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {!isError && <CheckCircle2 size={15} style={{ flexShrink: 0 }} />}
          {message}
        </div>
      )}

      {activeSessions.length > 0 && (
        <Card th={th} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottom: `1px solid ${th.border}`, paddingBottom: 14, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: th.text }}>Live session queue</div>
              <div style={{ fontSize: 12, color: th.textSub }}>Current bookings waiting for action.</div>
            </div>
            <div style={{ fontSize: 12, color: th.textSub }}>{activeSessions.length} active</div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {bookingsLoading ? (
              <div style={{ padding: "28px 0", textAlign: "center", color: th.textSub }}>Loading sessions…</div>
            ) : bookingsError ? (
              <div style={{ padding: "18px 16px", borderRadius: 12, background: th.dangerDim, border: `1px solid ${th.danger}30`, color: th.danger }}>{bookingsError}</div>
            ) : (
              activeSessions.map(b => (
                <div key={b.id} style={{ display: "grid", gap: 10, padding: "16px 18px", borderRadius: 16, background: th.raised, border: `1px solid ${th.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: th.text, marginBottom: 4 }}>{b.charger?.label ?? "Charger"} · {b.charger?.connector_type ?? ""} {b.charger?.power_kw ?? ""}kW</div>
                      <div style={{ fontSize: 12, color: th.textSub }}>{b.slot_start ? new Date(b.slot_start).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                    </div>
                    <StatusBadge status={b.status} th={th} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: th.textSub, fontFamily: th.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>ID: {b.id}</div>
                    <Button th={th} variant="secondary" size="sm" onClick={() => { setBookingId(b.id); setBooking(b); }}>
                      Load booking
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Booking card */}
      {booking && (
        <Card th={th} padding={0}>
          <div style={{ padding: "18px 20px", borderBottom: `1px solid ${th.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: th.accentDim, border: `1px solid ${th.accentBorder}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Zap size={18} color={th.accent} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: th.text, marginBottom: 2 }}>
                {booking.charger?.label ?? "Charger"} · {booking.charger?.connector_type ?? ""} {booking.charger?.power_kw ?? ""}kW
              </div>
              <div style={{ fontSize: 12, color: th.textSub }}>
                {booking.slot_start ? new Date(booking.slot_start).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                {" · ₹"}{(booking.amount / 100).toLocaleString("en-IN")}
              </div>
            </div>
            <StatusBadge status={booking.status} th={th} />
          </div>

          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11, color: th.textSub, fontFamily: th.mono }}>ID: {booking.id}</div>

            {booking.status === "CHECKED_IN" && (
              <Button th={th} variant="primary" icon={<Zap size={15} />} loading={acting} fullWidth onClick={startSession} style={{ padding: "13px", fontSize: 14 }}>
                {acting ? "Starting…" : "Start Charging Session"}
              </Button>
            )}

            {booking.status === "IN_PROGRESS" && (
              <Button th={th} variant="primary" icon={<CheckCircle2 size={15} />} loading={acting} fullWidth onClick={completeSession} style={{ padding: "13px", fontSize: 14 }}>
                {acting ? "Completing…" : "Complete Session"}
              </Button>
            )}

            {booking.status === "CONFIRMED" && (
              <div style={{ padding: "12px 14px", borderRadius: 12, background: th.raised, fontSize: 13, color: th.textSub }}>
                Waiting for customer to scan QR. Verify their QR code above to check them in.
              </div>
            )}

            {booking.status === "COMPLETED" && (
              <div style={{ padding: "12px 14px", borderRadius: 12, background: th.successDim, border: `1px solid ${th.accentBorder}`, fontSize: 13, color: th.success }}>
                Session completed. Payment of ₹{(booking.amount / 100).toLocaleString("en-IN")} received.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function SessionManagerPage() {
  return (
    <Suspense>
      <SessionManagerInner />
    </Suspense>
  );
}
