"use client";

// Tokens are stored in HttpOnly cookies set by /api/auth (BFF).
// JS never touches the refresh token. The access token rides in the cookie
// and is forwarded to the backend via the BFF on refresh; direct API calls
// read it from the cg_access cookie via document.cookie (non-HttpOnly access
// token only — refresh is always HttpOnly).

const BFF = "/api/auth";

export async function bffOtpRequest(phone: string): Promise<{ request_id: string; debug_code?: string }> {
  const r = await fetch(BFF, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "otp-request", phone }),
  });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.detail ?? "OTP request failed"), { status: r.status, body: data });
  return data;
}

export async function bffOtpVerify(request_id: string, code: string): Promise<void> {
  const r = await fetch(BFF, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "otp-verify", request_id, code }),
  });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.detail ?? "OTP verify failed"), { status: r.status, body: data });
}

// Deduplicated refresh — if multiple components call bffRefresh concurrently
// (e.g. route guard + NavBar on the same navigation), only one HTTP request fires.
let _refreshInFlight: Promise<boolean> | null = null;

export async function bffRefresh(): Promise<boolean> {
  if (!_refreshInFlight) {
    _refreshInFlight = fetch(BFF, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh" }),
    })
      .then(r => r.ok)
      .catch(() => false)
      .finally(() => { _refreshInFlight = null; });
  }
  return _refreshInFlight;
}

export async function bffLogout(): Promise<void> {
  await fetch(BFF, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "logout" }),
  }).catch(() => {});
}

// Read access token from the cg_access cookie (set without httpOnly so JS can
// read it for Authorization headers on direct fetch calls).
export function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )cg_access=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// isLoggedIn checks presence of the access cookie (client side only).
export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

// checkAuth: returns true if already logged in, or if a silent refresh succeeds.
// Deduplicates concurrent calls — safe to call from multiple route guards at once.
export async function checkAuth(): Promise<boolean> {
  if (isLoggedIn()) return true;
  return bffRefresh();
}
