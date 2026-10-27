export type PreloaderOptions = {
  brand?: "quartifex" | "lab";
  /** Wait for real images and fonts (first visit) instead of simulating progress. */
  real?: boolean;
  /** Time multiplier, 1 = normal. */
  slow?: number;
  /** Cover the whole viewport and lock scroll. */
  fixed?: boolean;
};

export function playPreloader(host: HTMLElement, options?: PreloaderOptions): Promise<void>;
