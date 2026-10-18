#!/usr/bin/env node
// Captures the install section's screenshots from the real app running the demo, in
// both languages, into public/shots (WebP, git-ignored: raster is never committed).
// Build first. PW_CHANNEL=chrome uses an installed browser.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { withServer } from "./serve.mjs";

const out = path.join(import.meta.dirname, "..", "public", "shots");
mkdirSync(out, { recursive: true });
const SCREENS = [
  ["home", "#/"],
  ["mark", "#/test/demo-maths-sep/mark"],
  ["results", "#/test/demo-maths-aug"],
];

await withServer(3503, async (url) => {
  const browser = await chromium.launch(
    process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {},
  );
  for (const lang of ["en", "hi"]) {
    const context = await browser.newContext({
      viewport: { width: 360, height: 760 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    const page = await context.newPage();
    for (const [name, hash] of SCREENS) {
      await page.goto(`${url}/app?demo=1&lang=${lang}${hash}`);
      await page.waitForSelector(".k-bar");
      await page.waitForTimeout(600);
      const png = await page.screenshot();
      await sharp(png)
        .resize(360)
        .webp({ quality: 80 })
        .toFile(path.join(out, `${lang}-${name}.webp`));
    }
    await context.close();
  }
  await browser.close();
});
console.log("shots: written to public/shots");
