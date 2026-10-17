"use client";
// The four screens in the 3D cabin, drawn into canvases from the demo's live state. They are
// pictures of the interface at a distance (the real, accessible interface is the DOM panel),
// so they show layout and light, not readable detail: the module, what is playing, the time.
import { MODULE_BY_ID } from "@/content/modules";
import { MEDIA_BY_ID, SEAT_NAME, type SeatId, type System } from "@/demo/system";
import { colour } from "@/design/tokens";
import { SCREENS } from "@/stage/camera";

const c = colour.cabin;
const ACCENT = c.accent;

export function screenCanvasSize(seat: SeatId): [number, number] {
  const [w, h] = SCREENS[seat].size;
  const width = 640;
  return [width, Math.round((width * h) / w)];
}

function art(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  hue: number,
) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, `hsl(${hue} 22% 26%)`);
  g.addColorStop(1, `hsl(${hue} 30% 12%)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.12);
  ctx.fill();
}

/** Draw one seat's screen. `wake` 0 to 1 fades it up from black. */
export function drawScreen(
  ctx: CanvasRenderingContext2D,
  seat: SeatId,
  system: System,
  clock: string,
) {
  const { width: W, height: H } = ctx.canvas;
  const s = system.seats[seat];
  const driving = seat === "driver" && system.moving;
  ctx.save();
  ctx.fillStyle = c.surface;
  ctx.fillRect(0, 0, W, H);
  const pad = H * 0.08;
  const bar = H * 0.12;
  // Status bar.
  ctx.fillStyle = c.textMuted;
  ctx.font = `500 ${Math.round(bar * 0.62)}px Archivo, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(SEAT_NAME[seat].toUpperCase(), pad, pad + bar / 2);
  ctx.textAlign = "right";
  ctx.fillText(clock, W - pad, pad + bar / 2);
  ctx.textAlign = "left";

  if (system.sos.state !== "idle") {
    ctx.fillStyle = "#3a0f0c";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = c.danger;
    ctx.font = `600 ${Math.round(H * 0.34)}px Archivo, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(
      system.sos.state === "calling" ? "SOS" : String(system.sos.remaining),
      W / 2,
      H * 0.55,
    );
    ctx.restore();
    return;
  }

  const top = pad * 2 + bar;
  const bodyH = H - top - pad;
  const module = MODULE_BY_ID[s.module];
  const item = s.nowPlaying ? MEDIA_BY_ID[s.nowPlaying] : undefined;

  // Left rail of module dots (rear and co-pilot), or nothing for the driver while moving.
  const railW = driving ? 0 : W * 0.06;
  if (!driving) {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i === 0 ? ACCENT : "rgb(255 255 255 / 0.18)";
      ctx.beginPath();
      ctx.arc(
        pad + railW / 2,
        top + bodyH * (0.12 + i * 0.15),
        Math.max(3, W * 0.008),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  const x0 = pad + railW + (driving ? 0 : pad);
  const w0 = W - x0 - pad;

  if (driving) {
    // Two big tiles: the next turn and what is playing.
    ctx.fillStyle = c.raised;
    ctx.beginPath();
    ctx.roundRect(x0, top, w0 * 0.58, bodyH, H * 0.06);
    ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.font = `600 ${Math.round(bodyH * 0.3)}px Archivo, system-ui, sans-serif`;
    ctx.fillText("600 m", x0 + pad, top + bodyH * 0.4);
    ctx.fillStyle = c.text;
    ctx.font = `500 ${Math.round(bodyH * 0.14)}px Archivo, system-ui, sans-serif`;
    ctx.fillText("Ridge Lane", x0 + pad, top + bodyH * 0.72);
    ctx.fillStyle = c.raised;
    ctx.beginPath();
    ctx.roundRect(x0 + w0 * 0.61, top, w0 * 0.39, bodyH, H * 0.06);
    ctx.fill();
    if (item) art(ctx, x0 + w0 * 0.61 + pad, top + pad, bodyH - pad * 2, bodyH - pad * 2, item.hue);
  } else if (s.module === "media" && item) {
    art(ctx, x0, top, w0 * 0.62, bodyH, item.hue);
    ctx.fillStyle = "rgb(0 0 0 / 0.35)";
    ctx.fillRect(x0, top + bodyH - bodyH * 0.06, w0 * 0.62, bodyH * 0.06);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(x0, top + bodyH - bodyH * 0.06, w0 * 0.62 * s.progress, bodyH * 0.06);
    ctx.fillStyle = c.text;
    ctx.font = `600 ${Math.round(bodyH * 0.12)}px Archivo, system-ui, sans-serif`;
    ctx.fillText(item.title, x0 + w0 * 0.66, top + bodyH * 0.2);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgb(255 255 255 / 0.1)";
      ctx.beginPath();
      ctx.roundRect(x0 + w0 * 0.66, top + bodyH * (0.38 + i * 0.21), w0 * 0.34, bodyH * 0.16, 6);
      ctx.fill();
    }
  } else if (s.module === "journey") {
    ctx.fillStyle = "#0c1013";
    ctx.beginPath();
    ctx.roundRect(x0, top, w0, bodyH, H * 0.05);
    ctx.fill();
    ctx.strokeStyle = "rgb(255 255 255 / 0.1)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(x0, top + (bodyH * i) / 6);
      ctx.lineTo(x0 + w0, top + (bodyH * (i + 0.6)) / 6);
      ctx.stroke();
    }
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = Math.max(3, H * 0.025);
    ctx.beginPath();
    ctx.moveTo(x0 + w0 * 0.1, top + bodyH * 0.85);
    ctx.bezierCurveTo(
      x0 + w0 * 0.35,
      top + bodyH * 0.6,
      x0 + w0 * 0.5,
      top + bodyH * 0.7,
      x0 + w0 * 0.85,
      top + bodyH * 0.2,
    );
    ctx.stroke();
  } else {
    // Home and the rest: a grid of widgets, with what is playing in the large one.
    const gap = pad * 0.7;
    const tiles: Array<[number, number, number, number]> = [
      [0, 0, 0.55, 1],
      [0.55, 0, 0.45, 0.5],
      [0.55, 0.5, 0.45, 0.5],
    ];
    tiles.forEach(([tx, ty, tw, th], i) => {
      ctx.fillStyle = c.raised;
      ctx.beginPath();
      ctx.roundRect(
        x0 + tx * w0 + (tx ? gap / 2 : 0),
        top + ty * bodyH + (ty ? gap / 2 : 0),
        tw * w0 - gap / 2,
        th * bodyH - gap / 2,
        H * 0.05,
      );
      ctx.fill();
      if (i === 0 && item)
        art(ctx, x0 + pad * 0.6, top + pad * 0.6, bodyH * 0.55, bodyH * 0.55, item.hue);
    });
    ctx.fillStyle = c.text;
    ctx.font = `600 ${Math.round(bodyH * 0.11)}px Archivo, system-ui, sans-serif`;
    ctx.fillText(module.name, x0 + pad * 0.6, top + bodyH * 0.82);
  }

  // A share waiting on this screen.
  if (s.inbox.length) {
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.roundRect(W - pad - W * 0.32, H - pad - H * 0.18, W * 0.32, H * 0.18, H * 0.05);
    ctx.fill();
    ctx.fillStyle = c.onAccent;
    ctx.font = `600 ${Math.round(H * 0.075)}px Archivo, system-ui, sans-serif`;
    ctx.fillText("Sent to you", W - pad - W * 0.3, H - pad - H * 0.09);
  }
  ctx.restore();
}
