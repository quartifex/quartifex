// The hand-off to reel, published as `@quartifex/understudy/reel`. When the governor leaves
// WebGL, a reel takes over on its own canvas at the same scroll position: the image sequence
// on the "sequence" rung, its poster on the "poster" rung.
import { createReel, type Reel, type ReelOptions } from "@quartifex/reel";
import type { Manifest } from "@quartifex/rushes/manifest";
import type { State, Understudy } from "./index.js";

export type StandInOptions = Omit<ReelOptions, "reducedMotion"> & {
  understudy: Understudy;
  /** Where the scene is, 0 to 1: the reel starts on the same frame. */
  progress: () => number;
  /** Called when the reel is created or removed, e.g. to show or hide its canvas. */
  onChange?: (reel: Reel | null, state: State) => void;
};

export type StandIn = {
  readonly reel: Reel | null;
  /** Seek the reel to `progress()`: call it from your scroll handler. */
  sync(): void;
  destroy(): void;
};

/** Keep a reel on `canvas` in step with the governor's rung. */
export function createStandIn(
  canvas: HTMLCanvasElement,
  manifest: Manifest,
  options: StandInOptions,
): StandIn {
  const { understudy, progress, onChange, ...reelOptions } = options;
  let reel: Reel | null = null;
  const apply = (state: State) => {
    if (state.rung === "webgl") {
      if (reel) {
        reel.destroy();
        reel = null;
        onChange?.(null, state);
      }
      return;
    }
    const poster = state.rung === "poster";
    if (!reel) {
      reel = createReel(canvas, manifest, { ...reelOptions, reducedMotion: poster });
      reel.seek(progress());
      onChange?.(reel, state);
    } else {
      reel.setReducedMotion(poster);
      reel.seek(progress());
    }
  };
  apply(understudy.state);
  const stop = understudy.subscribe(apply);
  return {
    get reel() {
      return reel;
    },
    sync() {
      reel?.seek(progress());
    },
    destroy() {
      stop();
      reel?.destroy();
      reel = null;
    },
  };
}
