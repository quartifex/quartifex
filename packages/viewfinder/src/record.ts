// Scroll-path recording and frame statistics. Pure, so they are tested without a page.

/** A recorded scroll path: scroll positions over time, in ms from the start. */
export type ScrollPath = { version: 1; samples: Array<{ t: number; y: number }> };

/** The scroll position at time `t` (ms), interpolated between samples. */
export function positionAt(path: ScrollPath, t: number): number {
  const s = path.samples;
  if (s.length === 0) return 0;
  const first = s[0] as { t: number; y: number };
  if (t <= first.t) return first.y;
  for (let i = 1; i < s.length; i++) {
    const b = s[i] as { t: number; y: number };
    if (t <= b.t) {
      const a = s[i - 1] as { t: number; y: number };
      const k = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      return a.y + (b.y - a.y) * k;
    }
  }
  return (s[s.length - 1] as { y: number }).y;
}

export function duration(path: ScrollPath): number {
  return path.samples.at(-1)?.t ?? 0;
}

/** Drop samples that add nothing (same position as both neighbours) to keep exports small. */
export function compact(path: ScrollPath): ScrollPath {
  const s = path.samples;
  const kept = s.filter(
    (p, i) => i === 0 || i === s.length - 1 || p.y !== s[i - 1]?.y || p.y !== s[i + 1]?.y,
  );
  return { version: 1, samples: kept };
}

/** Parse a path from JSON text, or throw. */
export function parseScrollPath(text: string): ScrollPath {
  const raw = JSON.parse(text) as Partial<ScrollPath>;
  if (raw.version !== 1 || !Array.isArray(raw.samples))
    throw new Error("viewfinder: not a scroll path");
  for (const s of raw.samples) {
    if (typeof s?.t !== "number" || typeof s?.y !== "number")
      throw new Error("viewfinder: bad sample");
  }
  return raw as ScrollPath;
}

export type FrameStats = { fps: number; p95: number; longFrames: number; worst: number };

/** Statistics over recent frame times (ms). Long frames are over 50 ms. */
export function frameStats(times: readonly number[]): FrameStats {
  if (times.length === 0) return { fps: 0, p95: 0, longFrames: 0, worst: 0 };
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const sorted = [...times].sort((a, b) => a - b);
  return {
    fps: Math.round(1000 / mean),
    p95: Math.round((sorted[Math.floor((sorted.length - 1) * 0.95)] ?? 0) * 10) / 10,
    longFrames: times.filter((t) => t > 50).length,
    worst: Math.round(sorted[sorted.length - 1] ?? 0),
  };
}
