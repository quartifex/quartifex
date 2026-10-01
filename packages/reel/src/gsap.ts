// GSAP ScrollTrigger adapter for @quartifex/reel, published as `@quartifex/reel/gsap`.
// GSAP stays an optional peer: pass in your ScrollTrigger; this module never imports gsap.
import type { Reel } from "./index.js";

type Trigger = { kill(): void; progress: number };

/** The parts of ScrollTrigger this adapter uses. */
export type ScrollTriggerLike = {
  create(
    vars: Record<string, unknown> & { onUpdate?: (self: { progress: number }) => void },
  ): Trigger;
};

/**
 * Scrub `reel` with a ScrollTrigger. `vars` are ScrollTrigger's own (trigger, start, end,
 * pin, scroller, ...); `onUpdate` is set for you. Returns the trigger; `kill()` it to stop.
 */
export function scrubReel(
  reel: Reel,
  scrollTrigger: ScrollTriggerLike,
  vars: Record<string, unknown> = {},
): Trigger {
  const trigger = scrollTrigger.create({
    start: "top top",
    end: "bottom bottom",
    ...vars,
    onUpdate: (self) => reel.seek(self.progress),
  });
  reel.seek(trigger.progress ?? 0);
  return trigger;
}
