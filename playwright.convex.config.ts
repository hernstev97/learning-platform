import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/convex', workers: 1, timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:5183', viewport: { width: 1280, height: 1000 } },
  webServer: {
    command: 'CONTENT_FIXTURES=1 pnpm exec vite --mode test-convex --host 127.0.0.1 --port 5183 --strictPort',
    url: 'http://127.0.0.1:5183', reuseExistingServer: !process.env.CI,
  },
});
