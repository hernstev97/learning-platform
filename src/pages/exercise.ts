import { loadArea, onProgressChange, progressOf, recordDrill, saveAnswer, setEntry, summaryOf } from '../app.ts';
import type { DrillEvent } from '../../convex/model.ts';
import { isDone } from '../engine/storage.ts';
import { navigate } from '../router.ts';
import type { Page } from '../router.ts';
import { moduleNumber } from '../ui/area-nav.ts';
import { $, $$, html, icons, pad, raw } from '../ui/dom.ts';
import { exerciseView } from '../ui/exercise-view.ts';

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
  const nextModule = summary.modules[summary.modules.findIndex((m) => m.id === module.id) + 1];

  // Help and wrong attempts count only until the exercise is solved; afterwards it is practice without consequences.
  const track = (event: DrillEvent) => { if (!isDone(progress, exercise)) recordDrill(summary.id, exercise.id, event, false); };
  // Reopening hints already needed on an earlier visit is not new trouble; only needing more of them is.
  let hintsThisVisit = 0;
  const updateNav = () => {
    const solved = isDone(progress, exercise);
    const next = $<HTMLAnchorElement>('#next', main);
    next.classList.toggle('primary', solved);
    const isLast = index === total - 1;
    next.innerHTML = `${isLast ? solved ? 'Modul abschließen' : 'Überspringen' : solved ? 'Nächste Übung' : 'Überspringen'} ${icons.arrow}`;
    $$('.step', main).forEach((step, i) => step.classList.toggle('done', isDone(progress, module.exercises[i])));
    const allDone = module.exercises.every((e) => isDone(progress, e));
    $('#module-done', main).hidden = !allDone;
  };
  const { markup, mount } = exerciseView(exercise, {
    areaId: summary.id,
    draft: progress.drafts[exercise.id],
    done: isDone(progress, exercise),
    save(draft) { saveAnswer(summary.id, exercise, draft); },
    solved() {
      // The event goes first, so a solution shown before events were recorded still counts once (see drillBase).
      recordDrill(summary.id, exercise.id, 'solve', false);
      if (!isDone(progress, exercise)) {
        progress.done[exercise.id] = { at: new Date().toISOString(), fp: exercise.fingerprint, ...(progress.revealed[exercise.id] ? { help: true } : {}) };
        setEntry(summary.id, { kind: 'completion', id: exercise.id, value: progress.done[exercise.id] });
      }
    },
    fail: () => track('fail'),
    hint() { if (++hintsThisVisit > (progress.drills[exercise.id]?.hints ?? 0)) track('hint'); },
    reveal() {
      if (isDone(progress, exercise)) return;
      // A solution shown on an earlier visit already counts.
      if (!progress.revealed[exercise.id]) track('reveal');
      progress.revealed[exercise.id] = true;
      setEntry(summary.id, { kind: 'revealed', id: exercise.id, value: true });
    },
    changed: () => { if (main.querySelector('#next')) updateNav(); },
  }, {
    heading: 'h1',
    counter: `Übung ${pad(index + 1)} / ${pad(total)}`,
    lesson: { href: base, title: module.title },
    files: area.files,
    intro: 'Los geht’s. Du kannst jederzeit überspringen und später zurückkommen.',
    footer: html`
      <nav class="player-nav" aria-label="Übungsnavigation">
        ${index > 0 ? html`<a class="btn ghost" href="${base}/${index}">${raw(icons.back)} Zurück</a>` : html`<a class="btn ghost" href="${base}">${raw(icons.back)} Lektion</a>`}
        <a id="next" class="btn" href="${index < total - 1 ? `${base}/${index + 2}` : nextModule ? `/${summary.id}/${nextModule.id}` : `/${summary.id}`}"></a>
      </nav>
      <section id="module-done" class="module-done" hidden>
        <p class="label">Modul geschafft</p>
        <p>Alle ${total} Übungen in „${module.title}“ sind gelöst. ${nextModule ? `Weiter geht es mit „${nextModule.title}“.` : 'Das war das letzte Modul – Zeit für das Abschlussprojekt.'}</p>
        <a class="btn primary" href="${nextModule ? `/${summary.id}/${nextModule.id}` : `/${summary.id}/projekte`}">${nextModule ? 'Nächstes Modul' : 'Zu den Projekten'} ${raw(icons.arrow)}</a>
      </section>`,
  });

  main.innerHTML = html`
    <div class="player" style="--area:${summary.color}">
      <header class="player-head">
        <nav class="crumbs" aria-label="Brotkrumen"><a href="/${summary.id}">${summary.title}</a><span aria-hidden="true">/</span><a href="${base}">${moduleNumber(summary, module.id)} ${module.title}</a></nav>
        <nav class="steps" aria-label="Übungen dieses Moduls – Pfeiltasten wechseln">
          ${module.exercises.map((e, i) => html`<a class="step${isDone(progress, e) ? ' done' : ''}${i === index ? ' active' : ''}" href="${base}/${i + 1}" ${i === index ? html`aria-current="step"` : ''} aria-label="Übung ${i + 1}: ${e.title} (${isDone(progress, e) ? 'gelöst' : 'offen'})" title="${i + 1}. ${e.title}"><span>${i + 1}</span></a>`)}
        </nav>
      </header>
      ${markup}
    </div>`.value;

  const view = mount($('.player', main));
  const cleanups: ((() => void) | void)[] = [view.cleanup];
  updateNav();

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
      $('#feedback', main).after(button);
    }
    const nextSolved = isDone(progress, exercise);
    if (nextSolved !== view.solved()) view.setSolved(nextSolved, nextSolved ? 'Auf einem Gerät gelöst und synchronisiert.' : 'Der gespeicherte Erfolg wurde zurückgesetzt.');
  }));
  return () => cleanups.forEach((fn) => fn && fn());
};
export default exercisePage;
