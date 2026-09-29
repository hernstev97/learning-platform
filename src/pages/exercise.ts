import { loadArea, onProgressChange, progressOf, saveAnswer, setEntry, summaryOf } from '../app.ts';
import type { Exercise } from '../content/types.ts';
import { highlight } from '../engine/highlight.ts';
import { isDone } from '../engine/storage.ts';
import { bug, code, explain, order, practice } from '../exercises/advanced.ts';
import { choice, command, gap, output } from '../exercises/basic.ts';
import type { ExerciseRenderer, ExerciseView, Feedback } from '../exercises/types.ts';
import { navigate } from '../router.ts';
import type { Page } from '../router.ts';
import { moduleNumber } from '../ui/area-nav.ts';
import { $, $$, TYPE_LABELS, TYPE_VERBS, escape, html, icons, pad, raw } from '../ui/dom.ts';

const RENDERERS: Record<Exercise['type'], ExerciseRenderer<any, any>> = { gap, choice, order, output, command, code, practice, bug, explain };

const exercisePage: Page<{ name: 'exercise'; area: string; module: string; index: number }> = async (main, route) => {
  const summary = summaryOf(route.area)!;
  const area = await loadArea(route.area);
  const module = area.modules[route.module];
  const exercise = module?.exercises[route.index - 1];
  if (!module || !exercise) return (await import('./not-found.ts')).default(main, { name: 'not-found' });
  const progress = progressOf(summary.id);
  const index = route.index - 1;
  const total = module.exercises.length;
  const base = `/${summary.id}/${module.id}`;
  document.title = `${exercise.title} · ${module.title}`;

  let solvedNow = isDone(progress, exercise);
  let view: ExerciseView;
  const feedbackBox = () => $('#feedback', main);
  const setFeedback = (kind: Feedback, message: string) => {
    if (!feedbackBox()) return;
    if (solvedNow && kind !== 'ok') { feedbackBox().className = 'feedback ok'; feedbackBox().innerHTML = `${icons.check}<span><strong>Gelöst.</strong> ${escape(message)}</span>`; return; }
    feedbackBox().className = `feedback ${kind}`;
    feedbackBox().innerHTML = `${kind === 'ok' ? icons.check : kind === 'bad' ? icons.cross : ''}<span>${escape(message)}</span>`;
  };
  const showExplanation = () => {
    const panel = $('#explanation', main);
    if (view.ownsExplanation) return;
    panel.hidden = false;
  };
  const updateNav = () => {
    const next = $<HTMLAnchorElement>('#next', main);
    next.classList.toggle('primary', solvedNow);
    const isLast = index === total - 1;
    next.innerHTML = `${isLast ? solvedNow ? 'Modul abschließen' : 'Überspringen' : solvedNow ? 'Nächste Übung' : 'Überspringen'} ${icons.arrow}`;
    $$('.step', main).forEach((step, i) => step.classList.toggle('done', isDone(progress, module.exercises[i])));
    const allDone = module.exercises.every((e) => isDone(progress, e));
    $('#module-done', main).hidden = !allDone;
  };
  const context = {
    draft: progress.drafts[exercise.id] as any,
    done: solvedNow,
    areaId: summary.id,
    save(draft: unknown) { saveAnswer(summary.id, exercise, draft); },
    feedback: setFeedback,
    complete() {
      if (!isDone(progress, exercise)) {
        progress.done[exercise.id] = { at: new Date().toISOString(), fp: exercise.fingerprint, ...(progress.revealed[exercise.id] ? { help: true } : {}) };
        setEntry(summary.id, { kind: 'completion', id: exercise.id, value: progress.done[exercise.id] });
      }
      const first = !solvedNow;
      solvedNow = true;
      feedbackBox().className = 'feedback ok';
      feedbackBox().innerHTML = `${icons.check}<span><strong>Richtig.</strong> ${first ? 'Sehr gut – lies die Erklärung, bevor du weitergehst.' : 'Diese Übung ist gelöst.'}</span>`;
      showExplanation();
      updateNav();
    },
  };
  view = RENDERERS[exercise.type](exercise as never, context);
  const hints = exercise.hints;
  const source = exercise.source;
  const nextModule = summary.modules[summary.modules.findIndex((m) => m.id === module.id) + 1];

  main.innerHTML = html`
    <div class="player" style="--area:${summary.color}">
      <header class="player-head">
        <nav class="crumbs" aria-label="Brotkrumen"><a href="/${summary.id}">${summary.title}</a><span aria-hidden="true">/</span><a href="${base}">${moduleNumber(summary, module.id)} ${module.title}</a></nav>
        <nav class="steps" aria-label="Übungen dieses Moduls – Pfeiltasten wechseln">
          ${module.exercises.map((e, i) => html`<a class="step${isDone(progress, e) ? ' done' : ''}${i === index ? ' active' : ''}" href="${base}/${i + 1}" ${i === index ? html`aria-current="step"` : ''} aria-label="Übung ${i + 1}: ${e.title} (${isDone(progress, e) ? 'gelöst' : 'offen'})" title="${i + 1}. ${e.title}"><span>${i + 1}</span></a>`)}
        </nav>
      </header>
      <article class="exercise" aria-labelledby="exercise-title">
        <p class="exercise-kicker"><span class="tag ink">${TYPE_VERBS[exercise.type]}</span>${TYPE_LABELS[exercise.type] !== TYPE_VERBS[exercise.type] ? html`<span class="tag">${TYPE_LABELS[exercise.type]}</span>` : ''}<span class="label muted">Übung ${pad(index + 1)} / ${pad(total)}</span></p>
        <h1 id="exercise-title" tabindex="-1">${exercise.title}</h1>
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
        <nav class="player-nav" aria-label="Übungsnavigation">
          ${index > 0 ? html`<a class="btn ghost" href="${base}/${index}">${raw(icons.back)} Zurück</a>` : html`<a class="btn ghost" href="${base}">${raw(icons.back)} Lektion</a>`}
          <a id="next" class="btn" href="${index < total - 1 ? `${base}/${index + 2}` : nextModule ? `/${summary.id}/${nextModule.id}` : `/${summary.id}`}"></a>
        </nav>
        <section id="module-done" class="module-done" hidden>
          <p class="label">Modul geschafft</p>
          <p>Alle ${total} Übungen in „${module.title}“ sind gelöst. ${nextModule ? `Weiter geht es mit „${nextModule.title}“.` : 'Das war das letzte Modul – Zeit für das Abschlussprojekt.'}</p>
          <a class="btn primary" href="${nextModule ? `/${summary.id}/${nextModule.id}` : `/${summary.id}/projekte`}">${nextModule ? 'Nächstes Modul' : 'Zu den Projekten'} ${raw(icons.arrow)}</a>
        </section>
        <details class="wiki" id="wiki">
          <summary><span class="label">Zum Nachlesen</span><span>${exercise.wiki?.title ?? 'Die Lektion zu diesem Modul'}</span></summary>
          <div class="prose compact">${exercise.wiki ? raw(exercise.wiki.body) : html`<p>Die Grundlagen stehen in der <a href="${base}">Lektion „${module.title}“</a>.</p>`}</div>
        </details>
      </article>
      ${source ? html`<dialog id="source-dialog" class="source-dialog" aria-labelledby="source-title"><header><div><h2 id="source-title">${source.file.split('/').pop()}</h2><p class="muted small">${source.file} · Bear ${source.revision.slice(0, 7)} · Zeilen ${source.start}–${source.end}</p></div><button type="button" class="btn small" id="close-source">Schließen</button></header><pre class="code source-code" tabindex="0"><code id="source-code"></code></pre></dialog>` : ''}
    </div>`.value;

  const cleanups: ((() => void) | void)[] = [];
  cleanups.push(view.bind($('.exercise-body', main)));
  if (solvedNow) context.complete(); else if (!feedbackBox().textContent) setFeedback('info', 'Los geht’s. Du kannst jederzeit überspringen und später zurückkommen.');
  updateNav();

  let shown = 0;
  main.querySelector('#hint')?.addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    if (shown >= hints.length) return;
    $('#hint-list', main).insertAdjacentHTML('beforeend', `<li>${hints[shown]}</li>`);
    shown++;
    button.textContent = shown < hints.length ? `Hinweis ${shown + 1} / ${hints.length}` : 'Alle Hinweise gezeigt';
    button.disabled = shown >= hints.length;
  });
  main.querySelector('#reveal')?.addEventListener('click', (event) => {
    const panel = $('#solution', main);
    panel.hidden = !panel.hidden;
    (event.currentTarget as HTMLElement).textContent = panel.hidden ? 'Lösung zeigen' : 'Lösung ausblenden';
    if (!panel.hidden && !isDone(progress, exercise)) { progress.revealed[exercise.id] = true; setEntry(summary.id, { kind: 'revealed', id: exercise.id, value: true }); }
    if (!panel.hidden) showExplanation();
  });
  if (source) {
    const dialog = $<HTMLDialogElement>('#source-dialog', main);
    $('#open-source', main).addEventListener('click', () => {
      const text = area.files[source.file] ?? '';
      $('#source-code', main).innerHTML = text.split('\n').map((line, i) => `<span class="source-line${i + 1 >= source.start && i + 1 <= source.end ? ' selected' : ''}" id="source-line-${i + 1}"><span class="line-number" aria-hidden="true">${i + 1}</span>${highlight(line, 'kotlin') || ' '}</span>`).join('');
      dialog.showModal();
      main.querySelector(`#source-line-${source.start}`)?.scrollIntoView({ block: 'center' });
    });
    $('#close-source', main).addEventListener('click', () => dialog.close());
  }
  // Arrow keys move between exercises when focus is on the step bar.
  $('.steps', main).addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    const target = key === 'ArrowRight' ? index + 1 : key === 'ArrowLeft' ? index - 1 : key === 'Home' ? 0 : key === 'End' ? total - 1 : -1;
    if (target < 0 || target >= total || target === index) return;
    event.preventDefault();
    navigate(`${base}/${target + 1}`);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.step.active')?.focus());
  });
  cleanups.push(onProgressChange((draft) => {
    if (draft && !main.querySelector('#refresh-draft')) {
      const button = document.createElement('button');
      button.id = 'refresh-draft'; button.className = 'btn small';
      button.textContent = 'Geänderter Entwurf verfügbar · Laden';
      button.addEventListener('click', () => navigate(location.pathname, { replace: true, keepScroll: true }));
      feedbackBox().after(button);
    }
    const nextSolved = isDone(progress, exercise);
    if (nextSolved !== solvedNow) {
      solvedNow = nextSolved;
      setFeedback(solvedNow ? 'ok' : 'info', solvedNow ? 'Auf einem Gerät gelöst und synchronisiert.' : 'Der gespeicherte Erfolg wurde zurückgesetzt.');
      updateNav();
    }
  }));
  return () => cleanups.forEach((fn) => fn && fn());
};
export default exercisePage;
