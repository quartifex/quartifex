// What contactsheet looks for on each screen. `collectSnapshot` runs inside the page
// (Playwright, or a same-origin iframe) and returns plain data; `evaluate` turns that
// data into flags. Browser-safe: published as `@quartifex/contactsheet/checks`.
import { overlapArea } from "@quartifex/safeframe";

export type Rect = { x: number; y: number; width: number; height: number };

export type Snapshot = {
  viewport: { width: number; height: number };
  dpr: number;
  /** Staged subjects, read from safeframe's `data-sf-subject` (viewport pixels). */
  subjects: Array<{ label: string; rect: Rect; clipped: boolean }>;
  texts: Array<{ label: string; rect: Rect }>;
  targets: Array<{ label: string; rect: Rect; inline: boolean }>;
  canvases: Array<{ label: string; width: number; height: number; rect: Rect }>;
  /** Cumulative layout shift so far, when the page was loaded with `LAYOUT_SHIFT_SCRIPT`. */
  layoutShift: number;
};

export type CollectOptions = {
  /** Elements treated as overlay copy. */
  textSelector?: string;
  /** Elements treated as tap targets. */
  targetSelector?: string;
};

export const DEFAULT_TEXT_SELECTOR =
  "[data-sf-text], h1, h2, h3, h4, p, li, figcaption, blockquote, label";
export const DEFAULT_TARGET_SELECTOR =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"]';

/** Installs a layout-shift observer before any page script runs (pass to `addInitScript`). */
export const LAYOUT_SHIFT_SCRIPT = `(() => {
  window.__contactsheetCLS = 0;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__contactsheetCLS += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
})();`;

/**
 * Read the current screen. Self-contained on purpose: Playwright serialises it into the
 * page, so it may not use anything from outside its own body.
 */
export function collectSnapshot(options: CollectOptions = {}, win: Window = window): Snapshot {
  const doc = win.document;
  const vw = win.innerWidth;
  const vh = win.innerHeight;
  const rectOf = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  };
  // The part of an element that can be seen: clipped by every ancestor that hides or
  // scrolls its overflow (text scrolled out of a nested scroller is not on screen).
  const shownRect = (el: Element) => {
    const r = el.getBoundingClientRect();
    let left = r.left;
    let top = r.top;
    let right = r.right;
    let bottom = r.bottom;
    for (let a = el.parentElement; a && a !== doc.body; a = a.parentElement) {
      const style = win.getComputedStyle(a);
      if (style.overflowX === "visible" && style.overflowY === "visible") continue;
      const c = a.getBoundingClientRect();
      if (style.overflowX !== "visible") {
        left = Math.max(left, c.left);
        right = Math.min(right, c.right);
      }
      if (style.overflowY !== "visible") {
        top = Math.max(top, c.top);
        bottom = Math.min(bottom, c.bottom);
      }
    }
    return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  };
  const onScreen = (r: { x: number; y: number; width: number; height: number }) =>
    r.width > 0 && r.height > 0 && r.x < vw && r.y < vh && r.x + r.width > 0 && r.y + r.height > 0;
  const visible = (el: Element) => {
    const style = win.getComputedStyle(el);
    return (
      style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05
    );
  };
  const label = (el: Element) => {
    const text = (el.getAttribute("aria-label") || el.textContent || "")
      .trim()
      .replace(/\s+/g, " ");
    return `${el.tagName.toLowerCase()}${text ? ` "${text.slice(0, 40)}"` : ""}`;
  };

  const subjects: Snapshot["subjects"] = [];
  for (const el of Array.from(doc.querySelectorAll<HTMLElement>("[data-sf-subject]"))) {
    const frame = rectOf(el);
    if (!onScreen(frame) || !visible(el)) continue;
    const [x = 0, y = 0, w = 0, h = 0] = (el.dataset.sfSubject ?? "").split(/\s+/).map(Number);
    const rect = { x: frame.x + x, y: frame.y + y, width: w, height: h };
    const outside =
      rect.x < -1 || rect.y < -1 || rect.x + rect.width > vw + 1 || rect.y + rect.height > vh + 1;
    subjects.push({
      label: el.dataset.sfBucket ? `scene (${el.dataset.sfBucket})` : "scene",
      rect,
      clipped: outside || el.hasAttribute("data-sf-clipped"),
    });
  }

  const textSelector =
    options.textSelector ?? "[data-sf-text], h1, h2, h3, h4, p, li, figcaption, blockquote, label";
  const textEls = Array.from(doc.querySelectorAll(textSelector));
  const texts: Snapshot["texts"] = [];
  for (const el of textEls) {
    if (textEls.some((other) => other !== el && el.contains(other))) continue; // leaves only
    const rect = shownRect(el);
    if (onScreen(rect) && visible(el) && (el.textContent ?? "").trim())
      texts.push({ label: label(el), rect });
  }

  const targetSelector =
    options.targetSelector ??
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"]';
  const targets: Snapshot["targets"] = [];
  for (const el of Array.from(doc.querySelectorAll(targetSelector))) {
    // A target cut by a scroller is judged by its full size, but only if any of it shows.
    if (!onScreen(shownRect(el))) continue;
    const rect = rectOf(el);
    if (!onScreen(rect) || !visible(el)) continue;
    // Links inside running text are exempt from target size (WCAG 2.2, 2.5.8).
    const inline =
      win.getComputedStyle(el).display === "inline" && Boolean(el.closest("p, li, td, dd"));
    targets.push({ label: label(el), rect, inline });
  }

  const canvases: Snapshot["canvases"] = [];
  for (const el of Array.from(doc.querySelectorAll("canvas"))) {
    const rect = rectOf(el);
    if (!onScreen(shownRect(el)) || !visible(el)) continue;
    canvases.push({
      label: el.id ? `canvas#${el.id}` : "canvas",
      width: el.width,
      height: el.height,
      rect,
    });
  }

  const cls = (win as Window & { __contactsheetCLS?: number }).__contactsheetCLS ?? 0;
  return {
    viewport: { width: vw, height: vh },
    dpr: win.devicePixelRatio || 1,
    subjects,
    texts,
    targets,
    canvases,
    layoutShift: cls,
  };
}

export type FlagKind =
  | "subject-outside-frame"
  | "text-over-subject"
  | "text-overlap"
  | "tap-target"
  | "canvas-budget"
  | "layout-shift";

export type Flag = { kind: FlagKind; message: string; rect?: Rect };

export type CheckOptions = {
  /** Smallest tap target side in CSS pixels. Default 24 (WCAG 2.2 AA, 2.5.8). */
  minTarget?: number;
  /** Largest canvas backing store in pixels. Default 8,294,400 (one 4K frame). */
  maxCanvasPixels?: number;
  /** A canvas larger than the screen can show, by this factor, is flagged. Default 1.1. */
  canvasOverscan?: number;
  /** Largest cumulative layout shift. Default 0.1 (the "good" Core Web Vitals line). */
  maxLayoutShift?: number;
  /** Share of a text box that may overlap the subject. Default 0.02. */
  textOverlapTolerance?: number;
};

const round = (n: number) => Math.round(n);
const size = (r: Rect) => `${round(r.width)}x${round(r.height)}`;
const contains = (a: Rect, b: Rect) =>
  a.x <= b.x && a.y <= b.y && a.x + a.width >= b.x + b.width && a.y + a.height >= b.y + b.height;

/** Turn a snapshot into flags. Pure. */
export function evaluate(snapshot: Snapshot, options: CheckOptions = {}): Flag[] {
  const minTarget = options.minTarget ?? 24;
  const maxCanvas = options.maxCanvasPixels ?? 8_294_400;
  const overscan = options.canvasOverscan ?? 1.1;
  const maxShift = options.maxLayoutShift ?? 0.1;
  const tolerance = options.textOverlapTolerance ?? 0.02;
  const flags: Flag[] = [];

  for (const subject of snapshot.subjects) {
    if (subject.clipped) {
      flags.push({
        kind: "subject-outside-frame",
        message: `${subject.label}: the subject runs outside the screen`,
        rect: subject.rect,
      });
    }
    for (const text of snapshot.texts) {
      const share =
        overlapArea(text.rect, subject.rect) / Math.max(text.rect.width * text.rect.height, 1);
      if (share > tolerance) {
        flags.push({
          kind: "text-over-subject",
          message: `${text.label} covers ${Math.round(share * 100)}% of its box over the subject`,
          rect: text.rect,
        });
      }
    }
  }

  const texts = snapshot.texts;
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i];
      const b = texts[j];
      if (!a || !b || contains(a.rect, b.rect) || contains(b.rect, a.rect)) continue;
      if (overlapArea(a.rect, b.rect) > 4) {
        flags.push({
          kind: "text-overlap",
          message: `${a.label} overlaps ${b.label}`,
          rect: a.rect,
        });
      }
    }
  }

  for (const target of snapshot.targets) {
    if (target.inline) continue;
    if (target.rect.width < minTarget || target.rect.height < minTarget) {
      flags.push({
        kind: "tap-target",
        message: `${target.label} is ${size(target.rect)}, under ${minTarget}x${minTarget}`,
        rect: target.rect,
      });
    }
  }

  const screenPixels = snapshot.viewport.width * snapshot.viewport.height * snapshot.dpr ** 2;
  for (const canvas of snapshot.canvases) {
    const pixels = canvas.width * canvas.height;
    const shown = canvas.rect.width * canvas.rect.height * snapshot.dpr ** 2;
    if (pixels > maxCanvas) {
      flags.push({
        kind: "canvas-budget",
        message: `${canvas.label} is ${canvas.width}x${canvas.height} (${(pixels / 1e6).toFixed(1)} MP), over the ${(maxCanvas / 1e6).toFixed(1)} MP budget`,
        rect: canvas.rect,
      });
    } else if (pixels > Math.min(shown, screenPixels) * overscan) {
      flags.push({
        kind: "canvas-budget",
        message: `${canvas.label} renders ${canvas.width}x${canvas.height} for ${size(canvas.rect)} CSS px at DPR ${snapshot.dpr}: more pixels than the screen shows`,
        rect: canvas.rect,
      });
    }
  }

  if (snapshot.layoutShift > maxShift) {
    flags.push({
      kind: "layout-shift",
      message: `layout shift ${snapshot.layoutShift.toFixed(3)}, over ${maxShift}`,
    });
  }
  return flags;
}
