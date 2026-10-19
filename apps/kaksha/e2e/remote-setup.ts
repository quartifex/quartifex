import { chromium, type FullConfig } from "@playwright/test";

// For runs against a protected Vercel preview: KAKSHA_SHARE_URL is the preview's share link.
// Visiting it once sets the access cookie, which every test then reuses.
export default async function setup(config: FullConfig): Promise<void> {
  const share = process.env.KAKSHA_SHARE_URL;
  if (!share) return;
  const project = config.projects[0];
  const channel = process.env.PW_CHANNEL;
  const browser = await chromium.launch(channel ? { channel } : {});
  const page = await browser.newPage();
  await page.goto(share);
  await page.context().storageState({ path: project?.use.storageState as string });
  await browser.close();
}
