// Brahmand: a photograph released into a nebula and star field made of its own pixels.
// WebGPU only. Every particle carries a position and a velocity that a compute pass
// advances each frame, so the gas has inertia: it leaps, settles, parts around the pointer
// and springs home again when the photograph is called back.

import { bloom } from "three/addons/tsl/display/BloomNode.js";
import {
  cameraPosition,
  cos,
  cross,
  dot,
  exp,
  Fn,
  float,
  hash,
  instancedArray,
  instanceIndex,
  mix,
  mx_fractal_noise_float,
  mx_fractal_noise_vec3,
  mx_noise_float,
  normalize,
  PI,
  pass,
  positionLocal,
  screenUV,
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

const GAS = 1_000_000;
const STARS = 450_000;
const FAR = 40_000;
const FOV = 40;

const srgbToLinear = (v) => (v / 255) ** 2.2;

/** A painted stand-in until a real photograph is chosen. Labelled as a sample on the page. */
function paintSample() {
  const w = 1400;
  const h = 875;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d");
  let s = 7;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  let g = c.createLinearGradient(0, 0, 0, h * 0.66);
  g.addColorStop(0, "#070b24");
  g.addColorStop(0.42, "#2a1a55");
  g.addColorStop(0.72, "#b5406c");
  g.addColorStop(1, "#ffb463");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 420; i++) {
    const y = rnd() * h * 0.42;
    c.fillStyle = `rgba(255,255,255,${(0.15 + rnd() * 0.85) * (1 - y / (h * 0.45))})`;
    c.beginPath();
    c.arc(rnd() * w, y, rnd() < 0.06 ? 1.8 : 0.9, 0, 7);
    c.fill();
  }
  const sx = w * 0.6;
  const sy = h * 0.6;
  g = c.createRadialGradient(sx, sy, 0, sx, sy, w * 0.36);
  g.addColorStop(0, "rgba(255,246,214,1)");
  g.addColorStop(0.1, "rgba(255,214,128,.85)");
  g.addColorStop(0.4, "rgba(255,128,96,.25)");
  g.addColorStop(1, "rgba(255,120,90,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#fffbe8";
  c.beginPath();
  c.arc(sx, sy, w * 0.04, 0, 7);
  c.fill();
  for (let i = 0; i < 16; i++) {
    const x = rnd() * w;
    const y = h * (0.2 + rnd() * 0.36);
    const rx = 90 + rnd() * 260;
    const ry = 8 + rnd() * 22;
    g = c.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, y > h * 0.4 ? "rgba(255,170,120,.5)" : "rgba(190,120,220,.32)");
    g.addColorStop(1, "rgba(255,150,120,0)");
    c.save();
    c.translate(x, y);
    c.scale(1, ry / rx);
    c.translate(-x, -y);
    c.fillStyle = g;
    c.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    c.restore();
  }
  ["#7a4a86", "#4b3a78", "#27305e", "#121c3c", "#070c1c"].forEach((col, k) => {
    const base = h * (0.6 + k * 0.045);
    const amp = 46 + k * 26;
    const f = 2 + k * 1.3;
    const ph = rnd() * 9;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const u = x / w;
      const wave =
        0.55 * Math.sin(u * f * 3.1 + ph) +
        0.3 * Math.sin(u * f * 7.7 + ph * 2) +
        0.15 * Math.sin(u * f * 19 + ph * 3);
      c.lineTo(x, base - amp * wave * (0.6 + 0.4 * Math.sin(u * 2.2 + k)));
    }
    c.lineTo(w, h);
    c.fill();
  });
  g = c.createLinearGradient(0, h * 0.8, 0, h);
  g.addColorStop(0, "#1a2550");
  g.addColorStop(1, "#04060f");
  c.fillStyle = g;
  c.fillRect(0, h * 0.8, w, h * 0.2);
  for (let i = 0; i < 70; i++) {
    const y = h * 0.8 + rnd() * h * 0.2;
    const k = (y - h * 0.8) / (h * 0.2);
    const ww = 20 + rnd() * 120 * (1 - k * 0.5);
    const green = Math.floor(170 + rnd() * 60);
    const blue = Math.floor(110 + rnd() * 40);
    c.fillStyle = `rgba(255,${green},${blue},${0.5 * (1 - k) * rnd()})`;
    c.fillRect(sx - ww / 2 + (rnd() - 0.5) * 60 * k, y, ww, 2);
  }
  return cv;
}

export async function createBrahmand(canvas, options) {
  if (!("gpu" in navigator)) throw new Error("webgpu-unavailable");
  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });
  await renderer.init();
  if (!renderer.backend.isWebGPUBackend) {
    renderer.dispose();
    throw new Error("webgpu-unavailable");
  }
  const reduced = options.reducedMotion;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.02, 400);
  const tanHalf = Math.tan((FOV * Math.PI) / 360);

  /* ---------- uniforms ---------- */
  const uM = uniform(0); // 0 photograph, 1 universe (eased)
  const uWind = uniform(0); // how far the galaxy has wound
  const uTime = uniform(0);
  const uDt = uniform(1 / 60);
  const uHalf = uniform(new THREE.Vector2(1, 0.625));
  const uCell = uniform(0.002);
  const uRayO = uniform(new THREE.Vector3());
  const uRayD = uniform(new THREE.Vector3(0, 0, -1));
  const uPush = uniform(0);
  const uPxWorld = uniform(0.001); // world size of one pixel at distance 1
  const uExpose = uniform(1);
  const uPhotoA = uniform(1);
  const uBloom = uniform(0);
  const uTintA = uniform(new THREE.Vector3(0.9, 0.5, 0.3));
  const uTintB = uniform(new THREE.Vector3(0.2, 0.4, 0.6));

  /* ---------- particle state ---------- */
  const mk = (n) => {
    const home = new Float32Array(n * 4); // u, v, luminance, random
    const col = new Float32Array(n * 4); // linear rgb, random
    return {
      n,
      home,
      col,
      homeBuf: instancedArray(home, "vec4"),
      colBuf: instancedArray(col, "vec4"),
      posBuf: instancedArray(n, "vec4"), // xyz, how far this particle has let go (0..1)
      velBuf: instancedArray(n, "vec4"), // xyz, fine-structure noise at its home
    };
  };
  const gas = mk(GAS);
  const stars = mk(STARS);

  // Where a particle is trying to be, and the forces on the way there.
  const simulate = (set, isStar) =>
    Fn(() => {
      const home = set.homeBuf.element(instanceIndex);
      const col = set.colBuf.element(instanceIndex);
      const pos = set.posBuf.element(instanceIndex);
      const vel = set.velBuf.element(instanceIndex);
      const uvv = home.xy;
      const lum = home.z;
      const r1 = home.w;
      const r2 = col.w;
      const r3 = hash(instanceIndex.add(7919));

      // the brightest pixels leave first
      const delay = float(0.08).add(lum.sqrt().oneMinus().mul(0.26)).add(r1.mul(0.22));
      const m = smoothstep(delay, delay.add(0.44), uM);

      const P = vec3(uvv.sub(0.5).mul(2).mul(uHalf), 0);
      const t = uTime.mul(0.012);
      const n = mx_fractal_noise_vec3(vec3(uvv.mul(2.6), t), 3, 2.0, 0.5, 1.0);
      const fine = mx_noise_float(vec3(uvv.mul(11.0), t.mul(2).add(2)))
        .mul(0.5)
        .add(0.5)
        .clamp(0, 1);

      const q = isStar
        ? P.xy.mul(1.6).add(vec2(r1, r2).sub(0.5).mul(0.7))
        : P.xy.mul(1.6).add(n.yz.mul(0.5));
      const z = isStar
        ? r3.sub(0.5).mul(r2.mul(r2).mul(5).add(1)).add(n.x.mul(0.45))
        : n.x
            .mul(1.1)
            .add(lum.sub(0.4).mul(0.7))
            .add(fine.sub(0.5).mul(0.5))
            .add(r3.sub(0.5).mul(0.22));

      // the whole thing turns like a galaxy, faster near the middle, so the picture winds into arms
      const ang = uWind.div(q.length().add(0.45)).add(z.mul(0.18).mul(uWind.min(1)));
      const ca = cos(ang);
      const sa = sin(ang);
      const U = vec3(q.x.mul(ca).sub(q.y.mul(sa)), q.x.mul(sa).add(q.y.mul(ca)), z);
      const leap = sin(m.mul(PI)).mul(0.55).mul(r3.sub(0.35));
      const target = mix(P, U, m).add(vec3(0, 0, leap));

      // a stiff spring while it is a photograph, a loose one once it is gas
      const stiffness = mix(float(90), float(isStar ? 5 : 7), m);
      const damping = mix(float(18), float(isStar ? 2.2 : 2.8), m);
      const acc = target.sub(pos.xyz).mul(stiffness).sub(vel.xyz.mul(damping)).toVar();

      // the pointer is a line through space: matter is pushed off it and curls round it
      const w = pos.xyz.sub(uRayO);
      const perp = w.sub(uRayD.mul(dot(w, uRayD)));
      const d2 = dot(perp, perp);
      const fall = exp(d2.negate().div(0.035)).mul(uPush).mul(m);
      const away = perp.div(d2.sqrt().add(0.0001));
      acc.addAssign(away.mul(fall.mul(30)));
      acc.addAssign(cross(uRayD, away).mul(fall.mul(16)));

      const nv = vel.xyz.add(acc.mul(uDt));
      const np = pos.xyz.add(nv.mul(uDt));
      vel.assign(vec4(nv, fine));
      pos.assign(vec4(np, m));
    })().compute(set.n);

  const gasSim = simulate(gas, false);
  const starSim = simulate(stars, true);

  /* ---------- how the two kinds of matter are drawn ---------- */
  const additive = {
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  };
  const born = smoothstep(0.015, 0.11, uM);

  {
    const p = gas.posBuf.toAttribute();
    const v = gas.velBuf.toAttribute();
    const c = gas.colBuf.toAttribute();
    const m = p.w;
    const fine = v.w;
    const rnd = c.w;
    const material = new THREE.SpriteNodeMaterial(additive);
    material.positionNode = p.xyz;
    const dist = cameraPosition.sub(p.xyz).length();
    const size = mix(uCell.mul(2.4), rnd.mul(0.05).add(fine.mul(0.05)).add(0.022), m);
    // matter you fly through thins out instead of popping
    const near = smoothstep(0.05, 0.55, dist);
    const grey = dot(c.xyz, vec3(0.3333));
    const vivid = mix(vec3(grey), c.xyz, 1.3).max(0);
    // clumpy, so there are filaments and gaps
    const clump = fine.mul(fine).mul(fine).mul(3.4).add(0.12);
    const gain = mix(float(0.4), uExpose.mul(0.03).mul(clump), m);
    const d = uv().sub(0.5);
    const shape = exp(dot(d, d).mul(-14)).sub(0.03).max(0);
    material.scaleNode = size;
    // worked out once per particle, then carried across its sprite
    const light = varying(vivid.mul(gain).mul(born).mul(near));
    material.colorNode = vec4(light.mul(shape), 1);
    const mesh = new THREE.Sprite(material);
    mesh.count = GAS;
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  {
    const p = stars.posBuf.toAttribute();
    const c = stars.colBuf.toAttribute();
    const h = stars.homeBuf.toAttribute();
    const m = p.w;
    const mag = c.w.pow(12); // a few bright stars, a great many faint ones
    const giant = c.w.greaterThan(0.9985).and(h.z.greaterThan(0.25));
    const material = new THREE.SpriteNodeMaterial(additive);
    material.positionNode = p.xyz;
    const dist = cameraPosition.sub(p.xyz).length();
    const wanted = mix(uCell.mul(1.5), giant.select(float(0.3), mag.mul(0.02).add(0.004)), m);
    // a star smaller than a pixel dims instead of flickering
    const size = wanted.max(dist.mul(uPxWorld).mul(1.7));
    const dim = wanted.div(size).pow(2);
    const twinkle = sin(uTime.mul(h.w.mul(5).add(1.5)).add(c.w.mul(40)))
      .mul(0.22)
      .add(0.78);
    const lit = giant.select(float(7), mag.mul(3.5).add(0.1)).mul(twinkle);
    const gain = mix(h.z.mul(0.5), lit, m);
    const d = uv().sub(0.5);
    const r2 = dot(d, d);
    const point = exp(r2.mul(-70))
      .add(exp(r2.mul(-12)).mul(0.05))
      .sub(0.0025)
      .max(0);
    const ax = d.abs();
    const spikes = exp(ax.y.mul(-150))
      .mul(exp(ax.x.mul(-9)))
      .add(exp(ax.x.mul(-150)).mul(exp(ax.y.mul(-9))));
    const core = exp(r2.mul(-900))
      .mul(1.4)
      .add(float(0.012).div(r2.add(0.0006)));
    const flare = core
      .mul(0.06)
      .add(spikes.mul(0.5))
      .mul(smoothstep(0.25, 0.1, r2));
    const isGiant = varying(giant.select(float(1), float(0)));
    const shape = isGiant.greaterThan(0.5).select(flare, point);
    const seen = smoothstep(0.02, 0.3, dist);
    const light = varying(c.xyz.mul(gain).mul(dim).mul(born).mul(seen));
    material.scaleNode = size;
    material.colorNode = vec4(light.mul(shape), 1);
    const mesh = new THREE.Sprite(material);
    mesh.count = STARS;
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  /* ---------- behind it all: distant stars, and a haze in the picture's own two colours ---------- */
  {
    const material = new THREE.SpriteNodeMaterial(additive);
    const i = instanceIndex;
    const dir = normalize(vec3(hash(i.add(11)), hash(i.add(23)), hash(i.add(37))).sub(0.5));
    const mag = hash(i.add(51)).pow(9);
    const warm = hash(i.add(67));
    material.positionNode = dir.mul(120);
    material.scaleNode = uPxWorld.mul(120).mul(mag.mul(3.6).add(1.6));
    const d = uv().sub(0.5);
    const tint = mix(vec3(0.72, 0.84, 1), vec3(1, 0.82, 0.62), warm);
    const twinkle = sin(uTime.mul(hash(i.add(5)).mul(4).add(1)).add(warm.mul(30)))
      .mul(0.2)
      .add(0.8);
    const glow = exp(dot(d, d).mul(-26));
    const light = varying(tint.mul(mag.mul(5).add(0.22)).mul(twinkle).mul(uM.mul(uM)));
    material.colorNode = vec4(light.mul(glow), 1);
    const mesh = new THREE.Sprite(material);
    mesh.count = FAR;
    mesh.frustumCulled = false;
    scene.add(mesh);

    const haze = new THREE.MeshBasicNodeMaterial({ ...additive, side: THREE.BackSide });
    const dirn = normalize(positionLocal);
    const a = mx_fractal_noise_float(dirn.mul(1.6).add(4), 4, 2.0, 0.5, 1.0).mul(0.5).add(0.5);
    const drift = vec3(9, uTime.mul(0.004), 2);
    const b = mx_fractal_noise_float(dirn.mul(2.9).add(drift), 3, 2.0, 0.5, 1.0).mul(0.5).add(0.5);
    const cloud = a.mul(1.25).sub(0.4).max(0).pow(2.2);
    const hue = mix(uTintB, uTintA, smoothstep(0.35, 0.7, b));
    haze.colorNode = vec4(hue.mul(cloud).mul(0.5).mul(uM.mul(uM)), 1);
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), haze));
  }

  /* ---------- the photograph itself, exactly as it is, until it is let go ---------- */
  const photoCanvas = document.createElement("canvas");
  const photoTexture = new THREE.CanvasTexture(photoCanvas);
  photoTexture.colorSpace = THREE.SRGBColorSpace;
  photoTexture.generateMipmaps = false;
  photoTexture.minFilter = THREE.LinearFilter;
  const photoMaterial = new THREE.MeshBasicNodeMaterial(additive);
  {
    // undo the film curve applied at the very end, so the picture shows unchanged
    const lin = texture(photoTexture).rgb.min(0.985);
    photoMaterial.colorNode = vec4(lin.oneMinus().log().negate().mul(uPhotoA), 1);
  }
  const photoMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), photoMaterial);
  photoMesh.renderOrder = -1;
  scene.add(photoMesh);

  /* ---------- light spill and the film curve ---------- */
  const Pipeline = THREE.RenderPipeline ?? THREE.PostProcessing;
  const pipeline = new Pipeline(renderer);
  {
    const scenePass = pass(scene, camera);
    const colour = scenePass.getTextureNode("output");
    const glow = bloom(colour, 1, 0.7, 0);
    const q = screenUV.sub(0.5);
    const vignette = float(1).sub(dot(q, q).mul(0.9).mul(uM));
    const hdr = colour.rgb.add(glow.rgb.mul(uBloom)).mul(vignette);
    pipeline.outputNode = vec4(float(1).sub(exp(hdr.negate())), 1);
  }

  /* ---------- reading a photograph into the particles ---------- */
  function readPhoto(source, sw, sh) {
    const k = Math.min(1, 1400 / Math.max(sw, sh));
    const w = Math.max(2, Math.round(sw * k));
    const h = Math.max(2, Math.round(sh * k));
    photoCanvas.width = w;
    photoCanvas.height = h;
    const cx = photoCanvas.getContext("2d", { willReadFrequently: true });
    cx.drawImage(source, 0, 0, w, h);
    photoTexture.needsUpdate = true;
    const data = cx.getImageData(0, 0, w, h).data;
    const aspect = w / h;
    const half = aspect >= 1 ? [1, 1 / aspect] : [aspect, 1];
    uHalf.value.set(half[0], half[1]);
    photoMesh.scale.set(half[0], half[1], 1);

    const sample = (u, v, out, o) => {
      const x = Math.min(w - 1, Math.floor(u * w));
      const y = Math.min(h - 1, Math.floor((1 - v) * h));
      const i = (y * w + x) * 4;
      const r = srgbToLinear(data[i]);
      const g = srgbToLinear(data[i + 1]);
      const b = srgbToLinear(data[i + 2]);
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    // gas: an even, jittered grid over the picture
    const gx = Math.round(Math.sqrt(GAS * aspect));
    const gy = Math.ceil(GAS / gx);
    uCell.value = (2 * half[0]) / gx;
    let total = 0;
    for (let i = 0; i < GAS; i++) {
      const u = ((i % gx) + Math.random()) / gx;
      const v = Math.min(0.9999, (Math.floor(i / gx) + Math.random()) / gy);
      const lum = sample(u, v, gas.col, i * 4);
      total += lum;
      gas.col[i * 4 + 3] = Math.random();
      gas.home[i * 4] = u;
      gas.home[i * 4 + 1] = v;
      gas.home[i * 4 + 2] = lum;
      gas.home[i * 4 + 3] = Math.random();
    }
    const mean = total / GAS;
    // a bright picture and a dark one end up equally lit
    const expose = Math.max(0.55, Math.min(2.4, 0.16 / Math.max(mean, 0.03)));
    uExpose.value = expose * (200000 / GAS) ** 0.4;

    // stars: thrown off mostly by the bright parts of the picture
    const rgb = [0, 0, 0];
    let made = 0;
    for (let tries = 0; made < STARS && tries < STARS * 60; tries++) {
      const u = Math.random();
      const v = Math.random();
      const lum = sample(u, v, rgb, 0);
      const anything = tries > STARS * 50;
      if (!anything && Math.random() > (0.035 + 0.5 * lum * lum) * Math.min(1, expose)) continue;
      const o = made * 4;
      const safe = Math.max(lum, 0.02);
      stars.col[o] = 0.45 + (0.55 * rgb[0]) / safe;
      stars.col[o + 1] = 0.45 + (0.55 * rgb[1]) / safe;
      stars.col[o + 2] = 0.45 + (0.55 * rgb[2]) / safe;
      stars.col[o + 3] = Math.random();
      stars.home[o] = u;
      stars.home[o + 1] = v;
      stars.home[o + 2] = lum;
      stars.home[o + 3] = Math.random();
      made++;
    }
    for (const set of [gas, stars]) {
      set.homeBuf.value.needsUpdate = true;
      set.colBuf.value.needsUpdate = true;
    }

    // the two colours the far haze is made of: the picture's most vivid light, and its overall light
    const A = [0, 0, 0];
    const B = [0, 0, 0];
    let aw = 0;
    let bw = 0;
    for (let i = 0; i < 4000; i++) {
      const o = Math.floor(Math.random() * GAS) * 4;
      const r = gas.col[o];
      const g = gas.col[o + 1];
      const b = gas.col[o + 2];
      const mx = Math.max(r, g, b);
      const sat = mx > 0 ? (mx - Math.min(r, g, b)) / mx : 0;
      const wa = sat * sat * mx + 1e-4;
      const wb = mx * (1 - sat * 0.5) + 1e-4;
      A[0] += r * wa;
      A[1] += g * wa;
      A[2] += b * wa;
      aw += wa;
      B[0] += r * wb;
      B[1] += g * wb;
      B[2] += b * wb;
      bw += wb;
    }
    const norm = (vv, ww) => {
      const c = vv.map((x) => x / ww);
      const top = Math.max(...c, 0.05);
      return c.map((x) => x / top);
    };
    uTintA.value.fromArray(norm(A, aw));
    uTintB.value.fromArray(norm(B, bw));
  }
  {
    const cv = paintSample();
    readPhoto(cv, cv.width, cv.height);
  }

  /* ---------- state ---------- */
  let M = 0;
  let want = 0;
  let wind = 0;
  let auto = true;
  let phaseAt = performance.now() + 2600;
  let yaw = 0;
  let pitch = 0;
  let vyaw = 0;
  let vpitch = 0;
  let zoom = 1;
  let zoomTo = 1;
  let down = null;
  let lastTouch = -1e9;
  let push = 0;
  let disposed = false;
  let releaseTimer = 0;
  const pointer = new THREE.Vector2(0, 0);

  function toggle() {
    want = want ? 0 : 1;
    if (!want) zoomTo = 1;
    options.onState(want ? "universe" : "photograph");
    chord();
  }

  const onDown = (e) => {
    down = { lx: e.clientX, ly: e.clientY, t: e.timeStamp, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
    lastTouch = performance.now();
  };
  const onMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((e.clientY - rect.top) / rect.height) * 2,
    );
    lastTouch = performance.now();
    if (!down) {
      push = 1;
      return;
    }
    const dx = e.clientX - down.lx;
    const dy = e.clientY - down.ly;
    down.lx = e.clientX;
    down.ly = e.clientY;
    down.moved += Math.abs(dx) + Math.abs(dy);
    if (down.moved > 6) {
      auto = false;
      vyaw = -dx * 0.005;
      vpitch = dy * 0.004;
      yaw += vyaw;
      pitch += vpitch;
    }
  };
  const onUp = (e) => {
    if (!down) return;
    if (down.moved < 7 && e.timeStamp - down.t < 450) {
      auto = false;
      toggle();
    }
    down = null;
  };
  const onCancel = () => {
    down = null;
  };
  const onWheel = (e) => {
    e.preventDefault();
    auto = false;
    lastTouch = performance.now();
    zoomTo = Math.max(0.06, Math.min(2.6, zoomTo * Math.exp(e.deltaY * 0.0012)));
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  /* ---------- sound: a held chord, and a rising or falling figure on each release and return ---------- */
  const audio = { ctx: null, out: null, on: false };
  function setSound(on) {
    if (on && !audio.ctx) {
      const C = new AudioContext();
      const out = C.createGain();
      out.gain.value = 0;
      const lp = C.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700;
      lp.Q.value = 0.5;
      const lfo = C.createOscillator();
      const depth = C.createGain();
      lfo.frequency.value = 0.05;
      depth.gain.value = 260;
      lfo.connect(depth).connect(lp.frequency);
      lfo.start();
      [55, 82.4, 110.3, 164.6, 220.4].forEach((f, i) => {
        const o = C.createOscillator();
        const g = C.createGain();
        o.type = i < 2 ? "triangle" : "sine";
        o.frequency.value = f;
        g.gain.value = [0.5, 0.35, 0.25, 0.16, 0.1][i];
        o.connect(g).connect(lp);
        o.start();
      });
      lp.connect(out).connect(C.destination);
      audio.ctx = C;
      audio.out = out;
    }
    audio.on = on;
    if (!audio.ctx) return;
    audio.ctx.resume();
    audio.out.gain.setTargetAtTime(on ? 0.09 : 0, audio.ctx.currentTime, 0.6);
  }
  function chord() {
    if (!audio.on || !audio.ctx) return;
    const C = audio.ctx;
    const notes = want ? [220, 329.6, 493.9, 659.3] : [659.3, 493.9, 329.6, 220];
    notes.forEach((f, i) => {
      const o = C.createOscillator();
      const g = C.createGain();
      const t = C.currentTime + i * 0.16;
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0004, t + 3.5);
      o.connect(g).connect(C.destination);
      o.start(t);
      o.stop(t + 3.6);
    });
  }

  /* ---------- frame ---------- */
  let last = performance.now();
  const dirTmp = new THREE.Vector3();
  function frame(now) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    const t = now / 1000;

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

    // until someone touches it, it shows itself: photograph, universe, photograph
    if (auto && now > phaseAt) {
      toggle();
      phaseAt = now + (want ? 30000 : 6500);
    }

    const rate = reduced ? 1 / 11 : 1 / 6.5;
    M += Math.sign(want - M) * Math.min(Math.abs(want - M), dt * rate);
    const e = M * M * (3 - 2 * M);
    wind = want ? Math.min(1.7, wind + dt * (reduced ? 0.012 : 0.03)) : wind * Math.exp(-dt * 1.2);
    push *= Math.exp(-dt * 2.2);

    if (!down) {
      yaw += vyaw;
      pitch += vpitch;
      vyaw *= Math.exp(-dt * 3.2);
      vpitch *= Math.exp(-dt * 3.2);
    }
    if (!want) {
      yaw *= Math.exp(-dt * 1.6);
      pitch *= Math.exp(-dt * 1.6);
    }
    pitch = Math.max(-1.35, Math.min(1.35, pitch));
    zoom += (zoomTo - zoom) * (1 - Math.exp(-dt * 3));
    const idle = now - lastTouch > 3500 && !reduced ? 1 : 0;
    const ay = (yaw + (0.42 * Math.sin(t * 0.045) + 0.12 * Math.sin(t * 0.11)) * idle) * e;
    const ap = (pitch + 0.16 * Math.sin(t * 0.037 + 1) * idle) * e;
    const half = uHalf.value;
    const d0 = Math.max(half.y / (tanHalf * 0.74), half.x / (tanHalf * camera.aspect * 0.9));
    const dist = d0 * (1 + 0.12 * e) * (1 + (zoom - 1) * e);
    camera.position.set(
      Math.sin(ay) * Math.cos(ap) * dist,
      Math.sin(ap) * dist,
      Math.cos(ay) * Math.cos(ap) * dist,
    );
    camera.lookAt(0, -half.y * 0.08, 0);
    camera.updateMatrixWorld();

    dirTmp.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
    uRayO.value.copy(camera.position);
    uRayD.value.copy(dirTmp);
    uPush.value = down ? 0 : push;

    uM.value = e;
    uWind.value = wind * e;
    uTime.value = t % 3600;
    uDt.value = dt;
    uPxWorld.value = (2 * tanHalf) / Math.max(1, canvas.height);
    const fade = 1 - Math.min(1, Math.max(0, (e - 0.07) / 0.22));
    uPhotoA.value = fade * fade * (3 - 2 * fade);
    photoMesh.visible = fade > 0;
    uBloom.value = 0.07 * Math.min(1, e * 3);

    renderer.compute(gasSim);
    renderer.compute(starSim);
    pipeline.render();
  }
  renderer.setAnimationLoop(frame);

  return {
    points: GAS + STARS,
    toggle() {
      auto = false;
      toggle();
    },
    setSound,
    async setPhoto(file) {
      if (!file.type.startsWith("image/")) return false;
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        readPhoto(bitmap, bitmap.width, bitmap.height);
        bitmap.close();
      } catch {
        return false;
      }
      auto = false;
      M = 0;
      want = 0;
      wind = 0;
      yaw = 0;
      pitch = 0;
      vyaw = 0;
      vpitch = 0;
      zoom = 1;
      zoomTo = 1;
      options.onState("photograph");
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => {
        if (!want && !disposed) toggle();
      }, 1700);
      return true;
    },
    dispose() {
      disposed = true;
      window.clearTimeout(releaseTimer);
      renderer.setAnimationLoop(null);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("wheel", onWheel);
      if (audio.ctx) audio.ctx.close();
      photoTexture.dispose();
      renderer.dispose();
    },
  };
}
