// Niyam: strange attractors as hairline threads. Each grain obeys three short equations exactly.
// WebGL 2 with transform feedback; each grain is drawn as a line from where it is to where it just was.

export function createNiyam(canvas, options) {
  const gl = canvas.getContext("webgl2", {
    antialias: true,
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
  const big = !small && (navigator.hardwareConcurrency || 4) >= 8;
  const N = small ? 110000 : big ? 900000 : 320000;

  const LAWS = [
    {
      name: "Thomas",
      eq: "x' = sin y − bx\ny' = sin z − by\nz' = sin x − bz",
      chord: [110, 164.8, 246.9],
    },
    {
      name: "Aizawa",
      eq: "x' = (z − b)x − dy\ny' = dx + (z − b)y\nz' = c + az − z³/3 − …",
      chord: [98, 146.8, 220],
    },
    {
      name: "Halvorsen",
      eq: "x' = −ax − 4y − 4z − y²\ny' = −ay − 4z − 4x − z²\nz' = −az − 4x − 4y − x²",
      chord: [123.5, 185, 277.2],
    },
    {
      name: "Lorenz",
      eq: "x' = σ(y − x)\ny' = x(ρ − z) − y\nz' = xy − βz",
      chord: [82.4, 123.5, 207.7],
    },
  ];

  /* Each law lives in its own coordinates; the grains live in one shared, normalised space. */
  const FIELD = `
vec3 law(int s, vec3 q){
  if (s == 0){ vec3 p = q*4.4; float b = 0.18;
    return vec3(sin(p.y)-b*p.x, sin(p.z)-b*p.y, sin(p.x)-b*p.z) / 4.4 * 2.6; }
  if (s == 1){ vec3 p = q*1.55 + vec3(0.0, 0.0, 0.62);
    float a=0.95, b=0.7, c=0.6, d=3.5, e=0.25, f=0.1;
    return vec3((p.z-b)*p.x - d*p.y, d*p.x + (p.z-b)*p.y,
                c + a*p.z - p.z*p.z*p.z/3.0 - (p.x*p.x+p.y*p.y)*(1.0+e*p.z) + f*p.z*p.x*p.x*p.x) / 1.55 * 0.26; }
  if (s == 2){ vec3 p = q*12.0 + vec3(-2.6); float a = 1.4;
    return vec3(-a*p.x - 4.0*p.y - 4.0*p.z - p.y*p.y,
                -a*p.y - 4.0*p.z - 4.0*p.x - p.z*p.z,
                -a*p.z - 4.0*p.x - 4.0*p.y - p.x*p.x) / 12.0 * 0.085; }
  vec3 p = q*27.0 + vec3(0.0, 0.0, 25.0);
  return vec3(10.0*(p.y-p.x), p.x*(28.0-p.z) - p.y, p.x*p.y - 2.6666667*p.z) / 27.0 * 0.075;
}
vec3 home(int s){
  if (s == 0) return vec3(0.25, 0.1, 0.0);
  if (s == 1) return vec3(0.07, 0.0, -0.2);
  if (s == 2) return vec3(0.33, 0.25, 0.25);
  return vec3(0.04, 0.04, -0.2);
}`;

  const UPDATE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aState;      // xyz in shared space, w = seconds until this grain is re-seeded
out vec4 vState;
uniform float uDt, uTime, uK; uniform int uA, uB;
${FIELD}
float hash(float n){ return fract(sin(n*12.9898)*43758.5453); }
vec3 vel(vec3 q){ return mix(law(uA, q), law(uB, q), uK); }
void main(){
  float id = float(gl_VertexID);
  vec3 q = aState.xyz; float life = aState.w - uDt;
  vec3 k1 = vel(q);
  vec3 k2 = vel(q + k1*uDt*0.5);
  q += k2*uDt;                                    // midpoint step: stays on the attractor at these speeds
  bool lost = !(dot(q,q) < 9.0);                  // also catches NaN
  if (lost || life < 0.0){
    vec3 r = vec3(hash(id+uTime), hash(id*1.31+uTime*2.0), hash(id*0.77+uTime*3.0)) - 0.5;
    q = home(uK > 0.5 ? uB : uA) + r*0.22;
    life = 18.0 + 40.0*hash(id + uTime*5.0);
  }
  vState = vec4(q, life);
}`;
  const UPDATE_FS = `#version 300 es
precision lowp float; out vec4 o; void main(){ o = vec4(0.0); }`;

  /* Each grain is drawn as a hairline from where it is to where it just was. */
  const DRAW_VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aCur;
layout(location=1) in vec4 aPrev;
uniform mat4 uVP; uniform float uDt, uTail, uGain, uDist;
out float vA; out float vT;
float hash(float n){ return fract(sin(n*12.9898)*43758.5453); }
void main(){
  float end = float(gl_VertexID);                 // 0 = head, 1 = tail
  vec3 d = aCur.xyz - aPrev.xyz;
  float len = length(d);
  float speed = len / max(uDt, 1e-4);
  vec3 pos = aCur.xyz - d*end*uTail;
  vec4 clip = uVP * vec4(pos, 1.0);
  float depth = smoothstep(uDist + 1.3, uDist - 1.2, clip.w);      // nearer threads are brighter
  float tw = 0.55 + 0.45*hash(float(gl_InstanceID));
  vT = smoothstep(0.25, 1.5, speed);
  vA = uGain * tw * (0.25 + 0.75*depth) * (1.0 - 0.85*end) * (0.45 + 0.55*vT);
  gl_Position = (len > 0.2) ? vec4(2.0, 2.0, 2.0, 1.0) : clip;     // a re-seeded grain draws nothing this frame
}`;
  const DRAW_FS = `#version 300 es
precision highp float;
in float vA; in float vT; out vec4 o;
void main(){
  vec3 bone = vec3(0.93, 0.89, 0.80), teal = vec3(0.14, 0.80, 0.70);
  o = vec4(mix(bone, teal, vT) * vA, vA);
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
      u[info.name] = gl.getUniformLocation(p, info.name);
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
  {
    // start already spread along the first attractor: walk one path on the CPU and scatter the grains along it
    const S = 4.4,
      b = 0.18,
      R = 2.6 / S,
      h = 0.012,
      M = 60000,
      path = new Float32Array(M * 3);
    let x = 0.25,
      y = 0.1,
      z = 0;
    const f = (x, y, z) => [
      (Math.sin(S * y) - b * S * x) * R,
      (Math.sin(S * z) - b * S * y) * R,
      (Math.sin(S * x) - b * S * z) * R,
    ];
    for (let i = -3000; i < M; i++) {
      const k1 = f(x, y, z),
        k2 = f(x + k1[0] * h * 0.5, y + k1[1] * h * 0.5, z + k1[2] * h * 0.5);
      x += k2[0] * h;
      y += k2[1] * h;
      z += k2[2] * h;
      if (i >= 0) {
        path[i * 3] = x;
        path[i * 3 + 1] = y;
        path[i * 3 + 2] = z;
      }
    }
    for (let i = 0; i < N; i++) {
      const j = (Math.random() * M) | 0,
        e = 0.012;
      init[i * 4] = path[j * 3] + (Math.random() - 0.5) * e;
      init[i * 4 + 1] = path[j * 3 + 1] + (Math.random() - 0.5) * e;
      init[i * 4 + 2] = path[j * 3 + 2] + (Math.random() - 0.5) * e;
      init[i * 4 + 3] = 10 + Math.random() * 50;
    }
  }
  const bufs = [],
    simVao = [],
    drawVao = [];
  for (let i = 0; i < 2; i++) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, init, gl.DYNAMIC_COPY);
    bufs.push(b);
  }
  for (let i = 0; i < 2; i++) {
    const v = gl.createVertexArray();
    gl.bindVertexArray(v);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs[i]);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    simVao.push(v);
    // drawVao[i]: head from buffer i, tail from the other one, one pair per instance
    const d = gl.createVertexArray();
    gl.bindVertexArray(d);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs[i]);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs[1 - i]);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    drawVao.push(d);
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
  // the attractors are written z-up; stand them upright
  const UP = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];

  let W = 1,
    H = 1,
    dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.floor(innerWidth * dpr);
    H = Math.floor(innerHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
  }
  on(window, "resize", resize);
  resize();

  /* ---------- law switching ---------- */
  let A = 0,
    B = 0,
    K = 1,
    lastSwitch = performance.now();
  const P = { speed: 1, tail: reduced ? 9 : 5, glow: 1, spin: true, change: true };
  function show(i) {
    options.onReadout(`Law ${LAWS[i].name}\n${LAWS[i].eq}`);
  }
  show(0);
  function next() {
    A = B;
    B = (B + 1) % LAWS.length;
    K = 0;
    lastSwitch = performance.now();
    show(B);
    retune();
  }

  /* ---------- input: drag turns it, a click changes the law ---------- */
  let yaw = 0.6,
    pitch = 0.22,
    vyaw = 0,
    vpitch = 0,
    down = null;
  on(canvas, "pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: e.timeStamp, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("drag");
    if (audio.ctx) audio.ctx.resume();
  });
  on(canvas, "pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - down.lx,
      dy = e.clientY - down.ly;
    down.lx = e.clientX;
    down.ly = e.clientY;
    down.moved += Math.abs(dx) + Math.abs(dy);
    vyaw = -dx * 0.006;
    vpitch = dy * 0.005;
    yaw += vyaw;
    pitch += vpitch;
  });
  function release(e) {
    if (!down) return;
    if (down.moved < 7 && e.timeStamp - down.t < 450) next();
    down = null;
    canvas.classList.remove("drag");
  }
  on(canvas, "pointerup", release);
  on(canvas, "pointercancel", () => {
    down = null;
    canvas.classList.remove("drag");
  });
  on(window, "keydown", (e) => {
    if (
      e.target === document.body &&
      (e.key === " " || e.key === "Enter" || e.key === "ArrowRight")
    )
      next();
  });

  /* ---------- sound: one held chord per law ---------- */
  const audio = { ctx: null, on: false, osc: [] };
  function retune() {
    if (!audio.ctx) return;
    const T = audio.ctx.currentTime;
    audio.osc.forEach((o, i) => {
      o.frequency.setTargetAtTime(LAWS[B].chord[i], T, 0.6);
    });
  }
  function setSound(on) {
    if (!audio.ctx) {
      const C = new (window.AudioContext || window.webkitAudioContext)();
      const out = C.createGain();
      out.gain.value = 0;
      const lp = C.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      lp.Q.value = 0.3;
      const lfo = C.createOscillator(),
        lg = C.createGain();
      lfo.frequency.value = 0.07;
      lg.gain.value = 320;
      lfo.connect(lg).connect(lp.frequency);
      lfo.start();
      for (let i = 0; i < 3; i++) {
        const o = C.createOscillator(),
          g = C.createGain();
        o.type = i ? "sine" : "triangle";
        o.frequency.value = LAWS[B].chord[i];
        g.gain.value = [0.5, 0.34, 0.2][i];
        o.connect(g).connect(lp);
        o.start();
        audio.osc.push(o);
      }
      lp.connect(out).connect(C.destination);
      audio.ctx = C;
      audio.out = out;
    }
    audio.on = on;
    audio.ctx.resume();
    audio.out.gain.setTargetAtTime(audio.on ? 0.07 : 0, audio.ctx.currentTime, 0.4);
  }

  /* ---------- frame ---------- */
  let cur = 0,
    last = performance.now();
  const STEPS = Math.max(1, Math.min(40, +new URLSearchParams(location.search).get("steps") || 1)); // test aid for slow renderers
  gl.clearColor(0.02, 0.024, 0.028, 1);
  gl.disable(gl.DEPTH_TEST);
  const FOV = (38 * Math.PI) / 180;

  function frame(now) {
    if (disposed) return;
    const raw = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const dt = raw * (reduced ? 0.45 : 1) * P.speed,
      t = now / 1000;

    if (P.change && now - lastSwitch > (reduced ? 30000 : 17000) && !down) next();
    if (K < 1) K = Math.min(1, K + (raw * STEPS) / 2.8);
    const k = K * K * (3 - 2 * K);

    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
    gl.useProgram(upd.p);
    gl.uniform1f(upd.u.uDt, dt);
    gl.uniform1f(upd.u.uTime, t % 173.0);
    gl.uniform1f(upd.u.uK, k);
    gl.uniform1i(upd.u.uA, A);
    gl.uniform1i(upd.u.uB, B);
    gl.enable(gl.RASTERIZER_DISCARD);
    for (let s = 0; s < STEPS; s++) {
      gl.bindVertexArray(simVao[cur]);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, bufs[1 - cur]);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, N);
      gl.endTransformFeedback();
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
      cur = 1 - cur;
    }
    gl.disable(gl.RASTERIZER_DISCARD);

    if (!down) {
      yaw += vyaw;
      pitch += vpitch;
      vyaw *= Math.exp(-raw * 3);
      vpitch *= Math.exp(-raw * 3);
      if (!reduced && P.spin) yaw += raw * 0.07;
    }
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
    const aspect = W / H,
      dist = 3.5 * Math.max(1, 0.95 / aspect);
    const eye = [
      Math.sin(yaw) * Math.cos(pitch) * dist,
      Math.sin(pitch) * dist,
      Math.cos(yaw) * Math.cos(pitch) * dist,
    ];
    const VP = mul(
      mul(perspective(FOV, aspect, 0.1, 40), lookAt(eye, [0, aspect > 1 ? -0.08 : 0.25, 0])),
      UP,
    );

    gl.viewport(0, 0, W, H);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
    gl.useProgram(draw.p);
    gl.uniformMatrix4fv(draw.u.uVP, false, VP);
    gl.uniform1f(draw.u.uDt, dt);
    gl.uniform1f(draw.u.uTail, P.tail);
    gl.uniform1f(draw.u.uGain, (small ? 0.2 : big ? 0.11 : 0.12) * (dpr > 1.5 ? 1.5 : 1) * P.glow);
    gl.uniform1f(draw.u.uDist, dist);
    gl.bindVertexArray(drawVao[cur]);
    gl.drawArraysInstanced(gl.LINES, 0, 2, N);
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

  return {
    controls: [
      {
        type: "select",
        key: "law",
        label: "Law",
        options: LAWS.map((l) => l.name),
        value: LAWS[0].name,
      },
      { type: "range", key: "speed", label: "Speed", min: 0.1, max: 3, step: 0.05, value: 1 },
      {
        type: "range",
        key: "tail",
        label: "Thread length",
        min: 1,
        max: 16,
        step: 0.5,
        value: P.tail,
      },
      { type: "range", key: "glow", label: "Brightness", min: 0.2, max: 3, step: 0.05, value: 1 },
      { type: "toggle", key: "spin", label: "Turn slowly", value: true },
      { type: "toggle", key: "change", label: "Change law when left alone", value: true },
    ],
    set(key, value) {
      if (key === "law") {
        const i = LAWS.findIndex((l) => l.name === value);
        if (i < 0 || i === B) return;
        A = B;
        B = i;
        K = 0;
        lastSwitch = performance.now();
        show(B);
        retune();
      } else if (key in P) P[key] = value;
    },
    setSound,
    dispose,
  };
}
