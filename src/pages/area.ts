import { progressOf, summaryOf } from '../app.ts';
import { areaStats, isDone } from '../engine/storage.ts';
import { areaTabs, moduleBars } from '../ui/area-nav.ts';
import { LEVELS, html, icons, minutes, pad, raw } from '../ui/dom.ts';
import type { Page } from '../router.ts';

/** Where to continue: last visited page, else the first module with open exercises. */
export function resumeTarget(areaId: string): { href: string; label: string } {
  const area = summaryOf(areaId)!;
  const progress = progressOf(areaId);
  if (progress.last) {
    const [, , moduleId] = progress.last.split('/');
    const module = area.modules.find((m) => m.id === moduleId);
    if (module) return { href: progress.last, label: `Weiter: ${module.title}` };
  }
  const open = area.modules.find((m) => m.exercises.some((e) => !isDone(progress, e)));
  return open ? { href: `/${area.id}/${open.id}`, label: `${Object.keys(progress.done).length ? 'Weiter' : 'Start'}: ${open.title}` } : { href: `/${area.id}/karten`, label: 'Alles gelöst – Interview-Training' };
}

const area: Page<{ name: 'area'; area: string }> = (main, route) => {
  const summary = summaryOf(route.area)!;
  const progress = progressOf(summary.id);
  const stats = areaStats(summary, progress);
  const resume = resumeTarget(summary.id);
  document.title = `${summary.title} · learn.kiumu.app`;
  const capstone = summary.projects.find((p) => p.capstone);
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
            <a class="btn primary big" href="${resume.href}">${resume.label} ${raw(icons.arrow)}</a>
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
              const bars = moduleBars(m, progress);
              n++;
              const status = bars.done === bars.total && bars.total ? 'Fertig' : bars.done ? `${bars.done}/${bars.total}` : progress.read[m.id] ? 'Gelesen' : 'Neu';
              return html`<li><a class="module-row ${bars.done === bars.total && bars.total ? 'complete' : ''}" href="/${summary.id}/${m.id}">
                <span class="module-number">${pad(n)}</span>
                <span class="module-main"><span class="module-title">${m.title}</span><span class="module-summary">${m.summary}</span></span>
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
