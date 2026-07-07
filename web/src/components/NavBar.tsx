"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Car, Compass, Crown, Gift, Route, TicketCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auth } from "@/lib/api";
import Logo from "@/components/Logo";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@/contexts/UserContext";

const NAV_LINKS: Array<{ href: string; label: string; Icon: LucideIcon }> = [
  { href: "/plan",       label: "Plan",       Icon: Route },
  { href: "/discover",   label: "Discover",   Icon: Compass },
  { href: "/trips",      label: "Trips",      Icon: TicketCheck },
  { href: "/vehicles",   label: "Vehicles",   Icon: Car },
  { href: "/rewards",    label: "Rewards",    Icon: Gift },
  { href: "/membership", label: "Member",     Icon: Crown },
];

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.5"/>
      <line x1="12" y1="1.5" x2="12" y2="3.5"/>
      <line x1="12" y1="20.5" x2="12" y2="22.5"/>
      <line x1="4.5" y1="4.5" x2="5.9" y2="5.9"/>
      <line x1="18.1" y1="18.1" x2="19.5" y2="19.5"/>
      <line x1="1.5" y1="12" x2="3.5" y2="12"/>
      <line x1="20.5" y1="12" x2="22.5" y2="12"/>
      <line x1="4.5" y1="19.5" x2="5.9" y2="18.1"/>
      <line x1="18.1" y1="5.9" x2="19.5" y2="4.5"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/>
    </svg>
  );
}

export default function NavBar() {
  const router = useRouter();
  const path = usePathname();
  const { isLight, toggle: toggleTheme } = useTheme();
  const { loggedIn, initial: userInitial, clear } = useUser();
  const [loggingOut, setLoggingOut] = useState(false);
  const [themeAnimating, setThemeAnimating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [path]);

  // No reload on path change — UserContext caches auth state from initial mount.
  // loggedIn reflects the current cookie via context; no extra network call needed.

  // Animate indicator to active link
  useEffect(() => {
    const activeIdx = NAV_LINKS.findIndex(({ href }) =>
      path === href || (href !== "/" && path.startsWith(href))
    );
    const el = linksRef.current[activeIdx];
    const ind = indicatorRef.current;
    if (el && ind) {
      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement!.getBoundingClientRect();
      ind.style.opacity = "1";
      ind.style.width = rect.width + "px";
      ind.style.left = (rect.left - parentRect.left) + "px";
      ind.style.top = (rect.top - parentRect.top) + "px";
      ind.style.height = rect.height + "px";
    } else if (ind) {
      ind.style.opacity = "0";
    }
  }, [path]);

  function handleThemeToggle() {
    setThemeAnimating(true);
    setTimeout(() => setThemeAnimating(false), 500);
    toggleTheme();
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await auth.logout().catch(() => {});
      clear();
    } finally {
      setLoggingOut(false);
      router.push("/");
    }
  }

  const blur = "blur(26px) saturate(210%)";

  const navBg = isLight
    ? "linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,250,247,0.84))"
    : "linear-gradient(135deg,rgba(5,8,9,0.94),rgba(8,13,14,0.90))";

  const glowBorder = isLight
    ? "1px solid rgba(15,23,42,0.08)"
    : "1px solid rgba(255,255,255,0.10)";

  const navShadow = isLight
    ? "0 10px 34px rgba(15,23,42,0.10), 0 1px 0 rgba(255,255,255,0.86) inset"
    : "0 14px 42px rgba(0,0,0,0.50), 0 1px 0 rgba(255,255,255,0.07) inset, 0 0 0 1px rgba(0,230,118,0.035)";

  const linkColor = isLight ? "#475569" : "#9AA6B2";
  const linkActiveColor = isLight ? "#064E3B" : "#E9FFF3";

  return (
    <>
      {/* Fixed nav wrapper */}
      <div className="nav-shell" style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5000,
        pointerEvents: "none",
      }}>
        <nav className="nav-inner" style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: 68,
          background: navBg,
          border: glowBorder,
          borderRadius: 0,
          boxShadow: navShadow,
          backdropFilter: blur,
          WebkitBackdropFilter: blur,
          pointerEvents: "all",
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            position: "absolute",
            inset: 0,
            background: isLight
              ? "linear-gradient(90deg,rgba(0,210,106,0.10),transparent 26%,transparent 74%,rgba(14,165,233,0.08))"
              : "linear-gradient(90deg,rgba(0,230,118,0.055),transparent 30%,transparent 70%,rgba(34,211,238,0.045))",
            pointerEvents: "none",
          }} />
          {/* Subtle top highlight line */}
          {!isLight && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 1,
              background: "linear-gradient(90deg, transparent, rgba(0,230,118,0.12) 40%, rgba(34,211,238,0.10) 60%, transparent)",
              pointerEvents: "none",
            }} />
          )}
          {isLight && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 1,
              background: "linear-gradient(90deg, transparent, rgba(0,210,106,0.3) 40%, rgba(14,165,233,0.2) 60%, transparent)",
              opacity: 0.4,
              pointerEvents: "none",
            }} />
          )}

          {/* Logo */}
          <div style={{
            paddingLeft: 18,
            flexShrink: 0,
            display: "flex", alignItems: "center",
            position: "relative",
            zIndex: 2,
          }}>
            <Logo size="md" theme={isLight ? "light" : "dark"} />
          </div>

          {/* Nav links */}
          <div className="nav-links" style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 3,
            padding: 4,
            borderRadius: 16,
            background: isLight ? "rgba(255,255,255,0.58)" : "rgba(255,255,255,0.045)",
            border: isLight ? "1px solid rgba(15,23,42,0.05)" : "1px solid rgba(255,255,255,0.06)",
            boxShadow: isLight
              ? "0 12px 26px rgba(15,23,42,0.07), 0 1px 0 rgba(255,255,255,0.86) inset"
              : "0 14px 28px rgba(0,0,0,0.22), 0 1px 0 rgba(255,255,255,0.05) inset",
            zIndex: 2,
          }}>
            {/* Animated sliding indicator */}
            <div
              ref={indicatorRef}
              style={{
                position: "absolute",
                top: 4,
                height: 34,
                borderRadius: 12,
                background: isLight
                  ? "linear-gradient(135deg, rgba(0,210,106,0.18), rgba(14,165,233,0.12))"
                  : "linear-gradient(135deg, rgba(0,230,118,0.13), rgba(34,211,238,0.08))",
                border: isLight ? "1px solid rgba(0,168,85,0.22)" : "1px solid rgba(0,230,118,0.16)",
                opacity: 0,
                transition: "left .35s cubic-bezier(.2,0,0,1), top .35s cubic-bezier(.2,0,0,1), width .35s cubic-bezier(.2,0,0,1), height .35s cubic-bezier(.2,0,0,1), opacity .25s",
                boxShadow: isLight
                  ? "0 10px 22px rgba(0,168,85,0.14)"
                  : "0 0 18px rgba(0,230,118,0.10), 0 10px 24px rgba(0,0,0,0.22)",
                pointerEvents: "none",
              }}
            />
            {NAV_LINKS.map(({ href, label, Icon }, i) => {
              const active = path === href || (href !== "/" && !href.startsWith("#") && path.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  ref={(el) => { linksRef.current[i] = el; }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "8px 11px",
                    fontSize: 13,
                    fontWeight: active ? 750 : 600,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    borderRadius: 12,
                    color: active ? linkActiveColor : linkColor,
                    background: "transparent",
                    border: "1px solid transparent",
                    transition: "color .2s, transform .15s",
                    position: "relative",
                    zIndex: 1,
                    letterSpacing: "-.01em",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    if (!active) {
                      el.style.color = isLight ? "#047857" : "#D7FFE9";
                      el.style.background = isLight ? "rgba(0,168,85,0.10)" : "rgba(0,230,118,0.075)";
                      el.style.boxShadow = isLight
                        ? "0 8px 18px rgba(0,168,85,0.12), inset 0 0 0 1px rgba(0,168,85,0.18)"
                        : "0 0 16px rgba(0,230,118,0.10), inset 0 0 0 1px rgba(0,230,118,0.15)";
                    }
                    el.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    if (!active) {
                      el.style.color = linkColor;
                      el.style.background = "transparent";
                      el.style.boxShadow = "none";
                    }
                    el.style.transform = "none";
                  }}
                >
                  <Icon size={14} strokeWidth={active ? 2.5 : 2.1} />
                  {label}
                </Link>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 14, position: "relative", zIndex: 2 }}>

            {/* Hamburger — mobile only, hidden on desktop via CSS */}
            <button
              className="nav-hamburger"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle navigation"
              style={{
                display: "none",
                width: 38, height: 38, borderRadius: 13,
                alignItems: "center", justifyContent: "center",
                background: isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.06)",
                border: isLight ? "1px solid rgba(0,0,0,.09)" : "1px solid rgba(255,255,255,.09)",
                color: isLight ? "#374151" : "#64748B",
                cursor: "pointer", flexShrink: 0, fontFamily: "inherit",
              }}
            >
              {mobileMenuOpen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
              )}
            </button>

            {/* Theme toggle — premium pill */}
            <button
              onClick={handleThemeToggle}
              title={isLight ? "Switch to dark" : "Switch to light"}
              style={{
                width: 38, height: 38, borderRadius: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isLight
                  ? "rgba(0,0,0,0.04)"
                  : "rgba(255,255,255,0.06)",
                border: isLight
                  ? "1px solid rgba(0,0,0,0.08)"
                  : "1px solid rgba(255,255,255,0.09)",
                color: isLight ? "#4B5563" : "#9CA3AF",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all .2s cubic-bezier(.2,0,0,1)",
                transform: themeAnimating ? "rotate(180deg) scale(0.85)" : "rotate(0deg) scale(1)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.1)";
                el.style.borderColor = isLight ? "rgba(0,210,106,0.3)" : "rgba(0,230,118,0.3)";
                el.style.color = isLight ? "#059669" : "#00E676";
                el.style.boxShadow = isLight ? "0 0 14px rgba(0,210,106,0.2)" : "0 0 14px rgba(0,230,118,0.25)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";
                el.style.borderColor = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.09)";
                el.style.color = isLight ? "#4B5563" : "#9CA3AF";
                el.style.boxShadow = "none";
              }}
            >
              {isLight ? <MoonIcon /> : <SunIcon />}
            </button>

            {/* Divider */}
            <div style={{
              width: 1, height: 22,
              background: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
            }} />

            {loggedIn ? (
              <>
                {/* Avatar */}
                <div
                  onClick={() => router.push("/profile")}
                  title="My Profile"
                  style={{
                    width: 36, height: 36, borderRadius: 13,
                    background: isLight ? "linear-gradient(135deg,#00C862,#059669)" : "linear-gradient(135deg,#00E676,#00A855)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#FFF",
                    cursor: "pointer",
                    transition: "box-shadow .2s, transform .2s",
                    boxShadow: isLight ? "0 8px 18px rgba(0,168,85,0.24)" : "0 0 0 1px rgba(0,230,118,0.25), 0 10px 22px rgba(0,0,0,0.3)",
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.boxShadow = "0 0 0 2.5px #00D26A, 0 4px 16px rgba(0,210,106,0.4)";
                    el.style.transform = "scale(1.06)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.boxShadow = "0 0 0 2px transparent, 0 2px 8px rgba(0,210,106,0.3)";
                    el.style.transform = "scale(1)";
                  }}
                >{userInitial}</div>

                <button
                  onClick={logout}
                  disabled={loggingOut}
                  style={{
                    padding: "8px 13px", borderRadius: 12,
                    border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)",
                    color: isLight ? "#6B7280" : "#9CA3AF",
                    fontSize: 13, fontWeight: 500,
                    cursor: loggingOut ? "not-allowed" : "pointer",
                    background: "transparent", fontFamily: "inherit",
                    transition: "all .2s",
                    opacity: loggingOut ? 0.5 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!loggingOut) {
                      const el = e.currentTarget;
                      el.style.background = isLight ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.08)";
                      el.style.borderColor = "rgba(239,68,68,0.3)";
                      el.style.color = "#EF4444";
                    }
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    el.style.background = "transparent";
                    el.style.borderColor = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
                    el.style.color = isLight ? "#6B7280" : "#9CA3AF";
                  }}
                >{loggingOut ? "Signing out…" : "Log out"}</button>
              </>
            ) : (
              <>
                {/* Login — ghost */}
                <Link
                  href="/login"
                  style={{
                    padding: "9px 15px", borderRadius: 12,
                    border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)",
                    color: isLight ? "#374151" : "#64748B",
                    fontSize: 13.5, fontWeight: 500,
                    textDecoration: "none",
                    transition: "all .2s",
                    background: "transparent",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.07)";
                    el.style.borderColor = isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)";
                    el.style.color = isLight ? "#111827" : "#CBD5E1";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "transparent";
                    el.style.borderColor = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
                    el.style.color = isLight ? "#374151" : "#64748B";
                  }}
                >Log in</Link>

                {/* Get Started — premium green CTA */}
                <Link
                  href="/plan"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "9px 16px", borderRadius: 13,
                    background: isLight
                      ? "linear-gradient(135deg,#00C15A,#00A348)"
                      : "linear-gradient(135deg,#00E676,#00C15A)",
                    color: isLight ? "#FFF" : "#020A04",
                    fontSize: 13.5, fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: isLight
                      ? "0 2px 14px rgba(0,193,90,0.45), 0 1px 0 rgba(255,255,255,0.2) inset"
                      : "0 0 0 1px rgba(0,230,118,0.5), 0 2px 20px rgba(0,230,118,0.3), 0 1px 0 rgba(255,255,255,0.15) inset",
                    transition: "all .2s cubic-bezier(.2,0,0,1)",
                    letterSpacing: "-.01em",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = "translateY(-2px)";
                    el.style.boxShadow = isLight
                      ? "0 6px 22px rgba(0,193,90,0.55)"
                      : "0 0 0 1px rgba(0,230,118,0.7), 0 4px 28px rgba(0,230,118,0.45)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = "none";
                    el.style.boxShadow = isLight
                      ? "0 2px 14px rgba(0,193,90,0.45), 0 1px 0 rgba(255,255,255,0.2) inset"
                      : "0 0 0 1px rgba(0,230,118,0.5), 0 2px 20px rgba(0,230,118,0.3), 0 1px 0 rgba(255,255,255,0.15) inset";
                  }}
                >
                  <BoltIcon />
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 4999,
          background: isLight ? "rgba(0,0,0,.3)" : "rgba(0,0,0,.55)",
        }} onClick={() => setMobileMenuOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", top: 0, right: 0, bottom: 0,
              width: "min(300px, 80vw)",
              background: isLight ? "#FFFFFF" : "#0A0D0E",
              borderLeft: isLight ? "1px solid rgba(0,0,0,.09)" : "1px solid rgba(255,255,255,.08)",
              boxShadow: "-8px 0 40px rgba(0,0,0,.3)",
              display: "flex", flexDirection: "column",
              padding: "24px 0 32px",
              overflowY: "auto",
            }}
          >
            {/* Close row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 20px", borderBottom: isLight ? "1px solid rgba(0,0,0,.07)" : "1px solid rgba(255,255,255,.07)" }}>
              <Logo size="md" theme={isLight ? "light" : "dark"} />
              <button onClick={() => setMobileMenuOpen(false)} style={{ width: 34, height: 34, borderRadius: 9, border: isLight ? "1px solid rgba(0,0,0,.1)" : "1px solid rgba(255,255,255,.1)", background: "transparent", color: isLight ? "#374151" : "#64748B", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Links */}
            <div style={{ display: "flex", flexDirection: "column", padding: "16px 12px", gap: 2 }}>
              {NAV_LINKS.map(({ href, label }) => {
                const active = path === href || (href !== "/" && !href.startsWith("#") && path.startsWith(href));
                return (
                  <Link key={href} href={href} style={{
                    padding: "12px 16px", borderRadius: 12, fontSize: 15, fontWeight: active ? 700 : 500,
                    color: active ? (isLight ? "#059669" : "#00E676") : (isLight ? "#374151" : "#64748B"),
                    background: active ? (isLight ? "rgba(0,210,106,.08)" : "rgba(0,230,118,.08)") : "transparent",
                    textDecoration: "none", display: "block", transition: "background .15s",
                  }}>{label}</Link>
                );
              })}
            </div>

            <div style={{ flex: 1 }} />

            {/* Bottom: theme + auth */}
            <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={handleThemeToggle} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 500,
                background: isLight ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.05)",
                border: isLight ? "1px solid rgba(0,0,0,.08)" : "1px solid rgba(255,255,255,.08)",
                color: isLight ? "#4B5563" : "#9CA3AF",
                cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left",
              }}>
                {isLight ? <MoonIcon /> : <SunIcon />}
                {isLight ? "Switch to Dark" : "Switch to Light"}
              </button>
              {loggedIn ? (
                <>
                  <Link href="/profile" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 500, color: isLight ? "#374151" : "#64748B", background: isLight ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.05)", border: isLight ? "1px solid rgba(0,0,0,.08)" : "1px solid rgba(255,255,255,.08)", textDecoration: "none" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#00D26A,#00A855)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#FFF" }}>{userInitial}</div>
                    My Profile
                  </Link>
                  <button onClick={logout} style={{ padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 500, color: "#EF4444", background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.18)", cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left" }}>
                    {loggingOut ? "Signing out…" : "Log out"}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" style={{ display: "block", padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 500, color: isLight ? "#374151" : "#64748B", background: isLight ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.05)", border: isLight ? "1px solid rgba(0,0,0,.08)" : "1px solid rgba(255,255,255,.08)", textDecoration: "none", textAlign: "center" }}>Log in</Link>
                  <Link href="/plan" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px 16px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: "linear-gradient(135deg,#00D26A,#00A855)", color: "#FFF", textDecoration: "none", boxShadow: "0 4px 16px rgba(0,210,106,.35)" }}>
                    <BoltIcon /> Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
