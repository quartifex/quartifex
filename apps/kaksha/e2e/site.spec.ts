import { expect, test } from "@playwright/test";

test.describe("the site", () => {
  test("carries its honest label, the two actions and the language switch on the first screen", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("honest-label")).toContainText("Free tool");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Mark a whole class in minutes.",
    );
    for (const name of ["Open the app", "Try the demo below", "हिन्दी"]) {
      await expect(page.getByRole("link", { name, exact: true }).first()).toBeInViewport();
    }
    await page.getByRole("link", { name: "हिन्दी" }).click();
    await expect(page).toHaveURL(/\/hi$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await expect(page.getByTestId("honest-label")).toContainText("मुफ़्त टूल");
  });

  test("makes no claims it cannot back: no TFI name, no testimonials, no compliance claim", async ({
    page,
  }) => {
    for (const path of ["/", "/hi", "/docs", "/docs/privacy", "/docs/faq"]) {
      await page.goto(path);
      const text = (await page.locator("body").innerText()).toLowerCase();
      expect(text).not.toContain("teach for india");
      expect(text).not.toMatch(/complies with|compliant with|dpdp[- ]compliant/);
      if (path === "/docs/privacy") expect(text).toContain("this is not legal advice");
    }
  });

  test("runs the real app in the demo frame, on its own database", async ({ page }) => {
    await page.goto("/#demo");
    const frame = page.frameLocator('iframe[title="The demo app"]');
    await expect(frame.getByText(/Demo · invented school/)).toBeVisible({ timeout: 20_000 });
    await page
      .getByRole("button", { name: /Read the class view/ })
      .first()
      .click();
    // The first time, a short tour explains the pinned phone.
    await expect(page.getByRole("dialog", { name: "This is the real app" })).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(frame.getByText("Class average")).toBeVisible();
    // The finished task ticks itself off beside the phone.
    await expect(page.locator(".demo__side li[data-state='done']")).toHaveCount(1);
    await page.getByRole("button", { name: "Done Esc" }).click();
    await page
      .getByRole("button", { name: /Print a report card/ })
      .first()
      .click();
    await expect(frame.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
  });

  test("while the demo is in use the page behind stays still, and Esc lets go", async ({
    page,
  }) => {
    await page.goto("/#demo");
    await page.getByRole("button", { name: /Tap to try/ }).click();
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.locator("html")).toHaveClass(/demo-pinned/);
    const before = await page.evaluate(() => scrollY);
    await page.mouse.move(40, 400);
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => scrollY)).toBe(before);
    // The rest of the page is out of reach while pinned.
    await expect(page.locator("#why")).toHaveJSProperty("inert", true);
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).not.toHaveClass(/demo-pinned/);
    await expect(page.locator("#why")).toHaveJSProperty("inert", false);
    // The tour is shown once; next time the phone pins straight away.
    await page.getByRole("button", { name: /Tap to try/ }).click();
    await expect(page.getByRole("dialog", { name: "This is the real app" })).toHaveCount(0);
    await page.getByRole("button", { name: "How it works" }).click();
    await expect(page.getByRole("dialog", { name: "This is the real app" })).toBeVisible();
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

  test("help: every topic has its own page, reachable from the product page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Backup and new phones/ }).click();
    await expect(page).toHaveURL(/\/docs\/backup$/);
    await expect(page.getByRole("heading", { level: 2, name: /Backup/ })).toBeVisible();
    await page.getByRole("link", { name: /Next →/ }).click();
    await expect(page).toHaveURL(/\/docs\/templates$/);
    await page.goto("/docs");
    for (const slug of ["getting-started", "roster", "templates", "data-model", "privacy", "faq"]) {
      const res = await page.request.get(`/docs/${slug}`);
      expect(res.status(), slug).toBe(200);
    }
    await page
      .getByRole("navigation", { name: "Help topics" })
      .getByRole("link", { name: "The data model" })
      .click();
    await expect(page.locator(".docs__page table").first()).toBeVisible();
  });
});
