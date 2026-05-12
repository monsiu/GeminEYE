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
      className="button-pop fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full border border-line bg-panel/95 px-4 py-2 text-xs font-semibold text-ink shadow-lg backdrop-blur transition hover:border-accent hover:text-accent"
    >
      <span aria-hidden style={{ color: theme === "dark" ? "var(--signal)" : "var(--accent)" }}>
        {theme === "dark" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 2v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 20v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M4.93 4.93l1.41 1.41" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M17.66 17.66l1.41 1.41" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M2 12h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M20 12h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M4.93 19.07l1.41-1.41" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" />
          </svg>
        )}
      </span>
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
