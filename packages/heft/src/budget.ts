// Budgets and their evaluation. Pure and browser-safe.

export type Budget = {
  assets?: {
    /** All assets found, in bytes. */
    totalBytes?: number;
    /** Each GLB, in bytes. */
    glbBytes?: number;
    /** Each GLB, in triangles. */
    triangles?: number;
    /** All standalone textures and images, in bytes. */
    textureBytes?: number;
    /** Each image sequence's largest tier (one format), in bytes. */
    sequenceBytes?: number;
  };
  page?: {
    /** Everything transferred while loading, in bytes. */
    transferBytes?: number;
    scriptBytes?: number;
    imageBytes?: number;
  };
  scroll?: {
    /** How long the scripted scroll takes. Default 12 000 ms. */
    durationMs?: number;
    /** Frames over 50 ms (long animation frames where reported, else rAF gaps). */
    longFrames?: number;
    p95FrameMs?: number;
    /** Cumulative layout shift over load and scroll. */
    cls?: number;
    /** Slowest scripted interaction (an INP stand-in), in ms. */
    inp?: number;
  };
};

export type Measurements = {
  assets?: {
    totalBytes: number;
    glbs: Array<{ file: string; bytes: number; triangles: number }>;
    textureBytes: number;
    sequences: Array<{ file: string; largestTierBytes: number }>;
  };
  page?: { transferBytes: number; scriptBytes: number; imageBytes: number };
  scroll?: { frames: number; longFrames: number; p95FrameMs: number; cls: number; inp: number };
};

export type Finding = {
  metric: string;
  actual: number;
  limit: number;
  unit: "bytes" | "ms" | "count" | "score";
  pass: boolean;
  file?: string;
};

/** Compare measurements with a budget. Only metrics that have both a value and a limit are checked. */
export function evaluate(measured: Measurements, budget: Budget): Finding[] {
  const findings: Finding[] = [];
  const check = (
    metric: string,
    actual: number | undefined,
    limit: number | undefined,
    unit: Finding["unit"],
    file?: string,
  ) => {
    if (actual === undefined || limit === undefined) return;
    findings.push({
      metric,
      actual,
      limit,
      unit,
      pass: actual <= limit,
      ...(file ? { file } : {}),
    });
  };
  const a = measured.assets;
  check("assets.totalBytes", a?.totalBytes, budget.assets?.totalBytes, "bytes");
  check("assets.textureBytes", a?.textureBytes, budget.assets?.textureBytes, "bytes");
  for (const glb of a?.glbs ?? []) {
    check("assets.glbBytes", glb.bytes, budget.assets?.glbBytes, "bytes", glb.file);
    check("assets.triangles", glb.triangles, budget.assets?.triangles, "count", glb.file);
  }
  for (const seq of a?.sequences ?? []) {
    check(
      "assets.sequenceBytes",
      seq.largestTierBytes,
      budget.assets?.sequenceBytes,
      "bytes",
      seq.file,
    );
  }
  check("page.transferBytes", measured.page?.transferBytes, budget.page?.transferBytes, "bytes");
  check("page.scriptBytes", measured.page?.scriptBytes, budget.page?.scriptBytes, "bytes");
  check("page.imageBytes", measured.page?.imageBytes, budget.page?.imageBytes, "bytes");
  const s = measured.scroll;
  check("scroll.longFrames", s?.longFrames, budget.scroll?.longFrames, "count");
  check("scroll.p95FrameMs", s?.p95FrameMs, budget.scroll?.p95FrameMs, "ms");
  check("scroll.cls", s?.cls, budget.scroll?.cls, "score");
  check("scroll.inp", s?.inp, budget.scroll?.inp, "ms");
  return findings;
}

export function formatValue(value: number, unit: Finding["unit"]): string {
  if (unit === "bytes") {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} kB`;
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }
  if (unit === "ms") return `${Math.round(value)} ms`;
  if (unit === "score") return value.toFixed(3);
  return String(value);
}

/** A Markdown table of findings (for reports and the GitHub step summary). */
export function findingsMarkdown(findings: readonly Finding[], title = "heft"): string {
  const failed = findings.filter((f) => !f.pass).length;
  const rows = findings.map(
    (f) =>
      `| ${f.metric}${f.file ? ` (${f.file})` : ""} | ${formatValue(f.actual, f.unit)} | ${formatValue(f.limit, f.unit)} | ${f.pass ? "pass" : "**over**"} |`,
  );
  return [
    `## ${title}: ${failed === 0 ? "within budget" : `${failed} over budget`}`,
    "",
    "| Metric | Measured | Budget | Result |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

/** GitHub Actions error annotations, one line per failed finding. */
export function githubAnnotations(findings: readonly Finding[]): string[] {
  return findings
    .filter((f) => !f.pass)
    .map(
      (f) =>
        `::error title=heft ${f.metric}${f.file ? `,file=${f.file}` : ""}::${f.metric} is ${formatValue(f.actual, f.unit)}, budget ${formatValue(f.limit, f.unit)}`,
    );
}
