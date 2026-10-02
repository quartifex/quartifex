// @quartifex/viewfinder (L05, Quality & testing). A devtools overlay for scrollytelling,
// in a Shadow DOM so the page's styles never touch it: chapters with jump-to, progress per
// scene, the sequence's frame and buffer, an fps and long-frame graph, trigger markers,
// and record-and-replay of a scroll path. Sources plug in for GSAP (./gsap) and reel
// (./reel); spine is used for scrolling when given. React in ./react.
import type { Spine } from "@quartifex/spine";
import { compact, frameStats, positionAt, type ScrollPath } from "./record.js";

export {
  compact,
  duration,
  type FrameStats,
  frameStats,
  parseScrollPath,
  positionAt,
  type ScrollPath,
} from "./record.js";

export type Scene = {
  label: string;
  progress: number;
  start?: number;
  end?: number;
  active?: boolean;
};
export type SequenceReading = {
  label: string;
  frame: number;
  frames: number;
  loaded: number[];
  detail?: string;
};
export type Reading = { scenes?: Scene[]; sequences?: SequenceReading[] };

/** Something the overlay can read each update: GSAP triggers, a reel, your own state. */
export type Source = { name: string; read(): Reading };

export type ViewfinderOptions = {
  sources?: Source[];
  /** Chapter elements. Default `[data-chapter]`. */
  chapters?: string;
  /** Scroll with a spine (Lenis-aware) instead of the window. */
  scroller?: Pick<Spine, "scrollTo">;
  /** Key that toggles the panel, with Alt. Default "v" (Alt+V). */
  hotkey?: string;
  open?: boolean;
  side?: "left" | "right";
};

export type Viewfinder = {
  readonly open: boolean;
  toggle(open?: boolean): void;
  showMarkers(on: boolean): void;
  record(): void;
  /** Stop recording and return the path. */
  stop(): ScrollPath;
  replay(path?: ScrollPath): Promise<void>;
  readonly path: ScrollPath | null;
  destroy(): void;
};

const CSS = `
:host { all: initial; }
.panel { position: fixed; top: 12px; bottom: 12px; width: 300px; z-index: 2147483646; overflow: auto;
  display: flex; flex-direction: column; gap: 14px; padding: 14px; box-sizing: border-box;
  background: rgb(5 5 5 / 0.94); color: #edeae4; border: 1px solid rgb(237 234 228 / 0.2); border-radius: 10px;
  font: 12px/1.45 ui-monospace, "DM Mono", Menlo, Consolas, monospace; }
.panel[hidden] { display: none; }
h2 { margin: 0; font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #8b8881; }
header { display: flex; align-items: center; justify-content: space-between; }
header strong { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; }
section { display: grid; gap: 6px; }
button { all: unset; box-sizing: border-box; cursor: pointer; padding: 4px 10px; min-height: 28px; border: 1px solid rgb(237 234 228 / 0.2);
  border-radius: 999px; color: #edeae4; font: inherit; display: inline-flex; align-items: center; }
button:hover { border-color: #3fbead; }
button:focus-visible { outline: 1px solid #3fbead; outline-offset: 2px; }
button[aria-pressed="true"] { border-color: #3fbead; }
.row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.bar { position: relative; height: 4px; background: rgb(237 234 228 / 0.12); }
.bar span { position: absolute; inset: 0 auto 0 0; background: #3fbead; }
.chapter { justify-content: space-between; width: 100%; }
.chapter[aria-current="true"] { border-color: #3fbead; }
.cells { display: flex; flex-wrap: wrap; gap: 1px; }
.cells i { width: 5px; height: 9px; background: rgb(237 234 228 / 0.15); }
.cells i.on { background: #3fbead; }
.cells i.now { outline: 1px solid #edeae4; }
canvas { width: 100%; height: 48px; border: 1px solid rgb(237 234 228 / 0.15); }
.muted { color: #8b8881; }
.markers { position: fixed; inset: 0; pointer-events: none; z-index: 2147483645; }
.marker { position: absolute; left: 0; right: 0; border-top: 1px dashed #3fbead; }
.marker.end { border-top-color: #edeae4; }
.marker em { position: absolute; right: 320px; top: -9px; font: 10px ui-monospace, monospace; color: #050505; background: #3fbead; padding: 1px 4px; font-style: normal; }
.marker.end em { background: #edeae4; }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Mount the overlay. Alt+V (or your hotkey) shows and hides it. */
export function createViewfinder(options: ViewfinderOptions = {}): Viewfinder {
  const host = el("div", { "data-viewfinder": "" });
  const root = host.attachShadow({ mode: "open" });
  const style = el("style");
  style.textContent = CSS;
  const panel = el("aside", { class: "panel", role: "region", "aria-label": "Viewfinder" });
  panel.style[options.side === "left" ? "left" : "right"] = "12px";
  const markers = el("div", { class: "markers", hidden: "" });
  root.append(style, markers, panel);
  document.body.append(host);

  // Header.
  const header = el("header");
  header.append(el("strong", {}, "Viewfinder"));
  const close = el("button", { type: "button", "aria-label": "Close viewfinder" }, "Close");
  header.append(close);

  // Sections.
  const chaptersSection = el("section", { "aria-label": "Chapters" });
  const scenesSection = el("section", { "aria-label": "Scenes" });
  const sequenceSection = el("section", { "aria-label": "Sequences" });
  const perfSection = el("section", { "aria-label": "Performance" });
  const toolsSection = el("section", { "aria-label": "Tools" });
  perfSection.append(el("h2", {}, "Frames"));
  // A line from the start, so the frame graph below it does not move when the first figures arrive.
  const perfText = el("p", { "data-vf": "fps", style: "margin:0" }, "Measuring frames…");
  const graph = el("canvas", {
    width: "272",
    height: "48",
    role: "img",
    "aria-label": "Frame times, last 120 frames",
  });
  perfSection.append(perfText, graph);
  const markersButton = el("button", { type: "button", "aria-pressed": "false" }, "Markers");
  const recordButton = el("button", { type: "button", "aria-pressed": "false" }, "Record");
  const replayButton = el("button", { type: "button", disabled: "" }, "Replay");
  const copyButton = el("button", { type: "button", disabled: "" }, "Copy path");
  const recordText = el(
    "p",
    { class: "muted", "data-vf": "record", style: "margin:0" },
    "No path recorded.",
  );
  const tools = el("div", { class: "row" });
  tools.append(markersButton, recordButton, replayButton, copyButton);
  toolsSection.append(el("h2", {}, "Tools"), tools, recordText);
  panel.append(header, chaptersSection, scenesSection, sequenceSection, perfSection, toolsSection);

  const scrollTo = (y: number | HTMLElement) => {
    if (options.scroller) options.scroller.scrollTo(y, { immediate: true });
    else if (typeof y === "number") window.scrollTo({ top: y, behavior: "instant" });
    else y.scrollIntoView({ behavior: "instant", block: "start" });
  };

  // Chapters: buttons that jump; the one in view is marked.
  const chapterEls = () =>
    Array.from(document.querySelectorAll<HTMLElement>(options.chapters ?? "[data-chapter]"));
  const renderChapters = () => {
    const list = chapterEls();
    chaptersSection.replaceChildren(el("h2", {}, `Chapters (${list.length})`));
    const middle = window.innerHeight / 2;
    for (const [i, chapter] of list.entries()) {
      const box = chapter.getBoundingClientRect();
      const name = chapter.dataset.chapter || chapter.id || `Chapter ${i + 1}`;
      const button = el("button", { type: "button", class: "chapter", "data-vf-chapter": name });
      button.append(
        el("span", {}, name),
        el("span", { class: "muted" }, `${Math.round(box.top + window.scrollY)}px`),
      );
      if (box.top <= middle && box.bottom >= middle) button.setAttribute("aria-current", "true");
      button.addEventListener("click", () => scrollTo(chapter));
      chaptersSection.append(button);
    }
  };

  const renderReadings = () => {
    const readings = (options.sources ?? []).map((s) => ({ name: s.name, ...s.read() }));
    const scenes = readings.flatMap((r) => r.scenes ?? []);
    scenesSection.replaceChildren(el("h2", {}, `Scenes (${scenes.length})`));
    for (const scene of scenes) {
      const label = el("div", { class: "row", "data-vf-scene": scene.label });
      label.append(
        el("span", {}, scene.label),
        el("span", { class: "muted" }, `${Math.round(scene.progress * 100)}%`),
      );
      const bar = el("div", {
        class: "bar",
        role: "progressbar",
        "aria-label": scene.label,
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(Math.round(scene.progress * 100)),
      });
      const fill = el("span");
      fill.style.width = `${scene.progress * 100}%`;
      bar.append(fill);
      scenesSection.append(label, bar);
    }
    const sequences = readings.flatMap((r) => r.sequences ?? []);
    sequenceSection.replaceChildren(el("h2", {}, `Sequences (${sequences.length})`));
    for (const seq of sequences) {
      sequenceSection.append(
        el(
          "p",
          { style: "margin:0", "data-vf-sequence": seq.label },
          `${seq.label}: frame ${seq.frame + 1} / ${seq.frames}, ${seq.loaded.length} in memory${seq.detail ? `, ${seq.detail}` : ""}`,
        ),
      );
      const cells = el("div", { class: "cells", "aria-hidden": "true" });
      const loaded = new Set(seq.loaded);
      for (let i = 0; i < seq.frames; i++) {
        cells.append(
          el("i", { class: `${loaded.has(i) ? "on" : ""}${i === seq.frame ? " now" : ""}` }),
        );
      }
      sequenceSection.append(cells);
    }
    // Markers: each scene's start and end, where they sit in the viewport now.
    if (!markers.hidden) {
      markers.replaceChildren();
      for (const scene of scenes) {
        for (const [edge, y] of [
          ["start", scene.start],
          ["end", scene.end],
        ] as const) {
          if (y === undefined) continue;
          const line = el("div", { class: `marker ${edge}` });
          line.style.top = `${y - window.scrollY}px`;
          line.append(el("em", {}, `${scene.label} ${edge}`));
          markers.append(line);
        }
      }
    }
  };

  // Frame graph.
  const times: number[] = [];
  let last = performance.now();
  let raf = 0;
  let lastText = 0;
  let open = false;
  const ctx = graph.getContext("2d");
  const drawGraph = () => {
    if (!ctx) return;
    const { width, height } = graph;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgb(237 234 228 / 0.25)";
    const y16 = height - (16.7 / 66) * height;
    ctx.beginPath();
    ctx.moveTo(0, y16);
    ctx.lineTo(width, y16);
    ctx.stroke();
    const step = width / 120;
    times.forEach((t, i) => {
      // Long frames in ink, the rest in teal: no Sindoor fills.
      ctx.fillStyle = t > 50 ? "#edeae4" : "#3fbead";
      const h = Math.min(t / 66, 1) * height;
      ctx.fillRect(i * step, height - h, Math.max(step - 1, 1), h);
    });
  };

  // Recording.
  let recording: ScrollPath | null = null;
  let recordStart = 0;
  let path: ScrollPath | null = null;

  const loop = (now: number) => {
    times.push(now - last);
    last = now;
    if (times.length > 120) times.shift();
    if (recording)
      recording.samples.push({ t: Math.round(now - recordStart), y: Math.round(window.scrollY) });
    drawGraph();
    if (now - lastText > 250) {
      lastText = now;
      const stats = frameStats(times);
      perfText.textContent = `${stats.fps} fps · p95 ${stats.p95} ms · ${stats.longFrames} long · worst ${stats.worst} ms`;
      renderChapters();
      renderReadings();
    }
    raf = requestAnimationFrame(loop);
  };

  const toggle = (next = !open) => {
    open = next;
    panel.hidden = !open;
    if (!open) markers.hidden = true;
    else if (markersButton.getAttribute("aria-pressed") === "true") markers.hidden = false;
    cancelAnimationFrame(raf);
    if (open) {
      // Fill the panel before it is first painted, so its sections do not grow (and push
      // the ones below) a frame after it opens.
      renderChapters();
      renderReadings();
      last = performance.now();
      lastText = last;
      raf = requestAnimationFrame(loop);
    }
  };

  const showMarkers = (on: boolean) => {
    markersButton.setAttribute("aria-pressed", String(on));
    markers.hidden = !on || !open;
    if (!on) markers.replaceChildren();
  };

  const startRecording = () => {
    recording = { version: 1, samples: [] };
    recordStart = performance.now();
    recordButton.textContent = "Stop";
    recordButton.setAttribute("aria-pressed", "true");
    recordText.textContent = "Recording: scroll the page.";
  };
  const stopRecording = (): ScrollPath => {
    path = compact(recording ?? { version: 1, samples: [] });
    recording = null;
    recordButton.textContent = "Record";
    recordButton.setAttribute("aria-pressed", "false");
    const seconds = ((path.samples.at(-1)?.t ?? 0) / 1000).toFixed(1);
    recordText.textContent = `Path: ${path.samples.length} samples, ${seconds} s.`;
    replayButton.removeAttribute("disabled");
    copyButton.removeAttribute("disabled");
    return path;
  };
  const replay = (p = path) =>
    new Promise<void>((resolve) => {
      if (!p || p.samples.length === 0) return resolve();
      const start = performance.now();
      const end = p.samples.at(-1)?.t ?? 0;
      recordText.textContent = "Replaying.";
      const step = (now: number) => {
        const t = now - start;
        window.scrollTo({ top: positionAt(p, t), behavior: "instant" });
        if (t < end) requestAnimationFrame(step);
        else {
          recordText.textContent = `Replayed ${(end / 1000).toFixed(1)} s.`;
          resolve();
        }
      };
      requestAnimationFrame(step);
    });

  close.addEventListener("click", () => toggle(false));
  markersButton.addEventListener("click", () =>
    showMarkers(markersButton.getAttribute("aria-pressed") !== "true"),
  );
  recordButton.addEventListener("click", () => (recording ? stopRecording() : startRecording()));
  replayButton.addEventListener("click", () => void replay());
  copyButton.addEventListener("click", () => {
    if (path) void navigator.clipboard?.writeText(JSON.stringify(path)).catch(() => {});
    recordText.textContent = "Path copied as JSON.";
  });
  const key = (options.hotkey ?? "v").toLowerCase();
  const onKey = (event: KeyboardEvent) => {
    // Match the physical key: Option+V on a Mac types "√", not "v".
    if (
      event.altKey &&
      (event.code === `Key${key.toUpperCase()}` || event.key.toLowerCase() === key)
    ) {
      event.preventDefault();
      toggle();
    }
  };
  window.addEventListener("keydown", onKey);
  toggle(options.open ?? false);

  return {
    get open() {
      return open;
    },
    toggle,
    showMarkers,
    record: startRecording,
    stop: stopRecording,
    replay,
    get path() {
      return path;
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      host.remove();
    },
  };
}
