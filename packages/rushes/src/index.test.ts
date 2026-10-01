import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  frameAt,
  framePath,
  type Manifest,
  naturalSort,
  parseManifest,
  planTiers,
  rush,
  syntheticFrame,
  weigh,
} from "./index.js";

describe("planTiers", () => {
  it("caps widths at the source, orders them, and thins the small tiers", () => {
    const tiers = planTiers({ width: 1600, height: 900 }, 72, [1920, 480, 960]);
    expect(tiers.map((t) => t.name)).toEqual(["w480", "w960", "w1600"]);
    expect(tiers[0]).toMatchObject({ width: 480, height: 270, step: 2, frames: 36 });
    expect(tiers[2]).toMatchObject({ width: 1600, step: 1, frames: 72 });
  });
});

describe("naturalSort", () => {
  it("sorts frame numbers numerically", () => {
    expect(naturalSort(["f10.png", "f2.png", "f1.png"])).toEqual(["f1.png", "f2.png", "f10.png"]);
  });
});

const manifest: Manifest = {
  version: 1,
  name: "jar",
  frames: 4,
  fps: 30,
  source: { width: 1600, height: 900 },
  formats: ["avif", "webp"],
  tiers: [
    { name: "w480", width: 480, height: 270, step: 2, frames: 2, bytes: {} },
    { name: "w960", width: 960, height: 540, step: 1, frames: 4, bytes: {} },
  ],
  pattern: "{tier}/{format}/{index}.{format}",
  pad: 4,
  poster: { avif: "poster.avif" },
  createdAt: "2026-10-01T00:00:00.000Z",
};

describe("manifest helpers", () => {
  it("builds frame paths and clamps the index", () => {
    const tier = manifest.tiers[1] as Manifest["tiers"][number];
    expect(framePath(manifest, tier, "webp", 3)).toBe("w960/webp/0003.webp");
    expect(framePath(manifest, tier, "avif", 99)).toBe("w960/avif/0003.avif");
  });

  it("maps progress to a tier frame", () => {
    expect(frameAt({ frames: 4 }, 0)).toBe(0);
    expect(frameAt({ frames: 4 }, 0.5)).toBe(2);
    expect(frameAt({ frames: 4 }, 2)).toBe(3);
  });

  it("validates manifests", () => {
    expect(parseManifest(JSON.parse(JSON.stringify(manifest))).name).toBe("jar");
    expect(() => parseManifest({ ...manifest, version: 2 })).toThrow(/version/);
    expect(() => parseManifest({ ...manifest, formats: ["gif"] })).toThrow(/format/);
    expect(() => parseManifest({ ...manifest, tiers: [...manifest.tiers].reverse() })).toThrow(
      /smallest first/,
    );
    expect(() => parseManifest({ ...manifest, pattern: "x.png" })).toThrow(/index/);
  });
});

describe("weigh", () => {
  it("counts totals and first-screen weight against the budget", () => {
    const sizes = (tier: string) => (tier === "w480" ? [100, 100] : [300, 300, 300, 300]);
    const report = weigh(manifest, sizes, 50, {
      maxTierBytes: 1000,
      maxInitialBytes: 500,
      initialFrames: 1,
    });
    const w960 = report.lines.find((l) => l.tier === "w960" && l.format === "avif");
    expect(w960).toMatchObject({ bytes: 1200, averageFrame: 300, initialBytes: 350, pass: false });
    expect(report.lines.find((l) => l.tier === "w480")?.pass).toBe(true);
    expect(report.pass).toBe(false);
    expect(weigh(manifest, sizes, 50).pass).toBe(true);
  });
});

describe("syntheticFrame", () => {
  it("draws a labelled SVG frame", () => {
    const svg = syntheticFrame(4, { frames: 10, width: 800, height: 450 });
    expect(svg).toMatch(/^<svg[^>]+width="800"/);
    expect(svg).toContain("FRAME 005 / 10");
    expect(syntheticFrame(0)).not.toBe(syntheticFrame(1));
  });
});

describe("rush", () => {
  it("encodes a frame folder into tiers, posters, a manifest and a report", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "rushes-in-"));
    for (let i = 0; i < 6; i++) {
      const png = await sharp(
        Buffer.from(syntheticFrame(i, { width: 640, height: 360, frames: 6 })),
      )
        .png()
        .toBuffer();
      await writeFile(path.join(dir, `frame${i + 1}.png`), png);
    }
    const out = await mkdtemp(path.join(tmpdir(), "rushes-out-"));
    const result = await rush({
      input: dir,
      out,
      name: "test",
      widths: [320, 640],
      step: (width) => (width < 640 ? 2 : 1),
      budget: { maxTierBytes: 1 },
    });

    const written = parseManifest(JSON.parse(await readFile(result.manifestPath, "utf8")));
    expect(written.frames).toBe(6);
    expect(written.tiers.map((t) => [t.name, t.frames])).toEqual([
      ["w320", 3],
      ["w640", 6],
    ]);
    const tier = written.tiers[1] as Manifest["tiers"][number];
    expect(tier.bytes.avif).toBeGreaterThan(0);
    for (const format of ["avif", "webp"] as const) {
      const meta = await sharp(path.join(out, framePath(written, tier, format, 5))).metadata();
      expect(meta.format).toBe(format === "avif" ? "heif" : "webp");
      expect(meta.width).toBe(640);
    }
    for (const poster of ["poster.avif", "poster.webp", "poster.jpg"]) {
      expect((await stat(path.join(out, poster))).size).toBeGreaterThan(0);
    }
    expect(result.report.pass).toBe(false);
    expect(await readFile(result.reportPath, "utf8")).toContain("| w640 | 640 | 6 | avif |");
  }, 60_000);

  it("generates a synthetic sequence without any input files", async () => {
    const out = await mkdtemp(path.join(tmpdir(), "rushes-syn-"));
    const result = await rush({
      input: { synthetic: { frames: 4, width: 320, height: 180 } },
      out,
      widths: [160],
    });
    expect(result.manifest.name).toBe("synthetic");
    expect(result.manifest.tiers[0]).toMatchObject({ width: 160, frames: 2 });
  }, 60_000);

  it("explains a missing ffmpeg instead of failing obscurely", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "rushes-vid-"));
    const video = path.join(dir, "clip.mp4");
    await writeFile(video, "not really a video");
    await expect(
      rush({ input: video, out: path.join(dir, "out"), ffmpeg: "ffmpeg-that-does-not-exist" }),
    ).rejects.toThrow(/could not run ffmpeg-that-does-not-exist/);
  });
});
