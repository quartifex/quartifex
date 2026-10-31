export type PreloaderOptions = {
  brand?: "quartifex" | "lab";
  /** Wait for real images and fonts (first visit) instead of simulating progress. */
  real?: boolean;
  /** Time multiplier, 1 = normal. */
  slow?: number;
  /** Cover the whole viewport and lock scroll. */
  fixed?: boolean;
  /** Play the timeline backwards, fast, and stay on screen at the end (leaving for the sibling site). */
  reverse?: boolean;
};

export function playPreloader(host: HTMLElement, options?: PreloaderOptions): Promise<void>;
