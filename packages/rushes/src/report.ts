// Page-weight report: what each tier costs, what the first screen costs, and whether
// that fits the budget. Pure, so it is tested without encoding anything.
import type { Format, Manifest } from "./manifest.js";

export type Budget = {
  /** Largest total for one tier in one format, in bytes. */
  maxTierBytes?: number;
  /** Largest weight before the first frame can show: poster plus the first `initialFrames` frames. */
  maxInitialBytes?: number;
  /** Frames counted in the initial weight. Default 12. */
  initialFrames?: number;
  /** Per-tier overrides of maxTierBytes, by tier name. */
  tiers?: Record<string, number>;
};

export type TierLine = {
  tier: string;
  width: number;
  frames: number;
  format: Format;
  bytes: number;
  averageFrame: number;
  initialBytes: number;
  limit?: number;
  pass: boolean;
};

export type Report = { lines: TierLine[]; posterBytes: number; pass: boolean; budget: Budget };

/**
 * Weigh a manifest against a budget. `frameBytes(tier, format)` lists each frame's size in
 * tier order, so the initial weight uses real numbers rather than an average.
 */
export function weigh(
  manifest: Manifest,
  frameBytes: (tier: string, format: Format) => number[],
  posterBytes: number,
  budget: Budget = {},
): Report {
  const initialFrames = budget.initialFrames ?? 12;
  const lines: TierLine[] = [];
  for (const tier of manifest.tiers) {
    for (const format of manifest.formats) {
      const sizes = frameBytes(tier.name, format);
      const bytes = sizes.reduce((a, b) => a + b, 0);
      const initialBytes = posterBytes + sizes.slice(0, initialFrames).reduce((a, b) => a + b, 0);
      const limit = budget.tiers?.[tier.name] ?? budget.maxTierBytes;
      const overTier = limit !== undefined && bytes > limit;
      const overInitial =
        budget.maxInitialBytes !== undefined && initialBytes > budget.maxInitialBytes;
      lines.push({
        tier: tier.name,
        width: tier.width,
        frames: tier.frames,
        format,
        bytes,
        averageFrame: Math.round(bytes / Math.max(sizes.length, 1)),
        initialBytes,
        ...(limit === undefined ? {} : { limit }),
        pass: !overTier && !overInitial,
      });
    }
  }
  return { lines, posterBytes, pass: lines.every((l) => l.pass), budget };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** The report as a Markdown table. */
export function reportMarkdown(manifest: Manifest, report: Report): string {
  const rows = report.lines.map(
    (l) =>
      `| ${l.tier} | ${l.width} | ${l.frames} | ${l.format} | ${formatBytes(l.bytes)} | ${formatBytes(l.averageFrame)} | ${formatBytes(l.initialBytes)} | ${l.limit === undefined ? "-" : formatBytes(l.limit)} | ${l.pass ? "pass" : "over"} |`,
  );
  return [
    `# ${manifest.name}: page weight`,
    "",
    `${manifest.frames} source frames at ${manifest.fps} fps, ${manifest.source.width} x ${manifest.source.height}. Poster: ${formatBytes(report.posterBytes)}.`,
    "",
    "| Tier | Width | Frames | Format | Total | Per frame | First screen | Budget | Result |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    report.pass ? "Within budget." : "Over budget: see the rows marked over.",
    "",
  ].join("\n");
}
