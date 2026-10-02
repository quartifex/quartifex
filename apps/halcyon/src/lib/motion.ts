import type { Level, Preference } from "@quartifex/stillness";

export const LEVELS: readonly Level[] = ["full", "reduced", "static"];

/** Where stillness remembers the visitor's choice (its default key). */
export const STORAGE_KEY = "qx-motion";

/**
 * Set `data-motion` on <html> before first paint, so the layout for the visitor's level is
 * there from the start and nothing shifts when the page wakes up. Order: a `?motion=` link,
 * the remembered choice, then the system setting. Without JavaScript the attribute is absent
 * and the CSS falls back to the static layout.
 */
export const MOTION_SCRIPT = `try{var l=["full","reduced","static"],q=new URLSearchParams(location.search).get("motion"),s=l.indexOf(q)>=0?q:localStorage.getItem("${STORAGE_KEY}");document.documentElement.dataset.motion=l.indexOf(s)>=0?s:matchMedia("(prefers-reduced-motion: reduce)").matches?"reduced":"full"}catch(e){document.documentElement.dataset.motion="full"}`;

/** A `?motion=` level from the URL (shared links, the CI audit), if any. */
export function linkedPreference(search: string): Preference | undefined {
  const value = new URLSearchParams(search).get("motion");
  return (LEVELS as readonly string[]).includes(value ?? "") ? (value as Level) : undefined;
}

export const CHAPTERS = [
  { id: "dawn", label: "Dawn" },
  { id: "sunrise", label: "Sunrise" },
  { id: "object", label: "The object" },
  { id: "quiet", label: "Quiet" },
  { id: "proof", label: "The proof" },
];
