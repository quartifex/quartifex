// Nada: sand on a vibrating plate. The grains walk off the moving parts and gather on the still lines.
// WebGL 2; grain positions are advanced on the GPU with transform feedback.

export function createNada(canvas, options) {
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
  const N = small ? 110000 : 262144;

  /* ---------- shaders ---------- */
  const CHLADNI = `
const float PI = 3.14159265359;
uniform vec2 uMode;     // n, m
uniform float uSign;    // -1 and +1 are the two symmetry families
// free-edge square plate figure and its gradient, p in [-1,1]
float figure(vec2 p, out vec2 g){
  vec2 u = (p + 1.0) * 0.5;
  float n = uMode.x, m = uMode.y;
  float cnx = cos(n*PI*u.x), cmy = cos(m*PI*u.y), cmx = cos(m*PI*u.x), cny = cos(n*PI*u.y);
  float snx = sin(n*PI*u.x), smy = sin(m*PI*u.y), smx = sin(m*PI*u.x), sny = sin(n*PI*u.y);
  g = 0.5*PI*(vec2(-n*snx*cmy, -m*cnx*smy) + uSign*vec2(-m*smx*cny, -n*cmx*sny));
  return cnx*cmy + uSign*cmx*cny;
}`;

  const UPDATE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aState;   // x, y, energy, seed
out vec4 vState;
uniform float uDt, uTime, uStir, uShake;
${CHLADNI}
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
void main(){
  vec2 p = aState.xy; float seed = aState.w;
  vec2 g; float f = figure(p, g);
  float amp = min(abs(f), 1.6);
  float gl2 = max(length(g), 1e-4);
  // walk down the amplitude toward the nearest still line
  vec2 v = -sign(f) * (g/gl2) * amp * 0.55;
  // the plate throws grains about in proportion to how hard it moves there
  float a = 6.2831853*hash(vec2(seed, uTime));
  float r = hash(vec2(uTime*1.7, seed*3.1));
  vec2 kick = vec2(cos(a), sin(a)) * (amp*(0.85 + uStir*1.6) + 0.012) * r * uShake;
  p += (v + kick) * uDt;
  // edges: fold back onto the plate
  p = clamp(p, -2.0, 2.0);
  p = mix(p,  2.0 - p, step( 1.0, p));
  p = mix(p, -2.0 - p, step(p, vec2(-1.0)));
  float e = mix(aState.z, amp, 0.12);
  vState = vec4(p, e, seed);
}`;
  const UPDATE_FS = `#version 300 es
precision lowp float; out vec4 o; void main(){ o = vec4(0.0); }`;

  const DRAW_VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aState;
uniform mat4 uVP; uniform float uPx, uFocus, uTime;
out float vE; out float vBlur; out float vSeed;
float hash(float p){ return fract(sin(p*127.1)*43758.5453); }
void main(){
  float e = aState.z, seed = aState.w;
  float hop = e * 0.085 * abs(sin(uTime*(9.0 + 14.0*hash(seed)) + seed*40.0));
  vec4 clip = uVP * vec4(aState.x, hop, aState.y, 1.0);
  gl_Position = clip;
  float coc = abs(clip.w - uFocus) * 1.55;
  vBlur = coc;
  float size = (0.0026 + 0.0022*hash(seed+1.0)) * (1.0 + coc*3.2);
  gl_PointSize = max(1.0, uPx * size / clip.w);
  vE = e; vSeed = seed;
}`;
  const DRAW_FS = `#version 300 es
precision highp float;
in float vE; in float vBlur; in float vSeed;
out vec4 o;
void main(){
  vec2 d = gl_PointCoord - 0.5; float r2 = dot(d,d);
  if (r2 > 0.25) discard;
  float soft = smoothstep(0.25, 0.02 + 0.2*clamp(vBlur,0.0,1.0), r2);
  vec3 bone = vec3(0.93, 0.89, 0.80);
  vec3 teal = vec3(0.16, 0.78, 0.69);
  float t = smoothstep(0.10, 0.75, vE);
  vec3 col = mix(bone, teal, t);
  float a = soft * (0.20 + 0.16*fract(vSeed*7.13)) / (1.0 + vBlur*vBlur*7.0);
  a *= mix(1.0, 0.55, t);
  o = vec4(col * a, a);
}`;

  const LINE_VS = `#version 300 es
layout(location=0) in vec3 aPos; uniform mat4 uVP; void main(){ gl_Position = uVP*vec4(aPos,1.0); }`;
  const LINE_FS = `#version 300 es
precision mediump float; out vec4 o; void main(){ o = vec4(vec3(0.93,0.89,0.80)*0.13, 0.13); }`;

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
  let upd, draw, line;
  try {
    upd = program(UPDATE_VS, UPDATE_FS, ["vState"]);
    draw = program(DRAW_VS, DRAW_FS);
    line = program(LINE_VS, LINE_FS);
  } catch (err) {
    console.error(err);
    throw new Error("unsupported");
  }

  /* ---------- state buffers (ping-pong through transform feedback) ---------- */
  const init = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    init[i * 4] = Math.random() * 2 - 1;
    init[i * 4 + 1] = Math.random() * 2 - 1;
    init[i * 4 + 2] = 0;
    init[i * 4 + 3] = Math.random();
  }
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
  const lineVao = gl.createVertexArray();
  gl.bindVertexArray(lineVao);
  const lb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, lb);
  const E = 1.012;
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-E, 0, -E, E, 0, -E, E, 0, E, -E, 0, E]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  /* ---------- camera ---------- */
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
    xz /= l; // up = +y
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

  /* ---------- input: where you are picks the note ---------- */
  const FIGURES = [
    [3, 5],
    [2, 6],
    [4, 7],
    [1, 4],
    [5, 8],
    [3, 8],
    [2, 5],
    [6, 9],
    [4, 9],
    [1, 6],
    [5, 7.5],
    [2.5, 7],
  ];
  let px = 0.38,
    py = 0.5,
    cx = 0,
    cy = 0,
    lastInput = -1e9,
    nextAuto = 0,
    fig = 0;
  let tn = 3,
    tm = 5,
    n = 3,
    m = 5,
    stir = 0,
    tsign = -1,
    sign = -1;
  const P = { shake: 1, grain: 1, wander: true, pointer: true };
  function point(e) {
    if (!P.pointer) return;
    px = e.clientX / innerWidth;
    py = e.clientY / innerHeight;
    lastInput = performance.now();
    tn = 1 + 6.0 * px;
    tm = tn + 1.2 + 5.0 * (1 - py);
  }
  on(canvas, "pointermove", point);
  on(canvas, "pointerdown", (e) => {
    point(e);
    tsign = -tsign;
    audio.ctx?.resume();
  });

  /* ---------- sound: the plate hums while it moves and falls quiet when the figure settles ---------- */
  const audio = { ctx: null, on: false };
  function setSound(on) {
    if (!audio.ctx) {
      const C = new (window.AudioContext || window.webkitAudioContext)();
      const out = C.createGain();
      out.gain.value = 0;
      const lp = C.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1400;
      lp.Q.value = 0.4;
      const o1 = C.createOscillator(),
        o2 = C.createOscillator(),
        o3 = C.createOscillator();
      o1.type = "sine";
      o2.type = "sine";
      o3.type = "triangle";
      const g1 = C.createGain(),
        g2 = C.createGain(),
        g3 = C.createGain();
      g1.gain.value = 0.6;
      g2.gain.value = 0.5;
      g3.gain.value = 0.08;
      o1.connect(g1).connect(lp);
      o2.connect(g2).connect(lp);
      o3.connect(g3).connect(lp);
      lp.connect(out).connect(C.destination);
      o1.start();
      o2.start();
      o3.start();
      Object.assign(audio, { ctx: C, out, o1, o2, o3 });
    }
    audio.on = on;
    audio.ctx.resume();
  }

  /* ---------- frame ---------- */
  let cur = 0,
    last = performance.now(),
    shown = "";
  gl.clearColor(0.024, 0.027, 0.031, 1);
  gl.disable(gl.DEPTH_TEST);

  function frame(now) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const t = now / 1000;

    // left alone, it wanders through figures by itself
    if (P.wander && now - lastInput > 4500 && now > nextAuto) {
      fig = (fig + 1 + Math.floor(Math.random() * 3)) % FIGURES.length;
      [tn, tm] = FIGURES[fig];
      if (Math.random() < 0.5) tsign = -tsign;
      nextAuto = now + (reduced ? 12000 : 6500);
    }
    const k = 1 - Math.exp(-dt * (reduced ? 1.2 : 2.6));
    const dn = (tn - n) * k,
      dm = (tm - m) * k,
      ds = (tsign - sign) * k;
    n += dn;
    m += dm;
    sign += ds;
    stir +=
      (Math.min(1, ((Math.abs(dn) + Math.abs(dm) + Math.abs(ds) * 2) / Math.max(dt, 1e-3)) * 0.35) -
        stir) *
      (1 - Math.exp(-dt * 5));

    const label = `${n.toFixed(1)} · ${m.toFixed(1)}`;
    if (label !== shown) {
      shown = label;
      options.onReadout(`Mode ${label}`);
    }

    if (audio.ctx) {
      const T = audio.ctx.currentTime,
        f = 52 + 15 * (n * n + m * m) ** 0.72;
      audio.o1.frequency.setTargetAtTime(f, T, 0.08);
      audio.o2.frequency.setTargetAtTime(f * 1.4983, T, 0.08);
      audio.o3.frequency.setTargetAtTime(f * 0.5, T, 0.08);
      audio.out.gain.setTargetAtTime(audio.on ? 0.012 + stir * 0.085 : 0, T, 0.25);
    }

    // simulate
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
    gl.useProgram(upd.p);
    gl.uniform2f(upd.u.uMode, n, m);
    gl.uniform1f(upd.u.uSign, sign);
    gl.uniform1f(upd.u.uDt, dt);
    gl.uniform1f(upd.u.uTime, t % 97.0);
    gl.uniform1f(upd.u.uStir, stir);
    gl.uniform1f(upd.u.uShake, P.shake);
    gl.bindVertexArray(vaos[cur]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, bufs[1 - cur]);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    cur = 1 - cur;

    // camera: a slow lean toward the pointer
    const sway = reduced ? 0 : 1;
    cx += ((px - 0.5) * sway - cx) * (1 - Math.exp(-dt * 1.6));
    cy += ((py - 0.5) * sway - cy) * (1 - Math.exp(-dt * 1.6));
    const aspect = W / H,
      fov = (34 * Math.PI) / 180;
    const fit = Math.max(1, 1.18 / aspect);
    const eye = [cx * 0.6 + Math.sin(t * 0.07) * 0.06 * sway, (2.05 - cy * 0.3) * fit, 2.75 * fit];
    const ctr = [0, 0, (aspect > 1 ? 0.34 : 0.1) * fit];
    const VP = mul(perspective(fov, aspect, 0.1, 30), lookAt(eye, ctr));
    const focus = Math.hypot(eye[0] - ctr[0], eye[1] - ctr[1], eye[2] - ctr[2]) * 0.97;

    gl.viewport(0, 0, W, H);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
    gl.useProgram(line.p);
    gl.uniformMatrix4fv(line.u.uVP, false, VP);
    gl.bindVertexArray(lineVao);
    gl.drawArrays(gl.LINE_LOOP, 0, 4);

    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
    gl.useProgram(draw.p);
    gl.uniformMatrix4fv(draw.u.uVP, false, VP);
    gl.uniform1f(draw.u.uPx, (H / (2 * Math.tan(fov / 2))) * P.grain);
    gl.uniform1f(draw.u.uFocus, focus);
    gl.uniform1f(draw.u.uTime, t % 97.0);
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

  return {
    controls: [
      { type: "range", key: "across", label: "Note across", min: 1, max: 8, step: 0.1, value: 3 },
      { type: "range", key: "along", label: "Note along", min: 2, max: 14, step: 0.1, value: 5 },
      { type: "range", key: "shake", label: "Shake", min: 0.2, max: 3, step: 0.05, value: 1 },
      {
        type: "range",
        key: "grain",
        label: "Grain size",
        min: 0.5,
        max: 2.5,
        step: 0.05,
        value: 1,
      },
      { type: "toggle", key: "pointer", label: "Pointer plays it", value: true },
      { type: "toggle", key: "wander", label: "Wander when left alone", value: true },
      { type: "action", key: "flip", label: "Turn it over" },
    ],
    set(key, value) {
      if (key === "across") {
        tn = value;
        nextAuto = performance.now() + 15000;
      } else if (key === "along") {
        tm = value;
        nextAuto = performance.now() + 15000;
      } else if (key === "flip") tsign = -tsign;
      else if (key in P) P[key] = value;
    },
    setSound,
    dispose,
  };
}
