import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const BASE_OPTS = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// Access token: NOT httpOnly so JS can read it for Authorization headers.
// Refresh token: httpOnly so JS can never touch it.
const ACCESS_OPTS  = { ...BASE_OPTS, httpOnly: false };
const REFRESH_OPTS = { ...BASE_OPTS, httpOnly: true  };

const ACCESS_TTL  = 60 * 15;           // 15 min
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 days

export async function POST(req: NextRequest) {
  const { action, ...body } = await req.json();

  if (action === "otp-request") {
    const r = await fetch(`${BACKEND}/api/v1/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: body.phone }),
    });
    const data = await r.json();
    if (!r.ok) return NextResponse.json(data, { status: r.status });
    return NextResponse.json(data);
  }

  if (action === "otp-verify") {
    const r = await fetch(`${BACKEND}/api/v1/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: body.request_id, code: body.code }),
    });
    const data = await r.json();
    if (!r.ok) return NextResponse.json(data, { status: r.status });

    const res = NextResponse.json({ ok: true, debug_code: data.debug_code });
    res.cookies.set("cg_access",  data.access_token,  { ...ACCESS_OPTS,  maxAge: ACCESS_TTL });
    res.cookies.set("cg_refresh", data.refresh_token, { ...REFRESH_OPTS, maxAge: REFRESH_TTL });
    return res;
  }

  if (action === "refresh") {
    const refresh = req.cookies.get("cg_refresh")?.value;
    if (!refresh) return NextResponse.json({ error: "no refresh token" }, { status: 401 });

    const r = await fetch(`${BACKEND}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    const data = await r.json();
    if (!r.ok) {
      const res = NextResponse.json(data, { status: r.status });
      res.cookies.delete("cg_access");
      res.cookies.delete("cg_refresh");
      return res;
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("cg_access",  data.access_token,  { ...ACCESS_OPTS,  maxAge: ACCESS_TTL });
    res.cookies.set("cg_refresh", data.refresh_token, { ...REFRESH_OPTS, maxAge: REFRESH_TTL });
    return res;
  }

  if (action === "logout") {
    const refresh = req.cookies.get("cg_refresh")?.value;
    if (refresh) {
      await fetch(`${BACKEND}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      }).catch(() => {});
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.delete("cg_access");
    res.cookies.delete("cg_refresh");
    return res;
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
