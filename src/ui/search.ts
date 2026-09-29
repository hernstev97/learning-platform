// Global search: a dialog in the top bar, opened with "/" or Ctrl/Cmd+K. The input is a combobox; the results are
// options that the arrow keys select and Enter opens. See src/engine/search.ts for matching and ranking.
import { catalog, summaryOf } from '../app.ts';
import type { SearchKind } from '../content/types.ts';
import { MIN_QUERY, prepare, search, type Hit, type Marked, type Prepared } from '../engine/search.ts';
import { navigate } from '../router.ts';
import { $, escape, html, icons, raw } from './dom.ts';

const KINDS: Record<SearchKind, string> = { module: 'Modul', lesson: 'Lektion', glossary: 'Glossar', cheatsheet: 'Spickzettel', project: 'Projekt', card: 'Interview-Karte' };
const LIMIT = 50;

let index: Promise<Prepared[]> | undefined;
/** A separate chunk of about 1.5 MB text: loaded when search is first wanted, precached by the service worker for offline use. */
function loadIndex(): Promise<Prepared[]> {
  index ??= import('virtual:search-index').then((module) => prepare(module.default)).catch((error: unknown) => { index = undefined; throw error; });
  return index;
}

function markup({ text, marks }: Marked): string {
  let out = '';
  let from = 0;
  for (const [start, end] of marks) {
    out += `${escape(text.slice(from, start))}<mark>${escape(text.slice(start, end))}</mark>`;
    from = end;
  }
  return out + escape(text.slice(from));
}

export function mountSearch(root: HTMLElement, opener: HTMLButtonElement): void {
  const dialog = document.createElement('dialog');
  dialog.className = 'search-dialog';
  dialog.setAttribute('aria-label', 'Suche');
  dialog.innerHTML = html`<div class="search-panel">
    <div class="search-field">
      ${raw(icons.search)}
      <input id="search-input" type="search" role="combobox" aria-label="Lerninhalte durchsuchen" aria-autocomplete="list" aria-controls="search-results" aria-expanded="false"
        placeholder="Lektionen, Glossar, Karten, Projekte …" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go">
      <button type="button" class="btn small ghost" id="search-close">Schließen</button>
    </div>
    <p class="search-status" id="search-status" role="status"></p>
    <ul class="search-results" id="search-results" role="listbox" aria-label="Treffer"></ul>
    <p class="search-keys label" aria-hidden="true"><span><kbd>↑</kbd> <kbd>↓</kbd> auswählen</span><span><kbd>Enter</kbd> öffnen</span><span><kbd>Esc</kbd> schließen</span></p>
  </div>`.value;
  root.append(dialog);
  const input = $<HTMLInputElement>('#search-input', dialog);
  const status = $('#search-status', dialog);
  const list = $('#search-results', dialog);
  let entries: Prepared[] | null = null;
  let hits: Hit[] = [];
  let active = -1;

  const select = (next: number, scroll = true) => {
    active = next;
    [...list.children].forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
    const current = list.children[active];
    if (current) input.setAttribute('aria-activedescendant', current.id);
    else input.removeAttribute('aria-activedescendant');
    if (current && scroll) current.scrollIntoView({ block: 'nearest' });
  };

  const update = () => {
    if (!entries) return;
    const query = input.value.trim();
    const result = search(entries, query, LIMIT);
    hits = result.hits;
    list.innerHTML = hits.map((hit, i) => {
      const area = summaryOf(hit.doc.area)!;
      return html`<li role="option" id="search-hit-${i}" aria-selected="false"><a href="${hit.doc.href}" tabindex="-1" style="--area:${area.color}">
        <span class="search-hit-meta label"><span class="search-hit-area">${area.short}</span><span>${KINDS[hit.doc.kind]}</span>${hit.doc.context ? html`<span class="search-hit-context">${hit.doc.context}</span>` : ''}</span>
        <span class="search-hit-title">${raw(markup(hit.title))}</span>
        ${hit.snippet.text ? html`<span class="search-hit-snippet">${raw(markup(hit.snippet))}</span>` : ''}
      </a></li>`.value;
    }).join('');
    input.setAttribute('aria-expanded', String(hits.length > 0));
    list.scrollTop = 0;
    select(hits.length ? 0 : -1);
    status.textContent = query.length < MIN_QUERY
      ? `Durchsucht Lektionen, Module, Glossare, Spickzettel, Projekte und Interview-Karten aller ${catalog.areas.length} Bereiche.`
      : !result.total ? `Keine Treffer für „${query}“.`
      : result.total > hits.length ? `Die besten ${hits.length} von ${result.total} Treffern` : `${result.total} Treffer`;
  };

  const open = () => {
    if (!dialog.open) dialog.showModal();
    input.focus();
    input.select();
    if (entries) return;
    status.textContent = 'Suchindex wird geladen …';
    loadIndex().then((loaded) => { entries = loaded; update(); }, () => {
      status.textContent = 'Der Suchindex konnte nicht geladen werden. Prüfe die Verbindung und öffne die Suche erneut.';
    });
  };
  const close = () => { if (dialog.open) dialog.close(); };
  // Always renders the target page, even for another place on the current one: a filtered glossary or a running card
  // session would otherwise hide the result.
  const go = (href: string) => { close(); navigate(href, { render: true }); };

  input.addEventListener('input', update);
  input.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (hits.length) select((active + (event.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (hits[active]) go(hits[active].doc.href);
    } else if (event.key === 'Escape') {
      // A search field would only clear itself on the first Escape.
      event.preventDefault();
      close();
    }
  });
  list.addEventListener('click', (event) => {
    const link = (event.target as Element).closest('a');
    // Modified clicks keep their browser meaning, such as opening a new tab.
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    go(link.getAttribute('href')!);
  });
  list.addEventListener('mousemove', (event) => {
    const option = (event.target as Element).closest('[role="option"]');
    const i = option ? [...list.children].indexOf(option) : -1;
    if (i !== -1 && i !== active) select(i, false);
  });
  $('#search-close', dialog).addEventListener('click', close);
  // The panel fills the dialog, so a click on the dialog itself is a click on the backdrop.
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  window.addEventListener('popstate', close);

  opener.addEventListener('click', open);
  // Start loading as soon as the button is about to be used.
  const warm = () => { void loadIndex().catch(() => {}); };
  opener.addEventListener('pointerenter', warm, { once: true });
  opener.addEventListener('focus', warm, { once: true });
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.isComposing || event.altKey) return;
    const typing = (event.target as Element).closest?.('input, textarea, select, [contenteditable]');
    const modifier = event.ctrlKey || event.metaKey;
    if ((modifier && !event.shiftKey && event.key?.toLowerCase() === 'k') || (event.key === '/' && !modifier && !typing)) {
      event.preventDefault();
      open();
    }
  });
}
