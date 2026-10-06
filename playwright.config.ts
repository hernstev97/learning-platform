import { defineConfig } from '@playwright/test';

const deployedUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/convex/**', '**/pwa/**'],
  fullyParallel: true,
  timeout: 60_000,
  // In CI one retry absorbs a slow runner; a test that passes only on retry shows up as flaky in the report.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: deployedUrl || 'http://127.0.0.1:5181', viewport: { width: 1280, height: 1000 }, trace: 'on-first-retry' },
  webServer: deployedUrl ? undefined : {
    command: 'CONTENT_FIXTURES=1 pnpm exec vite --mode test-local --host 127.0.0.1 --port 5181 --strictPort',
    url: 'http://127.0.0.1:5181',
    reuseExistingServer: !process.env.CI,
  },
});
