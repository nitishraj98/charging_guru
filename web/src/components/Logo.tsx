"use client";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string;
  theme?: "dark" | "light";
}

const SIZES = {
  sm: { icon: 32,  title: 16, gap: 10 },
  md: { icon: 42,  title: 21, gap: 13 },
  lg: { icon: 54,  title: 27, gap: 16 },
};

function LogoIcon({ px, uid }: { px: number; uid: string }) {
  return (
    <svg width={px} height={px} viewBox="0 0 48 48" fill="none" style={{ flexShrink: 0, display: "block", overflow: "hidden" }}>
      <defs>
        <radialGradient id={`${uid}a`} cx="38%" cy="22%" r="72%">
          <stop offset="0%"   stopColor="#6FFFC0" />
          <stop offset="45%"  stopColor="#00E676" />
          <stop offset="100%" stopColor="#007A3D" />
        </radialGradient>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#AAFFD4" />
        </linearGradient>
        <radialGradient id={`${uid}c`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#00E676" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}f`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00E676" floodOpacity="0.45" />
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#00E676" floodOpacity="0.18" />
        </filter>
      </defs>
      <circle cx="24" cy="20" r="20" fill={`url(#${uid}c)`} />
      <path d="M24 5C16.3 5 10 11.3 10 19C10 29 24 43 24 43C24 43 38 29 38 19C38 11.3 31.7 5 24 5Z" fill="#000" opacity="0.25" transform="translate(1 2)" />
      <path d="M24 5C16.3 5 10 11.3 10 19C10 29 24 43 24 43C24 43 38 29 38 19C38 11.3 31.7 5 24 5Z" fill={`url(#${uid}a)`} filter={`url(#${uid}f)`} />
      <path d="M18 10C19.5 7.5 22 6 24 5.5C20 7 16 11 15 16C14.5 13 15.5 11.5 18 10Z" fill="white" opacity="0.35" />
      <circle cx="24" cy="19" r="9.5" fill="#040D07" />
      <circle cx="24" cy="19" r="9.5" fill="none" stroke="#00E676" strokeWidth="0.6" opacity="0.5" />
      <path d="M25.5 11.5L17.5 20H22.5L21 26.5L30 17.5H25L25.5 11.5Z" fill={`url(#${uid}b)`} style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.8))" }} />
      <circle cx="24" cy="19" r="12" fill="none" stroke="#00E676" strokeWidth="1.2" style={{ animation: `${uid}_ping 2.8s cubic-bezier(0,.5,.5,1) infinite`, opacity: 0 }} />
      <circle cx="24" cy="19" r="12" fill="none" stroke="#22D3EE" strokeWidth="0.8" style={{ animation: `${uid}_ping 2.8s cubic-bezier(0,.5,.5,1) 0.9s infinite`, opacity: 0 }} />
      <style>{`
        @keyframes ${uid}_ping {
          0%   { opacity: 0.8; transform: scale(1);   transform-origin: 24px 19px; }
          100% { opacity: 0;   transform: scale(2.2); transform-origin: 24px 19px; }
        }
      `}</style>
    </svg>
  );
}

export default function Logo({ size = "md", href = "/", theme = "dark" }: LogoProps) {
  const { icon, title, gap } = SIZES[size];
  const uid = `cg${size}`;

  const chargingColor = theme === "light" ? "#0F172A" : "#F0FFF8";
  const chargingShadow = theme === "light" ? "none" : "0 0 20px rgba(0,230,118,0.3)";

  return (
    <Link href={href} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap, userSelect: "none" }}>
      <LogoIcon px={icon} uid={uid} />
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{
          fontFamily: "'Space Grotesk',system-ui,sans-serif",
          fontWeight: 600, fontSize: title,
          letterSpacing: "0.18em",
          color: chargingColor,
          whiteSpace: "nowrap", lineHeight: 1.2,
          textShadow: chargingShadow,
        }}>CHARGING</span>
        <span style={{
          fontFamily: "'Space Grotesk',system-ui,sans-serif",
          fontWeight: 800,
          fontSize: Math.round(title * 0.72),
          letterSpacing: "0.35em",
          background: "linear-gradient(90deg,#00D26A 0%,#00C4AA 45%,#22D3EE 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          whiteSpace: "nowrap", lineHeight: 1.3,
        }}>GURU</span>
      </span>
    </Link>
  );
}
