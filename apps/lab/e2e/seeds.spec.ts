import { expect, test } from "@playwright/test";

test.describe("Lab seeds", () => {
  test("frameguide draws the chosen layers and G hides them", async ({ page }) => {
    await page.goto("/lab/frameguide");
    await expect(page.getByText("Lab", { exact: true }).first()).toBeVisible();
    const overlay = page.getByTestId("frameguide");
    await expect(overlay).toHaveAttribute("data-layers", "focal safe subject text");
    await page.getByRole("checkbox", { name: "Thirds" }).check();
    await expect(overlay).toHaveAttribute("data-layers", "focal safe subject text thirds");

    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("g");
    await expect(overlay).toHaveCount(0);
    await expect(page.getByRole("checkbox", { name: "Thirds" })).toBeDisabled();
    await page.keyboard.press("g");
    await expect(overlay).toHaveCount(1);
  });

  test("aspect-morph re-stages the scene from 9:16 to 32:9", async ({ page }) => {
    await page.goto("/lab/aspect-morph");
    const bucket = page.getByTestId("am-bucket");
    const subject = page.getByTestId("am-subject");
    await page.getByRole("button", { name: "9:16" }).click();
    await expect(bucket).toHaveText("tall-phone");
    await expect(subject).toHaveText("Whole");
    await page.getByRole("button", { name: "32:9" }).click();
    await expect(bucket).toHaveText("ultrawide");
    await expect(subject).toHaveText("Whole");

    const slider = page.getByRole("slider", { name: "Aspect" });
    await slider.focus();
    await page.keyboard.press("Home");
    await expect(page.getByTestId("am-aspect")).toHaveText(/^0\.56:1/);
  });

  test("aspect-morph turns Play off under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lab/aspect-morph");
    await expect(page.getByRole("button", { name: "Play" })).toBeDisabled();
  });

  test("the bare scene page is staged and reports its subject", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/scene");
    const scene = page.getByTestId("scene");
    await expect(scene).toHaveAttribute("data-sf-bucket", "tall-phone");
    await expect(scene).not.toHaveAttribute("data-sf-clipped", /.*/);
  });
});
