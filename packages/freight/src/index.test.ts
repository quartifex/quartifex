import { describe, expect, it } from "vitest";
import { create, prefersReducedMotion } from "./index.js";

// Logic tests run in Node. Anything that touches the DOM or scroll also needs one
// Playwright behaviour test against the demo page in apps/lab.
const target = {} as unknown as Element;

describe("freight", () => {
  it("reports no reduced-motion preference where matchMedia is unavailable", () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it("lets the caller force the reduced-motion path", () => {
    expect(create(target, { reducedMotion: true }).reducedMotion).toBe(true);
    expect(create(target).reducedMotion).toBe(false);
  });

  it("can be destroyed more than once without throwing", () => {
    const instance = create(target);
    instance.destroy();
    expect(() => instance.destroy()).not.toThrow();
  });
});
