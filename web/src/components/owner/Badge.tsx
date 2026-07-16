"use client";
import { OwnerTheme, statusColor } from "./theme";

export function StatusBadge({ status, th, dot = true }: { status: string; th: OwnerTheme; dot?: boolean }) {
  const m = statusColor(status, th.isLight);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
      letterSpacing: ".01em", color: m.fg, background: m.bg,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.fg, flexShrink: 0 }} />}
      {m.label}
    </span>
  );
}

export function Pill({ th, children, tone = "neutral" }: {
  th: OwnerTheme; children: React.ReactNode; tone?: "neutral" | "accent" | "info" | "warn" | "danger";
}) {
  const map = {
    neutral: { fg: th.textSub, bg: th.raised },
    accent: { fg: th.accent, bg: th.accentDim },
    info: { fg: th.info, bg: th.infoDim },
    warn: { fg: th.warn, bg: th.warnDim },
    danger: { fg: th.danger, bg: th.dangerDim },
  }[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      color: map.fg, background: map.bg,
    }}>{children}</span>
  );
}
