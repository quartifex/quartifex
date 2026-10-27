import { QX_D, qxDrawLogo } from "./qx-draw.js";

const root = document.documentElement;
const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const QX_D_ = QX_D;
var cl = (v, a, b) => Math.max(a, Math.min(b, v));
var seg = (t, a, d) => cl((t - a) / d, 0, 1);
var eOut3 = (t) => 1 - (1 - t) ** 3;
var eIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
var eIO4 = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2);
var eBack = (t) => {
  var c = 1.9;
  return t <= 0 ? 0 : 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
var lerp = (a, b, t) => a + (b - a) * t;

var D = QX_D_,
  C = 186,
  DIST = 900,
  W5 = D.W5 || 1778.64,
  W6 = D.W6 || 2660.4;
var ORDER = [];
for (var i = 0; i < D.sq.length; i++)
  if (D.mi.indexOf(i) < 0) ORDER.push({ s: D.sq[i], dd: (i - 10 + 12) % 12 });
ORDER.sort((a, b) => a.dd - b.dd);
var LETTER_BOTTOM = 0,
  LETTER_TOP = 1e9;
D.L.forEach((L) => {
  if (L.b[1] + L.b[3] > LETTER_BOTTOM && L.b[2] > 0) {
  }
});
(() => {
  var X = D.L[D.L.length - 1].b;
  LETTER_TOP = X[1];
  LETTER_BOTTOM = X[1] + X[3];
})();
var CS = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];
var FACES = [
  [0, 1, 2, 3],
  [5, 4, 7, 6],
  [4, 0, 3, 7],
  [1, 5, 6, 2],
  [4, 5, 1, 0],
  [3, 2, 6, 7],
];
var FN = [
  [0, 0, -1],
  [0, 0, 1],
  [-1, 0, 0],
  [1, 0, 0],
  [0, -1, 0],
  [0, 1, 0],
];
var LV = (() => {
  var l = [-0.55, -0.75, -0.38],
    m = Math.hypot(l[0], l[1], l[2]);
  return [l[0] / m, l[1] / m, l[2] / m];
})();

var px = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
px.canvas.width = px.canvas.height = 1;
function rgbOf(cssColor) {
  px.clearRect(0, 0, 1, 1);
  px.fillStyle = "#000";
  px.fillStyle = cssColor;
  px.fillRect(0, 0, 1, 1);
  var d = px.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}
function rgba(c, a) {
  return (
    "rgba(" +
    Math.round(c[0]) +
    "," +
    Math.round(c[1]) +
    "," +
    Math.round(c[2]) +
    "," +
    (a == null ? 1 : a) +
    ")"
  );
}
function mix(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/* one cube of the ring, with its own scale and roll */
function cube(ctx, s, sc, u, SQ, AC, dark) {
  var cx = s[0],
    cy = s[1],
    h = s[2] * sc,
    rot = s[3],
    phi = (Math.PI / 2) * eIO(u),
    m = Math.sin(Math.PI * u);
  var cr = Math.cos(rot),
    sr = Math.sin(rot),
    cp = Math.cos(phi),
    sp = Math.sin(phi);
  function tf(x, y, z) {
    var y1 = y * cp - z * sp,
      z1 = y * sp + z * cp;
    return [x * cr - y1 * sr, x * sr + y1 * cr, z1];
  }
  var V = [];
  for (var k = 0; k < 8; k++) {
    var q = tf(CS[k][0] * h, CS[k][1] * h, CS[k][2] * h),
      f = DIST / (DIST + h + q[2]);
    V.push([C + (cx + q[0] - C) * f, C + (cy + q[1] - C) * f]);
  }
  for (var fI = 0; fI < 6; fI++) {
    var P = FACES[fI].map((n) => V[n]),
      a = 0;
    for (var j = 0; j < 4; j++) {
      var p0 = P[j],
        p1 = P[(j + 1) % 4];
      a += p0[0] * p1[1] - p1[0] * p0[1];
    }
    if (a <= 0.01) continue;
    var n = tf(FN[fI][0], FN[fI][1], FN[fI][2]),
      diff = Math.max(0, n[0] * LV[0] + n[1] * LV[1] + n[2] * LV[2]);
    var g = dark ? 64 + 191 * diff ** 1.5 : 16 + 165 * diff ** 1.5;
    var col = mix(mix(SQ, [g, g, g], m), AC, m * 0.55);
    ctx.beginPath();
    ctx.moveTo(P[0][0], P[0][1]);
    for (j = 1; j < 4; j++) ctx.lineTo(P[j][0], P[j][1]);
    ctx.closePath();
    ctx.fillStyle = rgba(col);
    ctx.fill();
  }
}
function cursor(ctx, k, MK) {
  ctx.beginPath();
  for (var j = 0; j < D.N4.length; j += 2) {
    var x = C + (D.N4[j] - C) * k,
      y = C + (D.N4[j + 1] - C) * k;
    if (j === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(MK);
  ctx.fill();
}

/* progress: simulated for previews, real (images + fonts) for the first visit */
function makeProgress(real, LOAD) {
  var imgs = real ? Array.prototype.slice.call(document.images) : [],
    fontsOk = !real,
    t0 = performance.now();
  if (real && document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => {
      fontsOk = true;
    });
  else fontsOk = true;
  return (vt) => {
    var timeP = 1 - (1 - cl(vt / LOAD, 0, 1)) ** 1.6;
    if (!real) return timeP;
    var done = imgs.filter((im) => im.complete).length,
      tot = imgs.length + 1;
    var asset = (done + (fontsOk ? 1 : 0)) / tot;
    if (performance.now() - t0 > 4000) asset = 1;
    return Math.min(timeP, asset < 1 ? Math.min(0.94, asset + 0.3) : 1);
  };
}

function chrome(pl, label) {
  pl.insertAdjacentHTML(
    "beforeend",
    '<div class="pl-meta"><span class="pl-l">' +
      esc(label) +
      '</span><span class="pl-n"><b>000</b></span></div><i class="pl-bar"></i>',
  );
}
function setPr(pl, pr) {
  var n = Math.round(pr * 100);
  $(".pl-n b", pl).textContent = (n < 10 ? "00" : n < 100 ? "0" : "") + n;
  pl.style.setProperty("--pr", pr.toFixed(3));
}

/* ================= Quartifex / Lab ================= */
function runQx(pl, o) {
  var lab = o.brand === "lab",
    cv = document.createElement("canvas");
  pl.insertBefore(cv, pl.firstChild);
  chrome(pl, lab ? "Quartifex Lab" : "Quartifex");
  var ctx = cv.getContext("2d"),
    cs = getComputedStyle(pl),
    dark = cs.getPropertyValue("--is-dark").trim() === "1";
  var SQ = dark ? [244, 242, 238] : [11, 10, 10],
    MK = dark ? [237, 234, 228] : [35, 31, 32],
    AC = rgbOf(cs.getPropertyValue("--accent").trim() || "#E5002A");
  var params = {
    squareColor: dark ? "#F4F2EE" : "#0B0A0A",
    markColor: dark ? "#EDEAE4" : "#231F20",
    dark: dark,
    light: null,
  };
  var mono = cs.getPropertyValue("--mono") || "monospace";
  var W, H, dpr;
  function size() {
    var r = pl.getBoundingClientRect();
    W = r.width;
    H = r.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
  }
  size();
  var LOAD = 850,
    prog = makeProgress(o.real, LOAD),
    ta = ORDER.map(() => -1),
    tb = -1,
    tc = -1,
    td = -1,
    shown = 0;
  var labCap = (LETTER_BOTTOM - LETTER_TOP) * 0.5,
    labW = 0;
  if (lab) {
    ctx.font = "500 100px " + mono;
    var m = ctx.measureText("LAB");
    labW = (m.width / (m.actualBoundingBoxAscent || 70)) * labCap * 1.12;
  }
  var FULLW = W6 + (lab ? labW + 70 : 0);
  var rate = 1,
    vt = 0,
    last = performance.now(),
    pr = 0;
  return new Promise((res) => {
    o.skip = () => {
      rate = 5;
    };
    function frame(now) {
      var dt = Math.min(64, now - last);
      last = now;
      vt += (dt * rate) / o.slow;
      if (o.cancelled) return res();
      var target = prog(vt);
      pr += (target - pr) * Math.min(1, dt / 60);
      if (target >= 1 && pr > 0.995) pr = 1;
      if (tc < 0) setPr(pl, pr);
      ORDER.forEach((q, k) => {
        if (ta[k] < 0 && pr >= ((k + 1) / ORDER.length) * 0.97) ta[k] = vt;
      });
      if (tb < 0 && pr === 1 && ta[ORDER.length - 1] >= 0 && vt - ta[ORDER.length - 1] > 300)
        tb = vt;
      if (tb >= 0 && tc < 0 && vt - tb > 230) {
        tc = vt;
        pl.classList.add("set");
      }
      if (tc >= 0 && td < 0 && vt - tc > (lab ? 1150 : 950)) {
        td = vt;
        pl.classList.add("out");
      }
      if (td >= 0 && vt - td > 680) {
        res();
        return;
      }

      /* camera: the mark alone while loading, the whole name once it is set */
      var q = tb >= 0 ? eIO(seg(vt, tb + 150, 700)) : 0,
        p = tc >= 0 ? eIO4(seg(vt, tc + 260, 620)) : 0;
      var S0 = (Math.min(W, H) * (W < 600 ? 0.42 : 0.26)) / 372,
        S1 = Math.min(S0 * 0.9, (W * 0.8) / FULLW);
      var S = lerp(S0, S1, q),
        cxL = lerp(
          C,
          (lerp(W5, W6, p) + (lab ? (labW + 70) * eOut3(seg(vt, tc + 640, 380)) : 0)) / 2,
          q,
        );
      var lift = td >= 0 ? eIO(seg(vt, td, 640)) * -H * 0.06 : 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(
        S * dpr,
        0,
        0,
        S * dpr,
        (W / 2 - cxL * S) * dpr,
        (H / 2 - C * S + lift) * dpr,
      );

      /* squares land one by one, each with a quarter-turn roll */
      ORDER.forEach((q2, k) => {
        if (ta[k] < 0) return;
        var t = vt - ta[k];
        cube(ctx, q2.s, eBack(seg(t, 0, 300)), seg(t, 40, 520), SQ, AC, dark);
      });
      /* the cursor arrives and clicks */
      if (tb >= 0) {
        var kin = eOut3(seg(vt, tb, 200)),
          ck = seg(vt, tb + 200, 360),
          press = 1 - 0.1 * Math.sin(Math.PI * ck);
        ctx.globalAlpha = kin;
        cursor(ctx, (0.7 + 0.3 * kin) * press, MK);
        ctx.globalAlpha = 1;
        if (ck > 0 && ck < 1) {
          var r = eOut3(ck);
          ctx.beginPath();
          ctx.arc(C, C, lerp(8, 150, r), 0, 6.2832);
          ctx.strokeStyle = rgba(AC, 0.7 * (1 - r));
          ctx.lineWidth = lerp(10, 2, r);
          ctx.stroke();
        }
      }
      /* the name sets: QRTFX wipes in, then opens to QUARTIFEX */
      if (tc >= 0) {
        var w = eOut3(seg(vt, tc + 60, 440));
        ctx.save();
        ctx.beginPath();
        ctx.rect(2 * C + 30, -200, w * (W6 + 200), 800);
        ctx.clip();
        ctx.translate(0, (1 - w) * 40);
        qxDrawLogo(ctx, p, -1, params);
        ctx.restore();
        if (lab) {
          var lk = eOut3(seg(vt, tc + 640, 380));
          if (lk > 0) {
            ctx.save();
            ctx.globalAlpha = lk;
            ctx.fillStyle = rgba(AC);
            var fs = labCap / 0.72;
            ctx.font = "500 " + fs + "px " + mono;
            ctx.textBaseline = "alphabetic";
            if (ctx.letterSpacing !== undefined) ctx.letterSpacing = fs * 0.08 + "px";
            ctx.fillText("LAB", W6 + 70, LETTER_BOTTOM + (1 - lk) * 40);
            ctx.restore();
          }
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    o.resize = size;
  });
}

let active = null;
const isReduced = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches || root.dataset.motion === "reduce";

/** Plays the Quartifex preloader in `host`. Resolves when it has fully left. */
export function playPreloader(host, opts = {}) {
  if (active && active.host === host) {
    active.cancelled = true;
    if (active.el) active.el.remove();
  }
  const o = {
    host,
    brand: opts.brand || "quartifex",
    real: !!opts.real,
    slow: opts.slow || 1,
    fixed: !!opts.fixed,
  };
  const pl = document.createElement("div");
  pl.className = "pl" + (o.fixed ? " fixed" : "");
  pl.setAttribute("role", "status");
  pl.setAttribute("aria-label", "Loading");
  o.el = pl;
  active = o;
  host.appendChild(pl);
  if (o.fixed) root.classList.add("pl-lock");
  const skip = () => {
    if (o.skip) o.skip();
  };
  const evs = ["pointerdown", "keydown", "wheel", "touchstart"];
  const tgt = o.fixed ? window : pl;
  for (const ev of evs) tgt.addEventListener(ev, skip, { passive: true });
  const onRs = () => {
    if (o.resize) o.resize();
  };
  addEventListener("resize", onRs);
  let done;
  if (isReduced()) {
    pl.classList.add("calm");
    pl.innerHTML = '<div class="pl-calm"><canvas></canvas></div>';
    const c = $("canvas", pl),
      r = pl.getBoundingClientRect(),
      d = Math.min(devicePixelRatio || 1, 2),
      cw = Math.min(r.width * 0.7, 520);
    c.width = cw * d;
    c.height = (cw * d * 373) / 2661;
    c.style.width = cw + "px";
    const x = c.getContext("2d");
    x.scale(c.width / 2661, c.width / 2661);
    const dk = getComputedStyle(pl).getPropertyValue("--is-dark").trim() === "1";
    qxDrawLogo(x, 1, -1, {
      squareColor: dk ? "#F4F2EE" : "#0B0A0A",
      markColor: dk ? "#EDEAE4" : "#231F20",
      dark: dk,
      light: null,
    });
    done = new Promise((res) => {
      setTimeout(() => {
        pl.classList.add("out");
        setTimeout(res, 420);
      }, 650 * o.slow);
    });
  } else done = runQx(pl, o);
  return done.then(() => {
    for (const ev of evs) tgt.removeEventListener(ev, skip);
    removeEventListener("resize", onRs);
    if (!o.cancelled) pl.remove();
    if (o.fixed) root.classList.remove("pl-lock");
    if (active === o) active = null;
  });
}
