// Pixel comparison on raw RGBA buffers. No Node APIs, so it runs in the browser too
// (published as `@quartifex/dailies/pixels`).
import pixelmatch from "pixelmatch";

export type Rgba = { data: Uint8Array | Uint8ClampedArray; width: number; height: number };

export type CompareOptions = {
  /** Per-pixel colour distance that counts as different, 0 to 1. Default 0.1 (0.2 in canvas mode). */
  threshold?: number;
  /** Largest share of differing pixels that still passes. Default 0.001 (0.01 in canvas mode). */
  maxDiffRatio?: number;
  /**
   * Average `n` x `n` blocks before comparing. Removes sub-pixel noise from GPU
   * rasterisation, dithering and antialiasing. Default 1 (2 in canvas mode).
   */
  downsample?: number;
  /**
   * Canvas-tolerant preset for WebGL and 2D canvas scenes, whose pixels vary slightly
   * between runs and GPUs. Explicit options still win.
   */
  canvas?: boolean;
  /** Rectangles to ignore (in pixels of the input), e.g. a clock or a video. */
  mask?: Array<{ x: number; y: number; width: number; height: number }>;
};

export type Comparison = {
  pass: boolean;
  /** Why it failed, when it failed for a reason other than pixels (e.g. size mismatch). */
  reason?: string;
  width: number;
  height: number;
  diffPixels: number;
  diffRatio: number;
  /** RGBA diff image at the compared resolution: differing pixels in red. */
  diff: Rgba;
};

/** Average `factor` x `factor` blocks of an RGBA image. */
export function downsample(image: Rgba, factor: number): Rgba {
  if (factor <= 1) return image;
  const width = Math.max(1, Math.floor(image.width / factor));
  const height = Math.max(1, Math.floor(image.height / factor));
  const data = new Uint8ClampedArray(width * height * 4);
  const area = factor * factor;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let dy = 0; dy < factor; dy++) {
          const row = (y * factor + dy) * image.width;
          for (let dx = 0; dx < factor; dx++)
            sum += image.data[(row + x * factor + dx) * 4 + c] ?? 0;
        }
        data[(y * width + x) * 4 + c] = sum / area;
      }
    }
  }
  return { data, width, height };
}

function applyMask(image: Rgba, mask: NonNullable<CompareOptions["mask"]>): Rgba {
  if (mask.length === 0) return image;
  const data = new Uint8ClampedArray(image.data);
  for (const box of mask) {
    for (let y = Math.max(0, box.y); y < Math.min(image.height, box.y + box.height); y++) {
      for (let x = Math.max(0, box.x); x < Math.min(image.width, box.x + box.width); x++) {
        data.fill(0, (y * image.width + x) * 4, (y * image.width + x) * 4 + 4);
      }
    }
  }
  return { data, width: image.width, height: image.height };
}

/** Compare two RGBA images. Same-size inputs only; a size change is a failure. */
export function compareRgba(a: Rgba, b: Rgba, options: CompareOptions = {}): Comparison {
  const canvas = options.canvas ?? false;
  const threshold = options.threshold ?? (canvas ? 0.2 : 0.1);
  const maxDiffRatio = options.maxDiffRatio ?? (canvas ? 0.01 : 0.001);
  const factor = Math.max(1, Math.floor(options.downsample ?? (canvas ? 2 : 1)));

  if (a.width !== b.width || a.height !== b.height) {
    const empty = { data: new Uint8ClampedArray(0), width: 0, height: 0 };
    return {
      pass: false,
      reason: `size differs: ${a.width}x${a.height} vs ${b.width}x${b.height}`,
      width: a.width,
      height: a.height,
      diffPixels: Math.max(a.width * a.height, b.width * b.height),
      diffRatio: 1,
      diff: empty,
    };
  }

  const mask = options.mask ?? [];
  const left = downsample(applyMask(a, mask), factor);
  const right = downsample(applyMask(b, mask), factor);
  const diff = new Uint8ClampedArray(left.width * left.height * 4);
  const diffPixels = pixelmatch(left.data, right.data, diff, left.width, left.height, {
    threshold,
    includeAA: false,
    alpha: 0.2,
  });
  const diffRatio = diffPixels / (left.width * left.height);
  return {
    pass: diffRatio <= maxDiffRatio,
    width: left.width,
    height: left.height,
    diffPixels,
    diffRatio,
    diff: { data: diff, width: left.width, height: left.height },
  };
}
