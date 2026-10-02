#!/usr/bin/env node
// Checks halcyon against its budget in budget.json with heft: the built assets in
// public/, then the production page loaded, scrolled through and clicked. Writes
// reports/halcyon/heft.json and heft.md and exits 1 when anything is over.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { readBudget, runHeft } from "@quartifex/heft";
import { REPORTS, withServer } from "./serve.mjs";

const root = path.join(import.meta.dirname, "..", "..", "..");
const budget = await readBudget(path.join(root, "budget.json"), "halcyon");
await mkdir(REPORTS, { recursive: true });

const result = await withServer(3402, (url) =>
  runHeft({
    url,
    dir: path.join(import.meta.dirname, "..", "public"),
    budget,
    out: REPORTS,
    viewport: { width: 1280, height: 800 },
    interactions: ['input[name="motion"][value="reduced"]'],
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  }),
);
console.log(result.markdown);
if (!result.pass) process.exitCode = 1;
