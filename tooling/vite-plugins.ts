import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { CONTENT, ROOT, formatIssues, loadContent, type Loaded } from './content.ts';

const CATALOG = 'virtual:catalog';
const LOADERS = 'virtual:area-loaders';
const AREA = 'virtual:area/';

/** Serves content/ as virtual modules: a small catalog plus one lazily loaded chunk per area. */
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
      if (id === CATALOG || id === LOADERS || id.startsWith(AREA)) return `\0${id}`;
    },
    load(id) {
      if (!id.startsWith('\0virtual:')) return;
      const name = id.slice(1);
      const loaded = load();
      if (name === CATALOG) return `export default ${JSON.stringify(loaded.catalog)};`;
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
 * plus the few extra wheels exercises may import (vendor/pyodide: tzdata, beautifulsoup4, PyYAML).
 */
export function pyodide(): Plugin {
  return {
    name: 'self-hosted-pyodide',
    configResolved() {
      const from = join(ROOT, 'node_modules/pyodide');
      const to = join(ROOT, 'public/pyodide');
      const version = JSON.parse(readFileSync(join(from, 'package.json'), 'utf8')).version as string;
      const stamp = join(to, 'VERSION');
      if (existsSync(stamp) && readFileSync(stamp, 'utf8') === version) return;
      mkdirSync(to, { recursive: true });
      for (const file of PYODIDE_FILES) copyFileSync(join(from, file), join(to, file));
      for (const file of readdirSync(join(ROOT, 'vendor/pyodide'))) copyFileSync(join(ROOT, 'vendor/pyodide', file), join(to, file));
      writeFileSync(stamp, version);
    },
  };
}
