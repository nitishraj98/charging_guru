"use client";
import { OwnerTheme } from "./theme";

export function Card({ th, children, style, hover, padding = "20px 22px" }: {
  th: OwnerTheme; children: React.ReactNode; style?: React.CSSProperties;
  hover?: boolean; padding?: string | number;
}) {
  return (
    <div
      className={hover ? "owner-card owner-card-hover" : "owner-card"}
      style={{
        background: th.card, border: `1px solid ${th.border}`, borderRadius: 16,
        padding, boxShadow: th.shadowSm, ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ th, title, subtitle, icon, action }: {
  th: OwnerTheme; title: React.ReactNode; subtitle?: React.ReactNode;
  icon?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {icon && (
          <div style={{ width: 30, height: 30, borderRadius: 9, background: th.accentDim, border: `1px solid ${th.accentBorder}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 14.5, fontWeight: 700, color: th.text, letterSpacing: "-0.01em" }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, color: th.textSub, marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
