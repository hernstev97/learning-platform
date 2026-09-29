import { hasNote, progressOf, summaryOf } from '../app.ts';
import { resolveResume, type Resume } from '../engine/persistence.ts';
import { areaStats } from '../engine/storage.ts';
import { analyzeArea } from '../engine/weakness.ts';
import { STATUS } from '../ui/review.ts';
import { RESUME_NOTES, areaTabs, moduleBars, resumeStep } from '../ui/area-nav.ts';
import { LEVELS, html, icons, minutes, pad, raw } from '../ui/dom.ts';
import type { Page } from '../router.ts';

/** Button target and label for the area's "Weiter" CTA, shared resolution with the home page. */
export function resumeTarget(areaId: string): { href: string; label: string; resume: Resume } {
  const area = summaryOf(areaId)!;
  const resume = resolveResume(area, progressOf(areaId));
  const title = resume.module?.title ?? (resume.step.page === 'project' ? resume.step.title : null);
  const label = title ? `${resume.started ? 'Weiter' : 'Start'}: ${title}` : area.counts.cards ? 'Alles gelöst – Interview-Training' : 'Alles gelöst';
  return { href: resume.href, label, resume };
}

const area: Page<{ name: 'area'; area: string }> = (main, route) => {
  const summary = summaryOf(route.area)!;
  const progress = progressOf(summary.id);
  const stats = areaStats(summary, progress);
  const target = resumeTarget(summary.id);
  const { resume } = target;
  document.title = `${summary.title} · learn.kiumu.app`;
  const capstone = summary.projects.find((p) => p.capstone);
  const topics = new Map(analyzeArea(summary, progress).map((r) => [r.topic.id, r]));
  let n = 0;
  main.innerHTML = html`
    <header class="area-hero" style="--area:${summary.color}">
      <div class="area-hero-inner">
        <nav class="crumbs" aria-label="Brotkrumen"><a href="/">Start</a><span aria-hidden="true">/</span><span>${summary.title}</span></nav>
        <h1 class="page-title" tabindex="-1">${summary.title}</h1>
        <p class="area-hero-tagline">${summary.tagline}</p>
        <div class="area-hero-grid">
          <div>
            <p class="area-hero-description">${summary.description}</p>
            <a class="btn primary big" href="${target.href}">${target.label} ${raw(icons.arrow)}</a>
            ${resume.started ? html`<p class="resume-step label">${resumeStep(resume)}${resume.module ? ` · ${resume.module.done} / ${resume.module.total} im Modul gelöst` : ''}</p>` : ''}
            ${resume.moved ? html`<p class="resume-note">${RESUME_NOTES[resume.moved]}</p>` : ''}
          </div>
          <dl class="stat-grid">
            <div><dt class="label">Module</dt><dd>${summary.counts.modules}</dd></div>
            <div><dt class="label">Übungen</dt><dd>${summary.counts.exercises}</dd></div>
            <div><dt class="label">Gelöst</dt><dd>${stats.percent}<small>%</small></dd></div>
            <div><dt class="label">Lernzeit</dt><dd>${Math.round(summary.counts.minutes / 60)}<small>h</small></dd></div>
          </dl>
        </div>
      </div>
    </header>
    ${areaTabs(summary, progress, 'pfad')}
    <div class="page">
      ${summary.outcomes.length ? html`<section class="outcomes" aria-labelledby="outcomes-title">
        <h2 id="outcomes-title" class="label">Danach kannst du</h2>
        <ul>${summary.outcomes.map((o) => html`<li>${raw(o)}</li>`)}</ul>
      </section>` : ''}
      ${summary.tracks.map((track, t) => html`
        <section class="track" aria-labelledby="track-${t}">
          <header class="track-head">
            <span class="track-letter" aria-hidden="true">${String.fromCharCode(65 + t)}</span>
            <div><h2 id="track-${t}" class="section-title">${track.title}</h2>${track.description ? html`<p>${track.description}</p>` : ''}</div>
          </header>
          <ol class="module-list">
            ${track.modules.map((id) => {
              const m = summary.modules.find((x) => x.id === id)!;
              const topic = topics.get(m.id);
              const bars = moduleBars(m, progress, new Set(topic?.exercises.filter((e) => e.weak).map((e) => e.id)));
              const review = topic && (topic.status === 'due' || topic.status === 'stale') ? topic : undefined;
              n++;
              const status = bars.done === bars.total && bars.total ? 'Fertig' : bars.done ? `${bars.done}/${bars.total}` : progress.read[m.id] ? 'Gelesen' : 'Neu';
              return html`<li><a class="module-row ${bars.done === bars.total && bars.total ? 'complete' : ''}" href="/${summary.id}/${m.id}">
                <span class="module-number">${pad(n)}</span>
                <span class="module-main"><span class="module-title">${m.title}</span><span class="module-summary">${m.summary}</span>${hasNote(summary.id, m.id) || review ? html`<span class="row-marks">${hasNote(summary.id, m.id) ? html`<span class="note-mark">Notiz</span>` : ''}${review ? html`<span class="review-mark" title="${review.reasons[0]?.text ?? ''}">${STATUS[review.status]}</span>` : ''}</span>` : ''}</span>
                <span class="module-meta"><span class="tag">${LEVELS[m.level]}</span><span class="tag">${minutes(m.minutes)}</span>${m.bear ? html`<span class="tag ink">Bear</span>` : ''}</span>
                <span class="module-progress">${bars.markup}<span class="label">${status}</span></span>
              </a></li>`;
            })}
          </ol>
        </section>`)}
      ${capstone ? html`<section class="capstone-block" aria-labelledby="capstone-title">
        <p class="label">Abschlussprojekt · ${LEVELS[capstone.level]} · ca. ${capstone.hours} h</p>
        <h2 id="capstone-title" class="section-title">${capstone.title}</h2>
        <p>${raw(capstone.summary)}</p>
        <a class="btn" href="/${summary.id}/projekte/${capstone.id}">Projekt ansehen ${raw(icons.arrow)}</a>
      </section>` : ''}
    </div>`.value;
};
export default area;
