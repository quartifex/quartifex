#!/usr/bin/env node
// Builds the QUASAR reveal with rushes: 96 frames drawn in code, three tiers, AVIF and
// WebP, posters and a weight report, into public/sequences/quasar (git-ignored). Skips the
// work when the manifest is there; pass --force to rebuild.
import { existsSync } from "node:fs";
import path from "node:path";
import { rush } from "@quartifex/rushes";
import geometry from "../src/scene/geometry.json" with { type: "json" };
import { quasarFrame } from "./quasar.mjs";

const out = path.join(import.meta.dirname, "..", "public", "sequences", "quasar");
if (existsSync(path.join(out, "manifest.json")) && !process.argv.includes("--force")) {
  console.log("sequence: public/sequences/quasar is up to date");
} else {
  const start = performance.now();
  const result = await rush({
    input: { frames: geometry.frames, render: (i) => quasarFrame(i) },
    out,
    name: "quasar",
    widths: [480, 960, 1600],
    fps: 24,
    poster: geometry.frames - 1,
    budget: { maxTierBytes: 2_500_000, maxInitialBytes: 450_000, initialFrames: 12 },
  });
  const seconds = ((performance.now() - start) / 1000).toFixed(1);
  console.log(
    `sequence: ${result.manifest.frames} frames, ${result.manifest.tiers.length} tiers in ${seconds} s, ${result.report.pass ? "within" : "OVER"} budget`,
  );
  if (!result.report.pass) process.exitCode = 1;
}
