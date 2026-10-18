"use client";
import { createStillness } from "@quartifex/stillness";
// The page's one scroll moment: a paper mark sheet resolves, row by row, into the
// app's grid, and the grid's right answers then fall into the class chart.
// Everything is DOM and CSS custom properties; GSAP only moves numbers. Under
// reduced motion (and before the script loads) the three stages sit side by side.
import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { Copy } from "./copy";

const NAMES = {
  en: ["Asha", "Bunty", "Chinki", "Dabbu", "Golu", "Heera", "Jugnu", "Kiki"],
  hi: ["आशा", "बंटी", "चिंकी", "डब्बू", "गोलू", "हीरा", "जुगनू", "किकी"],
};
const KEY = ["B", "A", "D", "C", "A", "B"];
// 1 = right. Column totals 7, 5, 6, 2, 4, 3: question 4 is the one the class found hard.
const RIGHT = [
  [1, 1, 1, 0, 1, 1],
  [1, 0, 1, 0, 1, 0],
  [1, 1, 1, 1, 0, 1],
  [0, 1, 0, 0, 1, 0],
  [1, 1, 1, 0, 0, 1],
  [1, 0, 1, 1, 1, 0],
  [1, 1, 0, 0, 0, 0],
  [1, 0, 1, 0, 0, 0],
];
const ROWS = RIGHT.length;
const COLS = KEY.length;
const totals = KEY.map((_, c) => RIGHT.reduce((n, r) => n + (r[c] ?? 0), 0));

type Stage = "paper" | "grid" | "chart";
const STAGE_VARS: Record<Stage, Record<string, number>> = {
  paper: { "--draw": 1, "--grid": 0, "--fall": 0, "--ruled": 1, "--labels": 0 },
  grid: { "--draw": 0, "--grid": 1, "--fall": 0, "--ruled": 0, "--labels": 0 },
  chart: { "--draw": 0, "--grid": 1, "--fall": 1, "--ruled": 0, "--labels": 1 },
};

function Board({ names, stage, q }: { names: string[]; stage?: Stage; q: string }) {
  const vars = stage ? (STAGE_VARS[stage] as unknown as CSSProperties) : undefined;
  return (
    <div className="p2g__board" style={vars} data-board>
      <div className="p2g__margin" aria-hidden="true" />
      {KEY.map((_, c) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: one heading per question, fixed
        <span key={`h${c}`} className="p2g__head" style={{ "--c": c } as CSSProperties}>
          {q}
          {c + 1}
        </span>
      ))}
      {names.map((name, r) => (
        <span key={name} className="p2g__name" style={{ "--r": r } as CSSProperties}>
          <span className="p2g__hand">{name}</span>
          <span className="p2g__typed">{name}</span>
        </span>
      ))}
      {RIGHT.map((row, r) =>
        row.map((ok, c) => {
          const below = RIGHT.slice(r + 1).reduce((n, x) => n + (x[c] ?? 0), 0);
          // Right answers fall to the bottom of their column, stacking into a bar.
          const fallTo = ROWS - 1 - below;
          const others = ["A", "B", "C", "D"].filter((x) => x !== KEY[c]);
          const letter = ok ? KEY[c] : others[(r + c) % 3];
          const circled = !ok && (r + c) % 3 === 0;
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed illustrative grid
              key={`${r}-${c}`}
              className={`p2g__cell ${ok ? "is-right" : "is-wrong"}${(totals[c] ?? 0) / ROWS < 0.5 ? " is-low" : ""}`}
              style={{ "--r": r, "--c": c, "--dy": fallTo - r, "--i": r } as CSSProperties}
            >
              <svg className="p2g__ink" viewBox="0 0 40 40" aria-hidden="true">
                {ok ? (
                  <path d="M9 21 L17 29 L32 10" pathLength="1" />
                ) : circled ? (
                  <ellipse cx="20" cy="20" rx="13" ry="11" pathLength="1" />
                ) : (
                  <path d="M11 11 L29 29 M29 11 L11 29" pathLength="1" />
                )}
              </svg>
              <span className="p2g__chip">{letter}</span>
            </span>
          );
        }),
      )}
      {totals.map((n, c) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: one label per question
          key={`t${c}`}
          className={`p2g__pct${n / ROWS < 0.5 ? " is-low" : ""}`}
          style={{ "--c": c, "--r": ROWS - n - 1 } as CSSProperties}
        >
          {Math.round((n / ROWS) * 100)}%
        </span>
      ))}
      <span className="p2g__axis" aria-hidden="true" />
    </div>
  );
}

/** Loads GSAP when the section is near and scrubs the three stages. Returns a cleanup. */
function startSequence(el: HTMLElement, setStep: (n: number) => void): () => void {
  let cleanup = () => {};
  let cancelled = false;
  const io = new IntersectionObserver(
    async (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const board = el.querySelector<HTMLElement>("[data-live] [data-board]");
      if (!board) return;
      const cells = [...board.querySelectorAll<HTMLElement>(".p2g__cell")];
      const ctx = gsap.context(() => {
        gsap.set(board, { "--ruled": 1, "--labels": 0, "--grid": 0, "--fall": 0 });
        gsap.set(cells, { "--draw": 0, "--grid": 0, "--fall": 0 });
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el.querySelector("[data-live]"),
            start: "top top",
            end: "bottom bottom",
            scrub: 0.4,
            onUpdate: (self) => setStep(self.progress < 0.36 ? 0 : self.progress < 0.68 ? 1 : 2),
          },
        });
        const rows = { each: 0.04, grid: [ROWS, COLS] as [number, number], axis: "y" as const };
        // 1. Ink: row by row, the teacher's ticks and crosses.
        tl.to(cells, { "--draw": 1, duration: 0.6, stagger: rows }, 0);
        // 2. Each row becomes app cells, and the ruled paper fades.
        tl.to(board, { "--ruled": 0, "--grid": 1, duration: 1 }, 1.1);
        tl.to(cells, { "--grid": 1, duration: 0.5, stagger: { ...rows, each: 0.03 } }, 1.1);
        // 3. Wrong answers clear; right ones fall into bars.
        tl.to(
          cells,
          {
            "--fall": 1,
            duration: 1,
            ease: "power2.inOut",
            stagger: { each: 0.05, grid: [ROWS, COLS], axis: "x" },
          },
          2.2,
        );
        tl.to(board, { "--fall": 1, duration: 1 }, 2.2);
        tl.to(board, { "--labels": 1, duration: 0.6 }, 2.8);
        tl.to({}, { duration: 0.4 });
      }, el);
      cleanup = () => ctx.revert();
    },
    { rootMargin: "50% 0px" },
  );
  io.observe(el);
  return () => {
    cancelled = true;
    io.disconnect();
    cleanup();
  };
}

export function PaperToGrid({ copy, locale }: { copy: Copy["sheet"]; locale: "en" | "hi" }) {
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const names = NAMES[locale];

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // stillness decides the level: the system setting, the visitor's stored choice
    // (qx-motion) and Save-Data. Only "full" runs the scrubbed sequence.
    const stillness = createStillness();
    const effect = stillness.effect({
      name: "paper-to-grid",
      full: () => {
        el.dataset.motion = "full";
        return startSequence(el, setStep);
      },
      reduced: () => {
        el.dataset.motion = "reduced";
      },
      static: () => {
        el.dataset.motion = "static";
      },
    });
    return () => {
      effect.destroy();
      stillness.destroy();
    };
  }, []);

  return (
    <div className="p2g" ref={root}>
      <a className="p2g__skip" href="#demo">
        {copy.skip}
      </a>
      {/* CSS shows the pinned run, or under reduced motion the three stills. */}
      <div className="p2g__run" data-live>
        <div className="p2g__sticky">
          <ol className="p2g__steps">
            {copy.steps.map(([title, body], i) => (
              <li key={title} data-on={i === step}>
                <strong>{title}</strong>
                <span>{body}</span>
              </li>
            ))}
          </ol>
          <Board names={names} q={copy.q} />
        </div>
      </div>
      <ol className="p2g__still">
        {(["paper", "grid", "chart"] as Stage[]).map((s, i) => (
          <li key={s}>
            <Board names={names} stage={s} q={copy.q} />
            <p>
              <strong>{copy.steps[i]?.[0]}</strong> {copy.steps[i]?.[1]}
            </p>
          </li>
        ))}
      </ol>
      <p className="p2g__caption">{copy.caption}</p>
    </div>
  );
}
