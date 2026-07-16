"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getOwnerTheme } from "./theme";

type ToastKind = "success" | "error" | "info";
interface ToastItem { id: number; kind: ToastKind; message: string; }

interface ToastCtx { show: (kind: ToastKind, message: string) => void; }
const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within OwnerToastProvider");
  return ctx;
}

let nextId = 1;

export function OwnerToastProvider({ children }: { children: React.ReactNode }) {
  const { isLight } = useTheme();
  const th = getOwnerTheme(isLight);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++;
    setToasts(t => [...t, { id, kind, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);

  const ICONS: Record<ToastKind, React.ReactNode> = {
    success: <CheckCircle2 size={16} color={th.success} />,
    error: <XCircle size={16} color={th.danger} />,
    info: <Info size={16} color={th.info} />,
  };

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 340 }}>
        {toasts.map(t => (
          <div key={t.id} className="owner-toast-in" style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12,
            background: th.card, border: `1px solid ${th.border}`, boxShadow: th.shadowLg,
            fontSize: 13, color: th.text, fontFamily: th.sans,
          }}>
            {ICONS[t.kind]}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))} style={{ background: "none", border: "none", cursor: "pointer", color: th.textMuted, display: "flex" }}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
