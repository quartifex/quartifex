#!/usr/bin/env node
// AVENUE's accessibility and quality audit, against the production build (build first):
// axe-core (WCAG 2.0, 2.1 and 2.2, A and AA) in the states that matter most (the page as it
// loads, the demo on the driver's screen while moving, a rear screen with a share waiting,
// the SOS countdown, the docs), and Lighthouse's default mobile run. Writes
// reports/avenue/audit.json and audit.md.
//   --strict          exit 1 on any axe violation or an accessibility score under 100
//   --no-lighthouse   axe only
// PW_CHANNEL=chrome uses an installed Chrome for axe; CHROME_PATH picks Lighthouse's browser.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";
import { REPORTS, withServer } from "./serve.mjs";

const strict = process.argv.includes("--strict");
const withLighthouse = !process.argv.includes("--no-lighthouse");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const channel = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};

const STATES = {
  "page as loaded": async () => {},
  "driver, moving": async (page) => {
    await page.locator("#demo").scrollIntoViewIfNeeded();
    await page.getByRole("radio", { name: /^Driver/ }).click();
    await page.getByRole("radio", { name: "Moving" }).click();
  },
  "rear screen, share waiting": async (page) => {
    await page.locator("#demo").scrollIntoViewIfNeeded();
    await page
      .locator("#demo footer")
      .getByRole("button", { name: /Send to another screen/ })
      .first()
      .click();
    await page.locator("#demo").getByRole("button", { name: "Rear right" }).first().click();
    await page.getByRole("radio", { name: /^Rear right/ }).click();
  },
  "SOS countdown": async (page) => {
    await page.locator("#demo").scrollIntoViewIfNeeded();
    await page.locator("#demo").getByRole("button", { name: "Emergency SOS" }).click();
  },
  "requirement card open": async (page) => {
    await page.locator("#requirements").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Card A:/ }).click();
  },
};

async function axe(browser, url) {
  const out = {};
  for (const [name, prepare] of Object.entries(STATES)) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${url}/?rung=poster`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await prepare(page);
    await page.waitForTimeout(700);
    const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    out[name] = {
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? null,
        help: v.help,
        nodes: v.nodes.length,
        targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
      })),
      passes: result.passes.length,
      version: result.testEngine.version,
    };
    await context.close();
  }
  return out;
}

async function lighthouseRun(url) {
  const { default: lighthouse } = await import("lighthouse");
  const chromeLauncher = await import("chrome-launcher");
  let chromePath = process.env.CHROME_PATH;
  if (!chromePath) {
    try {
      const bundled = chromium.executablePath();
      if (existsSync(bundled)) chromePath = bundled;
    } catch {
      // chrome-launcher finds an installed Chrome.
    }
  }
  const chrome = await chromeLauncher.launch({
    ...(chromePath ? { chromePath } : {}),
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["accessibility", "best-practices", "seo", "performance"],
    });
    // A run that could not load the page has no scores; say so rather than report zeros.
    if (!result || result.lhr.runtimeError) {
      throw new Error(`Lighthouse failed: ${result?.lhr.runtimeError?.message ?? "no result"}`);
    }
    const c = result.lhr.categories;
    const a = result.lhr.audits;
    return {
      accessibility: c.accessibility?.score ?? 0,
      "best-practices": c["best-practices"]?.score ?? 0,
      seo: c.seo?.score ?? 0,
      performance: c.performance?.score ?? 0,
      lcpMs: a["largest-contentful-paint"]?.numericValue ?? null,
      cls: a["cumulative-layout-shift"]?.numericValue ?? null,
      tbtMs: a["total-blocking-time"]?.numericValue ?? null,
    };
  } finally {
    chrome.kill();
  }
}

const report = await withServer(3503, async (url) => {
  const browser = await chromium.launch(channel);
  try {
    const states = await axe(browser, url);
    const lh = withLighthouse ? await lighthouseRun(url) : null;
    return { date: new Date().toISOString(), tags: TAGS, states, lighthouse: lh };
  } finally {
    await browser.close();
  }
});

const pct = (n) => (n === undefined || n === null ? "-" : String(Math.round(n * 100)));
const rows = Object.entries(report.states).map(
  ([name, s]) =>
    `| ${name} | ${s.violations.length} | ${s.passes} | ${s.violations.map((v) => `${v.id} (${v.nodes})`).join(", ") || "-"} |`,
);
const lh = report.lighthouse;
const md = `# AVENUE audit

${report.date}. axe-core ${Object.values(report.states)[0]?.version ?? ""}, rules ${TAGS.join(", ")}.

| State | Violations | Passes | Rules |
| --- | --- | --- | --- |
${rows.join("\n")}

${lh ? `Lighthouse (default mobile): accessibility ${pct(lh.accessibility)}, best practices ${pct(lh["best-practices"])}, SEO ${pct(lh.seo)}, performance ${pct(lh.performance)}; LCP ${Math.round(lh.lcpMs ?? 0)} ms, CLS ${(lh.cls ?? 0).toFixed(3)}, TBT ${Math.round(lh.tbtMs ?? 0)} ms.` : "Lighthouse not run."}

Automated checks find only part of the problems; a pass here is not a full accessibility review.
`;
await mkdir(REPORTS, { recursive: true });
await writeFile(path.join(REPORTS, "audit.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(REPORTS, "audit.md"), md);
console.log(md);
const failing =
  Object.values(report.states).some((s) => s.violations.length) || (lh && lh.accessibility < 1);
if (strict && failing) process.exitCode = 1;
