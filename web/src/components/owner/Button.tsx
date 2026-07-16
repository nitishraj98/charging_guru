"use client";
import { OwnerTheme } from "./theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export function Button({
  th, children, onClick, type = "button", variant = "secondary", size = "md",
  disabled, loading, icon, style, fullWidth,
}: {
  th: OwnerTheme; children?: React.ReactNode; onClick?: () => void;
  type?: "button" | "submit"; variant?: Variant; size?: Size;
  disabled?: boolean; loading?: boolean; icon?: React.ReactNode;
  style?: React.CSSProperties; fullWidth?: boolean;
}) {
  const isDisabled = disabled || loading;
  const pad = size === "sm" ? "8px 14px" : "11px 18px";
  const fontSize = size === "sm" ? 12.5 : 13.5;

  const variants: Record<Variant, React.CSSProperties> = {
    primary: {
      background: isDisabled ? th.raised : `linear-gradient(135deg,${th.accent},${th.accentDark})`,
      color: isDisabled ? th.textMuted : "#04140A",
      border: "none",
      boxShadow: isDisabled ? "none" : th.isLight ? "0 2px 10px rgba(0,184,94,.28)" : "0 0 0 1px rgba(0,230,118,.15), 0 4px 16px rgba(0,230,118,.16)",
    },
    secondary: {
      background: th.card, color: th.text, border: `1px solid ${th.border}`,
      boxShadow: th.shadowSm,
    },
    ghost: {
      background: "transparent", color: th.textSub, border: "1px solid transparent",
    },
    danger: {
      background: isDisabled ? th.raised : th.dangerDim, color: isDisabled ? th.textMuted : th.danger,
      border: `1px solid ${isDisabled ? th.border : th.danger + "40"}`,
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`owner-btn${variant === "primary" && !isDisabled ? " owner-btn-primary" : ""}`}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
        padding: pad, borderRadius: 11, fontSize, fontWeight: 650,
        fontFamily: th.sans, cursor: isDisabled ? "not-allowed" : "pointer",
        width: fullWidth ? "100%" : undefined,
        transition: "transform .15s cubic-bezier(.16,1,.3,1), box-shadow .15s, opacity .15s",
        opacity: isDisabled && !loading ? 0.55 : 1,
        ...variants[variant], ...style,
      }}
    >
      {loading ? <span className="owner-spinner" /> : icon}
      {children}
    </button>
  );
}
