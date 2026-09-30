import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { transformWithOxc, type Plugin, type ViteDevServer } from 'vite';
import type { WorkerConfig } from '../src/service-worker.ts';
import { CONTENT, ROOT, formatIssues, loadContent, type Loaded } from './content.ts';
import { buildSearchIndex } from './search-index.ts';

const CATALOG = 'virtual:catalog';
const LOADERS = 'virtual:area-loaders';
const AREA = 'virtual:area/';
const SEARCH = 'virtual:search-index';

/** Serves content/ as virtual modules: a small catalog, one lazily loaded chunk per area and the search index. */
export function content(): Plugin {
  let cache: Loaded | null = null;
  let building = false;
  const load = (): Loaded => {
    if (cache) return cache;
    // CONTENT_LENIENT=1 (local work in progress): report problems but serve what is valid.
    const lenient = !building && !!process.env.CONTENT_LENIENT;
    const loaded = loadContent(undefined, undefined, { allowMissing: lenient });
    // CONTENT_FIXTURES=1 (browser tests): also serve tooling/fixtures, which covers every exercise type.
    if (process.env.CONTENT_FIXTURES) {
      const fixtures = loadContent(undefined, join(ROOT, 'tooling/fixtures'));
      loaded.catalog.areas.push(...fixtures.catalog.areas);
      Object.assign(loaded.areas, fixtures.areas);
      loaded.errors.push(...fixtures.errors);
    }
    if (loaded.errors.length && lenient) console.warn(`[content] ${loaded.errors.length} Fehler werden übersprungen:\n${formatIssues(loaded.errors)}`);
    else if (loaded.errors.length) throw new Error(`Inhalte sind ungültig (${loaded.errors.length} Fehler):\n${formatIssues(loaded.errors)}\n\nDetails: pnpm content:check`);
    cache = loaded;
    return loaded;
  };
  let server: ViteDevServer | null = null;
  return {
    name: 'learning-content',
    configResolved(config) { building = config.command === 'build'; },
    resolveId(id) {
      if (id === CATALOG || id === LOADERS || id === SEARCH || id.startsWith(AREA)) return `\0${id}`;
    },
    load(id) {
      if (!id.startsWith('\0virtual:')) return;
      const name = id.slice(1);
      const loaded = load();
      if (name === CATALOG) return `export default ${JSON.stringify(loaded.catalog)};`;
      if (name === SEARCH) return `export default JSON.parse(${JSON.stringify(JSON.stringify(buildSearchIndex(loaded)))});`;
      if (name === LOADERS) return `export default {${Object.keys(loaded.areas).map((area) => `${JSON.stringify(area)}: () => import(${JSON.stringify(AREA + area)})`).join(',')}};`;
      if (name.startsWith(AREA)) {
        const area = loaded.areas[name.slice(AREA.length)];
        if (!area) throw new Error(`Unbekannter Bereich ${name}`);
        return `export default JSON.parse(${JSON.stringify(JSON.stringify(area))});`;
      }
    },
    configureServer(dev) {
      server = dev;
      dev.watcher.add(CONTENT);
      const reload = (file: string) => {
        if (!file.startsWith(CONTENT)) return;
        cache = null;
        for (const module of dev.moduleGraph.idToModuleMap.values()) if (module.id?.startsWith('\0virtual:')) dev.moduleGraph.invalidateModule(module);
        dev.ws.send({ type: 'full-reload' });
      };
      dev.watcher.on('change', reload);
      dev.watcher.on('add', reload);
      dev.watcher.on('unlink', reload);
    },
    buildStart() {
      if (!server) cache = null;
    },
  };
}

const PYODIDE_FILES = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
/**
 * Self-hosts the Pyodide runtime under /pyodide/ (copied from node_modules into public/, not committed),
 * plus the extra wheels exercises may import (vendor/pyodide: tzdata, beautifulsoup4, PyYAML, pandas with numpy).
 * Wheels must match the file names and hashes in node_modules/pyodide/pyodide-lock.json.
 */
export function pyodide(): Plugin {
  return {
    name: 'self-hosted-pyodide',
    configResolved() {
      const from = join(ROOT, 'node_modules/pyodide');
      const to = join(ROOT, 'public/pyodide');
      const version = JSON.parse(readFileSync(join(from, 'package.json'), 'utf8')).version as string;
      const wheels = readdirSync(join(ROOT, 'vendor/pyodide')).sort();
      // A new wheel copies everything again, not only a new Pyodide version.
      const expected = [version, ...wheels].join('\n');
      const stamp = join(to, 'VERSION');
      if (existsSync(stamp) && readFileSync(stamp, 'utf8') === expected) return;
      mkdirSync(to, { recursive: true });
      for (const file of PYODIDE_FILES) copyFileSync(join(from, file), join(to, file));
      for (const file of wheels) copyFileSync(join(ROOT, 'vendor/pyodide', file), join(to, file));
      writeFileSync(stamp, expected);
    },
  };
}

const files = (dir: string): string[] => existsSync(dir) ? readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((name) => statSync(join(dir, name)).isFile()) : [];
/**
 * Emits /sw.js from src/service-worker.ts in production builds. It precaches every built file (app shell and all
 * content chunks) plus fonts, icons and the manifest from public/; Pyodide is only cached once it is used.
 * The cache version changes with any of these files, so each deployment installs a fresh, consistent set.
 */
export function serviceWorker(): Plugin {
  let publicDir = '';
  return {
    name: 'offline-service-worker',
    apply: 'build',
    enforce: 'post',
    configResolved(config) { publicDir = config.publicDir; },
    async generateBundle(_, bundle) {
      const hash = createHash('sha256');
      const built = Object.keys(bundle).sort();
      for (const name of built) {
        const item = bundle[name];
        hash.update(name).update(item.type === 'chunk' ? item.code : item.source);
      }
      const extra = files(publicDir).map((name) => name.split('\\').join('/')).filter((name) => !name.startsWith('pyodide/') && /\.(woff2|svg|png|webmanifest)$/.test(name)).sort();
      for (const name of extra) hash.update(name).update(readFileSync(join(publicDir, name)));
      const runtime = createHash('sha256');
      for (const name of files(join(publicDir, 'pyodide')).sort()) runtime.update(name).update(readFileSync(join(publicDir, 'pyodide', name)));
      const config: WorkerConfig = {
        version: hash.digest('hex').slice(0, 12),
        files: [...built, ...extra].map((name) => `/${name}`),
        pyodide: runtime.digest('hex').slice(0, 12),
      };
      const source = join(ROOT, 'src/service-worker.ts');
      const { code } = await transformWithOxc(readFileSync(source, 'utf8'), relative(ROOT, source), { lang: 'ts' });
      // A classic script: module service workers are not supported everywhere yet.
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `${code.replace(/^export /gm, '')}\nserviceWorker(self, ${JSON.stringify(config)});\n` });
    },
  };
}
