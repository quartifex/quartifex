// In demo mode, tell the product page (same origin only) when a guided task is done,
// so it can tick it off beside the phone. Outside the demo this does nothing.
import { isDemo } from "../lib/db";

export type DemoStep = "mark" | "results" | "report";

export function demoStep(step: DemoStep): void {
  if (!isDemo() || typeof window === "undefined" || window.parent === window) return;
  try {
    window.parent.postMessage({ source: "kaksha-demo", step }, location.origin);
  } catch {
    // A cross-origin parent: say nothing.
  }
}
