// Builds the flight list for the Udaan piece from the OpenFlights route and airport databases
// (Open Database License 1.0; routes as of June 2014). The derived file is offered under the
// same licence.
//
// Run from the repo root:  node apps/lab/scripts/udaan-data.mjs
// Writes apps/lab/public/pieces/udaan/: flights.bin, earth.jpg (NASA Blue Marble, oceans and
// all) and night.jpg (NASA Black Marble). None of it is committed; host it with the other piece
// assets. The NASA images are read from the Prithvi script's download cache when it is there.
//
// Each flight is six float32s: origin latitude and longitude, destination latitude and
// longitude (degrees), departure time (hours, UTC) and time in the air (hours).
// OpenFlights lists routes, not timetables, so departures are spread through each airport's
// local day in a typical pattern, and each airline on a route stands for one flight a day.

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "../public/pieces/udaan");
const CACHE = join(here, "../../../.cache/prithvi");
// sharp comes with the workspace's media tools
const sharp = createRequire(join(here, "../../../packages/rushes/package.json"))("sharp");
sharp.cache(false);
const NASA = "https://assets.science.nasa.gov/content/dam/science/esd/eo/images";
const IMAGES = [
  [
    "blue-marble.jpg",
    `${NASA}/bmng/bmng-topography/august/world.topo.200408.3x21600x10800.jpg`,
    "earth.jpg",
    86,
  ],
  [
    "black-marble.jpg",
    `${NASA}/imagerecords/144000/144898/BlackMarble_2016_3km.jpg`,
    "night.jpg",
    82,
  ],
];
const BASE = "https://raw.githubusercontent.com/jpatokal/openflights/master/data";

/** Splits one line of OpenFlights CSV (quoted strings, commas). */
function fields(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A day at a busy airport: the morning bank, a midday lull, the evening bank, a few red-eyes.
const DAY = [
  [0, 5, 0.04],
  [5, 9, 0.27],
  [9, 12, 0.17],
  [12, 15, 0.13],
  [15, 20, 0.26],
  [20, 24, 0.13],
];
function localDeparture(random) {
  let x = random();
  for (const [a, b, w] of DAY) {
    if (x < w) return a + random() * (b - a);
    x -= w;
  }
  return 12;
}

const text = async (name) => {
  const res = await fetch(`${BASE}/${name}`);
  if (!res.ok) throw new Error(`could not fetch ${name}: ${res.status}`);
  return new TextDecoder("latin1").decode(await res.arrayBuffer());
};

const airports = new Map();
for (const line of (await text("airports.dat")).split("\n")) {
  if (!line.trim()) continue;
  const f = fields(line);
  const lat = Number(f[6]);
  const lon = Number(f[7]);
  const tz = Number(f[9]);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    airports.set(f[0], { lat, lon, tz: Number.isFinite(tz) ? tz : Math.round(lon / 15) });
  }
}

// one flight a day for each airline that flies a route itself (codeshares are not extra flights)
const pairs = new Map();
let codeshares = 0;
for (const line of (await text("routes.dat")).split("\n")) {
  if (!line.trim()) continue;
  const f = fields(line);
  if (f[6] === "Y") {
    codeshares++;
    continue;
  }
  const a = airports.get(f[3]);
  const b = airports.get(f[5]);
  if (!a || !b || f[3] === f[5]) continue;
  const key = `${f[3]}>${f[5]}`;
  pairs.set(key, (pairs.get(key) ?? 0) + 1);
}

const random = rng(2014);
const rad = Math.PI / 180;
const out = [];
for (const [key, airlines] of pairs) {
  const [s, d] = key.split(">");
  const a = airports.get(s);
  const b = airports.get(d);
  const cos =
    Math.sin(a.lat * rad) * Math.sin(b.lat * rad) +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lon - a.lon) * rad);
  const km = 6371 * Math.acos(Math.min(1, Math.max(-1, cos)));
  if (km < 60) continue;
  const hours = km / 820 + 0.45;
  for (let n = 0; n < Math.min(airlines, 6); n++) {
    const dep = (((localDeparture(random) - a.tz) % 24) + 24) % 24;
    out.push(a.lat, a.lon, b.lat, b.lon, dep, hours);
  }
}

await mkdir(OUT, { recursive: true });
const data = new Float32Array(out);
await writeFile(join(OUT, "flights.bin"), Buffer.from(data.buffer));
console.log(
  `airports: ${airports.size}, route pairs: ${pairs.size}, codeshares skipped: ${codeshares}`,
);
console.log(`flights a day: ${data.length / 6}, file: ${(data.byteLength / 1e6).toFixed(2)} MB`);

for (const [cached, url, name, quality] of IMAGES) {
  const source = join(CACHE, cached);
  if (!existsSync(source)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`could not fetch ${url}: ${res.status}`);
    await mkdir(CACHE, { recursive: true });
    await writeFile(source, Buffer.from(await res.arrayBuffer()));
  }
  const file = join(OUT, name);
  await sharp(source, { limitInputPixels: false })
    .resize(8192, 4096, { fit: "fill", kernel: "lanczos3" })
    .jpeg({ quality, mozjpeg: true })
    .toFile(file);
  console.log(name, "written");
}
