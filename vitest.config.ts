import { defineConfig } from 'vitest/config';

// Loading all content takes a while; the two-core CI runners need more than the 30 s that is enough locally.
export default defineConfig({ test: { include: ['src/**/*.test.ts', 'tooling/**/*.test.ts', 'convex/**/*.test.ts'], testTimeout: process.env.CI ? 120000 : 30000 } });
