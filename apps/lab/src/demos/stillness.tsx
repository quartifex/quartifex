"use client";

// Hub demo for @quartifex/stillness, shown on /stillness. A small cinematic page with
// three effects, each declaring full, reduced and static behaviour, a chapter rail, a skip
// link past the scene, and polite announcements. Switch the policy and watch every effect
// change variant live.
import {
  createStillness,
  type EffectState,
  type Level,
  type Preference,
  type Stillness,
} from "@quartifex/stillness";
import { chapterRail, skipLink } from "@quartifex/stillness/dom";
import { useEffect, useRef, useState } from "react";
import { Controls, Note, Readout, Segmented, Toggle } from "@/components/demo/kit";
import { budgetPixelRatio } from "@/components/demo/pixels";
import { drawArt } from "@/scene/art";
import shared from "./demos.module.css";
import styles from "./stillness.module.css";

const PREFERENCES = [
  { value: "auto", label: "Auto (system)" },
  { value: "full", label: "Full" },
  { value: "reduced", label: "Reduced" },
  { value: "static", label: "Static" },
] as const;

const CHAPTERS = [
  { id: "st-intro", label: "Intro" },
  { id: "st-scene", label: "Turntable" },
  { id: "st-detail", label: "Detail" },
  { id: "st-end", label: "End" },
];

export default function Demo() {
  const [preference, setPreference] = useState<Preference>("auto");
  const [saveData, setSaveData] = useState(false);
  const [level, setLevel] = useState<Level>("static");
  const [system, setSystem] = useState<Level>("full");
  const [effects, setEffects] = useState<EffectState[]>([]);
  const [announced, setAnnounced] = useState<string[]>([]);
  const instance = useRef<Stillness | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const turntable = useRef<HTMLCanvasElement>(null);
  const lines = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLElement>(null);

  // One policy per Save-Data setting; the effects register against it.
  useEffect(() => {
    const box = scroller.current;
    const canvas = turntable.current;
    if (!box || !canvas || !title.current || !lines.current || !rail.current || !scene.current)
      return;
    const s = createStillness({ storageKey: null, saveData, preference: "auto" });
    instance.current = s;
    const refresh = () => {
      setLevel(s.level);
      setSystem(s.systemLevel);
      setEffects(s.effects());
    };

    const titleEl = title.current;
    const drift = s.effect({
      name: "Title drift",
      full: () => {
        const animation = titleEl.animate(
          [{ transform: "translateX(-2%)" }, { transform: "translateX(2%)" }],
          {
            duration: 3000,
            iterations: Number.POSITIVE_INFINITY,
            direction: "alternate",
            easing: "ease-in-out",
          },
        );
        return () => animation.cancel();
      },
      reduced: () => {
        const animation = titleEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
        return () => animation.cancel();
      },
    });

    const ctx = canvas.getContext("2d");
    const paint = (t: number) => {
      if (!ctx) return;
      // Within the 8 MP canvas budget on very wide, dense windows.
      const ratio = Math.min(
        devicePixelRatio,
        budgetPixelRatio(canvas.clientWidth, canvas.clientHeight),
      );
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
      drawArt(ctx, canvas.width, canvas.height, t);
    };
    const spin = s.effect({
      name: "Turntable loop",
      heavy: true,
      full: () => {
        let raf = 0;
        const start = performance.now();
        const loop = (now: number) => {
          paint(((now - start) / 6000) % 1);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
      },
      static: () => paint(0.1),
    });

    const linesEl = lines.current;
    const parallax = s.effect({
      name: "Parallax lines",
      full: () => {
        const onScroll = () => {
          linesEl.style.transform = `translateY(${-box.scrollTop * 0.15}px)`;
        };
        box.addEventListener("scroll", onScroll, { passive: true });
        return () => {
          box.removeEventListener("scroll", onScroll);
          linesEl.style.transform = "";
        };
      },
    });

    const railHandle = chapterRail(rail.current, CHAPTERS, {
      stillness: s,
      root: box,
      label: "Chapters of the demo page",
      onChange: (chapter, index) =>
        setAnnounced((log) =>
          [`Chapter ${index + 1} of ${CHAPTERS.length}: ${chapter.label}`, ...log].slice(0, 4),
        ),
    });
    const skip = skipLink(scene.current, { label: "Skip the turntable", stillness: s });
    const off = s.subscribe(refresh);
    refresh();

    return () => {
      off();
      skip.destroy();
      railHandle.destroy();
      drift.destroy();
      spin.destroy();
      parallax.destroy();
      s.destroy();
      instance.current = null;
    };
  }, [saveData]);

  // Re-apply the choice whenever the policy is rebuilt (Save-Data toggles rebuild it).
  // biome-ignore lint/correctness/useExhaustiveDependencies: saveData marks a new policy instance
  useEffect(() => {
    instance.current?.set(preference);
    if (instance.current) {
      setLevel(instance.current.level);
      setEffects(instance.current.effects());
    }
  }, [preference, saveData]);

  return (
    <div className={shared.demo} data-demo="stillness">
      <Controls label="Policy">
        <Segmented
          legend="Motion"
          value={preference}
          choices={PREFERENCES}
          onChange={setPreference}
        />
        <Toggle label="Save-Data" checked={saveData} onChange={setSaveData} />
      </Controls>

      <div className={styles.layout}>
        <nav ref={rail} className={styles.rail} />
        <div className={styles.page} ref={scroller} data-testid="st-page">
          <section id="st-intro" className={styles.chapter}>
            <h3 ref={title} className={styles.title}>
              A launch, in four chapters
            </h3>
            <p>
              Every effect on this page declares what it does at full, reduced and static motion.
            </p>
          </section>
          <section id="st-scene" className={styles.chapter} ref={scene}>
            <canvas
              ref={turntable}
              className={styles.canvas}
              role="img"
              aria-label="A jar on a turntable (concept visual)"
            />
          </section>
          <section id="st-detail" className={styles.chapter}>
            <div ref={lines} className={styles.lines} aria-hidden="true">
              {/* Hairlines, drawn as an SVG pattern: no gradients in the UI. */}
              <svg aria-hidden="true">
                <defs>
                  <pattern id="st-lines" width="10" height="48" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0.5" x2="10" y2="0.5" stroke="rgb(63 190 173 / 0.25)" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#st-lines)" />
              </svg>
            </div>
            <h3>Detail</h3>
            <p>Parallax lines travel at full motion only.</p>
          </section>
          <section id="st-end" className={styles.chapter}>
            <h3>End</h3>
            <p>The chapter rail moved focus here if you used it.</p>
          </section>
        </div>
      </div>

      <div className={shared.split}>
        <Readout
          label="Policy state"
          rows={[
            ["Page level", level, "st-level"],
            ["System asks for", system],
            ["Save-Data", saveData ? "on" : "off", "st-savedata"],
            ...effects.map(
              (e) =>
                [
                  `${e.name}${e.heavy ? " (heavy)" : ""}`,
                  e.running,
                  `st-effect-${e.name.split(" ")[0]?.toLowerCase()}`,
                ] as [string, string, string],
            ),
          ]}
        />
        <div>
          <h3 className={shared.panelTitle}>Announced (polite live region)</h3>
          <ol className={shared.list} data-testid="st-announced">
            {announced.map((line, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a short rolling log
              <li key={i}>{line}</li>
            ))}
          </ol>
        </div>
      </div>
      <Note>
        Auto follows your system setting. Reduced swaps travel for a short fade; static shows end
        states only. Save-Data turns heavy effects (the turntable loop) static whatever the level.
        Nothing is conveyed by motion alone: every chapter reads the same at all three levels.
      </Note>
    </div>
  );
}
