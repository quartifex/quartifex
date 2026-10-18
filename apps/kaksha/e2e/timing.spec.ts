import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { seedClass } from "./helpers";

// Job 1: a 20-question test for 40 students in under 10 minutes.
// A person's pace is set by reading the sheet and finding the button, not by the app,
// so we measure what the app adds to each tap on a slowed-down phone (4x CPU) and add
// a teacher's reading time per answer. The result is logged to reports/kaksha/timing.json.
const QUESTIONS = 20;
const STUDENTS = 40;
const HUMAN_MS = 600; // a brisk teacher: glance at the sheet, tap (an assumption, stated)

test("20 questions x 40 students fits in 10 minutes, with the app's own time measured", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto("/app");
  await page.waitForSelector(".onb, .k-main");
  const { testId } = await seedClass(page, {
    students: STUDENTS,
    items: QUESTIONS,
    testId: "timing-test",
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(`/app#/test/${testId}/mark`);
  // A fresh test asks who is here first; everyone is.
  await page.getByRole("button", { name: /Start marking/ }).click();
  await page.waitForSelector('[data-testid="who"]');

  const pad = page.getByRole("group", { name: /^Answer for/ });
  const keys = ["A", "B", "C", "D"];
  const latencies: number[] = [];
  const start = Date.now();
  for (let q = 0; q < QUESTIONS; q++) {
    for (let s = 0; s < STUDENTS; s++) {
      const who = await page.getByTestId("who").textContent();
      const t0 = Date.now();
      await pad.getByRole("button", { name: keys[(q + s) % 4] ?? "A", exact: true }).click();
      // The tap is done when the next child's name is on screen.
      if (!(q === QUESTIONS - 1 && s === STUDENTS - 1)) {
        await expect(page.getByTestId("who")).not.toHaveText(who ?? "");
      }
      latencies.push(Date.now() - t0);
    }
  }
  const machineMs = Date.now() - start;
  await expect(page.getByText("Every student is marked.")).toBeVisible();
  const saved = await page.evaluate(
    (id) =>
      new Promise<number>((resolve) => {
        const r = indexedDB.open("kaksha");
        r.onsuccess = () => {
          const q = r.result
            .transaction("responses")
            .objectStore("responses")
            .index("assessmentId")
            .count(id);
          q.onsuccess = () => resolve(q.result);
        };
      }),
    testId,
  );
  expect(saved).toBe(QUESTIONS * STUDENTS);

  const sorted = [...latencies].sort((a, b) => a - b);
  const p = (x: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * x))] ?? 0;
  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const projectedMs = latencies.length * (HUMAN_MS + mean);
  const report = {
    date: new Date().toISOString(),
    taps: latencies.length,
    cpuThrottle: 4,
    appMsPerTap: {
      mean: Math.round(mean),
      p50: p(0.5),
      p95: p(0.95),
      max: sorted[sorted.length - 1],
    },
    machineRunSeconds: Math.round(machineMs / 1000),
    assumedTeacherMsPerTap: HUMAN_MS,
    projectedMinutes: +(projectedMs / 60000).toFixed(1),
    targetMinutes: 10,
  };
  const out = path.join(import.meta.dirname, "..", "..", "..", "reports", "kaksha");
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, "timing.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`timing: ${JSON.stringify(report)}`);
  expect(report.projectedMinutes).toBeLessThan(10);
});
