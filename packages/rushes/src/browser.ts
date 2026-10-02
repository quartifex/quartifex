// Browser-safe parts of @quartifex/rushes, published as `@quartifex/rushes/browser`: the
// manifest, the tier plan and the weight report, plus a preview encoder. The preview encoder
// turns a dropped video (or frames drawn in code) into the same tiered frames, manifest and
// report the CLI writes, in the page, with the browser's own image encoders. It is for
// previews and estimates: the CLI (sharp, libaom, libwebp) stays the encoder for shipping.
import { type Format, framePath, MANIFEST_VERSION, type Manifest, type Tier } from "./manifest.js";
import { planTiers } from "./plan.js";
import { type Budget, type Report, weigh } from "./report.js";

export {
  type Format,
  frameAt,
  framePath,
  MANIFEST_VERSION,
  type Manifest,
  parseManifest,
  type Tier,
} from "./manifest.js";
export { naturalSort, planTiers } from "./plan.js";
export {
  type Budget,
  formatBytes,
  type Report,
  reportMarkdown,
  type TierLine,
  weigh,
} from "./report.js";

/** Frames drawn in code: `draw` paints source frame `index` onto a canvas of `width` x `height`. */
export type FrameSource = {
  frames: number;
  width: number;
  height: number;
  draw(ctx: CanvasRenderingContext2D, index: number): void | Promise<void>;
};

export type PreviewOptions = {
  /** A video file (any format the browser plays), a video element, or frames drawn in code. */
  input: Blob | HTMLVideoElement | FrameSource;
  name?: string;
  /** Tier widths. Default 480, 960, 1600, capped at the source width. */
  widths?: number[];
  step?: (width: number) => number;
  /** Default: AVIF and WebP, whichever this browser can encode. */
  formats?: Format[];
  /** Most source frames to take. A video longer than this is sampled evenly. Default 96. */
  maxFrames?: number;
  /** Sampling rate for video before the cap; for drawn frames, recorded in the manifest. Default 24. */
  fps?: number;
  /** 0 to 100, as in the CLI. Default AVIF 50, WebP 75, JPEG 80. */
  quality?: { avif?: number; webp?: number; jpg?: number };
  /** Source frame used for the poster. Default 0. */
  poster?: number;
  budget?: Budget;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
};

export type Preview = {
  manifest: Manifest;
  report: Report;
  /** Every encoded file, by its path relative to the manifest. */
  files: Map<string, Blob>;
  /** An object URL for a file path (for reel's `urlFor`). */
  url(path: string): string;
  /** Revoke every object URL handed out. */
  dispose(): void;
};

const MIME: Record<Format | "jpg", string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpg: "image/jpeg",
};
const QUALITY = { avif: 50, webp: 75, jpg: 80 } as const;

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality / 100));
}

let probe: Promise<Format[]> | null = null;

/**
 * The formats this browser's canvas can encode, of AVIF and WebP (checked once). A browser
 * that cannot encode a type quietly returns PNG, so the blob's type is what counts.
 */
export function encodableFormats(): Promise<Format[]> {
  probe ??= (async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const found: Format[] = [];
    for (const format of ["avif", "webp"] as const) {
      const blob = await encode(canvas, MIME[format], 50);
      if (blob?.type === MIME[format]) found.push(format);
    }
    return found;
  })();
  return probe;
}

function once(target: EventTarget, type: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      target.removeEventListener("error", fail);
      resolve();
    };
    const fail = () => {
      target.removeEventListener(type, done);
      reject(new Error(`rushes: the video failed while waiting for ${type}`));
    };
    target.addEventListener(type, done, { once: true });
    target.addEventListener("error", fail, { once: true });
  });
}

async function seek(video: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(video.currentTime - time) < 1e-4 && video.readyState >= 2) return;
  const seeked = once(video, "seeked");
  video.currentTime = time;
  await seeked;
}

/** A video as a frame source: `frames` evenly spaced frames across its length. */
async function videoSource(
  input: Blob | HTMLVideoElement,
  fps: number,
  maxFrames: number,
): Promise<{ source: FrameSource; fps: number; cleanup(): void }> {
  const own = !(input instanceof HTMLVideoElement);
  const video = own ? document.createElement("video") : input;
  const objectUrl = own ? URL.createObjectURL(input) : null;
  if (objectUrl) {
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objectUrl;
  }
  const cleanup = () => {
    if (objectUrl) {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    }
  };
  try {
    if (video.readyState < 1) await once(video, "loadedmetadata");
    // Recorded WebM often reports an unknown length until it is seeked past the end.
    if (!Number.isFinite(video.duration)) {
      await seek(video, 1e9);
      await seek(video, 0);
    }
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    if (!video.videoWidth || !video.videoHeight) throw new Error("rushes: the video has no picture");
    const frames = Math.max(1, Math.min(maxFrames, Math.floor(duration * fps)));
    return {
      source: {
        frames,
        width: video.videoWidth,
        height: video.videoHeight,
        draw: async (ctx, index) => {
          await seek(video, Math.min((index * duration) / frames, Math.max(duration - 0.001, 0)));
          ctx.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
        },
      },
      fps: Math.max(1, Math.round(frames / duration)),
      cleanup,
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}

function canvasOf(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("rushes: no 2D canvas in this browser");
  return [canvas, ctx];
}

/**
 * Encode a preview in the page: tiered frames, posters, a manifest and the weight report,
 * kept in memory as blobs. Throws if this browser can encode neither AVIF nor WebP.
 */
export async function encodePreview(options: PreviewOptions): Promise<Preview> {
  const available = await encodableFormats();
  const formats = (options.formats ?? ["avif", "webp"]).filter((f) => available.includes(f));
  if (formats.length === 0) {
    throw new Error(
      "rushes: this browser cannot encode AVIF or WebP images; use the rushes CLI instead",
    );
  }
  const maxFrames = Math.max(1, Math.round(options.maxFrames ?? 96));
  const isFrames = (input: PreviewOptions["input"]): input is FrameSource =>
    typeof (input as FrameSource).draw === "function";
  const opened = isFrames(options.input)
    ? {
        source: { ...options.input, frames: Math.min(options.input.frames, maxFrames) },
        fps: options.fps ?? 24,
        cleanup: () => {},
      }
    : await videoSource(options.input, options.fps ?? 24, maxFrames);
  const { source } = opened;
  const urls = new Map<string, string>();
  const files = new Map<string, Blob>();
  try {
    const size = { width: source.width, height: source.height };
    const plan = planTiers(size, source.frames, options.widths, options.step);
    const manifest: Manifest = {
      version: MANIFEST_VERSION,
      name: options.name ?? (options.input instanceof File ? options.input.name : "preview"),
      frames: source.frames,
      fps: opened.fps,
      source: size,
      formats,
      tiers: plan.map((t) => ({ ...t, bytes: {} })),
      pattern: "{tier}/{format}/{index}.{format}",
      pad: Math.max(4, String(source.frames).length),
      poster: {},
      createdAt: new Date().toISOString(),
    };
    const quality = { ...QUALITY, ...options.quality };
    const sizes = new Map<string, number[]>();
    for (const tier of manifest.tiers) {
      for (const format of formats) {
        sizes.set(`${tier.name}/${format}`, new Array<number>(tier.frames).fill(0));
      }
    }
    const largest = manifest.tiers[manifest.tiers.length - 1] as Tier;
    const [full, fullCtx] = canvasOf(largest.width, largest.height);
    const tierCanvases = manifest.tiers.map((tier) => canvasOf(tier.width, tier.height));
    const posterIndex = Math.min(Math.max(options.poster ?? 0, 0), source.frames - 1);
    let posterBytes = 0;

    for (let i = 0; i < source.frames; i++) {
      options.signal?.throwIfAborted();
      fullCtx.clearRect(0, 0, full.width, full.height);
      await source.draw(fullCtx, i);
      const jobs: Promise<void>[] = [];
      manifest.tiers.forEach((tier, t) => {
        if (i % tier.step !== 0) return;
        const index = i / tier.step;
        const [canvas, ctx] = tierCanvases[t] as [HTMLCanvasElement, CanvasRenderingContext2D];
        ctx.drawImage(full, 0, 0, tier.width, tier.height);
        for (const format of formats) {
          jobs.push(
            encode(canvas, MIME[format], quality[format]).then((blob) => {
              if (!blob) throw new Error(`rushes: the browser could not encode ${format}`);
              files.set(framePath(manifest, tier, format, index), blob);
              (sizes.get(`${tier.name}/${format}`) as number[])[index] = blob.size;
            }),
          );
        }
      });
      if (i === posterIndex) {
        for (const format of [...formats, "jpg"] as const) {
          jobs.push(
            encode(full, MIME[format], quality[format]).then((blob) => {
              if (!blob) return;
              const file = `poster.${format}`;
              files.set(file, blob);
              manifest.poster[format] = file;
              if (format === formats[0]) posterBytes = blob.size;
            }),
          );
        }
      }
      await Promise.all(jobs);
      options.onProgress?.(i + 1, source.frames);
    }

    for (const tier of manifest.tiers) {
      for (const format of formats) {
        tier.bytes[format] = (sizes.get(`${tier.name}/${format}`) as number[]).reduce(
          (a, b) => a + b,
          0,
        );
      }
    }
    const report = weigh(
      manifest,
      (tier, format) => sizes.get(`${tier}/${format}`) ?? [],
      posterBytes,
      options.budget,
    );
    return {
      manifest,
      report,
      files,
      url(path) {
        let url = urls.get(path);
        if (!url) {
          const blob = files.get(path);
          if (!blob) throw new Error(`rushes: no file ${path} in this preview`);
          url = URL.createObjectURL(blob);
          urls.set(path, url);
        }
        return url;
      },
      dispose() {
        for (const url of urls.values()) URL.revokeObjectURL(url);
        urls.clear();
      },
    };
  } finally {
    opened.cleanup();
  }
}
