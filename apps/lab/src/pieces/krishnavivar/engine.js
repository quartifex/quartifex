// Kṛṣṇavivar: a black hole, ray-traced.
// Every pixel's ray of light is followed backwards along its bent path round a non-rotating
// (Schwarzschild) black hole. Where it crosses the accretion disk, it picks up the disk's light,
// shifted in colour and brightness by the disk's motion and by gravity; where it escapes, it
// shows the sky behind, lensed. Lengths are in Schwarzschild radii. WebGPU only.

import { bloom } from "three/addons/tsl/display/BloomNode.js";
import {
  Break,
  clamp,
  cos,
  cross,
  dot,
  exp,
  Fn,
  float,
  floor,
  If,
  Loop,
  length,
  log,
  max,
  min,
  mix,
  mx_cell_noise_float,
  mx_fractal_noise_float,
  normalize,
  pass,
  positionLocal,
  pow,
  select,
  sin,
  smoothstep,
  sqrt,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import * as THREE from "three/webgpu";

const STEPS = 300;
const R_IN = 3; // the innermost stable orbit
const SUN_RS_KM = 2.953; // Schwarzschild radius of one solar mass

export async function createKrishnavivar(canvas, options) {
  if (!("gpu" in navigator)) throw new Error("webgpu-unavailable");
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false });
  await renderer.init();
  if (!renderer.backend.isWebGPUBackend) {
    renderer.dispose();
    throw new Error("webgpu-unavailable");
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const reduced = options.reducedMotion;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uCam = uniform(new THREE.Vector3(0, 1, 16));
  const uFwd = uniform(new THREE.Vector3(0, 0, -1));
  const uRight = uniform(new THREE.Vector3(1, 0, 0));
  const uUp = uniform(new THREE.Vector3(0, 1, 0));
  const uTanX = uniform(0.6);
  const uTanY = uniform(0.4);
  const uPixel = uniform(0.001); // radians per pixel
  const uFar2 = uniform(4000);
  const uCamR = uniform(16);
  const uTime = uniform(0);
  const uHeat = uniform(1);
  const uOut = uniform(12);
  const uBeam = uniform(1);
  const uSpin = uniform(1);
  const uExposure = uniform(1);
  const uHasPhoto = uniform(0);
  const uPhotoAspect = uniform(1.5);

  const placeholder = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  placeholder.needsUpdate = true;
  const photoNode = texture(placeholder);

  /* ---------- the sky ---------- */
  const starLayer = (d, scale, seed, size) => {
    const p = d.mul(scale);
    const cell = floor(p);
    const inner = p.sub(cell);
    // one star per cell, kept away from the cell's edges so it is never cut in two
    const at = vec3(
      mx_cell_noise_float(cell.add(seed)),
      mx_cell_noise_float(cell.add(seed + 17.3)),
      mx_cell_noise_float(cell.add(seed + 41.7)),
    )
      .mul(0.56)
      .add(0.22);
    const lum = pow(mx_cell_noise_float(cell.add(seed + 71.1)), 20).mul(size);
    const warm = mx_cell_noise_float(cell.add(seed + 93.9));
    // at least a pixel and a half wide, so stars do not flicker as the light bends them
    const sigma = max(float(0.05), uPixel.mul(scale).mul(0.75));
    const dd = inner.sub(at);
    const spot = exp(dot(dd, dd).div(sigma.mul(sigma)).mul(-0.5));
    const tint = mix(vec3(0.65, 0.78, 1), vec3(1, 0.78, 0.55), warm);
    return tint.mul(lum).mul(spot);
  };
  const sky = Fn(([dIn]) => {
    const d = normalize(dIn).toVar();
    const colour = starLayer(d, 90, 3.1, 7)
      .add(starLayer(d, 240, 11.7, 1.2))
      .toVar();
    // a band of the galaxy, with dark lanes of dust
    const galaxy = normalize(vec3(0.32, 0.88, 0.35));
    const b = dot(d, galaxy);
    const band = exp(b.mul(b).div(-0.045));
    const glow = mx_fractal_noise_float(d.mul(3.2), 4, 2.1, 0.55, 1).mul(0.5).add(0.5);
    const dust = smoothstep(
      0.42,
      0.68,
      mx_fractal_noise_float(d.mul(7.5).add(4.4), 3, 2.2, 0.5, 1).mul(0.5).add(0.5),
    );
    const milky = mix(vec3(0.42, 0.36, 0.5), vec3(0.9, 0.72, 0.55), glow).mul(
      band.mul(glow).mul(0.11),
    );
    colour.addAssign(milky.mul(float(1).sub(dust.mul(0.85))));
    colour.addAssign(starLayer(d, 480, 23.3, 0.8).mul(band.mul(3)));
    // the visitor's photograph, hung far behind the hole
    If(uHasPhoto.greaterThan(0.5).and(d.z.lessThan(-0.15)), () => {
      const plane = vec2(d.x, d.y).div(d.z.negate());
      const q = vec2(plane.x.div(uPhotoAspect), plane.y).div(1.5).add(0.5);
      If(
        q.x.greaterThan(0).and(q.x.lessThan(1)).and(q.y.greaterThan(0)).and(q.y.lessThan(1)),
        () => {
          const edge = smoothstep(
            0,
            0.03,
            min(min(q.x, q.y), min(float(1).sub(q.x), float(1).sub(q.y))),
          );
          const photo = photoNode.sample(vec2(q.x, float(1).sub(q.y))).rgb;
          colour.assign(mix(colour, pow(photo, vec3(2.2)).mul(0.9), edge));
        },
      );
    });
    return colour;
  });

  /* ---------- the disk ---------- */
  const blackbody = (kelvin) => {
    const t = max(kelvin.div(100), 10);
    const r = select(
      t.lessThanEqual(66),
      float(1),
      clamp(pow(max(t.sub(60), 0.01), -0.1332047).mul(1.292936), 0, 1),
    );
    const g = select(
      t.lessThanEqual(66),
      clamp(log(t).mul(0.39008157).sub(0.63184144), 0, 1),
      clamp(pow(max(t.sub(60), 0.01), -0.0755148).mul(1.12989086), 0, 1),
    );
    const b = select(
      t.greaterThanEqual(66),
      float(1),
      select(
        t.lessThanEqual(19),
        float(0),
        clamp(
          log(max(t.sub(10), 1))
            .mul(0.54320678)
            .sub(1.19625408),
          0,
          1,
        ),
      ),
    );
    return pow(vec3(r, g, b), vec3(2.2));
  };
  const PERIOD = 18; // the disk's pattern is renewed on this cycle so the shear never winds it too tight
  const diskLayer = (p, rp, phase) => {
    const angle = uSpin.mul(phase).mul(PERIOD).mul(pow(rp, -1.5)).mul(2.2);
    const c = cos(angle);
    const s = sin(angle);
    const q = vec2(p.x.mul(c).sub(p.z.mul(s)), p.x.mul(s).add(p.z.mul(c)));
    return mx_fractal_noise_float(
      vec3(q.mul(0.75), rp.mul(2.4).add(phase.floor().mul(13))),
      5,
      2.1,
      0.55,
      1,
    );
  };
  const disk = (p, rp, ray) => {
    const cycle = uTime.div(PERIOD);
    const a = cycle.fract();
    const wa = float(1).sub(a.mul(2).sub(1).abs());
    const n = diskLayer(p, rp, cycle)
      .mul(wa)
      .add(diskLayer(p, rp, cycle.add(0.5)).mul(float(1).sub(wa)));
    // the standard thin disk's temperature profile, at its peak about 1.36 times the inner edge
    const x = float(R_IN).div(rp);
    const profile = pow(x, 0.75)
      .mul(pow(max(float(1).sub(sqrt(x)), 0), 0.25))
      .div(0.4883);
    const density = smoothstep(R_IN, R_IN + 0.6, rp)
      .mul(smoothstep(uOut, uOut.mul(0.6), rp))
      .mul(clamp(n.mul(1.1).add(0.62), 0.05, 1.4));
    // orbital speed, as a fraction of light's, and the shifts it causes
    const beta = sqrt(float(0.5).div(rp.sub(1)));
    const gamma = float(1).div(sqrt(float(1).sub(beta.mul(beta))));
    const motion = normalize(vec3(p.z.negate(), 0, p.x)).mul(uSpin.sign().add(uSpin.equal(0)));
    const doppler = float(1).div(gamma.mul(float(1).sub(beta.mul(dot(motion, ray.negate())))));
    const gravity = sqrt(float(1).sub(float(1).div(rp)));
    const shift = mix(gravity, doppler.mul(gravity), uBeam);
    const kelvin = profile.mul(uHeat).mul(5600).mul(shift);
    const bright = pow(shift, 4).mul(pow(profile, 3)).mul(uHeat.mul(uHeat)).mul(0.9);
    return [blackbody(kelvin).mul(bright).mul(density), clamp(density.mul(0.85), 0, 0.95)];
  };

  /* ---------- the tracer ---------- */
  const trace = Fn(() => {
    const ndc = uv().mul(2).sub(1);
    const dir = normalize(uFwd.add(uRight.mul(ndc.x.mul(uTanX))).add(uUp.mul(ndc.y.mul(uTanY))));
    const x = vec3(uCam).toVar();
    const v = vec3(dir).toVar();
    const hv = cross(x, v);
    const h2 = dot(hv, hv).toVar();
    const light = vec3(0).toVar();
    const cover = float(0).toVar();
    const fell = float(0).toVar();
    Loop(STEPS, () => {
      const r2 = dot(x, x);
      const r = sqrt(r2);
      const dt = clamp(r.mul(mix(float(0.028), float(0.11), smoothstep(1.6, 7, r))), 0.006, 4);
      // light's path round a mass, in the form that makes the photon sphere and the
      // lensing come out right: a = -3/2 h² x / r⁵
      v.addAssign(x.mul(h2.mul(-1.5).div(r2.mul(r2).mul(r))).mul(dt));
      const next = x.add(v.mul(dt));
      If(x.y.mul(next.y).lessThanEqual(0), () => {
        const t = x.y.div(x.y.sub(next.y).add(1e-6));
        const p = mix(x, next, t);
        const rp = length(p.xz);
        If(rp.greaterThan(R_IN).and(rp.lessThan(uOut)), () => {
          const [glow, opacity] = disk(p, rp, normalize(v));
          light.addAssign(glow.mul(float(1).sub(cover)));
          cover.addAssign(float(1).sub(cover).mul(opacity));
        });
      });
      x.assign(next);
      If(dot(x, x).lessThan(1), () => {
        fell.assign(1);
        Break();
      });
      const leaving = dot(x, v).greaterThan(0).and(dot(x, x).greaterThan(uFar2));
      If(leaving.or(cover.greaterThan(0.99)), () => {
        Break();
      });
    });
    const behind = select(fell.greaterThan(0.5), vec3(0), sky(v));
    return vec4(light.add(behind.mul(float(1).sub(cover))).mul(uExposure), 1);
  });

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicNodeMaterial());
  screen.material.vertexNode = vec4(positionLocal.xy, 0, 1);
  screen.material.colorNode = trace();
  screen.frustumCulled = false;
  scene.add(screen);

  const Pipeline = THREE.RenderPipeline ?? THREE.PostProcessing;
  const pipeline = new Pipeline(renderer);
  const uGlow = uniform(0.2);
  {
    const scenePass = pass(scene, camera);
    const colour = scenePass.getTextureNode("output");
    pipeline.outputNode = colour.add(bloom(colour, 1, 0.6, 0.75).mul(uGlow));
  }

  /* ---------- state ---------- */
  const P = { dist: 16, incl: 6, mass: 10 };
  let distNow = P.dist;
  let inclNow = P.incl;
  let az = 0;
  let azSpin = 0;
  let drag = null;
  let fall = null; // { t, from }
  let fade = 1;
  let clock = 0;
  let disposed = false;
  let shown = "";
  const SPIN_ON = 1;

  const onDown = (e) => {
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag || fall) return;
    az -= (e.clientX - drag.x) * 0.005;
    P.incl = Math.max(-80, Math.min(85, P.incl + (e.clientY - drag.y) * 0.25));
    options.onValues?.({ incl: Math.round(P.incl) });
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const onUp = () => {
    drag = null;
  };
  const onWheel = (e) => {
    e.preventDefault();
    if (fall) return;
    P.dist = Math.max(2.5, Math.min(40, P.dist * Math.exp(e.deltaY * 0.001)));
    options.onValues?.({ dist: Math.round(P.dist * 10) / 10 });
  };
  const onKey = (e) => {
    if (fall) return;
    if (e.key === "ArrowLeft") az += 0.08;
    else if (e.key === "ArrowRight") az -= 0.08;
    else if (e.key === "ArrowUp") P.incl = Math.min(85, P.incl + 3);
    else if (e.key === "ArrowDown") P.incl = Math.max(-80, P.incl - 3);
    else if (e.key === "+" || e.key === "=") P.dist = Math.max(2.5, P.dist * 0.92);
    else if (e.key === "-" || e.key === "_") P.dist = Math.min(40, P.dist / 0.92);
    else return;
    e.preventDefault();
    options.onValues?.({ incl: Math.round(P.incl), dist: Math.round(P.dist * 10) / 10 });
  };
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("keydown", onKey);

  /* ---------- sound: a low hum that drops as you fall ---------- */
  const audio = { ctx: null, out: null, tones: [] };
  function setSound(on) {
    if (on && !audio.ctx) {
      const C = new AudioContext();
      const out = C.createGain();
      out.gain.value = 0;
      const low = C.createBiquadFilter();
      low.type = "lowpass";
      low.frequency.value = 320;
      out.connect(low).connect(C.destination);
      for (const [f, g] of [
        [41, 0.5],
        [61.5, 0.25],
        [82.4, 0.16],
      ]) {
        const o = C.createOscillator();
        const gain = C.createGain();
        o.frequency.value = f;
        gain.gain.value = g;
        o.connect(gain).connect(out);
        o.start();
        audio.tones.push([o, f]);
      }
      audio.ctx = C;
      audio.out = out;
    }
    if (!audio.ctx) return;
    audio.ctx.resume();
    audio.out.gain.setTargetAtTime(on ? 0.12 : 0, audio.ctx.currentTime, 0.8);
  }

  /* ---------- frame ---------- */
  let last = performance.now();
  const eye = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  function frame(now) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w < 2 || h < 2) return;
    const dpr = 1; // traced at one sample a CSS pixel; the glow hides the rest
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
    }
    clock += dt * (reduced ? 0.3 : 1);
    uTime.value = uSpin.value === 0 ? uTime.value : clock;

    if (fall) {
      // a slow plunge that quickens, then the dark, then back where we were
      fall.t += dt;
      const d = Math.max(1.02, fall.from - (fall.from - 1) * Math.min(1, (fall.t / 14) ** 2.4));
      distNow = d;
      fade = d < 1.4 ? Math.max(0, (d - 1.02) / 0.38) : 1;
      if (fall.t > 16.5) {
        distNow = fall.from;
        fall = null;
      }
    } else {
      distNow += (P.dist - distNow) * (1 - Math.exp(-dt * 4));
      fade = Math.min(1, fade + dt * 0.6);
    }
    inclNow += (P.incl - inclNow) * (1 - Math.exp(-dt * 5));
    if (!drag && !fall && !reduced) azSpin += dt * 0.012;

    const i = (inclNow * Math.PI) / 180;
    const a = az + azSpin;
    eye
      .set(Math.sin(a) * Math.cos(i), Math.sin(i), Math.cos(a) * Math.cos(i))
      .multiplyScalar(distNow);
    fwd.copy(eye).negate().normalize();
    right.crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    up.crossVectors(right, fwd);
    // the disk tilts a little in the frame, as a hand-held camera would hold it
    uCam.value.copy(eye);
    uFwd.value.copy(fwd);
    uRight.value.copy(right);
    uUp.value.copy(up);
    const fov = (fall ? 62 : 48) * (Math.PI / 180);
    uTanY.value = Math.tan(fov / 2);
    uTanX.value = uTanY.value * (w / h);
    uPixel.value = (2 * uTanY.value) / (h * dpr);
    uFar2.value = Math.max(distNow * 1.15, 22) ** 2;
    uCamR.value = distNow;
    uExposure.value = P.exposure * fade;

    const km = distNow * P.mass * SUN_RS_KM;
    const text =
      fall && distNow < 1.4
        ? "Past the horizon\nno light from here gets out"
        : `${distNow.toFixed(1)} Schwarzschild radii out\nfor ${P.mass} solar masses: ${Math.round(km).toLocaleString("en-GB")} km\nlight from the disk's near side ${uBeam.value > 0.5 ? "is beamed bright" : "unbeamed"}`;
    if (text !== shown) {
      shown = text;
      options.onReadout(text);
    }
    pipeline.render();
  }
  P.exposure = 1;
  renderer.setAnimationLoop(frame);

  async function setPhoto(file) {
    try {
      const image = await createImageBitmap(file, { imageOrientation: "from-image" });
      const tex = new THREE.Texture(image);
      tex.colorSpace = THREE.NoColorSpace;
      tex.flipY = false;
      tex.needsUpdate = true;
      const old = photoNode.value;
      photoNode.value = tex;
      if (old !== placeholder) old.dispose();
      uPhotoAspect.value = image.width / image.height;
      uHasPhoto.value = 1;
      return true;
    } catch {
      return false;
    }
  }

  return {
    controls: [
      {
        type: "range",
        key: "dist",
        label: "Distance, Schwarzschild radii",
        min: 2.5,
        max: 40,
        step: 0.1,
        value: 16,
      },
      {
        type: "range",
        key: "incl",
        label: "Seen from above the disk, °",
        min: -80,
        max: 85,
        step: 1,
        value: 6,
      },
      {
        type: "range",
        key: "heat",
        label: "Disk temperature",
        min: 0.4,
        max: 2,
        step: 0.01,
        value: 1,
      },
      {
        type: "range",
        key: "out",
        label: "Disk reaches out to",
        min: 5,
        max: 24,
        step: 0.5,
        value: 12,
      },
      { type: "toggle", key: "beam", label: "Doppler beaming", value: true },
      { type: "toggle", key: "spin", label: "The disk turns", value: true },
      { type: "range", key: "exposure", label: "Exposure", min: 0.2, max: 3, step: 0.01, value: 1 },
      { type: "range", key: "glow", label: "Glare", min: 0, max: 1, step: 0.01, value: 0.2 },
      { type: "action", key: "fall", label: "Fall in" },
      { type: "action", key: "clear", label: "Back to the stars" },
    ],
    set(key, value) {
      if (key === "heat") uHeat.value = value;
      else if (key === "out") uOut.value = value;
      else if (key === "beam") uBeam.value = value ? 1 : 0;
      else if (key === "spin") uSpin.value = value ? SPIN_ON : 0;
      else if (key === "glow") uGlow.value = value;
      else if (key === "fall") {
        if (!fall) fall = { t: 0, from: Math.max(distNow, 6) };
      } else if (key === "clear") uHasPhoto.value = 0;
      else if (key in P) P[key] = value;
    },
    setPhoto,
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
      if (photoNode.value !== placeholder) photoNode.value.dispose();
      placeholder.dispose();
      renderer.dispose();
    },
  };
}
