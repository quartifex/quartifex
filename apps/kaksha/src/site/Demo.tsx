"use client";
// The real app in a phone frame, on its own synthetic database (/app?demo=1).
//
// While idle the phone is sticky beside the steps. "Tap to try" pins it: the page
// behind stops scrolling and dims, the phone sits in the middle of the window (or
// takes the whole screen on a phone), and a bar offers Reset and Done. Esc, Done or
// a click outside lets go. The first time, a short tour explains all this.
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import type { Copy } from "./copy";

type Step = "mark" | "results" | "report";
const TOUR_KEY = "kaksha-demo-tour";
const DONE_KEY = "kaksha-demo-done";

function readDone(): Step[] {
  try {
    return JSON.parse(sessionStorage.getItem(DONE_KEY) ?? "[]") as Step[];
  } catch {
    return [];
  }
}

export function Demo({ copy, locale }: { copy: Copy["demo"]; locale: "en" | "hi" }) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const tapRef = useRef<HTMLButtonElement>(null);
  const [near, setNear] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [done, setDone] = useState<Step[]>([]);
  const [tour, setTour] = useState<number | null>(null);
  const src = `/app?demo=1&embed=1&lang=${locale}`;
  const [view, setView] = useState<"phone" | "desktop">("phone");
  const screen = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const total = copy.tasks.length;
  const current = copy.tasks.find((x) => !done.includes(x.id as Step))?.id ?? null;

  // Load the app only when the section comes near: it is the heaviest thing on the page.
  useEffect(() => {
    setDone(readDone());
    const el = root.current;
    if (!el || !("IntersectionObserver" in window)) return setNear(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The computer view renders the app at 1280 x 800 and scales it to the frame.
  useEffect(() => {
    const el = screen.current;
    if (!el || view !== "desktop" || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setScale(Math.min(1, e.contentRect.width / 1280));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  // The app reports finished tasks (same origin only).
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin) return;
      const d = e.data as { source?: string; step?: Step } | null;
      if (d?.source !== "kaksha-demo" || !d.step) return;
      const step = d.step;
      setDone((prev) => {
        if (prev.includes(step)) return prev;
        const next = [...prev, step];
        try {
          sessionStorage.setItem(DONE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const release = useCallback(() => {
    setTour(null);
    setPinned(false);
    requestAnimationFrame(() => tapRef.current?.focus({ preventScroll: true }));
  }, []);

  const pin = useCallback((hash?: string) => {
    setNear(true);
    setPinned(true);
    if (hash) {
      const w = frame.current?.contentWindow;
      if (w) w.location.hash = `#${hash}`;
    }
    let seen = false;
    try {
      seen = localStorage.getItem(TOUR_KEY) === "1";
    } catch {}
    if (!seen) setTour(0);
    else requestAnimationFrame(() => frame.current?.focus());
  }, []);

  // While pinned: no page scroll behind, Esc lets go (also from inside the app).
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("demo-pinned", pinned);
    if (!pinned) return;
    // Everything except the demo is out of reach for keyboard and screen reader users.
    const away = [
      ...document.querySelectorAll<HTMLElement>("body > header, body > footer, main > section"),
    ].filter((el) => !el.contains(root.current));
    for (const el of away) el.inert = true;
    const copyCol = root.current?.querySelector<HTMLElement>(".demo__copy");
    if (copyCol) copyCol.inert = true;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (tour !== null) return;
      release();
    };
    window.addEventListener("keydown", onKey);
    let inner: Window | null = null;
    try {
      inner = frame.current?.contentWindow ?? null;
      inner?.addEventListener("keydown", onKey);
    } catch {
      inner = null;
    }
    return () => {
      html.classList.remove("demo-pinned");
      for (const el of away) el.inert = false;
      if (copyCol) copyCol.inert = false;
      window.removeEventListener("keydown", onKey);
      try {
        inner?.removeEventListener("keydown", onKey);
      } catch {}
    };
  }, [pinned, tour, release]);

  const endTour = () => {
    setTour(null);
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {}
    requestAnimationFrame(() => frame.current?.focus());
  };

  const reset = () => {
    try {
      sessionStorage.removeItem(DONE_KEY);
    } catch {}
    setDone([]);
    const w = frame.current?.contentWindow;
    if (!w) return;
    // The app's own Reset button does the same; this one is always in reach.
    const req = w.indexedDB.deleteDatabase("kaksha-demo");
    const go = () => {
      w.location.hash = "#/";
      w.location.reload();
    };
    req.onsuccess = go;
    req.onerror = go;
    req.onblocked = go;
  };

  const tasks = (
    <ol className="dsteps">
      {copy.tasks.map((task, i) => {
        const isDone = done.includes(task.id as Step);
        const isHere = !isDone && task.id === current;
        return (
          <li key={task.id} data-state={isDone ? "done" : isHere ? "here" : "next"}>
            <button type="button" onClick={() => pin(task.hash)}>
              <span className="dsteps__n" aria-hidden="true">
                {isDone ? "✓" : i + 1}
              </span>
              <span className="dsteps__text">
                <strong>{task.title}</strong>
                <span>{isDone ? task.done : task.body}</span>
              </span>
              <span className="dsteps__tag">
                {isDone ? copy.doneTag : isHere && pinned ? copy.hereTag : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div ref={root} className={`demo${pinned ? " is-pinned" : ""}`} data-view={view}>
      <div className="demo__copy">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="demo-h" className="section-title">
          {copy.title}
        </h2>
        <p className="lead">{copy.body}</p>
        <p className="demo__mobile">{copy.mobileBody}</p>
        {tasks}
        <p className="demo__hint">
          {copy.hint} <kbd>{copy.esc}</kbd> {copy.hintEnd}
        </p>
        <a className="demo__open" href={src}>
          {copy.open} →
        </a>
      </div>

      <div className="demo__stage">
        <div className="demo__scrim" aria-hidden="true" onClick={release} />
        <aside
          className="demo__side demo__side--left"
          aria-label={copy.progress
            .replace("{n}", String(done.length))
            .replace("{total}", String(total))}
          data-tour="tasks"
        >
          <p className="eyebrow">
            {copy.progress.replace("{n}", String(done.length)).replace("{total}", String(total))}
          </p>
          {tasks}
        </aside>
        <aside className="demo__side demo__side--right" aria-label={copy.pinned}>
          <p className="eyebrow">{copy.pinned}</p>
          <ul>
            {copy.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </aside>
        {!pinned ? (
          <div className="demo__toolbar">
            <p className="demo__label">
              <i aria-hidden="true" />
              {copy.label}
            </p>
            <fieldset className="demo__views" aria-label={copy.viewLabel}>
              {(["phone", "desktop"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
                  {v === "phone" ? copy.viewPhone : copy.viewDesktop}
                </button>
              ))}
            </fieldset>
            <button
              type="button"
              className="demo__reset"
              onClick={reset}
              aria-label={copy.resetLabel}
            >
              {copy.reset}
            </button>
          </div>
        ) : null}
        <div className="demo__device" data-view={view} data-tour="phone">
          {view === "phone" ? (
            <div className="demo__status" aria-hidden="true">
              <span className="demo__time">9:41</span>
              <span className="demo__island" />
              <span className="demo__sys">
                <svg viewBox="0 0 18 12" width="18" height="12">
                  <rect x="0" y="8" width="3" height="4" rx="1" />
                  <rect x="5" y="6" width="3" height="6" rx="1" />
                  <rect x="10" y="3" width="3" height="9" rx="1" />
                  <rect x="15" y="0" width="3" height="12" rx="1" />
                </svg>
                <svg viewBox="0 0 16 12" width="16" height="12">
                  <path d="M8 11.5l2.4-3a3.6 3.6 0 00-4.8 0zM3.2 6.4a7 7 0 019.6 0l1.4-1.6a9.2 9.2 0 00-12.4 0zM.4 3.3a11.4 11.4 0 0115.2 0L16 2.9 14.6 1.5a13.6 13.6 0 00-13.2 0L0 2.9z" />
                </svg>
                <span className="demo__battery">
                  <span />
                </span>
              </span>
            </div>
          ) : (
            <div className="demo__chrome" aria-hidden="true">
              <span className="demo__lights">
                <i />
                <i />
                <i />
              </span>
              <span className="demo__url">kaksha.quartifex.com/app</span>
            </div>
          )}
          <div className="demo__screen" ref={screen}>
            {near ? (
              <iframe
                ref={frame}
                src={src}
                title={copy.frame}
                tabIndex={pinned ? 0 : -1}
                style={
                  view === "desktop"
                    ? {
                        width: 1280,
                        height: `${100 / scale}%`,
                        transform: `scale(${scale})`,
                        transformOrigin: "0 0",
                      }
                    : undefined
                }
              />
            ) : (
              <div className="demo__placeholder" aria-hidden="true" />
            )}
            {!pinned ? (
              <button ref={tapRef} type="button" className="demo__tap" onClick={() => pin()}>
                <span className="demo__tapcard">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d={
                        view === "phone"
                          ? "M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2"
                          : "M3 5h18v11H3zM8 20h8M12 16v4"
                      }
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <strong>{copy.tap}</strong>
                  <span>{copy.tapSub}</span>
                </span>
              </button>
            ) : null}
          </div>
        </div>
        {pinned ? (
          <div className="demo__bar" data-tour="bar">
            <span className="demo__live">
              <i aria-hidden="true" />
              <span className="demo__live-text">{copy.label}</span>
            </span>
            <button type="button" onClick={reset} aria-label={copy.resetLabel}>
              {copy.reset}
            </button>
            <button type="button" onClick={() => setTour(0)}>
              {copy.help}
            </button>
            <button type="button" className="demo__done" onClick={release}>
              {copy.done} <kbd>{copy.esc}</kbd>
            </button>
          </div>
        ) : null}
      </div>

      {pinned && tour !== null ? (
        <Tour
          copy={copy.tour}
          index={tour}
          setIndex={setTour}
          onEnd={endTour}
          scope={root.current}
        />
      ) : null}
    </div>
  );
}

/** Coach marks: a spotlight on one part of the pinned demo and a short card beside it. */
function Tour({
  copy,
  index,
  setIndex,
  onEnd,
  scope,
}: {
  copy: Copy["demo"]["tour"];
  index: number;
  setIndex: (n: number) => void;
  onEnd: () => void;
  scope: HTMLElement | null;
}) {
  const card = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const steps = copy.steps;
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    if (!step) return;
    const measure = () => {
      let el = scope?.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) ?? null;
      // On a phone the steps panel is hidden; point at the phone instead.
      if (el && el.getClientRects().length === 0)
        el = scope?.querySelector<HTMLElement>('[data-tour="phone"]') ?? null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    const t = window.setTimeout(measure, 260);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [step, scope]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: move focus to the card on every step
  useEffect(() => {
    card.current?.focus();
  }, [index]);

  if (!step) return null;

  // Place the card beside the spotlight where there is room, else below or above it.
  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const W = Math.min(340, vw - 32);
  const low = vw < 860 ? 88 : 24;
  let style: CSSProperties = { left: (vw - W) / 2, bottom: low, width: W };
  if (rect) {
    const pad = 16;
    if (rect.right + pad + W < vw - 8) {
      style = { left: rect.right + pad, top: clamp(rect.top + 40, 16, vh - 260), width: W };
    } else if (rect.left - pad - W > 8) {
      style = { left: rect.left - pad - W, top: clamp(rect.top + 40, 16, vh - 260), width: W };
    } else if (rect.bottom + 200 < vh) {
      style = { left: clamp(rect.left, 16, vw - W - 16), top: rect.bottom + pad, width: W };
    } else {
      style = { left: (vw - W) / 2, bottom: low, width: W };
    }
  }
  const spot: CSSProperties | undefined = rect
    ? { left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }
    : undefined;

  return (
    <div className="tour">
      {spot ? (
        <div className="tour__spot" style={spot} aria-hidden="true" />
      ) : (
        <div className="tour__dim" aria-hidden="true" />
      )}
      <div
        ref={card}
        className="tour__card"
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") onEnd();
        }}
      >
        <p className="tour__count">
          {copy.label} ·{" "}
          {copy.step.replace("{n}", String(index + 1)).replace("{total}", String(steps.length))}
        </p>
        <h3 id="tour-title">{step.title}</h3>
        <p id="tour-body">{step.body}</p>
        <div className="tour__dots" aria-hidden="true">
          {steps.map((s, i) => (
            <i key={`${s.target}-${s.title}`} data-on={i === index} />
          ))}
        </div>
        <div className="tour__actions">
          <button type="button" className="tour__skip" onClick={onEnd}>
            {copy.skip}
          </button>
          <span>
            {index > 0 ? (
              <button type="button" onClick={() => setIndex(index - 1)}>
                {copy.back}
              </button>
            ) : null}
            <button
              type="button"
              className="tour__next"
              onClick={() => (last ? onEnd() : setIndex(index + 1))}
            >
              {last ? copy.finish : copy.next}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
