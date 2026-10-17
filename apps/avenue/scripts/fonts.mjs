#!/usr/bin/env node
// Cuts the display face before dev and build: Archivo (variable) narrowed to the weights and
// widths the page sets (wght 300 to 650, wdth 100 to 125), every Latin glyph kept. About a
// third of the full file; the hero headline (the page's LCP element) is set in it.
// Output is git-ignored (font files are never committed); skipped when already there.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import subsetFont from "subset-font";

const app = path.join(import.meta.dirname, "..");
const out = path.join(app, "src", "app", "generated", "archivo-display.woff2");
const VERSION = "wght300-650;wdth100-125";
const stamp = `${out}.stamp`;

if (existsSync(out) && existsSync(stamp) && (await readFile(stamp, "utf8")) === VERSION) {
  console.log("fonts: display face is up to date");
} else {
  const src = await readFile(
    path.join(
      app,
      "node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2",
    ),
  );
  let text = "‘’‚“”„†‡•…‰‹›€₹™−‑–—→←↑↓×·°";
  for (let c = 0x20; c < 0x250; c++) text += String.fromCodePoint(c);
  const cut = await subsetFont(src, text, {
    targetFormat: "woff2",
    variationAxes: { wght: { min: 300, max: 650 }, wdth: { min: 100, max: 125 } },
  });
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, cut);
  await writeFile(stamp, VERSION);
  console.log(
    `fonts: display face ${(src.length / 1024).toFixed(0)} kB to ${(cut.length / 1024).toFixed(0)} kB`,
  );
}
