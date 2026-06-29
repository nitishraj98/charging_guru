"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, User } from "@/lib/api";
import { checkAuth, bffLogout } from "@/lib/auth";
import { useUser } from "@/contexts/UserContext";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function updateProfile(full_name: string | null, email: string | null): Promise<User> {
  // Read access cookie for Authorization header
  const match = typeof document !== "undefined"
    ? document.cookie.match(/(?:^|; )cg_access=([^;]*)/)
    : null;
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

  const bg          = isLight ? "#F8FAFC" : "#0A0D0E";
  const cardBg      = isLight ? "#FFFFFF" : "#101415";
  const cardBorder  = isLight ? "#E2E8F0" : "#222829";
  const textPrimary = isLight ? "#0F172A" : "#E6EBED";
  const textSub     = isLight ? "#64748B" : "#6B7479";
  const textMuted   = isLight ? "#94A3B8" : "#495154";
  const accent      = isLight ? "#00D26A" : "#00E676";
  const accentDim   = isLight ? "#DCFCE7" : "rgba(0,230,118,.08)";
  const accentBrd   = isLight ? "#86EFAC" : "rgba(0,230,118,.25)";
  const raisedBg    = isLight ? "#F1F5F9" : "#181D1F";
  const inputBg     = isLight ? "#F8FAFC" : "#101415";
  const inputBorder = isLight ? "#CBD5E1" : "#2E3638";

  useEffect(() => {
    checkAuth().then(ok => { if (!ok) { router.push("/login"); return; }
    auth.me()
      .then(u => {
        setUser(u);
        setName(u.full_name ?? "");
        setEmail(u.email ?? "");
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false)); });
  }, [router]);

  async function save() {
    setSaving(true); setSaveErr(""); setSaved(false);
    try {
      const updated = await updateProfile(name || null, email || null);
      setUser(updated);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  }

  async function logout() {
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

  if (loading) return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3, borderColor: "#222829", borderTopColor: accent }} />
        <span style={{ color: textSub, fontSize: 14 }}>Loading profile…</span>
      </div>
    </div>
  );

  if (!user) return null;

  const initial = (user.full_name ?? user.phone ?? "U").charAt(0).toUpperCase();

  return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />

      <div className="fade-up" style={{ maxWidth: 560, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`,
            display: "grid", placeItems: "center",
            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: "#FFF",
            boxShadow: isLight ? "0 4px 18px rgba(0,210,106,.3)" : "0 0 0 1px rgba(0,230,118,.3),0 0 20px rgba(0,230,118,.15)",
          }}>{initial}</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: textPrimary, marginBottom: 2 }}>
              {user.full_name ?? "Your Profile"}
            </h1>
            <p style={{ fontSize: 13, color: textSub }}>{user.phone}</p>
          </div>
        </div>

        {/* Reward points banner */}
        {(user as User & { reward_points?: number }).reward_points !== undefined && (
          <div style={{ background: isLight ? "linear-gradient(135deg,#F0FDF4,#ECFDF5)" : "linear-gradient(135deg,#0C2319,#101415)", border: `1px solid ${accentBrd}`, borderRadius: 18, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: accent, marginBottom: 4 }}>REWARD POINTS</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 700, color: textPrimary }}>
                {(user as User & { reward_points?: number }).reward_points ?? 0}
              </div>
            </div>
            <div style={{ fontSize: 32 }}>⭐</div>
          </div>
        )}

        {/* Profile card */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "24px", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>Personal Info</h2>
            {!editing && (
              <button onClick={() => { setEditing(true); setSaved(false); setSaveErr(""); }} style={{ padding: "7px 16px", borderRadius: 10, background: accentDim, border: `1px solid ${accentBrd}`, color: accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: textSub, marginBottom: 6 }}>Phone</label>
                <div style={{ ...inputStyle, background: raisedBg, color: textMuted, cursor: "not-allowed" }}>{user.phone}</div>
              </div>

              {saveErr && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,90,95,.08)", border: "1px solid rgba(255,90,95,.25)", color: "#FF5A5F", fontSize: 13 }}>{saveErr}</div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={save} disabled={saving} style={{ flex: 1, padding: "12px", borderRadius: 12, background: saving ? raisedBg : `linear-gradient(135deg,${accent},${isLight ? "#00A855" : "#00C862"})`, color: saving ? textSub : "#050708", fontSize: 14, fontWeight: 700, border: "none", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {saving ? <><span className="spinner" />Saving…</> : "Save changes"}
                </button>
                <button onClick={() => { setEditing(false); setSaveErr(""); setName(user.full_name ?? ""); setEmail(user.email ?? ""); }} style={{ padding: "12px 20px", borderRadius: 12, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {saved && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: accentDim, border: `1px solid ${accentBrd}`, color: isLight ? "#059669" : "#4DFFA6", fontSize: 13 }}>✓ Profile updated successfully</div>
              )}
              {[
                { label: "Full name", val: user.full_name ?? "—" },
                { label: "Email",     val: user.email ?? "—" },
                { label: "Phone",     val: user.phone },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${cardBorder}` }}>
                  <span style={{ fontSize: 13, color: textSub }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: row.val === "—" ? textMuted : textPrimary }}>{row.val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, overflow: "hidden", marginBottom: 16, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,.05)" : "none" }}>
          {[
            { label: "My Vehicles",    icon: "🚗", href: "/vehicles" },
            { label: "My Trips",       icon: "⚡", href: "/trips" },
            { label: "Plan Journey",   icon: "🗺", href: "/plan" },
            { label: "Station Portal",  icon: "🏪", href: "/owner" },
            { label: "Become a Partner", icon: "⚡", href: "/become-owner" },
          ].map((item, i, arr) => (
            <button key={item.label} onClick={() => router.push(item.href)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14,
              padding: "16px 20px", background: "transparent", border: "none",
              borderBottom: i < arr.length - 1 ? `1px solid ${cardBorder}` : "none",
              cursor: "pointer", textAlign: "left", transition: "background .12s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = raisedBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 20, width: 36, height: 36, borderRadius: 10, background: raisedBg, border: `1px solid ${cardBorder}`, display: "grid", placeItems: "center", flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary, flex: 1 }}>{item.label}</span>
              <span style={{ color: textMuted, fontSize: 16 }}>›</span>
            </button>
          ))}
        </div>

        {/* Sign out */}
        <button onClick={logout} style={{
          width: "100%", padding: "14px", borderRadius: 14,
          background: "rgba(255,90,95,.06)", border: "1px solid rgba(255,90,95,.2)",
          color: "#FF5A5F", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

