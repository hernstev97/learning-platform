// One exercise with task, answer area, feedback, hints, solution and explanation. Shared by the learning path
// (pages/exercise.ts, with navigation and saved drafts) and review rounds (pages/review-session.ts, always fresh).
import type { Exercise } from '../content/types.ts';
import { highlight } from '../engine/highlight.ts';
import { bug, code, explain, order, practice } from '../exercises/advanced.ts';
import { choice, command, gap, output } from '../exercises/basic.ts';
import type { ExerciseRenderer, Feedback } from '../exercises/types.ts';
import { $, TYPE_LABELS, TYPE_VERBS, escape, html, icons, raw, type Raw } from './dom.ts';

const RENDERERS: Record<Exercise['type'], ExerciseRenderer<any, any>> = { gap, choice, order, output, command, code, practice, bug, explain };

export type ExerciseHooks = {
  areaId: string;
  draft: unknown;
  /** Solved before; the view then opens as solved. */
  done: boolean;
  save(draft: unknown): void;
  /** Solved in this view, called once. */
  solved(): void;
  fail(): void;
  hint(): void;
  /** The solution was opened. */
  reveal(): void;
  /** After every change of the solved state, e.g. to update navigation. */
  changed?(): void;
};
export type ExerciseLayout = {
  heading: 'h1' | 'h2';
  /** Shown in the kicker, e.g. "Übung 03 / 12". */
  counter: string;
  lesson: { href: string; title: string };
  /** Original files for the source dialog (Bear). */
  files: Record<string, string>;
  /** Placed between solution and background reading, e.g. navigation. */
  footer?: Raw;
  /** First feedback line while unsolved. */
  intro: string;
};
export type ExerciseHandle = { solved(): boolean; setSolved(solved: boolean, message: string): void; feedback(kind: Feedback, message: string): void; cleanup(): void };

export function exerciseView(exercise: Exercise, hooks: ExerciseHooks, layout: ExerciseLayout): { markup: Raw; mount(root: HTMLElement): ExerciseHandle } {
  let solvedNow = hooks.done;
  let root: HTMLElement;
  const feedbackBox = () => root.querySelector<HTMLElement>('#feedback');
  const setFeedback = (kind: Feedback, message: string) => {
    const box = feedbackBox();
    if (!box) return;
    if (solvedNow && kind !== 'ok') { box.className = 'feedback ok'; box.innerHTML = `${icons.check}<span><strong>Gelöst.</strong> ${escape(message)}</span>`; return; }
    box.className = `feedback ${kind}`;
    box.innerHTML = `${kind === 'ok' ? icons.check : kind === 'bad' ? icons.cross : ''}<span>${escape(message)}</span>`;
  };
  const showExplanation = () => { if (!view.ownsExplanation) $('#explanation', root).hidden = false; };
  const context = {
    draft: hooks.draft as any,
    done: hooks.done,
    areaId: hooks.areaId,
    save: hooks.save,
    feedback: setFeedback,
    fail: hooks.fail,
    hint: hooks.hint,
    complete() {
      const first = !solvedNow;
      solvedNow = true;
      if (first) hooks.solved();
      const box = feedbackBox()!;
      box.className = 'feedback ok';
      box.innerHTML = `${icons.check}<span><strong>Richtig.</strong> ${first ? 'Sehr gut – lies die Erklärung, bevor du weitergehst.' : 'Diese Übung ist gelöst.'}</span>`;
      showExplanation();
      hooks.changed?.();
    },
  };
  const view = RENDERERS[exercise.type](exercise as never, context);
  const hints = exercise.hints;
  const source = exercise.source;
  const heading = raw(layout.heading);
  const markup = html`
    <article class="exercise" aria-labelledby="exercise-title">
      <p class="exercise-kicker"><span class="tag ink">${TYPE_VERBS[exercise.type]}</span>${TYPE_LABELS[exercise.type] !== TYPE_VERBS[exercise.type] ? html`<span class="tag">${TYPE_LABELS[exercise.type]}</span>` : ''}<span class="label muted">${layout.counter}</span></p>
      <${heading} id="exercise-title" class="exercise-title" tabindex="-1">${exercise.title}</${heading}>
      <div class="prose prompt">${raw(exercise.prompt)}</div>
      ${source ? html`<p class="source-ref"><button type="button" class="link-button" id="open-source">${source.file.replace(/^android\/app\/src\/(main|test)\/java\/app\/kiumu\/bear\//, '')}:${source.start}${source.end !== source.start ? `–${source.end}` : ''}</button> <span class="muted small">Originaldatei aus Bear (enthält die Lösung)</span></p>` : ''}
      ${exercise.resources.length ? html`<nav class="doc-links" aria-label="Offizielle Dokumentation zur Übung"><span class="label">Doku</span>${exercise.resources.map((r) => html`<a class="external-link" href="${r.url}" target="_blank" rel="noopener noreferrer">${r.title}</a>`)}</nav>` : ''}
      <div class="exercise-body">${raw(view.markup)}</div>
      <div id="feedback" class="feedback info" role="status" aria-live="polite" aria-atomic="true"></div>
      <section id="explanation" class="explanation" ${solvedNow && !view.ownsExplanation ? '' : 'hidden'} aria-label="Erklärung">
        <p class="label">Warum</p>
        <div class="prose compact">${raw(exercise.explanation)}</div>
      </section>
      <div class="help-row">
        ${hints.length ? html`<div class="hints"><button type="button" class="btn small" id="hint">Hinweis 1 / ${hints.length}</button><ol id="hint-list" class="hint-list"></ol></div>` : ''}
        ${exercise.type !== 'explain' ? html`<button type="button" class="btn small ghost" id="reveal">Lösung zeigen</button>` : ''}
      </div>
      <section id="solution" class="solution" hidden aria-label="Lösung"><p class="label">Lösung</p><div class="prose compact">${raw(view.solution())}</div><p class="muted small">Tipp: Schließ die Lösung wieder und schreib sie aus dem Kopf – erst dann zählt die Übung als gelöst.</p></section>
      ${layout.footer ?? ''}
      <details class="wiki" id="wiki">
        <summary><span class="label">Zum Nachlesen</span><span>${exercise.wiki?.title ?? 'Die Lektion zu diesem Modul'}</span></summary>
        <div class="prose compact">${exercise.wiki ? raw(exercise.wiki.body) : html`<p>Die Grundlagen stehen in der <a href="${layout.lesson.href}">Lektion „${layout.lesson.title}“</a>.</p>`}</div>
      </details>
    </article>
    ${source ? html`<dialog id="source-dialog" class="source-dialog" aria-labelledby="source-title"><header><div><h2 id="source-title">${source.file.split('/').pop()}</h2><p class="muted small">${source.file} · Bear ${source.revision.slice(0, 7)} · Zeilen ${source.start}–${source.end}</p></div><button type="button" class="btn small" id="close-source">Schließen</button></header><pre class="code source-code" tabindex="0"><code id="source-code"></code></pre></dialog>` : ''}`;

  function mount(element: HTMLElement): ExerciseHandle {
    root = element;
    const cleanups: ((() => void) | void)[] = [view.bind($('.exercise-body', root))];
    if (solvedNow) context.complete(); else if (!feedbackBox()!.textContent) setFeedback('info', layout.intro);
    let shown = 0;
    let revealed = false;
    root.querySelector('#hint')?.addEventListener('click', (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      if (shown >= hints.length) return;
      $('#hint-list', root).insertAdjacentHTML('beforeend', `<li>${hints[shown]}</li>`);
      shown++;
      button.textContent = shown < hints.length ? `Hinweis ${shown + 1} / ${hints.length}` : 'Alle Hinweise gezeigt';
      button.disabled = shown >= hints.length;
      hooks.hint();
    });
    root.querySelector('#reveal')?.addEventListener('click', (event) => {
      const panel = $('#solution', root);
      panel.hidden = !panel.hidden;
      (event.currentTarget as HTMLElement).textContent = panel.hidden ? 'Lösung zeigen' : 'Lösung ausblenden';
      if (panel.hidden) return;
      if (!revealed) hooks.reveal();
      revealed = true;
      showExplanation();
    });
    if (source) {
      const dialog = $<HTMLDialogElement>('#source-dialog', root);
      $('#open-source', root).addEventListener('click', () => {
        const text = layout.files[source.file] ?? '';
        $('#source-code', root).innerHTML = text.split('\n').map((line, i) => `<span class="source-line${i + 1 >= source.start && i + 1 <= source.end ? ' selected' : ''}" id="source-line-${i + 1}"><span class="line-number" aria-hidden="true">${i + 1}</span>${highlight(line, 'kotlin') || ' '}</span>`).join('');
        dialog.showModal();
        root.querySelector(`#source-line-${source.start}`)?.scrollIntoView({ block: 'center' });
      });
      $('#close-source', root).addEventListener('click', () => dialog.close());
    }
    return {
      solved: () => solvedNow,
      setSolved(solved, message) { solvedNow = solved; setFeedback(solved ? 'ok' : 'info', message); hooks.changed?.(); },
      feedback: setFeedback,
      cleanup: () => cleanups.forEach((fn) => fn && fn()),
    };
  }
  return { markup, mount };
}
