import './style.css';
import { bearRevision, chapters, sourceFiles, tasks } from './curriculum';
import { freshProgress, readProgress, writeProgress } from './storage';
import { isCorrect, isGapCorrect, isPartial } from './validation';
import { escape, highlight } from './format';
import type { Answers, Task } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
let initial;
try { initial = readProgress(window.localStorage); }
catch { initial = { progress: freshProgress(), warning: 'Dein Browser erlaubt keine lokale Speicherung. Der Lernstand bleibt nur in dieser geöffneten Seite erhalten.', legacy: false }; }
let progress = initial.progress;
let storageWarning = initial.warning;
const pad = (value: number) => String(value).padStart(2, '0');
const currentIndex = () => tasks.findIndex((task) => task.id === progress.activeId);
const currentTask = () => tasks[currentIndex()];
const arrow = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const check = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 10 3 3 7-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const shortPath = (file: string) => file.replace('android/app/src/main/java/app/kiumu/bear/', '').replace('android/app/src/test/java/app/kiumu/bear/', 'test/');

function updateStorageMessage(): void {
  const status = document.querySelector<HTMLElement>('#storage-status')!;
  status.textContent = storageWarning ? 'Nicht gespeichert' : 'Lokal gespeichert';
  status.classList.toggle('storage-failed', !!storageWarning);
  const warning = document.querySelector<HTMLElement>('#storage-warning')!;
  warning.hidden = !storageWarning;
  warning.textContent = storageWarning ?? '';
}
function save(): void {
  let saved = false;
  try { saved = writeProgress(window.localStorage, progress); } catch { /* Storage access may itself throw. */ }
  storageWarning = saved ? null : 'Speichern ist gerade nicht möglich. Dein Stand bleibt nur in dieser geöffneten Seite erhalten.';
  updateStorageMessage();
}
function renderProgress(): void {
  const count = Object.keys(progress.completed).length;
  document.querySelector('#progress-count')!.textContent = `${count} von ${tasks.length} erledigt`;
  document.querySelector('#progress-percent')!.textContent = `${Math.round(count / tasks.length * 100)} %`;
  document.querySelector('#progress-lines')!.innerHTML = chapters.map((chapter, group) => `
    <div class="progress-group" role="group" aria-label="${escape(chapter.title)}">
      ${tasks.filter((task) => task.chapter === group).map((task) => {
        const done = !!progress.completed[task.id];
        const active = task.id === progress.activeId;
        const label = `Aufgabe ${tasks.indexOf(task) + 1}: ${task.title} ${done ? 'Erledigt' : 'Offen'}`;
        return `<button class="progress-step${done ? ' done' : ''}${active ? ' active' : ''}" data-task="${task.id}" aria-label="${escape(label)}" title="${escape(label)}" ${active ? 'aria-current="step"' : ''} tabindex="${active ? '0' : '-1'}"><span></span></button>`;
      }).join('')}
    </div>`).join('');
  document.querySelector('#chapter-select')!.innerHTML = chapters.map((chapter, index) => {
    const done = tasks.filter((task) => task.chapter === index && progress.completed[task.id]).length;
    return `<option value="${index}" ${index === currentTask().chapter ? 'selected' : ''}>${pad(index + 1)} · ${escape(chapter.short)} (${done}/10)</option>`;
  }).join('');
}
function answerMarkup(task: Task, answers: Answers): string {
  return task.gaps.map((gap, index) => `<div class="gap-field" data-gap="${gap.id}">
    <div class="answer-label"><label for="answer-${gap.id}"><span class="gap-number">${index + 1}</span> ${escape(gap.label)}</label><span id="state-${gap.id}" class="gap-state"></span></div>
    <textarea id="answer-${gap.id}" class="answer-input${gap.multiline ? ' multiline' : ''}" aria-label="Lücke ${index + 1}: ${escape(gap.label)}" placeholder="${gap.multiline ? 'Kotlin-Ausdruck oder Codeblock …' : 'Fehlenden Kotlin-Code eingeben …'}" rows="${gap.multiline ? 3 : 1}" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="12000" aria-describedby="gap-feedback-${gap.id}" data-answer="${gap.id}">${escape(answers[gap.id] ?? '')}</textarea>
    <div class="gap-tools"><span id="gap-feedback-${gap.id}" class="gap-feedback"></span><details class="gap-hint"><summary>Hinweis zu ${index + 1}</summary><p>${escape(gap.hint)}</p></details></div>
  </div>`).join('');
}
function renderTask(focus = false): void {
  const task = currentTask();
  const index = currentIndex();
  const chapter = chapters[task.chapter];
  const answers = progress.drafts[task.id] ?? {};
  document.title = `${task.title} · Kotlin mit Bear`;
  document.querySelector('#task-container')!.innerHTML = `
    <article aria-labelledby="task-title">
      <div class="task-meta"><span class="chapter-tag">${pad(task.chapter + 1)} <span aria-hidden="true">/</span> ${escape(chapter.short)}</span><span>Aufgabe ${pad(index + 1)} <span class="muted">/ ${tasks.length}</span></span></div>
      <h1 id="task-title" tabindex="-1">${escape(task.title)}</h1>
      <p class="task-prompt">${escape(task.prompt)}</p>
      <div class="source-reference"><button id="open-source" class="text-button" title="Original im Dateikontext öffnen; enthält die Lösung">${escape(shortPath(task.source.file))}<span class="source-lines">:${task.source.start}${task.source.end !== task.source.start ? `–${task.source.end}` : ''}</span> ↗</button><span>Bear · ${escape(task.source.revision.slice(0, 7))}</span></div>
      <div class="code-card"><div class="code-toolbar"><span>Originalausschnitt aus Bear</span><span>${task.gaps.length === 1 ? '1 LÜCKE' : `${task.gaps.length} LÜCKEN`}</span></div><pre tabindex="0" aria-label="Kotlin-Code mit nummerierten Lücken"><code>${highlight(task.code)}</code></pre></div>
      <div class="answer-intro"><span>Ergänze den Bear-Code</span><span>Jede Lücke wird sofort geprüft</span></div>
      <div class="answer-area">${answerMarkup(task, answers)}</div>
      <div class="feedback-row"><div id="feedback" role="status" aria-live="polite" aria-atomic="true"></div></div>
      <nav class="task-navigation" aria-label="Aufgabennavigation"><button id="previous" class="text-button previous" ${index === 0 ? 'disabled' : ''}>${arrow} Zurück</button><button id="next" class="next-button"></button></nav>
      <div id="completion-message" class="completion-message" hidden></div>
      <section class="learning" aria-label="Lernmaterial zur aktuellen Aufgabe"><details id="wiki">
        <summary><span class="wiki-icon" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M10 5v12M3 4c3-1 5 0 7 1 2-1 4-2 7-1v11c-3-1-5 0-7 1-2-1-4-2-7-1V4Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg></span><span>Zum Nachlesen <small>Dein Mini-Wiki</small></span><span class="chevron" aria-hidden="true">⌄</span></summary>
        <div class="wiki-content"><h2>${escape(task.wiki.title)}</h2><p>${escape(task.wiki.body)}</p><div class="resources"><span class="resource-label">Weiterlernen</span>${task.resources.map((resource) => `<a href="${escape(resource.url)}" target="_blank" rel="noopener noreferrer">${escape(resource.title)} <span aria-hidden="true">↗</span><span class="sr-only"> (neuer Tab, englisch)</span></a>`).join('')}</div></div>
      </details></section>
      <p class="checking-note">Du rekonstruierst echten Bear-Code. Die Lückenprüfung vergleicht mit der Bear-Lösung; sie führt Kotlin nicht aus. Imports und umgebende Deklarationen findest du in der Originaldatei.</p>
    </article>`;
  renderProgress();
  updateFeedback();
  document.querySelectorAll<HTMLTextAreaElement>('[data-answer]').forEach((input) => input.addEventListener('input', () => answer(input.dataset.answer!, input.value)));
  document.querySelectorAll<HTMLAnchorElement>('[data-gap-link]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    document.querySelector<HTMLTextAreaElement>(`#answer-${link.dataset.gapLink}`)!.focus();
  }));
  document.querySelector('#previous')!.addEventListener('click', () => navigate(index - 1));
  document.querySelector('#next')!.addEventListener('click', next);
  document.querySelector('#open-source')!.addEventListener('click', openSource);
  if (focus) {
    const title = document.querySelector<HTMLElement>('#task-title')!;
    title.focus({ preventScroll: true });
    if (window.scrollY > 250) title.scrollIntoView({ block: 'start' });
  }
}
function updateFeedback(): void {
  const task = currentTask();
  const answers = progress.drafts[task.id] ?? {};
  const correct = isCorrect(task, answers);
  const done = !!progress.completed[task.id];
  let solved = 0;
  let attempted = false;
  for (const gap of task.gaps) {
    const value = answers[gap.id] ?? '';
    const right = isGapCorrect(gap, value);
    const partial = isPartial(gap, value);
    const invalid = !!value.trim() && !right && !partial;
    if (right) solved++;
    if (value.trim()) attempted = true;
    const input = document.querySelector<HTMLTextAreaElement>(`#answer-${gap.id}`)!;
    input.classList.toggle('correct', right);
    input.classList.toggle('incorrect', invalid);
    input.setAttribute('aria-invalid', String(invalid));
    const state = document.querySelector<HTMLElement>(`#state-${gap.id}`)!;
    state.textContent = right ? '✓ Richtig' : value.trim() ? partial ? 'In Arbeit' : 'Noch nicht richtig' : 'Offen';
    state.className = `gap-state${right ? ' correct' : invalid ? ' incorrect' : ''}`;
    document.querySelector(`#gap-feedback-${gap.id}`)!.textContent = invalid ? 'Prüfe Ausdruck, Großschreibung und Zeichen.' : partial && !right ? 'Schreib noch weiter.' : '';
    document.querySelector(`[data-gap-link="${gap.id}"]`)?.classList.toggle('solved', right);
  }
  const feedback = document.querySelector<HTMLElement>('#feedback')!;
  feedback.className = correct ? 'feedback correct' : 'feedback';
  feedback.innerHTML = correct ? `${check}<span><strong>Richtig. ${task.gaps.length > 1 ? 'Alle Lücken gelöst. ' : ''}</strong>${escape(task.explanation)}</span>` : `<span>${attempted ? `${solved} von ${task.gaps.length} Lücken richtig. ${solved ? 'Der Zwischenstand ist festgehalten.' : 'Du kannst die Hinweise oder das Mini-Wiki nutzen.'}` : 'Ein Schritt nach dem anderen. Du kannst jederzeit pausieren.'}${done ? ' Dein bisheriger Erfolg bleibt gespeichert.' : ''}</span>`;
  const allDone = Object.keys(progress.completed).length === tasks.length;
  const isLast = currentIndex() === tasks.length - 1;
  const otherOpen = tasks.some((item) => item.id !== task.id && !progress.completed[item.id]);
  const button = document.querySelector<HTMLButtonElement>('#next')!;
  button.classList.toggle('primary', correct);
  button.innerHTML = `${isLast ? allDone ? 'Von vorne wiederholen' : otherOpen ? 'Zur nächsten offenen Aufgabe' : 'Überspringen & zum Anfang' : correct ? 'Nächste Aufgabe' : 'Überspringen'} ${arrow}`;
  const completion = document.querySelector<HTMLElement>('#completion-message')!;
  completion.hidden = !allDone;
  if (allDone) completion.innerHTML = `<strong>Alle ${tasks.length} Bear-Aufgaben geschafft.</strong><p>Über die Linien kannst du jeden Abschnitt wiederholen und die Zusammenhänge im Originalcode weiter untersuchen.</p>`;
}
function answer(gapId: string, value: string): void {
  const task = currentTask();
  const answers = progress.drafts[task.id] ??= {};
  answers[gapId] = value;
  if (isCorrect(task, answers) && !progress.completed[task.id]) {
    progress.completed[task.id] = { answers: { ...answers }, at: new Date().toISOString(), fingerprint: task.fingerprint };
    renderProgress();
  }
  save();
  updateFeedback();
}
function navigate(index: number): void {
  if (index < 0 || index >= tasks.length) return;
  progress.activeId = tasks[index].id;
  save();
  // New markup always starts with closed wiki and closed per-gap hints.
  renderTask(true);
}
function next(): void {
  const index = currentIndex();
  if (index < tasks.length - 1) navigate(index + 1);
  else {
    const firstOpen = tasks.findIndex((task) => task.id !== progress.activeId && !progress.completed[task.id]);
    navigate(firstOpen < 0 ? 0 : firstOpen);
  }
}
function openSource(): void {
  const { source } = currentTask();
  document.querySelector('#source-title')!.textContent = shortPath(source.file);
  document.querySelector('#source-meta')!.textContent = `${source.file} · Bear ${source.revision.slice(0, 7)} · Zeilen ${source.start}–${source.end}`;
  document.querySelector('#source-code')!.innerHTML = sourceFiles[source.file].split('\n').map((line, i) => `<span class="source-line${i + 1 >= source.start && i + 1 <= source.end ? ' selected' : ''}" id="source-line-${i+1}"><span class="line-number" aria-hidden="true">${i+1}</span>${highlight(line) || ' '}</span>`).join('');
  const dialog = document.querySelector<HTMLDialogElement>('#source-dialog')!;
  dialog.showModal();
  document.querySelector(`#source-line-${source.start}`)!.scrollIntoView({ block: 'center' });
}

app.innerHTML = `
  <a class="skip-link" href="#task-title">Zur Aufgabe springen</a>
  <div class="shell">
    <header class="site-header"><a class="brand" href="./" aria-label="Kotlin mit Bear – aktueller Lernstand"><span class="brand-mark" aria-hidden="true">b.</span><span>Kotlin mit Bear<span class="brand-subtitle">Deine App. Dein Lernpfad.</span></span></a><span class="header-note">Nicht alles heute.</span></header>
    <section class="progress-section" aria-label="Dein Lernfortschritt"><div class="progress-heading"><label class="sr-only" for="chapter-select">Kapitel auswählen</label><select id="chapter-select"></select><span id="progress-count"></span></div><nav id="progress-lines" aria-label="Aufgaben auswählen – Pfeiltasten zum Navigieren"></nav><div class="progress-caption"><span>100 Aufgaben · 10 Kapitel · echter Bear-Code</span><span id="progress-percent"></span></div></section>
    <p id="storage-warning" class="storage-warning" role="status" hidden></p>
    ${initial.legacy ? '<p class="legacy-note">Der Bear-Kurs ist ein neuer Lernpfad. Dein bisheriger 48-Aufgaben-Stand bleibt separat in diesem Browser gespeichert.</p>' : ''}
    <main id="task-container"></main>
    <footer><span id="storage-status"></span><span>Bear ${escape(bearRevision.slice(0,7))} · Nur in diesem Browser.</span></footer>
  </div>
  <dialog id="source-dialog" aria-labelledby="source-title"><div class="source-dialog-header"><div><h2 id="source-title"></h2><p id="source-meta"></p></div><button id="close-source" class="next-button">Schließen</button></div><p class="source-notice">Unveränderte Originaldatei des Kursstands. Der markierte Ausschnitt enthält auch die Lösungen.</p><pre tabindex="0" aria-label="Originaldatei aus Bear"><code id="source-code"></code></pre></dialog>`;

document.querySelector('#progress-lines')!.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-task]');
  if (button) navigate(tasks.findIndex((task) => task.id === button.dataset.task));
});
document.querySelector('#progress-lines')!.addEventListener('keydown', (event) => {
  const key = event as KeyboardEvent;
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-task]');
  if (!button) return;
  const index = tasks.findIndex((task) => task.id === button.dataset.task);
  const destination = key.key === 'ArrowRight' ? Math.min(index + 1, tasks.length - 1) : key.key === 'ArrowLeft' ? Math.max(index - 1, 0) : key.key === 'Home' ? 0 : key.key === 'End' ? tasks.length - 1 : -1;
  if (destination < 0) return;
  key.preventDefault();
  navigate(destination);
  document.querySelector<HTMLButtonElement>(`[data-task="${tasks[destination].id}"]`)!.focus();
});
document.querySelector('#chapter-select')!.addEventListener('change', (event) => {
  const chapter = Number((event.target as HTMLSelectElement).value);
  navigate(tasks.findIndex((task) => task.chapter === chapter));
});
document.querySelector('#close-source')!.addEventListener('click', () => document.querySelector<HTMLDialogElement>('#source-dialog')!.close());
renderTask();
updateStorageMessage();
