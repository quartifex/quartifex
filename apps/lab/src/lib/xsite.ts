/**
 * Moving between quartifex.com and lab.quartifex.com should feel like one site. Two separate
 * origins cannot share a page, so the hand-off is staged:
 *
 * - Leaving: a cover wipes up the screen, then the browser navigates with `?from=qx&t=<theme>`.
 * - Arriving: the boot script sees `from=qx`, skips the logo preloader, adopts the theme, and
 *   starts with a cover that wipes away, so the new page opens where the old one ended.
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

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Wipe the screen, then go. Used by links and by code that navigates (tab bar, keyboard). */
export const leaveTo = (href: string) => {
  const url = new URL(href, location.href);
  url.searchParams.set("from", "qx");
  url.searchParams.set("t", document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  const go = () => location.assign(url.href);
  if (reduced()) return go();
  const cover = document.createElement("div");
  cover.id = "qx-xo";
  cover.setAttribute("aria-hidden", "true");
  document.body.append(cover);
  void cover.offsetWidth;
  cover.classList.add("on");
  globalThis.__qxSfx?.("open");
  window.setTimeout(go, 560);
  // if the visitor comes back with the browser's back button, do not leave the cover up
  window.addEventListener("pageshow", () => cover.remove(), { once: true });
};

/** Intercepts clicks on links to the sibling site. Returns the cleanup. */
export const installXsite = () => {
  const hosts = SIBLINGS[side()] ?? [];
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    let url: URL;
    try {
      url = new URL(a.href);
    } catch {
      return;
    }
    if (!hosts.includes(url.hostname)) return;
    e.preventDefault();
    leaveTo(url.href);
  };
  document.addEventListener("click", onClick);

  // arrived from the other side: let the cover wipe away, then drop the marker
  const root = document.documentElement;
  if (root.classList.contains("qx-in")) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        root.classList.add("qx-in-go");
        window.setTimeout(() => root.classList.remove("qx-in", "qx-in-go"), 1000);
      }),
    );
  }
  return () => document.removeEventListener("click", onClick);
};
