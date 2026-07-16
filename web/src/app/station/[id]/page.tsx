"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { stations, bookings as bookingsApi, Station, Charger, Review, StationStats, Booking } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import NavBar from "@/components/NavBar";
import { useTheme } from "@/contexts/ThemeContext";
import { Zap, Navigation, Share2, Check, MapPin, Star, Clock, ChevronRight, Shield, ArrowLeft, Plug, CheckCircle2, Lock, RotateCcw } from "lucide-react";
import { AMENITY_META } from "@/lib/amenities";

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; dot: string; label: string }> = {
  AVAILABLE:   { color: "#4DFFA6", bg: "rgba(0,230,118,.10)", border: "rgba(0,230,118,.25)",   dot: "#00E676", label: "Available"    },
  BOOKED:      { color: "#FFC043", bg: "rgba(255,192,67,.10)", border: "rgba(255,192,67,.25)", dot: "#FFC043", label: "Booked"       },
  OCCUPIED:    { color: "#22D3EE", bg: "rgba(34,211,238,.10)",  border: "rgba(34,211,238,.25)",dot: "#22D3EE", label: "In session"   },
  IN_USE:      { color: "#22D3EE", bg: "rgba(34,211,238,.10)",  border: "rgba(34,211,238,.25)",dot: "#22D3EE", label: "In session"   },
  MAINTENANCE: { color: "#FF7849", bg: "rgba(255,120,73,.10)",  border: "rgba(255,120,73,.25)",dot: "#FF7849", label: "Maintenance"  },
  OFFLINE:     { color: "#6B7479", bg: "rgba(107,116,121,.10)",border: "rgba(107,116,121,.25)",dot: "#495154", label: "Offline"      },
};

// Estimated full charge time in minutes for a 60 kWh battery
function estChargeTime(kw: number) {
  const mins = Math.round((60 / kw) * 60);
  if (mins < 60) return `~${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `~${h}h ${m}m` : `~${h}h`;
}

function HeroBanner({ isLight }: { isLight: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxOrNull = canvas.getContext("2d");
    if (!ctxOrNull) return;
    const ctx: CanvasRenderingContext2D = ctxOrNull;
    const cvs: HTMLCanvasElement = canvas;

    let W = cvs.parentElement!.offsetWidth;
    let H = cvs.parentElement!.offsetHeight;
    cvs.width  = W;
    cvs.height = H;

    // ── Particle system ──────────────────────────────────────────────────
    const ACCENT  = [0, 230, 118];   // #00E676
    const ACCENT2 = [34, 211, 238];  // #22D3EE

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      size: number;
      color: number[];
      trail: { x: number; y: number }[];
    }

    const particles: Particle[] = [];

    function spawn(): Particle {
      // Spawn from a random edge or the centre
      const edge = Math.random();
      let x: number, y: number, vx: number, vy: number;
      const speed = 0.4 + Math.random() * 0.9;
      if (edge < 0.3) {          // left edge → right
        x = 0; y = Math.random() * H;
        vx = speed; vy = (Math.random() - 0.5) * 0.4;
      } else if (edge < 0.6) {   // top edge → down
        x = Math.random() * W; y = 0;
        vx = (Math.random() - 0.5) * 0.4; vy = speed;
      } else {                   // centre burst outward
        x = W * 0.5 + (Math.random() - 0.5) * 60;
        y = H * 0.5 + (Math.random() - 0.5) * 40;
        const angle = Math.random() * Math.PI * 2;
        vx = Math.cos(angle) * speed * 1.2;
        vy = Math.sin(angle) * speed * 1.2;
      }
      const life = 120 + Math.random() * 180;
      return {
        x, y, vx, vy, life, maxLife: life,
        size: 1 + Math.random() * 2.2,
        color: Math.random() > 0.35 ? ACCENT : ACCENT2,
        trail: [],
      };
    }

    for (let i = 0; i < 55; i++) {
      const p = spawn();
      p.life = Math.random() * p.maxLife; // stagger initial positions
      particles.push(p);
    }

    // ── Energy ring ───────────────────────────────────────────────────────
    let ringAngle = 0;

    function drawRing(t: number) {
      const cx = W * 0.72, cy = H * 0.42;
      const R1 = 68, R2 = 80, R3 = 94;

      // Outer pulse ring
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.04);
      ctx.beginPath();
      ctx.arc(cx, cy, R3 + pulse * 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,230,118,${0.06 + pulse * 0.06})`;
      ctx.lineWidth = 12;
      ctx.stroke();

      // Rotating dashed arc
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ringAngle);
      ctx.beginPath();
      ctx.arc(0, 0, R2, 0, Math.PI * 1.6);
      ctx.strokeStyle = "rgba(0,230,118,.55)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 6]);
      ctx.lineDashOffset = -t * 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Counter-rotating arc (cyan)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-ringAngle * 0.7);
      ctx.beginPath();
      ctx.arc(0, 0, R1, Math.PI * 0.4, Math.PI * 1.9);
      ctx.strokeStyle = "rgba(34,211,238,.40)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = t * 0.3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Glow backdrop
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R2);
      grad.addColorStop(0, `rgba(0,230,118,${0.13 + pulse * 0.06})`);
      grad.addColorStop(0.5, "rgba(0,230,118,.04)");
      grad.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, R2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Bolt icon (SVG path drawn on canvas)
      ctx.save();
      ctx.translate(cx - 13, cy - 18);
      ctx.scale(1.1, 1.1);
      ctx.beginPath();
      ctx.moveTo(12, 2);
      ctx.lineTo(4, 14);
      ctx.lineTo(10, 14);
      ctx.lineTo(8, 22);
      ctx.lineTo(20, 10);
      ctx.lineTo(14, 10);
      ctx.lineTo(12, 2);
      ctx.closePath();
      const boltGrad = ctx.createLinearGradient(4, 2, 20, 22);
      boltGrad.addColorStop(0, `rgba(0,230,118,${0.85 + pulse * 0.15})`);
      boltGrad.addColorStop(1, `rgba(34,211,238,${0.7 + pulse * 0.15})`);
      ctx.fillStyle = boltGrad;
      ctx.shadowColor = "#00E676";
      ctx.shadowBlur = 18 + pulse * 12;
      ctx.fill();
      ctx.restore();

      // Orbiting dot
      const dotAngle = ringAngle * 2;
      const dx = cx + Math.cos(dotAngle) * R2;
      const dy = cy + Math.sin(dotAngle) * R2;
      ctx.beginPath();
      ctx.arc(dx, dy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#00E676";
      ctx.shadowColor = "#00E676";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Second orbiting dot (cyan, offset 180°)
      const dx2 = cx + Math.cos(dotAngle + Math.PI) * R1;
      const dy2 = cy + Math.sin(dotAngle + Math.PI) * R1;
      ctx.beginPath();
      ctx.arc(dx2, dy2, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#22D3EE";
      ctx.shadowColor = "#22D3EE";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ── Grid of dots (static, drawn once as part of clear) ───────────────
    function drawGrid() {
      ctx.save();
      ctx.globalAlpha = isLight ? 0.16 : 0.09;
      for (let r = 0; r < H; r += 28) {
        for (let c = 0; c < W; c += 28) {
          ctx.beginPath();
          ctx.arc(c + 4, r + 4, 1, 0, Math.PI * 2);
          ctx.fillStyle = isLight ? "#00A855" : "#00E676";
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── Horizontal energy lines ───────────────────────────────────────────
    function drawEnergyLines(t: number) {
      const lines = [H * 0.22, H * 0.5, H * 0.78];
      lines.forEach((ly, i) => {
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.3 + 0.1 * i, `rgba(0,230,118,${0.06 + 0.04 * i})`);
        grad.addColorStop(0.7 - 0.1 * i, `rgba(34,211,238,${0.05 + 0.03 * i})`);
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.moveTo(0, ly + Math.sin(t * 0.02 + i * 1.2) * 4);
        ctx.lineTo(W, ly + Math.sin(t * 0.02 + i * 1.2 + Math.PI) * 4);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // ── Main loop ─────────────────────────────────────────────────────────
    let t = 0;
    function tick() {
      t++;
      ringAngle += 0.008;

      // Clear with theme-matched bg — dark green for dark mode, soft mint for light mode
      ctx.clearRect(0, 0, W, H);
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      if (isLight) {
        bgGrad.addColorStop(0, "#F6FCF8");
        bgGrad.addColorStop(0.5, "#EAFBF1");
        bgGrad.addColorStop(1, "#F1FAF5");
      } else {
        bgGrad.addColorStop(0, "#040A06");
        bgGrad.addColorStop(0.5, "#071510");
        bgGrad.addColorStop(1, "#050C07");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      drawGrid();
      drawEnergyLines(t);
      drawRing(t);

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Slight drift toward centre with turbulence
        p.vx += (Math.random() - 0.5) * 0.06;
        p.vy += (Math.random() - 0.5) * 0.06;
        p.vx *= 0.995;
        p.vy *= 0.995;

        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 12) p.trail.shift();

        const alpha = Math.min(1, p.life / 40) * Math.min(1, (p.maxLife - p.life) / 20 + 0.3);

        // Trail
        if (p.trail.length > 2) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let k = 1; k < p.trail.length; k++) ctx.lineTo(p.trail[k].x, p.trail[k].y);
          ctx.strokeStyle = `rgba(${p.color.join(",")},${alpha * 0.25})`;
          ctx.lineWidth = p.size * 0.6;
          ctx.stroke();
        }

        // Dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.join(",")},${alpha})`;
        ctx.shadowColor = `rgb(${p.color.join(",")})`;
        ctx.shadowBlur = p.size * 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.life <= 0 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) {
          particles[i] = spawn();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    function onResize() {
      W = cvs.parentElement!.offsetWidth;
      H = cvs.parentElement!.offsetHeight;
      cvs.width  = W;
      cvs.height = H;
    }
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [isLight]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      aria-hidden="true"
    />
  );
}

function MiniMap({ lat, lng, name, isLight }: { lat: number; lng: number; name: string; isLight: boolean }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current || initRef.current) return;
    initRef.current = true;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!mapRef.current) return;
      L.map(mapRef.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false })
        .setView([lat, lng], 15)
        .addLayer(L.tileLayer(
          isLight
            ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png",
          { maxZoom: 20, subdomains: "abcd" },
        ))
        .addLayer(L.marker([lat, lng], { icon: L.divIcon({
          className: "",
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#00E676;border:3px solid #fff;box-shadow:0 0 0 4px rgba(0,230,118,.35),0 0 20px rgba(0,230,118,.7);"></div>`,
          iconSize: [20, 20], iconAnchor: [10, 10],
        }) }).bindTooltip(name));
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}

function StarBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11, color: "#FFC043", fontWeight: 700, width: 8, textAlign: "right" }}>{stars}</span>
      <Star size={9} fill="#FFC043" color="#FFC043" style={{ flexShrink: 0 }}/>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(255,192,67,.12)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#FFA500,#FFC043)", transition: "width .5s ease" }}/>
      </div>
      <span style={{ fontSize: 10, color: "#6B7479", width: 20, textAlign: "right" }}>{count}</span>
    </div>
  );
}

export default function StationDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { isLight } = useTheme();
  const { user, loggedIn } = useUser();
  const [station,   setStation]   = useState<Station | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"chargers"|"about"|"reviews">("chargers");
  const [copied,    setCopied]    = useState(false);
  const [selCharger, setSelCharger] = useState<Charger | null>(null);

  const [stats,   setStats]   = useState<StationStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [, setReviewsTotal] = useState(0);
  const [reviewableBooking, setReviewableBooking] = useState<Booking | null>(null);
  const [reviewRating,  setReviewRating]  = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const bg          = isLight ? "#F4F6F9"              : "#07090A";
  const cardBg      = isLight ? "#FFFFFF"              : "#0E1214";
  const cardBorder  = isLight ? "#E4E8EF"              : "#1B2022";
  const raisedBg    = isLight ? "#F0F3F8"              : "#161B1D";
  const textPrimary = isLight ? "#0A0F1A"              : "#E8ECEE";
  const textSub     = isLight ? "#5A6A7A"              : "#6B7479";
  const textMuted   = isLight ? "#64748B"              : "#495154";
  const accent      = isLight ? "#00C862"              : "#00E676";
  const accentDim   = isLight ? "rgba(0,200,98,.07)"  : "rgba(0,230,118,.06)";
  const accentBrd   = isLight ? "rgba(0,200,98,.28)"  : "rgba(0,230,118,.20)";

  // Hero banner tokens — theme-matched instead of always-dark
  const heroBg          = isLight ? "#F1FAF5" : "#040A06";
  const heroScrim        = isLight
    ? "linear-gradient(0deg,rgba(246,252,248,.97) 0%,rgba(246,252,248,.78) 70%,transparent 100%)"
    : "linear-gradient(0deg,rgba(4,8,6,.96) 0%,rgba(4,8,6,.7) 70%,transparent 100%)";
  const heroBtnBg        = isLight ? "rgba(255,255,255,.75)" : "rgba(4,6,5,.65)";
  const heroBtnBorder    = isLight ? "rgba(0,164,85,.25)"    : "rgba(0,230,118,.15)";
  const heroBtnText      = isLight ? "#0F2A1B"                : "#E8ECEE";
  const heroTitle        = isLight ? "#0A2016"                : "#F0F4F2";
  const heroMetaSub      = isLight ? "#3F5B4B"                : "#C0C8CC";
  const heroMetaMuted    = isLight ? "#5C7566"                : "#6B7479";
  const heroMetaFaint    = isLight ? "#6B8578"                : "#98A1A6";
  const heroPillBg       = isLight ? "rgba(255,255,255,.75)" : "rgba(4,8,6,.7)";
  const heroPillBorder   = isLight ? "rgba(15,23,42,.10)"    : "rgba(255,255,255,.12)";
  const heroStatBarBg    = isLight ? "rgba(255,255,255,.72)" : "rgba(10,14,12,.75)";
  const heroStatBarBrd   = isLight ? "rgba(0,164,85,.18)"    : "rgba(0,230,118,.12)";
  const heroStatDivider  = isLight ? "rgba(15,23,42,.08)"    : "rgba(255,255,255,.06)";
  const heroStatLabel    = isLight ? "#5C7566"                : "#495154";
  const heroStatVal      = isLight ? "#0F2A1B"                : "#D0D8DC";

  useEffect(() => {
    stations.get(id).then(s => { setStation(s); setSelCharger(s.chargers?.find(c => c.status === "AVAILABLE") ?? s.chargers?.[0] ?? null); })
      .catch(console.error).finally(() => setLoading(false));
    stations.stats(id).then(setStats).catch(() => setStats(null));
  }, [id]);

  const loadReviews = useCallback(() => {
    stations.reviews.list(id).then(r => { setReviews(r.items); setReviewsTotal(r.total); }).catch(() => {});
  }, [id]);
  useEffect(() => { loadReviews(); }, [loadReviews]);

  // Find a COMPLETED booking of this user's at this station that they haven't reviewed yet.
  useEffect(() => {
    if (!loggedIn || !user) { setReviewableBooking(null); return; }
    bookingsApi.list().then(list => {
      const hasReviewed = reviews.some(r => r.user_id === user.id);
      if (hasReviewed) { setReviewableBooking(null); return; }
      const candidate = list.find(b => b.status === "COMPLETED" && (b.station?.id === id || b.station_id === id));
      setReviewableBooking(candidate ?? null);
    }).catch(() => setReviewableBooking(null));
  }, [id, loggedIn, user, reviews]);

  async function submitReview() {
    if (!reviewableBooking) return;
    setReviewSubmitting(true); setReviewError("");
    try {
      await stations.reviews.create(id, reviewableBooking.id, reviewRating, reviewComment.trim() || undefined);
      setReviewComment("");
      setReviewableBooking(null);
      loadReviews();
      stations.get(id).then(setStation).catch(() => {});
    } catch (e: unknown) {
      setReviewError(e instanceof Error ? e.message : "Failed to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${cardBorder}`, borderTopColor: accent, animation: "spin .8s linear infinite" }} />
        <span style={{ color: textSub, fontSize: 14 }}>Loading station…</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!station) return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <NavBar />
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(255,90,95,.10)", border: "1px solid rgba(255,90,95,.25)", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
          <Zap size={28} color="#FF5A5F"/>
        </div>
        <p style={{ color: "#FF5A5F", fontSize: 16, marginBottom: 20 }}>Station not found.</p>
        <button onClick={() => router.back()} style={{ padding: "12px 26px", borderRadius: 12, background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, cursor: "pointer", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <ArrowLeft size={14}/> Go back
        </button>
      </div>
    </div>
  );

  const available = station.chargers?.filter(c => c.status === "AVAILABLE") ?? [];
  const chargers  = station.chargers ?? [];
  const hasDC     = chargers.some(c => c.charger_type === "DC");
  const maxPower  = chargers.reduce((m, c) => Math.max(m, c.power_kw), 0);
  const mapsUrl   = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
  const minPrice  = chargers.length ? Math.min(...chargers.map(c => c.price_per_kwh)) : 0;
  const bookTarget = selCharger ?? available[0] ?? chargers[0];

  function handleShare() {
    const url = window.location.href;
    function copyFallback() {
      try {
        const ta = document.createElement("textarea");
        ta.value = url; ta.style.cssText = "position:fixed;top:-9999px;opacity:0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
        setCopied(true); setTimeout(() => setCopied(false), 2500);
      } catch { /**/ }
    }
    if (navigator.share) {
      navigator.share({ title: station!.name, url })
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })
        .catch(() => navigator.clipboard
          ? navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(copyFallback)
          : copyFallback());
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(copyFallback);
    } else { copyFallback(); }
  }

  // Real star distribution from loaded reviews (not a fabricated split)
  const avg = station.rating_avg ?? 0;
  const total = station.rating_count ?? 0;
  const reviewDist = [5, 4, 3, 2, 1].map(star => reviews.filter(r => r.rating === star).length);

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Space Grotesk',system-ui,sans-serif" }}>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @keyframes spin       { to { transform: rotate(360deg) } }
        @keyframes fade-up    { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
        @keyframes pulse-dot  { 0%,100% { box-shadow:0 0 0 0 rgba(0,230,118,.5) } 50% { box-shadow:0 0 0 6px rgba(0,230,118,0) } }
        .st-fade   { animation: fade-up .5s cubic-bezier(.16,1,.3,1) both }
        .st-fade-2 { animation: fade-up .5s cubic-bezier(.16,1,.3,1) .1s both }
        .st-fade-3 { animation: fade-up .5s cubic-bezier(.16,1,.3,1) .18s both }

        .charger-card { transition: transform .18s, box-shadow .18s, border-color .18s; cursor: pointer }
        .charger-card:hover { transform: translateY(-2px) }
        .charger-card.avail:hover { box-shadow: ${isLight?"0 8px 32px rgba(0,200,98,.14)":"0 0 0 1px rgba(0,230,118,.14),0 8px 36px rgba(0,0,0,.45)"} !important }
        .charger-card.sel { border-color: ${accentBrd} !important; box-shadow: ${isLight?"0 0 0 3px rgba(0,200,98,.12)":"0 0 0 1px rgba(0,230,118,.18),0 0 30px rgba(0,0,0,.3)"} !important }

        .tab-btn { transition: all .16s; border-bottom: 2px solid transparent }
        .tab-btn.active { border-bottom-color: ${accent}; color: ${textPrimary} !important }
        .tab-btn:hover:not(.active) { color: ${textPrimary} !important }

        .action-btn { transition: all .18s }
        .action-btn:hover { transform: translateY(-2px); box-shadow: ${isLight?"0 4px 16px rgba(0,0,0,.10)":"0 4px 20px rgba(0,0,0,.4)"} }

        .book-cta { transition: all .22s cubic-bezier(.16,1,.3,1) }
        .book-cta:hover:not(:disabled) { transform: translateY(-3px); box-shadow: ${isLight?"0 10px 36px rgba(0,200,98,.5)":"0 0 50px rgba(0,230,118,.32)"} !important }

        .station-layout { display:grid; grid-template-columns:minmax(0,920px) minmax(340px,460px); gap:32px; align-items:start; justify-content:center }
        @media(max-width:1400px) { .station-layout { grid-template-columns:1fr 380px } }
        @media(max-width:900px) { .station-layout { grid-template-columns:1fr } }

        .pulse-dot { animation: pulse-dot 2s infinite }
      `}</style>

      <NavBar />

      {/* ═══ HERO ═══ */}
      <div style={{ position: "relative", height: 340, overflow: "hidden", background: heroBg }}>

        {/* Canvas animation — theme-matched background */}
        <HeroBanner isLight={isLight} />

        {/* Back + share buttons */}
        <div style={{ position: "absolute", top: 22, left: 24, right: 24, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
          <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, background: heroBtnBg, border: `1px solid ${heroBtnBorder}`, color: heroBtnText, cursor: "pointer", display: "grid", placeItems: "center", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", transition: "all .15s" }}>
            <ArrowLeft size={16} strokeWidth={2.3}/>
          </button>
          <button onClick={handleShare} style={{ width: 40, height: 40, borderRadius: 12, background: copied?(isLight?"rgba(0,200,98,.16)":"rgba(0,230,118,.18)"):heroBtnBg, border: `1px solid ${copied?(isLight?"rgba(0,164,85,.4)":"rgba(0,230,118,.5)"):heroBtnBorder}`, color: copied?accent:heroBtnText, cursor: "pointer", display: "grid", placeItems: "center", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", transition: "all .2s" }}>
            {copied ? <Check size={15}/> : <Share2 size={15}/>}
          </button>
        </div>

        {/* Hero content */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "28px 28px 24px", background: heroScrim }}>
          {/* Badges row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {hasDC && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: isLight?"rgba(0,164,85,.14)":"rgba(0,83,43,.9)", border: `1px solid ${isLight?"rgba(0,164,85,.4)":"rgba(0,164,85,.6)"}`, color: isLight?"#0A7A3F":"#4DFFA6", backdropFilter: "blur(8px)" }}>
                <Zap size={9} fill={isLight?"#0A7A3F":"#4DFFA6"} color={isLight?"#0A7A3F":"#4DFFA6"}/> {maxPower >= 50 ? "Fast DC" : "DC"} · {maxPower} kW
              </span>
            )}
            {chargers.some(c => c.charger_type === "AC") && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: isLight?"rgba(8,145,178,.10)":"rgba(34,211,238,.12)", border: `1px solid ${isLight?"rgba(8,145,178,.3)":"rgba(34,211,238,.35)"}`, color: isLight?"#0891B2":"#22D3EE", backdropFilter: "blur(8px)" }}>
                <Plug size={10} color={isLight?"#0891B2":"#22D3EE"}/> AC · {chargers.filter(c=>c.charger_type==="AC").reduce((m,c)=>Math.max(m,c.power_kw),0)} kW
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: heroPillBg, border: `1px solid ${heroPillBorder}`, color: heroMetaFaint, backdropFilter: "blur(8px)" }}>
              From ₹{(minPrice/100).toFixed(0)}/kWh
            </span>
          </div>

          {/* Station name */}
          <h1 style={{ fontSize: "clamp(20px,3.5vw,34px)", fontWeight: 800, letterSpacing: "-.04em", color: heroTitle, marginBottom: 10, lineHeight: 1.1 }}>{station.name}</h1>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {avg > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: heroMetaSub }}>
                <Star size={12} fill="#FFC043" color="#FFC043"/>
                <strong style={{ color: heroTitle, fontWeight: 700 }}>{avg.toFixed(1)}</strong>
                <span style={{ color: heroMetaMuted }}>({total} reviews)</span>
              </span>
            )}
            {(station.city || station.address) && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: heroMetaFaint }}>
                <MapPin size={11} color={heroMetaMuted}/> {station.city}{station.city && station.address ? " · " : ""}{station.address?.slice(0,50)}{(station.address?.length??0)>50?"…":""}
              </span>
            )}
          </div>

          {/* Glass stats bar */}
          <div style={{ display: "flex", gap: 0, marginTop: 20, background: heroStatBarBg, border: `1px solid ${heroStatBarBrd}`, borderRadius: 16, overflow: "hidden", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
            {[
              { label: "CHARGERS", val: `${chargers.length}` },
              { label: "AVAILABLE", val: `${available.length}`, green: available.length > 0 },
              { label: "MAX POWER", val: maxPower > 0 ? `${maxPower} kW` : "—", mono: true },
              { label: "STATUS",    val: station.status === "AVAILABLE" ? "Open" : station.status === "OFFLINE" ? "Offline" : "Partial", green: station.status === "AVAILABLE" },
              { label: "SESSIONS TODAY", val: stats ? `${stats.sessions_today}` : "—", mono: true },
              { label: "UPTIME", val: stats ? `${stats.uptime_pct}%` : "—", mono: true, green: (stats?.uptime_pct ?? 0) >= 95 },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ flex: 1, padding: "12px 14px", textAlign: "center", borderRight: i < arr.length-1 ? `1px solid ${heroStatDivider}` : "none" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", color: heroStatLabel, marginBottom: 5, textTransform: "uppercase" }}>{item.label}</div>
                <div style={{ fontFamily: item.mono?"'JetBrains Mono',monospace":undefined, fontWeight: 800, fontSize: 16, color: item.green?accent:heroStatVal, lineHeight: 1 }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="st-fade" style={{ width: "100%", padding: "28px clamp(20px,4vw,56px) 120px", boxSizing: "border-box" }}>
        <div className="station-layout">

          {/* ══ LEFT ══ */}
          <div>
            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="action-btn" style={{ flex: 1, padding: "13px 16px", borderRadius: 14, background: cardBg, border: `1px solid ${cardBorder}`, color: textPrimary, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none", boxShadow: isLight?"0 1px 6px rgba(0,0,0,.06)":"none" }}>
                <Navigation size={14} color={accent}/> Get Directions
              </a>
              <button onClick={handleShare} className="action-btn" style={{ flex: 1, padding: "13px 16px", borderRadius: 14, background: copied?accentDim:cardBg, border: `1px solid ${copied?accentBrd:cardBorder}`, color: copied?accent:textPrimary, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: isLight?"0 1px 6px rgba(0,0,0,.06)":"none" }}>
                {copied ? <><Check size={14}/> Copied!</> : <><Share2 size={14}/> Share</>}
              </button>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${cardBorder}`, marginBottom: 20 }}>
              {(["chargers","about","reviews"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className={`tab-btn${activeTab===t?" active":""}`} style={{ padding: "11px 18px", background: "none", border: "none", borderBottom: `2px solid ${activeTab===t?accent:"transparent"}`, color: activeTab===t?textPrimary:textSub, fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", transition: "all .16s", fontFamily: "inherit" }}>
                  {t === "chargers" ? `Chargers (${chargers.length})` : t === "reviews" ? `Reviews${total>0?` (${total})`:""}` : "About"}
                </button>
              ))}
            </div>

            {/* ── CHARGERS TAB ── */}
            {activeTab === "chargers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {chargers.length === 0 && (
                  <div style={{ padding: "40px 24px", textAlign: "center", background: cardBg, borderRadius: 18, border: `1px solid ${cardBorder}` }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: raisedBg, border: `1px solid ${cardBorder}`, display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
                      <Plug size={22} color={textMuted}/>
                    </div>
                    <p style={{ color: textSub, fontSize: 14 }}>No chargers registered yet.</p>
                  </div>
                )}
                {chargers.map((c: Charger) => {
                  const s    = STATUS_STYLE[c.status] ?? STATUS_STYLE.OFFLINE;
                  const isAv = c.status === "AVAILABLE";
                  const isSel= selCharger?.id === c.id;
                  return (
                    <div key={c.id} className={`charger-card${isAv?" avail":""}${isSel?" sel":""}`}
                      onClick={() => setSelCharger(c)}
                      style={{ background: cardBg, border: `1.5px solid ${isSel?accentBrd:isAv?"rgba(0,230,118,.12)":cardBorder}`, borderRadius: 20, padding: "18px 20px", boxShadow: isSel&&!isLight?"0 0 0 1px rgba(0,230,118,.15),0 4px 24px rgba(0,0,0,.35)":isLight?"0 1px 6px rgba(0,0,0,.05)":"none" }}>

                      {/* Top row */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        {/* Icon */}
                        <div style={{ width: 50, height: 50, borderRadius: 15, flexShrink: 0, background: isAv?accentDim:raisedBg, border: `1.5px solid ${isAv?accentBrd:cardBorder}`, display: "grid", placeItems: "center", position: "relative" }}>
                          {c.charger_type === "DC"
                            ? <Zap size={22} color={isAv?accent:textSub} fill={isAv?accent:"none"}/>
                            : <Plug size={22} color={isAv?accent:textSub} strokeWidth={2}/>
                          }
                          {isSel && <div style={{ position: "absolute", top: -4, right: -4, width: 12, height: 12, borderRadius: "50%", background: accent, border: `2px solid ${cardBg}` }}/>}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: textPrimary }}>{c.label}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: c.charger_type==="DC"?accentDim:"rgba(34,211,238,.08)", border: `1px solid ${c.charger_type==="DC"?accentBrd:"rgba(34,211,238,.22)"}`, color: c.charger_type==="DC"?accent:"#22D3EE" }}>{c.charger_type}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: raisedBg, border: `1px solid ${cardBorder}`, color: textMuted }}>{c.connector_type}</span>
                          </div>
                          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                            <span style={{ color: textSub }}><span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: textPrimary }}>{c.power_kw}</span> kW</span>
                            <span style={{ color: textSub }}>₹<span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: textPrimary }}>{(c.price_per_kwh/100).toFixed(0)}</span>/kWh</span>
                            <span style={{ color: textMuted, display: "flex", alignItems: "center", gap: 4 }}><Clock size={10}/> {estChargeTime(c.power_kw)} full charge</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                            <span className={isAv?"pulse-dot":""} style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, display: "inline-block" }}/>
                            {s.label}
                          </span>
                        </div>
                      </div>

                      {/* Power bar */}
                      <div style={{ margin: "16px 0 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: textMuted, marginBottom: 6, letterSpacing: ".06em", textTransform: "uppercase" }}>
                          <span>Power output</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{c.power_kw} / {Math.max(150, maxPower)} kW</span>
                        </div>
                        <div style={{ height: 6, background: isLight?"rgba(0,0,0,.06)":"rgba(255,255,255,.05)", borderRadius: 999, overflow: "hidden", border: `1px solid ${cardBorder}` }}>
                          <div style={{ height: "100%", borderRadius: 999, width: `${Math.min(100,(c.power_kw/Math.max(150,maxPower))*100)}%`, background: c.charger_type==="DC"?`linear-gradient(90deg,${accent},#26F593)`:"linear-gradient(90deg,#22D3EE,#67E8F9)", boxShadow: isAv?`0 0 8px ${accent}60`:"none", transition: "width .5s ease" }}/>
                        </div>
                      </div>

                      {/* Book row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 12, color: textMuted }}>
                          Est. 30 min session: <strong style={{ color: textSub, fontFamily: "'JetBrains Mono',monospace" }}>₹{((c.price_per_kwh/100)*c.power_kw*0.5).toFixed(0)}</strong>
                        </div>
                        {isAv ? (
                          <button onClick={e => { e.stopPropagation(); router.push(`/bookings/new?charger=${c.id}&station=${id}`); }} style={{ padding: "9px 18px", borderRadius: 11, background: `linear-gradient(135deg,${accent},${isLight?"#00A855":"#00C258"})`, color: "#050708", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: isLight?"0 4px 16px rgba(0,200,98,.35)":"0 0 20px rgba(0,230,118,.20)", transition: "all .18s" }}>
                            Book Now <ChevronRight size={13}/>
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: textMuted }}>Not available</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── ABOUT TAB ── */}
            {activeTab === "about" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Address card */}
                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", boxShadow: isLight?"0 1px 6px rgba(0,0,0,.05)":"none" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 14 }}>Location</div>
                  {station.address && (
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: accentDim, border: `1px solid ${accentBrd}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <MapPin size={16} color={accent}/>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: textPrimary, fontSize: 14, marginBottom: 3 }}>{station.address}</div>
                        {station.city && <div style={{ color: textSub, fontSize: 13 }}>{station.city}</div>}
                      </div>
                    </div>
                  )}
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: accent, textDecoration: "none" }}>
                    <Navigation size={12}/> Open in Maps →
                  </a>
                </div>

                {/* Hours card */}
                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", boxShadow: isLight?"0 1px 6px rgba(0,0,0,.05)":"none" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 14 }}>Operating hours</div>
                  {[
                    { day: "Monday – Friday", hours: "6:00 AM – 11:00 PM" },
                    { day: "Saturday",        hours: "7:00 AM – 11:00 PM" },
                    { day: "Sunday",          hours: "8:00 AM – 10:00 PM" },
                  ].map((r, i, arr) => (
                    <div key={r.day} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i<arr.length-1?`1px solid ${cardBorder}`:"none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Clock size={13} color={textMuted}/>
                        <span style={{ fontSize: 13, color: textSub }}>{r.day}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{r.hours}</span>
                    </div>
                  ))}
                </div>

                {/* Amenities */}
                {station.amenities && station.amenities.length > 0 && (
                  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px 22px", boxShadow: isLight?"0 1px 6px rgba(0,0,0,.05)":"none" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 14 }}>Amenities</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {station.amenities.map((a: string) => {
                        const meta = AMENITY_META[a.toLowerCase()];
                        const AIcon = meta?.Icon;
                        return (
                          <div key={a} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", borderRadius: 12, background: raisedBg, border: `1px solid ${cardBorder}` }}>
                            <span style={{ color: accent, display: "flex" }}>{AIcon ? <AIcon size={13} /> : "•"}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: textSub }}>{meta?.label ?? a}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Safety */}
                <div style={{ background: isLight?"linear-gradient(135deg,#F0FDF4,#ECFDF5)":"rgba(0,230,118,.04)", border: `1px solid ${accentBrd}`, borderRadius: 20, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: accentDim, border: `1px solid ${accentBrd}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Shield size={18} color={accent}/>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: textPrimary, marginBottom: 4 }}>Verified station</div>
                    <div style={{ fontSize: 13, color: textSub, lineHeight: 1.6 }}>This station is certified, regularly inspected, and monitored for safety and uptime. All chargers are covered under Charging Guru&apos;s guarantee.</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── REVIEWS TAB ── */}
            {activeTab === "reviews" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {avg > 0 && (
                  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "24px 22px", boxShadow: isLight?"0 1px 6px rgba(0,0,0,.05)":"none" }}>
                    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                      <div style={{ textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 56, fontWeight: 800, color: textPrimary, lineHeight: 1, marginBottom: 6 }}>{avg.toFixed(1)}</div>
                        <div style={{ color: "#FFC043", fontSize: 18, letterSpacing: 2, marginBottom: 4 }}>{"★".repeat(Math.round(avg))}{"☆".repeat(5-Math.round(avg))}</div>
                        <div style={{ color: textMuted, fontSize: 12 }}>{total} reviews</div>
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        {[5,4,3,2,1].map((s,i) => <StarBar key={s} stars={s} count={reviewDist[i]} total={total}/>)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Leave a review — only shown when the user has an unreviewed completed booking here */}
                {reviewableBooking && (
                  <div style={{ background: cardBg, border: `1px solid ${accentBrd}`, borderRadius: 20, padding: "20px 22px" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: textPrimary, marginBottom: 12 }}>Leave a review</div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setReviewRating(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} aria-label={`${n} star${n>1?"s":""}`}>
                          <Star size={22} fill={n <= reviewRating ? "#FFC043" : "none"} color={n <= reviewRating ? "#FFC043" : textMuted} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="How was your charging experience? (optional)"
                      maxLength={1000}
                      rows={3}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: `1px solid ${cardBorder}`, background: raisedBg, color: textPrimary, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", marginBottom: 12 }}
                    />
                    {reviewError && <div style={{ color: "#FF5A5F", fontSize: 12, marginBottom: 10 }}>{reviewError}</div>}
                    <button onClick={submitReview} disabled={reviewSubmitting} style={{ padding: "10px 20px", borderRadius: 12, background: accent, color: "#050708", fontWeight: 700, fontSize: 13, border: "none", cursor: reviewSubmitting ? "not-allowed" : "pointer", opacity: reviewSubmitting ? 0.6 : 1 }}>
                      {reviewSubmitting ? "Submitting…" : "Submit review"}
                    </button>
                  </div>
                )}

                {/* Review list */}
                {reviews.length > 0 ? (
                  reviews.map(r => (
                    <div key={r.id} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ color: "#FFC043", fontSize: 14, letterSpacing: 1.5 }}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</div>
                        <span style={{ fontSize: 11, color: textMuted }}>{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                      {r.comment && <p style={{ fontSize: 13, color: textSub, lineHeight: 1.6 }}>{r.comment}</p>}
                    </div>
                  ))
                ) : (
                  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "48px 24px", textAlign: "center" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(255,192,67,.12)", border: "1px solid rgba(255,192,67,.28)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                      <Star size={24} color="#FFC043"/>
                    </div>
                    <p style={{ fontWeight: 700, color: textPrimary, marginBottom: 6 }}>No reviews yet</p>
                    <p style={{ color: textSub, fontSize: 13 }}>Be the first to charge here and leave a review.</p>
                  </div>
                )}
              </div>
            )}

            {/* Trust strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 24 }}>
              {[
                { Icon: CheckCircle2, text: "Instant confirmation" },
                { Icon: Lock,         text: "Hold guaranteed"      },
                { Icon: RotateCcw,    text: "Cancel anytime"       },
              ].map(r => (
                <div key={r.text} style={{ padding: "12px 10px", borderRadius: 14, background: accentDim, border: `1px solid ${accentBrd}`, textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                    <r.Icon size={16} color={isLight?"#16A34A":accent} strokeWidth={2.2}/>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isLight?"#16A34A":accent, letterSpacing: ".04em", lineHeight: 1.4 }}>{r.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ══ RIGHT SIDEBAR ══ */}
          <div className="st-fade-2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Book CTA card */}
            <div style={{ background: isLight?"#FFFFFF":"#0E1214", border: `1.5px solid ${accentBrd}`, borderRadius: 22, padding: "22px", boxShadow: isLight?"0 6px 32px rgba(0,200,98,.14)":"0 0 0 1px rgba(0,230,118,.08),0 12px 50px rgba(0,0,0,.5)", overflow: "hidden", position: "relative" }}>
              {/* Glow backdrop */}
              <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle,${accentDim} 0%,transparent 70%)`, pointerEvents: "none" }}/>

              {/* Selected charger info */}
              {bookTarget ? (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: isLight?"#16A34A":accent, marginBottom: 14, opacity: .75 }}>
                    {bookTarget.status === "AVAILABLE" ? "Available now" : "Selected charger"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: accentDim, border: `1px solid ${accentBrd}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Zap size={20} color={accent} fill={accent}/>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: textPrimary }}>{bookTarget.label} · {bookTarget.connector_type}</div>
                      <div style={{ fontSize: 12, color: textSub }}>{bookTarget.charger_type} · {bookTarget.power_kw} kW</div>
                    </div>
                  </div>

                  {/* Price breakdown */}
                  <div style={{ background: raisedBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: textMuted, marginBottom: 12 }}>Pricing</div>
                    {[
                      { label: "Rate",        val: `₹${(bookTarget.price_per_kwh/100).toFixed(0)}/kWh` },
                      { label: "30 min est.", val: `₹${((bookTarget.price_per_kwh/100)*bookTarget.power_kw*0.5).toFixed(0)}` },
                      { label: "1 hr est.",   val: `₹${((bookTarget.price_per_kwh/100)*bookTarget.power_kw*1).toFixed(0)}` },
                      { label: "Full charge", val: `${estChargeTime(bookTarget.power_kw)}` },
                    ].map((r, i, arr) => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i<arr.length-1?`1px solid ${cardBorder}`:"none" }}>
                        <span style={{ fontSize: 12, color: textSub }}>{r.label}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: textPrimary }}>{r.val}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => bookTarget.status === "AVAILABLE" && router.push(`/bookings/new?charger=${bookTarget.id}&station=${id}`)}
                    disabled={bookTarget.status !== "AVAILABLE"}
                    className="book-cta"
                    style={{ width: "100%", padding: "16px", borderRadius: 15, background: bookTarget.status==="AVAILABLE"?`linear-gradient(135deg,${accent},${isLight?"#00A855":"#00C258"})`:(isLight?"#CBD5E1":"#161B1D"), color: bookTarget.status==="AVAILABLE"?"#050708":textMuted, fontSize: 15, fontWeight: 800, border: "none", cursor: bookTarget.status==="AVAILABLE"?"pointer":"not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: bookTarget.status==="AVAILABLE"?isLight?"0 6px 28px rgba(0,200,98,.42)":"0 0 36px rgba(0,230,118,.24)":"none" }}>
                    {bookTarget.status === "AVAILABLE"
                      ? <><Zap size={16} fill="#050708"/> Book Slot Now</>
                      : `${STATUS_STYLE[bookTarget.status]?.label ?? "Unavailable"}`
                    }
                  </button>

                  {available.length > 1 && bookTarget.status !== "AVAILABLE" && available[0] && (
                    <button onClick={() => router.push(`/bookings/new?charger=${available[0].id}&station=${id}`)} style={{ width: "100%", marginTop: 8, padding: "12px", borderRadius: 13, background: accentDim, border: `1px solid ${accentBrd}`, color: accent, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      Switch to {available[0].label} (available) →
                    </button>
                  )}

                  {chargers.length > 1 && (
                    <p style={{ textAlign: "center", fontSize: 11, color: textMuted, marginTop: 10 }}>Tap a charger card to select</p>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 15, background: raisedBg, border: `1px solid ${cardBorder}`, display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
                    <Plug size={20} color={textMuted}/>
                  </div>
                  <div style={{ fontWeight: 700, color: textPrimary, marginBottom: 6 }}>No chargers available</div>
                  <div style={{ fontSize: 13, color: textSub }}>Check back soon.</div>
                </div>
              )}
            </div>

            {/* Station stats */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "20px", boxShadow: isLight?"0 1px 6px rgba(0,0,0,.05)":"none" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 14 }}>Station stats</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Total bays",  val: `${chargers.length}`,                   color: textPrimary },
                  { label: "Available",   val: `${available.length}`,                   color: available.length>0?accent:textPrimary },
                  { label: "Max power",   val: maxPower>0?`${maxPower} kW`:"—",         color: textPrimary },
                  { label: "Rating",      val: avg>0?`${avg.toFixed(1)} ★`:"—",         color: avg>0?"#FFC043":textPrimary },
                ].map(s => (
                  <div key={s.label} style={{ padding: "13px 14px", borderRadius: 14, background: raisedBg, border: `1px solid ${cardBorder}` }}>
                    <div style={{ fontSize: 10, color: textMuted, marginBottom: 6, letterSpacing: ".06em", textTransform: "uppercase" }}>{s.label}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini map */}
            <div style={{ borderRadius: 20, height: 210, overflow: "hidden", position: "relative", cursor: "pointer", border: `1px solid ${cardBorder}`, boxShadow: isLight?"0 1px 6px rgba(0,0,0,.05)":"none" }} onClick={() => window.open(mapsUrl, "_blank")}>
              <MiniMap lat={station.lat} lng={station.lng} name={station.name} isLight={isLight}/>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 16px", background: isLight?"rgba(255,255,255,.92)":"rgba(8,11,12,.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: `1px solid ${cardBorder}`, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: accent }}>
                <Navigation size={13}/> Open in Google Maps ↗
              </div>
            </div>

            {/* Amenities (sidebar duplicate, compact) */}
            {station.amenities && station.amenities.length > 0 && (
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "18px 20px", boxShadow: isLight?"0 1px 6px rgba(0,0,0,.05)":"none" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: textMuted, marginBottom: 12 }}>Amenities</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {station.amenities.map((a: string) => {
                    const meta = AMENITY_META[a.toLowerCase()];
                    const AIcon = meta?.Icon;
                    return (
                      <span key={a} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: raisedBg, border: `1px solid ${cardBorder}`, color: textSub }}>
                        <span style={{ color: accent, display: "flex" }}>{AIcon ? <AIcon size={13} /> : "•"}</span> {meta?.label ?? a}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
