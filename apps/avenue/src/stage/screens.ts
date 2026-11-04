"use client";
// AVENUE's surfaces in the 3D cabin, drawn into canvases from the demo's live state: the driver
// display, the portrait centre display, the head-up display and the two rear headrest screens.
// They are the system as a passenger sees it across the cabin; the interactive, accessible
// interface is the DOM demo, and both read the same state.
import {
  JOURNEY,
  MEDIA_BY_ID,
  type MediaItem,
  SEAT_NAME,
  type SeatId,
  type System,
} from "@/demo/system";
import { SURFACES, type SurfaceId } from "@/stage/camera";

/** The palette of the screens: graphite, warm white, one blue for what is live. */
export const UI = {
  bg: "#08090b",
  surface: "#121418",
  raised: "#1b1e24",
  line: "rgba(255,255,255,0.08)",
  text: "#f3f4f6",
  muted: "#8e949e",
  faint: "#5d636d",
  accent: "#4d7dff",
  accentSoft: "rgba(77,125,255,0.16)",
  teal: "#3fd2b5",
  warm: "#ffb066",
  danger: "#ff4b3e",
};

export function surfacePixels(id: SurfaceId): [number, number] {
  return SURFACES[id].px;
}

let FAMILY = "Archivo, 'Helvetica Neue', Arial, sans-serif";
let MONO = "'DM Mono', ui-monospace, monospace";
if (typeof document !== "undefined") {
  const cs = getComputedStyle(document.documentElement);
  const d = cs.getPropertyValue("--font-display").trim();
  const m = cs.getPropertyValue("--font-mono").trim();
  if (d) FAMILY = `${d}, ${FAMILY}`;
  if (m) MONO = `${m}, ${MONO}`;
}
const font = (px: number, weight = 500, width = 100) =>
  `${weight} ${width !== 100 ? "" : ""}${px}px ${FAMILY}`;
const mono = (px: number, weight = 400) => `${weight} ${px}px ${MONO}`;

type C = CanvasRenderingContext2D;

const rr = (
  g: C,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
) => {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
};

const text = (
  g: C,
  s: string,
  x: number,
  y: number,
  f: string,
  colour: string,
  align: CanvasTextAlign = "left",
  base: CanvasTextBaseline = "alphabetic",
) => {
  g.font = f;
  g.fillStyle = colour;
  g.textAlign = align;
  g.textBaseline = base;
  g.fillText(s, x, y);
};

/** Cover art drawn from an item's hue and seed: soft bands of light, never a real cover. */
function art(
  g: C,
  x: number,
  y: number,
  w: number,
  h: number,
  item: MediaItem | undefined,
  r: number,
) {
  const hue = item?.hue ?? 220;
  const seed = item?.seed ?? 3;
  g.save();
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.clip();
  const base = g.createLinearGradient(x, y, x + w, y + h);
  base.addColorStop(0, `hsl(${hue} 46% 34%)`);
  base.addColorStop(1, `hsl(${(hue + 40) % 360} 52% 12%)`);
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  for (let i = 0; i < 4; i++) {
    const cx = x + w * (((seed * (i + 3) * 37) % 100) / 100);
    const cy = y + h * (((seed * (i + 5) * 53) % 100) / 100);
    const rad = Math.max(w, h) * (0.35 + ((seed * (i + 1)) % 5) * 0.08);
    const l = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
    l.addColorStop(0, `hsla(${(hue + i * 24) % 360} 80% 66% / 0.55)`);
    l.addColorStop(1, `hsla(${hue} 80% 50% / 0)`);
    g.fillStyle = l;
    g.fillRect(x, y, w, h);
  }
  g.restore();
}

/* ---------- icons, drawn as strokes on a 24-unit grid ---------- */
function icon(g: C, name: string, x: number, y: number, s: number, colour: string, width = 2) {
  g.save();
  g.translate(x, y);
  g.scale(s / 24, s / 24);
  g.strokeStyle = colour;
  g.fillStyle = colour;
  g.lineWidth = width;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  switch (name) {
    case "play":
      g.moveTo(8, 5);
      g.lineTo(19, 12);
      g.lineTo(8, 19);
      g.closePath();
      g.fill();
      break;
    case "pause":
      g.rect(7, 5, 3.5, 14);
      g.rect(13.5, 5, 3.5, 14);
      g.fill();
      break;
    case "next":
      g.moveTo(6, 6);
      g.lineTo(14, 12);
      g.lineTo(6, 18);
      g.closePath();
      g.fill();
      g.fillRect(16, 6, 2.5, 12);
      break;
    case "prev":
      g.moveTo(18, 6);
      g.lineTo(10, 12);
      g.lineTo(18, 18);
      g.closePath();
      g.fill();
      g.fillRect(5.5, 6, 2.5, 12);
      break;
    case "turn-left":
      g.moveTo(16, 21);
      g.lineTo(16, 12);
      g.quadraticCurveTo(16, 8, 12, 8);
      g.lineTo(6, 8);
      g.stroke();
      g.beginPath();
      g.moveTo(9.5, 4.5);
      g.lineTo(6, 8);
      g.lineTo(9.5, 11.5);
      g.stroke();
      break;
    case "fan":
      for (let k = 0; k < 3; k++) {
        g.save();
        g.translate(12, 12);
        g.rotate((k * Math.PI * 2) / 3);
        g.moveTo(0, 0);
        g.quadraticCurveTo(-1, -8, 4, -9);
        g.quadraticCurveTo(6, -4, 0, 0);
        g.restore();
      }
      g.fill();
      break;
    case "seat":
      g.moveTo(8, 3);
      g.quadraticCurveTo(6, 10, 8, 16);
      g.lineTo(17, 16);
      g.moveTo(8, 16);
      g.lineTo(7, 21);
      g.stroke();
      break;
    case "bolt":
      g.moveTo(13, 2);
      g.lineTo(5, 14);
      g.lineTo(11, 14);
      g.lineTo(10, 22);
      g.lineTo(19, 9);
      g.lineTo(13, 9);
      g.closePath();
      g.fill();
      break;
    case "screen":
      g.roundRect(3, 5, 18, 12, 2);
      g.moveTo(9, 20);
      g.lineTo(15, 20);
      g.stroke();
      break;
    case "send":
      g.moveTo(4, 12);
      g.lineTo(20, 4);
      g.lineTo(14, 20);
      g.lineTo(11, 13);
      g.closePath();
      g.stroke();
      break;
    case "pin":
      g.arc(12, 10, 6, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(12, 10, 2, 0, Math.PI * 2);
      g.fill();
      break;
    case "music":
      g.moveTo(9, 18);
      g.lineTo(9, 5);
      g.lineTo(19, 3);
      g.lineTo(19, 16);
      g.stroke();
      g.beginPath();
      g.arc(7, 18, 2.5, 0, Math.PI * 2);
      g.arc(17, 16, 2.5, 0, Math.PI * 2);
      g.fill();
      break;
  }
  g.restore();
}

/* ---------- the map: a drawn city, cached; the route over it ---------- */
let mapCache: HTMLCanvasElement | null = null;
function cityMap(w: number, h: number) {
  if (mapCache && mapCache.width === w && mapCache.height === h) return mapCache;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d") as C;
  g.fillStyle = "#0d1015";
  g.fillRect(0, 0, w, h);
  // the sea on the left, the city on the right
  g.fillStyle = "#0a1626";
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(w * 0.34, 0);
  g.bezierCurveTo(w * 0.22, h * 0.3, w * 0.4, h * 0.55, w * 0.26, h);
  g.lineTo(0, h);
  g.closePath();
  g.fill();
  let s = 7;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  g.strokeStyle = "#1c222b";
  g.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const x = w * (0.3 + rnd() * 0.75);
    const y = rnd() * h;
    const a = (rnd() > 0.5 ? 0 : Math.PI / 2) + (rnd() - 0.5) * 0.5;
    const l = 60 + rnd() * 260;
    g.lineWidth = 2 + rnd() * 5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // blocks
  g.fillStyle = "#12161c";
  for (let i = 0; i < 90; i++)
    g.fillRect(w * (0.32 + rnd() * 0.7), rnd() * h, 16 + rnd() * 40, 12 + rnd() * 30);
  mapCache = c;
  return c;
}

function route(g: C, x: number, y: number, w: number, h: number, progress: number) {
  const pts: [number, number][] = [
    [0.62, 1.05],
    [0.6, 0.82],
    [0.46, 0.66],
    [0.4, 0.46],
    [0.44, 0.26],
    [0.36, 0.08],
    [0.3, -0.05],
  ];
  const P = pts.map(([a, b]) => [x + a * w, y + b * h] as [number, number]);
  g.save();
  g.lineJoin = "round";
  g.lineCap = "round";
  g.shadowColor = UI.accent;
  g.shadowBlur = 18;
  g.strokeStyle = UI.accent;
  g.lineWidth = 9;
  g.beginPath();
  for (const [i, [px, py]] of P.entries()) {
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.stroke();
  g.restore();
  // the car, a little way along
  const i = Math.min(P.length - 2, Math.floor(progress * (P.length - 1)));
  const f = progress * (P.length - 1) - i;
  const a = P[i] as [number, number];
  const b = P[i + 1] as [number, number];
  const cx = a[0] + (b[0] - a[0]) * f;
  const cy = a[1] + (b[1] - a[1]) * f;
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(cx, cy, 13, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = UI.accent;
  g.beginPath();
  g.arc(cx, cy, 7, 0, Math.PI * 2);
  g.fill();
}

const playingOf = (system: System, seat: SeatId) => {
  const s = system.seats[seat];
  return s.nowPlaying ? MEDIA_BY_ID[s.nowPlaying] : undefined;
};

const statusBar = (g: C, w: number, clock: string, s: number, right = "78%") => {
  text(g, clock, 34 * s, 46 * s, font(26 * s, 600), UI.text);
  text(g, right, w - 34 * s, 46 * s, font(24 * s, 500), UI.muted, "right");
};

/* ---------- the centre display: map, media, the car, climate ---------- */
function centre(g: C, w: number, h: number, system: System, clock: string) {
  const s = w / 860;
  g.fillStyle = UI.bg;
  g.fillRect(0, 0, w, h);
  statusBar(g, w, clock, s, "78 %  ·  312 km");
  // map card
  const mx = 20 * s;
  const my = 70 * s;
  const mw = w - 40 * s;
  const mh = 640 * s;
  g.save();
  g.beginPath();
  g.roundRect(mx, my, mw, mh, 34 * s);
  g.clip();
  g.drawImage(cityMap(Math.round(mw), Math.round(mh)), mx, my);
  route(g, mx, my, mw, mh, 0.3);
  g.restore();
  // next turn
  rr(g, mx + 22 * s, my + 22 * s, mw - 44 * s, 132 * s, 26 * s, "rgba(18,20,24,0.92)");
  rr(g, mx + 40 * s, my + 40 * s, 96 * s, 96 * s, 22 * s, UI.accent);
  icon(g, "turn-left", mx + 52 * s, my + 52 * s, 72 * s, "#fff", 2.6);
  text(g, JOURNEY.next.distance, mx + 160 * s, my + 86 * s, font(46 * s, 650), UI.text);
  text(
    g,
    `${JOURNEY.next.action} · ${JOURNEY.next.road}`,
    mx + 160 * s,
    my + 124 * s,
    font(26 * s, 500),
    UI.muted,
  );
  // eta
  rr(g, mx + mw - 262 * s, my + mh - 112 * s, 240 * s, 90 * s, 24 * s, "rgba(18,20,24,0.92)");
  text(g, JOURNEY.arrive, mx + mw - 240 * s, my + mh - 54 * s, font(40 * s, 650), UI.text);
  text(
    g,
    `${JOURNEY.etaMinutes} min`,
    mx + mw - 44 * s,
    my + mh - 54 * s,
    font(24 * s, 500),
    UI.teal,
    "right",
  );

  // now playing
  const item = playingOf(system, "driver");
  const py = 730 * s;
  rr(g, mx, py, mw, 220 * s, 34 * s, UI.surface);
  art(g, mx + 24 * s, py + 24 * s, 172 * s, 172 * s, item, 22 * s);
  text(g, item?.title ?? "Nothing playing", mx + 224 * s, py + 78 * s, font(36 * s, 650), UI.text);
  text(
    g,
    item?.by ?? "Choose something from Media",
    mx + 224 * s,
    py + 118 * s,
    font(24 * s, 500),
    UI.muted,
  );
  const prog = system.seats.driver.progress;
  rr(g, mx + 224 * s, py + 150 * s, mw - 272 * s, 6 * s, 3 * s, UI.raised);
  rr(g, mx + 224 * s, py + 150 * s, (mw - 272 * s) * prog, 6 * s, 3 * s, UI.text);
  icon(g, "prev", mx + 224 * s, py + 168 * s, 34 * s, UI.muted);
  icon(
    g,
    system.seats.driver.playing ? "pause" : "play",
    mx + 290 * s,
    py + 164 * s,
    42 * s,
    UI.text,
  );
  icon(g, "next", mx + 364 * s, py + 168 * s, 34 * s, UI.muted);

  // tiles: what the rest of the car is doing
  const ty = 970 * s;
  const tw = (mw - 3 * 16 * s) / 4;
  const rl = playingOf(system, "rearLeft");
  const rrr = playingOf(system, "rearRight");
  const tiles: [string, string, string, string][] = [
    ["screen", "Rear left", rl?.title ?? "Home", UI.accent],
    ["screen", "Rear right", rrr?.title ?? "Home", UI.accent],
    ["bolt", "Charge", "78 %", UI.teal],
    ["seat", "Seats", system.massage.driver ? "Massage on" : "Comfort", UI.warm],
  ];
  tiles.forEach(([ic, a, b, col], i) => {
    const tx = mx + i * (tw + 16 * s);
    rr(g, tx, ty, tw, 168 * s, 28 * s, UI.surface);
    icon(g, ic, tx + 22 * s, ty + 22 * s, 36 * s, col);
    text(g, a, tx + 22 * s, ty + 104 * s, font(22 * s, 500), UI.muted);
    g.save();
    g.beginPath();
    g.rect(tx, ty, tw - 14 * s, 168 * s);
    g.clip();
    text(g, b, tx + 22 * s, ty + 138 * s, font(25 * s, 650), UI.text);
    g.restore();
  });

  // climate bar
  const cy = h - 160 * s;
  rr(g, mx, cy, mw, 136 * s, 34 * s, UI.surface);
  const tz = (seat: SeatId) => `${system.zones[seat].temp.toFixed(1)}°`;
  text(g, tz("driver"), mx + 36 * s, cy + 88 * s, font(52 * s, 600), UI.text);
  text(g, tz("copilot"), mx + mw - 36 * s, cy + 88 * s, font(52 * s, 600), UI.text, "right");
  icon(g, "fan", mx + mw / 2 - 26 * s, cy + 34 * s, 52 * s, UI.muted);
  text(
    g,
    system.syncRear ? "SYNC" : "AUTO",
    mx + mw / 2,
    cy + 116 * s,
    mono(18 * s, 500),
    UI.faint,
    "center",
  );
}

/* ---------- the driver display: speed, the next turn, the battery ---------- */
function cluster(g: C, w: number, h: number, system: System) {
  const s = h / 400;
  g.fillStyle = UI.bg;
  g.fillRect(0, 0, w, h);
  const moving = system.moving;
  // speed
  text(g, moving ? "64" : "0", 60 * s, 250 * s, font(170 * s, 600), UI.text);
  text(g, "km/h", 64 * s, 300 * s, font(30 * s, 500), UI.muted);
  text(g, moving ? "D" : "P", 64 * s, 92 * s, font(34 * s, 650), moving ? UI.text : UI.warm);
  text(g, moving ? "Drive" : "Parked", 104 * s, 92 * s, font(26 * s, 500), UI.muted);
  // next turn, in the middle
  const cx = w / 2;
  rr(g, cx - 210 * s, 70 * s, 420 * s, 260 * s, 40 * s, UI.surface);
  icon(g, "turn-left", cx - 55 * s, 98 * s, 110 * s, UI.accent, 2.4);
  text(g, JOURNEY.next.distance, cx, 262 * s, font(56 * s, 650), UI.text, "center");
  text(g, JOURNEY.next.road, cx, 304 * s, font(26 * s, 500), UI.muted, "center");
  // battery and range
  const bx = w - 360 * s;
  text(g, "78 %", w - 60 * s, 150 * s, font(80 * s, 600), UI.text, "right");
  text(g, "312 km range", w - 60 * s, 196 * s, font(26 * s, 500), UI.muted, "right");
  rr(g, bx, 236 * s, 300 * s, 12 * s, 6 * s, UI.raised);
  rr(g, bx, 236 * s, 300 * s * 0.78, 12 * s, 6 * s, UI.teal);
  const item = playingOf(system, "driver");
  if (item) {
    icon(g, "music", bx, 288 * s, 28 * s, UI.muted);
    text(g, item.title, bx + 42 * s, 312 * s, font(24 * s, 500), UI.muted);
  }
}

/* ---------- the head-up display: light only, floating over the bonnet ---------- */
function hud(g: C, w: number, h: number, system: System) {
  const s = h / 360;
  g.clearRect(0, 0, w, h);
  const col = "rgba(214,236,255,0.95)";
  text(g, system.moving ? "64" : "0", w * 0.2, 222 * s, font(130 * s, 600), col, "center");
  text(g, "km/h", w * 0.2, 276 * s, font(30 * s, 500), "rgba(214,236,255,0.6)", "center");
  icon(g, "turn-left", w * 0.5 - 70 * s, 70 * s, 140 * s, "rgba(140,190,255,0.95)", 2.2);
  text(g, JOURNEY.next.distance, w * 0.8, 200 * s, font(84 * s, 600), col, "center");
  text(
    g,
    JOURNEY.next.road,
    w * 0.8,
    260 * s,
    font(30 * s, 500),
    "rgba(214,236,255,0.6)",
    "center",
  );
}

/* ---------- a rear screen: the seat's own lounge ---------- */
function rear(g: C, w: number, h: number, system: System, seat: SeatId, clock: string) {
  const s = w / 1280;
  g.fillStyle = UI.bg;
  g.fillRect(0, 0, w, h);
  const item = playingOf(system, seat);
  const st = system.seats[seat];
  // the art fills the left, fading into the screen
  art(g, 0, 0, w * 0.62, h, item, 0);
  const fade = g.createLinearGradient(w * 0.3, 0, w * 0.62, 0);
  fade.addColorStop(0, "rgba(8,9,11,0)");
  fade.addColorStop(1, UI.bg);
  g.fillStyle = fade;
  g.fillRect(w * 0.3, 0, w * 0.33, h);
  const fade2 = g.createLinearGradient(0, h * 0.45, 0, h);
  fade2.addColorStop(0, "rgba(8,9,11,0)");
  fade2.addColorStop(1, "rgba(8,9,11,0.92)");
  g.fillStyle = fade2;
  g.fillRect(0, h * 0.45, w * 0.62, h * 0.55);
  text(g, SEAT_NAME[seat], 52 * s, 76 * s, font(30 * s, 600), UI.text);
  text(g, clock, w - 52 * s, 76 * s, font(30 * s, 600), UI.text, "right");
  text(
    g,
    item ? (item.video ? "Watching" : "Listening") : "Ready",
    52 * s,
    h - 250 * s,
    mono(24 * s, 500),
    "rgba(255,255,255,0.7)",
  );
  text(g, item?.title ?? "Your screen", 52 * s, h - 176 * s, font(76 * s, 650), UI.text);
  text(
    g,
    item?.by ?? "Films, music and the journey",
    52 * s,
    h - 126 * s,
    font(32 * s, 500),
    "rgba(255,255,255,0.72)",
  );
  rr(g, 52 * s, h - 86 * s, 620 * s, 8 * s, 4 * s, "rgba(255,255,255,0.18)");
  rr(g, 52 * s, h - 86 * s, 620 * s * st.progress, 8 * s, 4 * s, "#fff");
  // right column: journey, climate, the seat
  const rx = w * 0.66;
  const cw = w - rx - 52 * s;
  rr(g, rx, 120 * s, cw, 190 * s, 32 * s, UI.surface);
  icon(g, "pin", rx + 30 * s, 150 * s, 40 * s, UI.accent);
  text(g, JOURNEY.to, rx + 88 * s, 182 * s, font(36 * s, 650), UI.text);
  text(g, `Arrive ${JOURNEY.arrive}`, rx + 30 * s, 250 * s, font(28 * s, 500), UI.muted);
  text(
    g,
    `${JOURNEY.etaMinutes} min`,
    rx + cw - 30 * s,
    250 * s,
    font(28 * s, 600),
    UI.teal,
    "right",
  );
  rr(g, rx, 330 * s, cw, 190 * s, 32 * s, UI.surface);
  text(
    g,
    `${system.zones[seat].temp.toFixed(1)}°`,
    rx + 30 * s,
    446 * s,
    font(84 * s, 600),
    UI.text,
  );
  icon(g, "fan", rx + cw - 92 * s, 380 * s, 60 * s, UI.muted);
  text(g, "Your zone", rx + 30 * s, 490 * s, font(24 * s, 500), UI.muted);
  rr(g, rx, 540 * s, cw, 140 * s, 32 * s, UI.surface);
  icon(g, "send", rx + 30 * s, 584 * s, 44 * s, UI.text);
  text(g, "Share to the front", rx + 96 * s, 618 * s, font(28 * s, 600), UI.text);
  // something sent from another seat
  const share = st.inbox[0];
  if (share) {
    rr(g, rx - 20 * s, 700 * s, cw + 20 * s, 80 * s, 26 * s, UI.accent);
    text(
      g,
      `From ${SEAT_NAME[share.from]}: ${share.title}`,
      rx + 10 * s,
      750 * s,
      font(24 * s, 650),
      "#fff",
    );
  }
}

/** Draw one surface. */
export function drawSurface(g: C, id: SurfaceId, system: System, clock: string) {
  const [w, h] = SURFACES[id].px;
  g.save();
  if (system.sos.state !== "idle" && id !== "hud") {
    g.fillStyle = "#1a0606";
    g.fillRect(0, 0, w, h);
    text(g, "Emergency SOS", w / 2, h * 0.42, font(h * 0.08, 650), UI.danger, "center");
    text(
      g,
      system.sos.state === "calling"
        ? "Calling emergency services"
        : `Calling in ${system.sos.remaining} s`,
      w / 2,
      h * 0.56,
      font(h * 0.05, 500),
      UI.text,
      "center",
    );
    g.restore();
    return;
  }
  if (id === "centre") centre(g, w, h, system, clock);
  else if (id === "cluster") cluster(g, w, h, system);
  else if (id === "hud") hud(g, w, h, system);
  else rear(g, w, h, system, id, clock);
  g.restore();
}
