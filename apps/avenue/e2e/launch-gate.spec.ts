import { devices, expect, test } from "@playwright/test";

// The launch gate: a mid-range phone (Pixel 7 size and touch, 4x CPU slowdown, Lighthouse's
// mobile network). LCP under 2.5 s, CLS under 0.1 through a full scroll.
const { defaultBrowserType: _ignored, ...pixel } = devices["Pixel 7"];
test.use(pixel);

test("LCP under 2.5 s and CLS under 0.1 on a throttled mid-range phone", async ({ page }) => {
  test.setTimeout(60_000);
  const cdp = await page.context().newCDPSession(page);
  // Mid-range phone: 4x CPU slowdown, and Lighthouse's mobile network.
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1600 * 1000) / 8,
    uploadThroughput: (750 * 1000) / 8,
  });
  await page.addInitScript(() => {
    const w = window as Window & { __lcp?: number; __cls?: number };
    w.__lcp = 0;
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as Array<
        PerformanceEntry & { value: number; hadRecentInput: boolean }
      >) {
        if (!e.hadRecentInput) w.__cls = (w.__cls ?? 0) + e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  // Scroll through the page to catch late shifts too.
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(150);
  }
  const { lcp, cls } = await page.evaluate(() => {
    const w = window as Window & { __lcp?: number; __cls?: number };
    return { lcp: w.__lcp ?? 0, cls: w.__cls ?? 0 };
  });
  console.log(`launch gate: LCP ${Math.round(lcp)} ms, CLS ${cls.toFixed(3)}`);
  expect(lcp).toBeGreaterThan(0);
  expect(lcp).toBeLessThan(2500);
  expect(cls).toBeLessThan(0.1);
});
