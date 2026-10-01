#!/usr/bin/env node
// heft --budget budget.json [--url <page>] [--dir <build output>] [--out <dir>] [--channel chrome]
import { parseArgs } from "node:util";
import { formatValue, readBudget, runHeft } from "./index.js";

const { values } = parseArgs({
  options: {
    budget: { type: "string", default: "budget.json" },
    app: { type: "string" },
    url: { type: "string" },
    dir: { type: "string" },
    out: { type: "string" },
    channel: { type: "string" },
    width: { type: "string" },
    height: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || (!values.url && !values.dir)) {
  console.log(`Usage: heft --budget budget.json [--url <page>] [--dir <build output>]

  --app <name>     use that app's "heft" block from budget.json's apps list
  --url <page>     load, scroll through and interact with this page
  --dir <folder>   weigh GLBs, textures and rushes sequences in this folder
  --out <folder>   write heft.json and heft.md
  --channel <name> browser channel, e.g. chrome
  --width, --height viewport (default 1280 x 800)

Exits 1 when anything is over budget. On GitHub Actions it also writes error
annotations and a step summary.`);
  process.exit(values.help ? 0 : 1);
}

const result = await runHeft({
  budget: await readBudget(values.budget, values.app),
  ...(values.url ? { url: values.url } : {}),
  ...(values.dir ? { dir: values.dir } : {}),
  ...(values.out ? { out: values.out } : {}),
  ...(values.channel ? { channel: values.channel } : {}),
  ...(values.width && values.height
    ? { viewport: { width: Number(values.width), height: Number(values.height) } }
    : {}),
});

for (const f of result.findings) {
  console.log(
    `${f.pass ? "pass" : "OVER"}  ${f.metric.padEnd(22)} ${formatValue(f.actual, f.unit).padStart(10)} / ${formatValue(f.limit, f.unit)}${f.file ? `  ${f.file}` : ""}`,
  );
}
if (result.findings.length === 0) console.log("Nothing to check: add limits to the budget.");
if (!result.pass) process.exitCode = 1;
