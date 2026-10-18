#!/usr/bin/env node
// Checks kaksha against its block in budget.json with heft: the built assets in public/,
// then the production page loaded, scrolled through and clicked. Also checks /app's
// initial JavaScript (from public/app/build.json) against appInitialJsKb.
// Writes reports/kaksha/heft.json and heft.md; exits 1 when anything is over.
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { readBudget, runHeft } from "@quartifex/heft";
import { REPORTS, withServer } from "./serve.mjs";

const app = path.join(import.meta.dirname, "..");
const root = path.join(app, "..", "..");
const budget = await readBudget(path.join(root, "budget.json"), "kaksha");
const all = JSON.parse(await readFile(path.join(root, "budget.json"), "utf8"));
const entry = all.apps.find((a) => a.app === "kaksha");
const appBuild = JSON.parse(await readFile(path.join(app, "public", "app", "build.json"), "utf8"));
await mkdir(REPORTS, { recursive: true });

const result = await withServer(3502, (url) =>
  runHeft({
    url,
    dir: path.join(app, "public"),
    budget,
    out: REPORTS,
    viewport: { width: 1280, height: 800 },
    interactions: ['a[href="#demo"]'],
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  }),
);
console.log(result.markdown);
const appOk = appBuild.initialJsGzipKb <= entry.appInitialJsKb;
console.log(
  `/app initial JS: ${appBuild.initialJsGzipKb} kB gzip of ${entry.appInitialJsKb} kB budget: ${appOk ? "within" : "OVER"}`,
);
if (!result.pass || !appOk) process.exitCode = 1;
