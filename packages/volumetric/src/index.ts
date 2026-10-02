// @quartifex/volumetric (L30, Shaders & lighting). Volumetric light shafts (god-rays)
// through a translucent medium, in two variants that share one settings API and degrade
// together: a WebGL post-process for three.js and React Three Fiber scenes (./three,
// ./r3f), and a Canvas 2D overlay for image sequences and static heroes (./overlay,
// ./react). This core is plain maths: settings, colour temperature, tier-aware quality,
// the variant to use, the light's slow drift (fixed under reduced motion) and dust motes.
import { ease } from "@quartifex/dolly";
import type { GpuTier } from "@quartifex/resolve";
import type { Quality, Rung } from "@quartifex/understudy";

/** The look, shared by both variants. Every field is 0 to 1 unless stated. */
export type Settings = {
  /** How much light the shafts carry. */
  density: number;
  /** How far the shafts reach from the source before fading (the medium's thickness). */
  scatter: number;
  /** Colour temperature of the light in kelvin, 1500 (candle) to 12000 (blue sky). */
  temperature: number;
  /** Where the light comes from, as a fraction of the frame (x right, y down). May lie outside 0 to 1. */
  source: { x: number; y: number };
  /** Dust motes lit by the shafts. */
  dust: number;
  /** How much the light drifts over time (a slow sway of its source and a breathing density). */
  drift: number;
};

export const DEFAULTS: Settings = {
  density: 0.6,
  scatter: 0.7,
  temperature: 5200,
  source: { x: 0.18, y: -0.08 },
  dust: 0.5,
  drift: 0.4,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const unit = (v: number | undefined, fallback: number) =>
  clamp(Number.isFinite(v) ? (v as number) : fallback, 0, 1);

/** Fill in defaults and clamp every field to its range. */
export function resolveSettings(partial: Partial<Settings> = {}): Settings {
  return {
    density: unit(partial.density, DEFAULTS.density),
    scatter: unit(partial.scatter, DEFAULTS.scatter),
    temperature: clamp(partial.temperature ?? DEFAULTS.temperature, 1500, 12000),
    source: {
      x: clamp(partial.source?.x ?? DEFAULTS.source.x, -1, 2),
      y: clamp(partial.source?.y ?? DEFAULTS.source.y, -1, 2),
    },
    dust: unit(partial.dust, DEFAULTS.dust),
    drift: unit(partial.drift, DEFAULTS.drift),
  };
}

/**
 * Black-body colour for a temperature, as linear-ish RGB 0 to 1 (the widely used
 * Tanner Helland fit, good to a few percent between 1000 and 40000 K).
 */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = clamp(kelvin, 1000, 40000) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [r, g, b].map((v) => clamp(v, 0, 255) / 255) as [number, number, number];
}

/** The same colour as a CSS rgb() string. */
export function kelvinToCss(kelvin: number, alpha = 1): string {
  const [r, g, b] = kelvinToRgb(kelvin).map((v) => Math.round(v * 255));
  return alpha === 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${alpha})`;
}

export type QualityInput = {
  /** detect-gpu's tier, e.g. through `@quartifex/resolve/gpu`. Unknown is treated as tier 2. */
  gpuTier?: GpuTier;
  /** understudy's current quality, so the light steps down with the rest of the scene. */
  quality?: Pick<Quality, "post" | "particles">;
  reducedMotion?: boolean;
  saveData?: boolean;
};

export type VolumetricQuality = {
  /** Radial-blur samples per pixel in the WebGL pass. */
  samples: number;
  /** The WebGL shaft pass's resolution as a fraction of the canvas. */
  resolution: number;
  /** Shafts drawn by the canvas overlay. */
  beams: number;
  /** Dust motes, both variants (before `Settings.dust` scales them). */
  particles: number;
  /** Whether anything moves: false under reduced motion. */
  animate: boolean;
};

const SAMPLES = { 0: 16, 1: 24, 2: 48, 3: 72 } as const;
const RESOLUTION = { 0: 0.25, 1: 0.33, 2: 0.5, 3: 0.5 } as const;
const BEAMS = { 0: 5, 1: 7, 2: 9, 3: 11 } as const;
const PARTICLES = { 0: 40, 1: 90, 2: 180, 3: 320 } as const;

/**
 * Quality for a device: sample count, pass resolution, beams and particles by GPU tier, then
 * stepped down with understudy's quality (post-processing off halves the samples and lowers
 * the pass resolution; its particle fraction scales the dust). Save-Data halves the dust.
 */
export function qualityFor(input: QualityInput = {}): VolumetricQuality {
  const tier = input.gpuTier ?? 2;
  const post = input.quality?.post ?? true;
  const fraction = input.quality?.particles ?? 1;
  const samples = post ? SAMPLES[tier] : Math.max(12, Math.round(SAMPLES[tier] / 2));
  const resolution = post ? RESOLUTION[tier] : Math.min(RESOLUTION[tier], 0.33);
  const particles = Math.round(PARTICLES[tier] * fraction * (input.saveData ? 0.5 : 1));
  return {
    samples,
    resolution,
    beams: BEAMS[tier],
    particles,
    animate: !input.reducedMotion,
  };
}

/**
 * Which variant to draw: the WebGL pass while understudy's scene is on WebGL, the canvas
 * overlay when it has handed off to the image sequence or the poster (or without WebGL).
 */
export function variantFor(rung: Rung | undefined, webgl = true): "webgl" | "canvas" {
  return webgl && (rung === undefined || rung === "webgl") ? "webgl" : "canvas";
}

/**
 * The light at time `seconds`: the source sways a little and the density breathes, scaled
 * by `drift`. Under reduced motion it is the fixed, resting arrangement whatever the time.
 */
export function lightAt(
  settings: Settings,
  seconds: number,
  reducedMotion = false,
): { source: { x: number; y: number }; density: number } {
  if (reducedMotion || settings.drift === 0) {
    return { source: settings.source, density: settings.density };
  }
  // Slow, non-repeating-looking motion: two incommensurate periods, eased at the turns.
  const a = ease("inOut", (Math.sin(seconds / 7.3) + 1) / 2) * 2 - 1;
  const b = ease("inOut", (Math.sin(seconds / 11.9 + 1.3) + 1) / 2) * 2 - 1;
  const amount = settings.drift;
  return {
    source: { x: settings.source.x + a * 0.06 * amount, y: settings.source.y + b * 0.03 * amount },
    density: clamp(settings.density * (1 + 0.12 * amount * b), 0, 1),
  };
}

/** A dust mote: position in the frame (0 to 1), depth (0 near to 1 far), size and phase. */
export type Mote = { x: number; y: number; z: number; size: number; phase: number };

/** A small deterministic random generator (mulberry32), so every run draws the same dust. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` motes spread through the frame, the same every time for a seed. */
export function dustField(count: number, seed = 7): Mote[] {
  const next = random(seed);
  return Array.from({ length: Math.max(0, Math.round(count)) }, () => ({
    x: next(),
    y: next(),
    z: next(),
    size: 0.4 + next() * 0.6,
    phase: next() * Math.PI * 2,
  }));
}

/** Where a mote is at time `seconds`: a slow upward drift with a little side-to-side. Still under reduced motion. */
export function moteAt(
  mote: Mote,
  seconds: number,
  reducedMotion = false,
): { x: number; y: number } {
  if (reducedMotion) return { x: mote.x, y: mote.y };
  const speed = 0.004 + (1 - mote.z) * 0.008;
  const y = (((mote.y - seconds * speed) % 1) + 1) % 1;
  const x = mote.x + Math.sin(seconds * 0.4 + mote.phase) * 0.006;
  return { x, y };
}

/**
 * How lit a point is by shafts from `source`: strongest near the source and along a few
 * directions (the gaps between occluders), fading with distance by `scatter`. Used to light
 * dust in the canvas overlay; the WebGL pass samples its own shaft texture instead.
 */
export function shaftLight(
  point: { x: number; y: number },
  source: { x: number; y: number },
  settings: Pick<Settings, "density" | "scatter">,
  beams: readonly number[],
  aspect = 16 / 9,
): number {
  const dx = (point.x - source.x) * aspect;
  const dy = point.y - source.y;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  let along = 0;
  for (const beam of beams) {
    const d = Math.abs(Math.atan2(Math.sin(angle - beam), Math.cos(angle - beam)));
    along = Math.max(along, Math.max(0, 1 - d / 0.07));
  }
  const reach = 0.4 + settings.scatter * 1.6;
  const fade = Math.max(0, 1 - distance / reach);
  return clamp(along * fade * settings.density * 1.4, 0, 1);
}

/**
 * The beam directions (radians, in frame space with y down) for the overlay: spread across
 * the frame away from the source, the same for a seed.
 */
export function beamAngles(count: number, source: { x: number; y: number }, seed = 3): number[] {
  const next = random(seed);
  // Point the fan at the frame's centre.
  const centre = Math.atan2(0.5 - source.y, (0.5 - source.x) * (16 / 9));
  const spread = 1.1;
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    return centre + (t - 0.5) * spread + (next() - 0.5) * 0.08;
  });
}
