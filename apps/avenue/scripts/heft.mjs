#!/usr/bin/env node
// Checks avenue against its budget in budget.json with heft: the built assets in
// public/, then the production page loaded, scrolled through and clicked. Writes
// reports/avenue/heft.json and heft.md and exits 1 when anything is over.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { readBudget, runHeft } from "@quartifex/heft";
import { REPORTS, withServer } from "./serve.mjs";

const root = path.join(import.meta.dirname, "..", "..", "..");
const budget = await readBudget(path.join(root, "budget.json"), "avenue");
await mkdir(REPORTS, { recursive: true });

const result = await withServer(3502, (url) =>
  runHeft({
    url,
    dir: path.join(import.meta.dirname, "..", "public"),
    budget,
    out: REPORTS,
    viewport: { width: 1280, height: 800 },
    interactions: [
      "#demo [role=radio]:nth-child(1)",
      '#demo button[role=radio]:has-text("Moving")',
    ],
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  }),
);
console.log(result.markdown);
if (!result.pass) process.exitCode = 1;
