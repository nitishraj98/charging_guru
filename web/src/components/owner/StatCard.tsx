"use client";
import { OwnerTheme, chipTint } from "./theme";
import { useCountUp } from "./useCountUp";

export function StatCard({
  th, label, value, sub, icon, accentColor, trend, numericValue, format,
}: {
  th: OwnerTheme; label: string; value: React.ReactNode; sub?: React.ReactNode;
  icon: React.ReactNode; accentColor: string;
  trend?: { dir: "up" | "down" | "flat"; label: string };
  /** When set, the card counts up from 0 on mount/change instead of rendering `value` statically. */
  numericValue?: number;
  format?: (n: number) => string;
}) {
  const trendColor = trend?.dir === "up" ? th.success : trend?.dir === "down" ? th.danger : th.textMuted;
  const trendIcon = trend?.dir === "up" ? "↑" : trend?.dir === "down" ? "↓" : "•";
  const counted = useCountUp(numericValue ?? 0);
  const display = numericValue !== undefined ? (format ? format(counted) : Math.round(counted).toLocaleString("en-IN")) : value;
  const chip = chipTint(accentColor, th.isLight);

  return (
    <div className="owner-card owner-card-hover owner-stat-card" style={{
      background: th.isLight
        ? `linear-gradient(160deg, ${th.card} 0%, ${accentColor}0C 100%)`
        : `linear-gradient(160deg, ${th.card} 0%, ${accentColor}0A 100%)`,
      border: `1px solid ${th.border}`, borderRadius: 16,
      padding: "20px 22px", boxShadow: th.shadowSm, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${accentColor}90, transparent)`,
      }} />
      <div style={{
        position: "absolute", top: -34, right: -34, width: 120, height: 120, borderRadius: "50%",
        background: `radial-gradient(circle, ${accentColor}${th.isLight ? "1E" : "16"} 0%, transparent 72%)`, pointerEvents: "none",
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: th.textMuted }}>{label}</span>
        <div style={{
          width: 32, height: 32, borderRadius: 10, background: chip.bg,
          border: `1px solid ${chip.border}`, display: "grid", placeItems: "center", flexShrink: 0,
          boxShadow: `0 0 14px ${accentColor}${th.isLight ? "18" : "22"}`,
        }}>{icon}</div>
      </div>
      <div style={{ fontFamily: th.mono, fontSize: 28, fontWeight: 700, color: th.text, lineHeight: 1, marginBottom: 8, letterSpacing: "-0.02em" }}>
        {display}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 16 }}>
        {trend && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trendColor, display: "flex", alignItems: "center", gap: 2 }}>
            {trendIcon} {trend.label}
          </span>
        )}
        {sub && <span style={{ fontSize: 12, color: th.textSub }}>{sub}</span>}
      </div>
    </div>
  );
}
