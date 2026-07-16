"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, MapPin, PlugZap, Building2, CornerDownLeft } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getTheme, C } from "@/lib/admin-ui";
import { useAdminData } from "./AdminData";

interface Result {
  kind: "user" | "owner" | "station" | "charger";
  id: string; title: string; sub: string; href: string;
}

export function CommandPalette() {
  const { isLight } = useTheme();
  const th = getTheme(isLight);
  const router = useRouter();
  const { users, stations, chargers, stationById } = useAdminData();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) { setQuery(""); setActiveIdx(0); } }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Result[] = [];
    for (const u of users) {
      const isOwner = u.role_names.includes("ROLE_STATION_OWNER");
      if ((u.full_name ?? "").toLowerCase().includes(q) || u.phone.includes(q) || (u.email ?? "").toLowerCase().includes(q) || u.id.toLowerCase().includes(q)) {
        out.push({
          kind: isOwner ? "owner" : "user",
          id: u.id, title: u.full_name ?? u.phone, sub: `${u.phone}${u.email ? ` · ${u.email}` : ""}`,
          href: isOwner ? `/admin/owners?focus=${u.id}` : `/admin/users?focus=${u.id}`,
        });
      }
      if (out.length >= 20) break;
    }
    for (const s of stations) {
      if (s.name.toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q) || (s.state ?? "").toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) {
        out.push({ kind: "station", id: s.id, title: s.name, sub: `${s.city ?? "—"}${s.state ? `, ${s.state}` : ""}`, href: `/admin/stations?focus=${s.id}` });
      }
      if (out.length >= 30) break;
    }
    for (const c of chargers) {
      if (c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)) {
        const st = stationById.get(c.station_id);
        out.push({ kind: "charger", id: c.id, title: c.label, sub: st ? `at ${st.name}` : c.station_id, href: `/admin/chargers?focus=${c.id}` });
      }
      if (out.length >= 40) break;
    }
    return out.slice(0, 12);
  }, [query, users, stations, chargers, stationById]);

  useEffect(() => { setActiveIdx(0); }, [results.length]);

  function go(r: Result) {
    router.push(r.href);
    setOpen(false);
  }

  const ICONS: Record<Result["kind"], React.ReactNode> = {
    user: <User size={14} color={C.blue} />,
    owner: <Building2 size={14} color={C.amber} />,
    station: <MapPin size={14} color={C.teal} />,
    charger: <PlugZap size={14} color={C.purple} />,
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8,
      background: th.raised, border: `1px solid ${th.border}`, color: th.sub, fontSize: 12,
      cursor: "pointer", fontFamily: C.sans,
    }}>
      <Search size={12} />
      <span>Search…</span>
      <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: th.muted, fontFamily: C.mono, opacity: 0.7 }}>⌘K</span>
    </button>
  );

  return (
    <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20000, background: "rgba(4,6,7,.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}>
      <style suppressHydrationWarning>{`@keyframes cmdk-in { from { opacity:0; transform:scale(.97) translateY(-6px) } to { opacity:1; transform:none } }`}</style>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 560, background: th.card, border: `1px solid ${th.border}`, borderRadius: 16,
        boxShadow: "0 30px 80px rgba(0,0,0,.4)", overflow: "hidden", animation: "cmdk-in .15s ease both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${th.border}` }}>
          <Search size={16} color={th.sub} />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(results.length - 1, i + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); }
              if (e.key === "Enter" && results[activeIdx]) go(results[activeIdx]);
            }}
            placeholder="Search users, owners, stations, chargers…"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: th.text, fontFamily: C.sans }}
          />
          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: th.muted, color: th.sub, fontFamily: C.mono }}>ESC</span>
        </div>
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {query.trim() && results.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: th.sub }}>No matches for &ldquo;{query}&rdquo;</div>
          )}
          {results.map((r, i) => (
            <button key={`${r.kind}-${r.id}`} onClick={() => go(r)} onMouseEnter={() => setActiveIdx(i)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 18px",
              background: i === activeIdx ? th.raised : "transparent", border: "none", borderBottom: `1px solid ${th.border}`,
              cursor: "pointer", textAlign: "left", fontFamily: C.sans,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: th.raised, display: "grid", placeItems: "center", flexShrink: 0 }}>{ICONS[r.kind]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: th.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                <div style={{ fontSize: 11, color: th.sub, marginTop: 1 }}>{r.sub}</div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: th.sub, opacity: 0.6, flexShrink: 0 }}>{r.kind}</span>
              {i === activeIdx && <CornerDownLeft size={12} color={th.sub} style={{ flexShrink: 0 }} />}
            </button>
          ))}
          {!query.trim() && (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 12.5, color: th.sub }}>
              Type to search across users, owners, stations, and chargers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
