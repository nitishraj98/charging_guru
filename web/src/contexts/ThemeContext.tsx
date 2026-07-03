"use client";
import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";

interface ThemeCtx {
  theme: Theme;
  isLight: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function getStoredTheme(fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem("cg_theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {}

  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" || attr === "light" ? attr : fallback;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  document.cookie = `cg_theme=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeProvider({
  children,
  initialTheme = "light",
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  // The first render must match the server. Browser storage is reconciled after hydration.
  // The inline script in layout.tsx already set data-theme correctly before paint,
  // so the CSS variables show the right colors immediately.
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useIsomorphicLayoutEffect(() => {
    const next = getStoredTheme(initialTheme);
    setTheme(next);
    applyTheme(next);
  }, [initialTheme]);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("cg_theme", next);
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isLight: theme === "light", toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
