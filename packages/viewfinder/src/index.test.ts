import { describe, expect, it } from "vitest";
import { gsapSource } from "./gsap.js";
import {
  compact,
  duration,
  frameStats,
  parseScrollPath,
  positionAt,
  type ScrollPath,
} from "./index.js";
import { reelSource } from "./reel.js";

const PATH: ScrollPath = {
  version: 1,
  samples: [
    { t: 0, y: 0 },
    { t: 100, y: 0 },
    { t: 200, y: 0 },
    { t: 300, y: 300 },
    { t: 1000, y: 1000 },
  ],
};

describe("scroll paths", () => {
  it("interpolates between samples and holds at the ends", () => {
    expect(positionAt(PATH, -10)).toBe(0);
    expect(positionAt(PATH, 250)).toBe(150);
    expect(positionAt(PATH, 650)).toBe(650);
    expect(positionAt(PATH, 5000)).toBe(1000);
    expect(positionAt({ version: 1, samples: [] }, 10)).toBe(0);
    expect(duration(PATH)).toBe(1000);
  });

  it("compacts runs of equal samples without changing the path", () => {
    const small = compact(PATH);
    expect(small.samples.map((s) => s.t)).toEqual([0, 200, 300, 1000]);
    for (const t of [0, 150, 250, 800]) expect(positionAt(small, t)).toBe(positionAt(PATH, t));
  });

  it("round-trips through JSON and rejects anything else", () => {
    expect(parseScrollPath(JSON.stringify(PATH))).toEqual(PATH);
    expect(() => parseScrollPath('{"version":2,"samples":[]}')).toThrow(/not a scroll path/);
    expect(() => parseScrollPath('{"version":1,"samples":[{"t":"a"}]}')).toThrow(/bad sample/);
  });
});

describe("frameStats", () => {
  it("summarises frame times", () => {
    const times = [...Array.from({ length: 95 }, () => 16), 70, 16, 16, 16, 16];
    expect(frameStats(times)).toMatchObject({ longFrames: 1, worst: 70, p95: 16 });
    expect(frameStats(times).fps).toBeGreaterThan(55);
    expect(frameStats([])).toEqual({ fps: 0, p95: 0, longFrames: 0, worst: 0 });
  });
});

describe("sources", () => {
  it("reads ScrollTriggers as scenes", () => {
    const trigger = {
      progress: 0.25,
      start: 100,
      end: 900,
      isActive: true,
      vars: { id: "hero" },
      trigger: null,
    };
    const anonymous = { progress: 0, start: 0, end: 10, isActive: false, vars: {}, trigger: null };
    const reading = gsapSource({ getAll: () => [trigger, anonymous] }).read();
    expect(reading.scenes).toEqual([
      { label: "hero", progress: 0.25, start: 100, end: 900, active: true },
      { label: "trigger 2", progress: 0, start: 0, end: 10, active: false },
    ]);
  });

  it("reads a reel as a sequence", () => {
    const reel = {
      progress: 0.5,
      stats: () => ({
        tier: "w960",
        format: "avif" as const,
        dpr: 2,
        frames: 72,
        loaded: 3,
        indices: [35, 36, 37],
        inFlight: 0,
        current: 36,
        shown: 36,
        reducedMotion: false,
        decision: {} as never,
      }),
    };
    const reading = reelSource(reel, "jar").read();
    expect(reading.sequences?.[0]).toEqual({
      label: "jar",
      frame: 36,
      frames: 72,
      loaded: [35, 36, 37],
      detail: "w960 avif @2x",
    });
    expect(reading.scenes?.[0]).toEqual({ label: "jar", progress: 0.5 });
  });
});
