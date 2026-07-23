"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { checkAuth, bffLogout } from "@/lib/auth";
import { auth } from "@/lib/api";
import { authFetch } from "@/lib/admin-ui";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@/contexts/UserContext";
import Logo from "@/components/Logo";
import { getOwnerTheme } from "@/components/owner/theme";
import { OwnerToastProvider } from "@/components/owner/Toast";
import {
  LayoutDashboard, MapPin, BookOpen, Zap, Plus,
  LogOut, Sun, Moon, ChevronRight, ShieldCheck, Search, X,
} from "lucide-react";

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

interface QuickStation { id: string; name: string; city: string | null; }

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const path    = usePathname();
  const { isLight, toggle } = useTheme();
  const { user, clear } = useUser();
  const [ready,   setReady]   = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stations, setStations] = useState<QuickStation[]>([]);

  const th = getOwnerTheme(isLight);

  useEffect(() => {
    // checkAuth() first (silently refreshes an expired access token if
    // needed), then probe ownership with whatever token is current after
    // that — a stale token read before refresh would 403 even for a
    // genuinely-owned account.
    checkAuth().then(ok => {
      if (!ok) { router.push("/login"); return; }
      return auth.me().then(me => {
        if (!(me.roles ?? []).includes("ROLE_STATION_OWNER")) { router.push("/become-owner"); return; }
        return authFetch("/api/v1/owner/stations").then(res => {
          if (res.status === 403) { router.push("/become-owner"); return; }
          if (res.ok) res.json().then(d => setStations(Array.isArray(d) ? d : [])).catch(() => {});
          setReady(true);
        });
      });
    }).catch(() => { router.push("/login"); });
  }, [router]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stations.slice(0, 6);
    return stations.filter(s => s.name.toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q)).slice(0, 8);
  }, [stations, searchQuery]);

  if (!ready) return (
    <div style={{ background: th.bg, minHeight: "100vh", marginTop: -BODY_NAV_OFFSET, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${th.border}`, borderTopColor: th.accent, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
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
    <OwnerToastProvider>
    <div style={{
      display: "flex", height: "100vh", marginTop: -BODY_NAV_OFFSET, overflow: "hidden",
      background: th.bgGradient,
      fontFamily: th.sans,
    }}>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)"}; border-radius: 4px }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes owner-grid-drift { from{transform:translate3d(0,0,0)} to{transform:translate3d(-48px,-48px,0)} }
        @keyframes owner-spin { to { transform: rotate(360deg) } }
        @keyframes owner-toast-in { from { opacity:0; transform:translateY(10px) scale(.97) } to { opacity:1; transform:none } }
        @keyframes owner-modal-in { from { opacity:0; transform:scale(.96) translateY(6px) } to { opacity:1; transform:none } }
        @keyframes owner-fade-up { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes owner-orb-float { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(-14px,10px) scale(1.06) } }
        @keyframes owner-shine { 0% { transform: translateX(-120%) skewX(-18deg) } 100% { transform: translateX(220%) skewX(-18deg) } }

        .owner-shell-main::before {
          content:""; position:fixed; inset:0; pointer-events:none;
          background-image:
            linear-gradient(${isLight ? "rgba(15,23,42,0.035)" : "rgba(255,255,255,0.028)"} 1px,transparent 1px),
            linear-gradient(90deg,${isLight ? "rgba(15,23,42,0.035)" : "rgba(255,255,255,0.028)"} 1px,transparent 1px);
          background-size:48px 48px; opacity:.6; animation:owner-grid-drift 22s linear infinite;
        }

        .owner-card { transition: box-shadow .2s cubic-bezier(.16,1,.3,1), transform .2s cubic-bezier(.16,1,.3,1), border-color .2s; }
        .owner-card-hover:hover { box-shadow: ${th.shadowMd}; transform: translateY(-2px); border-color: ${th.borderHi}; }
        .owner-stat-card:hover { box-shadow: ${th.shadowMd}, 0 0 0 1px ${th.accentBorder}; }
        .owner-hero-orb { animation: owner-orb-float 8s ease-in-out infinite; }
        .owner-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.04); }
        .owner-btn:active:not(:disabled) { transform: translateY(0); }
        .owner-btn-primary { position: relative; overflow: hidden; }
        .owner-btn-primary::after {
          content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 40%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent);
          transform: translateX(-120%) skewX(-18deg); pointer-events: none;
        }
        .owner-btn-primary:hover:not(:disabled)::after { animation: owner-shine .85s ease forwards; }
        .owner-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,.35); border-top-color: currentColor; animation: owner-spin .7s linear infinite; display: inline-block; flex-shrink: 0; }
        .owner-table-row { transition: background .12s; }
        .owner-table-row:hover { background: ${isLight ? "rgba(15,23,42,0.025)" : "rgba(255,255,255,0.025)"}; }
        .owner-toast-in { animation: owner-toast-in .25s cubic-bezier(.16,1,.3,1) both; }
        .owner-modal-in { animation: owner-modal-in .2s cubic-bezier(.16,1,.3,1) both; }
        .owner-fade-up { animation: owner-fade-up .35s cubic-bezier(.16,1,.3,1) both; }
        .owner-pad { padding: 28px 32px; }
        @media (max-width: 768px) { .owner-pad { padding: 20px 16px; } }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 224, flexShrink: 0, display: "flex", flexDirection: "column",
        background: isLight ? "rgba(255,255,255,0.9)" : "rgba(11,14,15,0.94)",
        borderRight: `1px solid ${th.border}`,
        backdropFilter: "blur(18px)",
        boxShadow: isLight ? "10px 0 34px rgba(15,23,42,0.06)" : "12px 0 42px rgba(0,0,0,0.42)",
      }}>

        {/* Brand */}
        <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${th.border}` }}>
          <Logo size="sm" href="/owner" theme={isLight ? "light" : "dark"} />
          <div style={{ marginTop: 10, marginLeft: 42, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 999, background: th.accentDim, border: `1px solid ${th.accentBorder}` }}>
            <ShieldCheck size={10} color={th.accent} />
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.18em", color: th.accent, textTransform: "uppercase" }}>Station Portal</span>
          </div>
        </div>

        {/* Quick search */}
        <div style={{ padding: "12px 12px 4px" }}>
          <button onClick={() => setSearchOpen(true)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10,
            background: th.raised, border: `1px solid ${th.border}`, color: th.textMuted, fontSize: 12,
            cursor: "pointer", fontFamily: th.sans,
          }}>
            <Search size={13} />
            <span style={{ flex: 1, textAlign: "left" }}>Find a station…</span>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 10px 14px", overflowY: "auto" }}>
          {NAV.map(({ section, items }, si) => (
            <div key={section} style={{ marginTop: si === 0 ? 6 : 18 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.17em",
                color: isLight ? "rgba(15,23,42,0.28)" : "rgba(255,255,255,0.2)",
                textTransform: "uppercase", padding: "0 8px", marginBottom: 4,
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
                      padding: "8px 10px", borderRadius: 10, marginBottom: 2,
                      textDecoration: "none", fontWeight: active ? 650 : 450,
                      color: active ? th.accent : hovering ? th.text : th.textSub,
                      background: active ? th.accentDim : hovering ? th.raised : "transparent",
                      border: `1px solid ${active ? th.accentBorder : "transparent"}`,
                      boxShadow: active ? `0 0 0 1px ${th.accentBorder}, 0 2px 10px ${th.accent}1c` : "none",
                      transition: "all 0.14s cubic-bezier(.16,1,.3,1)",
                    }}>
                    <Icon size={14} strokeWidth={active ? 2.2 : 1.7} style={{ flexShrink: 0, opacity: active ? 1 : hovering ? 0.85 : 0.55, filter: active ? `drop-shadow(0 0 4px ${th.accent}80)` : "none" }} />
                    <span style={{ fontSize: 12.5, flex: 1, letterSpacing: "-0.01em" }}>{label}</span>
                    {active && <ChevronRight size={10} style={{ opacity: 0.4 }} />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${th.border}`, background: isLight ? "rgba(248,250,252,0.66)" : "rgba(255,255,255,0.015)" }}>
          {/* Theme toggle */}
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${th.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: th.textSub }}>{isLight ? "Light mode" : "Dark mode"}</span>
            <button onClick={toggle} style={{
              width: 32, height: 18, borderRadius: 999, position: "relative",
              background: isLight ? th.raised : th.accent, border: `1px solid ${isLight ? th.border : th.accent}`,
              cursor: "pointer", transition: "all 0.2s", padding: 0,
            }}>
              <div style={{
                position: "absolute", top: 2, left: isLight ? 2 : 15,
                width: 12, height: 12, borderRadius: "50%",
                background: isLight ? th.textSub : "#fff", transition: "left 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isLight ? <Sun size={7} color={th.accent} strokeWidth={2.5} /> : <Moon size={7} color="#12151A" strokeWidth={2} />}
              </div>
            </button>
          </div>

          {/* User row */}
          <div style={{ padding: "10px 10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 10, background: isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)" }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg,${th.accent},#00B4A0)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#020E07",
                boxShadow: `0 0 0 2px ${th.accentDim}`,
                position: "relative",
              }}>
                {initial}
                <div style={{ position: "absolute", bottom: -1, right: -1, width: 8, height: 8, borderRadius: "50%", background: th.accent, border: `1.5px solid ${th.card}`, animation: "pulse-dot 2.5s ease-in-out infinite" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: th.text, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.full_name ?? user?.phone ?? "Owner"}
                </div>
                <div style={{ fontSize: 10, color: th.textSub, marginTop: 1 }}>Station Partner</div>
              </div>
              <button title="Sign out"
                onClick={() => { clear(); bffLogout().finally(() => router.push("/login")); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", color: th.textSub, transition: "color 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.color = th.danger; }}
                onMouseLeave={e => { e.currentTarget.style.color = th.textSub; }}>
                <LogOut size={12} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="owner-shell-main" style={{ flex: 1, overflow: "auto", background: "transparent", position: "relative" }}>
        {children}
      </main>

      {/* Quick station search overlay */}
      {searchOpen && (
        <div onClick={() => { setSearchOpen(false); setSearchQuery(""); }} style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(4,6,7,.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}>
          <div onClick={e => e.stopPropagation()} className="owner-modal-in" style={{ width: "100%", maxWidth: 460, background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, boxShadow: th.shadowLg, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${th.border}` }}>
              <Search size={15} color={th.textMuted} />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search your stations…"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: th.text, fontFamily: th.sans }}
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: th.textMuted, display: "flex" }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {searchResults.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: th.textSub }}>No stations found.</div>
              ) : searchResults.map(s => (
                <button key={s.id} onClick={() => { router.push(`/owner/stations/${s.id}`); setSearchOpen(false); setSearchQuery(""); }} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 16px",
                  background: "none", border: "none", borderBottom: `1px solid ${th.border}`, cursor: "pointer", textAlign: "left", fontFamily: th.sans,
                }} className="owner-table-row">
                  <MapPin size={14} color={th.accent} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{s.name}</div>
                    {s.city && <div style={{ fontSize: 11, color: th.textSub }}>{s.city}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </OwnerToastProvider>
  );
}
