// Scroll and frame-timing maths with no Node or Playwright APIs, so it runs in the
// browser too (published, with the pixel comparison, as `@quartifex/dailies/browser`).

export type ScrollRange = { start: number; end: number };

/** The scroll position for `progress` (0 to 1, clamped) within a range. Pure. */
export function progressToScroll(range: ScrollRange, progress: number): number {
  const p = Math.min(Math.max(progress, 0), 1);
  return Math.round(range.start + (range.end - range.start) * p);
}

export type JankReport = {
  /** Frames rendered while capturing. */
  frames: number;
  durationMs: number;
  /** Frames that took longer than `budgetMs`. */
  slowFrames: number;
  longestFrameMs: number;
  p95FrameMs: number;
  /** Long tasks (over 50 ms) seen by PerformanceObserver, where supported. */
  longTasks: number;
  /** Long animation frames, where the browser reports them. */
  longAnimationFrames: number;
  /** Cumulative layout shift during the capture (shifts without recent input). */
  layoutShift: number;
};

/** Turn rAF timestamps into a report. Pure; exported for tests and custom captures. */
export function summariseFrames(
  stamps: readonly number[],
  extra: {
    budgetMs: number;
    longTasks?: number;
    longAnimationFrames?: number;
    layoutShift?: number;
  },
): JankReport {
  const deltas: number[] = [];
  for (let i = 1; i < stamps.length; i++) deltas.push((stamps[i] ?? 0) - (stamps[i - 1] ?? 0));
  const sorted = [...deltas].sort((a, b) => a - b);
  const p95 = sorted.length
    ? (sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0)
    : 0;
  return {
    frames: deltas.length,
    durationMs: stamps.length > 1 ? (stamps[stamps.length - 1] ?? 0) - (stamps[0] ?? 0) : 0,
    slowFrames: deltas.filter((d) => d > extra.budgetMs).length,
    longestFrameMs: sorted[sorted.length - 1] ?? 0,
    p95FrameMs: p95,
    longTasks: extra.longTasks ?? 0,
    longAnimationFrames: extra.longAnimationFrames ?? 0,
    layoutShift: Math.round((extra.layoutShift ?? 0) * 10000) / 10000,
  };
}
