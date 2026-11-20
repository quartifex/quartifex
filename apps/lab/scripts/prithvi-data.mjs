// Builds the textures for the Lab piece "prithvi" (the Earth with a movable sea level).
//
//   node apps/lab/scripts/prithvi-data.mjs
//
// Sources (credited on the page):
//   elevation and sea-floor depth: Terrain Tiles on AWS (Mapzen/Tilezen; SRTM, GMTED2010,
//     ETOPO1 and others), https://registry.opendata.aws/terrain-tiles
//   colour: NASA Earth Observatory, Blue Marble: Next Generation (August 2004, with topography)
//   night lights: NASA Earth Observatory, Black Marble 2016 (skipped if it cannot be fetched)
//
// Output goes to apps/lab/public/pieces/prithvi/. Raster files are git-ignored; they are
// hosted outside the repo for the deployed site.

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../packages/rushes/package.json"));
const sharp = require("sharp");
sharp.cache(false);

const OUT = join(here, "../public/pieces/prithvi");
const CACHE = join(here, "../../../.cache/prithvi");
const W = 8192;
const H = 4096;
const Z = 5; // 32 x 32 tiles of 256 px: 8192 px across in Web Mercator
const TILES = 2 ** Z;

// Height code: 12 bits, fine near sea level and coarse in the deep and the high.
// The same numbers are used by the piece to decode; see pieces/prithvi/engine.js.
const SCALE = 60;
const TOP = 9000;
const K = 2047 / Math.asinh(TOP / SCALE);
const encode = (m) => {
  const c = Math.round(K * Math.asinh(Math.min(Math.abs(m), TOP) / SCALE));
  return 2048 + (m < 0 ? -c : c);
};

const BLUE_MARBLE =
  "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography/august/world.topo.200408.3x21600x10800.jpg";
const BLACK_MARBLE = [
  "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg",
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg",
];

// Seas joined to the ocean by straits too narrow for a 5 km grid. Seeding them keeps them
// part of the ocean instead of leaving them as closed basins.
const SEEDS = [
  [0, -160], // open Pacific
  [43, 34], // Black Sea
  [40.75, 28.2], // Sea of Marmara
  [46, 36.5], // Sea of Azov
  [58, 20], // Baltic
  [35, 18], // Mediterranean
  [20, 38.5], // Red Sea
  [27, 51.5], // Persian Gulf
  [60, -86], // Hudson Bay
  [40, 135], // Sea of Japan
];

async function cached(url, file, tries = 4) {
  try {
    return await readFile(file);
  } catch {}
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "quartifex-lab-data/1.0" } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, buf);
      return buf;
    } catch (err) {
      if (attempt >= tries) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

async function elevation() {
  console.log("elevation: fetching", TILES * TILES, "tiles");
  const merc = new Int16Array(W * W);
  const jobs = [];
  for (let ty = 0; ty < TILES; ty++) for (let tx = 0; tx < TILES; tx++) jobs.push([tx, ty]);
  let done = 0;
  async function worker() {
    for (;;) {
      const job = jobs.pop();
      if (!job) return;
      const [tx, ty] = job;
      const png = await cached(
        `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`,
        join(CACHE, "tiles", `${Z}-${tx}-${ty}.png`),
      );
      const { data, info } = await sharp(png)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (info.width !== 256 || info.height !== 256) throw new Error("unexpected tile size");
      for (let y = 0; y < 256; y++) {
        const row = (ty * 256 + y) * W + tx * 256;
        for (let x = 0; x < 256; x++) {
          const i = (y * 256 + x) * 3;
          const m = data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768;
          merc[row + x] = Math.max(-32000, Math.min(32000, Math.round(m)));
        }
      }
      if (++done % 128 === 0) console.log(`  ${done}/${TILES * TILES}`);
    }
  }
  await Promise.all(Array.from({ length: 24 }, worker));

  // Web Mercator -> plate carree. Columns line up one to one; rows are resampled.
  const h = new Int16Array(W * H);
  for (let j = 0; j < H; j++) {
    const lat = Math.max(-85.0511, Math.min(85.0511, 90 - ((j + 0.5) * 180) / H));
    const phi = (lat * Math.PI) / 180;
    const my = (0.5 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / (2 * Math.PI)) * W - 0.5;
    const y0 = Math.max(0, Math.min(W - 1, Math.floor(my)));
    const y1 = Math.min(W - 1, y0 + 1);
    const f = Math.max(0, Math.min(1, my - y0));
    for (let i = 0; i < W; i++) {
      h[j * W + i] = Math.round(merc[y0 * W + i] * (1 - f) + merc[y1 * W + i] * f);
    }
  }
  return h;
}

// For every cell, the lowest sea level at which the ocean reaches it: the highest ground on
// the easiest way in from open water. Where this is above the cell itself, the cell sits in
// a closed basin. (Priority flood, with one bucket per metre.)
function spill(h) {
  console.log("spill heights");
  const N = W * H;
  const OFF = 11500;
  const head = new Int32Array(OFF + 9500).fill(-1);
  const next = new Int32Array(N);
  const seen = new Uint8Array(N);
  const e = new Int16Array(N);
  const push = (cell, key) => {
    next[cell] = head[key + OFF];
    head[key + OFF] = cell;
  };
  for (const [lat, lon] of SEEDS) {
    let best = -1;
    const cj = Math.floor(((90 - lat) / 180) * H);
    const ci = Math.floor(((lon + 180) / 360) * W);
    for (let dj = -6; dj <= 6; dj++)
      for (let di = -6; di <= 6; di++) {
        const cell = (cj + dj) * W + ((ci + di + W) % W);
        if (best < 0 || h[cell] < h[best]) best = cell;
      }
    if (h[best] > 0) console.warn("  seed is not in water:", lat, lon, h[best]);
    if (!seen[best]) {
      seen[best] = 1;
      e[best] = h[best];
      push(best, h[best]);
    }
  }
  for (let key = -OFF; key < 9500; key++) {
    for (;;) {
      const cell = head[key + OFF];
      if (cell < 0) break;
      head[key + OFF] = next[cell];
      const j = Math.floor(cell / W);
      const i = cell - j * W;
      for (let dj = -1; dj <= 1; dj++) {
        const nj = j + dj;
        if (nj < 0 || nj >= H) continue;
        for (let di = -1; di <= 1; di++) {
          if (!dj && !di) continue;
          const n = nj * W + ((i + di + W) % W);
          if (seen[n]) continue;
          seen[n] = 1;
          const nk = Math.max(key, Math.max(-OFF, Math.min(9499, h[n])));
          e[n] = nk;
          push(n, nk);
        }
      }
    }
  }
  return e;
}

async function colour(h, e) {
  console.log("colour: fetching Blue Marble");
  const src = await cached(BLUE_MARBLE, join(CACHE, "blue-marble.jpg"));
  const rgb = await sharp(src, { limitInputPixels: false })
    .resize(W, H, { kernel: "lanczos3", fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const sea = [
    rgb[(H / 2) * W * 3 + 600 * 3],
    rgb[(H / 2) * W * 3 + 600 * 3 + 1],
    rgb[(H / 2) * W * 3 + 600 * 3 + 2],
  ];
  console.log("  open-ocean colour in the source:", sea.join(","));
  const isWater = (r, g, b) =>
    Math.abs(r - sea[0]) + Math.abs(g - sea[1]) + Math.abs(b - sea[2]) < 36 ||
    (b > r + 12 && b >= g && r + g + b < 200) ||
    Math.min(g, b) > r + 18; // shallow, turquoise water over reefs and banks

  // Land colours pushed out over the sea floor, so newly dry land takes after its coast.
  const S = 4;
  const w = W / S;
  const hh = H / S;
  const levels = [];
  let cur = { w, h: hh, c: new Float32Array(w * hh * 3), a: new Float32Array(w * hh) };
  const nearSea = new Uint8Array(w * hh);
  for (let j = 0; j < hh; j++)
    for (let i = 0; i < w; i++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      let wet = 0;
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const p = (j * S + y) * W + i * S + x;
          if (h[p] <= 0 && e[p] <= 0) wet = 1;
          if (h[p] > 0 && !isWater(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2])) {
            r += rgb[p * 3];
            g += rgb[p * 3 + 1];
            b += rgb[p * 3 + 2];
            n++;
          }
        }
      nearSea[j * w + i] = wet;
      if (n) {
        cur.c.set([r / n, g / n, b / n], (j * w + i) * 3);
        cur.a[j * w + i] = 1;
      }
    }
  levels.push(cur);
  while (cur.w > 1) {
    const nw = cur.w >> 1;
    const nh = Math.max(1, cur.h >> 1);
    const nxt = { w: nw, h: nh, c: new Float32Array(nw * nh * 3), a: new Float32Array(nw * nh) };
    for (let j = 0; j < nh; j++)
      for (let i = 0; i < nw; i++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        for (let y = 0; y < 2; y++)
          for (let x = 0; x < 2; x++) {
            const p = Math.min(cur.h - 1, j * 2 + y) * cur.w + i * 2 + x;
            const k = cur.a[p];
            r += cur.c[p * 3] * k;
            g += cur.c[p * 3 + 1] * k;
            b += cur.c[p * 3 + 2] * k;
            a += k;
          }
        if (a > 0) {
          nxt.c.set([r / a, g / a, b / a], (j * nw + i) * 3);
          nxt.a[j * nw + i] = 1;
        }
      }
    levels.push(nxt);
    cur = nxt;
  }
  for (let l = levels.length - 2; l >= 0; l--) {
    const lo = levels[l];
    const up = levels[l + 1];
    for (let j = 0; j < lo.h; j++)
      for (let i = 0; i < lo.w; i++) {
        const p = j * lo.w + i;
        if (lo.a[p] > 0) continue;
        // blend the four nearest cells of the coarser level, so the fill has no blocks
        const fx = (i + 0.5) / 2 - 0.5;
        const fy = Math.max(0, Math.min(up.h - 1, (j + 0.5) / 2 - 0.5));
        const x0 = (Math.floor(fx) + up.w) % up.w;
        const x1 = (x0 + 1) % up.w;
        const y0 = Math.floor(fy);
        const y1 = Math.min(up.h - 1, y0 + 1);
        const tx = fx - Math.floor(fx);
        const ty = fy - y0;
        for (let k = 0; k < 3; k++) {
          const top =
            up.c[(y0 * up.w + x0) * 3 + k] * (1 - tx) + up.c[(y0 * up.w + x1) * 3 + k] * tx;
          const bottom =
            up.c[(y1 * up.w + x0) * 3 + k] * (1 - tx) + up.c[(y1 * up.w + x1) * 3 + k] * tx;
          lo.c[p * 3 + k] = top * (1 - ty) + bottom * ty;
        }
      }
  }
  // soften the blocks the fill leaves behind
  const fill = levels[0].c;
  const known = levels[0].a;
  for (let pass = 0; pass < 24; pass++) {
    const copy = Float32Array.from(fill);
    for (let j = 1; j < hh - 1; j++)
      for (let i = 0; i < w; i++) {
        const p = j * w + i;
        if (known[p] > 0) continue;
        const l = j * w + ((i + w - 1) % w);
        const r = j * w + ((i + 1) % w);
        for (let k = 0; k < 3; k++)
          fill[p * 3 + k] =
            (copy[p * 3 + k] * 2 +
              copy[l * 3 + k] +
              copy[r * 3 + k] +
              copy[(p - w) * 3 + k] +
              copy[(p + w) * 3 + k]) /
            6;
      }
  }
  let replaced = 0;
  for (let j = 0; j < H; j++) {
    const fj = Math.min(hh - 1, j / S - 0.5);
    const j0 = Math.max(0, Math.floor(fj));
    const j1 = Math.min(hh - 1, j0 + 1);
    const ty = Math.max(0, fj - j0);
    for (let i = 0; i < W; i++) {
      const p = j * W + i;
      const coarse = (j >> 2) * w + (i >> 2);
      const wet = isWater(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
      // seas below sea level that the ocean does not reach (the Caspian) keep their own colour
      if (!((h[p] <= 0 && e[p] <= 0) || (wet && nearSea[coarse]))) continue;
      const fi = i / S - 0.5;
      const i0 = (Math.floor(fi) + w) % w;
      const i1 = (i0 + 1) % w;
      const tx = fi - Math.floor(fi);
      for (let k = 0; k < 3; k++) {
        const a = fill[(j0 * w + i0) * 3 + k] * (1 - tx) + fill[(j0 * w + i1) * 3 + k] * tx;
        const b = fill[(j1 * w + i0) * 3 + k] * (1 - tx) + fill[(j1 * w + i1) * 3 + k] * tx;
        rgb[p * 3 + k] = Math.round(a * (1 - ty) + b * ty);
      }
      replaced++;
    }
  }
  console.log("  sea-floor pixels given land colours:", replaced);
  return rgb;
}

async function halves(name, raw, channels, options) {
  for (const [side, left] of [
    ["w", 0],
    ["e", W / 2],
  ]) {
    const file = join(OUT, `${name}-${side}.${options.format}`);
    let img = sharp(raw, {
      raw: { width: W, height: H, channels },
      limitInputPixels: false,
    }).extract({
      left,
      top: 0,
      width: W / 2,
      height: H,
    });
    img = img.jpeg({ quality: options.quality, mozjpeg: true });
    await img.toFile(file);
    console.log(
      `  ${name}-${side}.${options.format}`,
      ((await stat(file)).size / 1e6).toFixed(2),
      "MB",
    );
  }
}

// The height grid goes out as 2048-pixel tiles, so every file stays under the
// 10 MB a single upload may be on the image host. Tile x-y counts from the north-west.
const TILE = 2048;
async function tiles(name, raw) {
  for (let ty = 0; ty < H / TILE; ty++) {
    for (let tx = 0; tx < W / TILE; tx++) {
      const file = join(OUT, `${name}-${tx}-${ty}.png`);
      await sharp(raw, { raw: { width: W, height: H, channels: 3 }, limitInputPixels: false })
        .extract({ left: tx * TILE, top: ty * TILE, width: TILE, height: TILE })
        .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
        .toFile(file);
      console.log(`  ${name}-${tx}-${ty}.png`, ((await stat(file)).size / 1e6).toFixed(2), "MB");
    }
  }
}

await mkdir(OUT, { recursive: true });
const h = await elevation();
const e = spill(h);
let basins = 0;
const packed = Buffer.alloc(W * H * 3);
for (let p = 0; p < W * H; p++) {
  if (e[p] > h[p]) basins++;
  const ch = encode(h[p]);
  const ce = encode(e[p]);
  packed[p * 3] = ch >> 4;
  packed[p * 3 + 1] = ((ch & 15) << 4) | (ce >> 8);
  packed[p * 3 + 2] = ce & 255;
}
console.log("cells in closed basins:", basins);
console.log("height");
await tiles("height", packed);
const rgb = await colour(h, e);
console.log("colour");
await halves("colour", rgb, 3, { format: "jpg", quality: 88 });

let night = false;
for (const url of BLACK_MARBLE) {
  try {
    const src = await cached(url, join(CACHE, "black-marble.jpg"), 1);
    await sharp(src, { limitInputPixels: false })
      .resize(4096, 2048, { fit: "fill" })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(join(OUT, "night.jpg"));
    night = true;
    console.log("night lights: ok");
    break;
  } catch (err) {
    console.warn("night lights: could not fetch", url, String(err).slice(0, 80));
  }
}
await writeFile(
  join(OUT, "manifest.json"),
  `${JSON.stringify({ width: W, height: H, tile: TILE, scale: SCALE, top: TOP, night }, null, 2)}\n`,
);
console.log("done");
