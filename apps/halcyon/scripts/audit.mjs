#!/usr/bin/env node
// The accessibility audit halcyon shows on its own page. Starts the production build (build
// first), then in each motion level (full, reduced, static: ?motion=<level>) runs axe-core
// with the WCAG 2.0/2.1/2.2 A and AA rules, and Lighthouse with its default mobile profile.
// Writes reports/halcyon/audit.json and audit.md.
//
//   --strict   exit 1 on any axe violation, or a Lighthouse accessibility score under 100
//   --no-lighthouse   axe only
//
// In GitHub Actions it records the run's URL and commit, and writes `changed=true` to
// $GITHUB_OUTPUT when the results differ from the committed report (ignoring the date, the
// run and performance, which moves from run to run), so CI publishes only real changes.
// PW_CHANNEL=chrome uses an installed Chrome for axe; CHROME_PATH picks Lighthouse's browser.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";
import { REPORTS, withServer } from "./serve.mjs";

const require = createRequire(import.meta.url);
const strict = process.argv.includes("--strict");
const withLighthouse = !process.argv.includes("--no-lighthouse");
const LEVELS = ["full", "reduced", "static"];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const out = path.join(REPORTS, "audit.json");
let axeVersion = "unknown";
const channel = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};

function commit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function environment() {
  if (process.env.GITHUB_ACTIONS === "true") {
    const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: run } = process.env;
    return {
      kind: "ci",
      name: "GitHub Actions",
      ...(server && repo && run ? { runUrl: `${server}/${repo}/actions/runs/${run}` } : {}),
    };
  }
  return { kind: "local", name: "a local machine (CI has not published a run yet)" };
}

async function axe(browser, url, level) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${url}/?motion=${level}`, { waitUntil: "load" });
  // Let the page settle into its level (stillness mounts, the hero draws).
  await page.waitForFunction((l) => document.documentElement.dataset.motion === l, level);
  await page.waitForTimeout(1200);
  const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  await context.close();
  axeVersion = result.testEngine.version;
  return {
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? null,
      help: v.help,
      nodes: v.nodes.length,
    })),
    passes: result.passes.length,
    incomplete: result.incomplete.length,
  };
}

function lighthouseChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try {
    const bundled = chromium.executablePath();
    if (existsSync(bundled)) return bundled;
  } catch {
    // No bundled browser: chrome-launcher finds an installed Chrome.
  }
  return undefined;
}

async function lighthouseRun(url, level) {
  const { default: lighthouse } = await import("lighthouse");
  const chromeLauncher = await import("chrome-launcher");
  const chromePath = lighthouseChrome();
  const chrome = await chromeLauncher.launch({
    ...(chromePath ? { chromePath } : {}),
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });
  try {
    const result = await lighthouse(`${url}/?motion=${level}`, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["accessibility", "best-practices", "seo", "performance"],
    });
    const c = result?.lhr.categories ?? {};
    return {
      accessibility: c.accessibility?.score ?? 0,
      "best-practices": c["best-practices"]?.score ?? 0,
      seo: c.seo?.score ?? 0,
      performance: c.performance?.score ?? 0,
    };
  } finally {
    chrome.kill();
  }
}

/** The parts of a report that count as a change worth publishing. */
function essence(report) {
  if (!report) return null;
  return JSON.stringify({
    kind: report.environment?.kind,
    tools: report.tools,
    modes: Object.fromEntries(
      Object.entries(report.modes ?? {}).map(([level, m]) => [
        level,
        {
          axe: m.axe.violations,
          lighthouse: m.lighthouse && {
            accessibility: m.lighthouse.accessibility,
            "best-practices": m.lighthouse["best-practices"],
            seo: m.lighthouse.seo,
          },
        },
      ]),
    ),
  });
}

function markdown(report) {
  const score = (n) => (n === undefined ? "-" : String(Math.round(n * 100)));
  const rows = LEVELS.map((level) => {
    const m = report.modes[level];
    return `| ${level} | ${m.axe.violations.length} | ${m.axe.passes} | ${score(m.lighthouse?.accessibility)} | ${score(m.lighthouse?.["best-practices"])} | ${score(m.lighthouse?.seo)} | ${score(m.lighthouse?.performance)} |`;
  });
  const details = LEVELS.flatMap((level) =>
    report.modes[level].axe.violations.map(
      (v) => `- ${level}: ${v.id} (${v.impact ?? "unrated"}): ${v.help}, ${v.nodes} element(s)`,
    ),
  );
  return [
    "# halcyon: accessibility audit",
    "",
    `Run by ${report.environment.name} on ${report.createdAt}${report.commit ? `, commit ${report.commit.slice(0, 7)}` : ""}.`,
    `axe-core ${report.tools.axe} (${report.tags.join(", ")}); Lighthouse ${report.tools.lighthouse ?? "not run"}.`,
    "",
    "| Level | axe violations | axe passes | LH accessibility | LH best practices | LH SEO | LH performance |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    ...(details.length ? ["## Violations", "", ...details, ""] : ["No axe violations.", ""]),
  ].join("\n");
}

const previous = await readFile(out, "utf8")
  .then(JSON.parse)
  .catch(() => null);

const report = await withServer(3403, async (url) => {
  const browser = await chromium.launch(channel);
  const modes = {};
  try {
    for (const level of LEVELS) {
      console.log(`axe: ${level}`);
      modes[level] = { axe: await axe(browser, url, level), lighthouse: null };
    }
  } finally {
    await browser.close();
  }
  if (withLighthouse) {
    for (const level of LEVELS) {
      console.log(`lighthouse: ${level}`);
      modes[level].lighthouse = await lighthouseRun(url, level);
    }
  }
  return {
    createdAt: new Date().toISOString(),
    commit: commit(),
    environment: environment(),
    tools: {
      axe: axeVersion,
      lighthouse: withLighthouse ? require("lighthouse/package.json").version : null,
    },
    tags: TAGS,
    modes,
  };
});

await mkdir(REPORTS, { recursive: true });
await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(REPORTS, "audit.md"), markdown(report));
console.log(markdown(report));

const changed = essence(previous) !== essence(report);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
console.log(changed ? "Results changed." : "Results unchanged.");

if (strict) {
  const failures = LEVELS.filter(
    (level) =>
      report.modes[level].axe.violations.length > 0 ||
      (report.modes[level].lighthouse && report.modes[level].lighthouse.accessibility < 1),
  );
  if (failures.length) {
    console.error(`Accessibility gate failed in: ${failures.join(", ")}`);
    process.exitCode = 1;
  }
}
