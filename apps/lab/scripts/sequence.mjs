#!/usr/bin/env node
// Generates the hub's demo sequence with rushes: 72 synthetic frames, three tiers, AVIF
// and WebP, posters and a report, into public/sequences/jar (git-ignored). Skips the work
// when the manifest is already there; pass --force to rebuild.
import { existsSync } from "node:fs";
import path from "node:path";
import { rush } from "@quartifex/rushes";

const out = path.join(import.meta.dirname, "..", "public", "sequences", "jar");
if (existsSync(path.join(out, "manifest.json")) && !process.argv.includes("--force")) {
  console.log("sequence: public/sequences/jar is up to date");
} else {
  const start = performance.now();
  const result = await rush({
    input: { synthetic: { frames: 72, width: 1600, height: 900 } },
    out,
    name: "jar",
    widths: [480, 960, 1600],
    fps: 24,
    budget: { maxTierBytes: 2_000_000, maxInitialBytes: 400_000, initialFrames: 12 },
  });
  const seconds = ((performance.now() - start) / 1000).toFixed(1);
  console.log(
    `sequence: ${result.manifest.frames} frames, ${result.manifest.tiers.length} tiers in ${seconds} s`,
  );
}
