// Nadī: rain on new land, and the rivers it cuts.
// Particle hydraulic erosion on a 512 × 512 grid, run on the GPU: each frame tens of thousands of
// raindrops land and run downhill. A drop gathers speed on a slope, picks up rock while it can
// carry more than it holds, and lets it fall where it slows, on flats and where it meets the
// sea, building fans and deltas. Where many drops follow the same line a river shows. Slopes
// steeper than the rock can stand slump. Rock comes in bands of different hardness, so valleys
// cut in steps. Time is not to scale. WebGPU only.

import { bloom } from "three/addons/tsl/display/BloomNode.js";
import {
  abs,
  atomicAdd,
  atomicLoad,
  atomicStore,
  Break,
  clamp,
  dot,
  Fn,
  float,
  floor,
  hash,
  If,
  instancedArray,
  instanceIndex,
  int,
  Loop,
  length,
  log2,
  max,
  min,
  mix,
  mx_fractal_noise_float,
  mx_noise_float,
  normalize,
  pass,
  positionLocal,
  pow,
  select,
  sin,
  smoothstep,
  sqrt,
  uint,
  uniform,
  varying,
  vec2,
  vec3,
  vec4,
  vertexIndex,
} from "three/tsl";
import * as THREE from "three/webgpu";

const S = 512;
const N = S * S;
const DROPS = 32768; // the most drops in one fall
const SCALE = 1 << 24; // ground changes are summed as fixed-point integers
const TOP = 48; // the highest land, in grid cells

export async function createNadi(canvas, options) {
  if (!("gpu" in navigator)) throw new Error("webgpu-unavailable");
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
  if (!renderer.backend.isWebGPUBackend) {
    renderer.dispose();
    throw new Error("webgpu-unavailable");
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const reduced = options.reducedMotion;

  const land = instancedArray(N, "vec4"); // ground, how much water runs here, hardness, fresh deposit
  const delta = instancedArray(N, "int").toAtomic(); // ground cut or laid this fall
  const visits = instancedArray(N, "int").toAtomic(); // water through each cell this fall
  const slid = instancedArray(N, "float"); // ground after slope collapse

  const uRain = uniform(0.35);
  const uHard = uniform(0.5);
  const uUplift = uniform(0.25);
  const uSea = uniform(3);
  const uSeed = uniform(1);
  const uTick = uniform(0, "uint");
  const uDrops = uniform(8192);
  const uRate = uniform(0.004);
  const uBrush = uniform(new THREE.Vector4(-1, -1, 14, 0)); // x, y, radius, share of the drops

  const cellXY = (i) => [int(i.mod(S)), int(i.div(S))];
  const at = (x, y) =>
    clamp(y, 0, S - 1)
      .mul(S)
      .add(clamp(x, 0, S - 1));

  /* new land: a ridged range with an island's fall-off, so the rivers run to the sea */
  const create = Fn(() => {
    const [x, y] = cellXY(instanceIndex);
    const p = vec2(float(x), float(y)).div(S);
    const q = p.sub(0.5);
    const seed = vec3(uSeed.mul(13.1), uSeed.mul(7.3), 0);
    const warp = vec2(
      mx_noise_float(vec3(p.mul(3), 0).add(seed)),
      mx_noise_float(vec3(p.mul(3), 5).add(seed)),
    ).mul(0.08);
    const ridge = float(1).sub(
      abs(mx_fractal_noise_float(vec3(p.add(warp).mul(2.1), 1).add(seed), 4, 2.1, 0.45, 1)),
    );
    const hills = mx_fractal_noise_float(vec3(p.mul(2.6), 3).add(seed), 4, 2, 0.45, 1)
      .mul(0.5)
      .add(0.5);
    const island = smoothstep(
      0.55,
      0.06,
      length(q.mul(vec2(1, 1.15))).add(mx_noise_float(vec3(p.mul(4), 9).add(seed)).mul(0.07)),
    );
    // a broad dome carries the water to the coast; the ranges stand on it
    const range = pow(ridge, 1.6).mul(0.65).add(hills.mul(0.35));
    const h = pow(island, 1.3)
      .mul(0.55)
      .add(island.mul(range).mul(0.45))
      .mul(TOP)
      .add(island.mul(3))
      .sub(1.5);
    // bands of rock: soft and hard layers, slightly tilted
    const band = sin(
      h
        .mul(0.9)
        .add(p.x.mul(6))
        .add(mx_noise_float(vec3(p.mul(8), 2).add(seed)).mul(2)),
    );
    const hardness = smoothstep(-0.2, 0.6, band).mul(0.45).add(0.4);
    land.element(instanceIndex).assign(vec4(h, 0, hardness, 0));
    atomicStore(delta.element(instanceIndex), int(0));
    atomicStore(visits.element(instanceIndex), int(0));
  })().compute(N);

  const heightAt = (x, y) => land.element(at(x, y)).x;
  // the cut is spread over a soft disc, so drops widen valleys rather than drill slots
  const BRUSH = [
    [-1, -2, 0.0191],
    [0, -2, 0.0315],
    [1, -2, 0.0191],
    [-2, -1, 0.0191],
    [-1, -1, 0.0622],
    [0, -1, 0.084],
    [1, -1, 0.0622],
    [2, -1, 0.0191],
    [-2, 0, 0.0315],
    [-1, 0, 0.084],
    [0, 0, 0.1364],
    [1, 0, 0.084],
    [2, 0, 0.0315],
    [-2, 1, 0.0191],
    [-1, 1, 0.0622],
    [0, 1, 0.084],
    [1, 1, 0.0622],
    [2, 1, 0.0191],
    [-1, 2, 0.0191],
    [0, 2, 0.0315],
    [1, 2, 0.0191],
  ];
  // each drop moves only a sliver of what it would on its own, so the land changes as the sum of
  // many thousands of paths rather than the scar of any one
  const lay = (idx, amount) => atomicAdd(delta.element(idx), int(amount.mul(uRate).mul(SCALE)));

  /* one fall of rain: every drop runs until it stops, leaves the map or reaches the sea */
  const fallRain = Fn(() => {
    const id = instanceIndex;
    const seed = id.mul(uint(8)).add(uTick.mul(uint(DROPS * 8)));
    If(float(id).lessThan(uDrops), () => {
      const pos = vec2(hash(seed), hash(seed.add(uint(1))))
        .mul(S - 6)
        .add(3)
        .toVar();
      const water = float(1).toVar();
      // some drops land where the pointer pours
      If(uBrush.w.greaterThan(0).and(hash(seed.add(uint(2))).lessThan(uBrush.w)), () => {
        const a = hash(seed.add(uint(3))).mul(6.2832);
        const r = sqrt(hash(seed.add(uint(4)))).mul(uBrush.z);
        pos.assign(clamp(uBrush.xy.add(vec2(sin(a), sin(a.add(1.5708))).mul(r)), 3, S - 4));
        water.assign(2.5);
      });
      const dir = vec2(0).toVar();
      const speed = float(1).toVar();
      const sed = float(0).toVar();
      Loop(80, () => {
        const ix = int(floor(pos.x));
        const iy = int(floor(pos.y));
        const fx = pos.x.sub(floor(pos.x));
        const fy = pos.y.sub(floor(pos.y));
        const h00 = heightAt(ix, iy);
        const h10 = heightAt(ix.add(1), iy);
        const h01 = heightAt(ix, iy.add(1));
        const h11 = heightAt(ix.add(1), iy.add(1));
        const gx = h10.sub(h00).mul(fy.oneMinus()).add(h11.sub(h01).mul(fy));
        const gy = h01.sub(h00).mul(fx.oneMinus()).add(h11.sub(h10).mul(fx));
        const h = mix(mix(h00, h10, fx), mix(h01, h11, fx), fy);
        const here = at(ix, iy);
        const soft = float(1).sub(land.element(here).z).mul(uHard.oneMinus().mul(1.6).add(0.15));
        // the sea takes the drop and whatever it carries
        If(h.lessThan(uSea), () => {
          lay(here, sed);
          Break();
        });
        atomicAdd(visits.element(here), int(water.mul(16)));
        dir.assign(dir.mul(0.08).sub(vec2(gx, gy).mul(0.92)));
        const len = length(dir);
        If(len.lessThan(1e-5), () => {
          dir.assign(vec2(hash(seed.add(uint(5))).sub(0.5), hash(seed.add(uint(6))).sub(0.5)));
        });
        dir.assign(normalize(dir));
        const next = pos.add(dir);
        If(
          next.x
            .lessThan(1)
            .or(next.y.lessThan(1))
            .or(next.x.greaterThan(S - 2))
            .or(next.y.greaterThan(S - 2)),
          () => {
            Break();
          },
        );
        const nx = int(floor(next.x));
        const ny = int(floor(next.y));
        const nfx = next.x.sub(floor(next.x));
        const nfy = next.y.sub(floor(next.y));
        const nh = mix(
          mix(heightAt(nx, ny), heightAt(nx.add(1), ny), nfx),
          mix(heightAt(nx, ny.add(1)), heightAt(nx.add(1), ny.add(1)), nfx),
          nfy,
        );
        const dh = nh.sub(h);
        const capacity = max(dh.negate().mul(speed).mul(water).mul(4), 0.01);
        If(dh.greaterThan(0).or(sed.greaterThan(capacity)), () => {
          // uphill or overloaded: lay some down, spread over the four corners
          const amount = select(dh.greaterThan(0), min(dh, sed), sed.sub(capacity).mul(0.3));
          sed.subAssign(amount);
          lay(here, amount.mul(fx.oneMinus()).mul(fy.oneMinus()));
          lay(at(ix.add(1), iy), amount.mul(fx).mul(fy.oneMinus()));
          lay(at(ix, iy.add(1)), amount.mul(fx.oneMinus()).mul(fy));
          lay(at(ix.add(1), iy.add(1)), amount.mul(fx).mul(fy));
        }).Else(() => {
          const amount = min(capacity.sub(sed).mul(soft).mul(0.3), dh.negate());
          sed.addAssign(amount);
          for (const [bx, by, w] of BRUSH) lay(at(ix.add(bx), iy.add(by)), amount.mul(-w));
        });
        speed.assign(sqrt(max(speed.mul(speed).sub(dh.mul(4)), 0.01)));
        water.mulAssign(0.985);
        pos.assign(next);
      });
    });
  })().compute(DROPS);

  /* the fall's cuts and fills land; the rivers are where the water went */
  const settle = Fn(() => {
    const L = land.element(instanceIndex);
    const change = float(atomicLoad(delta.element(instanceIndex))).div(SCALE);
    const through = float(atomicLoad(visits.element(instanceIndex)))
      .div(16)
      .div(uDrops.div(8192));
    atomicStore(delta.element(instanceIndex), int(0));
    atomicStore(visits.element(instanceIndex), int(0));
    L.x.addAssign(change);
    // slow uplift along the range keeps the land from wearing flat
    L.x.addAssign(uUplift.mul(0.004).mul(smoothstep(4, TOP * 0.6, L.x)));
    L.y.assign(mix(L.y, through, 0.06));
    L.w.assign(min(L.w.mul(0.995).add(max(change, 0).mul(6)), 1));
  })().compute(N);

  /* slopes steeper than the rock can stand collapse onto their neighbours (thermal erosion);
     written as a symmetric exchange, so no ground is made or lost */
  const NB = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ];
  const collapse = Fn(() => {
    const [x, y] = cellXY(instanceIndex);
    const L = land.element(instanceIndex);
    const h = L.x;
    const talus = mix(0.55, 1.6, L.z).mul(uHard.mul(0.6).add(0.7));
    let delta = float(0);
    for (const [dx, dy, len] of NB) {
      const n = land.element(at(x.add(dx), y.add(dy)));
      const limit = talus.mul(len);
      const gain = max(n.x.sub(h).sub(limit), 0);
      const loss = max(h.sub(n.x).sub(limit), 0);
      delta = delta.add(gain.sub(loss));
    }
    slid.element(instanceIndex).assign(h.add(delta.mul(0.1)));
  })().compute(N);
  const fall = Fn(() => {
    land.element(instanceIndex).x.assign(slid.element(instanceIndex));
  })().compute(N);

  /* ---------- drawing ---------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 6000);
  const uSun = uniform(new THREE.Vector3(-0.5, 0.65, -0.35).normalize());
  const uScale = uniform(1.6); // vertical exaggeration

  const terrainGeo = new THREE.PlaneGeometry(S, S, S - 1, S - 1).rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshBasicNodeMaterial();
  {
    const i = vertexIndex;
    const x = int(i.mod(S));
    const y = int(i.div(S));
    const L = land.element(i);
    const g = L.x;
    const below = uSea.sub(g);
    const seaHere = smoothstep(0, 0.35, below);
    // a river shows a little wider than the cells it runs in
    const flowNear = max(
      max(L.y, max(land.element(at(x.add(1), y)).y, land.element(at(x.sub(1), y)).y)),
      max(land.element(at(x, y.add(1))).y, land.element(at(x, y.sub(1))).y),
    );
    const river = smoothstep(2.3, 5.2, log2(flowNear.add(1))).mul(seaHere.oneMinus());
    const top = max(g, uSea).add(river.mul(0.12));
    terrainMat.positionNode = vec3(float(x).sub(S / 2), top.mul(uScale), float(y).sub(S / 2));
    const hx = land.element(at(x.add(1), y)).x.sub(land.element(at(x.sub(1), y)).x);
    const hy = land.element(at(x, y.add(1))).x.sub(land.element(at(x, y.sub(1))).x);
    const n = normalize(vec3(hx.negate().mul(uScale), 2, hy.negate().mul(uScale)));
    const lit = max(dot(n, uSun), 0).mul(0.95).add(0.18);
    const slope = float(1).sub(n.y);
    // valleys green, steep faces bare rock in its bands, high peaks snow, fresh fans pale gravel
    const rock = mix(vec3(0.4, 0.34, 0.29), vec3(0.6, 0.5, 0.4), L.z);
    const green = mix(vec3(0.17, 0.3, 0.12), vec3(0.34, 0.4, 0.19), smoothstep(6, 28, g));
    const lush = smoothstep(1.5, 4, log2(L.y.add(1))); // greener where water runs near
    const g0 = mix(
      mix(green, vec3(0.13, 0.27, 0.1), lush.mul(0.6)),
      rock,
      smoothstep(0.16, 0.42, slope),
    );
    const g1 = mix(
      g0,
      vec3(0.92, 0.94, 0.97),
      smoothstep(TOP * 0.86, TOP * 1.02, g).mul(smoothstep(0.55, 0.25, slope)),
    );
    const g2 = mix(g1, vec3(0.72, 0.66, 0.54), L.w.mul(0.85));
    const ground = mix(g2, vec3(0.8, 0.74, 0.58), smoothstep(uSea.add(0.8), uSea.add(0.05), g));
    const riverColour = mix(
      vec3(0.16, 0.42, 0.5),
      vec3(0.06, 0.22, 0.36),
      smoothstep(4.5, 7.5, log2(flowNear.add(1))),
    );
    const seaColour = mix(
      vec3(0.14, 0.42, 0.46),
      vec3(0.03, 0.12, 0.24),
      smoothstep(0.3, 4, below),
    );
    const wet = mix(riverColour, seaColour, seaHere);
    const shade = varying(
      mix(ground.mul(lit), wet.mul(lit.mul(0.6).add(0.4)), max(river, seaHere)),
    );
    terrainMat.colorNode = vec4(shade, 1);
  }
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.frustumCulled = false;
  scene.add(terrain);

  // the open sea beyond the map, so the land sits in an ocean rather than on a tile
  const seaGeo = new THREE.PlaneGeometry(12000, 12000).rotateX(-Math.PI / 2);
  const seaMat = new THREE.MeshBasicNodeMaterial();
  seaMat.positionNode = positionLocal.add(vec3(0, uSea.mul(uScale).sub(0.4), 0));
  seaMat.colorNode = vec4(vec3(0.03, 0.12, 0.24).mul(max(uSun.y, 0).mul(0.57).add(0.51)), 1);
  const sea = new THREE.Mesh(seaGeo, seaMat);
  scene.add(sea);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4000, 32, 16),
    new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide }),
  );
  sky.material.colorNode = vec4(0.62, 0.74, 0.86, 1);
  scene.add(sky);
  scene.background = new THREE.Color(0x9fb7cc);
  scene.fog = new THREE.Fog(0x9fb7cc, 700, 2200);

  const Pipeline = THREE.RenderPipeline ?? THREE.PostProcessing;
  const pipeline = new Pipeline(renderer);
  {
    const scenePass = pass(scene, camera);
    const colour = scenePass.getTextureNode("output");
    pipeline.outputNode = colour.add(bloom(colour, 1, 0.3, 0.9).mul(0.12));
  }

  /* ---------- state ---------- */
  const P = { speed: 3, pour: true };
  let warm = 1200; // the first rains run fast, so the land arrives already cut
  let stormUntil = 0;
  let rains = 0;
  let yaw = 0.7;
  let pitch = 0.62;
  let dist = 720;
  let distTo = 720;
  let drag = null;
  let pointer = null;
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -18 * 1.6);
  const hit = new THREE.Vector3();
  const onDown = (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: 0, button: e.button, shift: e.shiftKey };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (!(P.pour && drag.shift)) {
      yaw -= dx * 0.005;
      pitch = Math.max(0.12, Math.min(1.45, pitch + dy * 0.004));
    }
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const onUp = () => {
    drag = null;
  };
  const onWheel = (e) => {
    e.preventDefault();
    distTo = Math.max(160, Math.min(1600, distTo * Math.exp(e.deltaY * 0.001)));
  };
  const onLeave = () => {
    pointer = null;
  };
  const onKey = (e) => {
    if (e.key === "ArrowLeft") yaw += 0.08;
    else if (e.key === "ArrowRight") yaw -= 0.08;
    else if (e.key === "ArrowUp") pitch = Math.min(1.45, pitch + 0.05);
    else if (e.key === "ArrowDown") pitch = Math.max(0.12, pitch - 0.05);
    else if (e.key === "+" || e.key === "=") distTo = Math.max(160, distTo * 0.9);
    else if (e.key === "-" || e.key === "_") distTo = Math.min(1600, distTo / 0.9);
    else return;
    e.preventDefault();
  };
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("keydown", onKey);

  /* ---------- sound: running water, louder the harder it rains ---------- */
  const audio = { ctx: null, out: null, on: false };
  function setSound(on) {
    if (on && !audio.ctx) {
      const C = new AudioContext();
      const b = C.createBuffer(1, C.sampleRate * 3, C.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = C.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const band = C.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 1400;
      band.Q.value = 0.4;
      const out = C.createGain();
      out.gain.value = 0;
      src.connect(band).connect(out).connect(C.destination);
      src.start();
      Object.assign(audio, { ctx: C, out });
    }
    if (!audio.ctx) return;
    audio.on = on;
    audio.ctx.resume();
    audio.out.gain.setTargetAtTime(on ? 0.05 + 0.15 * uRain.value : 0, audio.ctx.currentTime, 0.5);
  }

  /* ---------- frame ---------- */
  let disposed = false;
  let shown = "";
  let last = performance.now();
  let tick = 0;
  renderer.compute(create);
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

    // the pointer pours water where it points (hold Shift while dragging to pour without turning)
    let strength = 0;
    if (P.pour && pointer && (!drag || drag.shift)) {
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        uBrush.value.x = hit.x + S / 2;
        uBrush.value.y = hit.z + S / 2;
        strength = drag?.shift ? 0.35 : 0.06;
      }
    }
    uBrush.value.w = strength;

    const boost = (warm > 0 ? 6 : 0) + (now < stormUntil ? 5 : 0);
    if (warm > 0) warm -= 6;
    const steps = Math.round(P.speed * (reduced ? 0.5 : 1)) + boost;
    uDrops.value = Math.round(2048 + 30720 * Math.min(uRain.value, 1));
    for (let k = 0; k < steps; k++) {
      uTick.value = ++tick;
      renderer.compute(fallRain);
      renderer.compute(settle);
      renderer.compute(collapse);
      renderer.compute(fall);
    }
    rains += steps * uDrops.value;

    dist += (distTo - dist) * (1 - Math.exp(-dt * 4));
    camera.position
      .set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
      .multiplyScalar(dist);
    camera.lookAt(0, 20, 0);

    const text = `${(Math.round(rains / 1e4) * 1e4).toLocaleString("en-GB")} raindrops so far\nrain ${uRain.value < 0.2 ? "light" : uRain.value < 0.6 ? "steady" : "heavy"}, rock ${uHard.value < 0.35 ? "soft" : uHard.value < 0.7 ? "mixed" : "hard"}\ntime is not to scale`;
    if (text !== shown) {
      shown = text;
      options.onReadout(text);
    }
    pipeline.render();
  }
  renderer.setAnimationLoop(frame);

  return {
    controls: [
      { type: "range", key: "rain", label: "Rain", min: 0, max: 1, step: 0.01, value: 0.35 },
      {
        type: "range",
        key: "hard",
        label: "Rock hardness",
        min: 0,
        max: 1,
        step: 0.01,
        value: 0.5,
      },
      { type: "range", key: "uplift", label: "Uplift", min: 0, max: 1, step: 0.01, value: 0.25 },
      { type: "range", key: "sea", label: "Sea level", min: 0, max: 14, step: 0.1, value: 3 },
      {
        type: "range",
        key: "speed",
        label: "Falls of rain a frame",
        min: 0,
        max: 8,
        step: 1,
        value: 3,
      },
      {
        type: "range",
        key: "scale",
        label: "Height, times life",
        min: 0.6,
        max: 3,
        step: 0.05,
        value: 1.6,
      },
      { type: "toggle", key: "pour", label: "The pointer pours water", value: true },
      { type: "action", key: "storm", label: "A cloudburst" },
      { type: "action", key: "new", label: "New land" },
    ],
    set(key, value) {
      if (key === "rain") uRain.value = value;
      else if (key === "hard") uHard.value = value;
      else if (key === "uplift") uUplift.value = value;
      else if (key === "sea") uSea.value = value;
      else if (key === "scale") uScale.value = value;
      else if (key === "storm") {
        stormUntil = performance.now() + 3000;
      } else if (key === "new") {
        uSeed.value = Math.random() * 100;
        rains = 0;
        warm = 1200;
        renderer.compute(create);
      } else if (key in P) P[key] = value;
      if (key === "rain" && audio.on) setSound(true);
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
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKey);
      if (audio.ctx) audio.ctx.close();
      terrainGeo.dispose();
      renderer.dispose();
    },
  };
}
