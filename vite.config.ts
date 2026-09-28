import { defineConfig } from 'vite';
import { content, pyodide } from './tooling/vite-plugins.ts';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ command, mode }) => ({
  plugins: [content(), pyodide(), ...(command === 'serve' && ['test-local', 'test-convex'].includes(mode) ? [{
    name: 'local-regression-tests',
    transformIndexHtml(html: string) { return html.replace('/src/main.ts', `/src/testing/${mode === 'test-local' ? 'local' : 'convex'}-main.ts`); },
  }] : [])],
  resolve: { alias: command === 'serve' && mode === 'test-local' ? [{ find: /^(?:\.\.?\/)+app\.ts$/, replacement: fileURLToPath(new URL('./src/testing/local-app.ts', import.meta.url)) }] : [] },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  worker: { format: 'es' },
}));
