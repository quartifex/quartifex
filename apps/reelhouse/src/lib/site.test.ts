import { readFileSync } from "node:fs";
import path from "node:path";
import { framePath, type Manifest, planTiers } from "@quartifex/rushes/browser";
import { describe, expect, it } from "vitest";
import {
  avifRatio,
  budgetJson,
  cliCommand,
  DEFAULTS,
  frameSizes,
  heftFindings,
  reportFor,
} from "./weight";

const app = path.join(import.meta.dirname, "..", "..");

/** A preview-shaped manifest and its files, every frame `bytes` long. */
function fake(bytes: number): { manifest: Manifest; files: Map<string, { size: number }> } {
  const manifest: Manifest = {
    version: 1,
    name: "clip.mp4",
    frames: 24,
    fps: 24,
    source: { width: 1280, height: 720 },
    formats: ["webp"],
    tiers: planTiers({ width: 1280, height: 720 }, 24, [480, 960]).map((t) => ({
      ...t,
      bytes: { webp: t.frames * bytes },
    })),
    pattern: "{tier}/{format}/{index}.{format}",
    pad: 4,
    poster: { webp: "poster.webp", jpg: "poster.jpg" },
    createdAt: "2026-10-03T00:00:00.000Z",
  };
  const files = new Map<string, { size: number }>([
    ["poster.webp", { size: 1000 }],
    ["poster.jpg", { size: 2000 }],
  ]);
  for (const tier of manifest.tiers) {
    for (let i = 0; i < tier.frames; i++) {
      files.set(framePath(manifest, tier, "webp", i), { size: bytes });
    }
  }
  return { manifest, files };
}

describe("reelhouse playground", () => {
  it("reads each tier's frame sizes back from the encoded files", () => {
    const { manifest, files } = fake(5000);
    const sizes = frameSizes(manifest, files);
    expect(sizes("w480", "webp")).toHaveLength(12);
    expect(sizes("w960", "webp")).toEqual(new Array(24).fill(5000));
    expect(sizes("w9999", "webp")).toEqual([]);
  });

  it("re-weighs against a new budget without re-encoding", () => {
    const { manifest, files } = fake(50_000);
    const roomy = reportFor(manifest, files, { ...DEFAULTS, initialBudget: 1_000_000 });
    expect(roomy.pass).toBe(true);
    // The first screen is the poster plus 12 frames: 1000 + 12 x 50 000.
    expect(roomy.lines.find((l) => l.tier === "w960")?.initialBytes).toBe(601_000);
    const tight = reportFor(manifest, files, { tierBudget: 800_000, initialBudget: 700_000 });
    expect(tight.pass).toBe(false);
    expect(tight.lines.find((l) => l.tier === "w480")?.pass).toBe(true);
    expect(tight.lines.find((l) => l.tier === "w960")?.pass).toBe(false);
  });

  it("checks the largest tier the way heft does in CI", () => {
    const { manifest, files } = fake(50_000);
    const [finding] = heftFindings(manifest, files, 1_000_000);
    expect(finding?.metric).toBe("assets.sequenceBytes");
    expect(finding?.actual).toBe(1_200_000);
    expect(finding?.pass).toBe(false);
    expect(heftFindings(manifest, files, 2_000_000).every((f) => f.pass)).toBe(true);
  });

  it("estimates AVIF only from a sequence measured in both formats", () => {
    const { manifest } = fake(1000);
    expect(avifRatio(manifest)).toBeNull();
    expect(avifRatio(null)).toBeNull();
    const both = {
      ...manifest,
      tiers: manifest.tiers.map((t) => ({ ...t, bytes: { webp: 1000, avif: 700 } })),
    };
    expect(avifRatio(both)).toBeCloseTo(0.7);
  });

  it("writes the CLI command and budget.json for the same settings", () => {
    expect(cliCommand("My Clip.MOV", { widths: [1600, 480] })).toBe(
      'npx rushes "My Clip.MOV" --out public/sequences/my-clip --widths 480,1600 --budget budget.json --strict',
    );
    const json = JSON.parse(budgetJson({ tierBudget: 1000, initialBudget: 200 }));
    expect(json.sequence).toEqual({ maxTierBytes: 1000, maxInitialBytes: 200, initialFrames: 12 });
    expect(json.heft.assets.sequenceBytes).toBe(1000);
  });

  it("uses the catalog icon as its favicon, unchanged", () => {
    const icon = readFileSync(path.join(app, "src", "app", "icon.svg"), "utf8");
    const asset = readFileSync(
      path.join(app, "..", "..", "assets", "icons", "svg", "S03-reelhouse.svg"),
      "utf8",
    );
    expect(icon).toBe(asset);
  });
});
