"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { Tok } from "./tokens";

const COLS = [
  {
    heading: "Platform",
    links: [
      { label: "Discover",      href: "/discover"   },
      { label: "Plan Journey",  href: "/plan"        },
      { label: "Route Planner", href: "/plan"        },
      { label: "Pricing",       href: "#pricing"     },
      { label: "Membership",    href: "/membership"  },
    ],
  },
  {
    heading: "Station Owners",
    links: [
      { label: "Partner Program",   href: "#"       },
      { label: "Station Portal",    href: "/owner"  },
      { label: "Add Station",       href: "/owner"  },
      { label: "Revenue Dashboard", href: "/owner"  },
      { label: "API Docs",          href: "#"       },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About",     href: "#" },
      { label: "Careers",   href: "#" },
      { label: "Investors", href: "#" },
      { label: "Press",     href: "#" },
      { label: "Contact",   href: "#" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Blog",        href: "#"    },
      { label: "FAQs",        href: "#faq" },
      { label: "Help Center", href: "#"    },
      { label: "Support",     href: "#"    },
      { label: "Community",   href: "#"    },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy",    href: "#" },
      { label: "Terms of Service",  href: "#" },
      { label: "Cookie Policy",     href: "#" },
      { label: "Refund Policy",     href: "#" },
      { label: "Grievance Officer", href: "#" },
    ],
  },
];

const SOCIALS = [
  {
    name: "Twitter/X", href: "#",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
      </svg>
    ),
  },
  {
    name: "LinkedIn", href: "#",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
        <circle cx="4" cy="4" r="2"/>
      </svg>
    ),
  },
  {
    name: "Instagram", href: "#",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    name: "YouTube", href: "#",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
      </svg>
    ),
  },
];

/* ─── Cinematic background ─────────────────────────────────────── */
function CinematicBg({ isLight }: { isLight: boolean }) {
  /* Sky colours — dark mode = deep navy/indigo; light mode = daytime blue */
  const skyT = isLight ? "#C4DCED" : "#0D1B4A";
  const skyM = isLight ? "#A6C8E2" : "#0E2255";
  const skyB = isLight ? "#82B2D2" : "#0B1E52";

  /* Mountain silhouette fills — must be darker than sky */
  const mFar = isLight ? "rgba(88,135,170,0.68)"  : "#07101E";
  const mMid = isLight ? "rgba(58,103,145,0.80)"  : "#050C17";
  const mNr  = isLight ? "rgba(35, 78,122,0.90)"  : "#030810";
  const bldg = isLight ? "rgba(22, 55, 95,0.85)"  : "#020611";

  /* Road */
  const rdT  = isLight ? "#688090" : "#0C1828";
  const rdB  = isLight ? "#4E6474" : "#060E18";

  /* Accent colours */
  const green  = isLight ? "#00C85A" : "#00E676";
  const cyan   = "#22D3EE";
  const gold   = "#FFC043";
  const purple = "#C4B5FD";

  /* City window colours (always bright to pop against dark buildings) */
  const wins: [number,number,string][] = [
    [62,335,gold],[80,315,cyan],[85,328,gold],[98,315,green],
    [112,342,cyan],[153,327,gold],[162,340,cyan],[170,353,gold],
    [213,337,green],[221,349,cyan],[242,352,gold],[262,341,purple],
    [1182,330,gold],[1202,313,cyan],[1208,325,green],[1240,342,gold],
    [1248,355,cyan],[1282,325,gold],[1292,338,cyan],[1312,345,green],
    [1335,334,gold],[1363,352,purple],[1388,339,cyan],[1416,349,gold],
  ];

  /* Floating particles */
  const pts: [number,number,string,number,number][] = [
    [280,510,green,0,4],[420,528,cyan,1.2,5],[580,518,green,0.6,3.5],
    [720,535,gold,2,4.5],[860,522,cyan,0.4,5],[1000,530,green,1.8,4],
    [1152,508,purple,3,3.8],[1302,525,gold,0.9,4.5],[348,548,green,2.5,5.5],
    [648,542,cyan,0.2,4],[952,538,gold,1.5,3.5],[1252,545,green,2.8,5],
  ];

  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 1440 600"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ftSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={skyT}/>
          <stop offset="45%"  stopColor={skyM}/>
          <stop offset="100%" stopColor={skyB}/>
        </linearGradient>
        <linearGradient id="ftRoad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={rdT}/>
          <stop offset="100%" stopColor={rdB}/>
        </linearGradient>
        {/* Aurora bands — high opacity so they're actually visible */}
        <linearGradient id="ftA1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="transparent"/>
          <stop offset="22%"  stopColor={isLight ? "rgba(0,184,94,0.28)"    : "rgba(0,230,118,0.38)"}/>
          <stop offset="55%"  stopColor={isLight ? "rgba(34,211,238,0.22)"  : "rgba(34,211,238,0.32)"}/>
          <stop offset="82%"  stopColor={isLight ? "rgba(196,181,253,0.16)" : "rgba(196,181,253,0.24)"}/>
          <stop offset="100%" stopColor="transparent"/>
        </linearGradient>
        <linearGradient id="ftA2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="transparent"/>
          <stop offset="35%"  stopColor={isLight ? "rgba(34,211,238,0.18)"  : "rgba(34,211,238,0.25)"}/>
          <stop offset="65%"  stopColor={isLight ? "rgba(0,184,94,0.15)"    : "rgba(0,230,118,0.22)"}/>
          <stop offset="100%" stopColor="transparent"/>
        </linearGradient>
        <linearGradient id="ftHBeam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#FFFDE7" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#FFFDE7" stopOpacity="0"/>
        </linearGradient>
        <radialGradient id="ftHGlow" cx="50%" cy="100%" r="55%">
          <stop offset="0%"   stopColor={green} stopOpacity="0.14"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        <filter id="ftSBlur"><feGaussianBlur stdDeviation="14"/></filter>
        <filter id="ftHBlur"><feGaussianBlur stdDeviation="5"/></filter>
        <filter id="ftGlw" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* SKY */}
      <rect width="1440" height="600" fill="url(#ftSky)"/>

      {/* Stars — only dark mode, clearly visible */}
      {!isLight && ([
        [108,32,1.4,0.80,2.5],[242,20,1.0,0.65,3.2],[388,46,1.5,0.90,2.0],
        [552,16,1.1,0.72,4.0],[688,36,0.9,0.60,3.5],[818,24,1.3,0.82,2.8],
        [952,50,1.0,0.68,3.0],[1082,28,1.5,0.88,2.2],[1218,42,1.1,0.75,3.8],
        [1368,26,1.0,0.62,2.6],[63,70,0.9,0.55,4.2],[308,86,1.2,0.70,3.1],
        [478,63,1.4,0.80,2.4],[638,78,1.0,0.63,3.6],[788,93,0.8,0.55,2.9],
        [968,73,1.2,0.72,3.3],[1128,80,1.4,0.82,2.7],[1288,66,1.0,0.65,4.1],
      ] as [number,number,number,number,number][]).map(([x,y,r,o,dur],i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="white" opacity={o}>
          <animate attributeName="opacity"
            values={`${o*0.35};${o};${o*0.35}`}
            dur={`${dur}s`} repeatCount="indefinite" begin={`${(i*0.38)%4}s`}/>
        </circle>
      ))}

      {/* Aurora bands */}
      <ellipse cx="720" cy="95" rx="940" ry="72" fill="url(#ftA1)">
        <animate attributeName="ry" values="72;90;72" dur="9s" repeatCount="indefinite"/>
        <animate attributeName="cy" values="95;110;95" dur="9s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="440" cy="142" rx="510" ry="44" fill="url(#ftA2)">
        <animate attributeName="cx" values="440;540;440" dur="13s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="44;54;44" dur="13s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="1060" cy="128" rx="420" ry="34"
        fill={isLight ? "rgba(196,181,253,0.15)" : "rgba(196,181,253,0.22)"}>
        <animate attributeName="cx" values="1060;960;1060" dur="16s" repeatCount="indefinite"/>
      </ellipse>

      {/* Back mountains — 3 layers */}
      <path d="M0,328 L90,268 L178,294 L258,254 L358,274 L448,240 L542,264
               L638,234 L720,254 L802,232 L892,260 L988,238 L1078,262
               L1172,244 L1268,268 L1358,247 L1440,270 L1440,600 L0,600 Z"
        fill={mFar}/>
      <path d="M0,374 L78,320 L168,347 L258,308 L358,337 L448,295 L538,322
               L638,288 L720,314 L802,285 L898,310 L998,288 L1088,314
               L1182,292 L1278,320 L1378,299 L1440,324 L1440,600 L0,600 Z"
        fill={mMid}/>
      <path d="M0,420 L68,374 L158,400 L248,362 L342,388 L438,350 L528,378
               L622,344 L720,368 L818,342 L912,368 L1002,348 L1098,372
               L1192,354 L1288,378 L1378,357 L1440,380 L1440,600 L0,600 Z"
        fill={mNr}/>

      {/* City skyline — left cluster */}
      <g fill={bldg}>
        <rect x="28"  y="346" width="20" height="58"/>
        <rect x="53"  y="328" width="16" height="76"/>
        <rect x="73"  y="310" width="28" height="94"/>
        <rect x="105" y="340" width="18" height="64"/>
        <rect x="127" y="354" width="14" height="50"/>
        <rect x="145" y="322" width="32" height="82"/>
        <rect x="181" y="344" width="19" height="60"/>
        <rect x="204" y="332" width="25" height="72"/>
        <rect x="233" y="349" width="16" height="55"/>
        <rect x="253" y="337" width="22" height="67"/>
        <rect x="86"  y="294" width="2"  height="18"/>
        <circle cx="87" cy="292" r="2.5" fill={bldg}/>
      </g>

      {/* City skyline — right cluster */}
      <g fill={bldg}>
        <rect x="1147" y="342" width="24" height="62"/>
        <rect x="1175" y="325" width="18" height="79"/>
        <rect x="1197" y="307" width="33" height="97"/>
        <rect x="1234" y="338" width="20" height="66"/>
        <rect x="1258" y="351" width="16" height="53"/>
        <rect x="1278" y="320" width="28" height="84"/>
        <rect x="1310" y="342" width="18" height="62"/>
        <rect x="1332" y="330" width="24" height="74"/>
        <rect x="1360" y="347" width="20" height="57"/>
        <rect x="1384" y="335" width="26" height="69"/>
        <rect x="1414" y="344" width="26" height="60"/>
        <rect x="1212" y="291" width="2"  height="18"/>
        <circle cx="1213" cy="289" r="2.5" fill={bldg}/>
      </g>

      {/* City window lights — bright, clearly visible */}
      {wins.map(([x,y,color],i) => (
        <rect key={i} x={x} y={y} width="4.5" height="4.5" rx="0.8"
          fill={color} opacity={isLight ? 0.60 : 0.88}>
          <animate attributeName="opacity"
            values={isLight ? "0.60;0.10;0.60" : "0.88;0.15;0.88"}
            dur={`${2+(i%6)*0.4}s`} repeatCount="indefinite" begin={`${(i*0.32)%4.5}s`}/>
        </rect>
      ))}

      {/* Atmospheric haze */}
      <ellipse cx="720" cy="418" rx="990" ry="50"
        fill={isLight ? "rgba(210,230,248,0.35)" : "rgba(10,22,55,0.45)"}
        filter="url(#ftSBlur)"/>

      {/* HIGHWAY */}
      {/* Shoulders */}
      <polygon points="188,600 238,600 524,430 504,430"
        fill={isLight ? "rgba(185,210,228,0.4)" : "rgba(14,24,44,0.5)"}/>
      <polygon points="1202,600 1252,600 936,430 916,430"
        fill={isLight ? "rgba(185,210,228,0.4)" : "rgba(14,24,44,0.5)"}/>
      {/* Road surface */}
      <polygon points="220,600 1220,600 930,430 510,430" fill="url(#ftRoad)"/>
      {/* Edge glow strips */}
      <line x1="220" y1="600" x2="510" y2="430"
        stroke={isLight ? "rgba(0,180,80,0.50)" : "rgba(0,230,118,0.40)"} strokeWidth="2.5"/>
      <line x1="1220" y1="600" x2="930" y2="430"
        stroke={isLight ? "rgba(0,180,80,0.50)" : "rgba(0,230,118,0.40)"} strokeWidth="2.5"/>
      {/* Green ambient reflection on road */}
      <polygon points="220,600 1220,600 930,430 510,430"
        fill={isLight ? "rgba(0,180,80,0.07)" : "rgba(0,230,118,0.08)"}/>
      {/* Horizon glow */}
      <ellipse cx="720" cy="430" rx="260" ry="18"
        fill={green} opacity={isLight ? 0.08 : 0.14}/>
      <rect width="1440" height="600" fill="url(#ftHGlow)"/>
      {/* Centre dashes */}
      {[0.05,0.14,0.24,0.35,0.47,0.60,0.74,0.88,0.96].map((t,i) => {
        const y  = 430 + (600-430)*t;
        const sw = 0.9 + 2.2*(1-t);
        return <line key={i} x1={720} y1={y} x2={720} y2={y+10+26*(1-t)}
          stroke={isLight ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.40)"}
          strokeWidth={sw}/>;
      })}

      {/* EV CHARGING STATION — left roadside */}
      <ellipse cx="362" cy="575" rx="62" ry="13"
        fill={green} opacity="0.09" filter="url(#ftSBlur)"/>
      <rect x="359" y="490" width="6" height="87" rx="3"
        fill={isLight ? "rgba(0,155,75,0.35)" : "rgba(0,230,118,0.22)"}/>
      <rect x="340" y="455" width="44" height="56" rx="7"
        fill={isLight ? "rgba(210,240,228,0.65)" : "rgba(0,18,10,0.90)"}
        stroke={isLight ? "rgba(0,180,80,0.60)" : "rgba(0,230,118,0.50)"} strokeWidth="1.5"/>
      <rect x="347" y="463" width="30" height="22" rx="3"
        fill={isLight ? "rgba(0,210,100,0.32)" : "rgba(0,230,118,0.20)"}/>
      <rect x="347" y="463" width="30" height="22" rx="3"
        fill={green} opacity="0.12">
        <animate attributeName="opacity" values="0.12;0.45;0.12" dur="2.2s" repeatCount="indefinite"/>
      </rect>
      <text x="362" y="479" textAnchor="middle" fontSize="13"
        fill={green} opacity="1">⚡</text>
      <circle cx="350" cy="493" r="3" fill={green}>
        <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="360" cy="493" r="3" fill={gold} opacity="0.8"/>
      <path d="M384,479 Q432,494 464,508"
        stroke={isLight ? "rgba(0,180,80,0.45)" : "rgba(0,230,118,0.38)"}
        strokeWidth="2.5" fill="none" strokeDasharray="5,5">
        <animate attributeName="strokeDashoffset" values="0;-10" dur="0.85s" repeatCount="indefinite"/>
      </path>
      <circle cx="362" cy="575" r="0" fill="none" stroke={green} strokeWidth="1.8">
        <animate attributeName="r"       values="0;58;0"      dur="3.8s" repeatCount="indefinite" begin="0s"/>
        <animate attributeName="opacity" values="0.4;0;0.4"   dur="3.8s" repeatCount="indefinite" begin="0s"/>
      </circle>
      <circle cx="362" cy="575" r="0" fill="none" stroke={green} strokeWidth="1">
        <animate attributeName="r"       values="0;58;0"      dur="3.8s" repeatCount="indefinite" begin="1.9s"/>
        <animate attributeName="opacity" values="0.25;0;0.25" dur="3.8s" repeatCount="indefinite" begin="1.9s"/>
      </circle>

      {/* EV CAR #1 — main, moving right to left */}
      <g>
        <animateMotion path="M1860,543 L-320,543" dur="15s" repeatCount="indefinite" begin="0s"/>
        <ellipse cx="0" cy="26" rx="72" ry="7" fill="rgba(0,0,0,0.20)" opacity="0.5"/>
        <rect x="-74" y="-23" width="148" height="23" rx="6"
          fill={isLight ? "#2C3E50" : "#10203A"}/>
        <path d="M-28,-23 Q-10,-44 16,-44 Q52,-44 62,-23"
          fill={isLight ? "#34495E" : "#152848"}/>
        <ellipse cx="-77" cy="-14" rx="6" ry="4.5" fill="#FFFDE7" opacity="0.95"/>
        <ellipse cx="-77" cy="-6"  rx="5" ry="3.5" fill="#FFF9C4" opacity="0.88"/>
        <path d="M-83,-18 L-250,-9 L-250,-24 Z"
          fill="url(#ftHBeam)" opacity="0.30" filter="url(#ftHBlur)"/>
        <rect x="71" y="-21" width="8" height="7" rx="2" fill="#FF3B30" opacity="0.92">
          <animate attributeName="opacity" values="0.92;0.35;0.92" dur="1.2s" repeatCount="indefinite"/>
        </rect>
        <rect x="71" y="-13" width="8" height="5" rx="1" fill="#FF3B30" opacity="0.5"/>
        <rect x="69" y="-8" width="10" height="6" rx="2" fill={green} opacity="0.75">
          <animate attributeName="opacity" values="0.75;1;0.75" dur="2s" repeatCount="indefinite"/>
        </rect>
        <circle cx="-50" cy="0" r="12" fill={isLight ? "#1A202C" : "#070C18"}/>
        <circle cx="-50" cy="0" r="5"  fill={isLight ? "#4A5568" : "#2A3548"}/>
        <circle cx="50"  cy="0" r="12" fill={isLight ? "#1A202C" : "#070C18"}/>
        <circle cx="50"  cy="0" r="5"  fill={isLight ? "#4A5568" : "#2A3548"}/>
        <rect x="-70" y="-11" width="140" height="2" rx="1" fill="rgba(255,255,255,0.08)"/>
      </g>

      {/* EV CAR #2 — trailing, slower */}
      <g opacity="0.50">
        <animateMotion path="M2100,533 L-320,533" dur="20s" repeatCount="indefinite" begin="7s"/>
        <ellipse cx="0" cy="20" rx="54" ry="6" fill="rgba(0,0,0,0.16)" opacity="0.5"/>
        <rect x="-55" y="-18" width="110" height="18" rx="5"
          fill={isLight ? "#374151" : "#0E1E38"}/>
        <path d="M-18,-18 Q-6,-33 12,-33 Q36,-33 46,-18"
          fill={isLight ? "#4B5563" : "#122240"}/>
        <ellipse cx="-57" cy="-10" rx="5" ry="4" fill="#FFFDE7" opacity="0.92"/>
        <path d="M-62,-14 L-175,-7 L-175,-18 Z"
          fill="url(#ftHBeam)" opacity="0.22" filter="url(#ftHBlur)"/>
        <rect x="53" y="-16" width="7" height="6" rx="1.5" fill="#FF3B30" opacity="0.82">
          <animate attributeName="opacity" values="0.82;0.28;0.82" dur="1.2s" repeatCount="indefinite"/>
        </rect>
        <circle cx="-38" cy="0" r="10" fill={isLight ? "#1F2937" : "#060A14"}/>
        <circle cx="38"  cy="0" r="10" fill={isLight ? "#1F2937" : "#060A14"}/>
      </g>

      {/* Light streaks (motion blur) */}
      <line x1="0" y1="551" x2="180" y2="551" stroke={green} strokeWidth="1.6" opacity="0">
        <animateMotion path="M-200,0 L1660,0" dur="4.5s" repeatCount="indefinite" begin="0s"/>
        <animate attributeName="opacity" values="0;0.55;0.55;0" keyTimes="0;0.06;0.88;1" dur="4.5s" repeatCount="indefinite" begin="0s"/>
      </line>
      <line x1="0" y1="560" x2="240" y2="560" stroke={cyan} strokeWidth="1.1" opacity="0">
        <animateMotion path="M-200,0 L1660,0" dur="6s" repeatCount="indefinite" begin="2s"/>
        <animate attributeName="opacity" values="0;0.40;0.40;0" keyTimes="0;0.06;0.88;1" dur="6s" repeatCount="indefinite" begin="2s"/>
      </line>
      <line x1="0" y1="568" x2="120" y2="568" stroke={gold} strokeWidth="0.9" opacity="0">
        <animateMotion path="M-200,0 L1660,0" dur="8s" repeatCount="indefinite" begin="4s"/>
        <animate attributeName="opacity" values="0;0.30;0.30;0" keyTimes="0;0.06;0.88;1" dur="8s" repeatCount="indefinite" begin="4s"/>
      </line>
      <line x1="0" y1="557" x2="155" y2="557" stroke={green} strokeWidth="1.3" opacity="0">
        <animateMotion path="M1660,0 L-200,0" dur="5s" repeatCount="indefinite" begin="1.5s"/>
        <animate attributeName="opacity" values="0;0.45;0.45;0" keyTimes="0;0.06;0.88;1" dur="5s" repeatCount="indefinite" begin="1.5s"/>
      </line>

      {/* Floating particles */}
      {pts.map(([x,y,color,del,dur],i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={color} opacity="0">
          <animate attributeName="cy"      values={`${y};${y-42};${y-80}`} dur={`${dur}s`} repeatCount="indefinite" begin={`${del}s`}/>
          <animate attributeName="opacity" values="0;0.88;0"               dur={`${dur}s`} repeatCount="indefinite" begin={`${del}s`}/>
          <animate attributeName="r"       values="2.5;1.6;0.4"            dur={`${dur}s`} repeatCount="indefinite" begin={`${del}s`}/>
        </circle>
      ))}

      {/* Centre road energy flow */}
      <path d="M720,430 L720,600"
        stroke={isLight ? "rgba(0,180,80,0.50)" : "rgba(0,230,118,0.42)"}
        strokeWidth="3.5" fill="none" strokeDasharray="13,20">
        <animate attributeName="strokeDashoffset" values="0;-33" dur="0.85s" repeatCount="indefinite"/>
      </path>
      <circle r="5" fill={green} filter="url(#ftGlw)">
        <animateMotion path="M720,430 L720,600" dur="2.4s" repeatCount="indefinite" begin="0s"/>
        <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.1;0.85;1" dur="2.4s" repeatCount="indefinite" begin="0s"/>
      </circle>
      <circle r="4" fill={cyan} filter="url(#ftGlw)">
        <animateMotion path="M720,430 L720,600" dur="2.4s" repeatCount="indefinite" begin="1.2s"/>
        <animate attributeName="opacity" values="0;0.85;0.85;0" keyTimes="0;0.1;0.85;1" dur="2.4s" repeatCount="indefinite" begin="1.2s"/>
      </circle>
    </svg>
  );
}

/* ─── Footer link ──────────────────────────────────────────────── */
function FooterLink({ label, href, isLight, accent }: {
  label: string; href: string; isLight: boolean; accent: string;
}) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 13.5, textDecoration: "none", display: "inline-block",
        lineHeight: 1.4, transition: "color .15s, transform .15s",
        color: isLight ? "#1E3A4A" : "#C0CDD8",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.color = accent; el.style.transform = "translateX(4px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.color = isLight ? "#1E3A4A" : "#C0CDD8"; el.style.transform = "none";
      }}
    >{label}</Link>
  );
}

/* ─── Footer ───────────────────────────────────────────────────── */
export default function Footer({ isLight }: { isLight: boolean; t: Tok }) {
  const [email, setEmail]               = useState("");
  const [subscribed, setSubscribed]     = useState(false);
  const [online, setOnline]             = useState(1284);
  const [liveChargers, setLiveChargers] = useState(3847);

  const accent    = isLight ? "#00C85A" : "#00E676";
  const accentDim = isLight ? "rgba(0,200,90,0.10)" : "rgba(0,230,118,0.08)";

  useEffect(() => {
    const id = setInterval(() => {
      setOnline(v => v + Math.floor(Math.random() * 5) - 2);
      setLiveChargers(v => v + Math.floor(Math.random() * 3) - 1);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSubscribed(true);
  }

  /* Footer base — matches sky top colour exactly */
  const footerBg = isLight ? "#C4DCED" : "#0D1B4A";

  /* Glassmorphism panel tokens */
  const glassBg  = isLight ? "rgba(255,255,255,0.76)" : "rgba(8,16,42,0.84)";
  const glassBdr = isLight ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.10)";
  const glassSdw = isLight
    ? "0 4px 40px rgba(0,0,0,0.10), inset 0 1px 0 #fff"
    : "0 4px 40px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.06)";

  /* Text tokens */
  const txt      = isLight ? "#0D1624" : "#E8ECEF";
  const txtSub   = isLight ? "#374151" : "#B8C4CE";
  const txtMuted = isLight ? "#4A5869" : "#8A97A5";

  const STATS = [
    { v: "1,240+", l: "Stations", c: accent    },
    { v: "50K+",   l: "Drivers",  c: "#22D3EE" },
    { v: "99.8%",  l: "Uptime",   c: "#FFC043" },
    { v: "₹340",   l: "Avg saved",c: "#C4B5FD" },
  ];

  const colHead = isLight ? "#1E3A4A" : "#A0B0C0";

  return (
    <footer style={{
      background: footerBg,
      borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)"}`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Cinematic scene */}
      <CinematicBg isLight={isLight} />

      {/* Very subtle bottom-darkening overlay — keeps scene visible at top */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: isLight
          ? "linear-gradient(180deg, transparent 40%, rgba(196,220,237,0.22) 100%)"
          : "linear-gradient(180deg, transparent 35%, rgba(5,10,28,0.22) 100%)",
      }}/>

      {/* ── Newsletter / CTA band ── */}
      <div className="footer-newsletter-outer" style={{ position: "relative", zIndex: 2, padding: "52px clamp(16px,4vw,56px) 0" }}>
        <div className="footer-newsletter footer-newsletter-grid" style={{
          background: glassBg,
          border: `1px solid ${glassBdr}`,
          borderRadius: 24,
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          boxShadow: glassSdw,
          padding: "clamp(28px,4vw,48px) clamp(20px,4vw,52px)",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(28px,5vw,72px)", alignItems: "center",
        }}>
          {/* Left — tagline + stats */}
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 18,
              background: isLight ? "rgba(0,200,90,0.10)" : "rgba(0,230,118,0.09)",
              border: `1px solid ${isLight ? "rgba(0,200,90,0.28)" : "rgba(0,230,118,0.20)"}`,
              borderRadius: 999, padding: "5px 16px",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: accent, display: "inline-block",
                boxShadow: `0 0 9px ${accent}`,
                animation: "glow-pulse 2s ease-in-out infinite",
              }}/>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".13em", color: accent }}>
                POWERED BY INDIA
              </span>
            </div>

            <h3 style={{
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: "clamp(22px,2.2vw,36px)", fontWeight: 800,
              letterSpacing: "-.03em", lineHeight: 1.12,
              color: txt, marginBottom: 14,
            }}>
              Every kilometre.<br/>Every charger.{" "}
              <span className="footer-covered-gradient">Covered.</span>
            </h3>
            <p style={{ color: txtSub, fontSize: 14.5, lineHeight: 1.78, maxWidth: 410, marginBottom: 28 }}>
              Join 50,000+ EV drivers planning smarter routes, booking guaranteed slots,
              and never worrying about range anxiety again.
            </p>

            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              {STATS.map(s => (
                <div key={s.l} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 99,
                  background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.07)",
                  border: `1px solid ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.09)"}`,
                  backdropFilter: "blur(8px)",
                }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: s.c }}>{s.v}</span>
                  <span style={{ fontSize: 11, color: txtMuted }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — newsletter */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".13em", color: accent, marginBottom: 8 }}>
              STAY IN THE LOOP
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif",
              color: txt, marginBottom: 10, letterSpacing: "-.02em",
            }}>
              Range updates, zero spam
            </div>
            <div style={{ fontSize: 14, color: txtSub, marginBottom: 24, lineHeight: 1.68 }}>
              New stations, exclusive member deals, and smart charging tips — straight to your inbox.
            </div>

            {!subscribed ? (
              <form onSubmit={handleSubscribe}>
                <div style={{
                  display: "flex",
                  background: isLight ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.06)",
                  border: `1.5px solid ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}`,
                  borderRadius: 14, overflow: "hidden", marginBottom: 14,
                  boxShadow: isLight ? "0 2px 12px rgba(0,0,0,0.06)" : "none",
                }}>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com" required
                    style={{
                      flex: 1, padding: "14px 18px", border: "none", outline: "none",
                      fontSize: 14, background: "transparent",
                      color: isLight ? "#111827" : "#E2E8F0",
                    }}
                  />
                  <button type="submit" style={{
                    padding: "14px 22px", border: "none", cursor: "pointer",
                    fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                    background: `linear-gradient(135deg, ${accent}, ${isLight ? "#009E45" : "#00C15A"})`,
                    color: "#FFF", flexShrink: 0,
                    boxShadow: `0 4px 18px ${isLight ? "rgba(0,200,90,0.45)" : "rgba(0,230,118,0.32)"}`,
                    whiteSpace: "nowrap", transition: "opacity .15s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.82"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                  >Subscribe →</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: txtMuted }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  No spam. Secure &amp; private. Leave anytime.
                </div>
              </form>
            ) : (
              <div style={{
                padding: "18px 22px", borderRadius: 14,
                background: isLight ? "rgba(0,200,90,0.08)" : "rgba(0,230,118,0.09)",
                border: `1px solid ${isLight ? "rgba(0,200,90,0.24)" : "rgba(0,230,118,0.20)"}`,
                fontSize: 14, color: accent, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>✓</span>
                You&apos;re on the list! We&apos;ll be in touch.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main footer grid ── */}
      <div style={{ position: "relative", zIndex: 2, padding: `52px clamp(16px,5vw,64px) 0` }}>
        {/* Single frosted strip behind the whole grid — scene shows above & below */}
        <div style={{
          background: isLight ? "rgba(255,255,255,0.30)" : "rgba(5,10,28,0.58)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderRadius: 20,
          padding: "36px 36px 36px",
          marginBottom: 48,
        }}>
        <div className="footer-grid" style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 1.6fr) repeat(auto-fit, minmax(140px, 1fr))",
          gap: "clamp(20px,3vw,40px)",
        }}>

          {/* ── Brand column ── */}
          <div>
            <div style={{
              marginBottom: 20,
              filter: isLight ? "none" : `drop-shadow(0 0 18px rgba(0,230,118,0.25))`,
            }}>
              <Logo size="lg" href="/" theme={isLight ? "light" : "dark"} />
            </div>
            <p style={{ color: txtSub, fontSize: 13.5, lineHeight: 1.82 }}>
              India&apos;s most reliable EV charging platform. Plan every stop,
              reserve guaranteed slots, and charge with confidence.
            </p>
          </div>

          {/* 5 link columns */}
          {COLS.map(col => (
            <div key={col.heading}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: ".14em",
                color: colHead, marginBottom: 20, textTransform: "uppercase",
              }}>
                {col.heading}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {col.links.map(l => (
                  <FooterLink key={l.label} label={l.label} href={l.href}
                    isLight={isLight} accent={accent} />
                ))}
              </div>
            </div>
          ))}

          {/* ── Right column: app buttons + socials ── */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: ".14em",
              color: colHead, marginBottom: 10, textTransform: "uppercase", alignSelf: "flex-end",
            }}>
              Get the App
            </div>

            {/* App store buttons — compact */}
            {[
              {
                store: "App Store",
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.3.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                ),
              },
              {
                store: "Google Play",
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.18 23.76c.38.21.82.22 1.22.04l12.34-7.13-2.65-2.64-10.91 9.73zM20.59 10.17l-2.76-1.6-3.01 3.01 3.01 3.01 2.77-1.61c.79-.46.79-1.35-.01-1.81zM1.55.43C1.21.65 1 1.01 1 1.47v20.99c0 .47.21.84.56 1.05l.1.06L12.97 12.5 1.65.37l-.1.06zM4.4.24L15.31 6.3 12.97 8.63 2.6.51 4.4.24z"/>
                  </svg>
                ),
              },
            ].map(app => (
              <button
                key={app.store}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  padding: "8px 12px", borderRadius: 10, cursor: "pointer",
                  background: isLight ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.06)",
                  border: `1.5px solid ${isLight ? "rgba(0,0,0,0.11)" : "rgba(255,255,255,0.12)"}`,
                  boxShadow: isLight
                    ? "0 2px 10px rgba(0,0,0,0.07), inset 0 1px 0 #fff"
                    : "0 2px 10px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.07)",
                  color: txt, backdropFilter: "blur(12px)",
                  transition: "all .22s cubic-bezier(.2,0,0,1)",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.borderColor = accent;
                  el.style.background = isLight ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.11)";
                  el.style.transform = "translateY(-2px)";
                  el.style.boxShadow = `0 6px 20px ${accent}28, inset 0 1px 0 rgba(255,255,255,0.12)`;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.borderColor = isLight ? "rgba(0,0,0,0.11)" : "rgba(255,255,255,0.12)";
                  el.style.background = isLight ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.06)";
                  el.style.transform = "none";
                  el.style.boxShadow = isLight
                    ? "0 2px 10px rgba(0,0,0,0.07), inset 0 1px 0 #fff"
                    : "0 2px 10px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.07)";
                }}
              >
                <span style={{ color: accent, flexShrink: 0, display: "flex" }}>{app.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: txt, whiteSpace: "nowrap" }}>
                  {app.store}
                </span>
              </button>
            ))}

            {/* Social icons */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 6 }}>
              {SOCIALS.map(s => (
                <a key={s.name} href={s.href} title={s.name} style={{
                  width: 32, height: 32, borderRadius: 9,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isLight ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${isLight ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.09)"}`,
                  color: isLight ? "#1E3A4A" : "#C0CDD8",
                  textDecoration: "none", transition: "all .2s", backdropFilter: "blur(8px)",
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = accentDim; el.style.borderColor = accent;
                    el.style.color = accent; el.style.transform = "translateY(-2px)";
                    el.style.boxShadow = `0 4px 14px ${accent}22`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = isLight ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.06)";
                    el.style.borderColor = isLight ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.09)";
                    el.style.color = isLight ? "#1E3A4A" : "#C0CDD8";
                    el.style.transform = "none"; el.style.boxShadow = "none";
                  }}
                >{s.icon}</a>
              ))}
            </div>
          </div>
        </div>
        </div>{/* end frosted strip */}

        {/* ── Bottom bar ── */}
        <div style={{
          borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)"}`,
          padding: "22px 0 30px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ fontSize: 12.5, color: txtMuted }}>
            © 2026 Charging Guru Technologies Pvt. Ltd. · Made in India 🇮🇳
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {[
              { icon: "🔒", label: "PCI-DSS L1" },
              { icon: "⚡", label: "Razorpay"   },
              { icon: "🛡️", label: "ISO 27001"  },
            ].map(b => (
              <div key={b.label} style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: txtMuted,
                padding: "4px 10px", borderRadius: 7,
                background: isLight ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)"}`,
              }}>
                <span>{b.icon}</span>
                <span style={{ fontWeight: 600 }}>{b.label}</span>
              </div>
            ))}

            <div style={{ width: 1, height: 18, background: isLight ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.07)" }}/>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#00E676", display: "inline-block",
                boxShadow: "0 0 7px #00E676",
                animation: "glow-pulse 2s ease-in-out infinite",
              }}/>
              <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", color: "#00E676" }}>
                {online.toLocaleString()} online
              </span>
              <span style={{ color: isLight ? "#CBD5E1" : "#2D3748" }}>·</span>
              <span style={{ color: txtMuted, fontFamily: "'JetBrains Mono',monospace" }}>
                {liveChargers.toLocaleString()} chargers live
              </span>
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#00E676",
              padding: "4px 10px", borderRadius: 7,
              background: "rgba(0,230,118,0.07)",
              border: "1px solid rgba(0,230,118,0.16)",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E676", display: "inline-block", boxShadow: "0 0 6px #00E676" }}/>
              <span style={{ fontWeight: 700 }}>All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
