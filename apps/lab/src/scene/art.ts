// A procedural image sequence: a jar turning on a hairline floor, drawn in code so the
// demos need no footage. Frames are 1600 x 900 source pixels; `t` (0 to 1) is the
// position in the sequence. The jar sits right of centre on purpose: that is the
// composition a centred crop gets wrong on a phone.

export const ART = { width: 1600, height: 900, frames: 120 } as const;

/** Where the jar is, normalised to the art. safeframe's scene uses the same numbers. */
export const JAR = {
  cx: 0.7,
  lidTop: 0.27,
  bodyTop: 0.35,
  bodyBottom: 0.76,
  halfWidth: 0.08,
  subject: { x: 0.61, y: 0.26, width: 0.18, height: 0.54 },
  focal: { x: 0.7, y: 0.52 },
} as const;

const TEAL = "#3fbead";
const SINDOOR = "#c1440e";
const INK = "#edeae4";

/** Draw frame `t` of the sequence at `width` x `height` pixels. */
export function drawArt(ctx: CanvasRenderingContext2D, width: number, height: number, t: number) {
  const sx = width / ART.width;
  const sy = height / ART.height;
  const W = ART.width;
  const H = ART.height;
  ctx.save();
  ctx.scale(sx, sy);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 1.5;

  // Floor: hairlines in perspective towards the jar.
  const horizon = H * 0.79;
  const vanishX = W * JAR.cx;
  ctx.strokeStyle = "rgb(63 190 173 / 0.22)";
  for (let i = 1; i <= 9; i++) {
    const y = horizon + (H - horizon) * (i / 9) ** 1.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(vanishX + i * 18, horizon);
    ctx.lineTo(vanishX + i * 260, H);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgb(237 234 228 / 0.2)";
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(W, horizon);
  ctx.stroke();

  // The jar.
  const cx = W * JAR.cx;
  const r = W * JAR.halfWidth;
  const lidR = r * 0.82;
  const top = H * JAR.bodyTop;
  const bottom = H * JAR.bodyBottom;
  const lidTop = H * JAR.lidTop;
  const ry = r * 0.16;

  ctx.fillStyle = "#0d0e0e";
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 2.5;
  // Contact shadow as a hairline ellipse.
  ctx.save();
  ctx.strokeStyle = "rgb(63 190 173 / 0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, bottom + ry * 0.4, r * 1.25, ry * 1.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Body.
  ctx.beginPath();
  ctx.moveTo(cx - r, top);
  ctx.lineTo(cx - r, bottom);
  ctx.ellipse(cx, bottom, r, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cx + r, top);
  ctx.ellipse(cx, top, r, ry, 0, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Lid.
  ctx.beginPath();
  ctx.moveTo(cx - lidR, lidTop);
  ctx.lineTo(cx - lidR, top - ry * 0.4);
  ctx.ellipse(cx, top - ry * 0.4, lidR, ry * 0.8, 0, Math.PI, 0, true);
  ctx.lineTo(cx + lidR, lidTop);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, lidTop, lidR, ry * 0.8, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Label band with stripes that travel round the jar as it turns.
  const bandTop = H * 0.46;
  const bandBottom = H * 0.63;
  ctx.strokeStyle = "rgb(237 234 228 / 0.35)";
  ctx.lineWidth = 1.5;
  for (const y of [bandTop, bandBottom]) {
    ctx.beginPath();
    ctx.ellipse(cx, y, r, ry, 0, 0, Math.PI);
    ctx.stroke();
  }
  const turn = t * Math.PI * 2;
  for (let k = 0; k < 12; k++) {
    const angle = turn + (k * Math.PI) / 6;
    const facing = Math.cos(angle);
    if (facing <= 0) continue;
    const x = cx + r * Math.sin(angle);
    ctx.strokeStyle = `rgb(63 190 173 / ${0.15 + facing * 0.6})`;
    ctx.beginPath();
    ctx.moveTo(x, bandTop + ry * facing);
    ctx.lineTo(x, bandBottom + ry * facing);
    ctx.stroke();
  }
  // The mark: one Sindoor dot, visible while it faces us.
  const mark = Math.cos(turn);
  if (mark > 0) {
    ctx.fillStyle = SINDOOR;
    ctx.beginPath();
    ctx.ellipse(
      cx + r * 0.9 * Math.sin(turn),
      (bandTop + bandBottom) / 2 + ry * mark,
      9 * mark + 2,
      9,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Burned-in slate: frame counter and corner marks, so every crop is visible.
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.55;
  ctx.font = "500 22px ui-monospace, 'DM Mono', monospace";
  const frame = String(Math.round(t * (ART.frames - 1)) + 1).padStart(3, "0");
  ctx.fillText(`FRAME ${frame} / ${ART.frames}`, 40, 56);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgb(237 234 228 / 0.5)";
  ctx.lineWidth = 2;
  const m = 24;
  const l = 48;
  for (const [x, y, dx, dy] of [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x + dx * l, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * l);
    ctx.stroke();
  }
  ctx.restore();
}
