// GSAP ScrollTrigger wiring for @quartifex/plumb, published as `@quartifex/plumb/gsap`.
// GSAP stays an optional peer: pass in the ScrollTrigger you already import, and this
// module never imports gsap itself.
import type { Plumb } from "./index.js";

/** The two ScrollTrigger statics this module calls. */
export type ScrollTriggerLike = {
  config(options: { ignoreMobileResize?: boolean; autoRefreshEvents?: string }): void;
  refresh(safe?: boolean): void;
};

/**
 * Hand ScrollTrigger's resize handling to plumb: ScrollTrigger stops refreshing on raw
 * `resize` events and refreshes once per settled layout change instead. Returns a
 * function that restores ScrollTrigger's default refresh events.
 */
export function syncScrollTrigger(plumb: Plumb, scrollTrigger: ScrollTriggerLike): () => void {
  scrollTrigger.config({
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
  });
  const unsubscribe = plumb.subscribe(() => scrollTrigger.refresh(true));
  return () => {
    unsubscribe();
    scrollTrigger.config({ autoRefreshEvents: "visibilitychange,DOMContentLoaded,load,resize" });
  };
}
