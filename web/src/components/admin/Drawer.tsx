"use client";
import { X } from "lucide-react";
import type { OwnerTheme } from "@/components/owner";

export function Drawer({
  th, open, onClose, title, subtitle, icon, tabs, activeTab, onTabChange, children, width = 480,
}: {
  th: OwnerTheme; open: boolean; onClose: () => void;
  title: React.ReactNode; subtitle?: React.ReactNode; icon?: React.ReactNode;
  tabs?: { key: string; label: string }[]; activeTab?: string; onTabChange?: (key: string) => void;
  children: React.ReactNode; width?: number;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(4,6,7,.5)", backdropFilter: "blur(2px)" }}
    >
      <style suppressHydrationWarning>{`
        @keyframes admin-drawer-in { from { transform: translateX(100%) } to { transform: translateX(0) } }
        .admin-drawer { animation: admin-drawer-in .22s cubic-bezier(.16,1,.3,1) both; }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        className="admin-drawer"
        style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: `min(${width}px, 100vw)`,
          background: th.card, borderLeft: `1px solid ${th.border}`, boxShadow: th.shadowLg,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 22px", borderBottom: `1px solid ${th.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: tabs ? 16 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {icon && (
                <div style={{ width: 38, height: 38, borderRadius: 11, background: th.accentDim, border: `1px solid ${th.accentBorder}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {icon}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: th.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h2>
                {subtitle && <div style={{ fontSize: 12, color: th.textSub, marginTop: 2, fontFamily: th.mono }}>{subtitle}</div>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: th.textMuted, cursor: "pointer", padding: 4, flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>
          {tabs && (
            <div style={{ display: "flex", gap: 2 }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => onTabChange?.(t.key)} style={{
                  padding: "7px 14px", fontSize: 12.5, fontWeight: activeTab === t.key ? 700 : 500,
                  cursor: "pointer", background: "none", border: "none",
                  borderBottom: `2px solid ${activeTab === t.key ? th.accent : "transparent"}`,
                  color: activeTab === t.key ? th.accent : th.textSub, fontFamily: th.sans,
                }}>{t.label}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function DrawerRow({ th, label, value }: { th: OwnerTheme; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${th.border}`, gap: 12 }}>
      <span style={{ fontSize: 12, color: th.textSub, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: th.text, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

export function DrawerLink({ th, icon, label, sub, onClick }: {
  th: OwnerTheme; icon?: React.ReactNode; label: React.ReactNode; sub?: React.ReactNode; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="owner-table-row" style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
      background: th.raised, border: `1px solid ${th.border}`, borderRadius: 11, cursor: "pointer",
      textAlign: "left", fontFamily: th.sans, marginBottom: 8,
    }}>
      {icon && <div style={{ width: 30, height: 30, borderRadius: 9, background: th.accentDim, display: "grid", placeItems: "center", flexShrink: 0 }}>{icon}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: th.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: th.textSub, marginTop: 1 }}>{sub}</div>}
      </div>
    </button>
  );
}
