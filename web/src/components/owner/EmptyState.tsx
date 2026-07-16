"use client";
import { OwnerTheme } from "./theme";

export function EmptyState({
  th, icon, title, description, action,
}: {
  th: OwnerTheme; icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      padding: "56px 24px", background: th.card, border: `1px dashed ${th.borderHi}`, borderRadius: 16,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: th.accentDim, border: `1px solid ${th.accentBorder}`,
        display: "grid", placeItems: "center", marginBottom: 18,
      }}>{icon}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: th.text, marginBottom: 6 }}>{title}</h3>
      {description && <p style={{ fontSize: 13, color: th.textSub, maxWidth: 340, marginBottom: action ? 22 : 0, lineHeight: 1.55 }}>{description}</p>}
      {action}
    </div>
  );
}
