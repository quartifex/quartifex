/**
 * Moving between quartifex.com and lab.quartifex.com should feel like one site. Two separate
 * origins cannot share a page, so the hand-off is staged:
 *
 * - Leaving: this site's logo preloader plays backwards, fast (about half a second), then the
 *   browser navigates with `?from=qx&t=<theme>`.
 * - Arriving: the boot script sees `from=qx`, adopts the theme and lets the arriving site's own
 *   preloader play forwards, so the old site's logo unwinds and the new one builds up.
 * - Preferences (theme, sound, music, cursor) are also kept in a cookie on .quartifex.com, so both
 *   sides read the same settings (see kit-ui.js).
 *
 * The same file lives in both apps; each side works out which host is its sibling.
 */

const SIBLINGS: Record<string, readonly string[]> = {
  site: ["lab.quartifex.com"],
  lab: ["quartifex.com", "www.quartifex.com"],
};

const side = () => (location.hostname.startsWith("lab.") ? "lab" : "site");

const reduced = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  document.documentElement.dataset.motion === "reduce";

/** Fetch the preloader code early (on hover or focus of a sibling link) so the exit starts at once. */
let preload: Promise<typeof import("@/lib/logo/preloader")> | null = null;
const loadPreloader = () => {
  preload ??= import("@/lib/logo/preloader");
  return preload;
};

/** Unwind the preloader, then go. Used by links and by code that navigates (tab bar, keyboard). */
export const leaveTo = (href: string) => {
  const url = new URL(href, location.href);
  url.searchParams.set("from", "qx");
  url.searchParams.set("t", document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  let gone = false;
  const go = () => {
    if (gone) return;
    gone = true;
    location.assign(url.href);
  };
  if (reduced()) return go();
  globalThis.__qxSfx?.("open");
  // never wait longer than this, whatever happens to the animation
  window.setTimeout(go, 1400);
  loadPreloader()
    .then(({ playPreloader }) =>
      playPreloader(document.body, {
        fixed: true,
        reverse: true,
        brand: side() === "lab" ? "lab" : "quartifex",
      }),
    )
    .then(go, go);
  // coming back with the browser's back button: take the preloader down again
  window.addEventListener(
    "pageshow",
    (e) => {
      if (!e.persisted) return;
      for (const el of document.querySelectorAll(".pl")) el.remove();
      document.documentElement.classList.remove("pl-lock");
    },
    { once: true },
  );
};

/** Intercepts clicks on links to the sibling site. Returns the cleanup. */
export const installXsite = () => {
  const hosts = SIBLINGS[side()] ?? [];
  const sibling = (t: EventTarget | null) => {
    const a = t instanceof Element ? t.closest<HTMLAnchorElement>("a[href]") : null;
    if (!a) return null;
    try {
      const url = new URL(a.href);
      return hosts.includes(url.hostname) ? { a, url } : null;
    } catch {
      return null;
    }
  };
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    const hit = sibling(e.target);
    if (!hit || hit.a.target === "_blank" || hit.a.hasAttribute("download")) return;
    e.preventDefault();
    leaveTo(hit.url.href);
  };
  const onNear = (e: Event) => {
    if (sibling(e.target)) void loadPreloader();
  };
  document.addEventListener("click", onClick);
  document.addEventListener("pointerover", onNear, { passive: true });
  document.addEventListener("focusin", onNear);

  // an older hand-off (cover wipe) may still mark the page: clear it
  document.documentElement.classList.remove("qx-in", "qx-in-go");
  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("pointerover", onNear);
    document.removeEventListener("focusin", onNear);
  };
};
