"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

type ThemeMode = "light" | "dark" | "auto";
type ResolvedTheme = "light" | "dark";
type ThemeContextType = {
  theme: ResolvedTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const themeChangeEvent = "courier-theme-change";
let transientMode: ThemeMode | null = null;

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "auto";
}

function readThemeMode(): ThemeMode {
  if (transientMode) return transientMode;
  try {
    const mode = localStorage.getItem("theme-mode");
    if (isThemeMode(mode)) return mode;
    const legacyTheme = localStorage.getItem("theme");
    if (legacyTheme === "light" || legacyTheme === "dark") return legacyTheme;
  } catch {
    // Keep the toggle usable when browser storage is unavailable.
  }
  return "light";
}

function subscribeThemeMode(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(themeChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(themeChangeEvent, onChange);
  };
}

function readSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribeSystemTheme(onChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function setThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem("theme-mode", mode);
    transientMode = null;
  } catch {
    transientMode = mode;
    // The preference still works for this page when storage is blocked.
  }
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useSyncExternalStore(
    subscribeThemeMode,
    readThemeMode,
    () => "light" as ThemeMode,
  );
  const systemDark = useSyncExternalStore(
    subscribeSystemTheme,
    readSystemDark,
    () => false,
  );
  const theme: ResolvedTheme =
    themeMode === "auto" ? (systemDark ? "dark" : "light") : themeMode;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("data-color-scheme", theme);
    // Legacy `theme` is read for migration only. Hydration must not overwrite it.
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        toggleTheme: () => setThemeMode(theme === "light" ? "dark" : "light"),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
