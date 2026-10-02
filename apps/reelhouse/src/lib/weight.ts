// The playground's arithmetic, kept pure so it is tested without a browser: frame sizes
// from an encoded preview, the report against a budget (rushes), the CI view of the same
// budget (heft), the AVIF estimate and the matching CLI command and budget.json block.
import { evaluate, type Finding } from "@quartifex/heft/browser";
import {
  type Budget,
  type Format,
  framePath,
  type Manifest,
  type Report,
  weigh,
} from "@quartifex/rushes/browser";

export type Settings = {
  widths: number[];
  maxFrames: number;
  /** WebP quality, 0 to 100. */
  quality: number;
  /** Largest tier, in bytes. */
  tierBudget: number;
  /** Poster plus the first 12 frames, in bytes. */
  initialBudget: number;
};

export const DEFAULTS: Settings = {
  widths: [480, 960, 1600],
  maxFrames: 72,
  quality: 75,
  tierBudget: 2 * 1024 * 1024,
  initialBudget: 400 * 1024,
};

export const WIDTH_CHOICES = [480, 720, 960, 1280, 1600, 1920] as const;

/** Each tier's frame sizes, in order, read from the encoded files. */
export function frameSizes(
  manifest: Manifest,
  files: ReadonlyMap<string, { size: number }>,
): (tier: string, format: Format) => number[] {
  return (name, format) => {
    const tier = manifest.tiers.find((t) => t.name === name);
    if (!tier) return [];
    return Array.from(
      { length: tier.frames },
      (_, i) => files.get(framePath(manifest, tier, format, i))?.size ?? 0,
    );
  };
}

export function budgetOf(settings: Pick<Settings, "tierBudget" | "initialBudget">): Budget {
  return {
    maxTierBytes: settings.tierBudget,
    maxInitialBytes: settings.initialBudget,
    initialFrames: 12,
  };
}

/** The rushes report for an encoded preview against the playground's budget. */
export function reportFor(
  manifest: Manifest,
  files: ReadonlyMap<string, { size: number }>,
  settings: Pick<Settings, "tierBudget" | "initialBudget">,
): Report {
  const poster = files.get(manifest.poster[manifest.formats[0] as Format] ?? "")?.size ?? 0;
  return weigh(manifest, frameSizes(manifest, files), poster, budgetOf(settings));
}

/** What heft would report in CI for the same sequence: its largest tier against `sequenceBytes`. */
export function heftFindings(
  manifest: Manifest,
  files: ReadonlyMap<string, { size: number }>,
  tierBudget: number,
): Finding[] {
  let total = 0;
  for (const blob of files.values()) total += blob.size;
  const format = manifest.formats[0] as Format;
  const largestTierBytes = Math.max(...manifest.tiers.map((t) => t.bytes[format] ?? 0), 0);
  return evaluate(
    {
      assets: {
        totalBytes: total,
        glbs: [],
        textureBytes: 0,
        sequences: [{ file: `${manifest.name} (${format})`, largestTierBytes }],
      },
    },
    { assets: { sequenceBytes: tierBudget } },
  );
}

/**
 * AVIF bytes per WebP byte, measured on a sequence the CLI encoded in both formats (the hero).
 * Null when that manifest lacks either format.
 */
export function avifRatio(manifest: Manifest | null): number | null {
  if (!manifest) return null;
  let avif = 0;
  let webp = 0;
  for (const tier of manifest.tiers) {
    avif += tier.bytes.avif ?? 0;
    webp += tier.bytes.webp ?? 0;
  }
  return avif > 0 && webp > 0 ? avif / webp : null;
}

/** The CLI command that encodes the same thing for shipping. */
export function cliCommand(file: string, settings: Pick<Settings, "widths">): string {
  const name = /\s/.test(file) ? `"${file}"` : file;
  return `npx rushes ${name} --out public/sequences/${slug(file)} --widths ${[...settings.widths].sort((a, b) => a - b).join(",")} --budget budget.json --strict`;
}

/** The budget.json blocks for rushes (`sequence`) and heft (`heft.assets`). */
export function budgetJson(settings: Pick<Settings, "tierBudget" | "initialBudget">): string {
  return JSON.stringify(
    {
      sequence: budgetOf(settings),
      heft: { assets: { sequenceBytes: settings.tierBudget } },
    },
    null,
    2,
  );
}

function slug(file: string): string {
  return (
    file
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "sequence"
  );
}
