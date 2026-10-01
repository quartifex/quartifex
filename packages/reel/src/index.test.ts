import { describe, expect, it, vi } from "vitest";
import { scrubReel } from "./gsap.js";
import { evictable, fitRect, nearestLoaded, planLoads, type Reel } from "./index.js";

describe("planLoads", () => {
  it("loads the current frame first, then outwards with a bias ahead", () => {
    const order = planLoads(10, 100, () => false, 1, { ahead: 3, behind: 1, sparse: 0 });
    expect(order).toEqual([10, 11, 9, 12, 13]);
  });

  it("follows the scroll direction", () => {
    const order = planLoads(10, 100, () => false, -1, { ahead: 2, behind: 1, sparse: 0 });
    expect(order).toEqual([10, 9, 11, 8]);
  });

  it("adds the sparse grid and skips loaded frames and the ends", () => {
    const loaded = new Set([0, 1]);
    const order = planLoads(0, 20, (i) => loaded.has(i), 1, { ahead: 2, behind: 2, sparse: 8 });
    expect(order).toEqual([2, 8, 16]);
  });
});

describe("evictable", () => {
  it("drops frames far outside the window but keeps the sparse grid", () => {
    expect(evictable([0, 8, 9, 50, 51], 50, { ahead: 2, behind: 2, sparse: 8 })).toEqual([9]);
  });
});

describe("nearestLoaded", () => {
  it("finds the closest loaded frame, earlier first on a tie", () => {
    const has = (i: number) => i === 4 || i === 8;
    expect(nearestLoaded(6, 10, has)).toBe(4);
    expect(nearestLoaded(7, 10, has)).toBe(8);
    expect(nearestLoaded(5, 10, () => false)).toBe(-1);
  });
});

describe("fitRect", () => {
  const source = { width: 1600, height: 900 };
  it("covers a portrait box by cropping the sides", () => {
    const r = fitRect(source, { width: 390, height: 844 }, "cover");
    expect(r.height).toBeCloseTo(844);
    expect(r.width).toBeCloseTo(1500.4, 1);
    expect(r.x).toBeCloseTo((390 - r.width) / 2);
  });
  it("contains by letterboxing", () => {
    const r = fitRect(source, { width: 390, height: 844 }, "contain");
    expect(r.width).toBeCloseTo(390);
    expect(r.y).toBeGreaterThan(0);
  });
});

describe("scrubReel", () => {
  it("creates a ScrollTrigger that seeks the reel", () => {
    const seek = vi.fn();
    const reel = { seek } as unknown as Reel;
    let onUpdate: ((self: { progress: number }) => void) | undefined;
    const trigger = { kill: vi.fn(), progress: 0.25 };
    const scrollTrigger = {
      create: vi.fn((vars: { onUpdate?: (self: { progress: number }) => void }) => {
        onUpdate = vars.onUpdate;
        return trigger;
      }),
    };
    expect(scrubReel(reel, scrollTrigger, { trigger: "#scene", pin: true })).toBe(trigger);
    expect(scrollTrigger.create).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: "#scene", pin: true, start: "top top" }),
    );
    expect(seek).toHaveBeenCalledWith(0.25);
    onUpdate?.({ progress: 0.6 });
    expect(seek).toHaveBeenLastCalledWith(0.6);
  });
});
