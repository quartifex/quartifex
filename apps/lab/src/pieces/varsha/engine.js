// Varsha: a year of the monsoon over South Asia.
// The winds and the rain are the real monthly averages for 1991–2020: near-surface wind from
// the NCEP/NCAR Reanalysis and rainfall from GPCP, both on a 2.5° grid, blended smoothly from
// month to month. Streaks follow the wind; cloud gathers where the rain falls and is carried by
// it; the land greens and browns with the season. WebGPU only.

import { bloom } from "three/addons/tsl/display/BloomNode.js";
import {
  abs,
  cameraPosition,
  clamp,
  cos,
  cross,
  dot,
  exp,
  Fn,
  float,
  floor,
  hash,
  instancedArray,
  instanceIndex,
  max,
  mix,
  mx_fractal_noise_float,
  normalize,
  pass,
  positionLocal,
  positionWorld,
  pow,
  sin,
  smoothstep,
  texture,
  uniform,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
  vertexIndex,
} from "three/tsl";
import * as THREE from "three/webgpu";

const STREAKS = 80_000;
const WIND_ROWS = 73;
const RAIN_ROWS = 72;
const COLS = 144;
const DEG = Math.PI / 180;
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
// the streaks live in this box, round South Asia and the Indian Ocean
const BOX = { south: -30, north: 45, west: 30, east: 135 };

function season(t) {
  const m = Math.floor((((t - 0.0) % 12) + 12) % 12);
  if (m <= 1) return "Winter: dry winds from the north-east";
  if (m <= 4) return "The hot season: heat builds over the land";
  if (m === 5) return "The monsoon arrives";
  if (m <= 7) return "The south-west monsoon";
  if (m === 8) return "The monsoon begins to withdraw";
  return "The north-east monsoon: rain on the south-east coast";
}

/** The same latitude/longitude to position rule as three's SphereGeometry and its UVs. */
const globeAt = (lat, lon) => {
  const phi = lon.add(180).mul(DEG);
  const la = lat.mul(DEG);
  return vec3(cos(phi).negate().mul(cos(la)), sin(la), sin(phi).mul(cos(la)));
};

async function bitmap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`could not load ${url}`);
  return createImageBitmap(await res.blob(), {
    colorSpaceConversion: "none",
    premultiplyAlpha: "none",
  });
}

export async function createVarsha(canvas, options) {
  if (!("gpu" in navigator)) throw new Error("webgpu-unavailable");
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
  if (!renderer.backend.isWebGPUBackend) {
    renderer.dispose();
    throw new Error("webgpu-unavailable");
  }
  const reduced = options.reducedMotion;
  const base = options.assets;
  options.onReadout("Loading thirty years\nof wind and rain");
  const [buffer, earthImage] = await Promise.all([
    fetch(`${base}/climate.bin`).then((res) => {
      if (!res.ok) throw new Error("could not load the climate data");
      return res.arrayBuffer();
    }),
    bitmap(`${base}/earth.jpg`),
  ]);
  const all = new Float32Array(buffer);
  const W = 12 * WIND_ROWS * COLS;
  const uData = all.subarray(0, W);
  const vData = all.subarray(W, 2 * W);
  const rData = all.subarray(2 * W);

  /* ---------- the data as textures: twelve months stacked top to bottom ---------- */
  const windHalf = new Uint16Array(W * 2);
  for (let i = 0; i < W; i++) {
    windHalf[i * 2] = THREE.DataUtils.toHalfFloat(uData[i]);
    windHalf[i * 2 + 1] = THREE.DataUtils.toHalfFloat(vData[i]);
  }
  const windTex = new THREE.DataTexture(
    windHalf,
    COLS,
    12 * WIND_ROWS,
    THREE.RGFormat,
    THREE.HalfFloatType,
  );
  const rainHalf = new Uint16Array(rData.length);
  for (let i = 0; i < rData.length; i++) rainHalf[i] = THREE.DataUtils.toHalfFloat(rData[i]);
  const rainTex = new THREE.DataTexture(
    rainHalf,
    COLS,
    12 * RAIN_ROWS,
    THREE.RedFormat,
    THREE.HalfFloatType,
  );
  for (const t of [windTex, rainTex]) {
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.wrapS = THREE.RepeatWrapping;
    t.needsUpdate = true;
  }
  const earthTex = new THREE.Texture(earthImage);
  earthTex.flipY = false;
  earthTex.colorSpace = THREE.SRGBColorSpace;
  earthTex.wrapS = THREE.RepeatWrapping;
  earthTex.anisotropy = 8;
  earthTex.needsUpdate = true;

  const uMonth = uniform(6.5); // 0.5 is mid-January
  const uStrength = uniform(1);
  const uTime = uniform(0);
  const uRainMap = uniform(0);
  const uGreen = uniform(1);
  const uCloud = uniform(1);
  const uWinds = uniform(1);
  const uFlow = uniform(10800); // seconds of weather a second
  const uDt = uniform(0);
  const uSeed = uniform(0, "uint");

  // blended between the two nearest months; each month's mean stands for its middle
  const months = () => {
    const t = uMonth.sub(0.5);
    const m0 = floor(t).mod(12).add(12).mod(12);
    return [m0, m0.add(1).mod(12), t.fract()];
  };
  const windAt = (lat, lon) => {
    const [m0, m1, f] = months();
    const u = lon.div(2.5).add(0.5).div(COLS);
    const row = clamp(float(90).sub(lat).div(2.5), 0.5, WIND_ROWS - 1.5);
    const at = (m) =>
      texture(
        windTex,
        vec2(
          u,
          m
            .mul(WIND_ROWS)
            .add(row)
            .add(0.5)
            .div(12 * WIND_ROWS),
        ),
      ).level(0).rg;
    return mix(at(m0), at(m1), f);
  };
  // the strength dial scales the rain round South Asia; an illustration, not a real year
  const near = (lat, lon) =>
    smoothstep(55, 35, abs(lon.sub(82)).max(0))
      .mul(smoothstep(-20, 0, lat))
      .mul(smoothstep(45, 32, lat));
  const rainAt = (lat, lon) => {
    const [m0, m1, f] = months();
    const u = lon.sub(1.25).div(2.5).add(0.5).div(COLS);
    const row = clamp(float(88.75).sub(lat).div(2.5), 0.5, RAIN_ROWS - 1.5);
    const at = (m) =>
      texture(
        rainTex,
        vec2(
          u,
          m
            .mul(RAIN_ROWS)
            .add(row)
            .add(0.5)
            .div(12 * RAIN_ROWS),
        ),
      ).level(0).r;
    return max(mix(at(m0), at(m1), f), 0).mul(mix(float(1), uStrength, near(lat, lon)));
  };
  const latLonOf = (p) => {
    const n = normalize(p);
    const lat = n.y.asin().div(DEG);
    // the inverse of globeAt: phi from x = -cos(phi), z = sin(phi)
    const lon = n.z.atan(n.x.negate()).div(DEG).sub(180);
    return [lat, lon.add(360).mod(360)];
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 200);
  const uSun = uniform(new THREE.Vector3());

  /* ---------- the Earth, greening and browning with the rain ---------- */
  const earth = new THREE.MeshBasicNodeMaterial();
  {
    const st = vec2(uv().x, uv().y.oneMinus());
    const [lat, lon] = latLonOf(positionLocal);
    const picture = texture(earthTex, st).rgb;
    const sea = smoothstep(0.02, 0.08, picture.b.sub(picture.r)).mul(
      smoothstep(0.35, 0.2, picture.g),
    );
    const rain = rainAt(lat, lon);
    // the picture is August's: where the season is dry, the green fades to dust
    const dryness = smoothstep(4, 0.4, rain)
      .mul(sea.oneMinus())
      .mul(uGreen)
      .mul(smoothstep(-12, 6, lat));
    const grey = dot(picture, vec3(0.3, 0.55, 0.15));
    const dust = vec3(grey.mul(1.12), grey.mul(0.98), grey.mul(0.74));
    const ground = mix(picture, dust, dryness.mul(0.75));
    // rainfall map: light blue at 2 mm a day, deep blue at 8, violet past 15
    const ramp = mix(
      mix(vec3(0.55, 0.85, 1), vec3(0.1, 0.35, 1), smoothstep(2, 8, rain)),
      vec3(0.55, 0.2, 0.95),
      smoothstep(8, 16, rain),
    );
    const shown = mix(ground, ramp, smoothstep(1.5, 5, rain).mul(0.5).mul(uRainMap));
    const up = normalize(positionWorld);
    const lit = max(dot(up, uSun), 0).mul(0.85).add(0.2);
    const view = normalize(cameraPosition.sub(positionWorld));
    const rim = pow(float(1).sub(max(dot(up, view), 0)), 3);
    earth.colorNode = vec4(shown.mul(lit).add(vec3(0.3, 0.55, 1).mul(rim).mul(0.45)), 1);
  }
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 384, 192), earth));

  /* ---------- cloud: where it rains, carried along the wind ---------- */
  const cloudMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  {
    const [lat, lon] = latLonOf(positionLocal);
    const p = normalize(positionLocal);
    const wind = windAt(lat, lon);
    const east = normalize(cross(vec3(0, 1, 0), p));
    const north = cross(p, east);
    const drift = east.mul(wind.x).add(north.mul(wind.y));
    // two layers of texture, each pushed along the local wind and renewed in turn, so the
    // texture moves with the wind without being smeared out
    const PERIOD = 6;
    const cycle = uTime.div(PERIOD);
    const layer = (phase) =>
      mx_fractal_noise_float(
        p
          .mul(26)
          .sub(drift.mul(phase.fract().mul(PERIOD).mul(0.032)))
          .add(phase.floor().mul(7.7)),
        5,
        2.1,
        0.55,
        1,
      );
    const w = float(1).sub(abs(cycle.fract().mul(2).sub(1)));
    const n = layer(cycle)
      .mul(w)
      .add(layer(cycle.add(0.5)).mul(w.oneMinus()))
      .mul(0.5)
      .add(0.5);
    const rain = rainAt(lat, lon);
    const wetness = smoothstep(2, 14, rain);
    const cover = smoothstep(
      float(0.7).sub(wetness.mul(0.32)),
      float(0.88).sub(wetness.mul(0.3)),
      n,
    ).mul(smoothstep(1.5, 6, rain));
    const up = normalize(positionWorld);
    const lit = max(dot(up, uSun), 0).mul(0.8).add(0.25);
    // heavy rain clouds are darker underneath
    const tone = mix(float(1), float(0.72), smoothstep(6, 16, rain));
    cloudMat.colorNode = vec4(vec3(lit.mul(tone)), 1);
    cloudMat.opacityNode = cover.mul(0.92).mul(uCloud);
  }
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 256, 128), cloudMat);
  scene.add(clouds);

  /* ---------- the wind, as streaks ---------- */
  const streak = instancedArray(STREAKS, "vec4"); // lat, lon, age, lifetime (seconds)
  {
    const a = streak.value.array;
    for (let i = 0; i < STREAKS; i++) {
      a.set(
        [
          BOX.south + Math.random() * (BOX.north - BOX.south),
          BOX.west + Math.random() * (BOX.east - BOX.west),
          Math.random() * 4,
          2 + Math.random() * 3,
        ],
        i * 4,
      );
    }
    streak.value.needsUpdate = true;
  }
  const advance = Fn(() => {
    const s = streak.element(instanceIndex);
    const lat = s.x.toVar();
    const lon = s.y.toVar();
    const age = s.z.add(uDt).toVar();
    const life = s.w.toVar();
    const wind = windAt(lat, lon);
    const t = uDt.mul(uFlow);
    lon.addAssign(wind.x.mul(t).div(max(cos(lat.mul(DEG)), 0.2).mul(111320)));
    lat.addAssign(wind.y.mul(t).div(110540));
    const out = lat
      .lessThan(BOX.south)
      .or(lat.greaterThan(BOX.north))
      .or(lon.lessThan(BOX.west))
      .or(lon.greaterThan(BOX.east))
      .or(age.greaterThan(life));
    const r1 = hash(instanceIndex.add(uSeed));
    const r2 = hash(instanceIndex.add(uSeed).add(7919));
    const r3 = hash(instanceIndex.add(uSeed).add(104729));
    s.assign(
      out.select(
        vec4(
          float(BOX.south).add(r1.mul(BOX.north - BOX.south)),
          float(BOX.west).add(r2.mul(BOX.east - BOX.west)),
          0,
          r3.mul(3).add(2),
        ),
        vec4(lat, lon, age, life),
      ),
    );
  })().compute(STREAKS);

  const lineMat = new THREE.LineBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  {
    const which = vertexIndex.div(2);
    const tail = float(vertexIndex.mod(2));
    const s = streak.element(which);
    const wind = windAt(s.x, s.y);
    // the tail lies a few hours of wind behind the head
    const back = tail.mul(uFlow).mul(0.5);
    const lat = s.x.sub(wind.y.mul(back).div(110540));
    const lon = s.y.sub(wind.x.mul(back).div(max(cos(s.x.mul(DEG)), 0.2).mul(111320)));
    lineMat.positionNode = globeAt(lat, lon).mul(1.02);
    const speed = wind.length();
    const fade = smoothstep(0, 0.6, s.z).mul(smoothstep(s.w, s.w.sub(0.8), s.z));
    const colour = mix(vec3(0.25, 0.55, 1), vec3(1, 0.96, 0.85), smoothstep(3, 12, speed));
    lineMat.colorNode = vec4(
      varying(colour.mul(fade).mul(tail.oneMinus().mul(0.7).add(0.3)).mul(uWinds).mul(0.24)),
      1,
    );
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(STREAKS * 2 * 3), 3));
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;
  scene.add(lines);

  /* stars */
  {
    const material = new THREE.SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const i = instanceIndex;
    material.positionNode = normalize(
      vec3(hash(i.add(1)), hash(i.add(2)), hash(i.add(3))).sub(0.5),
    ).mul(90);
    material.scaleNode = pow(hash(i.add(4)), 8)
      .mul(0.3)
      .add(0.12);
    const d = uv().sub(0.5);
    material.colorNode = vec4(
      vec3(
        varying(
          pow(hash(i.add(5)), 6)
            .mul(1.2)
            .add(0.06),
        ),
      ).mul(exp(dot(d, d).mul(-26))),
      1,
    );
    const stars = new THREE.Sprite(material);
    stars.count = 5000;
    stars.frustumCulled = false;
    scene.add(stars);
  }

  const Pipeline = THREE.RenderPipeline ?? THREE.PostProcessing;
  const pipeline = new Pipeline(renderer);
  {
    const scenePass = pass(scene, camera);
    const colour = scenePass.getTextureNode("output");
    pipeline.outputNode = colour.add(bloom(colour, 1, 0.35, 0.7).mul(0.25));
  }

  /* ---------- state ---------- */
  const today = new Date();
  const P = { month: today.getUTCMonth() + today.getUTCDate() / 31, play: true, days: 3 };
  let lon = 80;
  let lat = 17;
  let lonTo = lon;
  let latTo = lat;
  let dist = 2.05;
  let distTo = 2.05;
  let drag = null;
  let pushed = 0;
  const onDown = (e) => {
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag) return;
    const k = 0.09 * (dist - 1);
    lonTo -= (e.clientX - drag.x) * k;
    latTo = Math.max(-60, Math.min(60, latTo + (e.clientY - drag.y) * k));
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const onUp = () => {
    drag = null;
  };
  const onWheel = (e) => {
    e.preventDefault();
    distTo = Math.max(1.3, Math.min(5, distTo * Math.exp(e.deltaY * 0.001)));
  };
  const onKey = (e) => {
    const k = 4 * (dist - 1);
    if (e.key === "ArrowLeft") lonTo -= k;
    else if (e.key === "ArrowRight") lonTo += k;
    else if (e.key === "ArrowUp") latTo = Math.min(60, latTo + k);
    else if (e.key === "ArrowDown") latTo = Math.max(-60, latTo - k);
    else if (e.key === "+" || e.key === "=") distTo = Math.max(1.3, distTo * 0.9);
    else if (e.key === "-" || e.key === "_") distTo = Math.min(5, distTo / 0.9);
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

  // rain over India: the land cells of a rough outline, for the readout and the sound
  const indiaCells = [];
  {
    const boxes = [
      [8, 22, 74, 80.5],
      [15, 24, 73, 87],
      [21, 30, 70, 89],
      [24, 28, 89, 96],
    ];
    for (let r = 0; r < RAIN_ROWS; r++) {
      const la = 88.75 - r * 2.5;
      for (let c = 0; c < COLS; c++) {
        const lo = 1.25 + c * 2.5;
        if (boxes.some(([s, n, w, e]) => la >= s && la <= n && lo >= w && lo <= e))
          indiaCells.push(r * COLS + c);
      }
    }
  }
  function indiaRain(t) {
    const x = t - 0.5;
    const m0 = ((Math.floor(x) % 12) + 12) % 12;
    const m1 = (m0 + 1) % 12;
    const f = x - Math.floor(x);
    let sum = 0;
    for (const cell of indiaCells) {
      sum +=
        rData[m0 * RAIN_ROWS * COLS + cell] * (1 - f) + rData[m1 * RAIN_ROWS * COLS + cell] * f;
    }
    return (sum / indiaCells.length) * P.strengthNow;
  }
  P.strengthNow = 1;

  /* ---------- sound: rain, as heavy as India's ---------- */
  const audio = { ctx: null, out: null };
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
      band.type = "highpass";
      band.frequency.value = 900;
      const low = C.createBiquadFilter();
      low.type = "lowpass";
      low.frequency.value = 6000;
      const out = C.createGain();
      out.gain.value = 0;
      src.connect(band).connect(low).connect(out).connect(C.destination);
      src.start();
      Object.assign(audio, { ctx: C, out, on: false });
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
  let clock = 0;
  let seed = 0;
  const eye = new THREE.Vector3();
  const sun = new THREE.Vector3();
  const place = (la, lo, out) => {
    const phi = (lo + 180) * DEG;
    return out.set(
      -Math.cos(phi) * Math.cos(la * DEG),
      Math.sin(la * DEG),
      Math.sin(phi) * Math.cos(la * DEG),
    );
  };
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
    if (P.play) P.month = (P.month + (dt * pace * P.days) / 30.4) % 12;
    if (P.play && now - pushed > 400) {
      pushed = now;
      options.onValues?.({ month: Math.round(P.month * 20) / 20 });
    }
    uMonth.value = P.month;
    P.strengthNow += (uStrength.value - P.strengthNow) * (1 - Math.exp(-dt * 3));

    uDt.value = dt * pace;
    uSeed.value = seed = (seed + 7919) % 1000003;
    renderer.compute(advance);

    const ease = 1 - Math.exp(-dt * 4);
    lon += (lonTo - lon) * ease;
    lat += (latTo - lat) * ease;
    dist += (distTo - dist) * ease;
    const fit = Math.max(1, 0.85 / camera.aspect);
    place(lat, lon, eye).multiplyScalar(dist * fit);
    camera.position.copy(eye);
    camera.lookAt(0, 0, 0);
    // a high sun over the view, a little to the south-east
    place(lat - 8, lon + 25, sun);
    uSun.value.copy(sun);

    const rain = indiaRain(P.month);
    if (audio.ctx && audio.on)
      audio.out.gain.setTargetAtTime(Math.min(0.35, rain * 0.03), audio.ctx.currentTime, 0.5);
    const name = MONTHS[Math.floor(P.month) % 12];
    const text = `${name} · ${season(P.month)}\nrain over India about ${rain.toFixed(1)} mm a day\n1991–2020 average for the time of year`;
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
        key: "month",
        label: "Time of year",
        min: 0,
        max: 12,
        step: 0.05,
        value: Math.round(P.month * 20) / 20,
      },
      { type: "toggle", key: "play", label: "The year turns", value: true },
      { type: "range", key: "days", label: "Days a second", min: 0, max: 15, step: 0.5, value: 3 },
      {
        type: "range",
        key: "strength",
        label: "A weaker or stronger monsoon",
        min: 0.5,
        max: 1.5,
        step: 0.05,
        value: 1,
      },
      { type: "toggle", key: "winds", label: "Wind", value: true },
      { type: "toggle", key: "cloud", label: "Cloud", value: true },
      { type: "toggle", key: "rainmap", label: "Rainfall map", value: false },
      { type: "toggle", key: "green", label: "Land greens with the rain", value: true },
    ],
    set(key, value) {
      if (key === "strength") uStrength.value = value;
      else if (key === "winds") uWinds.value = value ? 1 : 0;
      else if (key === "cloud") uCloud.value = value ? 1 : 0;
      else if (key === "rainmap") uRainMap.value = value ? 1 : 0;
      else if (key === "green") uGreen.value = value ? 1 : 0;
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
      windTex.dispose();
      rainTex.dispose();
      earthTex.dispose();
      renderer.dispose();
    },
  };
}
