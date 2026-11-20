// Udaan: a day of flights over the Earth.
// Every route in the OpenFlights database (as of June 2014) flies once a day for each airline
// that flew it, along its great circle, arcing higher the longer it is. Day and night follow
// the sun for today's date. WebGPU only.

import { bloom } from "three/addons/tsl/display/BloomNode.js";
import {
  acos,
  cameraPosition,
  clamp,
  dot,
  exp,
  float,
  hash,
  instancedArray,
  instanceIndex,
  max,
  mix,
  normalize,
  pass,
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
} from "three/tsl";
import * as THREE from "three/webgpu";

const TRAIL = 10;
const ARCS = 20;
const VIEWS = {
  "The whole world": [20, 25],
  India: [79, 21],
  Europe: [10, 48],
  "North America": [-95, 40],
  "East Asia": [120, 32],
  "The Gulf": [52, 26],
};
const VIEW_NAMES = Object.keys(VIEWS);

/** The same latitude/longitude to position rule as three's SphereGeometry and its UVs. */
function onGlobe(latDeg, lonDeg, out = new THREE.Vector3()) {
  const lat = (latDeg * Math.PI) / 180;
  const phi = ((lonDeg + 180) * Math.PI) / 180;
  return out.set(-Math.cos(phi) * Math.cos(lat), Math.sin(lat), Math.sin(phi) * Math.cos(lat));
}

async function bitmap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`could not load ${url}`);
  return createImageBitmap(await res.blob(), {
    colorSpaceConversion: "none",
    premultiplyAlpha: "none",
  });
}

export async function createUdaan(canvas, options) {
  if (!("gpu" in navigator)) throw new Error("webgpu-unavailable");
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
  if (!renderer.backend.isWebGPUBackend) {
    renderer.dispose();
    throw new Error("webgpu-unavailable");
  }
  const reduced = options.reducedMotion;
  const base = options.assets;

  options.onReadout("Loading the Earth\nand 2014's flights");
  const [buffer, dayImage, nightImage] = await Promise.all([
    fetch(`${base}/flights.bin`).then((res) => {
      if (!res.ok) throw new Error("could not load the flights");
      return res.arrayBuffer();
    }),
    bitmap(`${base}/earth.jpg`),
    bitmap(`${base}/night.jpg`),
  ]);
  const raw = new Float32Array(buffer);
  const count = raw.length / 6;

  const makeTexture = (image) => {
    const tex = new THREE.Texture(image);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  };
  const dayTex = makeTexture(dayImage);
  const nightTex = makeTexture(nightImage);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 200);

  const uSun = uniform(new THREE.Vector3(1, 0, 0));
  const uDayNight = uniform(1);
  const uHour = uniform(6);
  const uTrail = uniform(0.6);
  const uRoutes = uniform(0.15);
  const uBright = uniform(1);
  const uPx = uniform(0.002);

  /* ---------- the Earth ---------- */
  const earth = new THREE.MeshBasicNodeMaterial();
  {
    const st = vec2(uv().x, uv().y.oneMinus());
    const up = normalize(positionWorld);
    const sunUp = dot(up, uSun);
    const lit = mix(float(0.22), smoothstep(-0.08, 0.25, sunUp), uDayNight);
    const day = texture(dayTex, st).rgb.mul(lit.mul(1.05).add(0.015));
    const dark = mix(float(1), smoothstep(0.1, -0.12, sunUp), uDayNight);
    const lights = pow(texture(nightTex, st).rgb, vec3(1.3))
      .mul(vec3(1.25, 0.95, 0.65))
      .mul(dark)
      .mul(1.6);
    const view = normalize(cameraPosition.sub(positionWorld));
    const rim = pow(float(1).sub(max(dot(up, view), 0)), 3);
    const air = vec3(0.3, 0.55, 1)
      .mul(rim)
      .mul(mix(float(0.25), smoothstep(-0.2, 0.3, sunUp), uDayNight))
      .mul(0.7);
    earth.colorNode = vec4(day.add(lights).add(air), 1);
  }
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 256, 128), earth));

  const halo = new THREE.MeshBasicNodeMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  {
    const out = normalize(positionWorld);
    const away = normalize(positionWorld.sub(cameraPosition));
    const edge = smoothstep(0, 0.6, dot(away, out));
    const lit = mix(float(0.3), smoothstep(-0.3, 0.3, dot(out, uSun)), uDayNight);
    halo.colorNode = vec4(vec3(0.25, 0.5, 1).mul(edge.mul(edge)).mul(lit).mul(0.9), 1);
  }
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.035, 96, 48), halo);
  scene.add(shell);

  /* ---------- the routes, faint ---------- */
  {
    const seen = new Set();
    const points = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const p = new THREE.Vector3();
    const q = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const o = i * 6;
      const key = `${raw[o]},${raw[o + 1]},${raw[o + 2]},${raw[o + 3]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      onGlobe(raw[o], raw[o + 1], a);
      onGlobe(raw[o + 2], raw[o + 3], b);
      const omega = Math.acos(Math.min(1, Math.max(-1, a.dot(b))));
      const lift = 0.003 + (0.04 * omega) / Math.PI;
      const s = Math.sin(omega) || 1;
      for (let k = 0; k < ARCS; k++) {
        const along = (u) => {
          const w1 = Math.sin((1 - u) * omega) / s;
          const w2 = Math.sin(u * omega) / s;
          return new THREE.Vector3()
            .addScaledVector(a, w1)
            .addScaledVector(b, w2)
            .normalize()
            .multiplyScalar(1 + lift * Math.sin(Math.PI * u));
        };
        p.copy(along(k / ARCS));
        q.copy(along((k + 1) / ARCS));
        points.push(p.x, p.y, p.z, q.x, q.y, q.z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(points), 3));
    const mat = new THREE.LineBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    mat.colorNode = vec4(vec3(0.16, 0.36, 0.7).mul(uRoutes).mul(0.16), 1);
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    scene.add(lines);
  }

  /* ---------- the flights ---------- */
  const from = instancedArray(count, "vec4"); // origin on the globe, departure hour (UTC)
  const to = instancedArray(count, "vec4"); // destination, hours in the air
  {
    const f = from.value.array;
    const t = to.value.array;
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const o = i * 6;
      onGlobe(raw[o], raw[o + 1], v);
      f.set([v.x, v.y, v.z, raw[o + 4]], i * 4);
      onGlobe(raw[o + 2], raw[o + 3], v);
      t.set([v.x, v.y, v.z, raw[o + 5]], i * 4);
    }
    from.value.needsUpdate = true;
    to.value.needsUpdate = true;
  }
  const planes = new THREE.SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  {
    const which = instanceIndex.div(TRAIL);
    const k = float(instanceIndex.mod(TRAIL));
    const A = from.element(which);
    const B = to.element(which);
    const behind = k.mul(uTrail).div(TRAIL);
    // hours since take-off, folded into one day
    const since = uHour.sub(A.w).sub(behind).div(24).fract().mul(24);
    const u = since.div(B.w);
    const flying = u
      .lessThan(1)
      .and(uHour.sub(A.w).div(24).fract().mul(24).lessThan(B.w.add(uTrail)));
    const omega = acos(clamp(dot(A.xyz, B.xyz), -1, 1)).max(1e-4);
    const s = sin(omega);
    const path = A.xyz
      .mul(sin(float(1).sub(u).mul(omega)))
      .add(B.xyz.mul(sin(u.mul(omega))))
      .div(s);
    const lift = float(0.003).add(omega.mul(0.04 / Math.PI));
    planes.positionNode = normalize(path).mul(float(1).add(lift.mul(sin(u.mul(Math.PI)))));
    const head = k.lessThan(0.5);
    const fade = float(1).sub(k.div(TRAIL));
    const size = head.select(uPx.mul(3.6), uPx.mul(2.6).mul(fade));
    planes.scaleNode = flying.select(size, float(0));
    // short hops warm, long hauls cool
    const hue = mix(vec3(1, 0.62, 0.28), vec3(0.45, 0.75, 1), smoothstep(0.08, 0.6, omega));
    const shade = head.select(vec3(1, 0.95, 0.85).mul(2.6), hue.mul(fade.mul(fade)).mul(1.4));
    const tint = varying(shade.mul(uBright).mul(hash(which).mul(0.4).add(0.8)));
    const d = uv().sub(0.5);
    planes.colorNode = vec4(tint.mul(exp(dot(d, d).mul(-22))), 1);
  }
  const traffic = new THREE.Sprite(planes);
  traffic.count = count * TRAIL;
  traffic.frustumCulled = false;
  scene.add(traffic);

  /* stars */
  {
    const material = new THREE.SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const i = instanceIndex;
    const dir = normalize(vec3(hash(i.add(1)), hash(i.add(2)), hash(i.add(3))).sub(0.5));
    material.positionNode = dir.mul(90);
    material.scaleNode = pow(hash(i.add(4)), 8)
      .mul(0.3)
      .add(0.12);
    const d = uv().sub(0.5);
    material.colorNode = vec4(
      vec3(
        varying(
          pow(hash(i.add(5)), 6)
            .mul(1.4)
            .add(0.08),
        ),
      ).mul(exp(dot(d, d).mul(-26))),
      1,
    );
    const stars = new THREE.Sprite(material);
    stars.count = 6000;
    stars.frustumCulled = false;
    scene.add(stars);
  }

  const Pipeline = THREE.RenderPipeline ?? THREE.PostProcessing;
  const pipeline = new Pipeline(renderer);
  const uGlow = uniform(0.35);
  {
    const scenePass = pass(scene, camera);
    const colour = scenePass.getTextureNode("output");
    pipeline.outputNode = colour.add(bloom(colour, 1, 0.4, 0.55).mul(uGlow));
  }

  /* ---------- state ---------- */
  const today = new Date();
  const P = {
    hour: today.getUTCHours() + today.getUTCMinutes() / 60,
    speed: 15,
    play: true,
    view: VIEW_NAMES[1],
  };
  let [lon, lat] = VIEWS[P.view];
  let lonTo = lon;
  let latTo = lat;
  let dist = 3.4;
  let distTo = 3.4;
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
    latTo = Math.max(-80, Math.min(80, latTo + (e.clientY - drag.y) * k));
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const onUp = () => {
    drag = null;
  };
  const onWheel = (e) => {
    e.preventDefault();
    distTo = Math.max(1.25, Math.min(6, distTo * Math.exp(e.deltaY * 0.001)));
  };
  const onKey = (e) => {
    const k = 4 * (dist - 1);
    if (e.key === "ArrowLeft") lonTo -= k;
    else if (e.key === "ArrowRight") lonTo += k;
    else if (e.key === "ArrowUp") latTo = Math.min(80, latTo + k);
    else if (e.key === "ArrowDown") latTo = Math.max(-80, latTo - k);
    else if (e.key === "+" || e.key === "=") distTo = Math.max(1.25, distTo * 0.9);
    else if (e.key === "-" || e.key === "_") distTo = Math.min(6, distTo / 0.9);
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

  // the sun's declination for today's date
  const dayOfYear = Math.floor(
    (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
      Date.UTC(today.getUTCFullYear(), 0, 0)) /
      864e5,
  );
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));

  /* ---------- sound: a distant airliner, louder the busier the sky ---------- */
  const audio = { ctx: null, out: null };
  function setSound(on) {
    if (on && !audio.ctx) {
      const C = new AudioContext();
      const buffer = C.createBuffer(1, C.sampleRate * 4, C.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 3.5;
      }
      const src = C.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const low = C.createBiquadFilter();
      low.type = "lowpass";
      low.frequency.value = 380;
      const out = C.createGain();
      out.gain.value = 0;
      src.connect(low).connect(out).connect(C.destination);
      src.start();
      Object.assign(audio, { ctx: C, out });
    }
    if (!audio.ctx) return;
    audio.ctx.resume();
    audio.out.gain.setTargetAtTime(on ? 0.35 : 0, audio.ctx.currentTime, 0.8);
  }

  /* ---------- frame ---------- */
  let disposed = false;
  let shown = "";
  let counted = -1;
  let inAir = 0;
  let last = performance.now();
  const eye = new THREE.Vector3();
  function countAirborne(hour) {
    let n = 0;
    for (let i = 0; i < count; i++) {
      const since = (((hour - raw[i * 6 + 4]) % 24) + 24) % 24;
      if (since < raw[i * 6 + 5]) n++;
    }
    return n;
  }
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
    if (P.play) P.hour = (P.hour + (dt * P.speed * (reduced ? 0.5 : 1)) / 60) % 24;
    if (P.play && now - pushed > 500) {
      pushed = now;
      options.onValues?.({ hour: Math.round(P.hour * 20) / 20 });
    }
    uHour.value = P.hour;
    onGlobe(declination, (12 - P.hour) * 15, uSun.value);

    const ease = 1 - Math.exp(-dt * 4);
    lon += (lonTo - lon) * ease;
    lat += (latTo - lat) * ease;
    dist += (distTo - dist) * ease;
    const fit = Math.max(1, 0.9 / camera.aspect);
    onGlobe(lat, lon, eye).multiplyScalar(dist * fit);
    camera.position.copy(eye);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    uPx.value = (2 * Math.tan((camera.fov * Math.PI) / 360) * (dist * fit - 1)) / (h * dpr);

    const minute = Math.floor(P.hour * 60);
    if (minute !== counted) {
      counted = minute;
      inAir = countAirborne(P.hour);
    }
    const hhmm = (x) => {
      const m = Math.floor((((x % 24) + 24) % 24) * 60);
      return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    };
    const text = `${hhmm(P.hour)} UTC · ${hhmm(P.hour + 5.5)} in Delhi\n${inAir.toLocaleString("en-GB")} flights in the air\n${count.toLocaleString("en-GB")} a day, on 2014's routes`;
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
        key: "hour",
        label: "Time, UTC",
        min: 0,
        max: 24,
        step: 0.05,
        value: Math.round(P.hour * 20) / 20,
      },
      {
        type: "range",
        key: "speed",
        label: "Minutes a second",
        min: 0,
        max: 120,
        step: 1,
        value: 15,
      },
      { type: "toggle", key: "play", label: "Time runs", value: true },
      { type: "select", key: "view", label: "Look at", options: VIEW_NAMES, value: P.view },
      {
        type: "range",
        key: "trail",
        label: "Trail, hours",
        min: 0,
        max: 2,
        step: 0.05,
        value: 0.6,
      },
      { type: "range", key: "routes", label: "Routes", min: 0, max: 1, step: 0.01, value: 0.15 },
      { type: "toggle", key: "daynight", label: "Day and night", value: true },
      { type: "range", key: "bright", label: "Brightness", min: 0.2, max: 3, step: 0.05, value: 1 },
      { type: "range", key: "glow", label: "Glow", min: 0, max: 1, step: 0.01, value: 0.35 },
    ],
    set(key, value) {
      if (key === "view") {
        const target = VIEWS[value];
        if (!target) return;
        // turn the short way round
        lonTo = target[0] + Math.round((lon - target[0]) / 360) * 360;
        latTo = target[1];
        distTo = value === VIEW_NAMES[0] ? 3.6 : 2.1;
        P.view = value;
      } else if (key === "hour") {
        P.hour = value;
        counted = -1;
      } else if (key === "trail") uTrail.value = value;
      else if (key === "routes") uRoutes.value = value;
      else if (key === "daynight") uDayNight.value = value ? 1 : 0;
      else if (key === "bright") uBright.value = value;
      else if (key === "glow") uGlow.value = value;
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
      dayTex.dispose();
      nightTex.dispose();
      renderer.dispose();
    },
  };
}
