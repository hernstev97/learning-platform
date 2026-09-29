import './styles/base.css';
import './styles/layout.css';
import './styles/content.css';
import './styles/exercise.css';
import './styles/pages.css';
import { catalog, closeDraft, getStorageWarning, getSyncNotice, getSyncStatus, hasPendingWrites, isCloud, isOffline, loadArea, onProgressChange, onStorageChange, prepareDraft, summaryOf, visit } from './app.ts';
import { scanLegacy } from './engine/legacy.ts';
import { $, html, icons } from './ui/dom.ts';
import { currentTheme, initTheme, onThemeChange, setTheme } from './ui/theme.ts';
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
      <button class="theme-toggle" id="theme-toggle" type="button"></button>
      <button class="btn small" id="sign-out" type="button" ${isOffline() ? 'hidden' : ''}>Abmelden</button>
    </header>
    <p id="sync-notice" class="storage-warning sync-notice" hidden><span role="status"></span>${isOffline() ? html` <button class="btn small" id="reconnect" type="button">Erneut verbinden</button>` : ''}</p>
    <p id="storage-warning" class="storage-warning" role="status" hidden></p>
    <p id="legacy-notice" class="storage-warning" hidden>Lokaler Lernstand gefunden. <a href="/daten">Unter Daten prüfen und importieren</a>.</p>
    <main id="main" tabindex="-1" aria-busy="true"></main>
    <footer class="footer">
      <span>learn.kiumu.app</span>
      <span id="storage-status" role="status">Lernstand wird geladen …</span>
      <a href="/daten">Sichern &amp; übertragen</a>
    </footer>`.value;

  const main = $('#main');
  // Sticky rows below the top bar need its real height, which changes when the bar wraps on small screens.
  // The connection notice sticks directly below the bar and counts towards that height while it is shown.
  const topbar = $('.topbar');
  const syncNotice = $('#sync-notice');
  const headerSize = new ResizeObserver(() => {
    const height = topbar.getBoundingClientRect().height;
    syncNotice.style.top = `${height}px`;
    document.documentElement.style.setProperty('--topbar-h', `${height + syncNotice.getBoundingClientRect().height}px`);
  });
  headerSize.observe(topbar);
  headerSize.observe(syncNotice);
  if (isCloud && !isOffline()) void scanLegacy(catalog).then((scan) => { $('#legacy-notice').hidden = scan.imported || !Object.keys(scan.areas).length; }).catch(() => {});
  $('#sign-out').addEventListener('click', () => { void signOut(); });
  // A reload signs in and loads the current state; reading mode holds no unsaved changes.
  document.querySelector('#reconnect')?.addEventListener('click', () => location.reload());
  initTheme();
  const toggle = $<HTMLButtonElement>('#theme-toggle');
  const showTheme = () => {
    const dark = currentTheme() === 'dark';
    const label = dark ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren';
    toggle.innerHTML = dark ? icons.sun : icons.moon;
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  };
  showTheme();
  onThemeChange(showTheme);
  toggle.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  window.addEventListener('beforeunload', (event) => { if (hasPendingWrites()) { event.preventDefault(); event.returnValue = ''; } });
  let cleanup: (() => void) | void;
  let renderToken = 0;

  function updateStorage(): void {
    const warning = getStorageWarning();
    const element = $('#storage-warning');
    element.hidden = !warning;
    element.textContent = warning ?? '';
    const notice = getSyncNotice();
    syncNotice.hidden = !notice;
    $('span', syncNotice).textContent = notice ?? '';
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
    revealCurrent($<HTMLElement>('.topnav'));
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
        main.setAttribute('aria-busy', 'true');
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
    main.removeAttribute('aria-busy');
    revealCurrent(main.querySelector<HTMLElement>('.area-tabs'));
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

/** Centers the current entry of a horizontally scrollable tab row if it is cut off. */
function revealCurrent(row: HTMLElement | null): void {
  const current = row?.querySelector<HTMLElement>('[aria-current]');
  if (!row || !current || row.scrollWidth <= row.clientWidth) return;
  const box = row.getBoundingClientRect();
  const rect = current.getBoundingClientRect();
  if (rect.left >= box.left && rect.right <= box.right) return;
  row.scrollLeft += rect.left - box.left - (row.clientWidth - rect.width) / 2;
}
export { navigate };
