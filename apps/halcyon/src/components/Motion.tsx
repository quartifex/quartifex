"use client";

// The page's motion policy (stillness), the switch that sets it, and the chapter rail.
// The level is mirrored onto <html data-motion> so the CSS lays out each mode; a change made
// with the switch cross-fades (a View Transition) unless the new level is static.
import type { Level, Preference } from "@quartifex/stillness";
import { chapterRail } from "@quartifex/stillness/dom";
import { StillnessProvider, useStillness } from "@quartifex/stillness/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CHAPTERS, linkedPreference } from "@/lib/motion";
import styles from "./Motion.module.css";

export function MotionRoot({ children }: { children: ReactNode }) {
  const [options] = useState(() => {
    const linked = typeof window === "undefined" ? undefined : linkedPreference(location.search);
    return linked ? { preference: linked } : {};
  });
  return (
    <StillnessProvider options={options}>
      <MirrorLevel />
      {children}
    </StillnessProvider>
  );
}

/** Keep <html data-motion> in step with the policy. */
function MirrorLevel() {
  const { stillness, level } = useStillness();
  useEffect(() => {
    if (stillness) document.documentElement.dataset.motion = level;
  }, [stillness, level]);
  return null;
}

const CHOICES: Array<{ value: Preference; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "full", label: "Full" },
  { value: "reduced", label: "Reduced" },
  { value: "static", label: "Static" },
];

export function ModeSwitch() {
  const { stillness, level } = useStillness();
  // The preference can change without the level changing (Auto to Full on a full system).
  const [preference, setPreference] = useState<Preference>("auto");
  useEffect(() => {
    if (stillness) setPreference(stillness.preference);
  }, [stillness]);
  const system: Level = stillness?.systemLevel ?? "full";

  const choose = (next: Preference) => {
    if (!stillness) return;
    setPreference(next);
    const apply = () => stillness.set(next);
    const target = next === "auto" ? system : next;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && target !== "static" && system !== "reduced") {
      doc.startViewTransition(apply);
    } else apply();
  };

  return (
    <fieldset className={styles.switch} data-testid="mode-switch">
      <legend className="mono">Motion</legend>
      <div className={styles.options}>
        {CHOICES.map((c) => (
          <label key={c.value} className={styles.option}>
            <input
              type="radio"
              name="motion"
              value={c.value}
              checked={preference === c.value}
              disabled={!stillness}
              onChange={() => choose(c.value)}
            />
            <span>{c.label}</span>
          </label>
        ))}
      </div>
      <p className={`mono ${styles.now}`} aria-live="polite" data-testid="mode-now">
        {stillness
          ? preference === "auto"
            ? `Following your system: ${level}`
            : `Showing ${level}`
          : "Loading"}
      </p>
    </fieldset>
  );
}

/** The chapter rail: links with aria-current, focus on arrival and polite announcements. */
export function Rail() {
  const nav = useRef<HTMLElement>(null);
  const { stillness } = useStillness();
  useEffect(() => {
    if (!nav.current || !stillness) return;
    const rail = chapterRail(nav.current, CHAPTERS, { stillness });
    return () => rail.destroy();
  }, [stillness]);
  return (
    <nav ref={nav} className={styles.rail} aria-label="Chapters">
      {/* Server-rendered links, replaced by the live rail once the page wakes up. */}
      <ol>
        {CHAPTERS.map((c) => (
          <li key={c.id}>
            <a href={`#${c.id}`}>{c.label}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
