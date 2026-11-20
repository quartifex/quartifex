// Shahar: a real city in the real sun.
// Buildings, roads, parks and water from OpenStreetMap, lit by the sun where it actually stands
// for the place, the date and the time (NOAA's solar-position equations), with shadow maps.
// At dusk the windows come on. WebGPU only.

import { bloom } from "three/addons/tsl/display/BloomNode.js";
import {
  attribute,
  float,
  floor,
  fract,
  hash,
  max,
  mix,
  normalize,
  pass,
  positionLocal,
  positionWorld,
  pow,
  smoothstep,
  uniform,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";

const CITY_NAMES = {
  delhi: "New Delhi",
  mumbai: "Mumbai",
  newyork: "New York",
  london: "London",
};
const KEYS = Object.keys(CITY_NAMES);
const LABELS = KEYS.map((k) => CITY_NAMES[k]);
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const RAD = Math.PI / 180;

/** The sun's direction (x east, y up, z south) by NOAA's general solar-position equations. */
function sunAt(lat, lon, utc, day, hour, out) {
  const g = ((2 * Math.PI) / 365) * (day - 1 + (hour - 12) / 24);
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const trueSolar = hour * 60 + eqtime + 4 * lon - 60 * utc;
  const ha = (trueSolar / 4 - 180) * RAD;
  const phi = lat * RAD;
  const east = -Math.cos(decl) * Math.sin(ha);
  const north = Math.cos(phi) * Math.sin(decl) - Math.sin(phi) * Math.cos(decl) * Math.cos(ha);
  const up = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  return out.set(east, up, -north).normalize();
}

const SKY = [
  { e: -12, zen: [0.004, 0.006, 0.02], hor: [0.02, 0.025, 0.05], sun: [0, 0, 0] },
  { e: -4, zen: [0.02, 0.035, 0.1], hor: [0.32, 0.14, 0.12], sun: [0.25, 0.06, 0.02] },
  { e: 0, zen: [0.05, 0.09, 0.22], hor: [0.85, 0.4, 0.2], sun: [1.6, 0.6, 0.25] },
  { e: 6, zen: [0.09, 0.18, 0.42], hor: [0.9, 0.62, 0.42], sun: [2.6, 1.6, 0.9] },
  { e: 20, zen: [0.12, 0.27, 0.62], hor: [0.66, 0.76, 0.88], sun: [3.1, 2.8, 2.4] },
  { e: 60, zen: [0.1, 0.25, 0.65], hor: [0.6, 0.72, 0.88], sun: [3.3, 3.1, 2.9] },
];
function skyAt(e) {
  let a = SKY[0];
  let b = SKY[SKY.length - 1];
  for (let i = 0; i < SKY.length - 1; i++)
    if (e >= SKY[i].e && e <= SKY[i + 1].e) [a, b] = [SKY[i], SKY[i + 1]];
  const t = b.e === a.e ? (e < a.e ? 0 : 1) : Math.min(1, Math.max(0, (e - a.e) / (b.e - a.e)));
  const s = t * t * (3 - 2 * t);
  const lerp = (p, q) => p.map((v, i) => v + (q[i] - v) * s);
  return { zen: lerp(a.zen, b.zen), hor: lerp(a.hor, b.hor), sun: lerp(a.sun, b.sun) };
}

/** Footprints into one geometry: walls, flat roofs, and a per-building seed for its windows. */
function buildCity(data) {
  const positions = [];
  const normals = [];
  const seeds = [];
  const walls = [];
  let tallest = 0;
  for (const b of data.buildings) {
    const h = b[0];
    const pts = [];
    for (let i = 2; i < b.length; i += 2) pts.push(new THREE.Vector2(b[i], b[i + 1]));
    if (pts.length > 2 && pts[0].equals(pts[pts.length - 1])) pts.pop();
    if (pts.length < 3) continue;
    // counter-clockwise when seen from above (x east, z south), so walls face out
    if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    tallest = Math.max(tallest, h);
    const seed = Math.random();
    const tris = THREE.ShapeUtils.triangulateShape(pts, []);
    for (const [a, c, d] of tris) {
      for (const k of [a, d, c]) {
        positions.push(pts[k].x, h, pts[k].y);
        normals.push(0, 1, 0);
        seeds.push(seed);
        walls.push(0);
      }
    }
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      const dx = q.x - p.x;
      const dz = q.y - p.y;
      const len = Math.hypot(dx, dz) || 1;
      const nx = dz / len;
      const nz = -dx / len;
      const quad = [
        [p.x, 0, p.y],
        [q.x, 0, q.y],
        [q.x, h, q.y],
        [p.x, 0, p.y],
        [q.x, h, q.y],
        [p.x, h, p.y],
      ];
      for (const v of quad) {
        positions.push(...v);
        normals.push(-nx, 0, -nz);
        seeds.push(seed);
        walls.push(1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 1));
  geo.setAttribute("wall", new THREE.Float32BufferAttribute(walls, 1));
  geo.computeBoundingSphere();
  return { geo, tallest };
}

function flatPolys(list, y) {
  const positions = [];
  for (const ring of list) {
    const pts = [];
    for (let i = 0; i < ring.length; i += 2) pts.push(new THREE.Vector2(ring[i], ring[i + 1]));
    if (pts.length > 2 && pts[0].equals(pts[pts.length - 1])) pts.pop();
    if (pts.length < 3) continue;
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(pts, [])) {
      for (const k of [a, c, b]) positions.push(pts[k].x, y, pts[k].y);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function ribbons(roads, y) {
  const positions = [];
  for (const r of roads) {
    const w = r[0] / 2;
    for (let i = 1; i + 3 < r.length; i += 2) {
      const ax = r[i];
      const az = r[i + 1];
      const bx = r[i + 2];
      const bz = r[i + 3];
      const len = Math.hypot(bx - ax, bz - az) || 1;
      const ox = (-(bz - az) / len) * w;
      const oz = ((bx - ax) / len) * w;
      positions.push(ax - ox, y, az - oz, bx + ox, y, bz + oz, bx - ox, y, bz - oz);
      positions.push(ax - ox, y, az - oz, ax + ox, y, az + oz, bx + ox, y, bz + oz);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export async function createShahar(canvas, options) {
  if (!("gpu" in navigator)) throw new Error("webgpu-unavailable");
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
  if (!renderer.backend.isWebGPUBackend) {
    renderer.dispose();
    throw new Error("webgpu-unavailable");
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  const reduced = options.reducedMotion;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 2, 30000);
  const uNight = uniform(0);
  const uWindows = uniform(1);
  const uLitShare = uniform(0.45);
  const uZenith = uniform(new THREE.Color());
  const uHorizon = uniform(new THREE.Color());
  const uSunCol = uniform(new THREE.Color());
  const uSunDir = uniform(new THREE.Vector3(0, 1, 0));

  /* sky */
  const skyMat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
  {
    const d = normalize(positionLocal);
    const up = max(d.y, 0);
    const base = mix(uZenith, uHorizon, pow(float(1).sub(up), 4));
    const toSun = max(d.dot(uSunDir), 0);
    const glow = uSunCol.mul(pow(toSun, 6).mul(0.25).add(pow(toSun, 80).mul(0.6)));
    const disc = uSunCol.mul(smoothstep(0.9996, 0.9999, toSun).mul(20));
    skyMat.colorNode = vec4(
      base
        .add(glow)
        .add(disc)
        .mul(smoothstep(-0.25, 0, d.y).mul(0.6).add(0.4)),
      1,
    );
  }
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), skyMat);
  sky.scale.setScalar(20000);
  sky.frustumCulled = false;
  scene.add(sky);

  /* light */
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(sun);
  scene.add(sun.target);
  const skyLight = new THREE.HemisphereLight(0x9fc0ff, 0x6b5f50, 0.6);
  scene.add(skyLight);

  const group = new THREE.Group();
  scene.add(group);
  const groundMat = new THREE.MeshStandardNodeMaterial({ color: 0xcfc8bc, roughness: 0.95 });
  const roadMat = new THREE.MeshStandardNodeMaterial({ color: 0x8f8a84, roughness: 0.9 });
  const parkMat = new THREE.MeshStandardNodeMaterial({ color: 0x7f9a6a, roughness: 1 });
  const waterMat = new THREE.MeshStandardNodeMaterial({
    color: 0x4f6f86,
    roughness: 0.25,
    metalness: 0.1,
  });
  const buildingMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.8 });
  // street lights: the roads glow a little after sunset
  roadMat.emissiveNode = vec3(1, 0.62, 0.3).mul(uNight).mul(uWindows).mul(0.16);
  {
    // a pale architectural model; windows on the walls that light up after dark
    const seed = attribute("seed", "float");
    const wall = attribute("wall", "float");
    const p = positionWorld;
    const along = p.x.add(p.z);
    const cell = vec2(along.div(3.1), p.y.div(3.3));
    const inCell = fract(cell);
    const pane = smoothstep(0.12, 0.18, inCell.x)
      .mul(smoothstep(0.88, 0.82, inCell.x))
      .mul(smoothstep(0.22, 0.3, inCell.y))
      .mul(smoothstep(0.86, 0.78, inCell.y))
      .mul(smoothstep(1.2, 2.2, p.y));
    const id = floor(cell);
    const on = hash(id.x.mul(17.3).add(id.y.mul(131.7)).add(seed.mul(9973)).abs().floor().toUint())
      .lessThan(uLitShare)
      .select(float(1), float(0));
    const warmth = mix(
      vec3(1, 0.68, 0.36),
      vec3(0.85, 0.9, 1),
      hash(id.x.add(id.y.mul(7)).abs().floor().toUint().add(3)).mul(0.6),
    );
    buildingMat.colorNode = mix(
      vec3(0.86, 0.84, 0.8),
      vec3(0.8, 0.79, 0.77),
      wall.mul(pane).mul(0.5),
    );
    buildingMat.emissiveNode = warmth
      .mul(on)
      .mul(pane)
      .mul(wall)
      .mul(uNight)
      .mul(uWindows)
      .mul(2.2);
  }

  let city = null;
  async function load(key) {
    options.onReadout(`Loading ${CITY_NAMES[key]}\nfrom OpenStreetMap`);
    const res = await fetch(`${options.assets}/${key}.json`);
    if (!res.ok) throw new Error(`could not load ${key}`);
    const data = await res.json();
    for (const child of [...group.children]) {
      group.remove(child);
      child.geometry.dispose();
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const b of data.buildings) {
      for (let i = 2; i < b.length; i += 2) {
        minX = Math.min(minX, b[i]);
        maxX = Math.max(maxX, b[i]);
        minZ = Math.min(minZ, b[i + 1]);
        maxZ = Math.max(maxZ, b[i + 1]);
      }
    }
    const half = Math.max(maxX - minX, maxZ - minZ) / 2 + 200;
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(half * 3, 96).rotateX(-Math.PI / 2),
      groundMat,
    );
    ground.receiveShadow = true;
    group.add(ground);
    for (const [geo, mat] of [
      [flatPolys(data.parks, 0.15), parkMat],
      [flatPolys(data.water, 0.1), waterMat],
      [ribbons(data.roads, 0.2), roadMat],
    ]) {
      const m = new THREE.Mesh(geo, mat);
      m.receiveShadow = true;
      group.add(m);
    }
    const built = buildCity(data);
    const buildings = new THREE.Mesh(built.geo, buildingMat);
    buildings.castShadow = true;
    buildings.receiveShadow = true;
    group.add(buildings);
    const cam = sun.shadow.camera;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = 1;
    cam.far = half * 4 + built.tallest * 4;
    cam.updateProjectionMatrix();
    const estimated = data.buildings.filter((b) => b[1]).length;
    city = { key, data, half, count: data.buildings.length, estimated, tallest: built.tallest };
  }

  /* ---------- state ---------- */
  const now0 = new Date();
  const P = {
    city: LABELS[0],
    hour: 16.5,
    day: Math.floor(
      (Date.UTC(now0.getUTCFullYear(), now0.getUTCMonth(), now0.getUTCDate()) -
        Date.UTC(now0.getUTCFullYear(), 0, 0)) /
        864e5,
    ),
    play: true,
    speed: 6,
  };
  await load(KEYS[0]);

  let yaw = 2.4;
  let pitch = 0.62;
  let dist = 2200;
  let distTo = 2200;
  let drag = null;
  let pushed = 0;
  const onDown = (e) => {
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag) return;
    yaw -= (e.clientX - drag.x) * 0.005;
    pitch = Math.max(0.08, Math.min(1.5, pitch + (e.clientY - drag.y) * 0.004));
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const onUp = () => {
    drag = null;
  };
  const onWheel = (e) => {
    e.preventDefault();
    distTo = Math.max(250, Math.min(6000, distTo * Math.exp(e.deltaY * 0.001)));
  };
  const onKey = (e) => {
    if (e.key === "ArrowLeft") yaw += 0.08;
    else if (e.key === "ArrowRight") yaw -= 0.08;
    else if (e.key === "ArrowUp") pitch = Math.min(1.5, pitch + 0.05);
    else if (e.key === "ArrowDown") pitch = Math.max(0.08, pitch - 0.05);
    else if (e.key === "+" || e.key === "=") distTo = Math.max(250, distTo * 0.9);
    else if (e.key === "-" || e.key === "_") distTo = Math.min(6000, distTo / 0.9);
    else return;
    e.preventDefault();
  };
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("keydown", onKey);

  const Pipeline = THREE.RenderPipeline ?? THREE.PostProcessing;
  const pipeline = new Pipeline(renderer);
  {
    const scenePass = pass(scene, camera);
    const colour = scenePass.getTextureNode("output");
    pipeline.outputNode = colour.add(bloom(colour, 1, 0.4, 0.85).mul(0.3));
  }

  /* ---------- sound: the city, quieter at night ---------- */
  const audio = { ctx: null, out: null, on: false };
  function setSound(on) {
    if (on && !audio.ctx) {
      const C = new AudioContext();
      const b = C.createBuffer(1, C.sampleRate * 4, C.sampleRate);
      const d = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3;
      }
      const src = C.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const low = C.createBiquadFilter();
      low.type = "lowpass";
      low.frequency.value = 700;
      const out = C.createGain();
      out.gain.value = 0;
      src.connect(low).connect(out).connect(C.destination);
      src.start();
      Object.assign(audio, { ctx: C, out });
    }
    if (!audio.ctx) return;
    audio.on = on;
    audio.ctx.resume();
    if (!on) audio.out.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.5);
  }

  /* ---------- frame ---------- */
  let disposed = false;
  let shown = "";
  let last = performance.now();
  let switching = null;
  const sunDir = new THREE.Vector3();
  const compass = [
    "north",
    "north-east",
    "east",
    "south-east",
    "south",
    "south-west",
    "west",
    "north-west",
  ];
  function frame(now) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w < 2 || h < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    if (!city) return;
    if (P.play) P.hour = (P.hour + (dt * P.speed * (reduced ? 0.4 : 1)) / 60) % 24;
    if (P.play && now - pushed > 400) {
      pushed = now;
      options.onValues?.({ hour: Math.round(P.hour * 20) / 20 });
    }
    const { lat, lon, utc } = city.data;
    sunAt(lat, lon, utc, P.day, P.hour, sunDir);
    const elev = Math.asin(sunDir.y) / RAD;
    const palette = skyAt(elev);
    uZenith.value.setRGB(...palette.zen);
    uHorizon.value.setRGB(...palette.hor);
    uSunCol.value.setRGB(...palette.sun);
    uSunDir.value.copy(sunDir);
    // the sun lights the city while it is up; after that the sky and the windows do
    const day = Math.min(1, Math.max(0, (elev + 2) / 8));
    sun.intensity = 3.2 * day;
    sun.color.setRGB(...palette.sun.map((v) => v / Math.max(palette.sun[0], 0.01)));
    sun.position.copy(sunDir).multiplyScalar(city.half * 2);
    sun.target.position.set(0, 0, 0);
    skyLight.intensity = 0.15 + 0.6 * Math.min(1, Math.max(0, (elev + 8) / 20));
    skyLight.color.setRGB(
      palette.zen[0] * 4 + 0.1,
      palette.zen[1] * 3 + 0.1,
      palette.zen[2] * 2 + 0.15,
    );
    uNight.value = Math.min(1, Math.max(0, (2 - elev) / 8));
    // later in the night, fewer windows stay lit
    const late = P.hour > 23 || P.hour < 5 ? 0.18 : 0.45;
    uLitShare.value += (late - uLitShare.value) * (1 - Math.exp(-dt));

    dist += (distTo - dist) * (1 - Math.exp(-dt * 4));
    camera.position
      .set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
      .multiplyScalar(dist);
    camera.lookAt(0, 30, 0);
    sky.position.copy(camera.position);

    if (audio.ctx && audio.on)
      audio.out.gain.setTargetAtTime(0.12 + 0.2 * day, audio.ctx.currentTime, 0.6);

    const hh = Math.floor(P.hour);
    const mm = Math.floor((P.hour - hh) * 60);
    const date = new Date(Date.UTC(2026, 0, P.day));
    const bearing = (Math.atan2(sunDir.x, -sunDir.z) / RAD + 360) % 360;
    const where = compass[Math.round(bearing / 45) % 8];
    const shadow =
      elev > 1
        ? `shadows ${(1 / Math.tan(elev * RAD)).toFixed(1)} times as long as what casts them`
        : elev > -6
          ? "twilight"
          : "night";
    const text = `${city.data.name}\n${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} local standard time, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}\nsun ${Math.round(elev)}° ${elev >= 0 ? "up" : "down"}, in the ${where}; ${shadow}`;
    if (text !== shown) {
      shown = text;
      options.onReadout(text);
    }
    pipeline.render();
  }
  renderer.setAnimationLoop(frame);

  return {
    controls: [
      { type: "select", key: "city", label: "City", options: LABELS, value: LABELS[0] },
      {
        type: "range",
        key: "hour",
        label: "Time of day",
        min: 0,
        max: 24,
        step: 0.05,
        value: P.hour,
      },
      { type: "toggle", key: "play", label: "Time runs", value: true },
      {
        type: "range",
        key: "speed",
        label: "Minutes a second",
        min: 0,
        max: 60,
        step: 1,
        value: 6,
      },
      {
        type: "range",
        key: "day",
        label: "Day of the year",
        min: 1,
        max: 365,
        step: 1,
        value: P.day,
      },
      { type: "toggle", key: "windows", label: "Windows light up at night", value: true },
      {
        type: "range",
        key: "exposure",
        label: "Exposure",
        min: 0.3,
        max: 2,
        step: 0.01,
        value: 0.9,
      },
    ],
    set(key, value) {
      if (key === "city") {
        const k = KEYS[LABELS.indexOf(value)];
        if (!k || switching) return;
        P.city = value;
        switching = load(k).finally(() => {
          switching = null;
        });
      } else if (key === "windows") uWindows.value = value ? 1 : 0;
      else if (key === "exposure") renderer.toneMappingExposure = value;
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
      for (const child of group.children) child.geometry.dispose();
      renderer.dispose();
    },
  };
}
