// The reelhouse hero, drawn in code: a nine-blade lens iris in a projection booth, opening
// onto a warm lamp as the page scrolls. The blades turn as they open and their edges catch
// the light. Concept visual: procedural, one SVG per frame, encoded by rushes.

export const WIDTH = 1600;
export const HEIGHT = 1000;
export const FRAMES = 72;

const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const R = 360; // the blades' outer radius
const BLADES = 9;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const f = (n) => n.toFixed(1);

/** Where a ray from `p` along unit `d` leaves the circle of radius `r` about the centre. */
function exit(p, d, r) {
  const px = p[0] - CX;
  const py = p[1] - CY;
  const b = px * d[0] + py * d[1];
  const t = -b + Math.sqrt(Math.max(b * b - (px * px + py * py) + r * r, 0));
  return [p[0] + d[0] * t, p[1] + d[1] * t];
}

/** Points along the circle from angle `a1` to `a0`, the short way. */
function arc(a1, a0, r) {
  let delta = a0 - a1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const steps = Math.max(2, Math.ceil(Math.abs(delta) / 0.08));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a1 + (delta * i) / steps;
    return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
  });
}

const unit = (a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
};

/** SVG for frame `index` of `frames`. */
export function apertureFrame(index, frames = FRAMES) {
  const t = frames > 1 ? index / (frames - 1) : 0;
  const open = ease(t);
  const opening = R * (0.05 + 0.8 * open);
  const turn = 0.2 - 0.7 * open;
  const lamp = 0.25 + 0.75 * open;

  const vertices = Array.from({ length: BLADES }, (_, k) => {
    const a = turn + (k * 2 * Math.PI) / BLADES;
    return [CX + Math.cos(a) * opening, CY + Math.sin(a) * opening];
  });

  const parts = [
    "<defs>",
    `<radialGradient id="lamp" cx="${CX}" cy="${CY}" r="${R * 1.05}" gradientUnits="userSpaceOnUse">`,
    `<stop offset="0" stop-color="#fffaf0"/><stop offset="0.22" stop-color="#ffe7bf"/>`,
    `<stop offset="0.55" stop-color="#e9a457"/><stop offset="0.85" stop-color="#7a3a17"/>`,
    `<stop offset="1" stop-color="#1a0f0a"/></radialGradient>`,
    `<radialGradient id="spill" cx="${CX}" cy="${CY}" r="${WIDTH * 0.55}" gradientUnits="userSpaceOnUse">`,
    `<stop offset="0" stop-color="#f3c88e" stop-opacity="${(0.34 * lamp).toFixed(3)}"/>`,
    `<stop offset="0.45" stop-color="#b8743a" stop-opacity="${(0.1 * lamp).toFixed(3)}"/>`,
    `<stop offset="1" stop-color="#0d0c0b" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="blade" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0" stop-color="#2e2a26"/><stop offset="1" stop-color="#1c1a18"/></linearGradient>`,
    "</defs>",
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#0d0c0b"/>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#spill)"/>`,
  ];

  // Booth: faint concentric hairlines around the lens.
  for (let i = 1; i <= 6; i++) {
    parts.push(
      `<circle cx="${CX}" cy="${CY}" r="${f(R * 1.18 + i * 62)}" fill="none" stroke="#edeae4" stroke-opacity="${(0.05 - i * 0.006).toFixed(3)}" stroke-width="1"/>`,
    );
  }

  // The lamp behind the iris, brighter as it opens.
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#lamp)" opacity="${lamp.toFixed(3)}"/>`,
  );

  // Blades: each bounded by its inner edge, that edge carried on out to the rim, the rim,
  // and the previous edge carried on out to the rim.
  for (let k = 0; k < BLADES; k++) {
    const v0 = vertices[k];
    const v1 = vertices[(k + 1) % BLADES];
    const prev = vertices[(k + BLADES - 1) % BLADES];
    const s1 = exit(v1, unit(v0, v1), R);
    const s0 = exit(v0, unit(prev, v0), R);
    const rim = arc(Math.atan2(s1[1] - CY, s1[0] - CX), Math.atan2(s0[1] - CY, s0[0] - CX), R);
    const points = [v0, v1, ...rim];
    parts.push(
      `<path d="M${points.map((p) => `${f(p[0])} ${f(p[1])}`).join("L")}Z" fill="url(#blade)" opacity="${k % 2 === 0 ? 1 : 0.86}"/>`,
      // The inner edge catches the lamp; the seam runs dark out to the rim.
      `<line x1="${f(v0[0])}" y1="${f(v0[1])}" x2="${f(v1[0])}" y2="${f(v1[1])}" stroke="#ffd9a6" stroke-opacity="${(0.25 + 0.55 * open).toFixed(3)}" stroke-width="2"/>`,
      `<line x1="${f(v1[0])}" y1="${f(v1[1])}" x2="${f(s1[0])}" y2="${f(s1[1])}" stroke="#000" stroke-opacity="0.55" stroke-width="1.5"/>`,
    );
  }

  // Housing: a ring with knurled ticks, and a reflection arc on the glass.
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${R + 34}" fill="none" stroke="#161412" stroke-width="68"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${R + 1}" fill="none" stroke="#edeae4" stroke-opacity="0.18" stroke-width="1"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${R + 68}" fill="none" stroke="#edeae4" stroke-opacity="0.12" stroke-width="1"/>`,
  );
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * 2 * Math.PI + turn * 0.25;
    const r0 = R + 46;
    const r1 = R + (i % 10 === 0 ? 30 : 40);
    parts.push(
      `<line x1="${f(CX + Math.cos(a) * r0)}" y1="${f(CY + Math.sin(a) * r0)}" x2="${f(CX + Math.cos(a) * r1)}" y2="${f(CY + Math.sin(a) * r1)}" stroke="#edeae4" stroke-opacity="${i % 10 === 0 ? 0.32 : 0.12}" stroke-width="1"/>`,
    );
  }
  const g0 = -2.4;
  const g1 = -1.6;
  const gr = R * 0.9;
  parts.push(
    `<path d="M${f(CX + Math.cos(g0) * gr)} ${f(CY + Math.sin(g0) * gr)}A${gr} ${gr} 0 0 1 ${f(CX + Math.cos(g1) * gr)} ${f(CY + Math.sin(g1) * gr)}" fill="none" stroke="#fff" stroke-opacity="${(0.06 + 0.1 * open).toFixed(3)}" stroke-width="3" stroke-linecap="round"/>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${parts.join("")}</svg>`;
}
