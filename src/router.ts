// History-API router. Content pages are plain links; the router intercepts same-origin clicks.
export type Route =
  | { name: 'home' }
  | { name: 'data' }
  | { name: 'area'; area: string }
  | { name: 'lesson'; area: string; module: string }
  | { name: 'exercise'; area: string; module: string; index: number }
  | { name: 'cards'; area: string }
  | { name: 'projects'; area: string }
  | { name: 'project'; area: string; project: string }
  | { name: 'reference'; area: string; page: 'spickzettel' | 'glossar' | 'beruf' }
  | { name: 'not-found' };
export type Page<R extends Route = any> = (main: HTMLElement, route: R) => Promise<(() => void) | void> | (() => void) | void;

const SEGMENT = /^[a-z0-9-]+$/;
export function parseRoute(pathname: string): Route {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (!parts.length) return { name: 'home' };
  if (parts.some((part) => !SEGMENT.test(part))) return { name: 'not-found' };
  const [area, second, third] = parts;
  if (parts.length === 1) return area === 'daten' ? { name: 'data' } : { name: 'area', area };
  if (second === 'karten' && parts.length === 2) return { name: 'cards', area };
  if (second === 'projekte') return parts.length === 2 ? { name: 'projects', area } : parts.length === 3 ? { name: 'project', area, project: third } : { name: 'not-found' };
  if ((second === 'spickzettel' || second === 'glossar' || second === 'beruf') && parts.length === 2) return { name: 'reference', area, page: second };
  if (parts.length === 2) return { name: 'lesson', area, module: second };
  if (parts.length === 3 && /^\d+$/.test(third)) return { name: 'exercise', area, module: second, index: Number(third) };
  return { name: 'not-found' };
}

let onChange: (scroll: () => void) => Promise<void> = async () => {};
const scrollFor = (hash: string, preserve?: number) => () => {
  if (preserve !== undefined) { window.scrollTo(0, preserve); return; }
  const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
  if (target) target.scrollIntoView();
  else window.scrollTo(0, 0);
  const heading = document.querySelector<HTMLElement>('main h1');
  if (!target && heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
};

export function navigate(path: string, options: { replace?: boolean; keepScroll?: boolean } = {}): void {
  const url = new URL(path, location.href);
  if (url.pathname === location.pathname && url.hash && !options.replace) {
    history.pushState(null, '', url);
    document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
    return;
  }
  if (options.replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  void onChange(scrollFor(url.hash, options.keepScroll ? window.scrollY : undefined));
}

export function startRouter(handler: (scroll: () => void) => Promise<void>): void {
  onChange = handler;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest?.('a');
    if (!link || link.target || link.hasAttribute('download') || link.dataset.native !== undefined) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith('/pyodide/')) return;
    event.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  });
  window.addEventListener('popstate', () => void onChange(scrollFor(location.hash)));
  void onChange(scrollFor(location.hash));
}
