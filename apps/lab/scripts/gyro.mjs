// The gyroscope used by the understudy demo, in one place for both of its forms: the angles
// of its three gimbal rings at a scroll position (read by the WebGL scene), and an SVG frame
// of the same pose (rendered by rushes into the image sequence the scene hands off to).

export const GYRO = {
  frames: 72,
  width: 1600,
  height: 900,
  /** Ring radii, outer to inner, and the rotor's. */
  rings: [1, 0.8, 0.6],
  rotor: 0.4,
  /** Height of the gimbal's centre above the ground. */
  centre: 1.35,
};

/** Angles in radians at progress p (0 to 1): outer about Y, middle about X, inner about Z. */
export function gyroAngles(p) {
  return {
    outer: p * Math.PI,
    middle: 0.5 + p * Math.PI * 1.5,
    inner: p * Math.PI * 2.5,
  };
}

const rx = (a) => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)];
const ry = (a) => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)];
const rz = (a) => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];
const mul = (a, b) =>
  [0, 1, 2].flatMap((r) =>
    [0, 1, 2].map((c) => a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]),
  );
const apply = (m, [x, y, z]) => [
  m[0] * x + m[1] * y + m[2] * z,
  m[3] * x + m[4] * y + m[5] * z,
  m[6] * x + m[7] * y + m[8] * z,
];

/** World matrices of the three rings (each a circle in its local XY plane), as the 3D scene nests them. */
export function gyroMatrices(p) {
  const a = gyroAngles(p);
  const outer = ry(a.outer);
  const middleFrame = mul(outer, rx(a.middle));
  const innerFrame = mul(middleFrame, rz(a.inner));
  return [outer, mul(middleFrame, ry(Math.PI / 2)), mul(innerFrame, rx(Math.PI / 2))];
}

/** One frame of the sequence as SVG: brass rings, a graphite stand, on a dark ground. */
export function gyroFrame(index, frames = GYRO.frames) {
  const p = frames > 1 ? index / (frames - 1) : 0;
  const { width: W, height: H } = GYRO;
  // A camera 6 units out and a little above, looking at the gimbal's centre.
  const elevation = 0.22;
  const cam = rx(elevation);
  const f = 1.45 * H;
  const project = ([x, y, z]) => {
    const [vx, vy, vz] = apply(cam, [x, y - GYRO.centre + 0.35, z]);
    const d = 6 - vz;
    return [W / 2 + (f * vx) / d, H * 0.52 - (f * vy) / d, d];
  };
  const parts = [];
  // Ground ellipse and the stand.
  const ground = [];
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    ground.push(project([Math.cos(t) * 1.6, 0, Math.sin(t) * 1.6]));
  }
  parts.push(
    `<polyline points="${ground.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}" fill="none" stroke="#2a2724" stroke-width="2"/>`,
  );
  const base = project([0, 0, 0]);
  const top = project([0, GYRO.centre - GYRO.rings[0], 0]);
  parts.push(
    `<line x1="${base[0]}" y1="${base[1]}" x2="${top[0]}" y2="${top[1]}" stroke="#3a3d40" stroke-width="18" stroke-linecap="round"/>`,
  );
  // Rings as short segments, farther ones dimmer, drawn far to near.
  const segments = [];
  gyroMatrices(p).forEach((m, ring) => {
    const r = GYRO.rings[ring];
    const n = 160;
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2;
      const local = apply(m, [Math.cos(t) * r, Math.sin(t) * r, 0]);
      const pt = project([local[0], local[1] + GYRO.centre, local[2]]);
      if (prev) segments.push({ a: prev, b: pt, depth: (prev[2] + pt[2]) / 2, ring });
      prev = pt;
    }
  });
  // The rotor: a disc in the inner ring's plane, drawn as its rim.
  segments.sort((s, t) => t.depth - s.depth);
  const colours = ["#c9a45c", "#b8924c", "#a8833f"];
  for (const s of segments) {
    const near = Math.min(1, Math.max(0, (7.2 - s.depth) / 2.4));
    const width = (16 - s.ring * 3) * (0.75 + near * 0.35);
    parts.push(
      `<line x1="${s.a[0].toFixed(1)}" y1="${s.a[1].toFixed(1)}" x2="${s.b[0].toFixed(1)}" y2="${s.b[1].toFixed(1)}" stroke="${colours[s.ring]}" stroke-opacity="${(0.35 + near * 0.65).toFixed(2)}" stroke-width="${width.toFixed(1)}" stroke-linecap="round"/>`,
    );
  }
  const centre = project([0, GYRO.centre, 0]);
  parts.push(`<circle cx="${centre[0]}" cy="${centre[1]}" r="16" fill="#3a3d40"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#08090a"/>${parts.join("")}<text x="40" y="${H - 40}" fill="#6f6c66" font-family="monospace" font-size="22" letter-spacing="3">GYROSCOPE · FRAME ${String(index + 1).padStart(2, "0")} / ${frames} · CONCEPT VISUAL</text></svg>`;
}
