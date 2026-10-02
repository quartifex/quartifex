// The safeframe demo's sequence: a wristwatch on a slate ground, drawn in code. The hands
// sweep and a light passes over the crystal as `t` runs 0 to 1. Like the jar, it sits right
// of centre on purpose, strap and all: a tall subject that a centred crop cuts on a phone. Same 1600 x 900 source as the jar art.
import { ART } from "./art";

/** Where the watch is, normalised to the art. */
export const WATCH = {
  cx: 0.69,
  cy: 0.5,
  /** Dial radius as a fraction of the art's height. */
  dial: 0.17,
  subject: { x: 0.585, y: 0.22, width: 0.21, height: 0.56 },
  focal: { x: 0.69, y: 0.5 },
} as const;

const STEEL = "#b9bcbf";
const FACE = "#ece7dc";
const INK = "#1d1e20";
const SINDOOR = "#c1440e";

/** Draw frame `t` of the watch sequence at `width` x `height` pixels. */
export function drawWatch(ctx: CanvasRenderingContext2D, width: number, height: number, t: number) {
  const W = ART.width;
  const H = ART.height;
  ctx.save();
  ctx.scale(width / W, height / H);
  // Slate ground with a soft pool of light (stepped rings, not a gradient).
  ctx.fillStyle = "#14171a";
  ctx.fillRect(0, 0, W, H);
  const cx = W * WATCH.cx;
  const cy = H * WATCH.cy;
  for (let i = 6; i >= 1; i--) {
    ctx.fillStyle = `rgb(${20 + i * 2} ${23 + i * 2} ${27 + i * 2})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, H * (0.1 + i * 0.09), H * (0.08 + i * 0.07), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const r = H * WATCH.dial;
  // Strap: two leather bands, top and bottom, stitched.
  const strapW = r * 1.05;
  ctx.fillStyle = "#3b2a20";
  ctx.fillRect(cx - strapW / 2, H * WATCH.subject.y, strapW, cy - H * WATCH.subject.y);
  ctx.fillRect(cx - strapW / 2, cy, strapW, H * (WATCH.subject.y + WATCH.subject.height) - cy);
  ctx.strokeStyle = "rgb(214 196 170 / 0.5)";
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  for (const dx of [-0.38, 0.38]) {
    ctx.beginPath();
    ctx.moveTo(cx + strapW * dx, H * WATCH.subject.y + 10);
    ctx.lineTo(cx + strapW * dx, H * (WATCH.subject.y + WATCH.subject.height) - 10);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Buckle holes on the lower strap.
  ctx.fillStyle = "#1b120d";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy + r * 1.6 + i * 34, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Case, crown and lugs.
  ctx.fillStyle = STEEL;
  ctx.fillRect(cx + r * 0.98, cy - 16, 26, 32);
  for (const sy of [-1, 1]) {
    ctx.fillRect(cx - strapW / 2 - 4, cy + sy * r * 0.82 - (sy < 0 ? 40 : 0), 14, 40);
    ctx.fillRect(cx + strapW / 2 - 10, cy + sy * r * 0.82 - (sy < 0 ? 40 : 0), 14, 40);
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8d9094";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.02, 0, Math.PI * 2);
  ctx.fill();

  // Dial with indices.
  ctx.fillStyle = FACE;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const long = i % 5 === 0;
    ctx.lineWidth = long ? 5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(
      cx + Math.sin(a) * r * (long ? 0.8 : 0.88),
      cy - Math.cos(a) * r * (long ? 0.8 : 0.88),
    );
    ctx.lineTo(cx + Math.sin(a) * r * 0.94, cy - Math.cos(a) * r * 0.94);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MERIDIAN", cx, cy - r * 0.38);
  ctx.font = "13px ui-monospace, monospace";
  ctx.fillText("FICTIONAL", cx, cy + r * 0.5);

  // Hands: the second hand sweeps once over the sequence, the minute hand a little.
  const hand = (angle: number, length: number, w: number, colour: string) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - Math.sin(angle) * r * 0.12, cy + Math.cos(angle) * r * 0.12);
    ctx.lineTo(cx + Math.sin(angle) * r * length, cy - Math.cos(angle) * r * length);
    ctx.stroke();
  };
  hand(Math.PI * 2 * (0.3 + t * 0.08), 0.55, 9, INK);
  hand(Math.PI * 2 * (0.1 + t * 0.6), 0.78, 6, INK);
  hand(Math.PI * 2 * t, 0.86, 2.5, SINDOOR);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();

  // A light sweeping over the crystal.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgb(255 255 255 / 0.16)";
  const sweep = cx - r * 1.6 + t * r * 3.2;
  ctx.beginPath();
  ctx.moveTo(sweep - 30, cy - r);
  ctx.lineTo(sweep + 50, cy - r);
  ctx.lineTo(sweep - 10, cy + r);
  ctx.lineTo(sweep - 90, cy + r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Burned-in slate, as on the jar sequence, so every crop is visible.
  ctx.fillStyle = "#edeae4";
  ctx.globalAlpha = 0.55;
  ctx.textAlign = "left";
  ctx.font = "500 22px ui-monospace, 'DM Mono', monospace";
  const frame = String(Math.round(t * (ART.frames - 1)) + 1).padStart(3, "0");
  ctx.fillText(`FRAME ${frame} / ${ART.frames}`, 40, 56);
  ctx.globalAlpha = 1;
  ctx.restore();
}
