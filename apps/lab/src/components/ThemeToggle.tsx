"use client";

import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

type Theme = "light" | "dark";

function resolved(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeToggle() {
  // Unknown until mounted: the server has no way to know the theme in use.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => setTheme(resolved()), []);

  const toggle = () => {
    const next: Theme = resolved() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("qx-theme", next);
    } catch {
      // Storage can be unavailable (private mode); the choice then lasts for this page.
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-pressed={theme === "light"}
      aria-label="Light theme"
    >
      <span aria-hidden="true">{theme === "light" ? "Light" : "Dark"}</span>
    </button>
  );
}
