// @quartifex/contactsheet (L27, Quality & testing). Runs a scroll scene across a matrix
// of 30+ viewport, pixel-ratio and aspect profiles, scrolls to each chapter, and writes
// one contact sheet with automatic flags: subject outside the safe frame, overlapping
// text, small tap targets, canvas pixels over budget, layout shift.
// Node and Playwright. The checks are browser-safe in ./checks.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { type Browser, chromium, type Page } from "@playwright/test";
import { findChapters, scrollToProgress } from "@quartifex/dailies";
import {
  type CheckOptions,
  type CollectOptions,
  collectSnapshot,
  evaluate,
  LAYOUT_SHIFT_SCRIPT,
} from "./checks.js";
import type { Profile } from "./profiles.js";
import { selectProfiles } from "./profiles.js";
import { type Cell, type Row, renderHtml, type Sheet, summarise } from "./report.js";

export {
  type CheckOptions,
  type CollectOptions,
  collectSnapshot,
  evaluate,
  type Flag,
  type FlagKind,
  LAYOUT_SHIFT_SCRIPT,
  type Rect,
  type Snapshot,
} from "./checks.js";
export { GROUPS, PROFILES, type Profile, type ProfileGroup, selectProfiles } from "./profiles.js";
export { type Cell, type Row, renderHtml, type Sheet, summarise } from "./report.js";

export type SheetOptions = {
  url: string;
  /** Output folder for the screenshots, `contactsheet.html`, `.json` and `.png`. */
  out: string;
  /** Profiles, or group and profile names. Default: all. */
  profiles?: readonly (string | Profile)[];
  /** Chapter elements. Default `[data-chapter]`; a page without any is shot once, at the top. */
  chapters?: string;
  /** Where in each chapter to shoot, 0 to 1. Default 0.5. */
  at?: number;
  checks?: CheckOptions;
  collect?: CollectOptions;
  /** Reuse a browser; otherwise Chromium is launched (with `channel`, if given) and closed. */
  browser?: Browser;
  channel?: string;
  /** Called after navigation, before chapters are read (wait for fonts, a preloader, etc). */
  ready?: (page: Page) => Promise<void>;
  /** Frame height in the HTML sheet. Default 220. */
  thumbHeight?: number;
  /** Also save a PNG of the whole sheet. Default true. */
  png?: boolean;
  /** Progress callback, one call per profile. */
  onProfile?: (profile: Profile, index: number, total: number) => void;
};

export type SheetResult = {
  sheet: Sheet;
  counts: Record<string, number>;
  html: string;
  json: string;
  png?: string;
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Run the matrix and write the contact sheet. */
export async function runSheet(options: SheetOptions): Promise<SheetResult> {
  const profiles = selectProfiles(options.profiles);
  const browser =
    options.browser ?? (await chromium.launch(options.channel ? { channel: options.channel } : {}));
  const out = path.resolve(options.out);
  await mkdir(out, { recursive: true });

  const rows: Row[] = [];
  const chapterOrder: string[] = [];
  try {
    for (const [index, profile] of profiles.entries()) {
      options.onProfile?.(profile, index, profiles.length);
      const context = await browser.newContext({
        viewport: { width: profile.width, height: profile.height },
        deviceScaleFactor: profile.dpr,
        isMobile: profile.mobile,
        hasTouch: profile.touch,
        ...(profile.userAgent ? { userAgent: profile.userAgent } : {}),
      });
      const page = await context.newPage();
      try {
        await page.addInitScript(LAYOUT_SHIFT_SCRIPT);
        await page.goto(options.url, { waitUntil: "load" });
        await options.ready?.(page);
        const found = await findChapters(page, { selector: options.chapters ?? "[data-chapter]" });
        const chapters = found.length ? found : [{ name: "page", start: 0, end: 0 }];
        const cells: Cell[] = [];
        for (const chapter of chapters) {
          if (!chapterOrder.includes(chapter.name)) chapterOrder.push(chapter.name);
          const at = options.at ?? 0.5;
          await scrollToProgress(page, chapter.start + (chapter.end - chapter.start) * at);
          const file = path.join(slug(profile.name), `${slug(chapter.name) || "chapter"}.png`);
          await mkdir(path.join(out, path.dirname(file)), { recursive: true });
          await page.screenshot({
            path: path.join(out, file),
            animations: "disabled",
            caret: "hide",
          });
          const snapshot = await page.evaluate(collectSnapshot, options.collect ?? {});
          cells.push({
            chapter: chapter.name,
            image: file.split(path.sep).join("/"),
            flags: evaluate(snapshot, options.checks),
          });
        }
        rows.push({ profile, cells });
      } catch (error) {
        rows.push({
          profile,
          cells: [],
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        await context.close();
      }
    }

    // Align every row to the same chapter columns.
    for (const row of rows) {
      if (row.error) continue;
      row.cells = chapterOrder.map(
        (name) =>
          row.cells.find((cell) => cell.chapter === name) ?? {
            chapter: name,
            image: "",
            flags: [],
          },
      );
    }

    const sheet: Sheet = {
      url: options.url,
      createdAt: new Date().toISOString(),
      chapters: chapterOrder,
      rows,
    };
    const html = path.join(out, "contactsheet.html");
    const json = path.join(out, "contactsheet.json");
    await writeFile(html, renderHtml(sheet, options.thumbHeight));
    await writeFile(json, `${JSON.stringify(sheet, null, 2)}\n`);

    let png: string | undefined;
    if (options.png !== false) {
      const target = path.join(out, "contactsheet.png");
      png = target;
      const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
      const page = await context.newPage();
      await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
      // Wait for the frames to decode, but never forever: a missing or broken image must not
      // hang the run.
      await page.evaluate(() =>
        Promise.race([
          Promise.all(Array.from(document.images, (img) => img.decode().catch(() => null))),
          new Promise((resolve) => setTimeout(resolve, 15_000)),
        ]),
      );
      await page.screenshot({ path: target, fullPage: true, timeout: 120_000 });
      await context.close();
    }
    return { sheet, counts: summarise(sheet), html, json, ...(png ? { png } : {}) };
  } finally {
    if (!options.browser) await browser.close();
  }
}
