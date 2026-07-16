"use client";
import { OwnerTheme } from "./theme";

export function PageHeader({
  th, title, subtitle, actions, breadcrumb,
}: {
  th: OwnerTheme; title: React.ReactNode; subtitle?: React.ReactNode;
  actions?: React.ReactNode; breadcrumb?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 26 }}>
      {breadcrumb && <div style={{ marginBottom: 10 }}>{breadcrumb}</div>}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, color: th.text, letterSpacing: "-0.03em", marginBottom: subtitle ? 5 : 0 }}>
            {title}
          </h1>
          {subtitle && <p style={{ fontSize: 13.5, color: th.textSub }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div>}
      </div>
    </div>
  );
}

export function Breadcrumb({ th, items }: { th: OwnerTheme; items: { label: string; href?: string }[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: th.textMuted }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span style={{ opacity: 0.5 }}>/</span>}
          <span style={{ color: i === items.length - 1 ? th.textSub : th.textMuted, fontWeight: i === items.length - 1 ? 600 : 400 }}>
            {item.label}
          </span>
        </span>
      ))}
    </div>
  );
}
