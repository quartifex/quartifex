#!/usr/bin/env node
// contactsheet <url> [--out dir] [--profiles phone,tablet,...] [--chapters selector] [--channel chrome]
import { parseArgs } from "node:util";
import { GROUPS, runSheet } from "./index.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string", default: "reports/contactsheet" },
    profiles: { type: "string" },
    chapters: { type: "string" },
    at: { type: "string" },
    channel: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

const url = positionals[0];
if (values.help || !url) {
  console.log(`Usage: contactsheet <url> [options]

  --out <dir>          output folder (default reports/contactsheet)
  --profiles <list>    comma-separated groups or profile names (default: all)
                       groups: ${GROUPS.join(", ")}
  --chapters <sel>     chapter selector (default [data-chapter])
  --at <0..1>          where in each chapter to shoot (default 0.5)
  --channel <name>     browser channel, e.g. chrome or msedge`);
  process.exit(url ? 0 : 1);
}

const result = await runSheet({
  url,
  out: values.out,
  ...(values.profiles
    ? { profiles: values.profiles.split(",").map((name: string) => name.trim()) }
    : {}),
  ...(values.chapters ? { chapters: values.chapters } : {}),
  ...(values.at ? { at: Number(values.at) } : {}),
  ...(values.channel ? { channel: values.channel } : {}),
  onProfile: (profile, i, total) => console.log(`[${i + 1}/${total}] ${profile.name}`),
});

const flags = Object.entries(result.counts);
console.log(`\n${result.html}`);
console.log(flags.length ? flags.map(([kind, n]) => `${n} ${kind}`).join(", ") : "No flags.");
