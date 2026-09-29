import { loadArea, progressOf, summaryOf } from '../app.ts';
import { areaBanner } from '../ui/area-nav.ts';
import { enhanceCode } from '../ui/code.ts';
import { $, $$, html, raw } from '../ui/dom.ts';
import type { Page } from '../router.ts';

const TITLES = { spickzettel: 'Spickzettel', glossar: 'Glossar', beruf: 'Beruf & Bewerbung' } as const;

const reference: Page<{ name: 'reference'; area: string; page: 'spickzettel' | 'glossar' | 'beruf' }> = async (main, route) => {
  const summary = summaryOf(route.area)!;
  const area = await loadArea(route.area);
  const progress = progressOf(summary.id);
  const title = TITLES[route.page];
  document.title = `${title} · ${summary.title}`;
  const banner = areaBanner(summary, progress, route.page, title);
  if (route.page === 'glossar') {
    main.innerHTML = html`${banner}<div class="page">
      <div class="glossary-search"><label class="label" for="glossary-filter">Begriff suchen</label><input id="glossary-filter" type="search" placeholder="z. B. ${area.glossary[0]?.term ?? ''}" autocomplete="off"></div>
      <p class="muted small" id="glossary-count"></p>
      <dl class="glossary">${area.glossary.map((entry) => html`<div class="glossary-entry" id="${entry.id}" data-term="${entry.term.toLowerCase()}"><dt>${entry.term}</dt><dd class="prose compact">${raw(entry.definition)}</dd></div>`)}</dl>
    </div>`.value;
    const filter = $<HTMLInputElement>('#glossary-filter', main);
    const apply = () => {
      const query = filter.value.trim().toLowerCase();
      let shown = 0;
      $$<HTMLElement>('.glossary-entry', main).forEach((entry) => {
        const match = !query || entry.dataset.term!.includes(query) || entry.textContent!.toLowerCase().includes(query);
        entry.hidden = !match;
        if (match) shown++;
      });
      $('#glossary-count', main).textContent = `${shown} von ${area.glossary.length} Begriffen`;
    };
    filter.addEventListener('input', apply);
    apply();
    return;
  }
  const body = route.page === 'spickzettel' ? area.cheatsheet : area.career;
  if (!body) return (await import('./not-found.ts')).default(main, { name: 'not-found' });
  main.innerHTML = html`${banner}<div class="page reference-page ${route.page}">
    ${route.page === 'spickzettel' ? html`<p class="no-print"><button type="button" class="btn small" id="print">Drucken / als PDF</button></p>` : ''}
    <div class="prose ${route.page === 'spickzettel' ? 'cheatsheet' : ''}">${raw(body.replace(/^<h1[^>]*>[\s\S]*?<\/h1>/, ''))}</div>
  </div>`.value;
  main.querySelector('#print')?.addEventListener('click', () => window.print());
  return enhanceCode(main);
};
export default reference;
