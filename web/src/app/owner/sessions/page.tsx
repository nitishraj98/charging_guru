"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { authFetch } from "@/lib/admin-ui";

const SCAN_REGION_ID = "qr-camera-scan-region";

interface Booking {
  id: string; status: string; slot_start: string; amount: number;
  qr_jti?: string;
  charger?: { label: string; connector_type: string; power_kw: number };
}

async function apiPost(path: string) {
  const res = await authFetch(path, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data;
}

function SessionManagerInner() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();
  const params = useSearchParams();
  const { isLight } = useTheme();

  const [bookingId, setBookingId]   = useState(params.get("booking") ?? "");
  const [booking, setBooking]       = useState<Booking | null>(null);
  const [loading, setLoading]       = useState(false);
  const [acting, setActing]         = useState(false);
  const [message, setMessage]       = useState("");
  const [isError, setIsError]       = useState(false);
  const [qrToken, setQrToken]       = useState("");
  const [scanning, setScanning]     = useState(false);
  const [scanError, setScanError]   = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const bg          = isLight ? "#F3F7FB" : "#0A0D0E";
  const cardBg      = isLight ? "#FFFFFF" : "#101415";
  const cardBorder  = isLight ? "#CBD5E1" : "#222829";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#6B7479";
  const accent      = isLight ? "#00D26A" : "#00E676";
  const accentDark  = isLight ? "#00A855" : "#00C258";
  const raisedBg    = isLight ? "#F1F5F9" : "#181D1F";
  const inputBg     = isLight ? "#F3F7FB" : "#0A0D0E";
  const inputBorder = isLight ? "#94A3B8" : "#2E3638";

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
      setQrToken(token);
      setBookingId(data.booking_id ?? bookingId);
      await lookupBooking();
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
      await lookupBooking();
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
      await lookupBooking();
    } catch (e: unknown) {
      setIsError(true); setMessage(e instanceof Error ? e.message : "Failed");
    } finally { setActing(false); }
  }

  const STATUS_META: Record<string, { icon: string; color: string; label: string }> = {
    PENDING_PAYMENT: { icon: "⏳", color: "#FFC043", label: "Pending Payment" },
    CONFIRMED:       { icon: "✓",  color: "#4DFFA6", label: "Confirmed" },
    CHECKED_IN:      { icon: "📍", color: "#22D3EE", label: "Checked In" },
    IN_PROGRESS:     { icon: "⚡", color: "#22D3EE", label: "In Progress" },
    COMPLETED:       { icon: "✅", color: "#6B7479", label: "Completed" },
    CANCELLED:       { icon: "✕",  color: "#FF5A5F", label: "Cancelled" },
  };

  return (
    <div className="owner-pad" style={{ padding: "28px 32px", maxWidth: 640 }}>
        <style suppressHydrationWarning>{`
          @keyframes scan-glow-pulse { 0%,100% { box-shadow: 0 4px 20px ${isLight?"rgba(0,200,98,.35)":"rgba(0,230,118,.22)"} } 50% { box-shadow: 0 4px 32px ${isLight?"rgba(0,200,98,.55)":"rgba(0,230,118,.4)"} } }
          @keyframes scan-frame-pulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
          .scan-cta { transition: transform .18s cubic-bezier(.16,1,.3,1), box-shadow .18s; animation: scan-glow-pulse 2.4s ease-in-out infinite; }
          .scan-cta:hover { transform: translateY(-2px); }
          .scan-cta:active { transform: translateY(0); }
          .scan-frame-corner { position: absolute; width: 22px; height: 22px; border-color: ${accent}; animation: scan-frame-pulse 1.8s ease-in-out infinite; }
        `}</style>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>Session Manager</h1>
        <p style={{ fontSize: 13, color: textSub, marginBottom: 24 }}>Verify QR codes, start and complete charging sessions.</p>

        {/* QR verify */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "22px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: textPrimary, marginBottom: 14 }}>Verify Customer QR</h2>

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
                <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 12 }}>{scanError}</div>
              )}
              <button onClick={() => setScanning(false)} style={{
                marginTop: 12, width: "100%", padding: "11px", borderRadius: 12, background: raisedBg,
                border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}><X size={14}/> Cancel scan</button>
            </div>
          ) : (
            <button onClick={() => setScanning(true)} className="scan-cta" style={{
              width: "100%", marginBottom: 14, padding: "15px", borderRadius: 14,
              background: `linear-gradient(135deg, ${accent}, ${accentDark})`, color: "#050708",
              fontSize: 14, fontWeight: 800, letterSpacing: "-.01em",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            }}><Camera size={17} strokeWidth={2.3}/> Scan with Camera</button>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={qrToken} onChange={e => setQrToken(e.target.value)}
              placeholder="…or paste QR token"
              style={{
                flex: 1, background: inputBg, border: `1px solid ${inputBorder}`,
                borderRadius: 10, padding: "11px 14px", color: textPrimary, fontSize: 13,
                outline: "none", fontFamily: "inherit",
              }}
            />
            <button onClick={() => verifyQR()} disabled={acting || !qrToken} style={{
              padding: "11px 18px", borderRadius: 10, background: accent, color: "#050708",
              fontSize: 13, fontWeight: 700, border: "none", cursor: acting ? "not-allowed" : "pointer", flexShrink: 0,
            }}>Verify QR</button>
          </div>
        </div>

        {/* Booking lookup */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "22px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: textPrimary, marginBottom: 14 }}>Manage Session by Booking ID</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={bookingId} onChange={e => setBookingId(e.target.value)}
              placeholder="Booking UUID…"
              style={{
                flex: 1, background: inputBg, border: `1px solid ${inputBorder}`,
                borderRadius: 10, padding: "11px 14px", color: textPrimary, fontSize: 13,
                outline: "none", fontFamily: "'JetBrains Mono',monospace",
              }}
            />
            <button onClick={lookupBooking} disabled={loading} style={{
              padding: "11px 18px", borderRadius: 10, background: raisedBg,
              border: `1px solid ${cardBorder}`, color: textPrimary,
              fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", flexShrink: 0, fontFamily: "inherit",
            }}>Look up</button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, marginBottom: 16, fontSize: 13,
            background: isError ? "rgba(255,90,95,.08)" : "rgba(0,230,118,.08)",
            border: `1px solid ${isError ? "rgba(255,90,95,.25)" : "rgba(0,230,118,.25)"}`,
            color: isError ? "#FF5A5F" : (isLight ? "#059669" : "#4DFFA6"),
          }}>{message}</div>
        )}

        {/* Booking card */}
        {booking && (() => {
          const meta = STATUS_META[booking.status] ?? { icon: "•", color: textSub, label: booking.status };
          return (
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, overflow: "hidden", boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
              <div style={{ padding: "18px 20px", borderBottom: `1px solid ${cardBorder}`, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>{meta.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: textPrimary, marginBottom: 2 }}>
                    {booking.charger?.label ?? "Charger"} · {booking.charger?.connector_type ?? ""} {booking.charger?.power_kw ?? ""}kW
                  </div>
                  <div style={{ fontSize: 12, color: textSub }}>
                    {booking.slot_start ? new Date(booking.slot_start).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                    {" · ₹"}{(booking.amount / 100).toLocaleString("en-IN")}
                  </div>
                </div>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: meta.color, background: `${meta.color}18` }}>{meta.label}</span>
              </div>

              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 11, color: textSub, fontFamily: "'JetBrains Mono',monospace" }}>ID: {booking.id}</div>

                {booking.status === "CHECKED_IN" && (
                  <button onClick={startSession} disabled={acting} style={{
                    padding: "13px", borderRadius: 12, background: "#22D3EE", color: "#050708",
                    fontSize: 14, fontWeight: 700, border: "none", cursor: acting ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                    {acting ? <><span className="spinner" />Starting…</> : "⚡ Start Charging Session"}
                  </button>
                )}

                {booking.status === "IN_PROGRESS" && (
                  <button onClick={completeSession} disabled={acting} style={{
                    padding: "13px", borderRadius: 12, background: accent, color: "#050708",
                    fontSize: 14, fontWeight: 700, border: "none", cursor: acting ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                    {acting ? <><span className="spinner" />Completing…</> : "✅ Complete Session"}
                  </button>
                )}

                {booking.status === "CONFIRMED" && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: raisedBg, fontSize: 13, color: textSub }}>
                    Waiting for customer to scan QR. Verify their QR code above to check them in.
                  </div>
                )}

                {booking.status === "COMPLETED" && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(0,230,118,.06)", border: "1px solid rgba(0,230,118,.2)", fontSize: 13, color: isLight ? "#059669" : "#4DFFA6" }}>
                    Session completed. Payment of ₹{(booking.amount / 100).toLocaleString("en-IN")} received.
                  </div>
                )}
              </div>
            </div>
          );
        })()}
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
