// @quartifex/reel (L01, Scroll & sequence). An image-sequence scrub engine: reads a
// rushes manifest, picks the tier with resolve, loads AVIF or WebP frames around the
// current position (fewer on Save-Data and slow connections), decodes with
// createImageBitmap (optionally in a worker), and draws to a DPR-aware canvas with cover
// or contain fit. Under reduced motion it shows the poster and loads no frames.
// Framework-neutral; React in ./react, GSAP ScrollTrigger in ./gsap.
import {
  type Decision,
  decide,
  type Environment,
  type GpuTier,
  readEnvironment,
  targetFromManifest,
} from "@quartifex/resolve";
import {
  type Format,
  framePath,
  type Manifest,
  parseManifest,
  type Tier,
} from "@quartifex/rushes/manifest";
import {
  type BufferOptions,
  evictable,
  fitRect,
  nearestLoaded,
  planLoads,
  type Rect,
} from "./buffer.js";

export {
  type BufferOptions,
  evictable,
  fitRect,
  nearestLoaded,
  planLoads,
  type Rect,
} from "./buffer.js";

export type ReelOptions = {
  /** URL of the folder holding manifest.json (frame paths are relative to it). */
  baseUrl: string;
  /**
   * Turn a frame or poster path (relative to the manifest) into the URL to load. Default:
   * `baseUrl` plus the path. Use it for frames kept in memory, such as object URLs from
   * `@quartifex/rushes/browser`'s preview encoder, or for signed CDN URLs.
   */
  urlFor?: (path: string) => string;
  /** Force a tier by name. Default: chosen by resolve for the canvas size, DPR, GPU tier and connection. */
  tier?: string;
  /** "auto" (default) uses AVIF when the browser decodes it, else WebP. */
  format?: Format | "auto";
  fit?: "cover" | "contain";
  /**
   * Art-directed drawing instead of `fit`, e.g. safeframe's `frame(scene, box)`: which part
   * of the source (in the manifest's source pixels) lands where on the canvas (CSS pixels).
   * Called with the canvas size in CSS pixels on every draw.
   */
  stage?: (box: { width: number; height: number }) => { source: Rect; dest: Rect };
  /** GPU tier for resolve, e.g. from `@quartifex/resolve/gpu`. */
  gpuTier?: GpuTier;
  /** Override the environment resolve sees (testing, previews). */
  environment?: Partial<Environment>;
  buffer?: BufferOptions & { concurrency?: number };
  /** Default: the visitor's `prefers-reduced-motion`. */
  reducedMotion?: boolean;
  /** "main" (default) decodes with createImageBitmap on the page; "worker" fetches and decodes in a worker. */
  decode?: "main" | "worker";
  onFrame?: (index: number) => void;
  onLoad?: (loaded: number, total: number) => void;
};

export type ReelStats = {
  tier: string;
  format: Format;
  dpr: number;
  frames: number;
  loaded: number;
  /** Indices of the frames in memory. */
  indices: number[];
  inFlight: number;
  current: number;
  shown: number;
  reducedMotion: boolean;
  decision: Decision;
};

export type Reel = {
  /** Show the frame at `progress` (0 to 1). Cheap: call it on every scroll update. */
  seek(progress: number): void;
  readonly progress: number;
  stats(): ReelStats;
  /** Switch tier by name (frames reload around the current position). */
  setTier(name: string): void;
  setReducedMotion(on: boolean): void;
  /** Resolves when the first frame (or the poster) is on the canvas. */
  ready: Promise<void>;
  destroy(): void;
};

const AVIF_PROBE =
  "data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAAB0AAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAlbWRhdBIACgc4AAaQENBpMhAZQmMEwAA0AACQQM6Xt10S";

let avifSupport: Promise<boolean> | null = null;

/** Whether this browser decodes AVIF (checked once). */
export function supportsAvif(): Promise<boolean> {
  avifSupport ??= fetch(AVIF_PROBE)
    .then((r) => r.blob())
    .then((blob) => createImageBitmap(blob))
    .then((bitmap) => {
      bitmap.close();
      return true;
    })
    .catch(() => false);
  return avifSupport;
}

/** Fetch and parse a manifest. */
export async function loadManifest(url: string): Promise<Manifest> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`reel: manifest ${url} returned ${response.status}`);
  return parseManifest(await response.json());
}

const WORKER_SOURCE = `self.onmessage = async (e) => {
  const { id, url } = e.data;
  try {
    const blob = await (await fetch(url)).blob();
    const bitmap = await createImageBitmap(blob);
    self.postMessage({ id, bitmap }, [bitmap]);
  } catch (error) { self.postMessage({ id, error: String(error) }); }
};`;

type Decoder = { load(url: string): Promise<ImageBitmap>; close(): void };

function mainDecoder(): Decoder {
  return {
    load: async (url) => createImageBitmap(await (await fetch(url)).blob()),
    close: () => {},
  };
}

function workerDecoder(): Decoder {
  const worker = new Worker(
    URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" })),
  );
  const pending = new Map<
    number,
    { resolve: (b: ImageBitmap) => void; reject: (e: Error) => void }
  >();
  let id = 0;
  worker.onmessage = (
    event: MessageEvent<{ id: number; bitmap?: ImageBitmap; error?: string }>,
  ) => {
    const job = pending.get(event.data.id);
    pending.delete(event.data.id);
    if (event.data.bitmap) job?.resolve(event.data.bitmap);
    else job?.reject(new Error(event.data.error ?? "decode failed"));
  };
  return {
    load: (url) =>
      new Promise((resolve, reject) => {
        pending.set(++id, { resolve, reject });
        worker.postMessage({ id, url: new URL(url, location.href).href });
      }),
    close: () => worker.terminate(),
  };
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Start a reel on a canvas. */
export function createReel(
  canvas: HTMLCanvasElement,
  manifest: Manifest,
  options: ReelOptions,
): Reel {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("reel: no 2D context");
  const base = options.baseUrl.endsWith("/") ? options.baseUrl : `${options.baseUrl}/`;
  const urlFor = options.urlFor ?? ((file: string) => base + file);
  const fit = options.fit ?? "cover";
  const decoder =
    options.decode === "worker" && typeof Worker === "function" ? workerDecoder() : mainDecoder();
  let reducedMotion = options.reducedMotion ?? prefersReducedMotion();

  const box = () => ({
    width: canvas.clientWidth || canvas.width,
    height: canvas.clientHeight || canvas.height,
  });
  const environment = (): Environment => ({
    ...readEnvironment(options.gpuTier),
    ...options.environment,
  });
  const choose = (): Decision =>
    decide(environment(), targetFromManifest(manifest, { fit, box: box() }));

  let decision = choose();
  let tier: Tier = pickTier(options.tier ?? decision.tier.name);
  let format: Format =
    options.format && options.format !== "auto" ? options.format : (manifest.formats[0] as Format);
  const saveData =
    Boolean(environment().saveData) || environment().effectiveType?.endsWith("2g") === true;
  const concurrency = options.buffer?.concurrency ?? (saveData ? 2 : 4);
  const bufferOptions: BufferOptions = saveData
    ? { ahead: 6, behind: 2, sparse: 0, ...options.buffer }
    : { ...options.buffer };

  const frames = new Map<number, ImageBitmap>();
  const inFlight = new Set<number>();
  let generation = 0;
  let current = 0;
  let shown = -1;
  let progress = 0;
  let direction: 1 | -1 = 1;
  let destroyed = false;
  let drawQueued = false;
  let poster: ImageBitmap | null = null;
  let resolveReady: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  function pickTier(name: string): Tier {
    return manifest.tiers.find((t) => t.name === name) ?? (manifest.tiers[0] as Tier);
  }

  function sizeCanvas() {
    const { width, height } = box();
    const w = Math.max(1, Math.round(width * decision.dpr));
    const h = Math.max(1, Math.round(height * decision.dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      shown = -1;
    }
  }

  function paint(image: ImageBitmap) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (options.stage) {
      // Source rects are in manifest source pixels; frames are tier-sized.
      const { source, dest } = options.stage(box());
      const k = image.width / manifest.source.width;
      const d = canvas.width / Math.max(box().width, 1);
      if (source.width <= 0 || source.height <= 0) return;
      ctx.drawImage(
        image,
        source.x * k,
        source.y * k,
        source.width * k,
        source.height * k,
        dest.x * d,
        dest.y * d,
        dest.width * d,
        dest.height * d,
      );
      return;
    }
    const rect = fitRect(image, { width: canvas.width, height: canvas.height }, fit);
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  }

  function draw() {
    drawQueued = false;
    if (destroyed) return;
    if (reducedMotion) {
      if (poster) paint(poster);
      return;
    }
    const index = nearestLoaded(current, tier.frames, (i) => frames.has(i));
    if (index < 0 || index === shown) return;
    const bitmap = frames.get(index);
    if (!bitmap) return;
    paint(bitmap);
    shown = index;
    options.onFrame?.(index);
    resolveReady();
  }

  function queueDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(draw);
  }

  function pump() {
    if (destroyed || reducedMotion) return;
    const wanted = planLoads(
      current,
      tier.frames,
      (i) => frames.has(i) || inFlight.has(i),
      direction,
      bufferOptions,
    );
    const run = generation;
    for (const index of wanted) {
      if (inFlight.size >= concurrency) break;
      inFlight.add(index);
      decoder
        .load(urlFor(framePath(manifest, tier, format, index)))
        .then((bitmap) => {
          inFlight.delete(index);
          if (destroyed || run !== generation) {
            bitmap.close();
            return;
          }
          frames.set(index, bitmap);
          options.onLoad?.(frames.size, tier.frames);
          if (Math.abs(index - current) <= Math.abs(shown - current) || shown < 0) queueDraw();
          pump();
        })
        .catch(() => {
          inFlight.delete(index);
        });
    }
    for (const index of evictable(frames.keys(), current, bufferOptions)) {
      frames.get(index)?.close();
      frames.delete(index);
    }
  }

  function reset() {
    generation++;
    for (const bitmap of frames.values()) bitmap.close();
    frames.clear();
    inFlight.clear();
    shown = -1;
  }

  async function loadPoster() {
    const file = manifest.poster[format] ?? manifest.poster.jpg;
    if (!file || poster) return;
    try {
      poster = await decoder.load(urlFor(file));
      queueDraw();
      if (reducedMotion) resolveReady();
    } catch {
      // No poster: the canvas stays empty under reduced motion, and the page's fallback shows.
    }
  }

  const observer =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          const next = choose();
          const tierChanged = !options.tier && next.tier.name !== tier.name;
          decision = next;
          sizeCanvas();
          if (tierChanged) {
            tier = pickTier(next.tier.name);
            reset();
            pump();
          }
          queueDraw();
        })
      : null;
  observer?.observe(canvas);

  sizeCanvas();
  void (async () => {
    if (options.format === undefined || options.format === "auto") {
      format = manifest.formats.includes("avif") && (await supportsAvif()) ? "avif" : "webp";
      if (!manifest.formats.includes(format)) format = manifest.formats[0] as Format;
    }
    if (destroyed) return;
    await loadPoster();
    pump();
  })();

  return {
    seek(p) {
      const next = Math.min(Math.max(p, 0), 1);
      direction = next >= progress ? 1 : -1;
      progress = next;
      current = Math.round(progress * (tier.frames - 1));
      pump();
      queueDraw();
    },
    get progress() {
      return progress;
    },
    stats() {
      return {
        tier: tier.name,
        format,
        dpr: decision.dpr,
        frames: tier.frames,
        loaded: frames.size,
        indices: [...frames.keys()].sort((a, b) => a - b),
        inFlight: inFlight.size,
        current,
        shown,
        reducedMotion,
        decision,
      };
    },
    setTier(name) {
      tier = pickTier(name);
      current = Math.round(progress * (tier.frames - 1));
      reset();
      pump();
      queueDraw();
    },
    setReducedMotion(on) {
      reducedMotion = on;
      shown = -1;
      if (on) void loadPoster();
      pump();
      queueDraw();
    },
    ready,
    destroy() {
      destroyed = true;
      observer?.disconnect();
      reset();
      poster?.close();
      decoder.close();
    },
  };
}

/**
 * Drive a reel from native scroll, no GSAP needed: progress runs from the section's top
 * reaching the top of the viewport (or scroller) to its bottom reaching the bottom.
 */
export function bindScroll(
  reel: Reel,
  section: HTMLElement,
  scroller: HTMLElement | Window = window,
): () => void {
  let frame = 0;
  const update = () => {
    frame = 0;
    const viewport = scroller instanceof Window ? scroller.innerHeight : scroller.clientHeight;
    const origin = scroller instanceof Window ? 0 : scroller.getBoundingClientRect().top;
    const rect = section.getBoundingClientRect();
    // Rects include ancestor CSS transforms (a scaled preview); scroll positions do not.
    const scale = section.offsetHeight > 0 ? rect.height / section.offsetHeight : 1;
    const range = Math.max(section.offsetHeight - viewport, 1);
    reel.seek((origin - rect.top) / scale / range);
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  scroller.addEventListener("scroll", onScroll, { passive: true });
  update();
  return () => {
    scroller.removeEventListener("scroll", onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
}
