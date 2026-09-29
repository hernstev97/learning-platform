// One interview card with its rating buttons; shared by the interview training and review rounds.
import { GRADES } from '../../convex/model.ts';
import type { Card } from '../content/types.ts';
import { GRADE_LABELS, nextReview } from '../engine/review.ts';
import type { CardState } from '../engine/storage.ts';
import { LEVELS, html, raw } from './dom.ts';

export const mastery = (state: CardState | undefined) => state ? `Box ${state.box}${state.lapses ? ` · ${state.lapses}× vergessen` : ''}` : 'Neu';

/** `position` is shown top left, e.g. "Karte 2 / 8". Buttons: #show, then one per grade (#again … #easy). */
export const flashcard = (card: Card, state: CardState | undefined, revealed: boolean, position: string) => html`
  <div class="flashcard ${revealed ? 'revealed' : ''}">
    <div class="flashcard-meta label"><span>${position}</span><span>${mastery(state)} · ${LEVELS[card.level]}${card.tags.length ? ` · ${card.tags.join(', ')}` : ''}</span></div>
    <div class="flashcard-question prose">${raw(card.question)}</div>
    ${revealed ? html`<div class="flashcard-answer prose compact">${raw(card.answer)}</div>
      <div class="grade-row grades" role="group" aria-label="Wie gut wusstest du die Antwort?">${GRADES.map((g, i) => html`<button type="button" class="btn big${g === 'good' ? ' primary' : ''}" id="${g}" data-grade="${g}"><kbd>${i + 1}</kbd> ${GRADE_LABELS[g]}<span class="grade-next">${nextReview(state, g)}</span></button>`)}</div>`
      : html`<div class="grade-row"><button type="button" class="btn primary big" id="show"><kbd>Leertaste</kbd> Antwort zeigen</button></div>`}
  </div>`;
