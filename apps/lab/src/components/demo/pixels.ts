"use client";

// Canvas pixel budgets for the demos. contactsheet flags a canvas over 8.3 MP (a 4K
// screen's worth) and one that draws more pixels than the window shows it at.
import { useEffect, useState } from "react";

/** A little under contactsheet's 8,294,400 (3840 x 2160), so rounding never tips it over. */
export const CANVAS_BUDGET = 8_000_000;

export type View = { width: number; height: number; dpr: number };

/** The largest pixel ratio that keeps a canvas of this CSS size within the budget. */
export function budgetPixelRatio(width: number, height: number, budget = CANVAS_BUDGET): number {
  return Math.sqrt(budget / Math.max(width * height, 1));
}

/**
 * The pixel ratio for a canvas that fills a simulated screen shown scaled down in a preview:
 * no more than the simulated device's own, than the preview shows (its scale times the
 * window's ratio), than the window has pixels for, or than the budget allows.
 */
export function previewPixelRatio(
  device: { width: number; height: number; dpr: number },
  scale: number,
  view: View,
): number {
  const area = device.width * device.height;
  return Math.max(
    0.1,
    Math.min(
      device.dpr,
      scale * view.dpr,
      view.dpr * Math.sqrt((view.width * view.height) / area),
      budgetPixelRatio(device.width, device.height),
    ),
  );
}

/** The window's CSS size and pixel ratio, kept current. Unbounded until mounted. */
export function useView(): View {
  const [view, setView] = useState<View>({
    width: Number.POSITIVE_INFINITY,
    height: Number.POSITIVE_INFINITY,
    dpr: 1,
  });
  useEffect(() => {
    const update = () =>
      setView({
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
      });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return view;
}
