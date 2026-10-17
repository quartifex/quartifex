"use client";
// One place to scroll from: through Lenis when it runs, natively otherwise (reduced motion).
import type Lenis from "lenis";
import { useEffect, useState } from "react";

let current: Lenis | null = null;

export function setLenis(l: Lenis | null) {
  current = l;
}

export function scrollToTarget(target: string | HTMLElement, offset = 0) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (current) {
    current.scrollTo(el, { offset, duration: 1.4 });
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y });
  }
}

/** True when the visitor asked for reduced motion (kept in sync with the OS setting). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return reduced;
}
