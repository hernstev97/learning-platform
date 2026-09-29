/// <reference lib="webworker" />
// Offline cache for the app shell and the learning content. tooling/vite-plugins.ts serializes this function into
// /sw.js with the build's file list, so it must not reference anything outside its own body.
// Personal progress travels over the Convex WebSocket and Clerk runs on its own origin; neither passes through here.

export type WorkerConfig = { version: string; files: string[]; pyodide: string };

export function serviceWorker(worker: ServiceWorkerGlobalScope, { version, files, pyodide }: WorkerConfig): void {
  const SHELL = `learn-shell-${version}`;
  const PYODIDE = `learn-pyodide-${pyodide}`;
  // After this long a slow network loses against the cached shell.
  const NAVIGATION_TIMEOUT = 4000;
  const precached = new Set(files);

  worker.addEventListener('install', (event) => {
    event.waitUntil((async () => {
      const cache = await caches.open(SHELL);
      await Promise.all(files.map(async (path) => {
        // Hashed build files never change: copy them from the previous version instead of downloading them again.
        const reused = path.startsWith('/assets/') ? await caches.match(path) : undefined;
        const response = reused ?? await fetch(path, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`${path}: ${response.status}`);
        await cache.put(path, response);
      }));
      await worker.skipWaiting();
    })());
  });

  worker.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
      const names = await caches.keys();
      // Cache names are listed in creation order. The previous shell stays: pages opened before this
      // update may still lazy-load its chunks, which the server no longer has.
      const shells = names.filter((name) => name.startsWith('learn-shell-') && name !== SHELL);
      const runtimes = names.filter((name) => name.startsWith('learn-pyodide-') && name !== PYODIDE);
      await Promise.all([...shells.slice(0, -1), ...runtimes].map((name) => caches.delete(name)));
      await worker.clients.claim();
    })());
  });

  worker.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== worker.location.origin) return;
    if (request.mode === 'navigate') event.respondWith(page(request));
    else if (url.pathname.startsWith('/pyodide/')) event.respondWith(python(event));
    else if (precached.has(url.pathname) || url.pathname.startsWith('/assets/')) event.respondWith(file(request));
  });

  // Network first, so an online visit always gets the current deployment; offline the cached shell renders any route.
  async function page(request: Request): Promise<Response> {
    const shell = async () => (await caches.open(SHELL)).match('/index.html');
    try {
      const response = await Promise.race([
        fetch(request),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), NAVIGATION_TIMEOUT)),
      ]);
      return response.ok ? response : await shell() ?? response;
    } catch {
      return await shell() ?? Response.error();
    }
  }

  async function file(request: Request): Promise<Response> {
    return await caches.match(request, { ignoreSearch: true, ignoreVary: true }) ?? fetch(request);
  }

  // Pyodide (about 12 MB) is cached on first use only; files keep their names across versions, hence the versioned cache.
  async function python(event: FetchEvent): Promise<Response> {
    const cache = await caches.open(PYODIDE);
    const hit = await cache.match(event.request, { ignoreVary: true });
    if (hit) return hit;
    const response = await fetch(event.request);
    if (response.status === 200) event.waitUntil(cache.put(event.request, response.clone()));
    return response;
  }
}
