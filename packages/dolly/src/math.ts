// Curve, easing and damping maths for dolly. Pure, no three.js: the spline is the same
// centripetal Catmull-Rom as three's CatmullRomCurve3, so paths look identical in both.

export type Vec3 = [number, number, number];

/** A named ease or a CSS-style cubic Bézier `[x1, y1, x2, y2]`. */
export type Ease = "linear" | "in" | "out" | "inOut" | [number, number, number, number];

const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

function bezier(x1: number, y1: number, x2: number, y2: number, x: number): number {
  // Solve x(t) = x by Newton's method, then evaluate y(t).
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = ((ax * t + bx) * t + cx) * t - x;
    const slope = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(err) < 1e-6 || slope === 0) break;
    t = clamp01(t - err / slope);
  }
  return ((ay * t + by) * t + cy) * t;
}

/** Apply an ease to `t` (0 to 1). */
export function ease(kind: Ease | undefined, t: number): number {
  const x = clamp01(t);
  if (!kind || kind === "linear") return x;
  if (kind === "in") return x * x * x;
  if (kind === "out") return 1 - (1 - x) ** 3;
  if (kind === "inOut") return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
  return bezier(kind[0], kind[1], kind[2], kind[3], x);
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);

/**
 * A point on a centripetal Catmull-Rom spline through `points` at `u` (0 to 1, evenly split
 * between points). Matches three's `CatmullRomCurve3(points, false, "centripetal").getPoint(u)`.
 */
export function catmullRom(points: readonly Vec3[], u: number): Vec3 {
  const n = points.length;
  if (n === 0) return [0, 0, 0];
  if (n === 1) return [...(points[0] as Vec3)];
  const p = (n - 1) * clamp01(u);
  let i = Math.floor(p);
  let w = p - i;
  if (i >= n - 1) {
    i = n - 2;
    w = 1;
  }
  const p1 = points[i] as Vec3;
  const p2 = points[i + 1] as Vec3;
  // Phantom end points, as three does: reflect the neighbour.
  const p0 = i > 0 ? (points[i - 1] as Vec3) : sub(p1, sub(p2, p1));
  const p3 = i + 2 < n ? (points[i + 2] as Vec3) : sub(p2, sub(p1, p2));
  let dt0 = len(sub(p1, p0)) ** 0.5;
  let dt1 = len(sub(p2, p1)) ** 0.5;
  let dt2 = len(sub(p3, p2)) ** 0.5;
  if (dt1 < 1e-4) dt1 = 1;
  if (dt0 < 1e-4) dt0 = dt1;
  if (dt2 < 1e-4) dt2 = dt1;
  const out: Vec3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const x0 = p0[k] as number;
    const x1 = p1[k] as number;
    const x2 = p2[k] as number;
    const x3 = p3[k] as number;
    let t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1;
    let t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2;
    t1 *= dt1;
    t2 *= dt1;
    const c0 = x1;
    const c1 = t1;
    const c2 = -3 * x1 + 3 * x2 - 2 * t1 - t2;
    const c3 = 2 * x1 - 2 * x2 + t1 + t2;
    out[k] = c0 + c1 * w + c2 * w * w + c3 * w * w * w;
  }
  return out;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

/** Frame-rate independent exponential smoothing (as three's MathUtils.damp). */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}
