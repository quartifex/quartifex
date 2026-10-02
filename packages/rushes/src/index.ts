// @quartifex/rushes (L02, Scroll & sequence). One command turns a video or a frame folder
// (a Blender render, an export) into tiered AVIF and WebP sets, a manifest.json, poster
// frames and a page-weight report against a budget. Node only; the manifest types and
// helpers are browser-safe in ./manifest.
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import path from "node:path";
import sharp, { type Sharp } from "sharp";
import { type Format, framePath, MANIFEST_VERSION, type Manifest, type Tier } from "./manifest.js";
import { type Budget, type Report, reportMarkdown, weigh } from "./report.js";
import { naturalSort, planTiers } from "./plan.js";
import { type SyntheticOptions, syntheticFrame } from "./synthetic.js";

export {
  type Format,
  frameAt,
  framePath,
  MANIFEST_VERSION,
  type Manifest,
  parseManifest,
  type Tier,
} from "./manifest.js";
export {
  type Budget,
  formatBytes,
  type Report,
  reportMarkdown,
  type TierLine,
  weigh,
} from "./report.js";
export { naturalSort, planTiers } from "./plan.js";
export { type SyntheticOptions, syntheticFrame } from "./synthetic.js";

export type RushOptions = {
  /**
   * A frame folder, a video file, `{ synthetic: {...} }` for the built-in test sequence, or
   * `{ render, frames }` for frames drawn in code (SVG markup or an encoded image per frame).
   */
  input: string | { synthetic: SyntheticOptions } | RenderedInput;
  /** Output folder: manifest.json, report.md, report.json, posters, tier folders. */
  out: string;
  name?: string;
  /** Tier widths in pixels. Default 480, 960, 1600, capped at the source width. */
  widths?: number[];
  /** Default avif and webp. */
  formats?: Format[];
  /** Frame step per tier width: keep every nth frame. Default 2 for tiers up to 640 px wide, else 1. */
  step?: (width: number) => number;
  /** Frames per second: extraction rate for video, and recorded in the manifest. Default 30. */
  fps?: number;
  quality?: { avif?: number; webp?: number; jpg?: number };
  /** Source frame used for the poster. Default 0. */
  poster?: number;
  budget?: Budget;
  /** ffmpeg binary for video input. Default `RUSHES_FFMPEG`, then `ffmpeg` on the PATH. */
  ffmpeg?: string;
  concurrency?: number;
  onProgress?: (done: number, total: number) => void;
};

export type RenderedInput = {
  frames: number;
  /** Frame `index` as SVG markup, or as an encoded image (PNG, JPEG, WebP...). */
  render: (index: number) => string | Buffer | Promise<string | Buffer>;
};

export type RushResult = {
  manifest: Manifest;
  report: Report;
  manifestPath: string;
  reportPath: string;
};

const FRAME_EXT = /\.(png|jpe?g|webp|avif|tiff?)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi)$/i;

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (chunk: Buffer) => {
      err += chunk.toString();
    });
    child.on("error", (error) =>
      reject(
        new Error(
          `rushes: could not run ${command} (${error.message}). Install ffmpeg or pass --ffmpeg.`,
        ),
      ),
    );
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`rushes: ${command} exited ${code}\n${err.slice(-800)}`)),
    );
  });
}

type Source = { count: number; read(index: number): Promise<Buffer>; cleanup(): Promise<void> };

async function openSource(options: RushOptions): Promise<Source> {
  const input = options.input;
  if (typeof input !== "string" && "render" in input) {
    return {
      count: input.frames,
      read: async (i) => {
        const frame = await input.render(i);
        return sharp(typeof frame === "string" ? Buffer.from(frame) : frame)
          .png()
          .toBuffer();
      },
      cleanup: async () => {},
    };
  }
  if (typeof input !== "string") {
    const frames = input.synthetic.frames ?? 72;
    return {
      count: frames,
      read: (i) =>
        sharp(Buffer.from(syntheticFrame(i, { ...input.synthetic, frames })))
          .png()
          .toBuffer(),
      cleanup: async () => {},
    };
  }
  const info = await stat(input);
  let dir = input;
  let temp: string | null = null;
  if (info.isFile()) {
    if (!VIDEO_EXT.test(input))
      throw new Error(`rushes: ${input} is not a video or a folder of frames`);
    temp = await mkdtemp(path.join(tmpdir(), "rushes-"));
    const ffmpeg = options.ffmpeg ?? process.env.RUSHES_FFMPEG ?? "ffmpeg";
    await run(ffmpeg, [
      "-v",
      "error",
      "-i",
      input,
      "-vf",
      `fps=${options.fps ?? 30}`,
      path.join(temp, "%05d.png"),
    ]);
    dir = temp;
  }
  const files = naturalSort((await readdir(dir)).filter((f) => FRAME_EXT.test(f)));
  if (files.length === 0)
    throw new Error(`rushes: no frames (png, jpg, webp, avif, tiff) in ${dir}`);
  return {
    count: files.length,
    read: (i) =>
      sharp(path.join(dir, files[i] as string))
        .png()
        .toBuffer(),
    cleanup: async () => {
      if (temp) await rm(temp, { recursive: true, force: true });
    },
  };
}

async function pool<T>(items: T[], limit: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++] as T;
      await work(item);
    }
  });
  await Promise.all(workers);
}

function encoder(format: Format, quality: RushOptions["quality"] = {}) {
  return (image: Sharp) =>
    format === "avif"
      ? image.avif({ quality: quality.avif ?? 50, effort: 2 })
      : image.webp({ quality: quality.webp ?? 75, effort: 4 });
}

/** Encode the sequence and write the manifest, posters and report. */
export async function rush(options: RushOptions): Promise<RushResult> {
  const out = path.resolve(options.out);
  const formats = options.formats ?? ["avif", "webp"];
  const source = await openSource(options);
  try {
    const first = await sharp(await source.read(0)).metadata();
    if (!first.width || !first.height)
      throw new Error("rushes: could not read the first frame's size");
    const size = { width: first.width, height: first.height };
    const plan = planTiers(size, source.count, options.widths, options.step);
    const name =
      options.name ??
      (typeof options.input === "string"
        ? path.basename(options.input).replace(/\.[^.]+$/, "")
        : "render" in options.input
          ? "sequence"
          : "synthetic");
    const pad = Math.max(4, String(source.count).length);
    const pattern = "{tier}/{format}/{index}.{format}";
    const draft: Manifest = {
      version: MANIFEST_VERSION,
      name,
      frames: source.count,
      fps: options.fps ?? 30,
      source: size,
      formats,
      tiers: plan.map((t) => ({ ...t, bytes: {} })),
      pattern,
      pad,
      poster: {},
      createdAt: new Date().toISOString(),
    };

    const sizes = new Map<string, number[]>();
    for (const tier of draft.tiers) {
      for (const format of formats) {
        sizes.set(`${tier.name}/${format}`, new Array<number>(tier.frames).fill(0));
        await mkdir(path.join(out, tier.name, format), { recursive: true });
      }
    }

    let done = 0;
    const indices = Array.from({ length: source.count }, (_, i) => i);
    await pool(
      indices,
      options.concurrency ?? Math.max(2, availableParallelism() - 1),
      async (i) => {
        const input = await source.read(i);
        for (const tier of draft.tiers) {
          if (i % tier.step !== 0) continue;
          const index = i / tier.step;
          const resized = await sharp(input).resize(tier.width, tier.height).toBuffer();
          for (const format of formats) {
            const encoded = await encoder(format, options.quality)(sharp(resized)).toBuffer();
            await writeFile(path.join(out, framePath(draft, tier, format, index)), encoded);
            (sizes.get(`${tier.name}/${format}`) as number[])[index] = encoded.length;
          }
        }
        options.onProgress?.(++done, source.count);
      },
    );

    // Posters: one frame at the largest tier, in each format plus JPEG for anything else.
    const largest = draft.tiers[draft.tiers.length - 1] as Tier;
    const posterFrame = await sharp(
      await source.read(Math.min(options.poster ?? 0, source.count - 1)),
    )
      .resize(largest.width, largest.height)
      .toBuffer();
    let posterBytes = 0;
    for (const format of formats) {
      const file = `poster.${format}`;
      const encoded = await encoder(format, options.quality)(sharp(posterFrame)).toBuffer();
      await writeFile(path.join(out, file), encoded);
      draft.poster[format] = file;
      if (format === formats[0]) posterBytes = encoded.length;
    }
    const jpg = await sharp(posterFrame)
      .jpeg({ quality: options.quality?.jpg ?? 80, mozjpeg: true })
      .toBuffer();
    await writeFile(path.join(out, "poster.jpg"), jpg);
    draft.poster.jpg = "poster.jpg";

    for (const tier of draft.tiers) {
      for (const format of formats) {
        tier.bytes[format] = (sizes.get(`${tier.name}/${format}`) as number[]).reduce(
          (a, b) => a + b,
          0,
        );
      }
    }
    const report = weigh(
      draft,
      (tier, format) => sizes.get(`${tier}/${format}`) ?? [],
      posterBytes,
      options.budget,
    );
    const manifestPath = path.join(out, "manifest.json");
    const reportPath = path.join(out, "report.md");
    await writeFile(manifestPath, `${JSON.stringify(draft, null, 2)}\n`);
    await writeFile(reportPath, reportMarkdown(draft, report));
    await writeFile(path.join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
    return { manifest: draft, report, manifestPath, reportPath };
  } finally {
    await source.cleanup();
  }
}
