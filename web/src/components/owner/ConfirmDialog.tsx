"use client";
import { AlertTriangle } from "lucide-react";
import { OwnerTheme } from "./theme";
import { Button } from "./Button";

export function ConfirmDialog({
  th, open, title, description, confirmLabel = "Confirm", danger, loading, onConfirm, onCancel,
}: {
  th: OwnerTheme; open: boolean; title: string; description?: string;
  confirmLabel?: string; danger?: boolean; loading?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(4,6,7,.55)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 20 }}
    >
      <div onClick={e => e.stopPropagation()} className="owner-modal-in" style={{
        width: "100%", maxWidth: 380, background: th.card, border: `1px solid ${th.border}`,
        borderRadius: 18, padding: 24, boxShadow: th.shadowLg,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", marginBottom: 16,
          background: danger ? th.dangerDim : th.accentDim, border: `1px solid ${danger ? th.danger + "30" : th.accentBorder}`,
        }}>
          <AlertTriangle size={19} color={danger ? th.danger : th.accent} />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: th.text, marginBottom: 8 }}>{title}</h3>
        {description && <p style={{ fontSize: 13, color: th.textSub, lineHeight: 1.55, marginBottom: 22 }}>{description}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <Button th={th} variant="secondary" onClick={onCancel} fullWidth>Cancel</Button>
          <Button th={th} variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading} fullWidth>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
