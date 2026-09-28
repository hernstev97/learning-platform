import './styles/base.css';
import './styles/layout.css';
import './styles/content.css';
import './styles/exercise.css';
import './styles/pages.css';
import { catalog, getStorageWarning, loadArea, onStorageChange, summaryOf } from './app.ts';
import { $, html } from './ui/dom.ts';
import type { Page } from './router.ts';
import { navigate, parseRoute, startRouter } from './router.ts';

const app = $('#app');
app.innerHTML = html`
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  <header class="topbar">
    <a class="logo" href="/" aria-label="learn.kiumu.app – Startseite"><span class="logo-mark" aria-hidden="true">L</span><span class="logo-text">learn<span>.kiumu</span></span></a>
    <nav class="topnav" aria-label="Lernbereiche">
      ${catalog.areas.map((area) => html`<a href="/${area.id}" data-area="${area.id}" style="--area:${area.color}">${area.short}</a>`)}
    </nav>
    <a class="topbar-data" href="/daten">Daten</a>
  </header>
  <p id="storage-warning" class="storage-warning" role="status" hidden></p>
  <main id="main" tabindex="-1"></main>
  <footer class="footer">
    <span>learn.kiumu.app</span>
    <span id="storage-status">Lernstand nur in diesem Browser gespeichert</span>
    <a href="/daten">Sichern &amp; übertragen</a>
  </footer>`.value;

const main = $('#main');
let cleanup: (() => void) | void;
let renderToken = 0;

function updateStorage(): void {
  const warning = getStorageWarning();
  const element = $('#storage-warning');
  element.hidden = !warning;
  element.textContent = warning ?? '';
  $('#storage-status').textContent = warning ? 'Nicht gespeichert' : 'Lernstand nur in diesem Browser gespeichert';
}
onStorageChange(updateStorage);

async function render(): Promise<void> {
  const token = ++renderToken;
  const route = parseRoute(location.pathname);
  if (cleanup) { cleanup(); cleanup = undefined; }
  const area = 'area' in route ? summaryOf(route.area) : undefined;
  document.documentElement.style.setProperty('--accent', area?.color ?? '#FF4F00');
  document.documentElement.dataset.area = area?.id ?? '';
  document.querySelectorAll<HTMLAnchorElement>('.topnav a').forEach((link) => link.toggleAttribute('aria-current', link.dataset.area === area?.id));
  let page: Page;
  switch (route.name) {
    case 'home': page = (await import('./pages/home.ts')).default; break;
    case 'data': page = (await import('./pages/data.ts')).default; break;
    case 'area': page = (await import('./pages/area.ts')).default; break;
    case 'lesson': page = (await import('./pages/lesson.ts')).default; break;
    case 'exercise': page = (await import('./pages/exercise.ts')).default; break;
    case 'cards': page = (await import('./pages/cards.ts')).default; break;
    case 'projects': case 'project': page = (await import('./pages/projects.ts')).default; break;
    case 'reference': page = (await import('./pages/reference.ts')).default; break;
    default: page = (await import('./pages/not-found.ts')).default;
  }
  if (token !== renderToken) return;
  if (area === undefined && 'area' in route) page = (await import('./pages/not-found.ts')).default;
  try {
    // Finish lazy content loading before a page can touch the shared main element.
    // A slower earlier navigation must not overwrite the page selected in the meantime.
    if (area && !['home', 'data', 'area', 'not-found'].includes(route.name)) await loadArea(area.id);
    if (token !== renderToken) return;
    cleanup = await page(main, route as never);
  } catch (error) {
    if (token !== renderToken) return;
    console.error(error);
    main.innerHTML = html`<section class="page narrow"><h1 class="page-title" tabindex="-1">Fehler</h1><p>Diese Seite konnte nicht geladen werden: ${String((error as Error).message)}</p><p><a class="btn" href="/">Zur Startseite</a></p></section>`.value;
  }
  if (token !== renderToken) return;
  updateStorage();
}

startRouter(async (scroll) => {
  const requested = location.href;
  await render();
  if (location.href === requested) scroll();
});
export { navigate };
