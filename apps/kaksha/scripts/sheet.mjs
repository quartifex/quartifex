#!/usr/bin/env node
// Runs contactsheet across the device matrix, plus low-end Android profiles, against the
// production build (the site, and the app's demo) and saves the reports to reports/kaksha/
// (JSON and HTML in git; screenshots and the PNG sheet are raster and stay local).
// Build first. PW_CHANNEL=chrome uses an installed browser.
import path from "node:path";
import { PROFILES, runSheet } from "@quartifex/contactsheet";
import { REPORTS, withServer } from "./serve.mjs";

// Android Go class phones: small screens, low pixel ratios.
const ua =
  "Mozilla/5.0 (Linux; Android 13; Go) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36";
const lowEnd = [
  ["Android Go 320x640 @1.5", "phone", 320, 640, 1.5],
  ["Android Go 360x720 @2", "phone", 360, 720, 2],
  ["Budget Android 360x760 @2", "phone", 360, 760, 2],
  ["Budget Android landscape 720x360 @2", "phone-landscape", 720, 360, 2],
].map(([name, group, width, height, dpr]) => ({
  name,
  group,
  width,
  height,
  dpr,
  mobile: true,
  touch: true,
  userAgent: ua,
}));

for (const [label, route] of [
  ["site", "/"],
  ["app", "/app?demo=1"],
]) {
  const result = await withServer(3501, (url) =>
    runSheet({
      url: `${url}${route}`,
      out: path.join(REPORTS, `sheet-${label}`),
      profiles: [...PROFILES, ...lowEnd],
      ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
      ready: (page) => page.waitForTimeout(label === "app" ? 1500 : 800),
      onProfile: (profile, i, total) => console.log(`[${label} ${i + 1}/${total}] ${profile.name}`),
    }),
  );
  const flags = Object.entries(result.counts);
  console.log(
    `${label}: ${flags.length ? flags.map(([kind, n]) => `${n} ${kind}`).join(", ") : "no flags"}`,
  );
}
