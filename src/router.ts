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
  | { name: 'review-home' }
  | { name: 'review'; area: string }
  | { name: 'review-round'; area: string; topic: string }
  | { name: 'not-found' };
export type Page<R extends Route = any> = (main: HTMLElement, route: R) => Promise<(() => void) | void> | (() => void) | void;

const SEGMENT = /^[a-z0-9-]+$/;
export function parseRoute(pathname: string): Route {
  let parts: string[];
  try { parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean).map(decodeURIComponent); }
  catch { return { name: 'not-found' }; }
  if (!parts.length) return { name: 'home' };
  if (parts.some((part) => !SEGMENT.test(part))) return { name: 'not-found' };
  const [area, second, third] = parts;
  if (parts.length === 1) return area === 'daten' ? { name: 'data' } : area === 'wiederholen' ? { name: 'review-home' } : { name: 'area', area };
  if (second === 'karten' && parts.length === 2) return { name: 'cards', area };
  if (second === 'wiederholen') return parts.length === 2 ? { name: 'review', area } : parts.length === 3 ? { name: 'review-round', area, topic: third } : { name: 'not-found' };
  if (second === 'projekte') return parts.length === 2 ? { name: 'projects', area } : parts.length === 3 ? { name: 'project', area, project: third } : { name: 'not-found' };
  if ((second === 'spickzettel' || second === 'glossar' || second === 'beruf') && parts.length === 2) return { name: 'reference', area, page: second };
  if (parts.length === 2) return { name: 'lesson', area, module: second };
  if (parts.length === 3 && /^\d+$/.test(third)) return { name: 'exercise', area, module: second, index: Number(third) };
  return { name: 'not-found' };
}

let onChange: (scroll: () => void) => Promise<void> = async () => {};
const scrollFor = (hash: string, preserve?: number) => () => {
  if (preserve !== undefined) { window.scrollTo(0, preserve); return; }
  const target = hashTarget(hash);
  if (target) showTarget(target);
  else window.scrollTo(0, 0);
  const heading = document.querySelector<HTMLElement>('main h1');
  if (!target && heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
};

function hashTarget(hash: string): HTMLElement | null {
  try { return hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; }
  catch { return null; }
}

/** Scrolls to the element a fragment points to (opening it if it is a closed <details>), marks it briefly and focuses it. */
function showTarget(target: HTMLElement): void {
  if (target instanceof HTMLDetailsElement) target.open = true;
  target.scrollIntoView();
  document.querySelector('.hash-target')?.classList.remove('hash-target');
  target.classList.add('hash-target');
  // Moves the keyboard position to the target, as a native fragment navigation would.
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

/** `render` renders the page again even if only the fragment changes. */
export function navigate(path: string, options: { replace?: boolean; keepScroll?: boolean; render?: boolean } = {}): void {
  const url = new URL(path, location.href);
  if (url.pathname === location.pathname && url.hash && !options.replace && !options.render) {
    history.pushState(null, '', url);
    const target = hashTarget(url.hash);
    if (target) showTarget(target);
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
