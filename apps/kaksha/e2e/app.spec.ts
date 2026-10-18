import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { waitForServiceWorker } from "./helpers";

const ROSTER = [
  "Roll No,Name",
  "1,Asha Aamla",
  "2,",
  "3,Bunty Barfi",
  "1,Duplicate Roll",
  "4,Chinki Chandni",
  `5,${"x".repeat(90)}`,
  "6,Dabbu Dhoop",
].join("\n");

async function addClass(page: Page) {
  await page.getByRole("button", { name: "Add a class" }).first().click();
  await page.getByLabel("School name").fill("Imli Chowk Primary School (invented)");
  await page.getByLabel("Class or grade").fill("4");
  await page.getByLabel("Section").fill("B");
  await page.getByRole("button", { name: "Next: add students" }).click();
  await expect(page.getByRole("heading", { name: "Add a list of students" })).toBeVisible();
}

async function importRoster(page: Page, viaFile = false) {
  if (viaFile) {
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "roster.csv", mimeType: "text/csv", buffer: Buffer.from(ROSTER) });
  } else {
    await page.getByLabel("Or paste here").fill(ROSTER);
  }
  await expect(page.getByText("4 students ready to add")).toBeVisible();
  // Bad rows are reported by line, with the reason, and not added.
  await expect(page.getByText("Line 3: no name")).toBeVisible();
  await expect(page.getByText("Line 5: this roll number is already used")).toBeVisible();
  await expect(page.getByText("Line 7: too long to be a name or roll number")).toBeVisible();
  await page.getByRole("button", { name: "Add 4 students" }).click();
  await expect(page.getByText("Added 4 students.")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
}

async function newKeyTest(page: Page, keys: string) {
  await page.getByRole("button", { name: "New test" }).click();
  await page.getByRole("button", { name: /Answer key test/ }).click();
  await page.getByLabel("Name of the test").fill("Unit check");
  await page.getByLabel("Subject").fill("Maths");
  await page.getByRole("spinbutton", { name: "Questions" }).fill(String(keys.length));
  const pad = page.getByRole("group", { name: /Answer key: question/ });
  for (const k of keys) await pad.getByRole("button", { name: k, exact: true }).click();
  await page.getByRole("button", { name: "Create and start marking" }).click();
  await expect(page.getByTestId("who")).toBeVisible();
}

async function tap(page: Page, value: string) {
  await page
    .getByRole("group", { name: /^Answer for/ })
    .getByRole("button", { name: value, exact: true })
    .click();
}

test.describe("the app", () => {
  test("a whole marking session works offline, and makes no network requests once installed", async ({
    page,
    context,
  }) => {
    await page.goto("/app");
    await waitForServiceWorker(page);
    // The first visit installs the service worker; from the next load it serves everything.
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);

    const network: string[] = [];
    page.on("requestfinished", async (req) => {
      const res = await req.response();
      if (!req.url().startsWith("http")) return;
      if (res && !res.fromServiceWorker()) network.push(req.url());
    });
    context.on("request", (req) => {
      if (req.serviceWorker()) network.push(`sw: ${req.url()}`);
    });

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Start with your class" })).toBeVisible();

    await addClass(page);
    await importRoster(page);
    await newKeyTest(page, "ABCD");

    // 4 students x 4 questions, by question, with one absent and one blank.
    for (const q of ["A", "B", "C", "D"]) {
      for (let s = 0; s < 4; s++) {
        if (q === "A" && s === 3) {
          await page.getByRole("button", { name: "Absent", exact: true }).click();
          continue;
        }
        if (q !== "A" && s === 3) continue; // absent students are skipped automatically
        await tap(page, s === 1 && q === "B" ? "Left blank" : s === 2 ? "A" : q);
      }
    }
    await expect(page.getByText("Every student is marked.")).toBeVisible();
    await page.getByRole("button", { name: "Results" }).click();
    await expect(page.getByText(/Based on 3 students/)).toBeVisible();
    await expect(page.getByText("Attendance (1 absent)")).toBeVisible();

    // Reports and the class view also come from the phone.
    await page.getByRole("button", { name: "Class summary" }).click();
    await expect(page.getByRole("article")).toContainText("Unit check");

    expect(network, network.join("\n")).toEqual([]);
    await context.setOffline(false);
  });

  test("undo puts back the last tap and the position", async ({ page }) => {
    await page.goto("/app");
    await addClass(page);
    await importRoster(page, true);
    await newKeyTest(page, "AB");
    await expect(page.getByTestId("who")).toContainText("Asha Aamla");
    await tap(page, "C");
    await expect(page.getByTestId("who")).toContainText("Bunty Barfi");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByTestId("who")).toContainText("Asha Aamla");
    await expect(page.getByTestId("who")).toContainText("Not marked yet");
    // Nothing is lost on a reload: taps are written as they happen.
    await tap(page, "A");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Promise<number>((resolve) => {
              const r = indexedDB.open("kaksha");
              r.onsuccess = () => {
                const q = r.result.transaction("responses").objectStore("responses").count();
                q.onsuccess = () => resolve(q.result);
              };
            }),
        ),
      )
      .toBe(1);
    await page.reload();
    await expect(page.getByTestId("who")).toContainText("Bunty Barfi");
  });

  test("backup, wipe and restore round-trip; a wrong passphrase fails cleanly", async ({
    page,
  }) => {
    await page.goto("/app");
    await addClass(page);
    await importRoster(page);
    await newKeyTest(page, "AB");
    for (let i = 0; i < 8; i++) await tap(page, i % 2 ? "B" : "A");
    await page.goto("/app#/settings");

    await page.getByRole("button", { name: "Make a backup" }).click();
    await page.getByLabel("Passphrase", { exact: true }).fill("chalk and slate");
    await page.getByLabel("Passphrase again").fill("chalk and slate");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Lock and share" }).click(),
    ]);
    const file = await download.path();
    expect(download.suggestedFilename()).toMatch(/^kaksha-backup-\d{4}-\d{2}-\d{2}\.kaksha\.txt$/);
    const text = readFileSync(file, "utf8");
    expect(text).not.toContain("Asha");
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: "Delete all data" }).click();
    await page.getByLabel("Type the word here").fill("delete");
    await page.getByRole("dialog").getByRole("button", { name: "Delete all data" }).click();
    await expect(page.getByRole("heading", { name: "Start with your class" })).toBeVisible();

    await page.goto("/app#/settings");
    await page.getByRole("button", { name: "Open a backup" }).click();
    await page.locator('dialog input[type="file"]').setInputFiles(file);
    await page.getByLabel("Passphrase").fill("wrong passphrase");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByRole("alert")).toHaveText("That passphrase does not open this file.");

    await page.getByLabel("Passphrase").fill("chalk and slate");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(
      page.getByText(/This backup holds 1 classes, 4 students and 1 tests/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Restore", exact: true }).click();
    await expect(page.getByText(/Done: \d+ added/)).toBeVisible();

    await page.goto("/app#/");
    await expect(page.getByText("Class 4 B · ")).toBeVisible();
    await page.getByText("Class 4 B · ").click();
    await expect(page.getByText("Marked", { exact: true })).toBeVisible();
  });

  test("a rubric is marked level by level, with a note", async ({ page }) => {
    await page.goto("/app");
    await addClass(page);
    await importRoster(page);
    await page.getByRole("button", { name: "New test" }).click();
    await page.getByRole("button", { name: /Writing rubric \(example\)/ }).click();
    await expect(page.getByTestId("who")).toContainText("Asha Aamla");
    for (const name of [
      "Ideas",
      "Organisation",
      "Word choice",
      "Sentences",
      "Spelling and punctuation",
    ]) {
      await page
        .getByRole("group", { name })
        .getByRole("button", { name: /^3 · Secure/ })
        .click();
    }
    await expect(page.getByText("5 of 5 criteria")).toBeVisible();
    await page.getByLabel("Short note (optional)").fill("Lovely story about the monsoon.");
    await page.getByRole("button", { name: "Next student" }).click();
    await expect(page.getByTestId("who")).toContainText("Bunty Barfi");
  });

  test("switches to Hindi everywhere, with Indian number and date formats", async ({ page }) => {
    await page.goto("/app?demo=1&lang=hi");
    await expect(page.getByRole("heading", { name: "आपकी कक्षाएँ" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: "Your classes" })).toBeVisible();
    await page.goto("/app?demo=1#/test/demo-maths-aug");
    await expect(page.getByText(/· 18\/08\/2026/)).toBeVisible();
  });

  test("the demo never touches the real database", async ({ page }) => {
    await page.goto("/app?demo=1");
    await expect(page.getByText(/Demo: an invented school/)).toBeVisible();
    await expect(page.getByText("Imli Chowk Primary School (invented)")).toBeVisible();
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Start with your class" })).toBeVisible();
    const dbs = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
    expect(dbs).toContain("kaksha-demo");
  });

  test("serves /app with a policy that forbids other origins", async ({ request }) => {
    const res = await request.get("/app");
    const csp = res.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("default-src 'self'");
    const html = await res.text();
    expect(html).not.toMatch(/googletagmanager|vercel-insights|_vercel\/insights|sentry/i);
  });
});
