import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { runSheet } from "../src/index.js";

// A synthetic two-chapter scene with known faults: a subject staged for landscape that
// falls off a phone screen, a tiny button, overlapping captions and an oversized canvas.
const PAGE = `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
  body { margin: 0; font: 16px system-ui; background: #050505; color: #edeae4; }
  section { position: relative; height: 100vh; overflow: hidden; }
  .scene { position: absolute; inset: 0; }
  .tiny { position: absolute; left: 16px; bottom: 16px; width: 18px; height: 18px; }
  .a, .b { position: absolute; left: 16px; margin: 0; }
  .a { top: 40px; } .b { top: 52px; }
  canvas { position: absolute; right: 0; top: 0; width: 100px; height: 100px; }
</style></head><body>
  <section data-chapter="hero">
    <div class="scene"></div>
    <p class="a">First caption</p><p class="b">Second caption</p>
    <button class="tiny" aria-label="Next">›</button>
  </section>
  <section data-chapter="detail"><h2 style="margin:16px">Detail</h2><canvas width="4000" height="4000"></canvas></section>
  <script>
    // Stand-in for safeframe: a subject fixed at 900..1100 px, as if staged for desktop only.
    const scene = document.querySelector(".scene");
    scene.dataset.sfSubject = "900 200 200 300";
    scene.dataset.sfBucket = innerWidth < 600 ? "tall-phone" : "desktop";
  </script>
</body></html>`;

test("runs profiles, flags the faults and writes the sheet", async () => {
  test.setTimeout(120_000);
  const dir = await mkdtemp(path.join(tmpdir(), "contactsheet-"));
  const file = path.join(dir, "scene.html");
  await writeFile(file, PAGE);

  const result = await runSheet({
    url: pathToFileURL(file).href,
    out: path.join(dir, "out"),
    profiles: ["iPhone SE", "Desktop 1440p"],
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  });

  expect(result.sheet.chapters).toEqual(["hero", "detail"]);
  expect(result.sheet.rows).toHaveLength(2);

  const phone = result.sheet.rows[0];
  const desktop = result.sheet.rows[1];
  const kinds = (row: typeof phone) =>
    row?.cells.flatMap((cell) => cell.flags.map((f) => f.kind)) ?? [];
  // On a phone the desktop-staged subject is off screen; on a 2560px desktop it fits.
  expect(kinds(phone)).toContain("subject-outside-frame");
  expect(kinds(desktop)).not.toContain("subject-outside-frame");
  for (const row of [phone, desktop]) {
    expect(kinds(row)).toContain("tap-target");
    expect(kinds(row)).toContain("text-overlap");
    expect(kinds(row)).toContain("canvas-budget");
  }

  for (const output of [result.html, result.json, result.png ?? ""]) {
    expect((await stat(output)).size).toBeGreaterThan(0);
  }
  const html = await readFile(result.html, "utf8");
  expect(html).toContain("iPhone SE");
  expect(html).toContain("Desktop 1440p");
  const shot = phone?.cells[0]?.image ?? "";
  expect((await stat(path.join(dir, "out", shot))).size).toBeGreaterThan(0);
});
