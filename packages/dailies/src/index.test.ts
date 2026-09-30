import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  compareImages,
  compareRgba,
  decodePng,
  downsample,
  encodePng,
  matchSnapshot,
  NETWORK_PRESETS,
  progressToScroll,
  type Rgba,
  summariseFrames,
} from "./index.js";

/** A test card: a teal square on black, with optional per-pixel noise like a GPU raster. */
function card(
  width: number,
  height: number,
  options: { noise?: number; shift?: number } = {},
): Rgba {
  const data = new Uint8ClampedArray(width * height * 4);
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const shift = options.shift ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inside = x >= 16 + shift && x < 48 + shift && y >= 16 && y < 48;
      const n = options.noise ? (random() - 0.5) * options.noise : 0;
      data[i] = (inside ? 63 : 5) + n;
      data[i + 1] = (inside ? 190 : 5) + n;
      data[i + 2] = (inside ? 173 : 5) + n;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe("progressToScroll", () => {
  it("maps and clamps progress to a scroll position", () => {
    const range = { start: 100, end: 1100 };
    expect(progressToScroll(range, 0)).toBe(100);
    expect(progressToScroll(range, 0.5)).toBe(600);
    expect(progressToScroll(range, 2)).toBe(1100);
    expect(progressToScroll(range, -1)).toBe(100);
  });
});

describe("downsample", () => {
  it("averages blocks", () => {
    const pixels = [0, 0, 0, 255, 200, 200, 200, 255, 0, 0, 0, 255, 200, 200, 200, 255];
    const small = downsample({ data: new Uint8ClampedArray(pixels), width: 2, height: 2 }, 2);
    expect(small.width).toBe(1);
    expect(small.height).toBe(1);
    expect(Array.from(small.data)).toEqual([100, 100, 100, 255]);
    const square = downsample(card(4, 4), 2);
    expect(square.width).toBe(2);
  });
});

describe("compareRgba", () => {
  it("passes identical images", () => {
    const result = compareRgba(card(64, 64), card(64, 64));
    expect(result.pass).toBe(true);
    expect(result.diffPixels).toBe(0);
  });

  it("fails a real change", () => {
    const result = compareRgba(card(64, 64), card(64, 64, { shift: 8 }));
    expect(result.pass).toBe(false);
    expect(result.diffPixels).toBeGreaterThan(0);
    expect(result.diff.width).toBe(64);
  });

  it("tolerates canvas noise in canvas mode but still catches real changes", () => {
    const clean = card(64, 64);
    const noisy = card(64, 64, { noise: 60 });
    expect(compareRgba(clean, noisy).pass).toBe(false);
    expect(compareRgba(clean, noisy, { canvas: true }).pass).toBe(true);
    expect(compareRgba(clean, card(64, 64, { noise: 60, shift: 8 }), { canvas: true }).pass).toBe(
      false,
    );
  });

  it("ignores masked areas", () => {
    const moved = card(64, 64, { shift: 8 });
    expect(
      compareRgba(card(64, 64), moved, { mask: [{ x: 0, y: 0, width: 64, height: 64 }] }).pass,
    ).toBe(true);
  });

  it("fails on a size change with a reason", () => {
    const result = compareRgba(card(64, 64), card(32, 32));
    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/size differs/);
  });
});

describe("PNG helpers and snapshots", () => {
  it("round-trips PNG buffers", () => {
    const image = card(20, 10);
    const back = decodePng(encodePng(image));
    expect(back.width).toBe(20);
    expect(Array.from(back.data)).toEqual(Array.from(image.data));
    expect(compareImages(encodePng(image), encodePng(image)).pass).toBe(true);
  });

  it("writes a missing baseline, passes a match, and writes a diff on failure", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "dailies-"));
    const baseline = path.join(dir, "chapter.png");
    const first = await matchSnapshot(encodePng(card(64, 64)), baseline);
    expect(first).toMatchObject({ created: true, pass: true });
    expect((await stat(baseline)).size).toBeGreaterThan(0);

    const same = await matchSnapshot(encodePng(card(64, 64)), baseline);
    expect(same).toMatchObject({ created: false, pass: true });

    const changed = await matchSnapshot(encodePng(card(64, 64, { shift: 8 })), baseline);
    expect(changed.pass).toBe(false);
    expect(changed.diffFile).toBe(path.join(dir, "chapter.diff.png"));
    expect(decodePng(await readFile(changed.diffFile ?? "")).width).toBe(64);

    const updated = await matchSnapshot(encodePng(card(64, 64, { shift: 8 })), baseline, {
      update: true,
    });
    expect(updated.created).toBe(true);
  });
});

describe("summariseFrames", () => {
  it("counts slow frames and percentiles", () => {
    const stamps = [0, 16, 32, 48, 100, 116, 132];
    const report = summariseFrames(stamps, { budgetMs: 25, longTasks: 1, layoutShift: 0.012345 });
    expect(report.frames).toBe(6);
    expect(report.slowFrames).toBe(1);
    expect(report.longestFrameMs).toBe(52);
    expect(report.durationMs).toBe(132);
    expect(report.layoutShift).toBe(0.0123);
    expect(summariseFrames([], { budgetMs: 25 }).frames).toBe(0);
  });
});

describe("NETWORK_PRESETS", () => {
  it("orders presets from slowest to fastest", () => {
    expect(NETWORK_PRESETS["slow-3g"].downloadKbps).toBeLessThan(
      NETWORK_PRESETS["fast-3g"].downloadKbps,
    );
    expect(NETWORK_PRESETS["fast-3g"].latency).toBeGreaterThan(NETWORK_PRESETS["slow-4g"].latency);
  });
});
