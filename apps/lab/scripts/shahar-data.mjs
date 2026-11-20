// Builds the city models for the Shahar piece from OpenStreetMap (© OpenStreetMap
// contributors, Open Database License 1.0), fetched through the Overpass API.
//
// Run from the repo root:  node apps/lab/scripts/shahar-data.mjs
// Writes apps/lab/public/pieces/shahar/<city>.json (git-ignored; host them). Our derived files
// are offered under the same licence.
//
// Each file: { name, lat, lon, utc, buildings: [[height m, estimated 0/1, x, z, x, z, ...]],
// parks: [[x, z, ...]], water: [[x, z, ...]], roads: [[width m, x, z, ...]] } in metres east (x)
// and south (z) of the centre. Where OpenStreetMap has no height, it is estimated from the
// number of floors, or failing that from the kind of building, and marked as estimated.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "../public/pieces/shahar");
const OVERPASS = "https://overpass-api.de/api/interpreter";

// south, west, north, east; standard-time offset from UTC in hours
export const CITIES = {
  delhi: {
    name: "New Delhi, Connaught Place",
    box: [28.615, 77.2, 28.645, 77.235],
    utc: 5.5,
    floors: 3,
  },
  mumbai: {
    name: "Mumbai, Nariman Point and the Fort",
    box: [18.918, 72.817, 18.945, 72.84],
    utc: 5.5,
    floors: 5,
  },
  newyork: {
    name: "New York, Midtown",
    box: [40.745, -73.998, 40.77, -73.968],
    utc: -5,
    floors: 6,
  },
  london: { name: "London, the City", box: [51.508, -0.1, 51.522, -0.07], utc: 0, floors: 5 },
};

const ROAD = {
  motorway: 22,
  trunk: 18,
  primary: 15,
  secondary: 12,
  tertiary: 10,
  residential: 7,
  unclassified: 7,
  pedestrian: 6,
  service: 4,
};

function metres(value) {
  if (!value) return null;
  const m = /^\s*([\d.]+)\s*(m|ft|')?/.exec(String(value));
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "ft" || m[2] === "'" ? n * 0.3048 : n;
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

async function city(key) {
  const c = CITIES[key];
  const [s, w, n, e] = c.box;
  const bb = `${s},${w},${n},${e}`;
  const query = `[out:json][timeout:180];
(
  way["building"](${bb});
  relation["building"]["type"="multipolygon"](${bb});
  way["leisure"~"park|garden|pitch"](${bb});
  way["landuse"~"grass|recreation_ground|forest|meadow"](${bb});
  way["natural"~"water|wood"](${bb});
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|pedestrian|service)$"](${bb});
);
out geom;`;
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "quartifex-lab/1.0",
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`${key}: Overpass ${res.status}`);
  const data = await res.json();
  const lat0 = (s + n) / 2;
  const lon0 = (w + e) / 2;
  const kx = Math.cos((lat0 * Math.PI) / 180) * 111320;
  const kz = 110540;
  const flat = (geometry) => {
    const out = [];
    for (const p of geometry)
      out.push(
        Math.round((p.lon - lon0) * kx * 10) / 10,
        Math.round(-(p.lat - lat0) * kz * 10) / 10,
      );
    return out;
  };
  const random = rng(key.length * 7919);
  const out = {
    name: c.name,
    lat: lat0,
    lon: lon0,
    utc: c.utc,
    buildings: [],
    parks: [],
    water: [],
    roads: [],
  };
  let measured = 0;
  for (const el of data.elements) {
    const t = el.tags ?? {};
    const rings = [];
    if (el.type === "way" && el.geometry) rings.push(el.geometry);
    if (el.type === "relation" && el.members) {
      for (const m of el.members) if (m.role === "outer" && m.geometry) rings.push(m.geometry);
    }
    for (const ring of rings) {
      if (t.building || t["building:part"]) {
        if (ring.length < 4) continue;
        let h = metres(t.height);
        let estimated = 0;
        if (h === null) {
          const levels = Number(t["building:levels"]);
          if (Number.isFinite(levels) && levels > 0) h = levels * 3.2 + 1;
          else {
            const kind = t.building;
            const floors =
              kind === "house" || kind === "garage" || kind === "shed" || kind === "roof"
                ? 1 + Math.round(random())
                : kind === "temple" ||
                    kind === "mosque" ||
                    kind === "church" ||
                    kind === "cathedral"
                  ? 4
                  : Math.max(1, Math.round(c.floors * (0.6 + random() * 0.8)));
            h = floors * 3.2 + 1;
          }
          estimated = 1;
        } else measured++;
        const min = metres(t.min_height) ?? 0;
        if (min > 0) h = Math.max(h, min + 2);
        out.buildings.push([Math.round(h * 10) / 10, estimated, ...flat(ring)]);
      } else if (t.highway && el.type === "way") {
        out.roads.push([ROAD[t.highway] ?? 6, ...flat(ring)]);
      } else if (t.natural === "water") {
        out.water.push(flat(ring));
      } else if (ring.length >= 4) {
        out.parks.push(flat(ring));
      }
    }
  }
  await writeFile(join(OUT, `${key}.json`), JSON.stringify(out));
  console.log(
    `${key}: ${out.buildings.length} buildings (${measured} with a measured height), ${out.roads.length} roads, ${out.parks.length} green, ${out.water.length} water`,
  );
}

await mkdir(OUT, { recursive: true });
for (const key of Object.keys(CITIES)) {
  await city(key);
  await new Promise((r) => setTimeout(r, 4000)); // be gentle with the public Overpass server
}
