#!/usr/bin/env node
// Builds AVENUE's generated assets before dev and build (all git-ignored, nothing downloaded):
//   public/models/avenue-car.glb and avenue-car-lite.glb, from src/three/shape.ts, optimised
//     and budget-checked by freight (reports in reports/avenue/freight-*);
//   public/sequences/cabin/, the image-sequence fallback drawn from the same geometry and
//     encoded by rushes.
// Each is skipped when its inputs have not changed; pass --force to rebuild.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { rush } from "@quartifex/rushes";
import { posterSvg } from "../src/stage/poster.ts";
import { buildCarModels } from "./car.mjs";

const app = path.join(import.meta.dirname, "..");
const force = process.argv.includes("--force");
const FRAMES = 48;

async function stamp(files) {
  const hash = createHash("sha256");
  for (const f of files) hash.update(await readFile(path.join(app, f)));
  return hash.digest("hex").slice(0, 16);
}

async function step(name, out, inputs, run) {
  const marker = path.join(out, ".stamp");
  const want = await stamp(inputs);
  if (!force && existsSync(marker) && (await readFile(marker, "utf8")) === want) {
    console.log(`assets: ${name} is up to date`);
    return;
  }
  const start = performance.now();
  const ok = await run();
  await writeFile(marker, want);
  console.log(`assets: ${name} built in ${((performance.now() - start) / 1000).toFixed(1)} s`);
  if (!ok) process.exitCode = 1;
}

await step(
  "car models",
  path.join(app, "public", "models"),
  ["src/three/shape.ts", "scripts/car.mjs"],
  async () => {
    const { results, pass } = await buildCarModels();
    for (const r of results) {
      const a = r.result.result.after;
      console.log(
        `  ${r.lod}: ${r.file} ${(a.bytes / 1024).toFixed(0)} kB, ${a.triangles} triangles, ${a.drawCalls} draw calls, ${r.result.verdict?.pass ? "within" : "OVER"} budget`,
      );
    }
    return pass;
  },
);

// The display face, cut to the weights and widths the page sets (wght 300 to 500, wdth 100 to
// 125) with every glyph of the Latin file kept: about 27 kB instead of 90. The hero headline
// is the page's LCP element, and the swap to this face re-records it.
await step(
  "display face",
  path.join(app, "src", "app", "generated"),
  ["scripts/assets.mjs", "node_modules/@fontsource-variable/archivo/package.json"],
  async () => {
    const { default: subsetFont } = await import("subset-font");
    const { mkdir } = await import("node:fs/promises");
    const src = await readFile(
      path.join(app, "node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2"),
    );
    // Everything the Latin file can hold (code points it lacks are simply skipped).
    let text = "‘’‚“”„†‡•…‰‹›€₹™−‑–—→←↑↓×·";
    for (let c = 0x20; c < 0x250; c++) text += String.fromCodePoint(c);
    const out = await subsetFont(src, text, {
      targetFormat: "woff2",
      variationAxes: { wght: { min: 300, max: 500 }, wdth: { min: 100, max: 125 } },
    });
    await mkdir(path.join(app, "src", "app", "generated"), { recursive: true });
    await writeFile(path.join(app, "src", "app", "generated", "archivo-display.woff2"), out);
    console.log(`  ${(src.length / 1024).toFixed(0)} kB to ${(out.length / 1024).toFixed(0)} kB`);
    return true;
  },
);

await step(
  "cabin sequence",
  path.join(app, "public", "sequences", "cabin"),
  ["src/three/shape.ts", "src/stage/poster.ts"],
  async () => {
    const result = await rush({
      input: {
        frames: FRAMES,
        render: (i) => posterSvg({ width: 1600, height: 900, t: i / (FRAMES - 1), id: `f${i}` }),
      },
      out: path.join(app, "public", "sequences", "cabin"),
      name: "cabin",
      widths: [480, 960, 1600],
      fps: 24,
      poster: 0,
      budget: { maxTierBytes: 2_500_000, maxInitialBytes: 400_000, initialFrames: 12 },
    });
    console.log(
      `  ${result.manifest.frames} frames, ${result.manifest.tiers.length} tiers, ${result.report.pass ? "within" : "OVER"} budget`,
    );
    return result.report.pass;
  },
);
