import path from "node:path";
import { expect, test } from "@playwright/test";
import { clippedText } from "./helpers";

// Hindi and English screenshots at 360 and 1280 px (saved locally to reports/kaksha/screens,
// raster is never committed), and a check that no text is cut off at any width.
const OUT = path.join(import.meta.dirname, "..", "..", "..", "reports", "kaksha", "screens");
const SCREENS = [
  ["today", "#/"],
  ["classes", "#/classes"],
  ["insights", "#/insights"],
  ["more", "#/more"],
  ["welcome", "#/welcome/0"],
  ["setup-about", "#/welcome/4"],
  ["setup-class", "#/welcome/5"],
  ["class", "#/class/demo-class-4b"],
  ["students", "#/class/demo-class-4b/students"],
  ["mark", "#/test/demo-maths-sep/mark"],
  ["rubric", "#/test/demo-writing-aug/mark"],
  ["grid", "#/test/demo-maths-aug/grid"],
  ["results", "#/test/demo-maths-aug"],
  ["questions", "#/test/demo-maths-aug/questions"],
  ["question", "#/test/demo-maths-aug/questions/q4"],
  ["skills", "#/test/demo-maths-aug/skills"],
  ["groups", "#/test/demo-maths-aug/groups"],
  ["progress", "#/class/demo-class-4b/progress"],
  ["student", "#/student/demo-student-5"],
  ["report", "#/student/demo-student-5/report"],
  ["notes", "#/student/demo-student-5/notes"],
  ["reports", "#/class/demo-class-4b/reports"],
  ["cards", "#/class/demo-class-4b/cards"],
  ["new-test", "#/class/demo-class-4b/new"],
  ["roster", "#/class/demo-class-4b/roster"],
  ["backup", "#/more/backup"],
  ["display", "#/more/display"],
] as const;

for (const lang of ["en", "hi"] as const) {
  test(`app screens in ${lang}: screenshots, and no clipped text from 320 to 1280 px`, async ({
    page,
  }) => {
    test.setTimeout(600_000);
    const problems: string[] = [];
    for (const [name, hash] of SCREENS) {
      for (const width of [320, 360, 412, 768, 1280]) {
        await page.setViewportSize({ width, height: width < 700 ? 760 : 800 });
        await page.goto(`/app?demo=1&lang=${lang}${hash}`);
        await page.waitForSelector("main", { state: "attached" });
        await page.waitForTimeout(250);
        for (const p of await clippedText(page)) problems.push(`${lang} ${name} @${width}: ${p}`);
        if (width === 360 || width === 1280) {
          await page.screenshot({ path: path.join(OUT, `app-${lang}-${name}-${width}.png`) });
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  test(`site in ${lang}: screenshots, and no clipped text`, async ({ page }) => {
    const problems: string[] = [];
    for (const width of [320, 360, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(lang === "hi" ? "/hi" : "/");
      for (const p of await clippedText(page)) problems.push(`${lang} site @${width}: ${p}`);
      if (width === 360 || width === 1280)
        await page.screenshot({
          path: path.join(OUT, `site-${lang}-${width}.png`),
          fullPage: true,
        });
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
}
