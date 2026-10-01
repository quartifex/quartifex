// reel source for @quartifex/viewfinder, published as `@quartifex/viewfinder/reel`.
import type { Reel } from "@quartifex/reel";
import type { Source } from "./index.js";

/** A sequence reading from a reel: frame shown, frames in memory, tier, format and DPR. */
export function reelSource(reel: Pick<Reel, "stats" | "progress">, label = "reel"): Source {
  return {
    name: `reel:${label}`,
    read: () => {
      const s = reel.stats();
      return {
        scenes: [{ label, progress: reel.progress }],
        sequences: [
          {
            label,
            frame: Math.max(s.shown, 0),
            frames: s.frames,
            loaded: s.indices,
            detail: s.reducedMotion
              ? "poster (reduced motion)"
              : `${s.tier} ${s.format} @${s.dpr}x`,
          },
        ],
      };
    },
  };
}
