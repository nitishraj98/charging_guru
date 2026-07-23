import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose/jwt/verify";

const JWT_SECRET = process.env.CG_JWT_SECRET ?? "";

interface AccessClaims {
  roles: string[];
}

async function verifyAccessToken(token: string | undefined): Promise<AccessClaims | null> {
  if (!token || !JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    if (payload.typ !== "access") return null;
    return { roles: Array.isArray(payload.roles) ? (payload.roles as string[]) : [] };
  } catch {
    // Missing signature, wrong secret, or expired `exp` — all treated the
    // same: this token can't be trusted at the edge.
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isOwnerPath = pathname.startsWith("/owner");
  const isAdminPath = pathname.startsWith("/admin");

  const accessToken = req.cookies.get("cg_access")?.value;
  const hasRefresh = Boolean(req.cookies.get("cg_refresh")?.value);
  const claims = await verifyAccessToken(accessToken);

  if (!claims) {
    // No usable access token. If a refresh cookie exists, the client's own
    // checkAuth()/bffRefresh() flow will silently mint a new access token —
    // don't bounce a legitimately-logged-in user just because their
    // short-lived (15 min) access token expired. Only redirect when there's
    // truly no session to fall back on.
    if (hasRefresh) return NextResponse.next();
    if (isOwnerPath || isAdminPath) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  if (isOwnerPath && !claims.roles.includes("ROLE_STATION_OWNER")) {
    return NextResponse.redirect(new URL("/become-owner", req.url));
  }

  // /admin: a valid-but-non-admin session is intentionally left to
  // admin/layout.tsx's own inline "Ops Center" login screen — it never
  // leaks dashboard data, so there's nothing to gate here beyond the
  // fully-unauthenticated case handled above.

  return NextResponse.next();
}

export const config = {
  matcher: ["/owner/:path*", "/admin/:path*"],
};
