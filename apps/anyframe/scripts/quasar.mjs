// The QUASAR reveal, drawn in code: a slow zoom through a starfield into a bright core
// with an accretion disk and two jets, seen through an instrument's field stop and
// reticle. Concept visual: procedural, not an astronomical image. One SVG per frame.
import geometry from "../src/scene/geometry.json" with { type: "json" };

const W = geometry.width;
const H = geometry.height;
const CX = W * geometry.core.x;
const CY = H * geometry.core.y;

/** Deterministic pseudo-random numbers, so every build draws the same stars. */
function random(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const rand = random(42);
const STARS = Array.from({ length: 420 }, () => ({
  x: rand() * W * 1.6 - W * 0.3,
  y: rand() * H * 1.6 - H * 0.3,
  r: 0.6 + rand() ** 3 * 2.4,
  a: 0.25 + rand() * 0.6,
}));

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** SVG for frame `index` of `frames`. */
export function quasarFrame(index, frames = geometry.frames) {
  const t = frames > 1 ? index / (frames - 1) : 0;
  const zoom = 1 + 5 * ease(t);
  const parts = [`<rect width="${W}" height="${H}" fill="#050505"/>`];

  // Stars drift outward from the core as the view zooms in.
  for (const star of STARS) {
    const x = CX + (star.x - CX) * zoom;
    const y = CY + (star.y - CY) * zoom;
    if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    const r = Math.min(star.r * (0.8 + zoom * 0.25), 5);
    parts.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#edeae4" fill-opacity="${star.a.toFixed(2)}"/>`,
    );
  }

  // The core: stepped halos (no gradient), the accretion disk, two jets.
  const k = 0.35 + 0.65 * ease(t);
  const disk = 150 * k;
  const jet = 380 * k;
  const angle = -58;
  parts.push(`<g transform="translate(${CX.toFixed(1)} ${CY.toFixed(1)}) rotate(${angle})">`);
  parts.push(
    `<path d="M-6 0 L-1.5 ${-jet} L1.5 ${-jet} L6 0 L1.5 ${jet} L-1.5 ${jet} Z" fill="#3fbead" fill-opacity="0.55"/>`,
  );
  parts.push(
    `<path d="M0 ${-jet * 0.15} V${-jet} M0 ${jet * 0.15} V${jet}" stroke="#edeae4" stroke-opacity="0.7" stroke-width="1.5"/>`,
  );
  for (let i = 0; i < 6; i++) {
    const rx = disk * (1 - i * 0.12);
    parts.push(
      `<ellipse rx="${rx.toFixed(1)}" ry="${(rx * 0.22).toFixed(1)}" fill="none" stroke="#3fbead" stroke-opacity="${(0.2 + i * 0.12).toFixed(2)}" stroke-width="${(1.2 + i * 0.3).toFixed(1)}" transform="rotate(${90 + t * 40})"/>`,
    );
  }
  parts.push(`</g>`);
  for (const [r, a] of [
    [46, 0.08],
    [32, 0.14],
    [21, 0.26],
    [13, 0.5],
  ]) {
    parts.push(
      `<circle cx="${CX}" cy="${CY}" r="${(r * k + 4).toFixed(1)}" fill="#edeae4" fill-opacity="${a}"/>`,
    );
  }
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${(6 + 3 * k).toFixed(1)}" fill="#ffffff"/>`);

  // Instrument view: field stop, reticle, ticks, readout, one Sindoor marker.
  const R = H * 0.62;
  parts.push(
    `<path d="M0 0H${W}V${H}H0Z M${CX - R} ${CY}a${R} ${R} 0 1 0 ${R * 2} 0a${R} ${R} 0 1 0 ${-R * 2} 0Z" fill="#050505" fill-opacity="0.82" fill-rule="evenodd"/>`,
  );
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#edeae4" stroke-opacity="0.35" stroke-width="1.5"/>`,
  );
  parts.push(
    `<path d="M${CX - R} ${CY}H${CX - 40} M${CX + 40} ${CY}H${CX + R} M${CX} ${CY - R}V${CY - 40} M${CX} ${CY + 40}V${CY + R}" stroke="#edeae4" stroke-opacity="0.3" stroke-width="1"/>`,
  );
  for (let i = -8; i <= 8; i++) {
    if (i === 0) continue;
    const len = i % 4 === 0 ? 14 : 7;
    parts.push(
      `<path d="M${CX + i * 40} ${CY - len / 2}V${CY + len / 2} M${CX - len / 2} ${CY + i * 40}H${CX + len / 2}" stroke="#edeae4" stroke-opacity="0.3"/>`,
    );
  }
  parts.push(`<circle cx="${CX + R * 0.71}" cy="${CY - R * 0.71}" r="6" fill="#c1440e"/>`);
  const mag = String(Math.round(40 * zoom)).padStart(3, "0");
  const frame = String(index + 1).padStart(3, "0");
  parts.push(
    `<text x="40" y="56" fill="#edeae4" fill-opacity="0.6" font-family="monospace" font-size="22">MAG ${mag}x  FRAME ${frame} / ${frames}</text>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
}
