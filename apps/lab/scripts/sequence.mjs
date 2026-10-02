#!/usr/bin/env node
// Generates the hub's demo sequences with rushes, three tiers each, AVIF and WebP, posters
// and a report, git-ignored under public/sequences: "jar" (72 synthetic frames, used by
// reel, rushes, viewfinder and the scene) and "gyro" (72 frames of the understudy demo's
// gyroscope, drawn in code by gyro.mjs). Skips a sequence whose manifest is already there;
// pass --force to rebuild.
import { existsSync } from "node:fs";
import path from "node:path";
import { rush } from "@quartifex/rushes";
import { GYRO, gyroFrame } from "./gyro.mjs";

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

const gyro = path.join(import.meta.dirname, "..", "public", "sequences", "gyro");
if (existsSync(path.join(gyro, "manifest.json")) && !process.argv.includes("--force")) {
  console.log("sequence: public/sequences/gyro is up to date");
} else {
  const start = performance.now();
  const result = await rush({
    input: { frames: GYRO.frames, render: (i) => gyroFrame(i) },
    out: gyro,
    name: "gyro",
    widths: [480, 960, 1600],
    fps: 24,
    budget: { maxTierBytes: 2_500_000, maxInitialBytes: 450_000, initialFrames: 12 },
  });
  const seconds = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`sequence: gyro, ${result.manifest.frames} frames in ${seconds} s`);
}
