// The kit's QRTFX LAB lockup: a small mono "LAB" tag that rides the right edge of the logo
// canvas as the wordmark opens and closes. Ported from the UI kit sheet (Quartifex_UI_Kit.html,
// "QRTFX LAB lockup"). Styles are `.qx-lab` in kit.css.
import { qxDrawLogo } from "./logo/qx-draw.js";

const PAD = 26;
const LW = 2661 + PAD * 2;
const LH = 373 + PAD * 2;
const MARK = 186;

export function initLabTag() {
  const root = document.documentElement;
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));
  const brand = () => root.dataset.brand || "";
  const reduceMq = matchMedia("(prefers-reduced-motion: reduce)");
  const reduce = () => reduceMq.matches || root.dataset.motion === "reduce";

  const S = 0.25;
  const oc = document.createElement("canvas");
  oc.width = Math.ceil(LW * S);
  oc.height = Math.ceil(LH * S);
  const ox = oc.getContext("2d", { willReadFrequently: true });
  let E = null;

  function edge(p) {
    ox.setTransform(1, 0, 0, 1, 0, 0);
    ox.clearRect(0, 0, oc.width, oc.height);
    ox.setTransform(S, 0, 0, S, PAD * S, PAD * S);
    qxDrawLogo(ox, p, -1, { squareColor: "#000", markColor: "#000", dark: false, light: null });
    const d = ox.getImageData(0, 0, oc.width, oc.height).data;
    const w = oc.width;
    const h = oc.height;
    const x0 = Math.floor((PAD + 2 * MARK + 30) * S);
    let r = 0;
    let t = h;
    let b = 0;
    for (let y = 0; y < h; y++)
      for (let x = x0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 80 && x > r) r = x;
    const xa = Math.max(x0, r - Math.round(160 * S));
    for (let y = 0; y < h; y++)
      for (let x = xa; x <= r; x++)
        if (d[(y * w + x) * 4 + 3] > 80) {
          if (y < t) t = y;
          if (y > b) b = y;
        }
    return { r: (r + 1) / S, t: t / S, b: (b + 1) / S };
  }

  const mono = getComputedStyle(root).getPropertyValue("--mono") || "monospace";
  const tags = [];

  function place(T) {
    const p = T.cv.__prog ? T.cv.__prog() : 0;
    const r = E.a.r + (E.b.r - E.a.r) * p;
    T.tag.style.transform = `translate3d(${(T.ox + r * T.k + T.gap).toFixed(2)}px,0,0)`;
  }

  function follow(T, ms) {
    const end = performance.now() + ms;
    cancelAnimationFrame(T.raf);
    (function f() {
      place(T);
      if (performance.now() < end) T.raf = requestAnimationFrame(f);
    })();
  }

  function bubbles(T) {
    const t = T.tag;
    t.classList.remove("fizz");
    void t.offsetWidth;
    if (!reduce()) t.classList.add("fizz");
  }

  function wave(T) {
    if (reduce() || !T.tag.animate) return;
    $$(".ql", T.tag).forEach((t, i) => {
      t.animate([{ transform: "none" }, { transform: "translateY(-28%)" }, { transform: "none" }], {
        duration: 520,
        delay: 260 + i * 70,
        easing: "cubic-bezier(.22,1,.36,1)",
      });
    });
    bubbles(T);
  }

  function layout(T) {
    if (!E) E = { a: edge(0), b: edge(1) };
    const cw = T.cv.getBoundingClientRect().width;
    if (!cw) return;
    const k = cw / LW;
    const lh = (E.a.b - E.a.t) * k;
    const cap = lh * 0.5;
    const gap = lh * 0.3;
    const o = document.createElement("canvas").getContext("2d");
    o.font = `500 100px ${mono}`;
    const asc = o.measureText("LAB").actualBoundingBoxAscent || 70;
    const fs = (cap / asc) * 100;
    const ls = fs * 0.08;
    let x = 0;
    let svg = "";
    const L = "LAB";
    o.font = `500 ${fs}px ${mono}`;
    for (let i = 0; i < 3; i++) {
      svg += `<text class="ql" style="--i:${i}" x="${x.toFixed(2)}" y="${cap.toFixed(2)}">${L[i]}</text>`;
      x += o.measureText(L[i]).width + ls;
    }
    const w = x - ls;
    svg += `<circle class="qb" style="--i:0" cx="${(w - fs * 0.2).toFixed(1)}" cy="${(-cap * 0.25).toFixed(1)}" r="${(cap * 0.09).toFixed(2)}"/><circle class="qb" style="--i:1" cx="${(w - fs * 0.48).toFixed(1)}" cy="${(-cap * 0.2).toFixed(1)}" r="${(cap * 0.06).toFixed(2)}"/>`;
    T.tag.innerHTML = `<svg width="${Math.ceil(w + 2)}" height="${Math.ceil(cap + 1)}" viewBox="0 0 ${Math.ceil(w + 2)} ${Math.ceil(cap + 1)}" overflow="visible" style="font:500 ${fs.toFixed(2)}px ${mono}">${svg}</svg>`;
    const cr = T.cv.getBoundingClientRect();
    const hr = T.host.getBoundingClientRect();
    T.ox = cr.left - hr.left;
    T.oy = cr.top - hr.top;
    T.k = k;
    T.gap = gap;
    T.cap = cap;
    T.lw = w;
    T.tag.style.top = `${(T.oy + E.a.b * k - cap).toFixed(2)}px`;
    place(T);
    if (T.cv.hasAttribute("data-compact")) {
      if (T.w0 == null) T.w0 = T.host.style.width;
      const need = Math.ceil(E.a.r * k + gap + w + 4);
      T.host.style.width =
        brand() === "lab" ? `${Math.max(Number.parseFloat(T.w0) || 0, need)}px` : T.w0;
    }
  }

  function make(cv) {
    const host = cv.closest("a") || cv.parentElement;
    if (!host || host.__lab) return;
    host.__lab = true;
    const tag = document.createElement("span");
    tag.className = "qx-lab";
    tag.setAttribute("aria-hidden", "true");
    host.appendChild(tag);
    const T = { cv, host, tag, w0: null, raf: 0 };
    tags.push(T);
    host.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse" || brand() !== "lab") return;
      follow(T, 1400);
      wave(T);
    });
    host.addEventListener("pointerleave", () => {
      if (brand() === "lab") follow(T, 1100);
    });
    host.addEventListener("focus", () => {
      if (brand() === "lab") follow(T, 1400);
    });
    host.addEventListener("blur", () => {
      if (brand() === "lab") follow(T, 1100);
    });
    return T;
  }

  function intro() {
    for (const T of tags) {
      layout(T);
      T.tag.classList.remove("go");
      void T.tag.offsetWidth;
      if (!reduce()) T.tag.classList.add("go");
      setTimeout(() => bubbles(T), 700);
    }
  }

  for (const cv of $$("canvas.hv")) make(cv);
  const ro = new ResizeObserver(() => {
    for (const T of tags) layout(T);
  });
  ro.observe(document.body);
  const ready = document.fonts?.ready ?? Promise.resolve();
  ready.then(() => {
    for (const T of tags) layout(T);
    if (brand() === "lab") intro();
  });
  const timer = setInterval(() => {
    if (brand() === "lab" && !document.hidden)
      for (const T of tags) if (!T.host.matches(":hover")) bubbles(T);
  }, 5200);

  return () => {
    ro.disconnect();
    clearInterval(timer);
    for (const T of tags) {
      cancelAnimationFrame(T.raf);
      T.tag.remove();
      T.host.__lab = false;
    }
  };
}
