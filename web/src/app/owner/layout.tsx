"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { checkAuth, bffLogout } from "@/lib/auth";
import { authFetch } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@/contexts/UserContext";
import Logo from "@/components/Logo";
import {
  LayoutDashboard, MapPin, BookOpen, Zap, Plus,
  LogOut, Sun, Moon, ChevronRight,
} from "lucide-react";

const C = {
  green: "#00D26A", mono: "'JetBrains Mono',monospace", sans: "'Space Grotesk',system-ui,sans-serif",
};

const NAV = [
  { section: "OVERVIEW", items: [
    { href: "/owner",          label: "Dashboard",   Icon: LayoutDashboard, exact: true },
  ]},
  { section: "MANAGE", items: [
    { href: "/owner/stations/new", label: "Add Station",    Icon: Plus,     exact: false },
    { href: "/owner/bookings",     label: "Bookings",       Icon: BookOpen, exact: false },
    { href: "/owner/sessions",     label: "Sessions",       Icon: Zap,      exact: false },
  ]},
  { section: "NETWORK", items: [
    { href: "/owner/stations",     label: "My Stations",    Icon: MapPin,   exact: false },
  ]},
];

const BODY_NAV_OFFSET = 68;

function getTheme(isLight: boolean) {
  return isLight ? {
    bg: "#F1F5F9", panel: "#FFFFFF", card: "#FFFFFF", raised: "#F3F7FB",
    border: "rgba(15,23,42,0.08)", text: "#0F172A", sub: "#64748B",
  } : {
    bg: "#0A0D0E", panel: "#101415", card: "#101415", raised: "#181D1F",
    border: "#1E2636", text: "#E6EBED", sub: "#6B7479",
  };
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const path    = usePathname();
  const { isLight, toggle } = useTheme();
  const { user, clear } = useUser();
  const [ready,   setReady]   = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const th = getTheme(isLight);

  useEffect(() => {
    // checkAuth() first (silently refreshes an expired access token if
    // needed), then probe ownership with whatever token is current after
    // that — a stale token read before refresh would 403 even for a
    // genuinely-owned account.
    checkAuth().then(ok => {
      if (!ok) { router.push("/login"); return; }
      return authFetch("/api/v1/owner/stations").then(res => {
        if (res.status === 403) { router.push("/become-owner"); return; }
        setReady(true);
      });
    }).catch(() => { router.push("/login"); });
  }, [router]);

  if (!ready) return (
    <div style={{ background: th.bg, minHeight: "100vh", marginTop: -BODY_NAV_OFFSET, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${th.border}`, borderTopColor: C.green, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  function isActive(href: string, exact?: boolean) {
    if (exact) return path === href;
    return path === href || path.startsWith(href + "/");
  }

  const initial = user
    ? (user.full_name ?? user.phone ?? "O").charAt(0).toUpperCase()
    : "O";

  return (
    <div style={{ display: "flex", height: "100vh", marginTop: -BODY_NAV_OFFSET, overflow: "hidden", background: th.bg, fontFamily: C.sans }}>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)"}; border-radius: 4px }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
        background: th.panel, borderRight: `1px solid ${th.border}`,
        boxShadow: isLight ? "2px 0 16px rgba(0,0,0,0.06)" : "4px 0 28px rgba(0,0,0,0.4)",
      }}>

        {/* Brand */}
        <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${th.border}` }}>
          <Logo size="sm" href="/owner" theme={isLight ? "light" : "dark"} />
          <div style={{
            marginTop: 6, paddingLeft: 42,
            fontSize: 8, fontWeight: 700, letterSpacing: "0.22em",
            color: C.green, opacity: 0.7, textTransform: "uppercase" as const,
            fontFamily: C.sans,
          }}>STATION PORTAL</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          {NAV.map(({ section, items }, si) => (
            <div key={section} style={{ marginTop: si === 0 ? 0 : 20 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.17em",
                color: isLight ? "rgba(15,23,42,0.28)" : "rgba(255,255,255,0.2)",
                textTransform: "uppercase" as const, padding: "0 8px", marginBottom: 3,
              }}>{section}</div>

              {items.map(({ href, label, Icon, exact }) => {
                const active   = isActive(href, exact);
                const hovering = hovered === href && !active;
                return (
                  <Link key={href} href={href}
                    onMouseEnter={() => setHovered(href)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 9,
                      padding: "7px 10px", borderRadius: 9, marginBottom: 1,
                      textDecoration: "none", fontWeight: active ? 600 : 400,
                      color: active ? C.green : hovering ? th.text : isLight ? "#5A6478" : "#6B7A8D",
                      background: active ? "rgba(0,192,96,0.10)" : hovering ? (isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)") : "transparent",
                      borderLeft: active ? `2px solid ${C.green}` : "2px solid transparent",
                      transition: "all 0.11s",
                    }}>
                    <Icon size={14} strokeWidth={active ? 2 : 1.6} style={{ flexShrink: 0, opacity: active ? 1 : hovering ? 0.85 : 0.5 }} />
                    <span style={{ fontSize: 12.5, flex: 1, letterSpacing: "-0.01em" }}>{label}</span>
                    {active && <ChevronRight size={10} style={{ opacity: 0.3 }} />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${th.border}` }}>
          {/* Theme toggle */}
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: th.sub }}>{isLight ? "Light mode" : "Dark mode"}</span>
            <button onClick={toggle} style={{
              width: 32, height: 18, borderRadius: 999, position: "relative" as const,
              background: isLight ? C.green : th.raised, border: `1px solid ${isLight ? C.green : th.border}`,
              cursor: "pointer", transition: "all 0.2s", padding: 0,
            }}>
              <div style={{
                position: "absolute" as const, top: 2, left: isLight ? 15 : 2,
                width: 12, height: 12, borderRadius: "50%",
                background: isLight ? "#fff" : th.sub, transition: "left 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isLight ? <Sun size={7} color={C.green} strokeWidth={2.5} /> : <Moon size={7} color={th.text} strokeWidth={2} />}
              </div>
            </button>
          </div>

          {/* User row */}
          <div style={{ padding: "10px 10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, background: isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)" }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#00D26A,#00B4A0)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#020E07",
                boxShadow: "0 0 0 2px rgba(0,210,106,0.22)",
                position: "relative" as const,
              }}>
                {initial}
                <div style={{ position: "absolute" as const, bottom: -1, right: -1, width: 8, height: 8, borderRadius: "50%", background: C.green, border: `1.5px solid ${th.panel}`, animation: "pulse-dot 2.5s ease-in-out infinite" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: th.text, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.full_name ?? user?.phone ?? "Owner"}
                </div>
                <div style={{ fontSize: 10, color: th.sub, marginTop: 1 }}>Station Partner</div>
              </div>
              <button title="Sign out"
                onClick={() => { clear(); bffLogout().finally(() => router.push("/login")); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", color: th.sub, transition: "color 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#FF5A5F"; }}
                onMouseLeave={e => { e.currentTarget.style.color = th.sub; }}>
                <LogOut size={12} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: "auto", background: th.bg }}>
        {children}
      </main>
    </div>
  );
}
