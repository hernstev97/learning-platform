import { defineConfig } from '@playwright/test';

const deployedUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/convex/**',
  fullyParallel: true,
  timeout: 60_000,
  use: { baseURL: deployedUrl || 'http://127.0.0.1:5181', viewport: { width: 1280, height: 1000 } },
  webServer: deployedUrl ? undefined : {
    command: 'CONTENT_FIXTURES=1 pnpm exec vite --mode test-local --host 127.0.0.1 --port 5181 --strictPort',
    url: 'http://127.0.0.1:5181',
    reuseExistingServer: !process.env.CI,
  },
});
