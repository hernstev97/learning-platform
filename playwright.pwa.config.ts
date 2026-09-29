import { defineConfig } from '@playwright/test';

// Production build with the service worker. Placeholder backend settings: these tests only cover
// installability and offline reading, which never contact Clerk or Convex.
const env = 'VITE_CONVEX_URL=https://offline-test.invalid VITE_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsub2ZmbGluZS10ZXN0LmludmFsaWQk';
export default defineConfig({
  testDir: './e2e/pwa', workers: 1, timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:5184', viewport: { width: 1280, height: 1000 } },
  webServer: {
    command: `${env} pnpm exec vite build --outDir dist-pwa-test --emptyOutDir && pnpm exec vite preview --outDir dist-pwa-test --host 127.0.0.1 --port 5184 --strictPort`,
    url: 'http://127.0.0.1:5184', reuseExistingServer: false, timeout: 120_000,
  },
});
