import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { makeGlb, makeModel } from "./glb-fixture.js";
import {
  evaluate,
  findingsMarkdown,
  formatValue,
  githubAnnotations,
  parseGlb,
  weighAssets,
} from "./index.js";

describe("parseGlb", () => {
  it("counts meshes, triangles and embedded images", () => {
    const info = parseGlb(makeModel(1200, 5000));
    expect(info).toMatchObject({
      meshes: 1,
      primitives: 1,
      vertices: 3600,
      triangles: 1200,
      materials: 1,
      textures: 1,
      imageBytes: 5000,
      externalImages: 0,
      extensions: ["KHR_materials_unlit"],
    });
  });

  it("handles strips, external images, and rejects other files", () => {
    const strip = makeGlb({
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, mode: 5 }] }],
      accessors: [{ count: 10 }],
      images: [{ uri: "wood.ktx2" }],
    });
    expect(parseGlb(strip)).toMatchObject({ triangles: 8, externalImages: 1, imageBytes: 0 });
    expect(() => parseGlb(new TextEncoder().encode("not a model at all, really"))).toThrow(
      /not a GLB/,
    );
  });
});

describe("evaluate", () => {
  it("checks only metrics with both a value and a limit", () => {
    const findings = evaluate(
      {
        page: { transferBytes: 900_000, scriptBytes: 300_000, imageBytes: 100 },
        scroll: { frames: 700, longFrames: 3, p95FrameMs: 18, cls: 0.02, inp: 140 },
        assets: {
          totalBytes: 5_000_000,
          textureBytes: 1_000,
          glbs: [{ file: "jar.glb", bytes: 3_000_000, triangles: 200_000 }],
          sequences: [{ file: "seq/manifest.json", largestTierBytes: 1_000_000 }],
        },
      },
      {
        page: { transferBytes: 1_000_000, scriptBytes: 200_000 },
        scroll: { longFrames: 2, cls: 0.1, inp: 200 },
        assets: { glbBytes: 2_000_000, triangles: 300_000 },
      },
    );
    const failed = findings.filter((f) => !f.pass).map((f) => f.metric);
    expect(failed).toEqual(["assets.glbBytes", "page.scriptBytes", "scroll.longFrames"]);
    expect(findings).toHaveLength(7);
  });

  it("formats findings as Markdown and GitHub annotations", () => {
    const findings = evaluate(
      { scroll: { frames: 1, longFrames: 9, p95FrameMs: 40, cls: 0.3, inp: 10 } },
      { scroll: { cls: 0.1, inp: 200 } },
    );
    expect(findingsMarkdown(findings)).toMatch(
      /1 over budget[\s\S]*\| scroll.cls \| 0.300 \| 0.100 \| \*\*over\*\* \|/,
    );
    expect(githubAnnotations(findings)).toEqual([
      "::error title=heft scroll.cls::scroll.cls is 0.300, budget 0.100",
    ]);
    expect(formatValue(1536, "bytes")).toBe("1.5 kB");
    expect(formatValue(3 * 1024 * 1024, "bytes")).toBe("3.00 MB");
  });
});

describe("weighAssets", () => {
  it("weighs GLBs, textures and sequences without counting frames twice", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "heft-"));
    await writeFile(path.join(dir, "jar.glb"), makeModel(500, 2000));
    await writeFile(path.join(dir, "wood.webp"), new Uint8Array(3000));
    await mkdir(path.join(dir, "seq", "w480", "avif"), { recursive: true });
    await writeFile(path.join(dir, "seq", "w480", "avif", "0000.avif"), new Uint8Array(4000));
    await writeFile(
      path.join(dir, "seq", "manifest.json"),
      JSON.stringify({
        version: 1,
        name: "seq",
        frames: 1,
        fps: 24,
        source: { width: 480, height: 270 },
        formats: ["avif"],
        tiers: [
          { name: "w480", width: 480, height: 270, step: 1, frames: 1, bytes: { avif: 4000 } },
        ],
        pattern: "{tier}/{format}/{index}.{format}",
        pad: 4,
        poster: {},
        createdAt: "",
      }),
    );
    await writeFile(path.join(dir, "package.json"), "{}");
    const assets = await weighAssets(dir);
    expect(assets.glbs).toEqual([
      { file: "jar.glb", bytes: makeModel(500, 2000).byteLength, triangles: 500 },
    ]);
    expect(assets.textureBytes).toBe(3000);
    expect(assets.sequences).toEqual([
      { file: path.join("seq", "manifest.json"), largestTierBytes: 4000 },
    ]);
    expect(assets.totalBytes).toBe(makeModel(500, 2000).byteLength + 3000 + 4000);
  });
});
