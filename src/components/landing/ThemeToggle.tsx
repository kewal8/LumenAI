"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "lumenai-landing-theme";
const listeners = new Set<() => void>();

function currentTheme(): Theme {
  return document.documentElement.dataset.landingTheme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.landingTheme = theme;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Light is the default. Dark is opt-in and remembered on this device. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "dark") applyTheme("dark");
    } catch {
      // Storage unavailable (private window): stay on the light default.
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembered, but the switch still works for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-teal-tint hover:text-teal-deep"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
