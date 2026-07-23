// Shared design tokens for the Owner Portal — one source of truth so every
// page (dashboard, stations, bookings, sessions) reads consistently instead
// of each page inventing its own near-identical color palette.

export interface OwnerTheme {
  isLight: boolean;
  // Surfaces
  bg: string; bgGradient: string;
  card: string; cardHover: string; raised: string; raised2: string;
  // Borders
  border: string; borderHi: string;
  // Text
  text: string; textSub: string; textMuted: string;
  // Brand
  accent: string; accentDark: string; accentDim: string; accentBorder: string;
  // Semantic
  info: string; infoDim: string;
  warn: string; warnDim: string;
  danger: string; dangerDim: string;
  success: string; successDim: string;
  // Elevation
  shadowSm: string; shadowMd: string; shadowLg: string;
  glow: string;
  // Hero band (dashboard) — theme-appropriate instead of one dark gradient for both
  heroGradient: string; heroText: string; heroTextSub: string; heroChipBg: string; heroChipBorder: string; heroChipText: string;
  // Type
  sans: string; mono: string;
}

/** Icon-badge tint that stays visible on both a near-black card and a white one —
 * a flat low alpha (e.g. 12%) all but disappears against white, so light mode
 * needs a noticeably stronger tint than dark mode to read as the same "chip". */
export function chipTint(hex: string, isLight: boolean): { bg: string; border: string } {
  return isLight
    ? { bg: `${hex}22`, border: `${hex}45` }
    : { bg: `${hex}18`, border: `${hex}30` };
}

const SANS = "'Space Grotesk',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

export function getOwnerTheme(isLight: boolean): OwnerTheme {
  return isLight ? {
    isLight,
    bg: "#F5F7FA",
    bgGradient: "linear-gradient(135deg,#EDF3F7 0%,#F8FBFC 42%,#EEF9F2 100%)",
    card: "#FFFFFF", cardHover: "#FCFDFE", raised: "#F3F6F9", raised2: "#EEF2F7",
    border: "rgba(15,23,42,0.08)", borderHi: "rgba(15,23,42,0.16)",
    text: "#0F172A", textSub: "#5B6B82", textMuted: "#8592A6",
    accent: "#00B85E", accentDark: "#00964C", accentDim: "rgba(0,184,94,.14)", accentBorder: "rgba(0,184,94,.32)",
    info: "#0EA5E9", infoDim: "rgba(14,165,233,.13)",
    warn: "#D97706", warnDim: "rgba(217,119,6,.13)",
    danger: "#DC2626", dangerDim: "rgba(220,38,38,.12)",
    success: "#00964C", successDim: "rgba(0,184,94,.14)",
    shadowSm: "0 1px 2px rgba(15,23,42,.05)",
    shadowMd: "0 4px 16px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.05)",
    shadowLg: "0 12px 40px rgba(15,23,42,.10), 0 2px 8px rgba(15,23,42,.06)",
    glow: "0 0 0 3px rgba(0,184,94,.12)",
    heroGradient: "linear-gradient(120deg,#EAFBF1 0%,#F5FEF9 46%,#E6F9EF 100%)",
    heroText: "#0B1F14", heroTextSub: "rgba(11,31,20,.62)",
    heroChipBg: "rgba(0,150,76,.10)", heroChipBorder: "rgba(0,150,76,.22)", heroChipText: "#00964C",
    sans: SANS, mono: MONO,
  } : {
    isLight,
    // Soft charcoal rather than near-pure-black, with off-white (not #FFF)
    // text — high contrast between true black and white reads as harsh.
    bg: "#12151A",
    bgGradient: "linear-gradient(135deg,#12151A 0%,#161C1E 48%,#121B16 100%)",
    card: "#1B2024", cardHover: "#1E2428", raised: "#242B2F", raised2: "#2A3235",
    border: "#2C343A", borderHi: "#3A444B",
    text: "#E6ECEA", textSub: "#9AA5AC", textMuted: "#707B82",
    accent: "#00E676", accentDark: "#00C862", accentDim: "rgba(0,230,118,.10)", accentBorder: "rgba(0,230,118,.26)",
    info: "#22D3EE", infoDim: "rgba(34,211,238,.10)",
    warn: "#FFC043", warnDim: "rgba(255,192,67,.10)",
    danger: "#FF5A5F", dangerDim: "rgba(255,90,95,.10)",
    success: "#00E676", successDim: "rgba(0,230,118,.10)",
    shadowSm: "0 1px 2px rgba(0,0,0,.25)",
    shadowMd: "0 4px 20px rgba(0,0,0,.32), 0 0 0 1px rgba(255,255,255,.03)",
    shadowLg: "0 20px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.04)",
    glow: "0 0 0 3px rgba(0,230,118,.16)",
    heroGradient: "linear-gradient(120deg,#0A1F16 0%,#0E2A1C 46%,#0A1D14 100%)",
    heroText: "#F3FBF6", heroTextSub: "rgba(230,245,238,.62)",
    heroChipBg: "rgba(0,230,118,.12)", heroChipBorder: "rgba(0,230,118,.25)", heroChipText: "#6FFFC0",
    sans: SANS, mono: MONO,
  };
}

export const STATUS_COLORS: Record<string, { fg: string; bg: string; label: string }> = {
  // Bookings
  PENDING_PAYMENT: { fg: "#D97706", bg: "rgba(217,119,6,.12)",  label: "Pending Payment" },
  CONFIRMED:       { fg: "#00B85E", bg: "rgba(0,184,94,.12)",   label: "Confirmed" },
  CHECKED_IN:      { fg: "#0EA5E9", bg: "rgba(14,165,233,.12)", label: "Checked In" },
  IN_PROGRESS:     { fg: "#0EA5E9", bg: "rgba(14,165,233,.12)", label: "In Progress" },
  COMPLETED:       { fg: "#6B7A8D", bg: "rgba(107,122,141,.14)",label: "Completed" },
  CANCELLED:       { fg: "#DC2626", bg: "rgba(220,38,38,.10)",  label: "Cancelled" },
  EXPIRED:         { fg: "#8592A6", bg: "rgba(133,146,166,.12)",label: "Expired" },
  NO_SHOW:         { fg: "#DC2626", bg: "rgba(220,38,38,.10)",  label: "No Show" },
  // Stations
  ACTIVE:           { fg: "#00B85E", bg: "rgba(0,184,94,.12)",  label: "Active" },
  PENDING_APPROVAL: { fg: "#D97706", bg: "rgba(217,119,6,.12)", label: "Pending Review" },
  SUSPENDED:        { fg: "#EA580C", bg: "rgba(234,88,12,.12)", label: "Suspended" },
  REJECTED:         { fg: "#DC2626", bg: "rgba(220,38,38,.12)", label: "Rejected" },
  // Chargers
  AVAILABLE:   { fg: "#00B85E", bg: "rgba(0,184,94,.12)",   label: "Available" },
  BOOKED:      { fg: "#D97706", bg: "rgba(217,119,6,.12)",  label: "Booked" },
  OCCUPIED:    { fg: "#0EA5E9", bg: "rgba(14,165,233,.12)", label: "In Session" },
  MAINTENANCE: { fg: "#EA580C", bg: "rgba(234,88,12,.12)",  label: "Maintenance" },
  OFFLINE:     { fg: "#6B7A8D", bg: "rgba(107,122,141,.14)",label: "Offline" },
};

export function statusColor(status: string, isLight: boolean): { fg: string; bg: string; label: string } {
  const m = STATUS_COLORS[status] ?? { fg: "#6B7A8D", bg: "rgba(107,122,141,.12)", label: status };
  // Dark mode: same hues read fine at these low alphas; only bump text brightness a touch.
  if (!isLight) return m;
  return m;
}
