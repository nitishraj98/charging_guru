export const D = {
  bg:         "#0A0D0E",
  surface:    "#101415",
  raised:     "#181D1F",
  border:     "#222829",
  text:       "#E6EBED",
  textSub:    "#98A1A6",
  textMuted:  "#6B7479",
  accent:     "#00E676",
  accentDim:  "#00532B",
  accentBrd:  "#00A455",
  cardBg:     "#101415",
  cardBorder: "#222829",
  cardShadow: "none",
  iconBg:     "radial-gradient(120% 120% at 30% 0%,#0E2A1C,#101415)",
  checkBg:    "#00532B",
  tagBg:      "#00532B",
};

export const L = {
  bg:         "#F3F7FB",         // Warm cool white — not pure #FFF
  surface:    "#FFFFFF",
  raised:     "#EEF2F7",         // Soft blue-grey lifted surface
  border:     "#D8E2ED",
  text:       "#0D1621",         // Near-black with warm undertone
  textSub:    "#374151",         // Strong readable dark grey
  textMuted:  "#6B7280",
  accent:     "#00B85E",         // Slightly deeper green — readable on white
  accentDim:  "#D1FAE5",
  accentBrd:  "#6EE7B7",
  cardBg:     "#FFFFFF",
  cardBorder: "#CBD5E1",
  cardShadow: "0 1px 3px rgba(15,23,42,.05), 0 4px 20px rgba(15,23,42,.07)",
  iconBg:     "linear-gradient(135deg, #D1FAE5, #E0F9EE)",
  checkBg:    "#D1FAE5",
  tagBg:      "#D1FAE5",
};

export type Tok = {
  bg: string; surface: string; raised: string;
  border: string;
  text: string; textSub: string; textMuted: string;
  accent: string; accentDim: string; accentBrd: string;
  cardBg: string; cardBorder: string; cardShadow: string;
  iconBg: string; checkBg: string; tagBg: string;
};
