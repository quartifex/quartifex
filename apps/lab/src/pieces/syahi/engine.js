// Syahi: ink in still water. Each drop plunges, slows and tears into threads; the pointer drags the water.
// WebGL 2 with transform feedback; drawn by multiplying, so ink takes light away from the paper.

export function createSyahi(canvas, options) {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
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
  const CHUNKS = 6; // ink from the last six drops stays in the water
  const PER = small ? 20000 : 42000;
  const N = CHUNKS * PER;
  const IMP = 6; // how many recent stirs the water remembers

  const HASH = `
float hash(float n){ return fract(sin(n*12.9898)*43758.5453); }
vec3 hash3(float n){ return vec3(hash(n), hash(n+17.13), hash(n+41.71)); }`;

  const UPDATE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aState;      // xyz, age in seconds
out vec4 vState;
uniform float uDt, uTime, uSpawn, uStart, uCount, uTurb, uSink;
uniform vec3 uDrop;
uniform vec4 uImp[${IMP}];              // xy position, xy velocity (already scaled by remaining strength)
${HASH}
// a divergence-free swirl (ABC flow): the water never piles up or thins out
vec3 flow(vec3 p, float t){
  vec3 a = p*1.7 + vec3(0.0, t*0.05, 1.3);
  vec3 b = p*3.9 + vec3(2.1, -t*0.08, 0.4);
  return vec3(sin(a.z)+cos(a.y), sin(a.x)+cos(a.z), sin(a.y)+cos(a.x))
       + 0.45*vec3(sin(b.z)+cos(b.y), sin(b.x)+cos(b.z), sin(b.y)+cos(b.x));
}
// fine eddies: what tears a falling drop into threads
vec3 eddies(vec3 p, float t){
  vec3 a = p*8.3 + vec3(1.7, t*0.11, 4.2);
  vec3 b = p*16.9 + vec3(-t*0.13, 3.3, 0.9);
  return vec3(sin(a.z)+cos(a.y), sin(a.x)+cos(a.z), sin(a.y)+cos(a.x))
       + 0.6*vec3(sin(b.z)+cos(b.y), sin(b.x)+cos(b.z), sin(b.y)+cos(b.x));
}
void main(){
  float id = float(gl_VertexID);
  vec3 r = hash3(id*0.731 + 3.0);
  vec3 p = aState.xyz; float age = aState.w;
  if (uSpawn > 0.5 && id >= uStart && id < uStart + uCount){
    vec3 d = normalize(r*2.0 - 1.0 + 1e-4) * pow(hash(id+uTime), 0.3333);
    p = uDrop + d*vec3(0.055, 0.07, 0.055);
    age = 0.0;
  } else {
    float settle = min(age, 5.0)/5.0;
    vec3 v = flow(p, uTime) * (0.006 + 0.016*settle);
    // the drop is heavier than water: it plunges, then hangs
    float sink = ((0.16 + 0.62*r.x*r.x) * exp(-age*0.85) + 0.006) * uSink;
    v.y -= sink;
    v += eddies(p, uTime) * (0.075*exp(-age*0.45) + 0.007) * uTurb;
    // as it slows the head spreads into a cap
    vec2 ax = p.xz - uDrop.xz;
    v.xz += normalize(ax + 1e-5) * 0.16 * r.y * exp(-age*1.1) * step(age, 5.0);
    for (int i=0; i<${IMP}; i++){
      vec2 d = p.xy - uImp[i].xy;
      float w = exp(-dot(d,d)/0.055);
      v.xy += uImp[i].zw * w;
      v.z  += (r.z-0.5) * length(uImp[i].zw) * w * 0.6;
    }
    vec3 j = hash3(id + uTime*61.0) - 0.5;
    p += v*uDt + j*0.05*uDt;
    p.y = max(p.y, -1.03 + 0.03*r.z);
    age += uDt;
  }
  vState = vec4(p, age);
}`;
  const UPDATE_FS = `#version 300 es
precision lowp float; out vec4 o; void main(){ o = vec4(0.0); }`;

  const DRAW_VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aState;
uniform mat4 uVP; uniform float uPx, uFocus, uPer;
out float vA; out float vTeal;
${HASH}
void main(){
  float id = float(gl_VertexID), age = aState.w;
  float life = exp(-age/38.0) * smoothstep(0.0, 0.12, age);
  vec4 clip = uVP * vec4(aState.xyz, 1.0);
  float coc = abs(clip.w - uFocus) * 0.9;
  float grow = 1.0 + min(age, 30.0)*0.09 + coc*2.2;
  float size = (0.0085 + 0.007*hash(id+9.0)) * grow;
  gl_PointSize = max(1.0, uPx*size/clip.w);
  vA = life * (0.075 + 0.07*hash(id+2.0)) / pow(grow, 1.5);
  vTeal = step(1.5, mod(floor(id/uPer), 3.0));
  gl_Position = life < 0.004 ? vec4(2.0, 2.0, 2.0, 1.0) : clip;
}`;
  const DRAW_FS = `#version 300 es
precision highp float;
in float vA; in float vTeal; out vec4 o;
void main(){
  vec2 d = gl_PointCoord - 0.5; float r2 = dot(d,d);
  if (r2 > 0.25) discard;
  float a = vA * smoothstep(0.25, 0.0, r2);
  // what colour of light the ink lets through
  vec3 through = mix(vec3(0.10, 0.13, 0.26), vec3(0.05, 0.50, 0.44), vTeal);
  o = vec4(mix(vec3(1.0), through, clamp(a, 0.0, 1.0)), 1.0);
}`;

  function program(vs, fs, tf) {
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
    if (tf) gl.transformFeedbackVaryings(p, tf, gl.INTERLEAVED_ATTRIBS);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace("[0]", "");
      u[name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }
  let upd, draw;
  try {
    upd = program(UPDATE_VS, UPDATE_FS, ["vState"]);
    draw = program(DRAW_VS, DRAW_FS);
  } catch (err) {
    console.error(err);
    throw new Error("unsupported");
  }

  const init = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    init[i * 4 + 1] = -5;
    init[i * 4 + 3] = 1e4;
  } // parked and invisible until a drop claims them
  const bufs = [],
    vaos = [];
  for (let i = 0; i < 2; i++) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, init, gl.DYNAMIC_COPY);
    const v = gl.createVertexArray();
    gl.bindVertexArray(v);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    bufs.push(b);
    vaos.push(v);
  }
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

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

  /* ---------- where the pointer is, in the water ---------- */
  const FOV = (30 * Math.PI) / 180,
    DIST = 4.2,
    HALF = Math.tan(FOV / 2) * DIST;
  const world = (cx, cy) => [
    ((cx / innerWidth) * 2 - 1) * HALF * (innerWidth / innerHeight),
    (1 - (cy / innerHeight) * 2) * HALF,
  ];

  const P = { turb: 1, sink: 1, stir: 1, rain: true };
  const imps = Array.from({ length: IMP }, () => ({ x: 0, y: 0, vx: 0, vy: 0, s: 0 }));
  let impI = 0,
    lastP = null,
    lastPush = 0,
    px = 0.5,
    py = 0.5,
    camx = 0,
    camy = 0;
  const queue = [];
  let chunk = 0,
    drops = 0,
    lastDrop = -1e9,
    lastClick = -1e9;

  on(canvas, "pointermove", (e) => {
    const now = performance.now(),
      [x, y] = world(e.clientX, e.clientY);
    px = e.clientX / innerWidth;
    py = e.clientY / innerHeight;
    if (lastP && now - lastPush > 45) {
      const dt = Math.max((now - lastP.t) / 1000, 1 / 120);
      let vx = (x - lastP.x) / dt,
        vy = (y - lastP.y) / dt;
      const sp = Math.hypot(vx, vy);
      if (sp > 0.05) {
        const k = Math.min(1, 1.1 / sp) * 0.5 * P.stir;
        vx *= k;
        vy *= k; // a firm stir, never a blast
        imps[impI] = { x, y, vx, vy, s: 1 };
        impI = (impI + 1) % IMP;
        lastPush = now;
      }
      lastP = { x, y, t: now };
    } else if (!lastP) lastP = { x, y, t: now };
  });
  on(canvas, "pointerleave", () => {
    lastP = null;
  });
  on(canvas, "pointerdown", (e) => {
    const [x, y] = world(e.clientX, e.clientY);
    queue.push([x, y, (Math.random() - 0.5) * 0.3]);
    lastClick = performance.now();
    if (audio.ctx) audio.ctx.resume();
  });

  /* ---------- sound: one small plip per drop ---------- */
  const audio = { ctx: null, on: false };
  function setSound(on) {
    if (!audio.ctx) audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    audio.on = on;
    audio.ctx.resume();
  }
  function plip(x) {
    if (!audio.on || !audio.ctx) return;
    const C = audio.ctx,
      T = C.currentTime,
      o = C.createOscillator(),
      g = C.createGain();
    const pan = C.createStereoPanner ? C.createStereoPanner() : null;
    const f = 520 + Math.random() * 380;
    o.type = "sine";
    o.frequency.setValueAtTime(f, T);
    o.frequency.exponentialRampToValueAtTime(f * 2.4, T + 0.07);
    g.gain.setValueAtTime(0, T);
    g.gain.linearRampToValueAtTime(0.16, T + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, T + 0.32);
    if (pan) {
      pan.pan.value = Math.max(-1, Math.min(1, x / 1.6));
      o.connect(g).connect(pan).connect(C.destination);
    } else o.connect(g).connect(C.destination);
    o.start(T);
    o.stop(T + 0.35);
  }

  /* ---------- frame ---------- */
  const impArr = new Float32Array(IMP * 4);
  let cur = 0,
    last = performance.now();
  gl.clearColor(0.922, 0.902, 0.855, 1);
  gl.disable(gl.DEPTH_TEST);

  function frame(now) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 1 / 30) * (reduced ? 0.6 : 1);
    last = now;
    const t = now / 1000;

    // left alone, a drop falls every few seconds
    if (
      P.rain &&
      now - lastClick > 5000 &&
      now - lastDrop > (drops ? 5600 : 500) &&
      !queue.length
    ) {
      const hw = HALF * (innerWidth / innerHeight);
      queue.push([
        (Math.random() * 2 - 1) * Math.min(hw * 0.7, 1.4),
        0.35 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.4,
      ]);
    }
    let spawn = null;
    if (queue.length) {
      spawn = queue.shift();
      lastDrop = now;
      drops++;
      options.onReadout(`Drops ${drops}`);
      plip(spawn[0]);
    }

    for (let i = 0; i < IMP; i++) {
      const m = imps[i];
      m.s *= Math.exp(-dt * 1.3);
      m.x += m.vx * m.s * dt;
      m.y += m.vy * m.s * dt;
      impArr[i * 4] = m.x;
      impArr[i * 4 + 1] = m.y;
      impArr[i * 4 + 2] = m.vx * m.s;
      impArr[i * 4 + 3] = m.vy * m.s;
    }

    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
    gl.useProgram(upd.p);
    gl.uniform1f(upd.u.uDt, dt);
    gl.uniform1f(upd.u.uTime, t % 211.0);
    gl.uniform1f(upd.u.uTurb, P.turb);
    gl.uniform1f(upd.u.uSink, P.sink);
    gl.uniform4fv(upd.u.uImp, impArr);
    if (spawn) {
      gl.uniform1f(upd.u.uSpawn, 1);
      gl.uniform1f(upd.u.uStart, chunk * PER);
      gl.uniform1f(upd.u.uCount, PER);
      gl.uniform3f(upd.u.uDrop, spawn[0], spawn[1], spawn[2]);
      chunk = (chunk + 1) % CHUNKS;
    } else gl.uniform1f(upd.u.uSpawn, 0);
    gl.bindVertexArray(vaos[cur]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, bufs[1 - cur]);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    cur = 1 - cur;

    const sway = reduced ? 0 : 1,
      e = 1 - Math.exp(-dt * 1.4);
    camx += ((px - 0.5) * sway - camx) * e;
    camy += ((py - 0.5) * sway - camy) * e;
    const eye = [camx * 0.5 + Math.sin(t * 0.05) * 0.08 * sway, -camy * 0.3, DIST];
    const VP = mul(perspective(FOV, W / H, 0.1, 30), lookAt(eye, [0, 0, 0]));

    gl.viewport(0, 0, W, H);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.DST_COLOR, gl.ZERO); // ink subtracts light; order never matters
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
    gl.useProgram(draw.p);
    gl.uniformMatrix4fv(draw.u.uVP, false, VP);
    gl.uniform1f(draw.u.uPx, H / (2 * Math.tan(FOV / 2)));
    gl.uniform1f(draw.u.uFocus, DIST);
    gl.uniform1f(draw.u.uPer, PER);
    gl.bindVertexArray(vaos[cur]);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);

    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    ac.abort();
    if (audio.ctx) audio.ctx.close();
  }

  options.onReadout("Drops 0");
  return {
    controls: [
      { type: "action", key: "drop", label: "Let a drop fall" },
      { type: "range", key: "turb", label: "Turbulence", min: 0, max: 3, step: 0.05, value: 1 },
      {
        type: "range",
        key: "sink",
        label: "How fast it sinks",
        min: 0.2,
        max: 2.5,
        step: 0.05,
        value: 1,
      },
      { type: "range", key: "stir", label: "Stir strength", min: 0, max: 3, step: 0.05, value: 1 },
      { type: "toggle", key: "rain", label: "Drops fall when left alone", value: true },
    ],
    set(key, value) {
      if (key === "drop") {
        queue.push([
          (Math.random() * 2 - 1) * 0.9,
          0.35 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.4,
        ]);
        lastClick = performance.now();
      } else if (key in P) P[key] = value;
    },
    setSound,
    dispose,
  };
}
