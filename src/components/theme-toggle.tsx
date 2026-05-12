"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("gemineye-theme") as Theme | null;
    const nextTheme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : getSystemTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("gemineye-theme", nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full border border-line bg-panel/95 px-4 py-2 text-xs font-semibold text-ink shadow-lg backdrop-blur transition hover:border-accent hover:text-accent"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
