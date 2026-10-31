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

/** Glide to an element's top and say when it is there; false when there is no smooth scroll
 *  (reduced motion), so the caller leaves the page where it is. */
export function settleTo(el: HTMLElement, onDone: () => void): boolean {
  if (!current) return false;
  // By position, not by element: the page's scroll-padding (kept for anchor links under the
  // header) must not stop a chapter short.
  current.scrollTo(el.getBoundingClientRect().top + window.scrollY, {
    duration: 0.9,
    easing: (t) => 1 - (1 - t) ** 3,
    onComplete: onDone,
  });
  return true;
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
