// Unpacks the Mukta Bold woff2 files into scripts/brand/ttf for the generator.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { decompress } from "wawoff2";

const out = path.join(import.meta.dirname, "ttf");
mkdirSync(out, { recursive: true });
for (const subset of ["latin", "devanagari"]) {
  const file = `mukta-${subset}-700-normal`;
  const src = path.join(
    import.meta.dirname,
    "..",
    "..",
    "node_modules",
    "@fontsource",
    "mukta",
    "files",
    `${file}.woff2`,
  );
  writeFileSync(path.join(out, `${file}.ttf`), await decompress(readFileSync(src)));
}
