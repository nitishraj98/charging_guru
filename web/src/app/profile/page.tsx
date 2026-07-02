"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User as UserIcon, Mail, Phone, Edit3, Check, X, LogOut,
  Car, Zap, Map, Star, Building2, ChevronRight, ShieldCheck,
} from "lucide-react";
import { auth, User } from "@/lib/api";
import { checkAuth, bffLogout } from "@/lib/auth";
import { useUser } from "@/contexts/UserContext";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function updateProfile(full_name: string | null, email: string | null): Promise<User> {
  const match = typeof document !== "undefined" ? document.cookie.match(/(?:^|; )cg_access=([^;]*)/) : null;
  const token = match ? decodeURIComponent(match[1]) : "";
  const res = await fetch(`${BASE}/api/v1/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ full_name, email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Update failed");
  return data as User;
}

const QUICK_LINKS = [
  { label: "My Vehicles",       sub: "Manage your EVs",             Icon: Car,       href: "/vehicles",    color: "#00E676" },
  { label: "My Trips",          sub: "View charging sessions",       Icon: Zap,       href: "/trips",       color: "#22D3EE" },
  { label: "Plan Journey",      sub: "Find charge stops on route",   Icon: Map,       href: "/plan",        color: "#A78BFA" },
  { label: "Rewards",           sub: "Points & referrals",           Icon: Star,      href: "/rewards",     color: "#FFC043" },
  { label: "Station Portal",    sub: "Manage your stations",         Icon: Building2, href: "/owner",       color: "#FB923C" },
  { label: "Become a Partner",  sub: "List your charging station",   Icon: ShieldCheck, href: "/become-owner", color: "#F472B6" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const { clear: clearUser } = useUser();
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saved, setSaved]     = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const cardBg     = isLight ? "#FFFFFF" : "#101415";
  const cardBorder = isLight ? "#E2E8F0" : "#222829";
  const textPrimary= isLight ? "#0F172A" : "#E6EBED";
  const textSub    = isLight ? "#64748B" : "#6B7479";
  const textMuted  = isLight ? "#94A3B8" : "#495154";
  const accent     = isLight ? "#00D26A" : "#00E676";
  const accentDim  = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBrd  = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";
  const raisedBg   = isLight ? "#F1F5F9" : "#181D1F";
  const inputBg    = isLight ? "#F8FAFC" : "#101415";
  const inputBorder= isLight ? "#CBD5E1" : "#2E3638";

  useEffect(() => {
    checkAuth().then(ok => {
      if (!ok) { router.push("/login"); return; }
      auth.me()
        .then(u => { setUser(u); setName(u.full_name ?? ""); setEmail(u.email ?? ""); })
        .catch(() => router.push("/login"))
        .finally(() => setLoading(false));
    });
  }, [router]);

  async function save() {
    setSaving(true); setSaveErr(""); setSaved(false);
    try {
      const updated = await updateProfile(name || null, email || null);
      setUser(updated); setEditing(false); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  }

  async function logout() {
    setLoggingOut(true);
    await bffLogout();
    clearUser();
    router.push("/");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: inputBg, border: `1px solid ${inputBorder}`,
    borderRadius: 10, padding: "11px 14px",
    color: textPrimary, fontSize: 14, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
    color: textSub, marginBottom: 6,
  };

  if (loading) return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3, borderColor: "#222829", borderTopColor: accent }} />
        <span style={{ color: textSub, fontSize: 14 }}>Loading profile…</span>
      </div>
    </div>
  );

  if (!user) return null;

  const initial = (user.full_name ?? user.phone ?? "U").charAt(0).toUpperCase();
  const rewardPoints = (user as User & { reward_points?: number }).reward_points;

  return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <NavBar />

      <div className="fade-up" style={{ maxWidth: 580, margin: "0 auto", padding: "36px 24px 100px" }}>

        {/* ── Profile Hero ── */}
        <div style={{
          background: isLight ? "linear-gradient(135deg,#F0FDF4,#ECFDF5)" : "linear-gradient(135deg,#091F13,#0D1D11,#101415)",
          border: `1px solid ${accentBrd}`, borderRadius: 24, padding: "28px 26px", marginBottom: 16,
          boxShadow: isLight ? "0 4px 24px rgba(0,210,106,.1)" : "0 0 0 1px rgba(0,164,85,.1),0 8px 40px rgba(0,230,118,.05)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative orb */}
          <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", background: isLight ? "rgba(0,210,106,.07)" : "rgba(0,230,118,.04)", pointerEvents: "none" }} />

          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 20 }}>
            {/* Avatar */}
            <div style={{
              width: 80, height: 80, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
              display: "grid", placeItems: "center",
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 32, color: "#FFF",
              boxShadow: isLight ? "0 4px 20px rgba(0,210,106,.35)" : "0 0 0 3px rgba(0,230,118,.2),0 0 24px rgba(0,230,118,.15)",
            }}>{initial}</div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".14em", color: accent, marginBottom: 6, textTransform: "uppercase" }}>
                Your account
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, marginBottom: 4, letterSpacing: "-.02em" }}>
                {user.full_name ?? "Your Profile"}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: textSub }}>
                <Phone size={12} strokeWidth={2} />
                {user.phone}
              </div>
            </div>

            {/* Edit button */}
            {!editing && (
              <button onClick={() => { setEditing(true); setSaved(false); setSaveErr(""); }} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 11,
                background: accentDim, border: `1px solid ${accentBrd}`,
                color: accent, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0,
              }}>
                <Edit3 size={13} strokeWidth={2.5} /> Edit
              </button>
            )}
          </div>

          {/* Reward points strip */}
          {rewardPoints !== undefined && (
            <div style={{
              marginTop: 22, paddingTop: 18, borderTop: `1px solid ${accentBrd}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,192,67,.15)", border: "1px solid rgba(255,192,67,.3)", display: "grid", placeItems: "center", color: "#FFC043" }}>
                  <Star size={16} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: textMuted, textTransform: "uppercase", marginBottom: 2 }}>Reward Points</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 800, color: textPrimary }}>{rewardPoints}</div>
                </div>
              </div>
              <button onClick={() => router.push("/rewards")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 10, background: "rgba(255,192,67,.1)", border: "1px solid rgba(255,192,67,.25)", color: "#FFC043", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Redeem <ChevronRight size={12} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        {/* ── Personal Info card ── */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "22px 24px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <UserIcon size={15} strokeWidth={2} color={textMuted} />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>Personal Info</h2>
            </div>
            {editing && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setEditing(false); setSaveErr(""); setName(user.full_name ?? ""); setEmail(user.email ?? ""); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 10, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <X size={13} strokeWidth={2.5} /> Cancel
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}><UserIcon size={11} strokeWidth={2} /> Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}><Mail size={11} strokeWidth={2} /> Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}><Phone size={11} strokeWidth={2} /> Phone <span style={{ color: textMuted, fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>— cannot be changed</span></label>
                <div style={{ ...inputStyle, background: raisedBg, color: textMuted, cursor: "not-allowed" }}>{user.phone}</div>
              </div>

              {saveErr && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 13 }}>{saveErr}</div>
              )}

              <button onClick={save} disabled={saving} style={{ padding: "13px", borderRadius: 12, background: saving ? raisedBg : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`, color: saving ? textSub : "#050708", fontSize: 14, fontWeight: 700, border: "none", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {saving ? <><span className="spinner" />Saving…</> : <><Check size={16} strokeWidth={2.5} />Save changes</>}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {saved && (
                <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 12, background: accentDim, border: `1px solid ${accentBrd}`, color: isLight ? "#059669" : "#4DFFA6", fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
                  <Check size={13} strokeWidth={2.5} /> Profile updated successfully
                </div>
              )}
              {[
                { label: "Full name", val: user.full_name ?? "—", Icon: UserIcon },
                { label: "Email",     val: user.email ?? "—",     Icon: Mail     },
                { label: "Phone",     val: user.phone,            Icon: Phone    },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: i < arr.length - 1 ? `1px solid ${cardBorder}` : "none" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: raisedBg, border: `1px solid ${cardBorder}`, display: "grid", placeItems: "center", flexShrink: 0, color: textMuted }}>
                    <row.Icon size={15} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: textMuted, marginBottom: 2, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>{row.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: row.val === "—" ? textMuted : textPrimary }}>{row.val}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick links ── */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, overflow: "hidden", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          {QUICK_LINKS.map((item, i) => (
            <button key={item.label} onClick={() => router.push(item.href)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14,
              padding: "14px 20px", background: "transparent", border: "none",
              borderBottom: i < QUICK_LINKS.length - 1 ? `1px solid ${cardBorder}` : "none",
              cursor: "pointer", textAlign: "left", transition: "background .12s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = raisedBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 11, background: `${item.color}14`, border: `1px solid ${item.color}25`, display: "grid", placeItems: "center", flexShrink: 0, color: item.color }}>
                <item.Icon size={17} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 1 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: textMuted }}>{item.sub}</div>
              </div>
              <ChevronRight size={15} strokeWidth={2} color={textMuted} />
            </button>
          ))}
        </div>

        {/* ── Sign out ── */}
        <button onClick={logout} disabled={loggingOut} style={{
          width: "100%", padding: "14px", borderRadius: 14,
          background: "rgba(255,90,95,.06)", border: "1px solid rgba(255,90,95,.18)",
          color: "#FF5A5F", fontSize: 14, fontWeight: 700, cursor: loggingOut ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "background .15s",
        }}
          onMouseEnter={e => { if (!loggingOut) e.currentTarget.style.background = "rgba(255,90,95,.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,90,95,.06)"; }}
        >
          <LogOut size={16} strokeWidth={2} />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>

      </div>
    </div>
  );
}
