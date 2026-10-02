#!/usr/bin/env node
// Builds the halcyon hero with rushes: 60 frames drawn in code, three tiers, AVIF and WebP,
// posters and a weight report, into public/sequences/dawn (git-ignored). The poster (what
// reduced and static modes show) is the room just after sunrise. Skips the work when the
// manifest is there; pass --force to rebuild.
import { existsSync } from "node:fs";
import path from "node:path";
import { rush } from "@quartifex/rushes";
import { dawnFrame, FRAMES } from "./dawn.mjs";

const out = path.join(import.meta.dirname, "..", "public", "sequences", "dawn");
if (existsSync(path.join(out, "manifest.json")) && !process.argv.includes("--force")) {
  console.log("sequence: public/sequences/dawn is up to date");
} else {
  const start = performance.now();
  const result = await rush({
    input: { frames: FRAMES, render: (i) => dawnFrame(i) },
    out,
    name: "dawn",
    widths: [480, 960, 1600],
    fps: 24,
    poster: Math.round((FRAMES - 1) * 0.85),
    budget: { maxTierBytes: 2_000_000, maxInitialBytes: 400_000, initialFrames: 12 },
  });
  const seconds = ((performance.now() - start) / 1000).toFixed(1);
  console.log(
    `sequence: ${result.manifest.frames} frames, ${result.manifest.tiers.length} tiers in ${seconds} s, ${result.report.pass ? "within" : "OVER"} budget`,
  );
  if (!result.report.pass) process.exitCode = 1;
}
