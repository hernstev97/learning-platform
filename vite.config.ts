import { defineConfig } from 'vite';
import { content, pyodide } from './tooling/vite-plugins.ts';

export default defineConfig({
  plugins: [content(), pyodide()],
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  worker: { format: 'es' },
});
