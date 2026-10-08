import { chromium, type FullConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The first page load makes the Vite dev server transform the app and its lazy chunks: 25 seconds and more on a CI
// runner, against a test budget of 30. Doing it here keeps the cold start out of the first test; nothing is asserted.
export default async function warmUp(config: FullConfig): Promise<void> {
  const configPath = process.env.CONVEX_TEST_CONFIG;
  if (!configPath) return;
  const { adminKey, ports } = JSON.parse(readFileSync(configPath, 'utf8')) as { adminKey: string; ports: { cloud: number } };
  const baseURL = config.projects[0].use.baseURL!;
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    await context.addInitScript((value) => { (window as unknown as { __convexTest: unknown }).__convexTest = value; }, { url: `http://127.0.0.1:${ports.cloud}`, adminKey, subject: 'user_owner' });
    const page = await context.newPage();
    for (const path of ['/', '/kotlin/bear-01', '/kotlin/bear-01/1']) {
      await page.goto(`${baseURL}${path}`, { timeout: 120_000 });
      await page.waitForFunction(() => document.querySelector('#storage-status')?.textContent === 'Lernstand synchronisiert', null, { timeout: 120_000 });
    }
  } finally {
    await browser.close();
  }
}
