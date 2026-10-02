#!/usr/bin/env node
// Runs contactsheet across the whole device matrix against the production build and saves
// the report to reports/reelhouse/ (JSON and HTML in git; screenshots and the PNG sheet are
// raster and stay local). Build first: pnpm --filter @quartifex/site-reelhouse build
// PW_CHANNEL=chrome uses an installed browser.
import { runSheet } from "@quartifex/contactsheet";
import { REPORTS, withServer } from "./serve.mjs";

const result = await withServer(3301, (url) =>
  runSheet({
    url,
    out: REPORTS,
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
    // Let the hero draw its first frame.
    ready: (page) => page.waitForTimeout(800),
    onProfile: (profile, i, total) => console.log(`[${i + 1}/${total}] ${profile.name}`),
  }),
);

const flags = Object.entries(result.counts);
console.log(`\n${result.html}`);
console.log(flags.length ? flags.map(([kind, n]) => `${n} ${kind}`).join(", ") : "No flags.");
