// Builds the climate data for the Varsha piece: monthly long-term means (1991–2020) of the
// near-surface wind (NCEP/NCAR Reanalysis 1, sigma 0.995) and of rainfall (GPCP version 2.3),
// both 2.5° grids published by NOAA PSL without usage restrictions, read as text through PSL's
// OPeNDAP server.
//
// Run from the repo root:  node apps/lab/scripts/varsha-data.mjs
// Writes apps/lab/public/pieces/varsha/: climate.bin and earth.jpg (git-ignored; host them).
//
// climate.bin is float32: wind east (12 × 73 × 144, m/s), wind north (the same), then rainfall
// (12 × 72 × 144, mm a day). Rows run north to south (wind from 90°N in 2.5° steps, rainfall
// from 88.75°N); columns run east (wind from 0°, rainfall from 1.25°E). Months January first.

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "../public/pieces/varsha");
const CACHE = join(here, "../../../.cache/prithvi");
const DAP = "https://psl.noaa.gov/thredds/dodsC/Datasets";
const SOURCES = [
  [`${DAP}/ncep.reanalysis.derived/surface/uwnd.sig995.mon.ltm.1991-2020.nc`, "uwnd", 73],
  [`${DAP}/ncep.reanalysis.derived/surface/vwnd.sig995.mon.ltm.1991-2020.nc`, "vwnd", 73],
  [`${DAP}/gpcp/precip.mon.ltm.1991-2020.nc`, "precip", 72],
];

/** Reads one variable's whole 12 × rows × 144 grid as OPeNDAP text, north row first. */
async function grid(url, variable, rows) {
  const res = await fetch(`${url}.ascii?${variable}[0:1:11][0:1:${rows - 1}][0:1:143],lat`);
  if (!res.ok) throw new Error(`${variable}: ${res.status}`);
  const text = await res.text();
  const body = text.slice(text.indexOf("-----"));
  const lats = body.slice(body.lastIndexOf("lat[")).split("\n")[1].split(",").map(Number);
  if (lats.length !== rows)
    throw new Error(`${variable}: ${lats.length} latitudes, expected ${rows}`);
  const southFirst = lats[0] < lats[rows - 1];
  const out = new Float32Array(12 * rows * 144);
  let seen = 0;
  for (const line of body.split("\n")) {
    const m = /^\[(\d+)\]\[(\d+)\], (.*)$/.exec(line.trim());
    if (!m) continue;
    const month = Number(m[1]);
    const row = southFirst ? rows - 1 - Number(m[2]) : Number(m[2]);
    const values = m[3].split(",").map(Number);
    if (values.length !== 144) throw new Error(`${variable}: a row of ${values.length}`);
    for (let c = 0; c < 144; c++) {
      const v = values[c];
      out[(month * rows + row) * 144 + c] = Number.isFinite(v) && Math.abs(v) < 1e10 ? v : 0;
    }
    seen++;
  }
  if (seen !== 12 * rows) throw new Error(`${variable}: read ${seen} rows, expected ${12 * rows}`);
  console.log(
    `${variable}: ${seen * 144} values, rows ${southFirst ? "flipped to" : "already"} north first`,
  );
  return out;
}

await mkdir(OUT, { recursive: true });
const parts = [];
for (const [url, variable, rows] of SOURCES) parts.push(await grid(url, variable, rows));
const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
let at = 0;
for (const p of parts) {
  all.set(p, at);
  at += p.length;
}
await writeFile(join(OUT, "climate.bin"), Buffer.from(all.buffer));
console.log(`climate.bin: ${(all.byteLength / 1e6).toFixed(2)} MB`);

// the Earth: NASA Blue Marble (August), oceans and all, from the Prithvi script's cache
const sharp = createRequire(join(here, "../../../packages/rushes/package.json"))("sharp");
sharp.cache(false);
const blue = join(CACHE, "blue-marble.jpg");
if (!existsSync(blue)) {
  const res = await fetch(
    "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography/august/world.topo.200408.3x21600x10800.jpg",
  );
  if (!res.ok) throw new Error(`Blue Marble: ${res.status}`);
  await mkdir(CACHE, { recursive: true });
  await writeFile(blue, Buffer.from(await res.arrayBuffer()));
}
await sharp(blue, { limitInputPixels: false })
  .resize(8192, 4096, { fit: "fill", kernel: "lanczos3" })
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(join(OUT, "earth.jpg"));
console.log("earth.jpg written");
