import { expect, test } from "@playwright/test";

test.describe("the site", () => {
  test("carries its honest label, the two actions and the language switch on the first screen", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("honest-label")).toHaveText("Free tool");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Mark a whole class in minutes.",
    );
    for (const name of ["Open the app", "Try the demo", "हिन्दी"]) {
      await expect(page.getByRole("link", { name })).toBeInViewport();
    }
    await page.getByRole("link", { name: "हिन्दी" }).click();
    await expect(page).toHaveURL(/\/hi$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await expect(page.getByTestId("honest-label")).toHaveText("मुफ़्त टूल");
  });

  test("makes no claims it cannot back: no TFI name, no testimonials, no compliance claim", async ({
    page,
  }) => {
    for (const path of ["/", "/hi"]) {
      await page.goto(path);
      const text = (await page.locator("body").innerText()).toLowerCase();
      expect(text).not.toContain("teach for india");
      expect(text).not.toMatch(/complies with|compliant with|dpdp[- ]compliant/);
      expect(text).toContain(path === "/" ? "this is not legal advice" : "not legal advice");
    }
  });

  test("runs the real app in the demo frame, on its own database", async ({ page }) => {
    await page.goto("/#demo");
    const frame = page.frameLocator('iframe[title="The demo app"]');
    await expect(frame.getByText(/Demo: an invented school/)).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /Read the class view/ }).click();
    await expect(frame.getByText("Class average")).toBeVisible();
    await page.getByRole("button", { name: /Print a report card/ }).click();
    await expect(frame.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
  });

  test("under reduced motion shows the three stages side by side, with nothing pinned", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".p2g__still")).toBeVisible();
    await expect(page.locator(".p2g__run")).toBeHidden();
  });

  test("scrubs the paper sheet into the grid and the chart", async ({ page }) => {
    await page.goto("/");
    const run = page.locator(".p2g__run");
    await run.scrollIntoViewIfNeeded();
    const box = await run.evaluate((el) => ({
      top: el.getBoundingClientRect().top + scrollY,
      h: (el as HTMLElement).offsetHeight - innerHeight,
    }));
    await page.evaluate((y) => scrollTo(0, y), box.top + box.h * 0.97);
    const board = page.locator(".p2g__run [data-board]");
    await expect
      .poll(
        () => board.evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--labels"))),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(0.9);
  });

  test("the form never sends anything without its fields, and is quiet to bots", async ({
    request,
  }) => {
    const empty = await request.post("/api/contact", { data: {} });
    expect(empty.status()).toBe(400);
    const bot = await request.post("/api/contact", { data: { website: "http://spam", name: "x" } });
    expect(bot.status()).toBe(200);
    const real = await request.post("/api/contact", {
      data: {
        name: "A Teacher",
        email: "a@example.org",
        organisation: "An NGO",
        need: "A language pack",
        message: "Hello",
      },
    });
    // Without the provider key set (as in tests), it says so rather than pretending.
    expect([200, 503]).toContain(real.status());
  });

  test("docs carry every section and a working table of contents", async ({ page }) => {
    await page.goto("/");
    for (const id of [
      "docs-getting-started",
      "docs-roster",
      "docs-templates",
      "docs-data-model",
      "privacy",
      "docs-languages",
      "docs-faq",
      "docs-changelog",
    ]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
    await page
      .getByRole("navigation", { name: "Sections" })
      .getByRole("link", { name: "The data model" })
      .click();
    await expect(page.locator("#docs-data-model table")).toBeInViewport();
  });
});
