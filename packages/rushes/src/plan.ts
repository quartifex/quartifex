// The tier plan and frame-name sorting. No Node APIs, so both the CLI and the browser
// encoder use them.
import type { Tier } from "./manifest.js";

/** Sort file names the way people number frames: frame2 before frame10. */
export function naturalSort(names: string[]): string[] {
  return [...names].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );
}

/** The tier ladder for a source: requested widths up to the source width, smallest first. */
export function planTiers(
  source: { width: number; height: number },
  frames: number,
  widths: number[] = [480, 960, 1600],
  step: (width: number) => number = (w) => (w <= 640 ? 2 : 1),
): Omit<Tier, "bytes">[] {
  const usable = [...new Set(widths.map((w) => Math.min(Math.round(w), source.width)))].sort(
    (a, b) => a - b,
  );
  return usable.map((width) => {
    const s = Math.max(1, Math.floor(step(width)));
    return {
      name: `w${width}`,
      width,
      height: Math.round((width * source.height) / source.width),
      step: s,
      frames: Math.ceil(frames / s),
    };
  });
}
