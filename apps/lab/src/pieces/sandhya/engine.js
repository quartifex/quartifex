// Sandhyā: dusk at sea, and a murmuration of starlings over it.
// The sea is a sum of sixty-four travelling waves whose sizes follow a real wind-sea spectrum;
// the birds are flocked on the GPU, each one steering by the heading and crowding of the birds
// around it, read from a grid the whole flock is binned into every frame. WebGPU only.

import { bloom } from "three/addons/tsl/display/BloomNode.js";
import {
  abs,
  atomicAdd,
  atomicLoad,
  atomicStore,
  attribute,
  cameraPosition,
  clamp,
  cos,
  cross,
  dot,
  exp,
  Fn,
  float,
  hash,
  If,
  instancedArray,
  instanceIndex,
  int,
  ivec2,
  Loop,
  length,
  max,
  min,
  mix,
  mx_fractal_noise_float,
  mx_noise_float,
  mx_noise_vec3,
  normalize,
  pass,
  positionLocal,
  positionWorld,
  pow,
  reflect,
  sin,
  smoothstep,
  sqrt,
  textureLoad,
  uniform,
  varying,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";

const MAX_BIRDS = 524288;
const G = 64; // the flock grid, cells per side
const WAVES = 64;
const VERTEX_WAVES = 36; // the longer waves move the surface; all of them shape the light
const GRAV = 9.81;
const FLOCKS = ["65,536", "262,144", "524,288"];

const BEAUFORT = [
  "calm",
  "light air",
  "light breeze",
  "gentle breeze",
  "moderate breeze",
  "fresh breeze",
  "strong breeze",
  "near gale",
  "gale",
  "strong gale",
];

/** Small seeded generator, so the sea is the same sea every visit. */
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

/** Sky colours by the sun's height in degrees, read off a handful of evenings. */
const SKY = [
  { e: -7, zen: [0.004, 0.007, 0.028], hor: [0.05, 0.035, 0.07], sun: [0, 0, 0] },
  { e: -3, zen: [0.016, 0.03, 0.1], hor: [0.36, 0.13, 0.12], sun: [0.32, 0.07, 0.02] },
  { e: 0, zen: [0.03, 0.065, 0.2], hor: [0.85, 0.3, 0.12], sun: [1.6, 0.45, 0.12] },
  { e: 3, zen: [0.05, 0.12, 0.34], hor: [0.9, 0.44, 0.2], sun: [2.3, 0.9, 0.34] },
  { e: 8, zen: [0.07, 0.19, 0.5], hor: [0.85, 0.6, 0.4], sun: [2.7, 1.55, 0.8] },
  { e: 22, zen: [0.08, 0.25, 0.68], hor: [0.62, 0.72, 0.86], sun: [3.1, 2.7, 2.2] },
];
function skyAt(e) {
  let a = SKY[0];
  let b = SKY[SKY.length - 1];
  for (let i = 0; i < SKY.length - 1; i++) {
    if (e >= SKY[i].e && e <= SKY[i + 1].e) {
      a = SKY[i];
      b = SKY[i + 1];
    }
  }
  const t = b.e === a.e ? 0 : Math.min(1, Math.max(0, (e - a.e) / (b.e - a.e)));
  const s = t * t * (3 - 2 * t);
  const lerp = (p, q) => p.map((v, i) => v + (q[i] - v) * s);
  return { zen: lerp(a.zen, b.zen), hor: lerp(a.hor, b.hor), sun: lerp(a.sun, b.sun) };
}

export async function createSandhya(canvas, options) {
  if (!("gpu" in navigator)) throw new Error("webgpu-unavailable");
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
  if (!renderer.backend.isWebGPUBackend) {
    renderer.dispose();
    throw new Error("webgpu-unavailable");
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.72;
  const reduced = options.reducedMotion;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.3, 60000);

  /* ---------- shared uniforms ---------- */
  const uTime = uniform(0);
  const uSun = uniform(new THREE.Vector3(0, 0.05, -1).normalize());
  const uZenith = uniform(new THREE.Color());
  const uHorizon = uniform(new THREE.Color());
  const uSunCol = uniform(new THREE.Color());
  const uSunShow = uniform(1);
  const uCloud = uniform(0.4);
  const uFoam = uniform(0);
  // mean square slope of the waves too small to draw: Cox and Munk's sun-glitter measurements
  const uSlope = uniform(0.01);
  const uWindDir = uniform(new THREE.Vector2(1, 0));

  /* ---------- the sky ---------- */
  const sky = Fn(([dirIn]) => {
    const dir = normalize(dirIn).toVar();
    const up = max(dir.y, 0);
    const colour = mix(uZenith, uHorizon, pow(float(1).sub(up), 5)).toVar();
    // below the horizon (seen only in reflections) the haze darkens a little
    colour.mulAssign(mix(float(0.72), float(1), smoothstep(-0.08, 0, dir.y)));
    const toSun = max(dot(dir, uSun), 0);
    // the warm glow round the sun, wide and low, then tighter and brighter
    const hug = exp(abs(dir.y).mul(-9));
    colour.addAssign(uSunCol.mul(pow(toSun, 5).mul(0.22).mul(hug).add(pow(toSun, 60).mul(0.45))));
    colour.addAssign(uSunCol.mul(smoothstep(0.99972, 0.99988, toSun).mul(uSunShow).mul(30)));
    If(dir.y.greaterThan(0.004), () => {
      // a cloud deck about 1,800 m up, drifting
      const reach = float(1800).div(dir.y);
      const q = dir.xz
        .mul(reach)
        .mul(0.00021)
        .add(vec2(uTime.mul(0.0035), uTime.mul(0.001)));
      const n = mx_fractal_noise_float(vec3(q, uTime.mul(0.0015)), 5, 2.03, 0.52, 1.0)
        .mul(0.5)
        .add(0.5);
      const threshold = float(0.78).sub(uCloud.mul(0.36));
      const density = smoothstep(threshold, threshold.add(0.22), n).mul(
        smoothstep(0.004, 0.09, dir.y),
      );
      // lit from below and from the sun's side at this hour
      const glow = pow(toSun, 3).mul(1.4).add(0.32);
      const lit = uSunCol.mul(glow).mul(0.55).add(uHorizon.mul(0.45)).add(uZenith.mul(0.25));
      colour.assign(mix(colour, lit.mul(n.mul(0.55).add(0.55)), density.mul(0.92)));
    });
    return colour;
  });

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 48),
    new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false }),
  );
  dome.material.colorNode = vec4(sky(positionLocal), 1);
  dome.scale.setScalar(40000);
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  scene.add(dome);

  /* ---------- the sea's waves ---------- */
  // row 0: direction x, direction z, wavenumber, angular frequency; row 1: amplitude, steepness, phase
  const waveData = new Float32Array(WAVES * 2 * 4);
  const waveTex = new THREE.DataTexture(waveData, WAVES, 2, THREE.RGBAFormat, THREE.FloatType);
  waveTex.needsUpdate = true;
  const random = rng(20261120);
  const WIND_DIR = 0.55; // radians: the wind blows from the left, across the line to the sun
  uWindDir.value.set(Math.cos(WIND_DIR), Math.sin(WIND_DIR));
  const lambdas = [];
  const spread = [];
  const phases = [];
  for (let i = 0; i < WAVES; i++) {
    // four long swells, then sixty wind waves from 90 m down to 12 cm
    const L = i < 4 ? [260, 190, 150, 118][i] : 90 * (0.12 / 90) ** ((i - 4) / 59);
    lambdas.push(L);
    const r = random() * 2 - 1;
    spread.push(i < 4 ? r * 0.18 : Math.sign(r) * Math.abs(r) ** 1.6 * 1.25);
    phases.push(random() * Math.PI * 2);
  }
  function waves(beaufort, swell, swellDir) {
    const U = Math.max(0.6, 0.836 * beaufort ** 1.5); // m/s at 10 m
    const U195 = U * 1.075;
    const choppy = 0.35 + 0.08 * beaufort;
    const amps = [];
    for (let i = 0; i < WAVES; i++) {
      const k = (2 * Math.PI) / lambdas[i];
      const w = Math.sqrt(GRAV * k);
      let a;
      if (i < 4) {
        a = swell * [0.75, 0.6, 0.42, 0.3][i];
      } else {
        // Pierson–Moskowitz spectrum, one bucket per wave
        const kPrev = (2 * Math.PI) / (i === 4 ? lambdas[4] * 1.11 : lambdas[i - 1]);
        const dw = Math.abs(w - Math.sqrt(GRAV * kPrev));
        const S = ((0.0081 * GRAV * GRAV) / w ** 5) * Math.exp(-0.74 * (GRAV / (U195 * w)) ** 4);
        a = Math.min(Math.sqrt(2 * S * dw), 0.11 / k);
        // the smallest ripples are always there, however calm
        a += (0.0016 / (1 + k * 0.1)) * (k > 6 ? 1 : 0);
      }
      amps.push(a);
    }
    for (let i = 0; i < WAVES; i++) {
      const k = (2 * Math.PI) / lambdas[i];
      const dir = i < 4 ? swellDir + spread[i] : WIND_DIR + spread[i];
      const q = Math.min(1, choppy / Math.max(1e-6, k * amps[i] * 20));
      waveData.set([Math.cos(dir), Math.sin(dir), k, Math.sqrt(GRAV * k)], i * 4);
      waveData.set([amps[i], amps[i] > 1e-5 ? q : 0, phases[i], 0], (WAVES + i) * 4);
    }
    waveTex.needsUpdate = true;
    // rough significant wave height, for the readout and for the sound
    return 4 * Math.sqrt(amps.reduce((s, a) => s + (a * a) / 2, 0));
  }

  /* ---------- the sea's surface ---------- */
  // rings that grow apart with distance, so there are vertices where they are needed
  const RINGS = 520;
  const SEGS = 640;
  const R0 = 0.4;
  const R1 = 30000;
  const grow = (R1 / R0) ** (1 / (RINGS - 1));
  const seaPos = new Float32Array((RINGS * SEGS + 1) * 3);
  const seaGap = new Float32Array(RINGS * SEGS + 1);
  for (let j = 0; j < RINGS; j++) {
    const r = R0 * grow ** j;
    for (let s = 0; s < SEGS; s++) {
      const a = (s / SEGS) * Math.PI * 2 + (j % 2) * (Math.PI / SEGS);
      const v = j * SEGS + s;
      seaPos[v * 3] = Math.cos(a) * r;
      seaPos[v * 3 + 2] = Math.sin(a) * r;
      seaGap[v] = Math.max(r * (grow - 1), (r * Math.PI * 2) / SEGS);
    }
  }
  const centre = RINGS * SEGS;
  seaGap[centre] = R0;
  const seaIndex = new Uint32Array((RINGS - 1) * SEGS * 6 + SEGS * 3);
  let n = 0;
  for (let s = 0; s < SEGS; s++) {
    seaIndex[n++] = centre;
    seaIndex[n++] = (s + 1) % SEGS;
    seaIndex[n++] = s;
  }
  for (let j = 0; j < RINGS - 1; j++) {
    for (let s = 0; s < SEGS; s++) {
      const a = j * SEGS + s;
      const b = j * SEGS + ((s + 1) % SEGS);
      const c = (j + 1) * SEGS + s;
      const d = (j + 1) * SEGS + ((s + 1) % SEGS);
      seaIndex.set([a, b, c, b, d, c], n);
      n += 6;
    }
  }
  const seaGeo = new THREE.BufferGeometry();
  seaGeo.setAttribute("position", new THREE.BufferAttribute(seaPos, 3));
  seaGeo.setAttribute("gap", new THREE.BufferAttribute(seaGap, 1));
  seaGeo.setIndex(new THREE.BufferAttribute(seaIndex, 1));

  const wave = (i) => [textureLoad(waveTex, ivec2(i, 0)), textureLoad(waveTex, ivec2(i, 1))];
  const lift = Fn(([xz, gap]) => {
    const moved = vec3(0).toVar();
    Loop(VERTEX_WAVES, ({ i }) => {
      const [a, b] = wave(i);
      const length_ = float(6.2831853).div(a.z);
      const keep = smoothstep(gap.mul(3), gap.mul(7), length_);
      const phase = a.z.mul(dot(a.xy, xz)).sub(a.w.mul(uTime)).add(b.z);
      const amp = b.x.mul(keep);
      const across = b.y.mul(amp).mul(cos(phase));
      moved.addAssign(vec3(a.x.mul(across), amp.mul(sin(phase)), a.y.mul(across)));
    });
    return moved;
  });

  const seaMaterial = new THREE.MeshBasicNodeMaterial();
  const restXZ = positionLocal.xz;
  const moved = lift(restXZ, attribute("gap", "float")).mul(smoothstep(9000, 3000, length(restXZ)));
  seaMaterial.positionNode = positionLocal.add(moved);
  const vRest = varying(restXZ);
  const vHeight = varying(moved.y);

  {
    const toEye = cameraPosition.sub(positionWorld);
    const dist = length(toEye);
    const V = toEye.div(dist);
    // how much ground one pixel covers here; waves finer than that only roughen the light
    const footprint = dist.mul(0.0011).div(max(abs(V.y), 0.035));
    const shade = Fn(() => {
      const nx = float(0).toVar();
      const nz = float(0).toVar();
      const fold = float(0).toVar();
      const lost = float(0).toVar();
      Loop(WAVES, ({ i }) => {
        const [a, b] = wave(i);
        const length_ = float(6.2831853).div(a.z);
        const keep = smoothstep(footprint.mul(2), footprint.mul(6), length_);
        const phase = a.z.mul(dot(a.xy, vRest)).sub(a.w.mul(uTime)).add(b.z);
        const ka = a.z.mul(b.x);
        const c = cos(phase).mul(ka).mul(keep);
        nx.subAssign(a.x.mul(c));
        nz.subAssign(a.y.mul(c));
        fold.addAssign(b.y.mul(ka).mul(sin(phase)).mul(keep));
        lost.addAssign(ka.mul(ka).mul(float(1).sub(keep)));
      });
      const N = normalize(vec3(nx, float(1).sub(fold), nz));
      // reflection of the sky, with the Fresnel weight of water
      const R = reflect(V.negate(), N);
      const Rup = normalize(vec3(R.x, max(R.y, 0.012), R.z));
      const cosV = max(dot(N, V), 0.0);
      const fresnel = float(0.02).add(float(0.98).mul(pow(float(1).sub(cosV), 5)));
      const mirrored = sky(Rup);
      // light that has gone into the water and come out again: deep blue-green, and the crests
      // glowing where the low sun shines through them
      const body = vec3(0.004, 0.017, 0.024).add(uZenith.mul(0.06));
      const through = pow(max(dot(normalize(vec2(V.x, V.z).negate()), normalize(uSun.xz)), 0), 4)
        .mul(smoothstep(-0.2, 1.4, vHeight))
        .mul(max(uSun.y.add(0.05), 0).mul(6).min(1));
      const glass = body.add(vec3(0.03, 0.16, 0.13).mul(uSunCol).mul(through).mul(0.45));
      const colour = mix(glass, mirrored, fresnel).toVar();
      // the sun's glitter path: GGX, roughened by every wave too small to see
      const rough = clamp(sqrt(lost.mul(0.9).add(uSlope)), 0.03, 0.6);
      const Hh = normalize(uSun.add(V));
      const nh = max(dot(N, Hh), 0);
      const a2 = rough.mul(rough);
      const d = nh.mul(nh).mul(a2.sub(1)).add(1);
      const ggx = a2.div(d.mul(d).mul(Math.PI));
      const sunUp = smoothstep(-0.02, 0.01, uSun.y);
      colour.addAssign(
        uSunCol.mul(ggx.mul(fresnel).mul(0.25).div(max(cosV, 0.08)).min(60)).mul(sunUp),
      );
      // whitecaps where the crests fold over
      const curl = mx_noise_float(vec3(vRest.mul(0.35), uTime.mul(0.15)))
        .mul(0.5)
        .add(0.5);
      const crest = smoothstep(0.12, 0.42, fold.add(curl.mul(0.18).sub(0.09)));
      // in a strong wind the foam is torn into streaks that lie along it
      const along = dot(vRest, uWindDir);
      const across = dot(vRest, vec2(uWindDir.y.negate(), uWindDir.x));
      const streak = smoothstep(
        0.58,
        0.8,
        mx_noise_float(vec3(along.mul(0.012), across.mul(0.22), uTime.mul(0.03)))
          .mul(0.5)
          .add(0.5),
      );
      const foam = crest
        .add(streak.mul(smoothstep(0.5, 1, uFoam)).mul(0.6))
        .min(1)
        .mul(uFoam);
      const foamLit = uSunCol
        .mul(max(uSun.y, 0).mul(0.6).add(0.08))
        .add(uZenith.mul(0.9))
        .add(uHorizon.mul(0.25));
      colour.assign(mix(colour, foamLit, foam.mul(0.85)));
      // haze over the far water
      const haze = float(1).sub(exp(dist.div(-16000)));
      return vec4(mix(colour, sky(vec3(V.x.negate(), 0.002, V.z.negate())), haze), 1);
    });
    seaMaterial.colorNode = shade();
  }
  const sea = new THREE.Mesh(seaGeo, seaMaterial);
  sea.frustumCulled = false;
  scene.add(sea);

  /* ---------- the flock ---------- */
  const pos = instancedArray(MAX_BIRDS, "vec4"); // xyz, unused
  const vel = instancedArray(MAX_BIRDS, "vec4"); // xyz, roll angle
  const cellN = instancedArray(G * G * G, "int").toAtomic();
  const cellX = instancedArray(G * G * G, "int").toAtomic();
  const cellY = instancedArray(G * G * G, "int").toAtomic();
  const cellZ = instancedArray(G * G * G, "int").toAtomic();
  const roost = new THREE.Vector3(-100, 140, -540);
  {
    const p = pos.value.array;
    const v = vel.value.array;
    const r = rng(7);
    for (let i = 0; i < MAX_BIRDS; i++) {
      let x;
      let y;
      let z;
      do {
        x = r() * 2 - 1;
        y = r() * 2 - 1;
        z = r() * 2 - 1;
      } while (x * x + y * y + z * z > 1);
      p.set([roost.x + x * 95, roost.y + y * 38, roost.z + z * 95, 0], i * 4);
      v.set([10 + r() * 3, (r() - 0.5) * 2, 6 + r() * 3, 0], i * 4);
    }
    pos.value.needsUpdate = true;
    vel.value.needsUpdate = true;
  }

  const uRoost = uniform(roost.clone());
  const uSpan = uniform(560); // the grid's side, metres
  const uDt = uniform(1 / 60);
  const uActive = uniform(262144, "uint");
  const uFalcon = uniform(new THREE.Vector3(0, -10000, 0));
  const uTight = uniform(0.6);
  const uCrowd = uniform(150); // birds per cell the flock settles at
  const SCALE = 64; // fixed-point scale for headings summed in the grid

  const clearGrid = Fn(() => {
    atomicStore(cellN.element(instanceIndex), int(0));
    atomicStore(cellX.element(instanceIndex), int(0));
    atomicStore(cellY.element(instanceIndex), int(0));
    atomicStore(cellZ.element(instanceIndex), int(0));
  })().compute(G * G * G);

  const cellOf = (p) => p.sub(uRoost).div(uSpan).add(0.5).mul(G).floor();
  const within = (c, lo, hi) =>
    c.x
      .greaterThanEqual(lo)
      .and(c.y.greaterThanEqual(lo))
      .and(c.z.greaterThanEqual(lo))
      .and(c.x.lessThan(hi))
      .and(c.y.lessThan(hi))
      .and(c.z.lessThan(hi));

  const binBirds = Fn(() => {
    If(instanceIndex.lessThan(uActive), () => {
      const p = pos.element(instanceIndex).xyz;
      const v = vel.element(instanceIndex).xyz;
      const c = cellOf(p).toVar();
      If(within(c, 0, G), () => {
        const at = int(c.x)
          .add(int(c.y).mul(G))
          .add(int(c.z).mul(G * G));
        atomicAdd(cellN.element(at), int(1));
        atomicAdd(cellX.element(at), int(v.x.mul(SCALE)));
        atomicAdd(cellY.element(at), int(v.y.mul(SCALE)));
        atomicAdd(cellZ.element(at), int(v.z.mul(SCALE)));
      });
    });
  })().compute(MAX_BIRDS);

  const flyBirds = Fn(() => {
    If(instanceIndex.lessThan(uActive), () => {
      const P = pos.element(instanceIndex);
      const Vb = vel.element(instanceIndex);
      const p = P.xyz.toVar();
      const v = Vb.xyz.toVar();
      const push = vec3(0).toVar();
      const c = cellOf(p).toVar();
      If(within(c, 3, G - 3), () => {
        const cx = int(c.x);
        const cy = int(c.y);
        const cz = int(c.z);
        const at = (dx, dy, dz) =>
          cx
            .add(dx)
            .add(cy.add(dy).mul(G))
            .add(cz.add(dz).mul(G * G));
        const count = (dx, dy, dz) => float(atomicLoad(cellN.element(at(dx, dy, dz))));
        const here = count(0, 0, 0).toVar();
        const slope = vec3(
          count(1, 0, 0).sub(count(-1, 0, 0)),
          count(0, 1, 0).sub(count(0, -1, 0)),
          count(0, 0, 1).sub(count(0, 0, -1)),
        ).div(uCrowd.mul(2));
        const crowd = here.div(uCrowd);
        // the same, three cells out: where the bulk of the flock is
        const bulk = vec3(
          count(3, 0, 0).sub(count(-3, 0, 0)),
          count(0, 3, 0).sub(count(0, -3, 0)),
          count(0, 0, 3).sub(count(0, 0, -3)),
        ).div(uCrowd.mul(2));
        const i0 = at(0, 0, 0);
        const heading = vec3(
          float(atomicLoad(cellX.element(i0))),
          float(atomicLoad(cellY.element(i0))),
          float(atomicLoad(cellZ.element(i0))),
        ).div(max(here, 1).mul(SCALE));
        // match the neighbours' heading
        push.addAssign(heading.sub(v).mul(uTight.mul(2.4).add(0.4)));
        // keep a bird's length or two apart where it is crowded
        push.subAssign(slope.mul(smoothstep(1.1, 3, crowd).mul(16)));
        // and close up where it is thin, towards the bulk of the flock
        push.addAssign(
          bulk.mul(
            float(1)
              .sub(smoothstep(0.3, 1.1, crowd))
              .mul(uTight.mul(16).add(4)),
          ),
        );
      });
      // the roost holds them, gently, unless they stray
      const home = uRoost.sub(p);
      const far = length(home);
      push.addAssign(home.div(max(far, 1)).mul(smoothstep(50, 170, far).mul(20)));
      // the shape keeps changing: a slow, swirling field drifting through the flock
      push.addAssign(
        mx_noise_vec3(
          p
            .sub(uRoost)
            .mul(0.0065)
            .add(vec3(0, uTime.mul(0.05), uTime.mul(0.031))),
        ).mul(5),
      );
      // the falcon: get away from it, and up
      const away = p.sub(uFalcon);
      const gap = length(away);
      const fear = max(float(1).sub(gap.div(85)), 0);
      push.addAssign(
        away
          .div(max(gap, 0.5))
          .mul(fear.mul(fear).mul(80))
          .add(vec3(0, fear.mul(14), 0)),
      );
      // and the sea
      push.addAssign(vec3(0, max(float(30).sub(p.y), 0).mul(1.6), 0));
      // a little of each bird's own mind
      const own = vec3(
        hash(instanceIndex),
        hash(instanceIndex.add(7)),
        hash(instanceIndex.add(13)),
      ).sub(0.5);
      push.addAssign(own.mul(sin(uTime.mul(0.7).add(hash(instanceIndex.add(3)).mul(40))).mul(3)));

      const before = normalize(v);
      v.addAssign(push.mul(uDt));
      const speed = length(v);
      const settled = mix(clamp(speed, 8, 21), float(13.5), uDt.mul(0.6));
      v.assign(v.div(max(speed, 0.001)).mul(settled));
      p.addAssign(v.mul(uDt));
      // bank into the turn: roll follows the sideways part of the push
      const right = normalize(cross(before, vec3(0, 1, 0)));
      const roll = mix(Vb.w, clamp(dot(push, right).div(14), -1.3, 1.3), min(uDt.mul(6), 1));
      P.assign(vec4(p, 0));
      Vb.assign(vec4(v, roll));
    });
  })().compute(MAX_BIRDS);

  // one bird: a slim body and two wings, wingspan about 40 cm
  const birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([
        0,
        0,
        0.13,
        0,
        0.02,
        -0.11,
        0,
        -0.02,
        -0.11, // body
        0,
        0,
        0.04,
        -0.2,
        0,
        -0.035,
        0,
        0,
        -0.05, // left wing
        0,
        0,
        0.04,
        0,
        0,
        -0.05,
        0.2,
        0,
        -0.035, // right wing
      ]),
      3,
    ),
  );
  birdGeo.setAttribute(
    "tip",
    new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 1, 0, 0, 0, 1]), 1),
  );

  const birdMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  {
    const B = pos.element(instanceIndex).xyz;
    const Vb = vel.element(instanceIndex);
    const f = normalize(Vb.xyz);
    const r0 = normalize(cross(f, vec3(0, 1, 0)));
    const u0 = cross(r0, f);
    const roll = Vb.w;
    const right = r0.mul(cos(roll)).add(u0.mul(sin(roll)));
    const upward = u0.mul(cos(roll)).sub(r0.mul(sin(roll)));
    const seed = hash(instanceIndex);
    // starlings flap, then glide: the beat comes and goes
    const beat = smoothstep(-0.2, 0.4, sin(uTime.mul(0.9).add(seed.mul(30))));
    const flap = sin(uTime.mul(46).add(seed.mul(6.283)))
      .mul(0.12)
      .mul(beat)
      .add(0.02);
    const local = positionLocal.add(vec3(0, attribute("tip", "float").mul(flap), 0));
    const toEye = length(B.sub(cameraPosition));
    // never smaller than about a pixel and a half
    const size = max(1, toEye.mul(0.0045));
    birdMaterial.positionNode = B.add(
      right.mul(local.x).add(upward.mul(local.y)).add(f.mul(local.z)).mul(size),
    );
    const haze = varying(float(1).sub(exp(toEye.div(-5000))));
    birdMaterial.colorNode = vec4(mix(vec3(0.004, 0.0035, 0.004), uHorizon.mul(0.6), haze), 1);
  }
  const birds = new THREE.Mesh(birdGeo, birdMaterial);
  birds.count = 262144;
  birds.frustumCulled = false;
  scene.add(birds);

  // the falcon: the same shape, bigger, swept wings
  const falconMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  {
    const flap = sin(uTime.mul(20)).mul(0.09).mul(attribute("tip", "float"));
    falconMaterial.positionNode = positionLocal.add(
      vec3(0, flap, positionLocal.x.abs().mul(-0.25)),
    );
    falconMaterial.colorNode = vec4(0.008, 0.007, 0.008, 1);
  }
  const falcon = new THREE.Mesh(birdGeo, falconMaterial);
  falcon.visible = false;
  scene.add(falcon);

  /* ---------- the picture ---------- */
  const Pipeline = THREE.RenderPipeline ?? THREE.PostProcessing;
  const pipeline = new Pipeline(renderer);
  const uGlow = uniform(0.12);
  {
    const scenePass = pass(scene, camera);
    const colour = scenePass.getTextureNode("output");
    pipeline.outputNode = colour.add(bloom(colour, 1, 0.55, 0.92).mul(uGlow));
  }

  /* ---------- state ---------- */
  const P = {
    sun: 2.5,
    wind: 3,
    swell: 0.45,
    swellDir: 200,
    flock: FLOCKS[1],
    tight: 0.6,
    falcon: true,
    pointer: true,
    height: 4,
  };
  let windNow = P.wind;
  let swellNow = P.swell;
  let swellDirNow = P.swellDir;
  let sunNow = P.sun;
  let heightNow = P.height;
  let yaw = -0.18;
  let pitch = 0.06;
  let drag = null;
  let pointer = null; // last hover position in device-independent [-1, 1]
  let pointerSeen = -1e9;
  let disposed = false;
  let shown = "";
  let hs = waves(P.wind, P.swell, (P.swellDir * Math.PI) / 180);

  // falcon state: circling high, or stooping through the flock
  const hawk = {
    p: new THREE.Vector3(200, 380, -900),
    v: new THREE.Vector3(-20, 0, 0),
    mode: "circle",
    clock: 0,
    aim: new THREE.Vector3(),
  };
  const stoop = () => {
    hawk.mode = "stoop";
    hawk.clock = 0;
    // aim at a spot in the flock, which keeps moving while the falcon comes down
    hawk.aim.set(
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 80,
    );
  };

  const ray = new THREE.Raycaster();
  const onDown = (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    if (!drag) {
      if (e.pointerType === "mouse") pointerSeen = performance.now();
      return;
    }
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    yaw -= dx * 0.0022;
    pitch = Math.max(-0.45, Math.min(0.9, pitch + dy * 0.0022));
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const onUp = () => {
    // a tap (no drag) sends the falcon at that point
    if (drag && drag.moved < 6 && P.falcon) pointerSeen = performance.now();
    drag = null;
  };
  const onLeave = () => {
    pointer = null;
  };
  const onKey = (e) => {
    if (e.key === "ArrowLeft") yaw += 0.06;
    else if (e.key === "ArrowRight") yaw -= 0.06;
    else if (e.key === "ArrowUp") pitch = Math.min(0.9, pitch + 0.05);
    else if (e.key === "ArrowDown") pitch = Math.max(-0.45, pitch - 0.05);
    else if (e.key === " " || e.key === "Enter") stoop();
    else return;
    e.preventDefault();
  };
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("keydown", onKey);

  /* ---------- sound: the sea, and the wind over it ---------- */
  const audio = { ctx: null, sea: null, wind: null };
  function setSound(on) {
    if (on && !audio.ctx) {
      const C = new AudioContext();
      const noise = (seconds) => {
        const buffer = C.createBuffer(1, C.sampleRate * seconds, C.sampleRate);
        const data = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < data.length; i++) {
          last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown
          data[i] = last * 3.5;
        }
        const source = C.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.start();
        return source;
      };
      // waves: low noise that swells and falls on the swell's period
      const seaLow = C.createBiquadFilter();
      seaLow.type = "lowpass";
      seaLow.frequency.value = 520;
      const sea = C.createGain();
      sea.gain.value = 0;
      const lfo = C.createOscillator();
      const lfoDepth = C.createGain();
      lfo.frequency.value = 0.11;
      lfoDepth.gain.value = 0.35;
      const seaLevel = C.createGain();
      seaLevel.gain.value = 0.6;
      lfo.connect(lfoDepth).connect(seaLevel.gain);
      lfo.start();
      noise(4).connect(seaLow).connect(seaLevel).connect(sea).connect(C.destination);
      // wind: higher, breathier
      const band = C.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 900;
      band.Q.value = 0.6;
      const wind = C.createGain();
      wind.gain.value = 0;
      const white = C.createBuffer(1, C.sampleRate * 3, C.sampleRate);
      const w = white.getChannelData(0);
      for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1;
      const ws = C.createBufferSource();
      ws.buffer = white;
      ws.loop = true;
      ws.start();
      ws.connect(band).connect(wind).connect(C.destination);
      Object.assign(audio, { ctx: C, sea, wind });
    }
    if (!audio.ctx) return;
    audio.ctx.resume();
    const t = audio.ctx.currentTime;
    audio.sea.gain.setTargetAtTime(on ? 0.22 + 0.04 * P.wind : 0, t, 0.6);
    audio.wind.gain.setTargetAtTime(on ? 0.004 + 0.0045 * P.wind : 0, t, 0.6);
  }

  /* ---------- frame ---------- */
  let last = performance.now();
  let clock = 0;
  const fwd = new THREE.Vector3();
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
    const pace = reduced ? 0.4 : 1;
    clock += dt * pace;
    uTime.value = clock;

    // settings glide to where they have been set
    const ease = 1 - Math.exp(-dt * 1.4);
    windNow += (P.wind - windNow) * ease;
    swellNow += (P.swell - swellNow) * ease;
    swellDirNow += (P.swellDir - swellDirNow) * ease;
    sunNow += (P.sun - sunNow) * ease;
    heightNow += (P.height - heightNow) * ease;
    if (
      Math.abs(P.wind - windNow) +
        Math.abs(P.swell - swellNow) +
        Math.abs(P.swellDir - swellDirNow) >
      1e-3
    ) {
      hs = waves(windNow, swellNow, (swellDirNow * Math.PI) / 180);
    }
    uFoam.value = Math.min(1, Math.max(0, (windNow - 2.6) / 4.5));
    uSlope.value = 0.0012 + 0.00512 * Math.max(0.6, 0.836 * windNow ** 1.5) * 0.9;

    const e = (sunNow * Math.PI) / 180;
    const az = -0.12;
    uSun.value.set(Math.sin(az) * Math.cos(e), Math.sin(e), -Math.cos(az) * Math.cos(e));
    const palette = skyAt(sunNow);
    uZenith.value.setRGB(...palette.zen);
    uHorizon.value.setRGB(...palette.hor);
    uSunCol.value.setRGB(...palette.sun);
    uSunShow.value = sunNow > -0.6 ? 1 : 0;

    camera.position.set(0, heightNow + 1.5, 0);
    fwd.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(fwd.add(camera.position));
    dome.position.copy(camera.position);

    // the roost drifts about the sky ahead
    roost.set(
      -100 + Math.sin(clock * 0.045) * 200,
      140 + Math.sin(clock * 0.07) * 40,
      -560 + Math.cos(clock * 0.037) * 140,
    );
    uRoost.value.copy(roost);

    // the falcon
    hawk.clock += dt * pace;
    const hover = P.pointer && pointer && performance.now() - pointerSeen < 1800;
    if (P.falcon || hover) {
      let target;
      let top;
      if (hover) {
        ray.setFromCamera(pointer, camera);
        target = ray.ray.at(camera.position.distanceTo(roost), new THREE.Vector3());
        top = 75;
      } else if (hawk.mode === "circle") {
        const a = hawk.clock * 0.35;
        target = roost.clone().add(new THREE.Vector3(Math.cos(a) * 260, 220, Math.sin(a) * 260));
        top = 22;
        if (hawk.clock > 9 && !reduced) stoop();
      } else {
        if (hawk.mode === "stoop" && hawk.p.distanceTo(roost.clone().add(hawk.aim)) < 25)
          hawk.mode = "climb";
        if (hawk.mode === "stoop") target = roost.clone().add(hawk.aim);
        // through the flock and out the other side, then back up to circle
        else
          target = hawk.p
            .clone()
            .add(new THREE.Vector3(hawk.v.x, 0, hawk.v.z).setLength(300))
            .add(new THREE.Vector3(0, 260, 0));
        top = hawk.mode === "stoop" ? 80 : 45;
        if (hawk.clock > 9) {
          hawk.mode = "circle";
          hawk.clock = 0;
        }
      }
      const want = target.sub(hawk.p);
      const steer = want
        .setLength(Math.min(want.length() * 2, top))
        .sub(hawk.v)
        .multiplyScalar(Math.min(1, dt * 2.2));
      hawk.v.add(steer);
      hawk.p.addScaledVector(hawk.v, dt * pace);
      falcon.visible = true;
      falcon.position.copy(hawk.p);
      falcon.lookAt(hawk.p.clone().add(hawk.v));
      falcon.scale.setScalar(Math.max(2.4, hawk.p.distanceTo(camera.position) * 0.011));
      uFalcon.value.copy(hawk.p);
    } else {
      falcon.visible = false;
      uFalcon.value.set(0, -10000, 0);
    }

    uDt.value = Math.min(dt, 1 / 30) * pace;
    renderer.compute(clearGrid);
    renderer.compute(binBirds);
    renderer.compute(flyBirds);

    const text = `Beaufort ${Math.round(windNow)}, ${BEAUFORT[Math.round(windNow)]}\nwaves about ${hs < 0.1 ? "a few centimetres" : `${hs.toFixed(1)} m`}\nsun ${Math.round(sunNow)}° ${sunNow >= 0 ? "above" : "below"} the horizon\n${P.flock} starlings`;
    if (text !== shown) {
      shown = text;
      options.onReadout(text);
    }
    pipeline.render();
  }
  renderer.setAnimationLoop(frame);

  return {
    controls: [
      {
        type: "range",
        key: "sun",
        label: "Sun above the horizon, °",
        min: -6,
        max: 20,
        step: 0.5,
        value: 2.5,
      },
      { type: "range", key: "wind", label: "Wind, Beaufort", min: 0, max: 9, step: 1, value: 3 },
      { type: "range", key: "swell", label: "Swell", min: 0, max: 1.5, step: 0.05, value: 0.45 },
      {
        type: "range",
        key: "swellDir",
        label: "Swell from, °",
        min: 90,
        max: 330,
        step: 5,
        value: 200,
      },
      { type: "range", key: "cloud", label: "Cloud", min: 0, max: 1, step: 0.01, value: 0.4 },
      { type: "select", key: "flock", label: "Starlings", options: FLOCKS, value: FLOCKS[1] },
      {
        type: "range",
        key: "tight",
        label: "How close they keep",
        min: 0,
        max: 1,
        step: 0.01,
        value: 0.6,
      },
      { type: "toggle", key: "falcon", label: "A falcon hunts", value: true },
      { type: "toggle", key: "pointer", label: "The falcon follows the pointer", value: true },
      { type: "action", key: "stoop", label: "Send the falcon" },
      {
        type: "range",
        key: "height",
        label: "Standing above the sea, m",
        min: 1,
        max: 60,
        step: 1,
        value: 4,
      },
      { type: "range", key: "glow", label: "Glare", min: 0, max: 0.6, step: 0.01, value: 0.12 },
    ],
    set(key, value) {
      if (key === "flock") {
        const count = Number(String(value).replace(/,/g, ""));
        P.flock = value;
        uActive.value = count;
        birds.count = count;
        uCrowd.value = 150 * (count / 262144) ** 0.6;
      } else if (key === "cloud") uCloud.value = value;
      else if (key === "tight") uTight.value = value;
      else if (key === "glow") uGlow.value = value;
      else if (key === "stoop") {
        hawk.p.copy(roost).add(new THREE.Vector3(160, 260, -60));
        stoop();
      } else if (key in P) P[key] = value;
      if (audio.ctx && key === "wind") setSound(audio.sea.gain.value > 0.01);
    },
    setSound,
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("keydown", onKey);
      if (audio.ctx) audio.ctx.close();
      waveTex.dispose();
      seaGeo.dispose();
      birdGeo.dispose();
      renderer.dispose();
    },
  };
}
