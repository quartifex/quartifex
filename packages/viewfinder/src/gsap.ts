// GSAP source for @quartifex/viewfinder, published as `@quartifex/viewfinder/gsap`. Reads
// every ScrollTrigger; never imports gsap (pass yours in).
import type { Source } from "./index.js";

type TriggerLike = {
  progress: number;
  start: number;
  end: number;
  isActive: boolean;
  vars: { id?: string };
  trigger?: Element | null;
};

/** Scenes from every ScrollTrigger: progress, start and end (for markers), active state. */
export function gsapSource(ScrollTrigger: { getAll(): TriggerLike[] }): Source {
  return {
    name: "gsap",
    read: () => ({
      scenes: ScrollTrigger.getAll().map((t, i) => {
        const el = t.trigger as HTMLElement | null | undefined;
        const label =
          t.vars.id ?? el?.dataset?.chapter ?? (el?.id ? `#${el.id}` : `trigger ${i + 1}`);
        return { label, progress: t.progress, start: t.start, end: t.end, active: t.isActive };
      }),
    }),
  };
}
