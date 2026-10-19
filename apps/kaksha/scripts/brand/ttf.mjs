// Unpacks the woff2 files the wordmark needs into scripts/brand/ttf for the generator:
// Barlow Condensed Bold for "kaksha", Mukta Bold for कक्षा (both SIL OFL 1.1).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { decompress } from "wawoff2";

const out = path.join(import.meta.dirname, "ttf");
mkdirSync(out, { recursive: true });
const files = [
  ["barlow-condensed", "barlow-condensed-latin-700-normal"],
  ["mukta", "mukta-devanagari-700-normal"],
];
for (const [pkg, file] of files) {
  const src = path.join(
    import.meta.dirname,
    "..",
    "..",
    "node_modules",
    "@fontsource",
    pkg,
    "files",
    `${file}.woff2`,
  );
  writeFileSync(path.join(out, `${file}.ttf`), await decompress(readFileSync(src)));
}
