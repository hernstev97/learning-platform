// A review round for one topic: weak exercises again from scratch, refresher exercises, due cards, then what changed.
// The items are fixed when the round starts; progress updates never rebuild it (only the final summary refreshes).
import { loadArea, onProgressChange, progressOf, recordDrill, reviewCard, setEntry, summaryOf } from '../app.ts';
import { GRADES, type DrillEvent, type Grade } from '../../convex/model.ts';
import { refreshInterval, refreshTopic } from '../engine/drill.ts';
import { GRADE_LABELS } from '../engine/review.ts';
import { daysBetween, isDone, localDay, type TopicState } from '../engine/storage.ts';
import { analyzeTopic, dailyPlan, drillDue, planRound, roundMinutes, type ReviewItem } from '../engine/weakness.ts';
import type { Page } from '../router.ts';
import { $, html, icons, pad, plural, raw } from '../ui/dom.ts';
import { exerciseView, type ExerciseHandle } from '../ui/exercise-view.ts';
import { flashcard } from '../ui/flashcard.ts';
import { allReports, inDays, planText, reasonList, roundHref, topicLabel } from '../ui/review.ts';

type ExerciseResult = 'clean' | 'trouble' | 'revealed' | 'unsolved' | 'skipped';
type Outcome = { kind: 'exercise'; result: ExerciseResult } | { kind: 'card'; grade: Grade };
const RESULT_LABELS: Record<ExerciseResult, string> = { clean: 'Ohne Hilfe gelöst', trouble: 'Mit Fehlversuchen oder Hinweisen gelöst', revealed: 'Lösung angesehen', unsolved: 'Nicht gelöst', skipped: 'Übersprungen' };
const REASON_LABELS: Record<ReviewItem['reason'], string> = { weak: 'Auf der Liste', refresh: 'Auffrischung', practice: 'Freiwillig', due: 'Fällig' };

const reviewRound: Page<{ name: 'review-round'; area: string; topic: string }> = async (main, route) => {
  const summary = summaryOf(route.area)!;
  const topic = summary.topics.find((t) => t.id === route.topic);
  if (!topic) return (await import('./not-found.ts')).default(main, { name: 'not-found' });
  const area = await loadArea(summary.id);
  const progress = progressOf(summary.id);
  const today = localDay();
  const report = analyzeTopic(summary, topic, progress, today);
  const module = topic.module ? area.modules[topic.module] : undefined;
  document.title = `Wiederholen: ${topic.title} · ${summary.title}`;

  let items: ReviewItem[] = report.plan;
  const outcomes: (Outcome | undefined)[] = [];
  let position = 0;
  let cardRevealed = false;
  let view: ExerciseHandle | undefined;
  let refreshed: TopicState | undefined;

  main.innerHTML = html`
    <div class="player review-player" style="--area:${summary.color}">
      <header class="player-head">
        <nav class="crumbs" aria-label="Brotkrumen"><a href="/${summary.id}">${summary.title}</a><span aria-hidden="true">/</span><a href="/${summary.id}/wiederholen">Wiederholen</a></nav>
        <ol class="steps round-steps" id="round-steps" aria-label="Fortschritt der Runde"></ol>
      </header>
      <section class="round-intro">
        <p class="label">${topicLabel(summary, report)}</p>
        <h1 class="round-title" tabindex="-1">${topic.title}</h1>
        ${report.reasons.length ? html`<div class="round-why"><p class="label">Warum dieses Thema</p>${reasonList(report, 7)}</div>` : ''}
      </section>
      <div id="round"></div>
    </div>`.value;
  const roundEl = $('#round', main);

  const stepClass = (outcome: Outcome | undefined) => !outcome ? '' : outcome.kind === 'card' ? outcome.grade === 'again' || outcome.grade === 'hard' ? ' trouble' : ' done'
    : outcome.result === 'clean' ? ' done' : outcome.result === 'skipped' ? ' skipped' : ' trouble';
  const renderSteps = () => {
    $('#round-steps', main).innerHTML = items.map((item, i) => html`<li class="step${i === position ? ' active' : ''}${stepClass(outcomes[i])}" ${i === position ? html`aria-current="step"` : ''}><span>${i + 1}</span><span class="sr-only">: ${item.kind === 'card' ? 'Karte' : 'Übung'}</span></li>`).join('');
  };
  // The next item starts at the top of the round, below the topic's reasons.
  const focusItem = () => {
    roundEl.scrollIntoView({ block: 'start' });
    roundEl.querySelector<HTMLElement>('h2, #show')?.focus({ preventScroll: true });
  };

  /** Once every exercise of a stale module's round is through, a clean round lengthens the next refresher interval. */
  const maybeRefresh = () => {
    if (refreshed || !topic.module || !report.stale || items.some((item, i) => item.kind === 'exercise' && !outcomes[i])) return;
    const tried = outcomes.filter((o): o is Extract<Outcome, { kind: 'exercise' }> => o?.kind === 'exercise' && o.result !== 'skipped');
    if (!tried.length) return;
    refreshed = refreshTopic(progress.topics[topic.module], tried.every((o) => o.result === 'clean'), today);
    setEntry(summary.id, { kind: 'topic', id: topic.module, value: refreshed });
  };
  const advance = () => {
    view?.cleanup(); view = undefined;
    position++;
    cardRevealed = false;
    maybeRefresh();
    render();
    focusItem();
  };

  function renderExercise(item: Extract<ReviewItem, { kind: 'exercise' }>) {
    const exerciseModule = area.modules[item.module];
    const exercise = exerciseModule?.exercises.find((e) => e.id === item.id);
    if (!exercise) { outcomes[position] = { kind: 'exercise', result: 'skipped' }; advance(); return; }
    const attempt = { fails: 0, hints: 0, revealed: false, solved: false };
    const record = (event: DrillEvent) => recordDrill(summary.id, exercise.id, event, true);
    const { markup, mount } = exerciseView(exercise, {
      areaId: summary.id,
      draft: undefined,
      done: false,
      save() { /* A review starts fresh and leaves the saved draft of the learning path alone. */ },
      solved() {
        attempt.solved = true;
        record('solve');
        // A review can also finish an exercise that was never solved on the learning path.
        if (!isDone(progress, exercise)) {
          progress.done[exercise.id] = { at: new Date().toISOString(), fp: exercise.fingerprint, ...(attempt.revealed || progress.revealed[exercise.id] ? { help: true } : {}) };
          setEntry(summary.id, { kind: 'completion', id: exercise.id, value: progress.done[exercise.id] });
        }
        $('#skip', roundEl).hidden = true;
        $('#continue', roundEl).hidden = false;
      },
      // After solving, comparing with the solution or a hint is no longer trouble.
      fail() { if (attempt.solved) return; attempt.fails++; record('fail'); },
      hint() { if (attempt.solved) return; attempt.hints++; record('hint'); },
      reveal() { if (attempt.solved) return; attempt.revealed = true; record('reveal'); },
    }, {
      heading: 'h2',
      counter: `Übung ${pad(item.number)} im Modul`,
      lesson: { href: `/${summary.id}/${item.module}`, title: exerciseModule.title },
      files: area.files,
      intro: item.reason === 'weak' ? 'Von vorn, ohne deinen alten Entwurf. Versuch es diesmal ohne Hinweise.' : 'Aus dem Kopf, ohne Hinweise – so zeigt sich, ob das Thema noch sitzt.',
      footer: html`<nav class="player-nav round-nav" aria-label="Runde"><button type="button" class="btn ghost" id="skip">Überspringen</button><button type="button" class="btn primary" id="continue" hidden>Weiter ${raw(icons.arrow)}</button></nav>`,
    });
    roundEl.innerHTML = html`<p class="round-item-why"><span class="tag ink">${REASON_LABELS[item.reason]}</span> ${item.why}</p>${markup}`.value;
    view = mount(roundEl);
    const finish = () => {
      const result: ExerciseResult = attempt.revealed ? 'revealed' : attempt.solved ? attempt.fails || attempt.hints ? 'trouble' : 'clean' : attempt.fails || attempt.hints ? 'unsolved' : 'skipped';
      outcomes[position] = { kind: 'exercise', result };
      advance();
    };
    $('#skip', roundEl).addEventListener('click', finish);
    $('#continue', roundEl).addEventListener('click', finish);
  }

  function renderCard(item: Extract<ReviewItem, { kind: 'card' }>) {
    const card = area.cards.find((c) => c.id === item.id);
    if (!card) { outcomes[position] = { kind: 'card', grade: 'good' }; advance(); return; }
    roundEl.innerHTML = html`<p class="round-item-why"><span class="tag ink">Interviewkarte</span> ${item.why}</p>${flashcard(card, progress.cards[card.id], cardRevealed, `${position + 1} / ${items.length}`)}`.value;
    roundEl.querySelector('#show')?.addEventListener('click', () => { cardRevealed = true; render(); roundEl.querySelector<HTMLElement>('#good')?.focus({ preventScroll: true }); });
    roundEl.querySelectorAll<HTMLButtonElement>('[data-grade]').forEach((button) => button.addEventListener('click', () => grade(button.dataset.grade as Grade)));
  }
  function grade(rating: Grade) {
    const item = items[position];
    if (item?.kind !== 'card' || !cardRevealed) return;
    reviewCard(summary.id, item.id, rating);
    outcomes[position] = { kind: 'card', grade: rating };
    // Like the interview training: a forgotten card comes back in the same round until it is rated otherwise.
    if (rating === 'again') items = [...items, { ...item, why: 'Noch einmal – in dieser Runde vergessen' }];
    advance();
  }

  function renderEmpty() {
    const practice = planRound(report, true);
    const next = report.next ? daysBetween(today, report.next) : null;
    roundEl.innerHTML = html`<section class="round-empty">
      <p>${report.started ? html`Für dieses Thema ist gerade nichts fällig.${next !== null ? ` Die nächste Wiederholung ist ${inDays(next)}.` : ''}` : 'Hier hast du noch nichts geübt, also gibt es noch nichts zu wiederholen.'}</p>
      <div class="session-actions">
        ${practice.length ? html`<button type="button" class="btn primary" id="practice">Trotzdem üben · ${planText(practice, roundMinutes(practice))}</button>` : ''}
        ${module ? html`<a class="btn${practice.length ? '' : ' primary'}" href="/${summary.id}/${module.id}">Zur Lektion</a>` : html`<a class="btn" href="/${summary.id}/karten">Zum Interview-Training</a>`}
        <a class="btn ghost" href="/${summary.id}/wiederholen">Zur Übersicht</a>
      </div>
    </section>`.value;
    roundEl.querySelector('#practice')?.addEventListener('click', () => { items = practice; render(); focusItem(); });
  }

  function renderSummary() {
    maybeRefresh();
    const exercises = items.map((item, i) => [item, outcomes[i]] as const).filter(([item]) => item.kind === 'exercise');
    const clean = exercises.filter(([, o]) => o?.kind === 'exercise' && o.result === 'clean').length;
    // Cards: the first rating in this round counts; repeats of a forgotten card only show the final state.
    const firstGrades = new Map<string, Grade>();
    items.forEach((item, i) => { const o = outcomes[i]; if (item.kind === 'card' && o?.kind === 'card' && !firstGrades.has(item.id)) firstGrades.set(item.id, o.grade); });
    const known = [...firstGrades.values()].filter((g) => g === 'good' || g === 'easy').length;
    const headline = [exercises.length ? `${clean} von ${plural(exercises.length, 'Übung', 'Übungen')} ohne Hilfe` : '', firstGrades.size ? `${known} von ${plural(firstGrades.size, 'Karte', 'Karten')} gewusst` : ''].filter(Boolean).join(' · ');
    const trouble = clean < exercises.length || known < firstGrades.size;
    const exerciseRow = (item: Extract<ReviewItem, { kind: 'exercise' }>, outcome: Outcome | undefined) => {
      const exercise = area.modules[item.module]?.exercises.find((e) => e.id === item.id);
      const result = outcome?.kind === 'exercise' ? outcome.result : 'skipped';
      const drill = progress.drills[item.id];
      const due = drill ? drillDue(drill) : null;
      const effect = !due ? result === 'clean' ? item.reason === 'weak' ? 'Von der Liste – sitzt wieder' : 'Sitzt' : 'Bleibt, wie es war'
        : due <= today ? 'Bleibt fällig'
        : `${drill!.box && !drill!.open ? `Stufe ${drill!.box} · ` : ''}wieder ${inDays(daysBetween(today, due))}`;
      return html`<li class="round-result ${result === 'clean' ? 'ok' : result === 'skipped' ? '' : 'bad'}"><span class="round-result-mark" aria-hidden="true">${raw(result === 'clean' ? icons.check : result === 'skipped' ? '–' : icons.cross)}</span><span><a href="/${summary.id}/${item.module}/${item.number}">${exercise?.title ?? item.id}</a><span class="label">${RESULT_LABELS[result]} · ${effect}</span></span></li>`;
    };
    const cardRow = (id: string) => {
      const card = area.cards.find((c) => c.id === id);
      const grades = items.map((item, i) => item.kind === 'card' && item.id === id && outcomes[i]?.kind === 'card' ? GRADE_LABELS[(outcomes[i] as { grade: Grade }).grade] : null).filter(Boolean).join(' → ');
      const state = progress.cards[id];
      const first = firstGrades.get(id)!;
      return html`<li class="round-result ${first === 'good' || first === 'easy' ? 'ok' : 'bad'}"><span class="round-result-mark" aria-hidden="true">${raw(first === 'good' || first === 'easy' ? icons.check : icons.cross)}</span><span><a href="/${summary.id}/karten#karte-${id}">${raw(card?.question.replace(/<\/?p>/g, '') ?? id)}</a><span class="label">${grades}${state ? ` · Box ${state.box} · wieder ${inDays(daysBetween(today, state.due))}` : ''}</span></span></li>`;
    };
    const reports = allReports(today);
    const plan = dailyPlan(reports);
    const nextTopic = [...plan.today, ...plan.later].find((r) => r.area !== summary.id || r.topic.id !== topic!.id);
    roundEl.innerHTML = html`<section class="round-done" aria-labelledby="done-title">
      <p class="label">Runde fertig</p>
      <h2 id="done-title" class="section-title" tabindex="-1">${headline || 'Nichts bearbeitet'}</h2>
      <ol class="round-results">
        ${exercises.map(([item, outcome]) => exerciseRow(item as Extract<ReviewItem, { kind: 'exercise' }>, outcome))}
        ${[...firstGrades.keys()].map(cardRow)}
      </ol>
      ${refreshed ? html`<p class="round-refresh">${refreshed.reps ? `Auffrischung ohne Hilfe. Die nächste für „${module!.title}“ ist in ${plural(refreshInterval(refreshed.reps), 'Tag', 'Tagen')} fällig.` : `Die Auffrischung hatte Fehler. Die betroffenen Übungen kommen bald wieder, und die nächste Auffrischung kommt wieder nach ${plural(refreshInterval(0), 'Tag', 'Tagen')}.`}</p>` : ''}
      <div class="session-actions">
        ${nextTopic ? html`<a class="btn primary" href="${roundHref(nextTopic)}">Nächstes Thema: ${nextTopic.topic.title} ${raw(icons.arrow)}</a>` : ''}
        <a class="btn${nextTopic ? '' : ' primary'}" href="/${summary.id}/wiederholen">Zur Übersicht</a>
        ${module && trouble ? html`<a class="btn ghost" href="/${summary.id}/${module.id}">Lektion „${module.title}“ nachlesen</a>` : ''}
      </div>
    </section>`.value;
  }

  function render() {
    renderSteps();
    if (!items.length) { renderEmpty(); return; }
    if (position >= items.length) { renderSummary(); return; }
    const item = items[position];
    if (item.kind === 'exercise') renderExercise(item); else renderCard(item);
  }

  const keys = (event: KeyboardEvent) => {
    const item = items[position];
    if (item?.kind !== 'card' || (event.target as Element).closest('input, textarea, select, dialog')) return;
    if (!cardRevealed && (event.key === ' ' || event.key === 'Enter') && !(event.target as Element).closest('a, button:not(#show)')) { event.preventDefault(); cardRevealed = true; render(); roundEl.querySelector<HTMLElement>('#good')?.focus({ preventScroll: true }); }
    else if (cardRevealed && /^[1-4]$/.test(event.key)) grade(GRADES[Number(event.key) - 1]);
  };
  document.addEventListener('keydown', keys);
  render();
  // Confirmed states (for example the next due day) only change the summary; a running item is never rebuilt.
  const stop = onProgressChange((draft) => { if (!draft && items.length && position >= items.length) renderSummary(); });
  return () => { document.removeEventListener('keydown', keys); stop(); view?.cleanup(); };
};
export default reviewRound;
