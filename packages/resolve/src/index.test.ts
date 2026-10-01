import { describe, expect, it } from "vitest";
import { getGpuTier } from "./gpu.js";
import {
  DEFAULT_RULES,
  decide,
  defineRules,
  type Environment,
  explain,
  readEnvironment,
  targetFromManifest,
} from "./index.js";

const target = {
  tiers: [
    { name: "w480", width: 480 },
    { name: "w960", width: 960 },
    { name: "w1600", width: 1600 },
    { name: "w2560", width: 2560 },
  ],
  aspect: 16 / 9,
  fit: "contain" as const,
};

const phone: Environment = { width: 390, height: 844, dpr: 3, gpuTier: 2, effectiveType: "4g" };

describe("decide", () => {
  it("does not send 2560 px frames to a 390 px phone at DPR 3", () => {
    const d = decide(phone, target);
    // contain: 390 CSS px wide, at the GPU tier 2 cap of 2x = 780 device px.
    expect(d.dpr).toBe(2);
    expect(d.needed).toBe(780);
    expect(d.tier.name).toBe("w960");
    expect(d.reasons.dpr.join(" ")).toMatch(/capped at 2 for GPU tier 2/);
  });

  it("covers a phone screen with a landscape sequence by drawing it wider", () => {
    const d = decide(phone, { ...target, fit: "cover" });
    // cover: 844 * 16/9 = 1500 CSS px wide, 3001 device px: more than any tier.
    expect(d.needed).toBe(3001);
    expect(d.tier.name).toBe("w2560");
    expect(d.reasons.tier.join(" ")).toMatch(/upscaled/);
  });

  it("uses the tolerance so a few missing pixels do not cost a tier", () => {
    const d = decide({ width: 900, height: 506, dpr: 1, gpuTier: 3 }, target);
    expect(d.needed).toBe(900);
    expect(d.tier.name).toBe("w960");
    const d2 = decide({ width: 1000, height: 563, dpr: 1, gpuTier: 3 }, target);
    expect(d2.tier.name).toBe("w960"); // 960 >= 1000 * 0.9
  });

  it("follows the network and Save-Data", () => {
    const desktop: Environment = { width: 1920, height: 1080, dpr: 2, gpuTier: 3 };
    expect(decide(desktop, target).tier.name).toBe("w2560");
    // 3g: 1.5x needs 2880 px (the largest tier), then one tier down.
    expect(decide({ ...desktop, effectiveType: "3g" }, target)).toMatchObject({
      dpr: 1.5,
      tier: { name: "w1600" },
    });
    const slow = decide({ ...desktop, effectiveType: "2g" }, target);
    expect(slow).toMatchObject({ dpr: 1, tier: { name: "w480" } });
    expect(slow.reasons.tier.join(" ")).toMatch(/limited to w480 on 2g/);
    const saving = decide({ ...desktop, saveData: true }, target);
    expect(saving.dpr).toBe(1);
    // At 1x it needs 1920 px (w2560), then steps down one tier for Save-Data.
    expect(saving.tier.name).toBe("w1600");
  });

  it("sizes textures and shadow maps by need and GPU tier", () => {
    const weak = decide({ width: 1920, height: 1080, dpr: 2, gpuTier: 0 }, target);
    expect(weak.dpr).toBe(1);
    expect(weak.texture).toBe(1024);
    expect(weak.shadowMap).toBe(0);
    expect(weak.reasons.shadowMap[0]).toMatch(/off for GPU tier 0/);
    const strong = decide({ width: 1920, height: 1080, dpr: 2, gpuTier: 3 }, target);
    expect(strong.texture).toBe(4096);
    expect(strong.shadowMap).toBe(2048);
    const saving = decide(
      { width: 1920, height: 1080, dpr: 2, gpuTier: 3, saveData: true },
      target,
    );
    expect(saving.texture).toBe(1024);
    expect(saving.shadowMap).toBe(1024);
  });

  it("assumes GPU tier 2 when unknown, and says so", () => {
    const d = decide({ width: 390, height: 844, dpr: 3 }, target);
    expect(d.dpr).toBe(2);
    expect(d.reasons.dpr.join(" ")).toMatch(/unknown, assumed/);
  });

  it("explains every choice on its own line", () => {
    const text = explain(decide(phone, target));
    expect(text.split("\n")).toHaveLength(4);
    expect(text).toMatch(/^tier w960: contain into 390 x 844/);
  });

  it("rejects an empty ladder", () => {
    expect(() => decide(phone, { tiers: [] })).toThrow(/no tiers/);
  });
});

describe("defineRules", () => {
  it("merges overrides with the defaults", () => {
    const rules = defineRules({ maxDpr: [1, 1, 1, 1], network: { "4g": { maxTier: 1 } } });
    expect(rules.network["2g"]).toEqual(DEFAULT_RULES.network["2g"]);
    const d = decide({ ...phone, effectiveType: "4g" }, target, rules);
    expect(d.dpr).toBe(1);
    expect(
      decide({ width: 1920, height: 1080, dpr: 1, gpuTier: 3, effectiveType: "4g" }, target, rules)
        .tier.name,
    ).toBe("w960");
  });
});

describe("environment", () => {
  it("reads viewport, connection and reduced-data preference", () => {
    const win = {
      innerWidth: 400,
      innerHeight: 800,
      devicePixelRatio: 3,
      navigator: { connection: { effectiveType: "3g", saveData: false } },
      matchMedia: (q: string) => ({ matches: q === "(prefers-reduced-data: reduce)" }),
    } as unknown as Window;
    expect(readEnvironment(1, win)).toEqual({
      width: 400,
      height: 800,
      dpr: 3,
      gpuTier: 1,
      effectiveType: "3g",
      saveData: true,
    });
  });

  it("builds a target from a rushes manifest", () => {
    const t = targetFromManifest({
      version: 1,
      name: "jar",
      frames: 2,
      fps: 24,
      source: { width: 1600, height: 900 },
      formats: ["webp"],
      tiers: [{ name: "w480", width: 480, height: 270, step: 2, frames: 1, bytes: {} }],
      pattern: "{tier}/{format}/{index}.{format}",
      pad: 4,
      poster: {},
      createdAt: "",
    });
    expect(t.tiers).toEqual([{ name: "w480", width: 480 }]);
    expect(t.aspect).toBeCloseTo(16 / 9);
  });

  it("never throws: a tier from detect-gpu, or undefined without it or without WebGL", async () => {
    expect([undefined, 0, 1, 2, 3]).toContain(await getGpuTier());
  });
});
