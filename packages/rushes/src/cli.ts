#!/usr/bin/env node
// rushes <frames-folder | video | --synthetic> --out <dir> [options]
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { type Budget, type Format, formatBytes, rush } from "./index.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string", default: "sequence" },
    name: { type: "string" },
    widths: { type: "string" },
    formats: { type: "string" },
    fps: { type: "string" },
    poster: { type: "string" },
    budget: { type: "string" },
    ffmpeg: { type: "string" },
    synthetic: { type: "string" },
    strict: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

const input = positionals[0];
if (values.help || (!input && !values.synthetic)) {
  console.log(`Usage: rushes <frames-folder | video> --out <dir> [options]
       rushes --synthetic 72 --out <dir>

  --widths 480,960,1600   tier widths (capped at the source width)
  --formats avif,webp     output formats
  --fps 30                extraction rate for video, recorded in the manifest
  --poster 0              source frame for the poster
  --budget budget.json    a JSON file with maxTierBytes, maxInitialBytes, initialFrames, tiers
                          (or a "sequence" key holding those)
  --ffmpeg <path>         ffmpeg binary for video input (default: RUSHES_FFMPEG, then PATH)
  --synthetic <frames>    generate a test sequence instead of reading input
  --strict                exit 1 when over budget`);
  process.exit(input || values.synthetic ? 0 : 1);
}

let budget: Budget | undefined;
if (values.budget) {
  const raw = JSON.parse(await readFile(values.budget, "utf8")) as Budget & { sequence?: Budget };
  budget = raw.sequence ?? raw;
}

const list = (text: string | undefined) => text?.split(",").map((part: string) => part.trim());
const widths = list(values.widths)?.map(Number);
const result = await rush({
  input: values.synthetic ? { synthetic: { frames: Number(values.synthetic) } } : (input as string),
  out: values.out,
  ...(values.name ? { name: values.name } : {}),
  ...(widths ? { widths } : {}),
  ...(values.formats ? { formats: list(values.formats) as Format[] } : {}),
  ...(values.fps ? { fps: Number(values.fps) } : {}),
  ...(values.poster ? { poster: Number(values.poster) } : {}),
  ...(values.ffmpeg ? { ffmpeg: values.ffmpeg } : {}),
  ...(budget ? { budget } : {}),
  onProgress: (done, total) => {
    if (done === total || done % 10 === 0) console.log(`encoded ${done}/${total}`);
  },
});

for (const line of result.report.lines) {
  console.log(
    `${line.tier.padEnd(6)} ${line.format.padEnd(5)} ${formatBytes(line.bytes).padStart(9)}  first screen ${formatBytes(line.initialBytes).padStart(9)}  ${line.pass ? "pass" : "OVER"}`,
  );
}
console.log(`\n${result.manifestPath}\n${result.reportPath}`);
if (values.strict && !result.report.pass) process.exitCode = 1;
