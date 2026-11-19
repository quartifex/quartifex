// Parvat: an endless mountain range drawn only from points. Nothing is stored:
// every point works out its place from its index and its height from layered noise. WebGL 2.

export function createParvat(canvas, options) {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    depth: true,
    powerPreference: "high-performance",
  });
  if (!gl) throw new Error("unsupported");
  const ac = new AbortController();
  const on = (target, type, fn, opts) =>
    target.addEventListener(type, fn, { ...opts, signal: ac.signal });
  let raf = 0;
  let disposed = false;

  const reduced = options.reducedMotion;
  const small =
    Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 4) <= 4;
  const qs = new URLSearchParams(location.search);
  const TIERS = [1800, 1500, 1200, 900, 640, 440];
  let tier = small ? 3 : (navigator.hardwareConcurrency || 4) >= 8 ? 0 : 2;
  let G = +qs.get("g") || TIERS[tier]; // ?g= is a test aid for slow renderers
  const EXTENT = 22.0; // width of the patch of land that is drawn, in world units

  /* ---------- the land: every point works out its own height, nothing is stored ---------- */
  const LAND = `
uniform float uRelief, uContour, uFog;
float hash(vec2 p){ p = 50.0*fract(p*0.3183099 + vec2(0.71, 0.113)); return fract(p.x*p.y*(p.x+p.y)); }
// value noise with its own slope
vec3 noised(vec2 x){
  vec2 i = floor(x), f = fract(x);
  vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0), du = 30.0*f*f*(f*(f-2.0)+1.0);
  float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
  return vec3(a + (b-a)*u.x + (c-a)*u.y + (a-b-c+d)*u.x*u.y,
              du*(vec2(b-a, c-a) + (a-b-c+d)*u.yx));
}
const mat2 M2 = mat2(0.8, -0.6, 0.6, 0.8);
// each layer is damped where the layers before it are steep, which carves ridges and valley floors
float height(vec2 p){
  p *= 0.26; float a = 0.0, b = 1.0; vec2 d = vec2(0.0);
  for (int i=0; i<9; i++){
    vec3 n = noised(p); d += n.yz;
    a += b*n.x/(1.0 + dot(d,d));
    b *= 0.5; p = M2*p*2.0;
  }
  return a*3.1*uRelief;
}`;

  const LAND_VS = `#version 300 es
precision highp float;
uniform mat4 uVP; uniform vec2 uCenter, uSun; uniform vec3 uEye;
uniform float uG, uCell, uPx, uTime; uniform vec3 uPulse;        // pulse: origin xz, radius
out vec3 vCol; out float vFog;
${LAND}
void main(){
  float id = float(gl_VertexID);
  vec2 g = vec2(mod(id, uG), floor(id/uG)) - 0.5*uG;
  vec2 p = uCenter + g*uCell;
  float h = height(p);
  float e = 0.04;
  float toward = (height(p + uSun*e) - h)/e;                     // does the ground rise toward the sun?
  float light = clamp(0.48 - toward*0.62, 0.0, 1.0);
  vec4 clip = uVP * vec4(p.x, h, p.y, 1.0);
  float dist = length(vec3(p.x, h, p.y) - uEye);

  vec3 shade = vec3(0.02, 0.15, 0.18), sunlit = vec3(1.12, 0.78, 0.44);
  vec3 col = mix(shade, sunlit, light*light);
  col = mix(col, vec3(0.92, 0.95, 1.0)*(0.25 + 0.9*light), smoothstep(1.7, 2.4, h)*0.5);   // snow line
  float c = abs(fract(h*uContour) - 0.5);
  col += vec3(0.10, 0.55, 0.48) * smoothstep(0.45, 0.5, c) * 0.95;                          // contour lines
  col *= 0.35 + 0.65*smoothstep(0.25, 0.9, h);                                              // valley floors fall dark

  // a ring of light travelling out across the land
  float ring = abs(length(p - uPulse.xy) - uPulse.z);
  float band = smoothstep(0.55, 0.0, ring) * smoothstep(34.0, 6.0, uPulse.z);
  col += vec3(0.35, 1.0, 0.88) * band * 1.5 + vec3(1.0) * smoothstep(0.08, 0.0, ring) * band;

  vFog = 1.0 - exp(-dist*dist*0.0095*uFog);
  vCol = col;
  gl_Position = clip;
  gl_PointSize = clamp(uPx*uCell*0.62/clip.w, 1.0, 7.0);
}`;
  const LAND_FS = `#version 300 es
precision highp float;
in vec3 vCol; in float vFog; out vec4 o;
uniform vec3 uHaze;
void main(){
  vec2 d = gl_PointCoord - 0.5; if (dot(d,d) > 0.25) discard;
  o = vec4(mix(vCol, uHaze, vFog), 1.0);
}`;

  const SKY_VS = `#version 300 es
out vec2 vP; void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2)*2.0 - 1.0; vP = p; gl_Position = vec4(p, 0.9999, 1.0); }`;
  const SKY_FS = `#version 300 es
precision highp float;
in vec2 vP; out vec4 o;
uniform float uHorizon, uSunX, uAspect; uniform vec3 uHaze;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
void main(){
  float y = vP.y - uHorizon;
  vec3 zenith = vec3(0.012, 0.018, 0.03);
  vec3 col = mix(uHaze, zenith, smoothstep(0.0, 0.9, y));
  vec2 s = vec2((vP.x - uSunX)*uAspect, y - 0.05);
  vec3 glow = vec3(1.0, 0.62, 0.34) * (0.42*exp(-dot(s,s)*3.0) + 0.9*exp(-dot(s,s)*60.0));  // the low sun
  col += glow;
  vec2 cell = floor(gl_FragCoord.xy/2.0);
  float star = step(0.9985, hash(cell)) * smoothstep(0.25, 0.8, y) * (0.4 + 0.6*hash(cell+3.0));
  col += star;
  if (y < 0.0) col = uHaze + glow*exp(y*4.0);                    // its glow carries on down through the haze
  o = vec4(col, 1.0);
}`;

  function program(vs, fs) {
    const p = gl.createProgram();
    for (const [type, src] of [
      [gl.VERTEX_SHADER, vs],
      [gl.FRAGMENT_SHADER, fs],
    ]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }
  let land, sky;
  try {
    land = program(LAND_VS, LAND_FS);
    sky = program(SKY_VS, SKY_FS);
  } catch (err) {
    console.error(err);
    throw new Error("unsupported");
  }
  const vao = gl.createVertexArray(); // no buffers at all: each point finds its place from its index

  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2),
      nf = 1 / (near - far);
    return [
      f / aspect,
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      (far + near) * nf,
      -1,
      0,
      0,
      2 * far * near * nf,
      0,
    ];
  }
  function lookAt(e, c) {
    let zx = e[0] - c[0],
      zy = e[1] - c[1],
      zz = e[2] - c[2];
    let l = Math.hypot(zx, zy, zz);
    zx /= l;
    zy /= l;
    zz /= l;
    let xx = zz,
      xy = 0,
      xz = -zx;
    l = Math.hypot(xx, xy, xz);
    xx /= l;
    xz /= l;
    const yx = zy * xz - zz * xy,
      yy = zz * xx - zx * xz,
      yz = zx * xy - zy * xx;
    return [
      xx,
      yx,
      zx,
      0,
      xy,
      yy,
      zy,
      0,
      xz,
      yz,
      zz,
      0,
      -(xx * e[0] + xy * e[1] + xz * e[2]),
      -(yx * e[0] + yy * e[1] + yz * e[2]),
      -(zx * e[0] + zy * e[1] + zz * e[2]),
      1,
    ];
  }
  function mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
    return o;
  }

  let W = 1,
    H = 1;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.floor(innerWidth * dpr);
    H = Math.floor(innerHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
  }
  on(window, "resize", resize);
  resize();

  /* ---------- flight ---------- */
  let heading = "000°";
  const P = { speed: 1, relief: 1, contours: 5, haze: 1, sun: 1.15 };
  const showPts = () =>
    options.onReadout(`Points ${(G * G).toLocaleString("en-US")}\nHeading ${heading}`);
  showPts();
  let px = 0.5,
    py = 0.5,
    yaw = 0.5,
    turn = 0,
    alt = 4.7,
    pitch = 0.2,
    ex = 40,
    ez = 40;
  let pulse = { x: 0, z: 0, t: -1e9 },
    lastInput = -1e9,
    lastPulse = 0;
  on(canvas, "pointermove", (e) => {
    px = e.clientX / innerWidth;
    py = e.clientY / innerHeight;
    lastInput = performance.now();
  });
  on(canvas, "pointerdown", (e) => {
    px = e.clientX / innerWidth;
    py = e.clientY / innerHeight;
    lastInput = performance.now();
    fire();
    if (audio.ctx) audio.ctx.resume();
  });
  function fire() {
    const now = performance.now();
    pulse = { x: ex + Math.sin(yaw) * 2.5, z: ez + Math.cos(yaw) * 2.5, t: now };
    lastPulse = now;
    ping();
  }

  /* ---------- sound: wind, and one note for each ring of light ---------- */
  const audio = { ctx: null, on: false };
  function setSound(on) {
    if (!audio.ctx) {
      const C = new (window.AudioContext || window.webkitAudioContext)();
      const buf = C.createBuffer(1, C.sampleRate * 3, C.sampleRate),
        d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = C.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = C.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 420;
      bp.Q.value = 0.6;
      const lfo = C.createOscillator(),
        lg = C.createGain();
      lfo.frequency.value = 0.09;
      lg.gain.value = 190;
      lfo.connect(lg).connect(bp.frequency);
      lfo.start();
      const out = C.createGain();
      out.gain.value = 0;
      src.connect(bp).connect(out).connect(C.destination);
      src.start();
      audio.ctx = C;
      audio.out = out;
    }
    audio.on = on;
    audio.ctx.resume();
    audio.out.gain.setTargetAtTime(audio.on ? 0.11 : 0, audio.ctx.currentTime, 0.5);
  }
  function ping() {
    if (!audio.on || !audio.ctx) return;
    const C = audio.ctx,
      T = C.currentTime;
    for (const [f, g] of [
      [196, 0.09],
      [293.7, 0.05],
      [587.3, 0.02],
    ]) {
      const o = C.createOscillator(),
        a = C.createGain();
      o.type = "sine";
      o.frequency.value = f;
      a.gain.setValueAtTime(0, T);
      a.gain.linearRampToValueAtTime(g, T + 0.03);
      a.gain.exponentialRampToValueAtTime(0.0005, T + 3.2);
      o.connect(a).connect(C.destination);
      o.start(T);
      o.stop(T + 3.3);
    }
  }

  /* ---------- frame ---------- */
  const HAZE = [0.055, 0.115, 0.135];
  const FOV = (46 * Math.PI) / 180;
  let last = performance.now(),
    slow = 0,
    frames = 0;
  gl.clearColor(HAZE[0], HAZE[1], HAZE[2], 1);

  function frame(now) {
    if (disposed) return;
    const realDt = (now - last) / 1000;
    last = now;
    const dt = Math.min(realDt, 1 / 20),
      t = now / 1000;

    // step down the point count if this machine can't hold the frame rate
    if (!qs.get("g") && ++frames > 40) {
      if (realDt > 1 / 34) slow++;
      else slow = Math.max(0, slow - 1);
      if (slow > 45 && tier < TIERS.length - 1) {
        tier++;
        G = TIERS[tier];
        slow = 0;
        frames = 0;
        showPts();
      }
    }

    const idle = now - lastInput > 6000;
    const steer = idle ? Math.sin(t * 0.11) * 0.35 : (px - 0.5) * 2;
    turn += (steer * (reduced ? 0.12 : 0.34) - turn) * (1 - Math.exp(-dt * 1.5));
    yaw += turn * dt;
    const speed = (reduced ? 0.35 : 0.95) * P.speed;
    ex += Math.sin(yaw) * speed * dt;
    ez += Math.cos(yaw) * speed * dt;
    const wantAlt = idle ? 4.7 : 4.0 + (1 - py) * 1.5,
      wantPitch = idle ? 0.2 : 0.1 + py * 0.24;
    alt += (wantAlt - alt) * (1 - Math.exp(-dt * 1.2));
    pitch += (wantPitch - pitch) * (1 - Math.exp(-dt * 1.2));
    if (now - lastPulse > 11000) fire();

    const fx = Math.sin(yaw),
      fz = Math.cos(yaw);
    const eye = [ex, alt, ez];
    const look = [ex + fx * Math.cos(pitch), alt - Math.sin(pitch), ez + fz * Math.cos(pitch)];
    // bank into the turn
    const roll = -turn * 0.5,
      cr = Math.cos(roll),
      sr = Math.sin(roll);
    const ROLL = [cr, sr, 0, 0, -sr, cr, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const aspect = W / H,
      fov = aspect < 1 ? FOV * 1.35 : FOV;
    const VP = mul(mul(perspective(fov, aspect, 0.05, 60), ROLL), lookAt(eye, look));

    const cell = EXTENT / G;
    const cx = Math.round((ex + fx * EXTENT * 0.44) / cell) * cell,
      cz = Math.round((ez + fz * EXTENT * 0.44) / cell) * cell;
    const tanH = Math.tan(fov / 2);
    let dAz = P.sun - yaw;
    dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));

    gl.viewport(0, 0, W, H);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindVertexArray(vao);

    gl.disable(gl.DEPTH_TEST);
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
    gl.useProgram(sky.p);
    gl.uniform1f(sky.u.uHorizon, Math.tan(pitch) / tanH);
    gl.uniform1f(sky.u.uAspect, aspect);
    gl.uniform1f(sky.u.uSunX, Math.abs(dAz) < 1.5 ? -Math.tan(dAz) / (tanH * aspect) : 9);
    gl.uniform3fv(sky.u.uHaze, HAZE);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.DEPTH_TEST);
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
    gl.useProgram(land.p);
    gl.uniformMatrix4fv(land.u.uVP, false, VP);
    gl.uniform2f(land.u.uCenter, cx, cz);
    gl.uniform2f(land.u.uSun, Math.sin(P.sun), Math.cos(P.sun));
    gl.uniform3f(land.u.uEye, ex, alt, ez);
    gl.uniform1f(land.u.uG, G);
    gl.uniform1f(land.u.uCell, cell);
    gl.uniform1f(land.u.uPx, H / (2 * tanH));
    gl.uniform1f(land.u.uRelief, P.relief);
    gl.uniform1f(land.u.uContour, P.contours);
    gl.uniform1f(land.u.uFog, P.haze);
    gl.uniform3f(land.u.uPulse, pulse.x, pulse.z, ((now - pulse.t) / 1000) * (reduced ? 3 : 6.5));
    gl.uniform3fv(land.u.uHaze, HAZE);
    gl.drawArrays(gl.POINTS, 0, G * G);
    gl.bindVertexArray(null);

    const deg = ((((yaw * 180) / Math.PI) % 360) + 360) % 360;
    const hd = `${String(Math.round(deg) % 360).padStart(3, "0")}°`;
    if (hd !== heading) {
      heading = hd;
      showPts();
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    ac.abort();
    if (audio.ctx) audio.ctx.close();
  }

  return {
    controls: [
      { type: "action", key: "light", label: "Send light across it" },
      { type: "range", key: "speed", label: "Flying speed", min: 0, max: 3, step: 0.05, value: 1 },
      {
        type: "range",
        key: "relief",
        label: "Height of the land",
        min: 0.2,
        max: 1.2,
        step: 0.02,
        value: 1,
      },
      {
        type: "range",
        key: "contours",
        label: "Contour lines",
        min: 0,
        max: 14,
        step: 0.5,
        value: 5,
      },
      { type: "range", key: "haze", label: "Haze", min: 0.1, max: 3, step: 0.05, value: 1 },
      {
        type: "range",
        key: "sun",
        label: "Where the sun sits",
        min: 0,
        max: 6.28,
        step: 0.02,
        value: 1.15,
      },
    ],
    set(key, value) {
      if (key === "light") fire();
      else if (key in P) P[key] = value;
    },
    setSound,
    dispose,
  };
}
