import { loadArea, onProgressChange, progressOf, reviewCard, summaryOf } from '../app.ts';
import type { Card } from '../content/types.ts';
import { GRADES, type Grade } from '../../convex/model.ts';
import { byWeakness } from '../engine/review.ts';
import { localDay } from '../engine/storage.ts';
import { areaBanner } from '../ui/area-nav.ts';
import { $, $$, html, raw } from '../ui/dom.ts';
import { flashcard, mastery } from '../ui/flashcard.ts';
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
  /** Cards rated „Vergessen“ at least once this round; they come back until rated otherwise. */
  let forgotten = new Set<string>();

  const pool = () => area.cards.filter((c) => !tag || c.tags.includes(tag));
  const due = () => pool().filter((c) => progress.cards[c.id] && progress.cards[c.id].due <= today);
  const fresh = () => pool().filter((c) => !progress.cards[c.id]);
  const boxes = () => [1, 2, 3, 4, 5].map((box) => pool().filter((c) => progress.cards[c.id]?.box === box).length);

  main.innerHTML = html`
    ${areaBanner(summary, progress, 'karten', 'Interview-Training')}
    <div class="page cards-page">
      <p class="page-intro">Karteikarten mit echten Interviewfragen. Beantworte jede Frage erst laut oder schriftlich, dann deck die Antwort auf und bewerte dich ehrlich. <strong>Okay</strong> schiebt die Karte eine Box weiter, <strong>Leicht</strong> zwei, <strong>Schwer</strong> lässt sie in ihrer Box, <strong>Vergessen</strong> holt sie zurück in Box 1 und noch in dieser Runde wieder. Box 1 bis 5 kommen nach 1, 3, 7, 16 und 35 Tagen wieder (Leitner-System). Die schwächsten fälligen Karten kommen zuerst.</p>
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
    // Before the first review every box is empty; the chart would only be blank space.
    const seen = b.some((count) => count > 0);
    return html`<div class="deck-stats${seen ? '' : ' empty'}">
      <div class="deck-counts"><div><span class="big-number">${due().length}</span><span class="label">fällig</span></div><div><span class="big-number">${fresh().length}</span><span class="label">neu</span></div><div><span class="big-number">${b[2] + b[3] + b[4]}</span><span class="label">sitzen (Box 3+)</span></div></div>
      ${seen ? html`<div class="boxes" aria-label="Verteilung auf die Boxen">${b.map((count, i) => html`<div class="box-col"><span class="box-bar" style="height:${Math.round(count / max * 100)}%"></span><span class="label">Box ${i + 1}</span><span class="label muted">${count}</span></div>`)}</div>` : ''}
    </div>`;
  };
  const renderDeck = () => {
    const deck = $('#deck', main);
    if (!queue.length || position >= queue.length) {
      const done = queue.length > 0;
      const round = new Set(queue.map((c) => c.id)).size;
      const available = due().length + Math.min(fresh().length, NEW_PER_SESSION);
      deck.innerHTML = html`${renderStats()}
        <div class="deck-start">
          ${done ? html`<p class="deck-done"><strong>Runde fertig.</strong> ${round - forgotten.size} von ${round} auf Anhieb gewusst.</p>` : ''}
          ${available ? html`<button type="button" class="btn primary big" id="start">${done ? 'Nächste Runde' : 'Training starten'} · ${available}&nbsp;Karten</button><p class="muted small">${due().length} fällige Wiederholungen und bis zu ${NEW_PER_SESSION} neue Karten.</p>`
            : html`<p><strong>Für heute ist alles wiederholt.</strong> Morgen sind wieder Karten fällig. Du kannst unten jederzeit alle Fragen durchgehen.</p><button type="button" class="btn" id="extra">Trotzdem üben (schwächste Karten zuerst)</button>`}
        </div>`.value;
      main.querySelector('#start')?.addEventListener('click', () => startSession(false));
      main.querySelector('#extra')?.addEventListener('click', () => startSession(true));
      return;
    }
    const card = queue[position];
    const state = progress.cards[card.id];
    deck.innerHTML = flashcard(card, state, revealed, `Karte ${position + 1} / ${queue.length}`).value;
    main.querySelector('#show')?.addEventListener('click', reveal);
    deck.querySelectorAll<HTMLButtonElement>('[data-grade]').forEach((button) => button.addEventListener('click', () => grade(button.dataset.grade as Grade)));
    (deck.querySelector<HTMLButtonElement>('#good') ?? deck.querySelector<HTMLButtonElement>('button'))?.focus({ preventScroll: true });
  };
  const reveal = () => { revealed = true; renderDeck(); };
  const grade = (rating: Grade) => {
    const card = queue[position];
    reviewCard(summary.id, card.id, rating);
    if (rating === 'again') { queue.push(card); forgotten.add(card.id); }
    position++;
    revealed = false;
    renderDeck();
    renderList();
  };
  const startSession = (extra: boolean) => {
    const shuffle = <T,>(items: T[]) => items.map((item) => [Math.random(), item] as const).sort((a, b) => a[0] - b[0]).map(([, item]) => item);
    // Shuffled first, so cards of equal weakness still come in a new order each round.
    const weakest = (items: Card[]) => shuffle(items).sort((a, b) => byWeakness(progress.cards[a.id], progress.cards[b.id]));
    queue = extra ? weakest(pool().filter((c) => progress.cards[c.id])).slice(0, 15) : [...weakest(due()), ...fresh().slice(0, NEW_PER_SESSION)];
    position = 0; revealed = false; forgotten = new Set();
    renderDeck();
  };
  const renderList = () => {
    const list = $('#all-cards', main);
    // A progress update must not close answers that are being read (or the one a search result opened).
    const open = new Set($$<HTMLDetailsElement>('.card-item[open]', list).map((item) => item.id));
    list.innerHTML = pool().map((card) => {
      const state = progress.cards[card.id];
      return html`<details class="card-item" id="karte-${card.id}" ${open.has(`karte-${card.id}`) ? 'open' : ''}><summary><span class="card-q">${raw(card.question.replace(/<\/?p>/g, ''))}</span><span class="tag">${mastery(state)}</span></summary><div class="prose compact">${raw(card.answer)}</div></details>`.value;
    }).join('');
  };
  $<HTMLSelectElement>('#tag', main).addEventListener('change', (event) => {
    tag = (event.target as HTMLSelectElement).value;
    queue = []; position = 0;
    renderDeck(); renderList();
  });
  const keys = (event: KeyboardEvent) => {
    if (!queue.length || position >= queue.length || (event.target as Element).closest('input, textarea, select, dialog')) return;
    if (!revealed && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); reveal(); }
    else if (revealed && /^[1-4]$/.test(event.key)) grade(GRADES[Number(event.key) - 1]);
  };
  document.addEventListener('keydown', keys);
  renderDeck();
  renderList();
  const unsubscribe = onProgressChange(() => { renderList(); if (!queue.length || position >= queue.length) renderDeck(); });
  return () => { document.removeEventListener('keydown', keys); unsubscribe(); };
};
export default cards;
