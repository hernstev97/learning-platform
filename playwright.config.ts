import { defineConfig } from '@playwright/test';

const deployedUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: { baseURL: deployedUrl || 'http://127.0.0.1:5173', viewport: { width: 1280, height: 1000 } },
  webServer: deployedUrl ? undefined : { command: 'pnpm dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
});
