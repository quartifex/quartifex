"use client";
import { useEffect, useState } from "react";
import { THEME_KEY } from "@/lib/boot";

type Theme = "light" | "dark";

/** The kit's switch, wired to the theme. Light on a first visit; a choice is remembered. */
export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  const dark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      className="sw"
      onClick={() => {
        const next: Theme = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          // Not remembered without storage; the switch still applies to this page.
        }
        setTheme(next);
      }}
    >
      <span className="th" />
    </button>
  );
}
