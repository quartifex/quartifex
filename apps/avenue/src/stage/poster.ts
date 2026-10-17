// The car drawn in SVG from the same geometry as the 3D model: the poster painted on first
// paint (and the whole picture when there is no real-time 3D), the frames of the image-
// sequence fallback (a push in on the profile, then the cabin from above with its four
// screens waking), and the OG image. Plain TypeScript, so Node can run it at build time.
import { CAR, halfWidth, SEATS, type SeatId, sideProfile } from "../three/shape.ts";

const ACCENT = "#f0a640";
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const n = (v: number) => Number(v.toFixed(2));

export type PosterOptions = {
  width?: number;
  height?: number;
  /** 0 is the poster; 0 to 1 runs the sequence. */
  t?: number;
  /** A prefix for gradient ids, so several posters can share a page. */
  id?: string;
};

/** The profile at night, pushed in by `zoom` towards a point on the car (metres). */
function profile(
  W: number,
  H: number,
  zoom: number,
  push: number,
  focus: [number, number],
  id: string,
): string {
  const p = sideProfile(160);
  const scale = (W * 0.62) / CAR.length;
  const groundY = H * 0.74;
  // Metres to pixels: the car centred, standing on the ground line, its nose to the left.
  const ox = (W - CAR.length * scale) / 2;
  const fx = ox + focus[0] * scale;
  const fy = groundY - focus[1] * scale;
  // Zoom about the focus, drifting it towards the frame's centre as the push goes in.
  const toX = fx + (W / 2 - fx) * push;
  const toY = fy + (H * 0.5 - fy) * push;
  const shift = `translate(${n(toX)} ${n(toY)}) scale(${n(zoom)}) translate(${n(-fx)} ${n(-fy)})`;
  const meters = `translate(${n(ox)} ${n(groundY)}) scale(${n(scale)} ${n(-scale)})`;
  const wheels = p.wheels
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="${CAR.wheelRadius}" fill="#050506"/><circle cx="${x}" cy="${y}" r="${n(CAR.wheelRadius - 0.085)}" fill="none" stroke="#24272c" stroke-width="0.012"/><circle cx="${x}" cy="${y}" r="${n(CAR.wheelRadius * 0.3)}" fill="#141619"/>`,
    )
    .join("");
  return `<g transform="${shift}">
  <ellipse cx="${n(W / 2)}" cy="${n(groundY + 4)}" rx="${n(CAR.length * scale * 0.62)}" ry="${n(H * 0.035)}" fill="url(#${id}pool)"/>
  <g transform="${meters}">
    <path d="${p.body}" fill="url(#${id}body)"/>
    <path d="${p.glass}" fill="#040506" stroke="#1b1e22" stroke-width="0.008"/>
    <path d="${p.highlight}" fill="none" stroke="url(#${id}hl)" stroke-width="0.012" stroke-linecap="round"/>
    ${wheels}
    <rect x="-0.03" y="0.53" width="0.04" height="0.022" rx="0.01" fill="#fff6ea"/>
    <rect x="${n(CAR.length - 0.01)}" y="0.65" width="0.04" height="0.02" rx="0.01" fill="#ff3b2f"/>
  </g>
</g>`;
}

/** The cabin from above: the car's outline, four seats, and their screens waking in turn. */
function plan(W: number, H: number, wake: number, id: string): string {
  const scale = (H * 0.78) / CAR.length;
  const cx = W / 2;
  const cy = H * 0.5;
  // Rotated so the nose points up: x along the car maps to screen y.
  const X = (x: number) => n(cy - (CAR.length / 2 - x) * scale);
  const Z = (z: number) => n(cx - z * scale);
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const x = (i / 80) * CAR.length;
    left.push(`${Z(halfWidth(x))} ${X(x)}`);
    right.push(`${Z(-halfWidth(x))} ${X(x)}`);
  }
  const outline = `M${left.join(" L")} L${right.reverse().join(" L")} Z`;
  const seats = (Object.keys(SEATS) as SeatId[])
    .map((seat, i) => {
      const s = SEATS[seat];
      const lit = clamp01(wake * 4 - i);
      const [sx, , sz] = s.screen.center;
      const sw = s.screen.size[0];
      return `<rect x="${n(Number(Z(s.z)) - 0.27 * scale)}" y="${n(Number(X(s.x)) - 0.26 * scale)}" width="${n(0.54 * scale)}" height="${n(0.62 * scale)}" rx="${n(0.1 * scale)}" fill="#2a2420"/>
      <line x1="${Z(sz + sw / 2)}" y1="${X(sx)}" x2="${Z(sz - sw / 2)}" y2="${X(sx)}" stroke="${ACCENT}" stroke-opacity="${n(0.15 + lit * 0.85)}" stroke-width="${n(0.035 * scale)}" stroke-linecap="round"/>
      <ellipse cx="${n((Number(Z(sz + sw / 2)) + Number(Z(sz - sw / 2))) / 2)}" cy="${n(Number(X(sx)) + 0.18 * scale)}" rx="${n(sw * 0.7 * scale)}" ry="${n(0.22 * scale)}" fill="url(#${id}glow)" opacity="${n(lit)}"/>`;
    })
    .join("");
  return `<path d="${outline}" fill="#0a0b0d" stroke="#2a2d32" stroke-width="2"/>${seats}`;
}

/** One frame (or the poster) as an SVG document string. */
export function posterSvg({
  width = 1600,
  height = 900,
  t = 0,
  id = "av",
}: PosterOptions = {}): string {
  const W = width;
  const H = height;
  const push = ease(clamp01(t / 0.55));
  const zoom = 1 + push * 1.6;
  const cross = clamp01((t - 0.5) / 0.15);
  const wake = clamp01((t - 0.62) / 0.3);
  // Shafts from a high light behind and to the left of the car.
  const sx = W * 0.3;
  const sy = -H * 0.25;
  const shafts = [-0.36, -0.15, 0.05, 0.24]
    .map((a, i) => {
      const len = H * 1.6;
      const spread = 0.07 + (i % 2) * 0.045;
      const ax = sx + Math.sin(a - spread) * len;
      const ay = sy + Math.cos(a - spread) * len;
      const bx = sx + Math.sin(a + spread) * len;
      const by = sy + Math.cos(a + spread) * len;
      return `<path d="M${n(sx)} ${n(sy)} L${n(ax)} ${n(ay)} L${n(bx)} ${n(by)} Z" fill="url(#${id}shaft)" opacity="${n(0.28 + (i % 3) * 0.12)}"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
<defs>
  <radialGradient id="${id}bg" cx="0.42" cy="0.18" r="0.9"><stop offset="0" stop-color="#121316"/><stop offset="0.55" stop-color="#060708"/><stop offset="1" stop-color="#030304"/></radialGradient>
  <linearGradient id="${id}shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2df" stop-opacity="0.2"/><stop offset="0.45" stop-color="#fff2df" stop-opacity="0.04"/><stop offset="0.62" stop-color="#fff2df" stop-opacity="0"/></linearGradient>
  <radialGradient id="${id}pool"><stop offset="0" stop-color="#2a2a2c" stop-opacity="0.9"/><stop offset="1" stop-color="#0a0a0b" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id}body" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2c3036"/><stop offset="0.08" stop-color="#0d0f12"/><stop offset="0.7" stop-color="#090a0c"/><stop offset="1" stop-color="#050506"/></linearGradient>
  <linearGradient id="${id}hl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.75"/><stop offset="1" stop-color="#fff" stop-opacity="0.05"/></linearGradient>
  <radialGradient id="${id}glow"><stop offset="0" stop-color="${ACCENT}" stop-opacity="0.45"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#${id}bg)"/>
<g opacity="${n(1 - cross)}">${shafts}${profile(W, H, zoom, push, [3.4, 0.9], id)}</g>
${cross > 0 ? `<g opacity="${n(cross)}"><rect width="${W}" height="${H}" fill="#050506"/>${plan(W, H, wake, id)}</g>` : ""}
</svg>`;
}
