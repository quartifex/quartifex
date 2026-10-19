// Failure drills and the states they must land on. Each test breaks one thing on
// purpose (storage, a screen, a double tap) and checks what the teacher sees: what
// happened, that their work is safe, and the one thing to do next.
import { expect, type Page, test } from "@playwright/test";

const SEP = "/app?demo=1#/test/demo-maths-sep/mark";

async function tap(page: Page, value: string) {
  await page
    .getByRole("group", { name: /^Answer for/ })
    .getByRole("button", { name: value, exact: true })
    .click();
}

/** Make every IndexedDB write fail with the given DOMException name, or restore it. */
async function breakWrites(page: Page, name: string | null) {
  await page.evaluate((n) => {
    const w = window as unknown as { __put?: unknown; __add?: unknown };
    const proto = IDBObjectStore.prototype as unknown as Record<string, unknown>;
    if (!w.__put) {
      w.__put = proto.put;
      w.__add = proto.add;
    }
    if (n === null) {
      proto.put = w.__put;
      proto.add = w.__add;
      return;
    }
    const fail = () => {
      throw new DOMException("drill", n);
    };
    proto.put = fail;
    proto.add = fail;
  }, name);
}

async function demoCount(page: Page, store: string): Promise<number> {
  return page.evaluate(
    (s) =>
      new Promise<number>((resolve) => {
        const r = indexedDB.open("kaksha-demo");
        r.onsuccess = () => {
          const q = r.result.transaction(s).objectStore(s).count();
          q.onsuccess = () => resolve(q.result);
        };
      }),
    store,
  );
}

test.describe("states and failure drills", () => {
  test("a tap that fails to save says so, keeps the tap, and saves on Try again", async ({
    page,
  }) => {
    await page.goto(SEP);
    await expect(page.getByTestId("who")).toBeVisible();
    // Before any failure the line is honest about saving.
    await tap(page, "A");
    await expect(page.getByTestId("save-line")).toContainText("Saved on this phone at");
    const before = await demoCount(page, "responses");

    await breakWrites(page, "QuotaExceededError");
    const who = await page.getByTestId("who").innerText();
    await tap(page, "B");
    const alert = page.getByTestId("save-alert");
    await expect(alert).toContainText("Taps not saved: 1.");
    await expect(alert).toContainText("storage is full");
    await expect(alert).toContainText("Earlier marks are safe.");
    // The tap stays on screen: marking moved on as usual.
    await expect(page.getByTestId("who")).not.toHaveText(who);
    expect(await demoCount(page, "responses")).toBe(before);
    await page.screenshot({ path: "../../reports/kaksha/.shots/states-save-failed.png" });

    // Still broken: Try again says it is still not saved, and points to backup and help.
    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(alert).toContainText("Still not saved.");
    await expect(alert.getByRole("button", { name: "Get help" })).toBeVisible();

    await breakWrites(page, null);
    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("save-alert")).toHaveCount(0);
    await expect(page.getByTestId("save-line")).toContainText("Saved on this phone at");
    expect(await demoCount(page, "responses")).toBe(before + 1);
  });

  test("a browser that blocks storage gets a plain explanation, not a blank app", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      indexedDB.open = () => {
        throw new DOMException("drill", "SecurityError");
      };
    });
    await page.goto("/app");
    const box = page.getByTestId("screen-problem");
    await expect(box).toContainText("This browser is not letting the app save.");
    await expect(box).toContainText("Open the app in a normal window.");
    await expect(box.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(box.getByRole("button", { name: "Report a problem" })).toBeVisible();
    await page.screenshot({ path: "../../reports/kaksha/.shots/states-storage-blocked.png" });
  });

  test("a screen that crashes shows what happened, that marks are safe, and a way on", async ({
    page,
  }) => {
    await page.goto("/app?demo=1#/classes");
    await expect(page.getByRole("heading", { name: "Classes" }).first()).toBeVisible();
    await page.evaluate(() => {
      const proto = IDBIndex.prototype as unknown as Record<string, unknown>;
      (window as unknown as { __ga: unknown }).__ga = proto.getAll;
      const fail = () => {
        throw new Error("drill: a read failed");
      };
      proto.getAll = fail;
      proto.openCursor = fail;
      (IDBObjectStore.prototype as unknown as Record<string, unknown>).getAll = fail;
      (IDBObjectStore.prototype as unknown as Record<string, unknown>).openCursor = fail;
    });
    await page.evaluate(() => {
      location.hash = "#/test/demo-maths-aug";
    });
    const box = page.getByTestId("screen-problem");
    await expect(box).toBeVisible();
    await expect(box).toContainText("Marks saved before this are still on this phone.");
    for (const name of ["Try again", "Go to Today", "Report a problem"])
      await expect(box.getByRole("button", { name })).toBeVisible();
    await page.screenshot({ path: "../../reports/kaksha/.shots/states-crash.png" });
    await box.getByRole("button", { name: "Report a problem" }).click();
    await expect(page.getByRole("heading", { name: "Something not working?" })).toBeVisible();
  });

  test("deleting a test says exactly what goes, and Undo brings every mark back", async ({
    page,
  }) => {
    await page.goto("/app?demo=1#/test/demo-maths-aug");
    await expect(page.getByRole("tab").first()).toBeVisible();
    const marks = await demoCount(page, "responses");
    await page.getByRole("button", { name: "Delete this test" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toContainText(/This removes the test and its \d+ marks for \d+ students\./);
    await expect(sheet).toContainText("You can undo this for 12 seconds");
    await sheet.getByTestId("confirm-delete").click();
    const bar = page.getByTestId("undo-bar");
    await expect(bar).toContainText("Deleted");
    expect(await demoCount(page, "responses")).toBeLessThan(marks);
    await page.screenshot({ path: "../../reports/kaksha/.shots/states-undo-delete.png" });
    await bar.getByRole("button", { name: "Undo" }).click();
    await expect(bar).toContainText("is back");
    expect(await demoCount(page, "responses")).toBe(marks);
  });

  test("Keep it leaves the class untouched; deleting a class can be undone", async ({ page }) => {
    await page.goto("/app?demo=1#/class/demo-class-5a");
    await expect(page.getByRole("button", { name: "Delete this class" })).toBeVisible();
    const students = await demoCount(page, "students");
    await page.getByRole("button", { name: "Delete this class" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toContainText(/This removes \d+ students, \d+ tests and \d+ marks\./);
    await sheet.getByRole("button", { name: "Keep it" }).click();
    expect(await demoCount(page, "students")).toBe(students);
    await page.getByRole("button", { name: "Delete this class" }).click();
    await page.getByRole("dialog").getByTestId("confirm-delete").click();
    await expect(page.getByTestId("undo-bar")).toContainText("Deleted");
    expect(await demoCount(page, "students")).toBeLessThan(students);
    await page.getByTestId("undo-bar").getByRole("button", { name: "Undo" }).click();
    await expect(page.getByTestId("undo-bar")).toContainText("is back");
    expect(await demoCount(page, "students")).toBe(students);
  });

  test("a note deletes at once and comes back with Undo; long notes stop at the limit", async ({
    page,
  }) => {
    await page.goto("/app?demo=1#/student/demo-student-5/notes");
    const box = page.getByLabel("New note");
    await box.fill("x".repeat(600));
    await expect(box).toHaveValue("x".repeat(500));
    await expect(page.getByText("500 of 500 characters")).toBeVisible();
    await box.fill("Reads aloud with confidence now.");
    await page.getByRole("button", { name: "Add note" }).dblclick();
    await expect(page.getByText("Reads aloud with confidence now.")).toHaveCount(1);
    const notes = await demoCount(page, "notes");
    await page.getByRole("button", { name: "Delete" }).first().click();
    await expect(page.getByTestId("undo-bar")).toContainText("Note deleted.");
    expect(await demoCount(page, "notes")).toBe(notes - 1);
    await page.getByTestId("undo-bar").getByRole("button", { name: "Undo" }).click();
    await expect(page.getByTestId("undo-bar")).toContainText("Note is back.");
    expect(await demoCount(page, "notes")).toBe(notes);
  });

  test("a double tap on Next makes one class, not two", async ({ page }) => {
    await page.goto("/app#/new-class");
    await page.getByLabel("School name").fill("Imli Chowk Primary School (invented)");
    await page.getByLabel("Class or grade").fill("4");
    await page.getByRole("button", { name: "Next: add students" }).dblclick();
    await expect(page.getByRole("heading", { name: "Add a list of students" })).toBeVisible();
    const count = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const r = indexedDB.open("kaksha");
          r.onsuccess = () => {
            const q = r.result.transaction("classes").objectStore("classes").count();
            q.onsuccess = () => resolve(q.result);
          };
        }),
    );
    expect(count).toBe(1);
    // Adding one student: specific errors, and a confirmation that names them.
    await page.getByLabel("Name", { exact: true }).fill("");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Type the student's name to add them.")).toBeVisible();
    await page.getByLabel("Name", { exact: true }).fill("Asha Aamla");
    await page.getByRole("button", { name: "Add", exact: true }).dblclick();
    await expect(page.getByText("Added Asha Aamla, roll 1.")).toBeVisible();
    await page.getByLabel("Roll no.", { exact: true }).fill("1");
    await page.getByLabel("Name", { exact: true }).fill("Bunty Barfi");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Roll 1 is already used.")).toBeVisible();
  });

  test("searches with no results repeat the search and offer a way out", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/app?demo=1#/");
    await page.getByRole("searchbox").fill("Zzyzx");
    await expect(page.getByText("No student named “Zzyzx”.")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app?demo=1#/class/demo-class-4b/students");
    await page.getByRole("searchbox").fill("Zzyzx");
    await expect(page.getByText("No student in this list matches “Zzyzx”.")).toBeVisible();
    await page.getByRole("button", { name: "Clear search and filters" }).click();
    await expect(page.getByRole("searchbox")).toHaveValue("");
  });

  test("Report a problem is reachable from More and never carries student data", async ({
    page,
  }) => {
    await page.goto("/app?demo=1#/more");
    await page.getByRole("button", { name: /Report a problem/ }).click();
    await expect(page.getByText("Do not include students' names or marks.")).toBeVisible();
    const href = await page
      .getByRole("link", { name: "Open a report on GitHub" })
      .getAttribute("href");
    expect(href).toContain("github.com/quartifex/quartifex/issues/new");
    expect(decodeURIComponent(href ?? "")).not.toMatch(/demo-student|Chinki|Chhotu/);
  });
});
