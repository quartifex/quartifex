import { describe, expect, it } from "vitest";
import {
  beamAngles,
  DEFAULTS,
  dustField,
  kelvinToCss,
  kelvinToRgb,
  lightAt,
  moteAt,
  qualityFor,
  resolveSettings,
  shaftLight,
  variantFor,
} from "./index.js";

// The core is plain maths and runs in Node. The canvas overlay and the WebGL pass are
// checked in the Lab's Playwright test against /volumetric.

describe("settings", () => {
  it("fills defaults and clamps every field to its range", () => {
    expect(resolveSettings()).toEqual(DEFAULTS);
    const s = resolveSettings({
      density: 3,
      scatter: -1,
      temperature: 50_000,
      source: { x: 9, y: -9 },
    });
    expect(s.density).toBe(1);
    expect(s.scatter).toBe(0);
    expect(s.temperature).toBe(12000);
    expect(s.source).toEqual({ x: 2, y: -1 });
    expect(resolveSettings({ dust: Number.NaN }).dust).toBe(DEFAULTS.dust);
  });
});

describe("colour temperature", () => {
  it("is warm at candle light, near white at daylight, blue in shade", () => {
    const [r1, , b1] = kelvinToRgb(1900);
    expect(r1).toBe(1);
    expect(b1).toBeLessThan(0.2);
    const day = kelvinToRgb(6500);
    for (const c of day) expect(c).toBeGreaterThan(0.9);
    const [r3, , b3] = kelvinToRgb(11000);
    expect(b3).toBe(1);
    expect(r3).toBeLessThan(0.85);
    expect(kelvinToCss(1900)).toMatch(/^rgb\(255 \d+ \d+\)$/);
    expect(kelvinToCss(6500, 0.5)).toMatch(/\/ 0\.5\)$/);
  });
});

describe("quality", () => {
  it("scales samples, resolution, beams and dust with the GPU tier", () => {
    const low = qualityFor({ gpuTier: 0 });
    const high = qualityFor({ gpuTier: 3 });
    expect(low.samples).toBeLessThan(high.samples);
    expect(low.resolution).toBeLessThan(high.resolution);
    expect(low.beams).toBeLessThan(high.beams);
    expect(low.particles).toBeLessThan(high.particles);
    // Unknown tier is treated as 2.
    expect(qualityFor()).toEqual(qualityFor({ gpuTier: 2 }));
  });

  it("steps down with understudy's quality and with Save-Data, and stills under reduced motion", () => {
    const full = qualityFor({ gpuTier: 3 });
    const governed = qualityFor({ gpuTier: 3, quality: { post: false, particles: 0.25 } });
    expect(governed.samples).toBe(full.samples / 2);
    expect(governed.resolution).toBeLessThanOrEqual(0.33);
    expect(governed.particles).toBe(Math.round(full.particles * 0.25));
    expect(qualityFor({ gpuTier: 3, saveData: true }).particles).toBe(full.particles / 2);
    expect(qualityFor({ reducedMotion: true }).animate).toBe(false);
    expect(qualityFor({ gpuTier: 0, quality: { post: false, particles: 1 } }).samples).toBe(12);
  });

  it("uses the WebGL pass on understudy's WebGL rung and the canvas overlay below it", () => {
    expect(variantFor("webgl")).toBe("webgl");
    expect(variantFor(undefined)).toBe("webgl");
    expect(variantFor("sequence")).toBe("canvas");
    expect(variantFor("poster")).toBe("canvas");
    expect(variantFor("webgl", false)).toBe("canvas");
  });
});

describe("motion", () => {
  const settings = resolveSettings({ drift: 1 });

  it("drifts the light slowly, and holds it still under reduced motion", () => {
    const a = lightAt(settings, 2);
    const b = lightAt(settings, 9);
    expect(a.source).not.toEqual(b.source);
    expect(Math.abs(a.source.x - settings.source.x)).toBeLessThanOrEqual(0.06);
    for (const t of [0, 5, 500]) {
      expect(lightAt(settings, t, true)).toEqual({
        source: settings.source,
        density: settings.density,
      });
    }
    expect(lightAt(resolveSettings({ drift: 0 }), 7).source).toEqual(DEFAULTS.source);
  });

  it("draws the same dust every time, rising slowly, still under reduced motion", () => {
    const a = dustField(50, 3);
    expect(a).toEqual(dustField(50, 3));
    expect(a).not.toEqual(dustField(50, 4));
    const mote = a[0];
    if (!mote) throw new Error("no mote");
    expect(moteAt(mote, 30, true)).toEqual({ x: mote.x, y: mote.y });
    const later = moteAt(mote, 30);
    expect(later.y).toBeGreaterThanOrEqual(0);
    expect(later.y).toBeLessThan(1);
    expect(later.y).not.toBeCloseTo(mote.y, 3);
  });
});

describe("shafts", () => {
  it("fans the beams across the frame, away from the source", () => {
    const source = { x: 0.1, y: -0.1 };
    const beams = beamAngles(9, source);
    expect(beams).toHaveLength(9);
    expect(beams).toEqual(beamAngles(9, source));
    // From the top left, the fan points down and right.
    const mean = beams.reduce((sum, a) => sum + a, 0) / beams.length;
    expect(Math.cos(mean)).toBeGreaterThan(0);
    expect(Math.sin(mean)).toBeGreaterThan(0);
  });

  it("lights points along a beam, near the source, and not between beams", () => {
    const source = { x: 0, y: 0 };
    const beam = Math.atan2(0.3, 0.3 * (16 / 9));
    const on = shaftLight({ x: 0.3, y: 0.3 }, source, { density: 1, scatter: 1 }, [beam]);
    const off = shaftLight({ x: 0.05, y: 0.5 }, source, { density: 1, scatter: 1 }, [beam]);
    const far = shaftLight({ x: 0.3, y: 0.3 }, source, { density: 1, scatter: 0 }, [beam]);
    expect(on).toBeGreaterThan(0.5);
    expect(off).toBe(0);
    expect(far).toBeLessThan(on);
  });
});
