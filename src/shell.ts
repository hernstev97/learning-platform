import './styles/base.css';
import './styles/layout.css';
import './styles/content.css';
import './styles/exercise.css';
import './styles/pages.css';
import { catalog, closeDraft, getStorageWarning, getSyncStatus, hasPendingWrites, isCloud, loadArea, onProgressChange, onStorageChange, prepareDraft, summaryOf, visit } from './app.ts';
import { scanLegacy } from './engine/legacy.ts';
import { $, html } from './ui/dom.ts';
import type { Page } from './router.ts';
import { navigate, parseRoute, startRouter } from './router.ts';

export function mount(signOut: () => Promise<void> = async () => {}): void {
  const app = $('#app');
  app.innerHTML = html`
    <a class="skip-link" href="#main">Zum Inhalt springen</a>
    <header class="topbar">
      <a class="logo" href="/" aria-label="learn.kiumu.app – Startseite"><span class="logo-mark" aria-hidden="true">L</span><span class="logo-text">learn<span>.kiumu</span></span></a>
      <nav class="topnav" aria-label="Lernbereiche">
        ${catalog.areas.map((area) => html`<a href="/${area.id}" data-area="${area.id}" style="--area:${area.color}">${area.short}</a>`)}
      </nav>
      <a class="topbar-data" href="/daten">Daten</a>
      <button class="btn small" id="sign-out" type="button">Abmelden</button>
    </header>
    <p id="storage-warning" class="storage-warning" role="status" hidden></p>
    <p id="legacy-notice" class="storage-warning" hidden>Lokaler Lernstand gefunden. <a href="/daten">Unter Daten prüfen und importieren</a>.</p>
    <main id="main" tabindex="-1"></main>
    <footer class="footer">
      <span>learn.kiumu.app</span>
      <span id="storage-status" role="status">Lernstand wird geladen …</span>
      <a href="/daten">Sichern &amp; übertragen</a>
    </footer>`.value;

  const main = $('#main');
  if (isCloud) void scanLegacy(catalog).then((scan) => { $('#legacy-notice').hidden = scan.imported || !Object.keys(scan.areas).length; }).catch(() => {});
  $('#sign-out').addEventListener('click', () => { void signOut(); });
  window.addEventListener('beforeunload', (event) => { if (hasPendingWrites()) { event.preventDefault(); event.returnValue = ''; } });
  let cleanup: (() => void) | void;
  let renderToken = 0;

  function updateStorage(): void {
    const warning = getStorageWarning();
    const element = $('#storage-warning');
    element.hidden = !warning;
    element.textContent = warning ?? '';
    $('#storage-status').textContent = getSyncStatus();
  }
  onStorageChange(updateStorage);

  async function render(recordVisit = true): Promise<void> {
    const token = ++renderToken;
    const route = parseRoute(location.pathname);
    if (cleanup) { cleanup(); cleanup = undefined; }
    closeDraft();
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
      if (route.name === 'exercise' && area) {
        main.innerHTML = '<section class="page"><p role="status">Entwurf wird geladen …</p></section>';
        const content = await loadArea(area.id);
        const exercise = content.modules[route.module]?.exercises[route.index - 1];
        if (exercise) await prepareDraft(area.id, exercise);
        if (token !== renderToken) return;
      }
      cleanup = await page(main, route as never);
      // Card reviews are a side trip and never replace the learning-path position.
      if (recordVisit && area) {
        if (route.name === 'lesson' && area.modules.some((m) => m.id === route.module)) visit(area.id, { page: 'lesson', moduleId: route.module });
        if (route.name === 'exercise') {
          const exercise = area.modules.find((m) => m.id === route.module)?.exercises[route.index - 1];
          if (exercise) visit(area.id, { page: 'exercise', moduleId: route.module, exerciseId: exercise.id });
        }
        if (route.name === 'project' && area.projects.some((p) => p.id === route.project)) visit(area.id, { page: 'project', projectId: route.project });
      }
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
  let scheduled = false;
  onProgressChange((draft) => {
    if (draft || ['exercise', 'lesson', 'project', 'cards', 'data'].includes(parseRoute(location.pathname).name) || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; void render(false); });
  });
}
export { navigate };
