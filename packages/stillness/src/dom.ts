// The accessibility kit for pinned and cinematic pages, published as
// `@quartifex/stillness/dom`: a chapter rail, skip links past long scenes, focus
// management on arrival, and a polite live region for progress.
import type { Stillness } from "./index.js";

export type Chapter = { id: string; label: string };

/** A visually hidden, polite live region. `announce` skips repeats and settles bursts. */
export function createAnnouncer(parent: HTMLElement = document.body, delay = 250) {
  const region = document.createElement("p");
  region.setAttribute("aria-live", "polite");
  region.setAttribute("role", "status");
  region.dataset.stillness = "announcer";
  region.style.cssText =
    "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;margin:0";
  parent.append(region);
  let last = "";
  let timer = 0;
  return {
    region,
    announce(text: string) {
      if (text === last) return;
      last = text;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        region.textContent = text;
      }, delay);
    },
    destroy() {
      window.clearTimeout(timer);
      region.remove();
    },
  };
}

/** Move focus to `target` without scrolling it twice; it becomes focusable if it was not. */
export function focusOnArrival(target: HTMLElement): void {
  if (!target.hasAttribute("tabindex") && target.tabIndex < 0)
    target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

/** Scroll to an element: instantly unless the level is full motion. */
export function goTo(target: HTMLElement, stillness?: Stillness): void {
  target.scrollIntoView({
    behavior: stillness && stillness.level === "full" ? "smooth" : "instant",
    block: "start",
  });
  focusOnArrival(target);
}

export type RailOptions = {
  stillness?: Stillness;
  /** Announce chapter changes in a live region. Default true. */
  announce?: boolean;
  /** Accessible name of the navigation. Default "Chapters". */
  label?: string;
  /** The scroll container, when it is not the page. */
  root?: HTMLElement | null;
  onChange?: (chapter: Chapter, index: number) => void;
};

/**
 * Render a chapter rail into `nav`: an ordered list of links, `aria-current="step"` on the
 * chapter in view, keyboard navigation for free (they are links), and a live announcement
 * on each change. Clicking a chapter scrolls there (instantly unless motion is full) and
 * moves focus to it.
 */
export function chapterRail(nav: HTMLElement, chapters: Chapter[], options: RailOptions = {}) {
  nav.setAttribute("aria-label", options.label ?? "Chapters");
  nav.dataset.stillness = "rail";
  const list = document.createElement("ol");
  const links = chapters.map((chapter, index) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#${chapter.id}`;
    link.textContent = chapter.label;
    link.addEventListener("click", (event) => {
      const target = document.getElementById(chapter.id);
      if (!target) return;
      event.preventDefault();
      goTo(target, options.stillness);
      setActive(index);
    });
    item.append(link);
    list.append(item);
    return link;
  });
  nav.replaceChildren(list);
  const announcer = options.announce === false ? null : createAnnouncer(nav);

  let active = -1;
  function setActive(index: number) {
    if (index === active || index < 0 || index >= chapters.length) return;
    active = index;
    links.forEach((link, i) => {
      if (i === index) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
    const chapter = chapters[index] as Chapter;
    announcer?.announce(`Chapter ${index + 1} of ${chapters.length}: ${chapter.label}`);
    options.onChange?.(chapter, index);
  }

  // The chapter crossing the middle of the viewport is the current one.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        setActive(chapters.findIndex((c) => c.id === entry.target.id));
      }
    },
    { root: options.root ?? null, rootMargin: "-50% 0px -50% 0px" },
  );
  for (const chapter of chapters) {
    const el = document.getElementById(chapter.id);
    if (el) observer.observe(el);
  }

  return {
    get active() {
      return active;
    },
    setActive,
    destroy() {
      observer.disconnect();
      announcer?.destroy();
      nav.replaceChildren();
    },
  };
}

/**
 * Put a "skip" link right before a long scene, pointing at whatever comes after it, so
 * keyboard and screen-reader visitors are not walked through a pinned sequence.
 */
export function skipLink(
  scene: HTMLElement,
  options: { label?: string; target?: HTMLElement; stillness?: Stillness } = {},
) {
  const target = options.target ?? (scene.nextElementSibling as HTMLElement | null);
  if (!target) throw new Error("stillness: nothing after the scene to skip to");
  if (!target.id) target.id = `after-${scene.id || "scene"}`;
  const link = document.createElement("a");
  link.href = `#${target.id}`;
  link.textContent = options.label ?? "Skip the animation";
  link.dataset.stillness = "skip";
  link.addEventListener("click", (event) => {
    event.preventDefault();
    goTo(target, options.stillness);
  });
  scene.before(link);
  return { link, destroy: () => link.remove() };
}
