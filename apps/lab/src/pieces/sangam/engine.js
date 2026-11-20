// Sangam: two galaxies meet.
// The method Toomre and Toomre used in 1972 to explain tidal tails: two massive galaxy cores
// fall past each other on a real orbit, slowed by dynamical friction until they merge, and a
// million stars and gas clouds orbit those cores on the GPU. The tails, bridges and shells are
// not drawn; they happen. Units: a galaxy's disk is about 1 unit (taken as 15 kpc) across its
// radius, its core 1 mass unit (10¹¹ suns), so one unit of time is about 87 million years.
// WebGPU only.

import { bloom } from "three/addons/tsl/display/BloomNode.js";
import {
  dot,
  exp,
  Fn,
  float,
  hash,
  instancedArray,
  instanceIndex,
  Loop,
  mix,
  pass,
  pow,
  smoothstep,
  uniform,
  uv,
  varying,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";

const STARS = 1_000_000;
const GAS = 200_000;
const N = STARS + GAS;
const SUB = 4;
const EPS2 = 0.012; // softening for the stars round each core
const CORE_EPS2 = 0.09; // and between the two cores
const MYR = 86.6; // million years per unit of time
const KLY = 48.9; // thousand light-years per unit of length

const PRESETS = {
  "Milky Way and Andromeda": { m2: 1.2, tilt1: 25, tilt2: 70, approach: 0.9, view: 0.55 },
  "The Antennae": { m2: 1, tilt1: 15, tilt2: 40, approach: 0.75, view: 0.9 },
  "The Mice": { m2: 1, tilt1: 10, tilt2: 55, approach: 1.25, view: 0.25 },
  "A small galaxy falls in": { m2: 0.15, tilt1: 0, tilt2: 125, approach: 0.8, view: 0.6 },
};
const NAMES = Object.keys(PRESETS);

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

export async function createSangam(canvas, options) {
  if (!("gpu" in navigator)) throw new Error("webgpu-unavailable");
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false });
  await renderer.init();
  if (!renderer.backend.isWebGPUBackend) {
    renderer.dispose();
    throw new Error("webgpu-unavailable");
  }
  const reduced = options.reducedMotion;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 400);

  const pos = instancedArray(N, "vec4"); // xyz, galaxy (0 or 1)
  const vel = instancedArray(N, "vec4"); // xyz, kind (0 disk star, 1 bulge star, 2 gas)

  const uC1a = uniform(new THREE.Vector3());
  const uC1b = uniform(new THREE.Vector3());
  const uC2a = uniform(new THREE.Vector3());
  const uC2b = uniform(new THREE.Vector3());
  const uM1 = uniform(1);
  const uM2 = uniform(1);
  const uH = uniform(0);
  const uBurst = uniform(0);
  const uBright = uniform(1);
  const uGas = uniform(1);
  const uPx = uniform(0.01); // world units per pixel at unit distance

  const step = Fn(() => {
    const P = pos.element(instanceIndex);
    const V = vel.element(instanceIndex);
    const p = P.xyz.toVar();
    const v = V.xyz.toVar();
    Loop(SUB, ({ i }) => {
      const f = float(i).add(0.5).div(SUB);
      const d1 = mix(uC1a, uC1b, f).sub(p);
      const d2 = mix(uC2a, uC2b, f).sub(p);
      const a = d1
        .mul(uM1.div(pow(dot(d1, d1).add(EPS2), 1.5)))
        .add(d2.mul(uM2.div(pow(dot(d2, d2).add(EPS2), 1.5))));
      v.addAssign(a.mul(uH));
      p.addAssign(v.mul(uH));
    });
    P.assign(vec4(p, P.w));
    V.assign(vec4(v, V.w));
  })().compute(N);

  /* ---------- drawing ---------- */
  const material = new THREE.SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  {
    const P = pos.element(instanceIndex);
    const kind = vel.element(instanceIndex).w;
    const seed = hash(instanceIndex.add(11));
    const gas = kind.greaterThan(1.5);
    const bulge = kind.greaterThan(0.5).and(gas.not());
    const size = gas.select(
      seed.mul(0.05).add(0.05),
      uPx.mul(1.6).mul(float(1).add(pow(seed, 8).mul(2))),
    );
    material.positionNode = P.xyz;
    material.scaleNode = size;
    // old, warm stars in the bulges; young blue and white in the disks; glowing gas, pink where
    // stars are forming and blue where it is lit by young ones
    const disk = mix(vec3(0.5, 0.66, 1), vec3(1, 0.88, 0.7), pow(seed, 1.6));
    const old = mix(vec3(1, 0.7, 0.4), vec3(1, 0.84, 0.62), seed);
    const cloud = mix(vec3(1, 0.32, 0.55), vec3(0.35, 0.55, 1), smoothstep(0.65, 0.9, seed));
    const starLight = pow(hash(instanceIndex.add(97)), 6)
      .mul(1.1)
      .add(0.05);
    const colour = gas.select(
      cloud.mul(uGas.mul(float(0.016).add(uBurst.mul(0.04)))),
      bulge.select(old.mul(0.7), disk).mul(starLight),
    );
    const tint = varying(colour.mul(uBright));
    const cloudy = varying(gas.select(float(1), float(0)));
    // the round, soft shape is worked out per pixel; only which kind of point it is comes from
    // the vertex stage
    const d = uv().sub(0.5);
    const r2 = dot(d, d);
    material.colorNode = vec4(tint.mul(exp(r2.mul(mix(float(-30), float(-14), cloudy)))), 1);
  }
  const points = new THREE.Sprite(material);
  points.count = N;
  points.frustumCulled = false;
  scene.add(points);

  const Pipeline = THREE.RenderPipeline ?? THREE.PostProcessing;
  const pipeline = new Pipeline(renderer);
  const uGlow = uniform(0.25);
  {
    const scenePass = pass(scene, camera);
    const colour = scenePass.getTextureNode("output");
    const glow = bloom(colour, 1, 0.55, 0.35);
    const hdr = colour.add(glow.mul(uGlow));
    pipeline.outputNode = vec4(float(1).sub(exp(hdr.rgb.negate())), 1);
  }

  /* ---------- the encounter ---------- */
  const P = { preset: NAMES[0], speed: 1.4, ...PRESETS[NAMES[0]] };
  const core = {
    p1: new THREE.Vector3(),
    p2: new THREE.Vector3(),
    v1: new THREE.Vector3(),
    v2: new THREE.Vector3(),
    t: 0,
    closest: Infinity,
  };

  function circular(m, r) {
    return Math.sqrt((m * r * r) / (r * r + EPS2) ** 1.5);
  }

  function build() {
    const m1 = 1;
    const m2 = P.m2;
    uM1.value = m1;
    uM2.value = m2;
    // a parabolic orbit with the chosen closest approach, starting well apart
    const mt = m1 + m2;
    const r0 = 8;
    const q = P.approach;
    const h = Math.sqrt(2 * mt * q);
    const speed = Math.sqrt((2 * mt) / r0);
    const vt = h / r0;
    const vr = -Math.sqrt(Math.max(speed * speed - vt * vt, 0));
    const rel = new THREE.Vector3(r0, 0, 0);
    const relV = new THREE.Vector3(vr, 0, -vt); // orbit turns about +y
    core.p1.copy(rel).multiplyScalar(-m2 / mt);
    core.p2.copy(rel).multiplyScalar(m1 / mt);
    core.v1.copy(relV).multiplyScalar(-m2 / mt);
    core.v2.copy(relV).multiplyScalar(m1 / mt);
    core.t = 0;
    core.closest = Infinity;

    const p = pos.value.array;
    const v = vel.value.array;
    const random = rng(1972);
    const share = m1 / (m1 + Math.sqrt(m2) * 0.9 + 0.1 * (1 - m2));
    const tilt = [(P.tilt1 * Math.PI) / 180, (P.tilt2 * Math.PI) / 180];
    const centre = [core.p1, core.p2];
    const drift = [core.v1, core.v2];
    const mass = [m1, m2];
    const size = [1, Math.max(0.35, Math.cbrt(m2))];
    const tmp = new THREE.Vector3();
    const tv = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const isGas = i >= STARS;
      const g = random() < (isGas ? 0.5 + (share - 0.5) * 0.8 : share) ? 0 : 1;
      const bulge = !isGas && random() < 0.16;
      let r;
      if (bulge) {
        r = 0.18 * Math.sqrt(-Math.log(1 - random() * 0.95)) * size[g];
        // a round cloud of old stars on circular orbits in every plane
        const u = random() * 2 - 1;
        const a = random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        tmp.set(s * Math.cos(a), u, s * Math.sin(a)).multiplyScalar(r);
        const axis = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
        tv.crossVectors(axis, tmp).setLength(circular(mass[g], r) * 0.92);
      } else {
        // an exponential disk with gentle spiral arms in its gas
        do {
          r = -0.3 * size[g] * Math.log(random() * random());
        } while (r > 1.15 * size[g] || r < 0.04);
        let a = random() * Math.PI * 2;
        if (isGas)
          a += Math.round(random()) * Math.PI + Math.log(r / 0.15) * 2.2 + (random() - 0.5) * 0.9;
        const thick = (isGas ? 0.008 : 0.025) * size[g];
        tmp.set(Math.cos(a) * r, (random() - 0.5) * 2 * thick, Math.sin(a) * r);
        tv.set(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(-circular(mass[g], r));
        // turning the same way as the orbit when the tilt is 0°, against it at 180°
        tmp.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt[g] * (g === 0 ? 1 : -1));
        tv.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt[g] * (g === 0 ? 1 : -1));
      }
      tmp.add(centre[g]);
      tv.add(drift[g]);
      p.set([tmp.x, tmp.y, tmp.z, g], i * 4);
      v.set([tv.x, tv.y, tv.z, isGas ? 2 : bulge ? 1 : 0], i * 4);
    }
    pos.value.needsUpdate = true;
    vel.value.needsUpdate = true;
    uC1a.value.copy(core.p1);
    uC1b.value.copy(core.p1);
    uC2a.value.copy(core.p2);
    uC2b.value.copy(core.p2);
  }

  function advanceCores(dt) {
    // the two cores pull on each other; dynamical friction drains their orbit as the halos overlap
    const n = 40;
    const h = dt / n;
    const d = new THREE.Vector3();
    const rv = new THREE.Vector3();
    const m1 = uM1.value;
    const m2 = uM2.value;
    for (let k = 0; k < n; k++) {
      d.subVectors(core.p2, core.p1);
      const r2 = d.lengthSq();
      const r = Math.sqrt(r2);
      const f = 1 / (r2 + CORE_EPS2) ** 1.5;
      rv.subVectors(core.v2, core.v1);
      const drag = 0.22 * Math.exp(-r / 0.9);
      core.v1.addScaledVector(d, m2 * f * h).addScaledVector(rv, (drag * m2 * h) / (m1 + m2));
      core.v2.addScaledVector(d, -m1 * f * h).addScaledVector(rv, (-drag * m1 * h) / (m1 + m2));
      core.p1.addScaledVector(core.v1, h);
      core.p2.addScaledVector(core.v2, h);
    }
    core.t += dt;
    core.closest = Math.min(core.closest, core.p1.distanceTo(core.p2));
  }

  /* ---------- view ---------- */
  let yaw = 0.4;
  let pitch = P.view;
  let dist = 13;
  let distTo = 13;
  let drag = null;
  let lastTouch = -1e9;
  const onDown = (e) => {
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag) return;
    yaw -= (e.clientX - drag.x) * 0.005;
    pitch = Math.max(-1.45, Math.min(1.45, pitch + (e.clientY - drag.y) * 0.005));
    drag.x = e.clientX;
    drag.y = e.clientY;
    lastTouch = performance.now();
  };
  const onUp = () => {
    drag = null;
  };
  const onWheel = (e) => {
    e.preventDefault();
    distTo = Math.max(3, Math.min(40, distTo * Math.exp(e.deltaY * 0.001)));
    lastTouch = performance.now();
  };
  const onKey = (e) => {
    if (e.key === "ArrowLeft") yaw += 0.08;
    else if (e.key === "ArrowRight") yaw -= 0.08;
    else if (e.key === "ArrowUp") pitch = Math.min(1.45, pitch + 0.06);
    else if (e.key === "ArrowDown") pitch = Math.max(-1.45, pitch - 0.06);
    else if (e.key === "+" || e.key === "=") distTo = Math.max(3, distTo * 0.9);
    else if (e.key === "-" || e.key === "_") distTo = Math.min(40, distTo / 0.9);
    else return;
    e.preventDefault();
    lastTouch = performance.now();
  };
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("keydown", onKey);

  /* ---------- sound: a slow chord that thickens as they meet ---------- */
  const audio = { ctx: null, out: null, swell: null };
  function setSound(on) {
    if (on && !audio.ctx) {
      const C = new AudioContext();
      const out = C.createGain();
      out.gain.value = 0;
      const swell = C.createGain();
      swell.gain.value = 0.2;
      const low = C.createBiquadFilter();
      low.type = "lowpass";
      low.frequency.value = 900;
      out.connect(low).connect(C.destination);
      for (const f of [55, 82.4, 110, 164.8, 220]) {
        const o = C.createOscillator();
        o.type = "triangle";
        o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
        const g = C.createGain();
        g.gain.value = 0.06;
        o.connect(g).connect(f > 100 ? swell : out);
        o.start();
      }
      swell.connect(out);
      Object.assign(audio, { ctx: C, out, swell });
    }
    if (!audio.ctx) return;
    audio.ctx.resume();
    audio.out.gain.setTargetAtTime(on ? 0.5 : 0, audio.ctx.currentTime, 0.8);
  }

  /* ---------- frame ---------- */
  let disposed = false;
  let shown = "";
  let last = performance.now();
  let rebuildAt = 0;
  build();
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
    if (rebuildAt && now > rebuildAt) {
      rebuildAt = 0;
      build();
    }

    const step_ = Math.min(dt, 1 / 30) * P.speed * (reduced ? 0.4 : 1);
    uC1a.value.copy(core.p1);
    uC2a.value.copy(core.p2);
    if (step_ > 0) advanceCores(step_);
    uC1b.value.copy(core.p1);
    uC2b.value.copy(core.p2);
    uH.value = step_ / SUB;
    if (step_ > 0) renderer.compute(step);

    // star formation flares as the gas is squeezed; an illustration, not a model
    const sep = core.p1.distanceTo(core.p2);
    const want = Math.max(0, Math.min(1, (2.2 - sep) / 1.8));
    uBurst.value += (want - uBurst.value) * (1 - Math.exp(-dt * (want > uBurst.value ? 2 : 0.25)));
    if (audio.swell)
      audio.swell.gain.setTargetAtTime(0.2 + uBurst.value * 1.4, audio.ctx.currentTime, 0.5);

    if (!drag && !reduced && now - lastTouch > 3000) yaw += dt * 0.025;
    dist += (distTo - dist) * (1 - Math.exp(-dt * 4));
    const fit = Math.max(1, 1.2 / camera.aspect);
    camera.position
      .set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
      .multiplyScalar(dist * fit);
    camera.lookAt(0, 0, 0);
    uPx.value = (2 * Math.tan((camera.fov * Math.PI) / 360) * dist * fit) / (h * dpr);

    const years = core.t * MYR;
    const when =
      years < 1000
        ? `${Math.round(years / 10) * 10} million years`
        : `${(years / 1000).toFixed(2)} billion years`;
    const apart = Math.round((sep * KLY) / 5) * 5;
    const text = `${P.preset}\n${when} in\n${sep < 0.12 ? "the cores have merged" : `cores ${apart.toLocaleString("en-GB")},000 light-years apart`}`;
    if (text !== shown) {
      shown = text;
      options.onReadout(text);
    }
    pipeline.render();
  }
  renderer.setAnimationLoop(frame);

  const restartSoon = () => {
    rebuildAt = performance.now() + 350;
  };

  return {
    controls: [
      { type: "select", key: "preset", label: "Encounter", options: NAMES, value: NAMES[0] },
      {
        type: "range",
        key: "speed",
        label: "Speed of time",
        min: 0,
        max: 4,
        step: 0.05,
        value: 1.4,
      },
      {
        type: "range",
        key: "approach",
        label: "Closest approach",
        min: 0.3,
        max: 3,
        step: 0.05,
        value: P.approach,
      },
      {
        type: "range",
        key: "m2",
        label: "Mass of the second galaxy",
        min: 0.1,
        max: 1.5,
        step: 0.05,
        value: P.m2,
      },
      {
        type: "range",
        key: "tilt2",
        label: "Second galaxy's tilt, °",
        min: 0,
        max: 180,
        step: 5,
        value: P.tilt2,
      },
      { type: "toggle", key: "gas", label: "Gas glows where stars form", value: true },
      { type: "range", key: "bright", label: "Brightness", min: 0.2, max: 3, step: 0.05, value: 1 },
      { type: "range", key: "glow", label: "Glow", min: 0, max: 1.5, step: 0.05, value: 0.25 },
      { type: "action", key: "restart", label: "Start over" },
    ],
    set(key, value) {
      if (key === "preset") {
        const preset = PRESETS[value];
        if (!preset) return;
        Object.assign(P, preset, { preset: value });
        pitch = preset.view;
        options.onValues?.({ approach: preset.approach, m2: preset.m2, tilt2: preset.tilt2 });
        build();
      } else if (key === "approach" || key === "m2" || key === "tilt2") {
        if (P[key] === value) return;
        P[key] = value;
        restartSoon();
      } else if (key === "speed") P.speed = value;
      else if (key === "gas") uGas.value = value ? 1 : 0;
      else if (key === "bright") uBright.value = value;
      else if (key === "glow") uGlow.value = value;
      else if (key === "restart") build();
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
      renderer.dispose();
    },
  };
}
