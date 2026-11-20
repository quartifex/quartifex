// Dhuān: smoke and ink in a glass box, as a real 3D fluid.
// A 128 × 128 × 128 grid (2.1 million cells) solved on the GPU each frame by the stable-fluids
// method (Stam 1999): velocity is carried along by itself, heat lifts smoke and weight sinks ink,
// vorticity confinement (Fedkiw, Stam and Jensen 2001) gives back the small curls a coarse grid
// loses, and a pressure solve keeps the fluid from being squeezed. The dye is drawn by marching
// rays through the box, with light from above for smoke and colour taken out of white light for
// ink. Drag to stir. WebGPU only.

import {
  abs,
  Break,
  clamp,
  cross,
  dot,
  exp,
  Fn,
  float,
  fract,
  If,
  instancedArray,
  instanceIndex,
  int,
  ivec3,
  Loop,
  length,
  max,
  min,
  mix,
  normalize,
  positionLocal,
  screenUV,
  sin,
  smoothstep,
  texture3D,
  textureStore,
  uniform,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";

const R = 128;
const N = R * R * R;
const JACOBI = 40;

export async function createDhuan(canvas, options) {
  if (!("gpu" in navigator)) throw new Error("webgpu-unavailable");
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false });
  await renderer.init();
  if (!renderer.backend.isWebGPUBackend) {
    renderer.dispose();
    throw new Error("webgpu-unavailable");
  }
  const reduced = options.reducedMotion;

  const volume = () => {
    const t = new THREE.Storage3DTexture(R, R, R);
    t.type = THREE.HalfFloatType;
    t.format = THREE.RGBAFormat;
    t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
    return t;
  };
  const velA = volume();
  const velB = volume();
  const dyeA = volume(); // rgb: dye, a: heat (smoke) or weight (ink)
  const dyeB = volume();
  const curl = instancedArray(N, "vec4");
  const div = instancedArray(N, "float");
  const presA = instancedArray(N, "float");
  const presB = instancedArray(N, "float");

  const uInk = uniform(0); // 0 smoke, 1 ink
  const uSwirl = uniform(0.45);
  const uLift = uniform(0.5);
  const uLinger = uniform(0.6);
  const uStir = uniform(new THREE.Vector4(0, 0, 0, 0)); // cell position, radius
  const uStirVel = uniform(new THREE.Vector3());
  const uSrcA = uniform(new THREE.Vector4(64, 10, 64, 0)); // the steady source: position, radius
  const uSrcAVel = uniform(new THREE.Vector4(0, 0.6, 0, 0)); // velocity, amount
  const uSrcAColour = uniform(new THREE.Vector3(0.85, 0.85, 0.85));
  const uSrcB = uniform(new THREE.Vector4(64, 64, 64, 0)); // a puff or a drop
  const uSrcBVel = uniform(new THREE.Vector4(0, 0, 0, 0));
  const uSrcBColour = uniform(new THREE.Vector3(1, 1, 1));

  const cell = () => {
    const i = int(instanceIndex);
    return [i.mod(R), i.div(R).mod(R), i.div(R * R)];
  };
  const idx = (x, y, z) =>
    clamp(z, 0, R - 1)
      .mul(R * R)
      .add(clamp(y, 0, R - 1).mul(R))
      .add(clamp(x, 0, R - 1));
  const load = (tex, x, y, z) =>
    texture3D(tex, ivec3(clamp(x, 0, R - 1), clamp(y, 0, R - 1), clamp(z, 0, R - 1))).setSampler(
      false,
    );
  const sample = (tex, p) => texture3D(tex, p.add(0.5).div(R)).level(0);
  const store = (tex, x, y, z, v) => textureStore(tex, ivec3(x, y, z), v).toWriteOnly();

  /* start empty */
  const clearVolumes = Fn(() => {
    const [x, y, z] = cell();
    store(velA, x, y, z, vec4(0));
    store(velB, x, y, z, vec4(0));
    store(dyeA, x, y, z, vec4(0));
    store(dyeB, x, y, z, vec4(0));
    presA.element(instanceIndex).assign(0);
    presB.element(instanceIndex).assign(0);
  })().compute(N);

  /* the curl of the velocity, for vorticity confinement */
  const curlPass = Fn(() => {
    const [x, y, z] = cell();
    const dx = load(velA, x.add(1), y, z).xyz.sub(load(velA, x.sub(1), y, z).xyz);
    const dy = load(velA, x, y.add(1), z).xyz.sub(load(velA, x, y.sub(1), z).xyz);
    const dz = load(velA, x, y, z.add(1)).xyz.sub(load(velA, x, y, z.sub(1)).xyz);
    const w = vec3(dy.z.sub(dz.y), dz.x.sub(dx.z), dx.y.sub(dy.x)).mul(0.5);
    curl.element(instanceIndex).assign(vec4(w, length(w)));
  })().compute(N);

  const gauss = (p, centre, radius) =>
    exp(
      dot(p.sub(centre), p.sub(centre))
        .negate()
        .div(max(radius.mul(radius), 0.01)),
    );

  /* velocity is carried by itself; then heat, weight, swirl, stirring and the sources push it */
  const advectVel = Fn(() => {
    const [x, y, z] = cell();
    const p = vec3(float(x), float(y), float(z));
    const here = load(velA, x, y, z).xyz;
    const v = sample(velA, p.sub(here)).xyz.toVar();
    const d = load(dyeA, x, y, z);
    // smoke: heat rises and soot weighs a little; ink: the dye is heavier than water
    const smokeLift = d.w.mul(0.012).sub(d.x.add(d.y).add(d.z).mul(0.0015));
    const inkSink = d.w.mul(-0.014);
    v.y.addAssign(mix(smokeLift, inkSink, uInk).mul(uLift.mul(1.6).add(0.1)));
    // vorticity confinement
    const g = vec3(
      curl.element(idx(x.add(1), y, z)).w.sub(curl.element(idx(x.sub(1), y, z)).w),
      curl.element(idx(x, y.add(1), z)).w.sub(curl.element(idx(x, y.sub(1), z)).w),
      curl.element(idx(x, y, z.add(1))).w.sub(curl.element(idx(x, y, z.sub(1))).w),
    );
    const nrm = g.div(max(length(g), 1e-5));
    v.addAssign(cross(nrm, curl.element(instanceIndex).xyz).mul(uSwirl.mul(mix(0.9, 0.3, uInk))));
    // the pointer stirs
    v.addAssign(uStirVel.mul(gauss(p, uStir.xyz, uStir.w)).mul(0.6));
    // sources push as they pour
    v.addAssign(
      uSrcAVel.xyz
        .sub(v)
        .mul(gauss(p, uSrcA.xyz, uSrcA.w))
        .mul(min(uSrcAVel.w, 1)),
    );
    v.addAssign(
      uSrcBVel.xyz
        .sub(v)
        .mul(gauss(p, uSrcB.xyz, uSrcB.w))
        .mul(min(uSrcBVel.w, 1)),
    );
    const speed = length(v);
    v.mulAssign(min(float(1), float(4).div(max(speed, 1e-5))));
    // the glass walls hold the fluid in
    const wall = x
      .equal(0)
      .or(x.equal(R - 1))
      .or(y.equal(0))
      .or(y.equal(R - 1))
      .or(z.equal(0))
      .or(z.equal(R - 1));
    If(wall, () => {
      v.assign(vec3(0));
    });
    store(velB, x, y, z, vec4(v, 0));
  })().compute(N);

  const divergence = Fn(() => {
    const [x, y, z] = cell();
    const d = load(velB, x.add(1), y, z)
      .x.sub(load(velB, x.sub(1), y, z).x)
      .add(load(velB, x, y.add(1), z).y.sub(load(velB, x, y.sub(1), z).y))
      .add(load(velB, x, y, z.add(1)).z.sub(load(velB, x, y, z.sub(1)).z))
      .mul(0.5);
    div.element(instanceIndex).assign(d);
  })().compute(N);

  const makeJacobi = (src, dst) =>
    Fn(() => {
      const [x, y, z] = cell();
      const sum = src
        .element(idx(x.add(1), y, z))
        .add(src.element(idx(x.sub(1), y, z)))
        .add(src.element(idx(x, y.add(1), z)))
        .add(src.element(idx(x, y.sub(1), z)))
        .add(src.element(idx(x, y, z.add(1))))
        .add(src.element(idx(x, y, z.sub(1))));
      dst.element(instanceIndex).assign(sum.sub(div.element(instanceIndex)).div(6));
    })().compute(N);
  const jacobiAB = makeJacobi(presA, presB);
  const jacobiBA = makeJacobi(presB, presA);

  const project = Fn(() => {
    const [x, y, z] = cell();
    const grad = vec3(
      presA.element(idx(x.add(1), y, z)).sub(presA.element(idx(x.sub(1), y, z))),
      presA.element(idx(x, y.add(1), z)).sub(presA.element(idx(x, y.sub(1), z))),
      presA.element(idx(x, y, z.add(1))).sub(presA.element(idx(x, y, z.sub(1)))),
    ).mul(0.5);
    store(velA, x, y, z, vec4(load(velB, x, y, z).xyz.sub(grad), 0));
  })().compute(N);

  /* the dye rides the new velocity, fades, and is fed by the sources */
  // MacCormack advection (Selle and others 2008): carry the dye back, carry it forward again, and
  // use the difference to undo most of the blur a plain semi-Lagrangian step leaves
  const advectDye = Fn(() => {
    const [x, y, z] = cell();
    const p = vec3(float(x), float(y), float(z));
    const v = load(velA, x, y, z).xyz;
    store(dyeB, x, y, z, sample(dyeA, p.sub(v)));
  })().compute(N);
  const correctDye = Fn(() => {
    const [x, y, z] = cell();
    const p = vec3(float(x), float(y), float(z));
    const v = load(velA, x, y, z).xyz;
    const ahead = load(dyeB, x, y, z);
    const back = sample(dyeB, p.add(v));
    const sharp = ahead.add(load(dyeA, x, y, z).sub(back).mul(0.5));
    // keep within what the neighbourhood the dye came from held, so nothing overshoots
    const from = p.sub(v);
    const fx = int(clamp(from.x, 0, R - 2));
    const fy = int(clamp(from.y, 0, R - 2));
    const fz = int(clamp(from.z, 0, R - 2));
    let lo = load(dyeA, fx, fy, fz);
    let hi = lo;
    for (const [i, j, k] of [
      [1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [0, 0, 1],
      [1, 0, 1],
      [0, 1, 1],
      [1, 1, 1],
    ]) {
      const c = load(dyeA, fx.add(i), fy.add(j), fz.add(k));
      lo = min(lo, c);
      hi = max(hi, c);
    }
    const d = clamp(sharp, lo, hi).toVar();
    // smoke thins out; ink in still water stays far longer
    const keep = mix(mix(0.965, 0.999, uLinger), mix(0.992, 0.9997, uLinger), uInk);
    d.assign(vec4(d.xyz.mul(keep), d.w.mul(mix(0.985, keep, uInk))));
    const a = gauss(p, uSrcA.xyz, uSrcA.w).mul(uSrcAVel.w);
    const b = gauss(p, uSrcB.xyz, uSrcB.w).mul(uSrcBVel.w);
    d.addAssign(vec4(uSrcAColour, 1).mul(a.mul(0.12)));
    d.addAssign(vec4(uSrcBColour, 1).mul(b.mul(mix(0.25, 0.6, uInk))));
    // velB is free until the next frame, so it holds the result for a moment
    store(velB, x, y, z, min(max(d, vec4(0)), vec4(4)));
  })().compute(N);
  const copyDye = Fn(() => {
    const [x, y, z] = cell();
    store(dyeA, x, y, z, load(velB, x, y, z));
  })().compute(N);

  /* ---------- drawing: rays marched through the box ---------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const uCam = uniform(new THREE.Vector3());
  const uRight = uniform(new THREE.Vector3());
  const uUp = uniform(new THREE.Vector3());
  const uFwd = uniform(new THREE.Vector3());
  const uLens = uniform(new THREE.Vector2(1, 1)); // tan(fov / 2) × aspect, tan(fov / 2)
  const uFrame = uniform(0);
  const STEPS = 140;
  const LIGHT_STEPS = 5;

  const shade = Fn(() => {
    const ndc = vec2(screenUV.x.mul(2).sub(1), float(1).sub(screenUV.y.mul(2)));
    const dir = normalize(
      uFwd.add(uRight.mul(ndc.x.mul(uLens.x))).add(uUp.mul(ndc.y.mul(uLens.y))),
    );
    // the room behind: dark for smoke, a pale studio for ink
    const smokeBack = mix(vec3(0.012, 0.014, 0.02), vec3(0.05, 0.055, 0.07), screenUV.y.oneMinus());
    const back = smokeBack;
    // where the ray meets the box [-1, 1]³
    const inv = vec3(1).div(dir);
    const t0 = vec3(-1).sub(uCam).mul(inv);
    const t1 = vec3(1).sub(uCam).mul(inv);
    const tmin = min(t0, t1);
    const tmax = max(t0, t1);
    const enter = max(max(tmin.x, tmin.y), max(tmin.z, 0));
    const leave = min(tmax.x, min(tmax.y, tmax.z));
    const colour = back.toVar();
    If(leave.greaterThan(enter), () => {
      // the ink tank is lit from behind: through the glass the light is a warm white panel
      const exitP = uCam.add(dir.mul(leave));
      const glow = float(1).sub(smoothstep(0.3, 1.5, length(exitP.xy)).mul(0.4));
      const panel = mix(
        vec3(0.96, 0.95, 0.9),
        vec3(0.72, 0.78, 0.82),
        exitP.y.mul(0.5).add(0.5).oneMinus().mul(0.5),
      ).mul(glow);
      const behind = mix(back, panel, uInk);
      const step = leave.sub(enter).div(STEPS);
      const jitter = fract(
        sin(dot(screenUV.mul(vec2(1731, 977)), vec2(12.9898, 78.233)))
          .mul(43758.5453)
          .add(uFrame.mul(0.618)),
      );
      const t = enter.add(step.mul(jitter)).toVar();
      const trans = vec3(1).toVar();
      const light = vec3(0).toVar();
      const sun = normalize(vec3(-0.4, 1, 0.3));
      Loop(STEPS, () => {
        const p = uCam.add(dir.mul(t));
        const uvw = p.mul(0.5).add(0.5);
        const d = texture3D(dyeA, uvw).level(0);
        const amount = d.x.add(d.y).add(d.z);
        If(amount.greaterThan(0.002), () => {
          // smoke: light from above, shadowed by the smoke between
          const shadow = float(0).toVar();
          Loop(LIGHT_STEPS, ({ i }) => {
            const q = uvw.add(sun.mul(float(i).add(1).mul(0.045)));
            const s = texture3D(dyeA, q).level(0);
            shadow.addAssign(s.x.add(s.y).add(s.z));
          });
          const lit = exp(shadow.mul(-1.8)).mul(1.15).add(0.035);
          const dens = amount.mul(step).mul(mix(12, 20, uInk));
          const tint = d.xyz.div(max(amount, 1e-4)).mul(3);
          // a warm glow where the smoke is still hot
          const ember = vec3(1.4, 0.55, 0.18)
            .mul(smoothstep(0.4, 2.2, d.w))
            .mul(float(1).sub(uInk));
          const smokeIn = tint
            .mul(lit)
            .mul(vec3(1, 0.97, 0.92))
            .add(ember);
          // ink: each colour takes its complement out of the light
          const absorb = vec3(1)
            .sub(min(tint, vec3(1)))
            .add(0.06)
            .mul(dens)
            .mul(9);
          const inkTrans = exp(absorb.negate());
          const smokeTrans = exp(dens.negate());
          const stepTrans = mix(vec3(smokeTrans), inkTrans, uInk);
          light.addAssign(trans.mul(smokeIn).mul(float(1).sub(smokeTrans)).mul(float(1).sub(uInk)));
          trans.mulAssign(stepTrans);
        });
        t.addAssign(step);
        If(trans.x.add(trans.y).add(trans.z).lessThan(0.02), () => {
          Break();
        });
      });
      colour.assign(behind.mul(trans).add(light));
      // the edges of the glass
      const entryP = uCam.add(dir.mul(enter));
      const near = vec3(1).sub(abs(entryP));
      const edge = smoothstep(
        0.012,
        0.0,
        min(min(max(near.x, near.y), max(near.y, near.z)), max(near.x, near.z)),
      );
      colour.addAssign(vec3(0.5, 0.55, 0.6).mul(edge).mul(0.35));
    });
    return vec4(colour, 1);
  });

  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicNodeMaterial({ depthTest: false }),
  );
  quad.material.vertexNode = vec4(positionLocal.xy, 0, 1);
  quad.material.colorNode = shade();
  quad.frustumCulled = false;
  scene.add(quad);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  /* ---------- state ---------- */
  const P = { mode: "Smoke", colour: "Plain", flow: true, turn: !reduced };
  const INKS = [
    [0.16, 0.22, 0.62],
    [0.86, 0.22, 0.14],
    [0.95, 0.62, 0.18],
    [0.1, 0.5, 0.48],
    [0.46, 0.16, 0.42],
  ];
  const SMOKES = [
    [0.95, 0.42, 0.2],
    [0.25, 0.55, 1],
    [0.9, 0.85, 0.3],
    [0.75, 0.3, 0.9],
  ];
  let yaw = 0.5;
  let pitch = 0.18;
  let dist = 6.3;
  let distTo = 6.3;
  let drag = null;
  let pointer = null;
  let lastStir = null;
  let clock = 0;
  let nextDrop = 0.5;
  let burst = 0;
  let pending = null;
  let dropAt = null;
  let dropLeft = 0;

  const ray = (px, py) => {
    const rect = canvas.getBoundingClientRect();
    const nx = ((px - rect.left) / rect.width) * 2 - 1;
    const ny = -(((py - rect.top) / rect.height) * 2 - 1);
    const f = uFwd.value;
    const d = f
      .clone()
      .addScaledVector(uRight.value, nx * uLens.value.x)
      .addScaledVector(uUp.value, ny * uLens.value.y)
      .normalize();
    // the point on the plane through the middle of the box, facing the camera
    const t = -uCam.value.dot(f) / d.dot(f);
    return uCam.value.clone().addScaledVector(d, t);
  };
  const toCells = (p) => p.clone().multiplyScalar(0.5).addScalar(0.5).multiplyScalar(R);

  const onDown = (e) => {
    drag = { x: e.clientX, y: e.clientY, turn: e.shiftKey || e.button === 2, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
    lastStir = null;
  };
  const onMove = (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.turn) {
      yaw -= dx * 0.006;
      pitch = Math.max(-0.6, Math.min(1.2, pitch + dy * 0.004));
    }
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const onUp = (e) => {
    if (drag && !drag.turn && drag.moved < 6) pending = ray(e.clientX, e.clientY);
    drag = null;
    lastStir = null;
  };
  const onWheel = (e) => {
    e.preventDefault();
    distTo = Math.max(3, Math.min(10, distTo * Math.exp(e.deltaY * 0.001)));
  };
  const onKey = (e) => {
    if (e.key === "ArrowLeft") yaw += 0.08;
    else if (e.key === "ArrowRight") yaw -= 0.08;
    else if (e.key === "ArrowUp") pitch = Math.min(1.2, pitch + 0.05);
    else if (e.key === "ArrowDown") pitch = Math.max(-0.6, pitch - 0.05);
    else if (e.key === "+" || e.key === "=") distTo = Math.max(3, distTo * 0.9);
    else if (e.key === "-" || e.key === "_") distTo = Math.min(10, distTo / 0.9);
    else if (e.key === " " || e.key === "Enter") pending = new THREE.Vector3(0, 0.2, 0);
    else return;
    e.preventDefault();
  };
  const onContext = (e) => e.preventDefault();
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("keydown", onKey);
  canvas.addEventListener("contextmenu", onContext);

  /* ---------- sound: air or water moving, louder when stirred ---------- */
  const audio = { ctx: null, out: null, band: null, on: false };
  function setSound(on) {
    if (on && !audio.ctx) {
      const C = new AudioContext();
      const b = C.createBuffer(1, C.sampleRate * 3, C.sampleRate);
      const data = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = last * 0.97 + (Math.random() * 2 - 1) * 0.03;
        data[i] = last * 6;
      }
      const src = C.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const band = C.createBiquadFilter();
      band.type = "lowpass";
      band.frequency.value = 400;
      const out = C.createGain();
      out.gain.value = 0;
      src.connect(band).connect(out).connect(C.destination);
      src.start();
      Object.assign(audio, { ctx: C, out, band });
    }
    if (!audio.ctx) return;
    audio.on = on;
    audio.ctx.resume();
    if (!on) audio.out.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.3);
  }

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  function sourceColour() {
    if (P.mode === "Ink in water") return P.colour === "Plain" ? INKS[0] : pick(INKS);
    return P.colour === "Plain" ? [0.85, 0.85, 0.85] : pick(SMOKES);
  }
  let steadyColour = sourceColour();

  /* ---------- frame ---------- */
  let disposed = false;
  let shown = "";
  let last = performance.now();
  renderer.compute(clearVolumes);
  function frame(now) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    clock += dt;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w < 2 || h < 2) return;
    // the volume is soft, so one pixel per CSS pixel is enough
    if (canvas.width !== Math.floor(w) || canvas.height !== Math.floor(h)) {
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
    }

    if (P.turn) yaw += dt * 0.06;
    dist += (distTo - dist) * (1 - Math.exp(-dt * 4));
    const cam = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    ).multiplyScalar(dist);
    const fwd = cam.clone().negate().normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd);
    uCam.value.copy(cam);
    uFwd.value.copy(fwd);
    uRight.value.copy(right);
    uUp.value.copy(up);
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    uLens.value.set(tan * camera.aspect, tan);
    uFrame.value = (uFrame.value + 1) % 1000;

    const ink = P.mode === "Ink in water";
    // stirring: the pointer's movement, carried into the box on the middle plane
    let stirSpeed = 0;
    if (drag && !drag.turn && pointer) {
      const p = toCells(ray(pointer.x, pointer.y));
      if (lastStir) {
        const v = p.clone().sub(lastStir).multiplyScalar(0.5);
        if (v.length() > 3) v.setLength(3);
        uStirVel.value.copy(v);
        stirSpeed = v.length();
      } else uStirVel.value.set(0, 0, 0);
      uStir.value.set(p.x, p.y, p.z, 7);
      lastStir = p;
    } else {
      uStirVel.value.set(0, 0, 0);
      uStir.value.w = 0;
    }

    // the steady source: smoke from a vent at the bottom, turning slowly; ink is let fall in drops
    if (!ink) {
      const a = clock * 0.7;
      uSrcA.value.set(64 + Math.sin(a) * 6, 9, 64 + Math.cos(a) * 6, 6);
      // a little unsteadiness, as a real vent has, so the plume breaks up
      const j = () => (Math.random() - 0.5) * 0.5;
      uSrcAVel.value.set(
        Math.cos(a) * 0.25 + j(),
        0.9 + j(),
        -Math.sin(a) * 0.25 + j(),
        P.flow ? 0.9 : 0,
      );
      if (P.colour !== "Plain" && Math.random() < dt * 0.4) steadyColour = sourceColour();
      uSrcAColour.value.set(...steadyColour);
    } else uSrcAVel.value.w = 0;

    uSrcBVel.value.w = 0;
    if (ink && P.flow && clock > nextDrop) {
      nextDrop = clock + 2.2 + Math.random() * 2.5;
      pending = new THREE.Vector3((Math.random() - 0.5) * 0.9, 0.82, (Math.random() - 0.5) * 0.9);
    }
    if (pending) {
      // a drop or a puff pours for a moment, not a single frame
      dropAt = toCells(pending);
      dropLeft = ink ? 30 : 14;
      uSrcBColour.value.set(...sourceColour());
      pending = null;
    } else if (burst > 0 && dropLeft === 0) {
      dropAt = new THREE.Vector3(64, 14, 64);
      dropLeft = burst;
      burst = 0;
      uSrcBColour.value.set(...sourceColour());
    }
    if (dropLeft > 0) {
      uSrcB.value.set(dropAt.x, dropAt.y, dropAt.z, ink ? 2.6 : 7);
      uSrcBVel.value.set(0, ink ? -2.2 : 1.6, 0, ink ? 0.9 : 1.4);
      dropLeft--;
    }

    renderer.compute(curlPass);
    renderer.compute(advectVel);
    renderer.compute(divergence);
    for (let j = 0; j < JACOBI / 2; j++) {
      renderer.compute(jacobiAB);
      renderer.compute(jacobiBA);
    }
    renderer.compute(project);
    renderer.compute(advectDye);
    renderer.compute(correctDye);
    renderer.compute(copyDye);

    if (audio.on) {
      const level = 0.02 + Math.min(stirSpeed, 3) * 0.05 + (burst > 0 ? 0.05 : 0);
      audio.out.gain.setTargetAtTime(level, audio.ctx.currentTime, 0.15);
      audio.band.frequency.setTargetAtTime(300 + stirSpeed * 500, audio.ctx.currentTime, 0.15);
    }

    const text = `${R} × ${R} × ${R} cells, 2.1 million\npressure solved ${JACOBI} times a frame`;
    if (text !== shown) {
      shown = text;
      options.onReadout(text);
    }
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);

  function setMode(mode) {
    P.mode = mode;
    uInk.value = mode === "Ink in water" ? 1 : 0;
    renderer.compute(clearVolumes);
    steadyColour = sourceColour();
    nextDrop = clock + 0.3;
  }

  return {
    controls: [
      {
        type: "select",
        key: "mode",
        label: "In the box",
        options: ["Smoke", "Ink in water"],
        value: "Smoke",
      },
      {
        type: "select",
        key: "colour",
        label: "Colour",
        options: ["Plain", "Many"],
        value: "Plain",
      },
      { type: "range", key: "swirl", label: "Swirl", min: 0, max: 1, step: 0.01, value: 0.45 },
      { type: "range", key: "lift", label: "Rise or fall", min: 0, max: 1, step: 0.01, value: 0.5 },
      { type: "range", key: "linger", label: "Linger", min: 0, max: 1, step: 0.01, value: 0.6 },
      { type: "toggle", key: "flow", label: "Keep it coming", value: true },
      { type: "toggle", key: "turn", label: "Turn slowly", value: !reduced },
      { type: "action", key: "more", label: "A puff or a drop" },
      { type: "action", key: "clear", label: "Clear the box" },
    ],
    set(key, value) {
      if (key === "mode") setMode(value);
      else if (key === "colour") {
        P.colour = value;
        steadyColour = sourceColour();
      } else if (key === "swirl") uSwirl.value = value;
      else if (key === "lift") uLift.value = value;
      else if (key === "linger") uLinger.value = value;
      else if (key === "more") {
        if (P.mode === "Ink in water")
          pending = new THREE.Vector3(
            (Math.random() - 0.5) * 0.6,
            0.8,
            (Math.random() - 0.5) * 0.6,
          );
        else burst = 12;
      } else if (key === "clear") renderer.compute(clearVolumes);
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
      canvas.removeEventListener("contextmenu", onContext);
      if (audio.ctx) audio.ctx.close();
      for (const t of [velA, velB, dyeA, dyeB]) t.dispose();
      renderer.dispose();
    },
  };
}
