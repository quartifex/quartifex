// Prithvi: the Earth with a sea level you can move.
// Real elevation, sea-floor depth and satellite colour; the water line, the ice, the plant
// cover on newly dry land and the clouds are worked out per pixel from those. WebGPU only.

import {
  abs,
  asin,
  cameraPosition,
  clamp,
  cos,
  cross,
  dot,
  exp,
  float,
  hash,
  instanceIndex,
  length,
  max,
  min,
  mix,
  mx_fractal_noise_float,
  mx_fractal_noise_vec3,
  mx_noise_float,
  normalize,
  PI,
  positionLocal,
  positionWorld,
  pow,
  select,
  sin,
  smoothstep,
  texture,
  uniform,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";

const W = 8192;
const H = 4096;
const TILE = 2048; // the height grid is served as 4 × 2 tiles, north-west first
// The height code written by scripts/prithvi-data.mjs: 12 bits, fine near sea level.
const SCALE = 60;
const TOP = 9000;
const EARTH = 6371000;
const FOV = 38;

// The towns only belong to the present and to what may come after it.
const ERAS = [
  { name: "Today", sea: 0, temp: 0, lights: true },
  { name: "Last ice age, 20,000 years ago", sea: -125, temp: -6, lights: false },
  { name: "Halfway out of the ice age", sea: -60, temp: -3, lights: false },
  { name: "A warmer world", sea: 12, temp: 3, lights: true },
  { name: "All the ice melted", sea: 66, temp: 6, lights: true },
];
const CUSTOM = "Your own setting";

async function bitmap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`could not load ${url}`);
  return createImageBitmap(await res.blob(), {
    colorSpaceConversion: "none",
    premultiplyAlpha: "none",
  });
}

/** Ground height and spill height in metres, as one two-channel half-float texture. */
/** River flow, as traced by scripts/prithvi-data.mjs: today's (red) and with rain everywhere (green). */
async function loadRivers(base) {
  const data = new Uint8Array(W * H * 2);
  const canvas = new OffscreenCanvas(TILE, TILE);
  const cx = canvas.getContext("2d", { willReadFrequently: true });
  const names = [];
  for (let ty = 0; ty < H / TILE; ty++) for (let tx = 0; tx < W / TILE; tx++) names.push([tx, ty]);
  const images = await Promise.all(
    names.map(([tx, ty]) => bitmap(`${base}/rivers-${tx}-${ty}.png`)),
  );
  names.forEach(([tx, ty], n) => {
    cx.drawImage(images[n], 0, 0);
    images[n].close();
    const px = cx.getImageData(0, 0, TILE, TILE).data;
    for (let j = 0; j < TILE; j++) {
      let o = ((ty * TILE + j) * W + tx * TILE) * 2;
      let i = j * TILE * 4;
      for (let x = 0; x < TILE; x++, o += 2, i += 4) {
        data[o] = px[i];
        data[o + 1] = px[i + 1];
      }
    }
  });
  const tex = new THREE.DataTexture(data, W, H, THREE.RGFormat, THREE.UnsignedByteType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

async function loadHeights(base) {
  const k = 2047 / Math.asinh(TOP / SCALE);
  const lut = new Uint16Array(4096);
  for (let c = 0; c < 4096; c++) {
    const d = c - 2048;
    lut[c] = THREE.DataUtils.toHalfFloat(Math.sign(d) * SCALE * Math.sinh(Math.abs(d) / k));
  }
  const data = new Uint16Array(W * H * 2);
  const canvas = new OffscreenCanvas(TILE, TILE);
  const cx = canvas.getContext("2d", { willReadFrequently: true });
  const names = [];
  for (let ty = 0; ty < H / TILE; ty++) for (let tx = 0; tx < W / TILE; tx++) names.push([tx, ty]);
  const images = await Promise.all(
    names.map(([tx, ty]) => bitmap(`${base}/height-${tx}-${ty}.png`)),
  );
  names.forEach(([tx, ty], n) => {
    cx.drawImage(images[n], 0, 0);
    images[n].close();
    const px = cx.getImageData(0, 0, TILE, TILE).data;
    for (let j = 0; j < TILE; j++) {
      let o = ((ty * TILE + j) * W + tx * TILE) * 2;
      let i = j * TILE * 4;
      for (let x = 0; x < TILE; x++, o += 2, i += 4) {
        const g = px[i + 1];
        data[o] = lut[(px[i] << 4) | (g >> 4)];
        data[o + 1] = lut[((g & 15) << 8) | px[i + 2]];
      }
    }
  });
  const tex = new THREE.DataTexture(data, W, H, THREE.RGFormat, THREE.HalfFloatType);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

async function loadColour(base) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const cx = canvas.getContext("2d");
  const [west, east] = await Promise.all([
    bitmap(`${base}/colour-w.jpg`),
    bitmap(`${base}/colour-e.jpg`),
  ]);
  cx.drawImage(west, 0, 0);
  cx.drawImage(east, W / 2, 0);
  west.close();
  east.close();
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

async function loadNight(base) {
  const tex = new THREE.Texture(await bitmap(`${base}/night.jpg`));
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export async function createPrithvi(canvas, options) {
  if (!("gpu" in navigator)) throw new Error("webgpu-unavailable");
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
  if (!renderer.backend.isWebGPUBackend) {
    renderer.dispose();
    throw new Error("webgpu-unavailable");
  }
  const reduced = options.reducedMotion;

  options.onReadout("Loading the Earth\nelevation and sea floor");
  const heightTex = await loadHeights(options.assets);
  options.onReadout("Loading the Earth\nrivers");
  const riverTex = await loadRivers(options.assets);
  options.onReadout("Loading the Earth\nsatellite colour");
  const colourTex = await loadColour(options.assets);
  options.onReadout("Loading the Earth\nnight lights");
  const nightTex = await loadNight(options.assets);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 400);

  /* ---------- uniforms ---------- */
  const uSea = uniform(0); // metres against today's sea level
  const uTemp = uniform(0); // degrees against today
  const uSun = uniform(new THREE.Vector3(0.5, 0.3, 0.8).normalize());
  const uExag = uniform(20); // how much taller than life the terrain stands
  const uClouds = uniform(0.5);
  const uLights = uniform(1);
  const uRivers = uniform(0.5); // how small a river is still drawn
  const uAncient = uniform(0); // dry and ancient channels
  const uTime = uniform(0);

  /* ---------- the ground and the water ---------- */
  const uvE = vec2(uv().x, uv().y.oneMinus()); // the textures have north at the top row
  const heights = texture(heightTex, uvE);
  const ground = heights.r;
  const sill = heights.g; // the lowest sea level at which the ocean reaches this place

  // Three kinds of water: the ocean itself; seas the falling ocean leaves behind, which keep
  // their level at the sill; and nothing, where a basin was dry or a lake to begin with.
  const ocean = uSea.greaterThanEqual(sill);
  const stranded = ocean.not().and(sill.sub(ground).greaterThan(40)).and(sill.lessThanEqual(0.5));
  const level = select(ocean, uSea, sill);
  const depth = select(ocean.or(stranded), level.sub(ground), float(-1000));
  const water = smoothstep(-1, 1, depth);

  const lat = uv().y.sub(0.5).mul(PI);
  const lon = uv().x.sub(0.5).mul(PI.mul(2));
  const latDeg = lat.mul(57.2958);
  // a soft patch of the globe, centred on a latitude and longitude, sized in degrees
  const patch = (cLat, cLon, sLat, sLon) => {
    const dLat = latDeg.sub(cLat).div(sLat);
    const dLon = sin(lon.sub((cLon * Math.PI) / 180).mul(0.5))
      .mul(114.6)
      .mul(cos(lat))
      .div(sLon);
    return exp(dLat.mul(dLat).add(dLon.mul(dLon)).mul(-0.5));
  };

  // A deliberately simple climate: warm at the equator, cold at the poles and up high, plus
  // the cold centres where the great ice sheets grew and the dry lands that stayed bare.
  const cooling = clamp(uTemp.negate().div(6), 0, 1.6);
  const sheets = patch(60, -85, 17, 24)
    .mul(-15)
    .add(patch(64, 22, 9, 12).mul(-11))
    .add(patch(66, 125, 14, 45).mul(8))
    .add(patch(64, -160, 9, 20).mul(8))
    .mul(cooling);
  const zonal = float(27).sub(sin(lat).mul(sin(lat)).mul(46));
  const tNow = zonal
    .add(uTemp)
    .add(sheets)
    .sub(max(ground.sub(uSea), 0).mul(0.0065));
  const tToday = zonal.sub(max(ground, 0).mul(0.0065));
  const ragged = mx_noise_float(positionLocal.mul(38)).mul(2.2);
  const frozen = (t) => smoothstep(-10.5, -15.5, t.add(ragged));
  const chilly = (t) => smoothstep(4, -6, t.add(ragged));
  const iceGrown = max(frozen(tNow).sub(frozen(tToday)), 0);
  const iceLost = max(frozen(tToday).sub(frozen(tNow)), 0);
  const tundraGrown = max(chilly(tNow).sub(chilly(tToday)), 0);
  const greenGrown = max(chilly(tToday).sub(chilly(tNow)), 0);

  // Land: the satellite picture, with land colours already carried out over the sea floor,
  // so ground that comes out of the water takes after the coast beside it.
  const picture = texture(colourTex, uvE).rgb;
  const white = smoothstep(0.5, 0.75, min(min(picture.r, picture.g), picture.b));
  const rock = vec3(0.2, 0.18, 0.14);
  const tundra = vec3(0.26, 0.24, 0.15);
  const forest = vec3(0.05, 0.11, 0.04);
  const sand = vec3(0.5, 0.45, 0.33);
  // only ground the ocean covers today counts as sea floor: the Caspian's bed does not
  const wasSeaFloor = smoothstep(0, -3, ground).mul(smoothstep(1, 0, sill));
  const waterline = select(stranded, sill, uSea);
  const shore = wasSeaFloor.mul(smoothstep(9, 0, ground.sub(waterline)));
  // freshly drained ground is bare mud and salt flat before anything takes root
  const fresh = wasSeaFloor.mul(smoothstep(45, 6, ground.sub(waterline)));
  const thawed = mix(picture, mix(rock, forest, 0.35), white.mul(iceLost));
  const cooled = mix(thawed, tundra, tundraGrown.mul(0.75).mul(white.oneMinus()));
  const greened = mix(cooled, forest.mul(1.3), greenGrown.mul(0.45).mul(white.oneMinus()));
  const mud = mix(greened, vec3(0.3, 0.27, 0.2), fresh.mul(0.28));
  const beached = mix(mud, sand, shore.mul(0.55));
  const iceGrain = mx_noise_float(positionLocal.mul(140)).mul(0.5).add(0.5);
  const ice = mix(vec3(0.8, 0.87, 0.95), vec3(0.97, 0.98, 0.99), iceGrain);
  const land = mix(beached, ice, iceGrown);

  // the slope of the ground, for the light to catch
  const du = vec2(1 / W, 0);
  const dv = vec2(0, 1 / H);
  const cell = (2 * Math.PI * EARTH) / W;
  const east = texture(heightTex, uvE.add(du)).r.sub(texture(heightTex, uvE.sub(du)).r);
  const north = texture(heightTex, uvE.sub(dv)).r.sub(texture(heightTex, uvE.add(dv)).r);
  const up = normalize(positionWorld);
  const eastward = normalize(cross(vec3(0, 1, 0), up));
  const northward = cross(up, eastward);
  const steep = uExag.mul(0.5).add(4);
  const slope = eastward
    .mul(east.div(max(cos(lat), 0.05).mul(2 * cell)))
    .add(northward.mul(north.div(2 * cell)))
    .mul(steep);
  const normal = normalize(up.sub(slope.mul(water.oneMinus())));

  // Water: turquoise in the shallows, deep blue beyond, the bottom showing through near shore
  const deep = max(depth, 0);
  const shallows = mix(
    vec3(0.06, 0.34, 0.38),
    vec3(0.012, 0.11, 0.27),
    exp(deep.div(-45)).oneMinus(),
  );
  const sea = mix(shallows, vec3(0.003, 0.025, 0.085), exp(deep.div(-1800)).oneMinus());
  const seeThrough = exp(deep.div(-7));
  const tSea = zonal.add(uTemp).add(sheets);
  const seaIce = smoothstep(-15, -19, tSea.add(ragged));
  const wet = mix(
    mix(sea, mix(land.mul(0.55), sea, 0.35), seeThrough),
    vec3(0.84, 0.89, 0.94),
    seaIce.mul(0.92),
  );

  // Rivers: today's on any land above the water, so as the sea falls they run on across the
  // drained shelves; and, if asked, the channels water would cut if it rained everywhere
  // a river is one 5 km cell wide; looking from further away, gather it from a wider patch
  // so it stays a line rather than breaking up
  const reach = clamp(length(cameraPosition).sub(1).mul(2.6), 1, 4);
  const ru = vec2(reach.div(W), 0);
  const rv = vec2(0, reach.div(H));
  const flow = max(
    max(texture(riverTex, uvE), texture(riverTex, uvE.add(ru))),
    max(
      max(texture(riverTex, uvE.sub(ru)), texture(riverTex, uvE.add(rv))),
      texture(riverTex, uvE.sub(rv)),
    ),
  );
  const onLand = water
    .oneMinus()
    .mul(iceGrown.oneMinus())
    .mul(float(1).sub(white.mul(iceLost.oneMinus())));
  const cut = mix(float(0.56), float(0.24), uRivers);
  const river = smoothstep(cut, cut.add(0.1), flow.r).mul(onLand);
  const riverDepth = smoothstep(cut, float(0.95), flow.r);
  const dryCut = mix(float(0.5), float(0.3), uRivers);
  const ancient = smoothstep(dryCut, dryCut.add(0.08), flow.g)
    .mul(float(1).sub(smoothstep(cut.sub(0.12), cut, flow.r)))
    .mul(onLand)
    .mul(uAncient);
  const riverColour = mix(vec3(0.07, 0.19, 0.33), vec3(0.04, 0.12, 0.27), riverDepth);
  const watered = mix(land, riverColour, river.mul(0.92));
  const surface = mix(watered, wet, water);

  // light
  const view = normalize(cameraPosition.sub(positionWorld));
  const sunUp = dot(up, uSun);
  const day = smoothstep(-0.12, 0.3, sunUp);
  const lit = max(mix(dot(up, uSun), dot(normal, uSun), 0.7), 0);
  const halfway = normalize(uSun.add(view));
  const glint = pow(max(dot(up, halfway), 0), 240)
    .mul(0.85)
    .add(pow(max(dot(up, halfway), 0), 28).mul(0.06));
  const twilight = smoothstep(0.3, 0, abs(sunUp));
  const lights = pow(texture(nightTex, uvE).r, 1.5);
  const dark = smoothstep(0.08, -0.18, sunUp);
  const rim = pow(max(dot(up, view), 0).oneMinus(), 2.6);

  const sunlit = surface
    .mul(lit.mul(1.25).add(day.mul(0.045)))
    .add(vec3(1, 0.94, 0.84).mul(glint).mul(water).mul(seaIce.oneMinus()).mul(day))
    .mul(mix(vec3(1), vec3(1.25, 0.84, 0.6), twilight.mul(0.4)));
  // towns go dark where the sea or the ice has taken them
  const towns = vec3(1, 0.76, 0.45)
    .mul(lights)
    .mul(2.4)
    .mul(dark)
    .mul(water.oneMinus())
    .mul(iceGrown.oneMinus())
    .mul(uLights);
  // ancient channels glow faintly, as a traced overlay rather than water
  const traced = vec3(0.25, 0.8, 0.85).mul(ancient).mul(day.mul(0.5).add(0.22));
  const colour = mix(sunlit.add(towns).add(traced), vec3(0.3, 0.55, 1).mul(day), rim.mul(0.55));

  const globe = new THREE.Group();
  scene.add(globe);
  const earth = new THREE.MeshBasicNodeMaterial();
  earth.colorNode = vec4(colour, 1);
  {
    // stand the terrain up, and lay the water flat at its own level
    const here = texture(heightTex, uvE).level(0);
    const top = max(here.r, min(uSea, max(here.g, uSea)));
    earth.positionNode = positionLocal.mul(max(top, -400).mul(uExag).div(EARTH).add(1));
  }
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(1, 1024, 512), earth));

  /* ---------- weather: cloud that drifts west in the tropics and east in the middle latitudes ---------- */
  const cloudMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  {
    const p = normalize(positionLocal);
    const cLat = asin(p.y);
    const t = uTime;
    const turn = (v, a) =>
      vec3(v.x.mul(cos(a)).add(v.z.mul(sin(a))), v.y, v.z.mul(cos(a)).sub(v.x.mul(sin(a))));
    const trades = smoothstep(-0.2, 0.6, cos(cLat.mul(3)));
    const swirl = mx_fractal_noise_vec3(p.mul(1.7).add(t.mul(0.003)), 3, 2.0, 0.5, 1.0).mul(0.55);
    const westward = mx_fractal_noise_float(
      turn(p, t.mul(-0.012)).mul(2.6).add(swirl),
      6,
      2.15,
      0.58,
      1.0,
    );
    const eastward2 = mx_fractal_noise_float(
      turn(p, t.mul(0.016)).mul(2.4).add(swirl).add(7.3),
      6,
      2.15,
      0.58,
      1.0,
    );
    const n = mix(eastward2, westward, trades).mul(0.5).add(0.5);
    // wet at the equator and in the storm tracks, clear over the deserts' latitudes
    const threshold = float(0.55)
      .sub(cos(cLat.mul(6)).mul(0.06))
      .sub(uClouds.sub(0.5).mul(0.42));
    const wisps = mx_fractal_noise_float(
      p.mul(13).add(swirl.mul(4)).add(t.mul(0.01)),
      4,
      2.2,
      0.6,
      1.0,
    )
      .mul(0.5)
      .add(0.5);
    const body = smoothstep(threshold, threshold.add(0.3), n);
    const cover = body.mul(smoothstep(0.3, 0.75, wisps.add(body.mul(0.55))));
    const cUp = normalize(positionWorld);
    const cSun = dot(cUp, uSun);
    const cDay = smoothstep(-0.15, 0.35, cSun);
    const glow = mix(vec3(1), vec3(1.2, 0.8, 0.6), smoothstep(0.3, 0, abs(cSun)).mul(0.5));
    cloudMaterial.colorNode = vec4(glow.mul(cDay.mul(1.05).add(0.03)), 1);
    cloudMaterial.opacityNode = cover.mul(smoothstep(0, 0.08, uClouds)).mul(0.9);
  }
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 128), cloudMaterial);
  globe.add(clouds);

  /* ---------- the thin blue line, and the stars ---------- */
  const air = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  {
    const out = normalize(positionWorld);
    const away = normalize(positionWorld.sub(cameraPosition));
    const edge = smoothstep(0, 0.55, dot(away, out));
    const sunlit = smoothstep(-0.35, 0.25, dot(out, uSun));
    const warm = smoothstep(0.35, -0.1, dot(out, uSun));
    air.colorNode = vec4(
      mix(vec3(0.25, 0.52, 1), vec3(1, 0.45, 0.2), warm.mul(0.6))
        .mul(edge.mul(edge))
        .mul(sunlit)
        .mul(1.4),
      1,
    );
  }
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), air);
  scene.add(shell);

  {
    const material = new THREE.SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const i = instanceIndex;
    const dir = normalize(vec3(hash(i.add(11)), hash(i.add(23)), hash(i.add(37))).sub(0.5));
    const mag = hash(i.add(51)).pow(9);
    const warm = hash(i.add(67));
    material.positionNode = dir.mul(150);
    material.scaleNode = mag.mul(0.5).add(0.22);
    const d = uv().sub(0.5);
    const tint = mix(vec3(0.72, 0.84, 1), vec3(1, 0.82, 0.62), warm);
    const star = varying(tint.mul(mag.mul(4).add(0.25)));
    material.colorNode = vec4(star.mul(exp(dot(d, d).mul(-26))), 1);
    const stars = new THREE.Sprite(material);
    stars.count = 9000;
    stars.frustumCulled = false;
    stars.renderOrder = -2;
    scene.add(stars);
  }

  /* ---------- state ---------- */
  const P = { sea: 0, temp: 0, follow: true, sun: 40, spin: true };
  let seaNow = 0;
  let tempNow = 0;
  let yaw = 0;
  let pitch = 0.32;
  let vyaw = 0;
  let vpitch = 0;
  let dist = 3.5;
  let distTo = 3.5;
  let down = null;
  let lastTouch = -1e9;
  let disposed = false;
  let shown = "";
  // start with India facing the viewer
  globe.rotation.y = Math.atan2(-0.208, -0.978);

  const climateFor = (sea) => (sea < 0 ? (sea / 125) * 6 : (sea / 66) * 6);
  const metres = (m) => {
    const r = Math.round(m);
    return r === 0 ? "today's level" : `${r > 0 ? "+" : "−"}${Math.abs(r)} m`;
  };
  const degrees = (t) => {
    const r = Math.round(t * 2) / 2;
    return r === 0
      ? "today's climate"
      : `${Math.abs(r).toFixed(1)} °C ${r > 0 ? "warmer" : "colder"}`;
  };

  const onDown = (e) => {
    down = { lx: e.clientX, ly: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    lastTouch = performance.now();
  };
  const onMove = (e) => {
    if (!down) return;
    const k = 0.0016 * dist;
    vyaw = -(e.clientX - down.lx) * k;
    vpitch = (e.clientY - down.ly) * k;
    yaw += vyaw;
    pitch += vpitch;
    down.lx = e.clientX;
    down.ly = e.clientY;
    lastTouch = performance.now();
  };
  const onUp = () => {
    down = null;
  };
  const onWheel = (e) => {
    e.preventDefault();
    lastTouch = performance.now();
    distTo = Math.max(1.42, Math.min(6, distTo * Math.exp(e.deltaY * 0.0011)));
  };
  // the globe turns from the keyboard too: arrows turn it, + and - come closer and back
  const onKey = (e) => {
    const step = 0.12;
    if (e.key === "ArrowLeft") yaw -= step;
    else if (e.key === "ArrowRight") yaw += step;
    else if (e.key === "ArrowUp") pitch += step;
    else if (e.key === "ArrowDown") pitch -= step;
    else if (e.key === "+" || e.key === "=") distTo = Math.max(1.42, distTo * 0.88);
    else if (e.key === "-" || e.key === "_") distTo = Math.min(6, distTo / 0.88);
    else return;
    e.preventDefault();
    lastTouch = performance.now();
  };
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;
  canvas.addEventListener("keydown", onKey);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  /* ---------- sound: wind over water ---------- */
  const audio = { ctx: null, out: null };
  function setSound(on) {
    if (on && !audio.ctx) {
      const C = new AudioContext();
      const buffer = C.createBuffer(1, C.sampleRate * 3, C.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      const source = C.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const band = C.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 380;
      band.Q.value = 0.5;
      const lfo = C.createOscillator();
      const depthGain = C.createGain();
      lfo.frequency.value = 0.07;
      depthGain.gain.value = 170;
      lfo.connect(depthGain).connect(band.frequency);
      lfo.start();
      const out = C.createGain();
      out.gain.value = 0;
      source.connect(band).connect(out).connect(C.destination);
      source.start();
      audio.ctx = C;
      audio.out = out;
    }
    if (!audio.ctx) return;
    audio.ctx.resume();
    audio.out.gain.setTargetAtTime(on ? 0.1 : 0, audio.ctx.currentTime, 0.5);
  }

  /* ---------- frame ---------- */
  let last = performance.now();
  function frame(now) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w < 2 || h < 2) return; // not laid out yet, or hidden
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    // the sea and the climate glide to where they have been set
    const ease = 1 - Math.exp(-dt * (reduced ? 5 : 1.6));
    seaNow += (P.sea - seaNow) * ease;
    tempNow += (P.temp - tempNow) * ease;
    uSea.value = seaNow;
    uTemp.value = tempNow;
    const text = `Sea ${metres(seaNow)}\n${degrees(tempNow)}`;
    if (text !== shown) {
      shown = text;
      options.onReadout(text);
    }

    if (!down) {
      yaw += vyaw;
      pitch += vpitch;
      vyaw *= Math.exp(-dt * 4);
      vpitch *= Math.exp(-dt * 4);
    }
    pitch = Math.max(-1.4, Math.min(1.4, pitch));
    dist += (distTo - dist) * (1 - Math.exp(-dt * 5));
    if (P.spin && !reduced && !down && now - lastTouch > 2500) globe.rotation.y += dt * 0.018;
    const fit = Math.max(1, 1.12 / camera.aspect);
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * dist * fit,
      Math.sin(pitch) * dist * fit,
      Math.cos(yaw) * Math.cos(pitch) * dist * fit,
    );
    camera.lookAt(0, 0, 0);

    const a = (P.sun * Math.PI) / 180;
    uSun.value.set(Math.sin(a) * 0.95, 0.3, Math.cos(a) * 0.95).normalize();
    uTime.value = (now / 1000) % 100000;
    const lift = 1 + (uExag.value * 9200) / EARTH + 0.004;
    clouds.scale.setScalar(lift);
    shell.scale.setScalar(lift + 0.035);

    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);

  return {
    controls: [
      {
        type: "select",
        key: "era",
        label: "A moment in time",
        options: [...ERAS.map((era) => era.name), CUSTOM],
        value: ERAS[0].name,
      },
      {
        type: "range",
        key: "sea",
        label: "Sea level, metres",
        min: -200,
        max: 200,
        step: 1,
        value: 0,
      },
      { type: "range", key: "temp", label: "Climate, °C", min: -8, max: 8, step: 0.5, value: 0 },
      { type: "toggle", key: "follow", label: "Climate follows the sea", value: true },
      { type: "range", key: "clouds", label: "Cloud", min: 0, max: 1, step: 0.01, value: 0.5 },
      {
        type: "range",
        key: "exag",
        label: "Terrain height, times life",
        min: 1,
        max: 60,
        step: 1,
        value: 20,
      },
      {
        type: "range",
        key: "sun",
        label: "Where the sun is",
        min: -180,
        max: 180,
        step: 1,
        value: 40,
      },
      { type: "range", key: "rivers", label: "Rivers", min: 0, max: 1, step: 0.01, value: 0.5 },
      { type: "toggle", key: "ancient", label: "Ancient and dry rivers", value: false },
      { type: "toggle", key: "lights", label: "City lights", value: true },
      { type: "toggle", key: "spin", label: "Turn slowly", value: true },
    ],
    set(key, value) {
      if (key === "era") {
        const era = ERAS.find((item) => item.name === value);
        if (!era) return;
        P.sea = era.sea;
        P.temp = era.temp;
        uLights.value = era.lights ? 1 : 0;
        options.onValues?.({ sea: era.sea, temp: era.temp, lights: era.lights });
      } else if (key === "sea") {
        // a value that is already in place (a preset just set it, or Reset replays it) moves nothing else
        if (value === P.sea) return;
        P.sea = value;
        const pushed = { era: CUSTOM };
        if (P.follow) {
          P.temp = Math.round(climateFor(value) * 2) / 2;
          pushed.temp = P.temp;
        }
        options.onValues?.(pushed);
      } else if (key === "temp") {
        if (value === P.temp) return;
        P.temp = value;
        P.follow = false;
        options.onValues?.({ era: CUSTOM, follow: false });
      } else if (key === "clouds") uClouds.value = value;
      else if (key === "exag") uExag.value = value;
      else if (key === "lights") uLights.value = value ? 1 : 0;
      else if (key === "rivers") uRivers.value = value;
      else if (key === "ancient") uAncient.value = value ? 1 : 0;
      else if (key in P) P[key] = value;
    },
    setSound,
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKey);
      if (audio.ctx) audio.ctx.close();
      heightTex.dispose();
      riverTex.dispose();
      colourTex.dispose();
      nightTex.dispose();
      renderer.dispose();
    },
  };
}
