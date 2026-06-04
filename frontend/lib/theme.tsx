"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  effectiveTheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const THEME_STORAGE_KEY = "pulsar_theme_preference";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeScript() {
  const script = `
    (() => {
      try {
        const key = "${THEME_STORAGE_KEY}";
        const stored = window.localStorage.getItem(key);
        const preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
        const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        const theme = preference === "system" ? system : preference;
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      } catch (_) {
        document.documentElement.dataset.theme = "light";
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setPreferenceState(readPreference());
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function sync() {
      const nextTheme = preference === "system" ? systemTheme() : preference;
      setEffectiveTheme(nextTheme);
      applyTheme(nextTheme);
    }

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      effectiveTheme,
      preference,
      setPreference: (nextPreference) => {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
        setPreferenceState(nextPreference);
      }
    }),
    [effectiveTheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme deve ser usado dentro de ThemeProvider.");
  return context;
}
