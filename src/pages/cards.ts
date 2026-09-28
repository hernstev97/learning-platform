import { loadArea, onProgressChange, progressOf, reviewCard, summaryOf } from '../app.ts';
import type { Card } from '../content/types.ts';
import { INTERVALS, localDay } from '../engine/storage.ts';
import { areaBanner } from '../ui/area-nav.ts';
import { $, $$, LEVELS, html, raw } from '../ui/dom.ts';
import type { Page } from '../router.ts';

const NEW_PER_SESSION = 12;

const cards: Page<{ name: 'cards'; area: string }> = async (main, route) => {
  const summary = summaryOf(route.area)!;
  const area = await loadArea(route.area);
  const progress = progressOf(summary.id);
  document.title = `Interview-Training · ${summary.title}`;
  const today = localDay();
  const tags = [...new Set(area.cards.flatMap((c) => c.tags))].sort((a, b) => a.localeCompare(b, 'de'));
  let tag = '';
  let queue: Card[] = [];
  let position = 0;
  let revealed = false;
  let sessionKnown = 0;

  const pool = () => area.cards.filter((c) => !tag || c.tags.includes(tag));
  const due = () => pool().filter((c) => progress.cards[c.id] && progress.cards[c.id].due <= today);
  const fresh = () => pool().filter((c) => !progress.cards[c.id]);
  const boxes = () => [1, 2, 3, 4, 5].map((box) => pool().filter((c) => progress.cards[c.id]?.box === box).length);

  main.innerHTML = html`
    ${areaBanner(summary, progress, 'karten', 'Interview-Training')}
    <div class="page cards-page">
      <p class="page-intro">Karteikarten mit echten Interviewfragen. Beantworte jede Frage erst laut oder schriftlich, dann deck die Antwort auf und sei ehrlich zu dir. Gewusste Karten kommen nach 1, 3, 7, 16 und 35 Tagen wieder (Leitner-System), vergessene sofort.</p>
      <div class="cards-toolbar">
        <label class="label" for="tag">Thema</label>
        <select id="tag"><option value="">Alle Themen (${area.cards.length})</option>${tags.map((t) => html`<option value="${t}">${t} (${area.cards.filter((c) => c.tags.includes(t)).length})</option>`)}</select>
      </div>
      <div id="deck"></div>
      <section class="card-browser">
        <h2 class="section-title">Alle Fragen</h2>
        <div id="all-cards"></div>
      </section>
    </div>`.value;

  const renderStats = () => {
    const b = boxes();
    const max = Math.max(1, ...b);
    return html`<div class="deck-stats">
      <div class="deck-counts"><div><span class="big-number">${due().length}</span><span class="label">fällig</span></div><div><span class="big-number">${fresh().length}</span><span class="label">neu</span></div><div><span class="big-number">${b[2] + b[3] + b[4]}</span><span class="label">sitzen (Box 3+)</span></div></div>
      <div class="boxes" aria-label="Verteilung auf die Boxen">${b.map((count, i) => html`<div class="box-col"><span class="box-bar" style="height:${Math.round(count / max * 100)}%"></span><span class="label">Box ${i + 1}</span><span class="label muted">${count}</span></div>`)}</div>
    </div>`;
  };
  const renderDeck = () => {
    const deck = $('#deck', main);
    if (!queue.length || position >= queue.length) {
      const done = queue.length > 0;
      const available = due().length + Math.min(fresh().length, NEW_PER_SESSION);
      deck.innerHTML = html`${renderStats()}
        <div class="deck-start">
          ${done ? html`<p class="deck-done"><strong>Runde fertig.</strong> ${sessionKnown} von ${queue.length} gewusst.</p>` : ''}
          ${available ? html`<button type="button" class="btn primary big" id="start">${done ? 'Nächste Runde' : 'Training starten'} · ${available} Karten</button><p class="muted small">${due().length} fällige Wiederholungen und bis zu ${NEW_PER_SESSION} neue Karten.</p>`
            : html`<p><strong>Für heute ist alles wiederholt.</strong> Morgen sind wieder Karten fällig. Du kannst unten jederzeit alle Fragen durchgehen.</p><button type="button" class="btn" id="extra">Trotzdem üben (zufällige Auswahl)</button>`}
        </div>`.value;
      main.querySelector('#start')?.addEventListener('click', () => startSession(false));
      main.querySelector('#extra')?.addEventListener('click', () => startSession(true));
      return;
    }
    const card = queue[position];
    const state = progress.cards[card.id];
    deck.innerHTML = html`
      <div class="flashcard ${revealed ? 'revealed' : ''}">
        <div class="flashcard-meta label"><span>Karte ${position + 1} / ${queue.length}</span><span>${state ? `Box ${state.box}` : 'Neu'} · ${LEVELS[card.level]}${card.tags.length ? ` · ${card.tags.join(', ')}` : ''}</span></div>
        <div class="flashcard-question prose">${raw(card.question)}</div>
        ${revealed ? html`<div class="flashcard-answer prose compact">${raw(card.answer)}</div>
          <div class="grade-row"><button type="button" class="btn big" id="again"><kbd>1</kbd> Nochmal</button><button type="button" class="btn primary big" id="knew"><kbd>2</kbd> Gewusst</button></div>`
          : html`<div class="grade-row"><button type="button" class="btn primary big" id="show"><kbd>Leertaste</kbd> Antwort zeigen</button></div>`}
      </div>`.value;
    main.querySelector('#show')?.addEventListener('click', reveal);
    main.querySelector('#again')?.addEventListener('click', () => grade(false));
    main.querySelector('#knew')?.addEventListener('click', () => grade(true));
    deck.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  };
  const reveal = () => { revealed = true; renderDeck(); };
  const grade = (knew: boolean) => {
    const card = queue[position];
    reviewCard(summary.id, card.id, knew);
    if (knew) sessionKnown++; else queue.push(card);
    position++;
    revealed = false;
    renderDeck();
    renderList();
  };
  const startSession = (extra: boolean) => {
    const shuffle = <T,>(items: T[]) => items.map((item) => [Math.random(), item] as const).sort((a, b) => a[0] - b[0]).map(([, item]) => item);
    queue = extra ? shuffle(pool()).slice(0, 15) : [...shuffle(due()), ...fresh().slice(0, NEW_PER_SESSION)];
    position = 0; revealed = false; sessionKnown = 0;
    renderDeck();
  };
  const renderList = () => {
    $('#all-cards', main).innerHTML = pool().map((card) => {
      const state = progress.cards[card.id];
      return html`<details class="card-item"><summary><span class="card-q">${raw(card.question.replace(/<\/?p>/g, ''))}</span><span class="tag">${state ? `Box ${state.box}` : 'Neu'}</span></summary><div class="prose compact">${raw(card.answer)}</div></details>`.value;
    }).join('');
  };
  $<HTMLSelectElement>('#tag', main).addEventListener('change', (event) => {
    tag = (event.target as HTMLSelectElement).value;
    queue = []; position = 0;
    renderDeck(); renderList();
  });
  const keys = (event: KeyboardEvent) => {
    if (!queue.length || position >= queue.length || (event.target as Element).closest('input, textarea, select')) return;
    if (!revealed && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); reveal(); }
    else if (revealed && event.key === '1') grade(false);
    else if (revealed && event.key === '2') grade(true);
  };
  document.addEventListener('keydown', keys);
  renderDeck();
  renderList();
  void INTERVALS; void $$;
  const unsubscribe = onProgressChange(() => { renderList(); if (!queue.length || position >= queue.length) renderDeck(); });
  return () => { document.removeEventListener('keydown', keys); unsubscribe(); };
};
export default cards;
