// Shared design tokens and helpers for the admin dashboard.
import { bffRefresh } from "@/lib/auth";

// Dark theme tokens — soft charcoal, not near-pure-black, with off-white text
// (not #FFF) to keep contrast comfortable rather than glaring.
export const DARK = {
  bg:       "#12151B",
  panel:    "#171B22",
  card:     "#1B2029",
  raised:   "#232935",
  border:   "rgba(255,255,255,0.08)",
  borderHi: "rgba(255,255,255,0.16)",
  text:     "#E7EAEE",
  sub:      "#8892A3",
  muted:    "#242C3D",
  inputBg:  "#1A1F28",
} as const;

// Light theme tokens
export const LIGHT = {
  bg:       "#F3F7FB",
  panel:    "#FFFFFF",
  card:     "#FFFFFF",
  raised:   "#F0F2F7",
  border:   "rgba(15,23,42,0.09)",
  borderHi: "rgba(15,23,42,0.18)",
  text:     "#0F172A",
  sub:      "#64748B",
  muted:    "#CBD5E1",
  inputBg:  "#F3F7FB",
} as const;

// Brand / semantic colours — same in both themes
export const C = {
  green:    "#00C060",
  greenDim: "rgba(0,192,96,0.12)",
  blue:     "#3B82F6",
  amber:    "#F59E0B",
  purple:   "#8B5CF6",
  red:      "#EF4444",
  teal:     "#14B8A6",
  orange:   "#F97316",
  mono:     "'JetBrains Mono',ui-monospace,monospace",
  sans:     "system-ui,-apple-system,sans-serif",
} as const;

// Legacy T export (dark) — kept so other pages don't break
export const T = {
  ...DARK,
  green:    C.green,
  greenDim: C.greenDim,
  blue:     C.blue,
  amber:    C.amber,
  purple:   C.purple,
  red:      C.red,
  teal:     C.teal,
  mono:     C.mono,
  sans:     C.sans,
} as const;

export type ThemeTokens = {
  bg: string; panel: string; card: string; raised: string;
  border: string; borderHi: string; text: string; sub: string;
  muted: string; inputBg: string;
} & typeof C;

export function getTheme(isLight: boolean): ThemeTokens {
  return { ...(isLight ? LIGHT : DARK), ...C };
}

export const STATUS_BOOKING: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "Pending Pmt",  color: C.amber  },
  CONFIRMED:       { label: "Confirmed",    color: C.green  },
  CHECKED_IN:      { label: "Checked In",   color: C.teal   },
  IN_PROGRESS:     { label: "In Progress",  color: C.blue   },
  COMPLETED:       { label: "Completed",    color: C.green  },
  CANCELLED:       { label: "Cancelled",    color: C.red    },
  EXPIRED:         { label: "Expired",      color: C.amber  },
};

export const STATUS_STATION: Record<string, { label: string; color: string }> = {
  ACTIVE:           { label: "Active",    color: C.green  },
  PENDING_APPROVAL: { label: "Pending",   color: C.amber  },
  REJECTED:         { label: "Rejected",  color: C.red    },
  INACTIVE:         { label: "Inactive",  color: C.teal   },
};

export const ROLE_COLOR: Record<string, string> = {
  ROLE_ADMIN:         C.purple,
  ROLE_STATION_OWNER: C.amber,
};

export function fmtRupee(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function getToken(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )cg_access=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Authenticated fetch for admin/owner pages — on a 401 (expired access
// token), attempts a silent refresh via the BFF and retries once with the
// rotated token before giving up. Without this, every admin/owner page's
// direct fetch() calls just fail silently once the short-lived access token
// expires mid-session, since only lib/api.ts's request() had this logic.
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") || path.startsWith("/api/") ? path : `${BASE}${path}`;
  const withAuth = (token: string): RequestInit => ({
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` },
  });

  let res = await fetch(url, withAuth(getToken()));
  if (res.status === 401) {
    const refreshed = await bffRefresh();
    if (refreshed) {
      res = await fetch(url, withAuth(getToken()));
    }
  }
  return res;
}
