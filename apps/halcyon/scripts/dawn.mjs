// The halcyon hero, drawn in code: a bedroom window before sunrise. A bedside lamp on the
// sill warms first; the sky follows, and the sun clears a far ridge. Light falls through the
// panes onto the wall. Concept visual: procedural, one SVG per frame, encoded by rushes.

export const WIDTH = 1600;
export const HEIGHT = 1000;
export const FRAMES = 60;
/** Where the sun ends up, as a fraction of the frame: the light source for the shafts. */
export const SUN = { x: 0.62, y: 0.33 };

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp = (v) => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a + (b - a) * t;
const f = (n) => n.toFixed(1);

/** Blend two #rrggbb colours. */
function blend(a, b, t) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `#${pa
    .map((v, i) =>
      Math.round(mix(v, pb[i], t))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

// The window: four panes in a frame, left of centre.
const WIN = { x: 420, y: 130, w: 760, h: 700 };
const BAR = 26;
const SILL = WIN.y + WIN.h;

/** SVG for frame `index` of `frames`. */
export function dawnFrame(index, frames = FRAMES) {
  const t = frames > 1 ? index / (frames - 1) : 0;
  const lamp = ease(clamp(t / 0.55)); // the lamp leads
  const sky = ease(clamp((t - 0.15) / 0.85)); // the sky follows
  const sunUp = ease(clamp((t - 0.35) / 0.65)); // the sun last

  const top = blend("#0b1022", "#5a6f96", sky);
  const mid = blend("#1a1f3a", "#e9b88a", sky);
  const horizon = blend("#2a2440", "#ffcf96", sky);
  const sunX = WIDTH * SUN.x;
  const sunY = mix(HEIGHT * 0.86, HEIGHT * SUN.y, sunUp);
  const ridge = blend("#0c0f18", "#3d4258", sky * 0.8);
  const wall = blend("#100d0c", "#3a2a22", Math.max(lamp * 0.55, sky));
  const lampGlow = blend("#ff8a3a", "#ffe4c2", lamp);

  const parts = [
    "<defs>",
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="0.62" stop-color="${mid}"/><stop offset="1" stop-color="${horizon}"/></linearGradient>`,
    `<radialGradient id="sun" cx="${f(sunX)}" cy="${f(sunY)}" r="420" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffaf0" stop-opacity="${(0.95 * sunUp).toFixed(3)}"/><stop offset="0.06" stop-color="#fff1d6" stop-opacity="${(0.9 * sunUp).toFixed(3)}"/><stop offset="0.25" stop-color="#ffc98a" stop-opacity="${(0.4 * sunUp).toFixed(3)}"/><stop offset="1" stop-color="#ffc98a" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="lamp" cx="1260" cy="${SILL - 60}" r="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${lampGlow}" stop-opacity="${(0.55 * lamp).toFixed(3)}"/><stop offset="0.35" stop-color="${lampGlow}" stop-opacity="${(0.16 * lamp).toFixed(3)}"/><stop offset="1" stop-color="${lampGlow}" stop-opacity="0"/></radialGradient>`,
    `<clipPath id="panes"><rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}"/></clipPath>`,
    "</defs>",
    // The room.
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="${wall}"/>`,
    // Outside, seen through the window.
    `<g clip-path="url(#panes)">`,
    `<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" fill="url(#sky)"/>`,
    `<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" fill="url(#sun)"/>`,
    `<path d="M${WIN.x} ${SILL - 150} C ${WIN.x + 160} ${SILL - 210}, ${WIN.x + 300} ${SILL - 120}, ${WIN.x + 430} ${SILL - 170} S ${WIN.x + 650} ${SILL - 230}, ${WIN.x + WIN.w} ${SILL - 160} L ${WIN.x + WIN.w} ${SILL} L ${WIN.x} ${SILL} Z" fill="${ridge}"/>`,
    `<path d="M${WIN.x} ${SILL - 80} C ${WIN.x + 200} ${SILL - 120}, ${WIN.x + 420} ${SILL - 60}, ${WIN.x + WIN.w} ${SILL - 100} L ${WIN.x + WIN.w} ${SILL} L ${WIN.x} ${SILL} Z" fill="${blend("#07090f", "#262836", sky * 0.7)}"/>`,
    "</g>",
  ];

  // The floor, and sunlight through the window cast onto it: two bright quads split by the
  // shadow of the centre bar, widening towards the viewer.
  const floorY = 930;
  parts.push(
    `<rect x="0" y="${floorY}" width="${WIDTH}" height="${HEIGHT - floorY}" fill="${blend("#0c0a09", "#2e221c", Math.max(lamp * 0.4, sky * 0.8))}"/>`,
  );
  if (sunUp > 0) {
    const a = (0.3 * sunUp).toFixed(3);
    const cx = WIN.x + WIN.w / 2;
    for (const side of [-1, 1]) {
      const inner0 = cx + side * 14;
      const outer0 = cx + side * (WIN.w / 2 - 30);
      const inner1 = cx - 40 + side * 30;
      const outer1 = cx - 40 + side * (WIN.w / 2 + 110);
      parts.push(
        `<path d="M${f(inner0)} ${floorY} L${f(outer0)} ${floorY} L${f(outer1)} ${HEIGHT} L${f(inner1)} ${HEIGHT} Z" fill="#ffd9a8" opacity="${a}"/>`,
      );
    }
  }

  // The frame and its cross bars.
  const frame = blend("#07060a", "#1e1612", sky * 0.6);
  parts.push(
    `<rect x="${WIN.x - BAR}" y="${WIN.y - BAR}" width="${WIN.w + BAR * 2}" height="${WIN.h + BAR * 2}" fill="none" stroke="${frame}" stroke-width="${BAR * 2}"/>`,
    `<rect x="${WIN.x + WIN.w / 2 - BAR / 2}" y="${WIN.y}" width="${BAR}" height="${WIN.h}" fill="${frame}"/>`,
    `<rect x="${WIN.x}" y="${WIN.y + WIN.h * 0.45 - BAR / 2}" width="${WIN.w}" height="${BAR}" fill="${frame}"/>`,
    // The sill.
    `<rect x="${WIN.x - 90}" y="${SILL + BAR}" width="${WIN.w + 180}" height="30" fill="${blend("#0d0b0a", "#4a362b", Math.max(lamp * 0.5, sky * 0.8))}"/>`,
  );

  // The lamp on the bedside table, right of the window: a dome on a short stem.
  const lx = 1290;
  const base = SILL + BAR + 30;
  parts.push(
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#lamp)"/>`,
    `<rect x="1150" y="${base}" width="300" height="${HEIGHT - base}" fill="${blend("#0a0807", "#2a1d17", Math.max(lamp * 0.6, sky * 0.7))}"/>`,
    `<rect x="${lx - 4}" y="${base - 80}" width="8" height="80" fill="#1a1412"/>`,
    `<ellipse cx="${lx}" cy="${base - 2}" rx="46" ry="8" fill="#1a1412"/>`,
    `<path d="M${lx - 72} ${base - 78} A 72 72 0 0 1 ${lx + 72} ${base - 78} Z" fill="${blend("#3a2a20", lampGlow, lamp * 0.85)}"/>`,
    `<ellipse cx="${lx}" cy="${base - 78}" rx="72" ry="9" fill="${blend("#2a1d16", "#fff4e2", lamp)}"/>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${parts.join("")}</svg>`;
}
