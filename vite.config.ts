import { defineConfig } from 'vite';
import { content, pyodide, serviceWorker, vm } from './tooling/vite-plugins.ts';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ command, mode }) => ({
  plugins: [content(), pyodide(), vm(), serviceWorker(), ...(command === 'serve' && ['test-local', 'test-convex'].includes(mode) ? [{
    name: 'local-regression-tests',
    transformIndexHtml(html: string) { return html.replace('/src/main.ts', `/src/testing/${mode === 'test-local' ? 'local' : 'convex'}-main.ts`); },
  }] : [])],
  resolve: { alias: command === 'serve' && mode === 'test-local' ? [{ find: /^(?:\.\.?\/)+app\.ts$/, replacement: fileURLToPath(new URL('./src/testing/local-app.ts', import.meta.url)) }] : [] },
  // The largest chunk is the search index (every area as plain text), loaded only when search is first opened.
  build: { target: 'es2022', chunkSizeWarningLimit: 3000 },
  worker: { format: 'es' },
}));
