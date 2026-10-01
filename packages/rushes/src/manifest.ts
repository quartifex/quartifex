// The sequence manifest: what rushes writes and what reel and resolve read. No Node APIs,
// so it is safe in the browser (published as `@quartifex/rushes/manifest`).

export const MANIFEST_VERSION = 1;

export type Format = "avif" | "webp";

export type Tier = {
  /** Short name, e.g. "w960". */
  name: string;
  width: number;
  height: number;
  /** Every `step`th source frame is kept: 2 halves the frame count (lighter mobile tiers). */
  step: number;
  /** Frames in this tier. */
  frames: number;
  /** Total bytes per format. */
  bytes: Partial<Record<Format, number>>;
};

export type Manifest = {
  version: typeof MANIFEST_VERSION;
  name: string;
  /** Frames in the source. */
  frames: number;
  fps: number;
  source: { width: number; height: number };
  formats: Format[];
  /** Smallest first. */
  tiers: Tier[];
  /**
   * Frame path relative to the manifest, with `{tier}`, `{format}` and `{index}` (zero-padded
   * to `pad` digits, counted within the tier).
   */
  pattern: string;
  pad: number;
  /** Poster image per format (plus a JPEG fallback), relative to the manifest. */
  poster: Partial<Record<Format | "jpg", string>>;
  createdAt: string;
};

/** The path of one frame, relative to the manifest. */
export function framePath(manifest: Manifest, tier: Tier, format: Format, index: number): string {
  const clamped = Math.min(Math.max(Math.round(index), 0), tier.frames - 1);
  return manifest.pattern
    .replaceAll("{tier}", tier.name)
    .replaceAll("{format}", format)
    .replaceAll("{index}", String(clamped).padStart(manifest.pad, "0"));
}

/** The tier frame to show at `progress` (0 to 1). */
export function frameAt(tier: Pick<Tier, "frames">, progress: number): number {
  const p = Math.min(Math.max(progress, 0), 1);
  return Math.round(p * (tier.frames - 1));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** Check an unknown value (parsed JSON) and return it typed, or throw with the first problem. */
export function parseManifest(raw: unknown): Manifest {
  const fail = (why: string): never => {
    throw new Error(`rushes manifest: ${why}`);
  };
  if (!isRecord(raw)) return fail("expected an object");
  if (raw.version !== MANIFEST_VERSION) fail(`unsupported version ${String(raw.version)}`);
  if (typeof raw.name !== "string") fail("name missing");
  if (!positive(raw.frames)) fail("frames must be positive");
  if (!positive(raw.fps)) fail("fps must be positive");
  if (!isRecord(raw.source) || !positive(raw.source.width) || !positive(raw.source.height)) {
    fail("source size missing");
  }
  const formats = raw.formats;
  if (!Array.isArray(formats) || formats.length === 0) return fail("formats missing");
  for (const f of formats) if (f !== "avif" && f !== "webp") fail(`unknown format ${String(f)}`);
  if (!Array.isArray(raw.tiers) || raw.tiers.length === 0) return fail("tiers missing");
  let previous = 0;
  for (const [i, tier] of raw.tiers.entries()) {
    if (!isRecord(tier) || typeof tier.name !== "string") return fail(`tier ${i} malformed`);
    if (!positive(tier.width) || !positive(tier.height) || !positive(tier.frames)) {
      fail(`tier ${tier.name} sizes or frames missing`);
    }
    if (!positive(tier.step)) fail(`tier ${tier.name} step missing`);
    if ((tier.width as number) < previous) fail("tiers must be ordered smallest first");
    previous = tier.width as number;
  }
  if (typeof raw.pattern !== "string" || !raw.pattern.includes("{index}")) {
    fail("pattern must contain {index}");
  }
  if (!positive(raw.pad)) fail("pad missing");
  if (!isRecord(raw.poster)) fail("poster missing");
  return raw as unknown as Manifest;
}
