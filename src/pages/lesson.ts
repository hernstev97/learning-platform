import { flushNote, isOffline, loadArea, onProgressChange, progressOf, saveNote, setEntry, summaryOf, watchNote } from '../app.ts';
import { NOTE_LIMIT } from '../../convex/model.ts';
import { isDone } from '../engine/storage.ts';
import { moduleNumber } from '../ui/area-nav.ts';
import { enhanceCode } from '../ui/code.ts';
import { $, LEVELS, TYPE_LABELS, html, icons, minutes, pad, raw } from '../ui/dom.ts';
import type { Page } from '../router.ts';

const lesson: Page<{ name: 'lesson'; area: string; module: string }> = async (main, route) => {
  const summary = summaryOf(route.area)!;
  const area = await loadArea(route.area);
  const module = area.modules[route.module];
  if (!module) return (await import('./not-found.ts')).default(main, { name: 'not-found' });
  const progress = progressOf(summary.id);
  const index = summary.modules.findIndex((m) => m.id === module.id);
  const prev = summary.modules[index - 1];
  const next = summary.modules[index + 1];
  const track = summary.tracks.find((t) => t.modules.includes(module.id))!;
  const firstOpen = Math.max(0, module.exercises.findIndex((e) => !isDone(progress, e)));
  const done = module.exercises.filter((e) => isDone(progress, e)).length;
  document.title = `${module.title} · ${summary.title}`;
  main.innerHTML = html`
    <header class="module-hero" style="--area:${summary.color}">
      <div class="module-hero-inner">
        <nav class="crumbs" aria-label="Brotkrumen"><a href="/">Start</a><span aria-hidden="true">/</span><a href="/${summary.id}">${summary.title}</a><span aria-hidden="true">/</span><span>${track.title}</span></nav>
        <p class="module-kicker label">Modul ${moduleNumber(summary, module.id)} · ${LEVELS[module.level]} · ${minutes(module.minutes)} · ${module.exercises.length} Übungen</p>
        <h1 class="page-title module-title-big" tabindex="-1">${module.title}</h1>
        <p class="module-lead">${module.summary}</p>
        <div class="module-actions">
          <a class="btn primary" href="/${summary.id}/${module.id}/${firstOpen + 1}">${done ? `Übungen fortsetzen (${done}/${module.exercises.length})` : 'Direkt zu den Übungen'} ${raw(icons.arrow)}</a>
        </div>
      </div>
    </header>
    <div class="lesson-layout page">
      <aside class="lesson-aside no-print">
        <nav class="toc" aria-label="Inhalt der Lektion">
          <p class="label">Inhalt</p>
          <ol>${module.toc.map((entry) => html`<li><a href="#${entry.id}">${entry.title}</a></li>`)}<li><a href="#notizen">Meine Notizen</a></li><li><a href="#uebungen">Übungen</a></li></ol>
        </nav>
      </aside>
      <article class="lesson">
        <details class="toc-mobile no-print"><summary class="label">Inhalt der Lektion</summary>
          <ol>${module.toc.map((entry) => html`<li><a href="#${entry.id}">${entry.title}</a></li>`)}<li><a href="#notizen">Meine Notizen</a></li><li><a href="#uebungen">Übungen</a></li></ol>
        </details>
        ${module.goals.length ? html`<section class="goals"><h2 class="label">Nach diesem Modul</h2><ul>${module.goals.map((goal) => html`<li>${raw(goal)}</li>`)}</ul></section>` : ''}
        <div class="prose">${raw(module.lesson)}</div>
        ${module.resources.length ? html`<section class="resources-block"><h2 class="label">Offizielle Dokumentation</h2><ul>${module.resources.map((r) => html`<li><a class="external-link" href="${r.url}" target="_blank" rel="noopener noreferrer">${r.title}</a></li>`)}</ul></section>` : ''}
        <section id="notizen" class="lesson-notes no-print" aria-labelledby="notes-title">
          <h2 id="notes-title" class="label">Meine Notizen</h2>
          <textarea id="note" rows="5" maxlength="${NOTE_LIMIT}" disabled placeholder="Notiz wird geladen …" aria-describedby="note-help"></textarea>
          <p id="note-help" class="muted small">Eigene Erkenntnisse, Beispiele und offene Fragen zu dieser Lektion. Wird automatisch gespeichert und auf deinen Geräten synchronisiert.</p>
        </section>
        <section id="uebungen" class="exercise-overview">
          <div class="exercise-overview-head">
            <h2 class="section-title">Übungen</h2>
            <label class="read-toggle"><input type="checkbox" id="read" ${progress.read[module.id] ? 'checked' : ''}> Lektion gelesen</label>
          </div>
          <ol class="exercise-list">
            ${module.exercises.map((exercise, i) => html`<li><a href="/${summary.id}/${module.id}/${i + 1}" class="${isDone(progress, exercise) ? 'done' : ''}">
              <span class="label">${pad(i + 1)}</span><span>${exercise.title}</span><span class="tag">${TYPE_LABELS[exercise.type]}</span><span class="exercise-state" aria-label="${isDone(progress, exercise) ? 'gelöst' : 'offen'}">${raw(isDone(progress, exercise) ? icons.check : '')}</span>
            </a></li>`)}
          </ol>
          <a class="btn primary big" href="/${summary.id}/${module.id}/${firstOpen + 1}">${done ? 'Weiterüben' : 'Übungen starten'} ${raw(icons.arrow)}</a>
        </section>
        <nav class="module-pager" aria-label="Module">
          ${prev ? html`<a href="/${summary.id}/${prev.id}"><span class="label">${raw(icons.back)} Vorheriges Modul</span>${prev.title}</a>` : html`<span></span>`}
          ${next ? html`<a class="next" href="/${summary.id}/${next.id}"><span class="label">Nächstes Modul ${raw(icons.arrow)}</span>${next.title}</a>` : html`<a class="next" href="/${summary.id}/projekte"><span class="label">Geschafft ${raw(icons.arrow)}</span>Zu den Projekten</a>`}
        </nav>
      </article>
    </div>`.value;
  $<HTMLInputElement>('#read', main).addEventListener('change', (event) => {
    if ((event.target as HTMLInputElement).checked) progress.read[module.id] = new Date().toISOString();
    else delete progress.read[module.id];
    setEntry(summary.id, { kind: 'lesson', id: module.id, completedAt: progress.read[module.id] ?? null });
  });
  // Highlight the current section in the table of contents.
  const links = new Map([...main.querySelectorAll<HTMLAnchorElement>('.toc a')].map((a) => [a.hash.slice(1), a]));
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) {
      links.forEach((a) => a.removeAttribute('aria-current'));
      links.get(entry.target.id)?.setAttribute('aria-current', 'true');
    }
  }, { rootMargin: '-20% 0px -70% 0px' });
  main.querySelectorAll('.prose h2[id], #notizen, #uebungen').forEach((h) => observer.observe(h));
  // Close the mobile contents before the jump so the target position is measured without it.
  const mobileToc = $<HTMLDetailsElement>('.toc-mobile', main);
  mobileToc.addEventListener('click', (event) => { if ((event.target as Element).closest('a')) mobileToc.open = false; });
  const cleanCode = enhanceCode(main);
  const cleanNote = bindNote(main, summary.id, module.id);
  const unsubscribe = onProgressChange(() => {
    $<HTMLInputElement>('#read', main).checked = !!progress.read[module.id];
    main.querySelectorAll('.exercise-list a').forEach((link, index) => {
      const done = isDone(progress, module.exercises[index]);
      link.classList.toggle('done', done);
      const state = link.querySelector('.exercise-state')!;
      state.setAttribute('aria-label', done ? 'gelöst' : 'offen');
      state.innerHTML = done ? icons.check : '';
    });
    const next = Math.max(0, module.exercises.findIndex((e) => !isDone(progress, e)));
    main.querySelectorAll<HTMLAnchorElement>('.module-actions a, .exercise-overview > a').forEach((a) => { a.href = `/${summary.id}/${module.id}/${next + 1}`; });
  });
  return () => { observer.disconnect(); cleanCode(); cleanNote(); unsubscribe(); };
};

/** The editor keeps what is typed; a note changed elsewhere replaces it only while there are no own edits. */
function bindNote(main: HTMLElement, areaId: string, moduleId: string): () => void {
  const note = $<HTMLTextAreaElement>('#note', main);
  if (isOffline()) { note.placeholder = 'Notizen sind im Offline-Modus nicht verfügbar.'; return () => {}; }
  let known: string | null = null;
  let offered: string | null = null;
  const offer = (text: string | null) => {
    offered = text;
    main.querySelector('#refresh-note')?.remove();
    if (text === null) return;
    const button = document.createElement('button');
    button.id = 'refresh-note'; button.type = 'button'; button.className = 'btn small';
    button.textContent = 'Auf einem anderen Gerät geändert · Laden';
    button.addEventListener('click', () => { if (offered !== null) { note.value = known = offered; offer(null); note.focus(); } });
    note.after(button);
  };
  const stop = watchNote(areaId, moduleId, (text) => {
    if (known === null) {
      note.value = known = text;
      note.disabled = false;
      note.placeholder = 'Was nimmst du aus dieser Lektion mit?';
    } else if (text === note.value) { known = text; offer(null); }
    else if (note.value === known) { note.value = known = text; offer(null); }
    else offer(text);
  });
  note.addEventListener('input', () => { offer(null); saveNote(areaId, moduleId, note.value); });
  note.addEventListener('blur', flushNote);
  const hidden = () => { if (document.visibilityState === 'hidden') flushNote(); };
  document.addEventListener('visibilitychange', hidden);
  return () => { flushNote(); stop(); document.removeEventListener('visibilitychange', hidden); };
}
export default lesson;
