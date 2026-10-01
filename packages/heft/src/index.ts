// @quartifex/heft (L03, Quality & testing). Page-weight and scroll-performance budgets as a
// CI check: we weigh the built assets (rushes manifests, GLBs, textures), load the page in
// Playwright, scroll all the way through it, and fail the build on over-budget bytes, long
// frames, layout shift or slow interactions. Node and Playwright; the parts that run in
// the browser are in ./browser. A GitHub Action wraps the CLI (action.yml).
import { appendFile, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { type Browser, chromium } from "@playwright/test";
import { parseManifest } from "@quartifex/rushes/manifest";
import {
  type Budget,
  evaluate,
  type Finding,
  findingsMarkdown,
  githubAnnotations,
  type Measurements,
} from "./budget.js";
import { installObservers, readScroll, readTransfer, scrollThrough } from "./collect.js";
import { parseGlb } from "./glb.js";

export {
  type Budget,
  evaluate,
  type Finding,
  findingsMarkdown,
  formatValue,
  githubAnnotations,
  type Measurements,
} from "./budget.js";
export { type GlbInfo, parseGlb } from "./glb.js";

const TEXTURE = /\.(png|jpe?g|webp|avif|ktx2|basis|hdr|exr)$/i;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && !entry.name.startsWith("."))
        out.push(...(await walk(full)));
    } else out.push(full);
  }
  return out;
}

/**
 * Weigh the assets under `dir`: GLBs (bytes, triangles), textures, and rushes sequences
 * (their manifests' largest tier). Frames that belong to a sequence are not counted again
 * as textures.
 */
export async function weighAssets(dir: string): Promise<NonNullable<Measurements["assets"]>> {
  const files = await walk(dir);
  const sequenceDirs: string[] = [];
  const sequences: NonNullable<Measurements["assets"]>["sequences"] = [];
  for (const file of files.filter((f) => path.basename(f) === "manifest.json")) {
    try {
      const manifest = parseManifest(JSON.parse(await readFile(file, "utf8")));
      const largest = manifest.tiers[manifest.tiers.length - 1];
      const bytes = Math.max(
        ...Object.values(largest?.bytes ?? {}).filter((n): n is number => typeof n === "number"),
        0,
      );
      sequences.push({ file: path.relative(dir, file), largestTierBytes: bytes });
      sequenceDirs.push(path.dirname(file) + path.sep);
    } catch {
      // Not a rushes manifest.
    }
  }
  let totalBytes = 0;
  let textureBytes = 0;
  const glbs: NonNullable<Measurements["assets"]>["glbs"] = [];
  for (const file of files) {
    const { size } = await stat(file);
    if (/\.glb$/i.test(file)) {
      const info = parseGlb(await readFile(file));
      glbs.push({ file: path.relative(dir, file), bytes: size, triangles: info.triangles });
      totalBytes += size;
    } else if (TEXTURE.test(file)) {
      totalBytes += size;
      if (!sequenceDirs.some((d) => file.startsWith(d))) textureBytes += size;
    }
  }
  return { totalBytes, glbs, textureBytes, sequences };
}

export type HeftOptions = {
  /** Page to load and scroll. Optional: without it only the assets are checked. */
  url?: string;
  /** Build output to weigh (e.g. `out`, `.next/static`, `public`). Optional. */
  dir?: string;
  budget: Budget;
  browser?: Browser;
  channel?: string;
  viewport?: { width: number; height: number };
  /** Click these selectors after the scroll, to measure interaction latency. Default: the first button or link. */
  interactions?: string[];
  /** Where to write heft.json and heft.md. Optional. */
  out?: string;
};

export type HeftResult = {
  measurements: Measurements;
  findings: Finding[];
  pass: boolean;
  markdown: string;
};

/** Measure, compare with the budget, and (on GitHub Actions) annotate and summarise. */
export async function runHeft(options: HeftOptions): Promise<HeftResult> {
  const measurements: Measurements = {};
  if (options.dir) measurements.assets = await weighAssets(options.dir);

  if (options.url) {
    const browser =
      options.browser ??
      (await chromium.launch(options.channel ? { channel: options.channel } : {}));
    try {
      const context = await browser.newContext({
        viewport: options.viewport ?? { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      // Passed as functions (not closures) so Playwright can serialise them into the page.
      await page.addInitScript(installObservers as () => void);
      await page.goto(options.url, { waitUntil: "load" });
      await page.waitForTimeout(500);
      measurements.page = await page.evaluate(
        readTransfer as () => ReturnType<typeof readTransfer>,
      );
      const durationMs = options.budget.scroll?.durationMs ?? 12_000;
      await page.evaluate(scrollThrough as (o: { durationMs: number }) => Promise<void>, {
        durationMs,
      });
      for (const selector of options.interactions ?? ["button, a[href], [role=button]"]) {
        const target = page.locator(selector).first();
        if (await target.count()) {
          await target.scrollIntoViewIfNeeded();
          await target.click({ trial: false, noWaitAfter: true }).catch(() => {});
        }
      }
      await page.waitForTimeout(300);
      measurements.scroll = await page.evaluate(readScroll as () => ReturnType<typeof readScroll>);
      await context.close();
    } finally {
      if (!options.browser) await browser.close();
    }
  }

  const findings = evaluate(measurements, options.budget);
  const pass = findings.every((f) => f.pass);
  const markdown = findingsMarkdown(findings);
  if (options.out) {
    await writeFile(
      path.join(options.out, "heft.json"),
      `${JSON.stringify({ measurements, findings, pass }, null, 2)}\n`,
    );
    await writeFile(path.join(options.out, "heft.md"), markdown);
  }
  if (process.env.GITHUB_ACTIONS === "true") {
    for (const line of githubAnnotations(findings)) console.log(line);
    if (process.env.GITHUB_STEP_SUMMARY)
      await appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  }
  return { measurements, findings, pass, markdown };
}

/** Read a budget file: a heft budget, or a budget.json with a `heft` key. */
export async function readBudget(file: string): Promise<Budget> {
  const raw = JSON.parse(await readFile(file, "utf8")) as Budget & { heft?: Budget };
  return raw.heft ?? raw;
}
