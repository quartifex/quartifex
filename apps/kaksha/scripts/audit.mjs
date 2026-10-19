#!/usr/bin/env node
// Accessibility and quality audit for kaksha. Starts the production build (build first),
// runs axe-core (WCAG 2.0, 2.1 and 2.2, A and AA) on the site in English and Hindi, with
// and without reduced motion, and on every app screen of the demo in both languages at
// phone and desktop sizes; then Lighthouse (default mobile profile) on / and /app.
// Writes reports/kaksha/audit.json and audit.md.
//   --strict          exit 1 on any axe violation or a Lighthouse accessibility score under 100
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
const SCREENS = [
  ["today", "#/"],
  ["classes", "#/classes"],
  ["insights", "#/insights"],
  ["more", "#/more"],
  ["backup", "#/more/backup"],
  ["display", "#/more/display"],
  ["welcome", "#/welcome/0"],
  ["setup: about you", "#/welcome/4"],
  ["setup: first class", "#/welcome/5"],
  ["questions", "#/test/demo-maths-aug/questions"],
  ["one question", "#/test/demo-maths-aug/questions/q4"],
  ["skills", "#/test/demo-maths-aug/skills"],
  ["groups", "#/test/demo-maths-aug/groups"],
  ["notes", "#/student/demo-student-5/notes"],
  ["reports", "#/class/demo-class-4b/reports"],
  ["all cards", "#/class/demo-class-4b/cards"],
  ["class tests", "#/class/demo-class-4b"],
  ["class students", "#/class/demo-class-4b/students"],
  ["class progress", "#/class/demo-class-4b/progress"],
  ["roster", "#/class/demo-class-4b/roster"],
  ["new test", "#/class/demo-class-4b/new"],
  ["mark (key)", "#/test/demo-maths-sep/mark"],
  ["mark (rubric)", "#/test/demo-writing-aug/mark"],
  ["grid", "#/test/demo-maths-aug/grid"],
  ["results", "#/test/demo-maths-aug"],
  ["class summary", "#/test/demo-maths-aug/report"],
  ["student", "#/student/demo-student-5"],
  ["report card", "#/student/demo-student-5/report"],
  ["new class", "#/new-class"],
];

async function axe(browser, url, { width, height, reduced }) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(900);
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  await context.close();
  return {
    violations: r.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? null,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
    })),
    passes: r.passes.length,
    version: r.testEngine.version,
  };
}

function lighthouseChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try {
    const bundled = chromium.executablePath();
    if (existsSync(bundled)) return bundled;
  } catch {}
  return existsSync("/opt/google/chrome/chrome") ? "/opt/google/chrome/chrome" : undefined;
}

async function lighthouseRun(url) {
  const { default: lighthouse } = await import("lighthouse");
  const chromeLauncher = await import("chrome-launcher");
  const chromePath = lighthouseChrome();
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
    const c = result?.lhr.categories ?? {};
    const a = result?.lhr.audits ?? {};
    return {
      accessibility: c.accessibility?.score ?? 0,
      "best-practices": c["best-practices"]?.score ?? 0,
      seo: c.seo?.score ?? 0,
      performance: c.performance?.score ?? 0,
      lcpMs: Math.round(a["largest-contentful-paint"]?.numericValue ?? 0),
      tbtMs: Math.round(a["total-blocking-time"]?.numericValue ?? 0),
      cls: +(a["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3),
    };
  } finally {
    chrome.kill();
  }
}

const report = await withServer(3504, async (url) => {
  const browser = await chromium.launch(
    process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {},
  );
  const pages = [];
  for (const route of ["/", "/docs", "/docs/privacy", "/docs/templates"]) {
    for (const reduced of [false, true]) {
      for (const [width, height] of [
        [1280, 800],
        [360, 760],
      ]) {
        pages.push({
          name: `site ${route} ${width}px${reduced ? " reduced motion" : ""}`,
          ...(await axe(browser, `${url}${route}`, { width, height, reduced })),
        });
      }
    }
  }
  for (const lang of ["en", "hi"]) {
    for (const [name, hash] of SCREENS) {
      for (const [width, height] of [
        [360, 760],
        [1280, 800],
      ]) {
        pages.push({
          name: `app ${lang} ${name} ${width}px`,
          ...(await axe(browser, `${url}/app?demo=1&lang=${lang}${hash}`, {
            width,
            height,
            reduced: false,
          })),
        });
      }
    }
  }
  await browser.close();
  const lighthouse = {};
  if (withLighthouse) {
    for (const route of ["/", "/app"]) lighthouse[route] = await lighthouseRun(`${url}${route}`);
  }
  return {
    date: new Date().toISOString(),
    environment: "local machine",
    tags: TAGS,
    axeVersion: pages[0]?.version,
    pages: pages.map(({ version: _v, ...p }) => p),
    lighthouse,
  };
});

const violations = report.pages.flatMap((p) => p.violations.map((v) => ({ page: p.name, ...v })));
const score = (n) => (n === undefined ? "–" : String(Math.round(n * 100)));
const md = [
  `# kaksha audit (${report.date.slice(0, 10)}, ${report.environment})`,
  "",
  `axe-core ${report.axeVersion}, rules ${TAGS.join(", ")}: ${report.pages.length} page states, ${violations.length} violations.`,
  "",
  ...(violations.length
    ? [
        "| Page | Rule | Impact | Nodes |",
        "| --- | --- | --- | --- |",
        ...violations.map((v) => `| ${v.page} | ${v.id} | ${v.impact} | ${v.nodes} |`),
        "",
      ]
    : []),
  "| Lighthouse (mobile) | Accessibility | Best practices | SEO | Performance | LCP | TBT | CLS |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ...Object.entries(report.lighthouse).map(
    ([r, l]) =>
      `| ${r} | ${score(l.accessibility)} | ${score(l["best-practices"])} | ${score(l.seo)} | ${score(l.performance)} | ${l.lcpMs} ms | ${l.tbtMs} ms | ${l.cls} |`,
  ),
  "",
  "Automated checks find only part of the problems; a keyboard and screen-reader pass is still needed.",
  "",
].join("\n");
await mkdir(REPORTS, { recursive: true });
await writeFile(path.join(REPORTS, "audit.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(REPORTS, "audit.md"), md);
console.log(md);
const lhBad = Object.values(report.lighthouse).some((l) => l.accessibility < 1);
if (strict && (violations.length || lhBad)) process.exitCode = 1;
