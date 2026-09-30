// Scene staging: which part of the source art a viewport shows, where the subject and
// focal point land, and which text zone stays clear of the subject. Pure functions.

/** A rectangle. Normalised (0 to 1) in scene definitions; pixels in results. */
export type Box = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export type Bucket = {
  name: string;
  /** True when a viewport of this size belongs to the bucket. Buckets are tried in order. */
  test(size: Size): boolean;
};

const aspectOf = ({ width, height }: Size) => width / Math.max(height, 1);

/**
 * The default aspect buckets, tried in order. Aspect is width / height.
 * Override with your own list when a design has different break points.
 */
export const DEFAULT_BUCKETS: readonly Bucket[] = [
  { name: "phone-landscape", test: (s) => aspectOf(s) > 1.2 && s.height <= 500 },
  { name: "ultrawide", test: (s) => aspectOf(s) >= 2.1 },
  { name: "tall-phone", test: (s) => aspectOf(s) < 0.8 && s.width < 600 },
  { name: "tablet", test: (s) => s.width <= 1024 || aspectOf(s) < 1.25 },
  { name: "laptop", test: (s) => s.width < 1680 },
  { name: "desktop", test: () => true },
];

/** The first bucket whose test matches, or the last bucket. */
export function bucketFor(size: Size, buckets: readonly Bucket[] = DEFAULT_BUCKETS): string {
  const match = buckets.find((bucket) => bucket.test(size)) ?? buckets[buckets.length - 1];
  if (!match) throw new Error("safeframe: the bucket list is empty");
  return match.name;
}

/** Per-bucket art direction. Anything left out falls back to the scene's defaults. */
export type Staging = {
  /** Where the eye should land, normalised to the source art. */
  focal?: Point;
  /** What must stay in view, normalised to the source art. */
  subject?: Box;
  /** Extra space kept around the subject, as a fraction of the subject's size. */
  padding?: number;
  /** Zoom past "cover" (1 = cover). */
  zoom?: number;
  /** Candidate places for overlay copy, normalised to the viewport. The first clear one wins. */
  textZones?: Box[];
};

export type Scene<Extra = unknown> = Required<Pick<Staging, "focal" | "subject">> &
  Omit<Staging, "focal" | "subject"> & {
    /** Source art size in pixels (an image-sequence frame, a render). */
    width: number;
    height: number;
    buckets?: Partial<Record<string, Staging & Extra>>;
  };

function assertUnit(label: string, value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`safeframe: ${label} must be between 0 and 1, got ${value}`);
  }
}

function assertBox(label: string, box: Box) {
  for (const key of ["x", "y", "width", "height"] as const) assertUnit(`${label}.${key}`, box[key]);
  if (box.x + box.width > 1.0001 || box.y + box.height > 1.0001) {
    throw new RangeError(`safeframe: ${label} runs past the edge of the frame`);
  }
}

function assertStaging(label: string, staging: Staging) {
  if (staging.focal) {
    assertUnit(`${label}focal.x`, staging.focal.x);
    assertUnit(`${label}focal.y`, staging.focal.y);
  }
  if (staging.subject) assertBox(`${label}subject`, staging.subject);
  for (const [i, zone] of (staging.textZones ?? []).entries()) {
    assertBox(`${label}textZones[${i}]`, zone);
  }
  if (staging.zoom !== undefined && !(staging.zoom >= 1)) {
    throw new RangeError(`safeframe: ${label}zoom must be 1 or more`);
  }
}

/** Check a scene once, up front, so mistakes surface as clear errors instead of odd crops. */
export function defineScene<Extra = unknown>(scene: Scene<Extra>): Scene<Extra> {
  if (!(scene.width > 0 && scene.height > 0)) {
    throw new RangeError("safeframe: scene width and height must be positive");
  }
  assertStaging("", scene);
  for (const [name, staging] of Object.entries(scene.buckets ?? {})) {
    if (staging) assertStaging(`buckets.${name}.`, staging);
  }
  return scene;
}

/** The scene's defaults with one bucket's overrides applied. */
export function stagingFor<Extra>(
  scene: Scene<Extra>,
  bucket: string,
): Required<Staging> & Partial<Extra> {
  const over = (scene.buckets?.[bucket] ?? {}) as Staging & Partial<Extra>;
  return {
    ...over,
    focal: over.focal ?? scene.focal,
    subject: over.subject ?? scene.subject,
    padding: over.padding ?? scene.padding ?? 0.06,
    zoom: over.zoom ?? scene.zoom ?? 1,
    textZones: over.textZones ?? scene.textZones ?? [],
  };
}

export type FrameOptions = {
  buckets?: readonly Bucket[];
  /**
   * "subject" (default) zooms out, showing bars if it must, rather than cut the subject.
   * "cover" always fills the viewport and reports when the subject is cut.
   */
  fit?: "subject" | "cover";
};

export type Frame = {
  bucket: string;
  viewport: Size;
  /** Viewport pixels per source pixel. */
  scale: number;
  /** The source region shown, in source pixels. Can run past the art when bars are needed. */
  region: Box;
  /** The part of the source to draw, clipped to the art (for `drawImage`). */
  source: Box;
  /** Where that part lands in the viewport, in viewport pixels. */
  dest: Box;
  /** Subject and focal point in viewport pixels. */
  subject: Box;
  focal: Point;
  /** True when part of the subject is outside the viewport. */
  subjectClipped: boolean;
  /** The chosen text zone in viewport pixels, or null when the bucket has none. */
  text: Box | null;
  /** Fraction of the text zone that overlaps the subject (0 is clear). */
  textOverlap: number;
};

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

/** Area of the intersection of two boxes. */
export function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Place one axis of the region: focal point centred, then nudged to keep the subject in. */
function place(
  focal: number,
  length: number,
  art: number,
  subjectStart: number,
  subjectEnd: number,
): number {
  // Positions that keep the region over the art (or the art centred inside the region).
  const artLo = Math.min(0, art - length);
  const artHi = Math.max(0, art - length);
  // Positions that also keep the subject whole.
  const lo = Math.max(artLo, subjectEnd - length);
  const hi = Math.min(artHi, subjectStart);
  const start = focal - length / 2;
  // The tolerance absorbs rounding when the region is exactly as wide as the subject.
  return lo <= hi + 1e-6 ? clamp(start, Math.min(lo, hi), hi) : clamp(start, artLo, artHi);
}

/** Stage `scene` for a viewport: the crop, the subject and focal point, and the text zone. */
export function frame<Extra>(
  scene: Scene<Extra>,
  viewport: Size,
  options: FrameOptions = {},
): Frame {
  const bucket = bucketFor(viewport, options.buckets);
  const staging = stagingFor(scene, bucket);
  const { width: sw, height: sh } = scene;
  const { width: vw, height: vh } = viewport;

  // Subject with padding, in source pixels.
  const s = staging.subject;
  const padX = s.width * sw * staging.padding;
  const padY = s.height * sh * staging.padding;
  const subLeft = Math.max(0, s.x * sw - padX);
  const subTop = Math.max(0, s.y * sh - padY);
  const subRight = Math.min(sw, (s.x + s.width) * sw + padX);
  const subBottom = Math.min(sh, (s.y + s.height) * sh + padY);

  let scale = Math.max(vw / sw, vh / sh) * staging.zoom;
  if (options.fit !== "cover") {
    scale = Math.min(scale, vw / (subRight - subLeft), vh / (subBottom - subTop));
  }

  const rw = vw / scale;
  const rh = vh / scale;
  const rx = place(staging.focal.x * sw, rw, sw, subLeft, subRight);
  const ry = place(staging.focal.y * sh, rh, sh, subTop, subBottom);

  const sx = Math.max(rx, 0);
  const sy = Math.max(ry, 0);
  const source = {
    x: sx,
    y: sy,
    width: Math.min(rx + rw, sw) - sx,
    height: Math.min(ry + rh, sh) - sy,
  };
  const toView = (x: number, y: number): Point => ({ x: (x - rx) * scale, y: (y - ry) * scale });
  const destOrigin = toView(sx, sy);
  const dest = {
    ...destOrigin,
    width: source.width * scale,
    height: source.height * scale,
  };

  const subjectOrigin = toView(s.x * sw, s.y * sh);
  const subject = { ...subjectOrigin, width: s.width * sw * scale, height: s.height * sh * scale };
  const eps = 0.5;
  const subjectClipped =
    subject.x < -eps ||
    subject.y < -eps ||
    subject.x + subject.width > vw + eps ||
    subject.y + subject.height > vh + eps;

  let text: Box | null = null;
  let textOverlap = 0;
  for (const zone of staging.textZones) {
    const box = {
      x: zone.x * vw,
      y: zone.y * vh,
      width: zone.width * vw,
      height: zone.height * vh,
    };
    const share = overlapArea(box, subject) / Math.max(box.width * box.height, 1);
    if (text === null || share < textOverlap) {
      text = box;
      textOverlap = share;
    }
    if (share === 0) break;
  }

  return {
    bucket,
    viewport: { width: vw, height: vh },
    scale,
    region: { x: rx, y: ry, width: rw, height: rh },
    source,
    dest,
    subject,
    focal: toView(staging.focal.x * sw, staging.focal.y * sh),
    subjectClipped,
    text,
    textOverlap,
  };
}

/** The part of a 2D canvas API `drawFrame` needs. */
export type CanvasLike = {
  clearRect(x: number, y: number, w: number, h: number): void;
  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
};

/**
 * Draw one source frame (an image-sequence frame, a video frame, a canvas) cropped as
 * `staged` says. `dpr` scales viewport pixels to canvas pixels.
 */
export function drawFrame(ctx: CanvasLike, image: CanvasImageSource, staged: Frame, dpr = 1): void {
  const { source: s, dest: d, viewport: v } = staged;
  ctx.clearRect(0, 0, v.width * dpr, v.height * dpr);
  if (s.width <= 0 || s.height <= 0) return;
  ctx.drawImage(
    image,
    s.x,
    s.y,
    s.width,
    s.height,
    d.x * dpr,
    d.y * dpr,
    d.width * dpr,
    d.height * dpr,
  );
}
