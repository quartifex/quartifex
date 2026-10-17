import { expect, type Page, test } from "@playwright/test";

// Behaviour tests against the production build. The stage is forced to the poster rung
// (?rung=poster) unless a test is about the 3D, so runs do not depend on a GPU.

/** Load the page and pass the preloader's gate quietly. */
async function open(page: Page, query = "?rung=poster") {
  await page.goto(`/${query}`);
  await page.getByRole("button", { name: "Enter quietly" }).click();
}

async function toDemo(page: Page) {
  await open(page);
  await page.locator("#demo").scrollIntoViewIfNeeded();
  await expect(page.locator("#demo [class*='os']").first()).toBeVisible();
}

test("labels itself honestly, with provenance and no invented proof", async ({ page }) => {
  await open(page);
  await expect(
    page.getByText("AVENUE is a concept system by Quartifex, available for collaboration."),
  ).toBeVisible();
  await expect(page.getByText("A Quartifex product.")).toBeVisible();
  for (const item of ["Car model", "Sky", "Maps", "Music", "Type"]) {
    await expect(page.locator("footer dt", { hasText: item })).toBeVisible();
  }
  await expect(
    page.getByText(
      "Vehicle model used for demonstration only. AVENUE is not affiliated with any carmaker.",
    ),
  ).toBeVisible();
  await expect(page.getByText(/trusted by/i)).toHaveCount(0);
  // The driver and co-pilot modes are marked as not yet user-tested wherever they appear.
  expect(
    await page.getByText("Design extension, not yet user-tested").count(),
  ).toBeGreaterThanOrEqual(3);
  await page.locator("#demo").scrollIntoViewIfNeeded();
  await page.getByRole("radio", { name: /^Driver/ }).click();
  await expect(page.locator("#demo")).toContainText(
    "Driver mode: a design extension, not yet user-tested.",
  );
});

test("publishes the A/B ratings as recorded and withholds the unresolved net figure", async ({
  page,
}) => {
  await open(page);
  const row = page.locator("#testing tr", { hasText: "Physical effort" });
  await expect(row).toContainText("3");
  await expect(row).toContainText("2.25");
  await expect(row).toContainText("To be confirmed");
  await expect(row).not.toContainText("1.15");
  await expect(row).not.toContainText("0.75");
  await expect(page.locator("#testing")).toContainText("Rear-seat system only");
});

test("the driver's screen locks video and settings while moving, and says why", async ({
  page,
}) => {
  await toDemo(page);
  // The car is moving by default: the driver's screen opens in glance mode.
  await page.getByRole("radio", { name: /^Driver/ }).click();
  await expect(page.getByText("Moving: glance mode")).toBeVisible();
  await page.getByRole("radio", { name: "Parked" }).click();
  await page.getByRole("radio", { name: "Moving" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Moving/ })).toHaveCount(1);
  const settings = page.locator("nav[aria-label='Driver screen'] button", { hasText: "Settings" });
  await expect(settings).toHaveAttribute("aria-disabled", "true");
  await expect(settings).toHaveAccessibleName(/available when parked/);
  await page.locator("nav[aria-label='Driver screen'] button", { hasText: "Media" }).click();
  await page.getByRole("radio", { name: "Films" }).click();
  await expect(
    page.getByRole("button", { name: /Northbound.*available when parked/ }),
  ).toBeVisible();
  // Parked again, everything is back.
  await page.getByRole("radio", { name: "Parked" }).click();
  await expect(page.getByRole("button", { name: /^Northbound/ })).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
});

test("content goes to another screen only when its passenger accepts", async ({ page }) => {
  await toDemo(page);
  await page.getByRole("radio", { name: /^Rear left/ }).click();
  await page
    .locator("#demo main")
    .getByRole("button", { name: /Send to another screen: The Cartographers/ })
    .first()
    .click();
  await page.locator("#demo").getByRole("button", { name: "Rear right" }).first().click();
  await expect(page.locator("#demo li", { hasText: "Rear right" })).toContainText("1 sent to it");
  await page.getByRole("radio", { name: /^Rear right/ }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("From rear left");
  await dialog.getByRole("button", { name: "Play here" }).click();
  await expect(page.locator("#demo li", { hasText: "Rear right" })).toContainText(
    "The Cartographers",
  );
});

test("SOS counts down with a cancel, from any screen", async ({ page }) => {
  await toDemo(page);
  await page.locator("#demo").getByRole("button", { name: "Emergency SOS" }).click();
  const sos = page.locator("#demo").getByRole("alertdialog", { name: "Emergency call" });
  await expect(sos).toContainText(/placed in [45] seconds/);
  await sos.getByRole("button", { name: "Cancel" }).click();
  await expect(sos).toHaveCount(0);
});

test("cab mode turns the rear screens into the rider's screen", async ({ page }) => {
  await toDemo(page);
  await page.getByRole("radio", { name: /^Rear left/ }).click();
  await page.getByRole("radio", { name: "Cab" }).click();
  await page.locator("nav[aria-label='Rear left screen'] button", { hasText: "Home" }).click();
  const screen = page.locator("#demo main").first();
  await expect(screen).toContainText("Welcome aboard");
  await screen.getByRole("button", { name: /Pull over/ }).click();
  await expect(screen).toContainText("Pulling over at the next safe place");
});

test("the platform section states the target OS and hardware, as a reference", async ({ page }) => {
  await open(page);
  const platform = page.locator("#platform");
  await expect(platform).toContainText("Android Automotive OS 15");
  await expect(platform).toContainText("Snapdragon SA8295P class");
  await expect(platform).toContainText("Not a shipping product.");
});

test("the seat switcher and option groups work from the keyboard", async ({ page }) => {
  await toDemo(page);
  await page.getByRole("radio", { name: /^Driver/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: /^Co-pilot/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("radio", { name: /^Co-pilot/ })).toBeFocused();
  await expect(page.locator("#demo header").first()).toContainText("Co-pilot");
});

test("the requirement explorer filters by priority and opens a card", async ({ page }) => {
  await open(page);
  await page.locator("#requirements").scrollIntoViewIfNeeded();
  await expect(page.getByText("Showing 25 of 25")).toBeVisible();
  await page.locator("#requirements label", { hasText: "Must have" }).click();
  await expect(page.getByText("Showing 10 of 25")).toBeVisible();
  const card = page.getByRole("button", { name: /Card A: Physical Controls/ });
  await card.click();
  await expect(card).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#req-A")).toContainText("Buttons are responsive and reliable.");
});

test("the docs are one page with a working sub-navigation and live tokens", async ({ page }) => {
  await open(page);
  await page
    .locator("nav[aria-label='Documentation'] a", { hasText: "Safety and distraction" })
    .click();
  await expect(page).toHaveURL(/#docs-safety$/);
  await expect(page.locator("#docs-safety")).toContainText(
    "Visual-Manual NHTSA Driver Distraction Guidelines",
  );
  await expect(page.locator("#docs-design-system")).toContainText("--c-accent");
  await expect(page.locator("#docs")).toHaveAttribute("data-theme", "paper");
});

test("the partner form validates, and its endpoint drops bots and refuses without a key", async ({
  page,
  request,
}) => {
  await open(page);
  await page.locator("#partner").scrollIntoViewIfNeeded();
  await page.locator("#partner").getByRole("button", { name: "Send" }).click();
  await expect(page.locator("#partner").getByText("Enter your name.")).toBeVisible();
  await expect(page.locator("#partner input[name='name']")).toBeFocused();
  const bot = await request.post("/api/partner", {
    data: { name: "x", company: "y", email: "a@b.co", model: "pilot", website: "spam" },
  });
  expect(bot.status()).toBe(200);
  const invalid = await request.post("/api/partner", { data: { name: "x" } });
  expect(invalid.status()).toBe(422);
  if (!process.env.RESEND_API_KEY) {
    const unconfigured = await request.post("/api/partner", {
      data: { name: "Ada", company: "Example", email: "ada@example.com", model: "pilot" },
    });
    expect(unconfigured.status()).toBe(503);
  }
});

test("under reduced motion nothing pins and the demo still works", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/?rung=poster");
  await page.getByRole("button", { name: "Enter quietly" }).click();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await page.locator("#demo").scrollIntoViewIfNeeded();
  await page.getByRole("radio", { name: /^Driver/ }).click();
  await expect(page.locator("#demo header").first()).toContainText("Driver");
  await context.close();
});

test("boots real-time 3D after first paint and loads the car model", async ({ page }) => {
  test.setTimeout(90_000);
  const glb = page.waitForResponse((r) => r.url().includes("/media/avenue-car"));
  await page.goto("/?rung=3d");
  // The poster is in the HTML before any script.
  await expect(page.locator("[data-stage] [data-rung]")).toBeAttached();
  expect((await glb).ok()).toBe(true);
  await expect(page.locator("[data-stage][data-ready] canvas")).toBeAttached({ timeout: 60_000 });
});
