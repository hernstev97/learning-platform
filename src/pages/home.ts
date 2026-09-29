import { catalog, getContinueArea, progressOf } from '../app.ts';
import { resolveResume } from '../engine/persistence.ts';
import { areaStats } from '../engine/storage.ts';
import { dailyPlan } from '../engine/weakness.ts';
import { RESUME_NOTES, resumeStep } from '../ui/area-nav.ts';
import { html, icons, pad, plural, raw } from '../ui/dom.ts';
import { allReports, topicCard } from '../ui/review.ts';
import type { Page } from '../router.ts';

const home: Page = (main) => {
  document.title = 'learn.kiumu.app – vom Verstehen zum Können';
  const areas = catalog.areas;
  const totals = areas.reduce((sum, a) => ({ modules: sum.modules + a.counts.modules, exercises: sum.exercises + a.counts.exercises, cards: sum.cards + a.counts.cards }), { modules: 0, exercises: 0, cards: 0 });
  const layout = ['wide', 'narrow', 'narrow', 'wide', 'full'];
  const current = areas.find((a) => a.id === getContinueArea());
  const resume = current && resolveResume(current, progressOf(current.id));
  const module = resume?.module;
  const reports = allReports();
  const plan = dailyPlan(reports);
  const reviewing = reports.some((r) => r.started);
  main.innerHTML = html`
    <section class="hero">
      <div class="hero-text">
        <p class="label">Private Lernplattform · ${areas.length} Bereiche</p>
        <h1 class="hero-title">Vom Verstehen<br>zum Können.</h1>
        ${current && resume ? html`<section class="resume" style="--area:${current.color}" aria-labelledby="resume-title">
          <p class="label">Weiterlernen · ${current.title}</p>
          <h2 id="resume-title" class="resume-title">${module?.title ?? (resume.step.page === 'project' ? resume.step.title : current.title)}</h2>
          <p class="resume-step label">${module ? `Modul ${pad(module.number)} · ` : ''}${resumeStep(resume)}</p>
          ${module ? html`<span class="area-progress" aria-hidden="true"><span style="width:${module.total ? Math.round(module.done / module.total * 100) : 0}%"></span></span>
          <p class="resume-count label">${module.done} / ${module.total} Übungen im Modul gelöst</p>` : ''}
          ${resume.moved ? html`<p class="resume-note">${RESUME_NOTES[resume.moved]}</p>` : ''}
          <a class="btn primary" href="${resume.href}">Weiterlernen ${raw(icons.arrow)}</a>
        </section>` : ''}
      </div>
      <div class="hero-side">
        <p class="hero-lead">Hier lerne ich die Dinge, die ich im Job brauche. Jede Lektion endet in Übungen, in denen ich selbst Code schreibe, Fehler suche, Verhalten vorhersage und fremden Code erkläre. Jeder Bereich endet mit einem Projekt, das sich wie eine echte Aufgabe im Job anfühlt.</p>
        <ol class="hero-areas">
          ${areas.map((area, i) => html`<li><a href="/${area.id}" style="--area:${area.color}"><span class="label">${pad(i + 1)}</span>${area.title}</a></li>`)}
        </ol>
        <p class="hero-stats label">${totals.modules} Module · ${totals.exercises} Übungen · ${totals.cards} Interview-Karten</p>
      </div>
    </section>
    ${reviewing ? html`<section class="review-band" aria-labelledby="review-band-title">
      <div class="review-band-head">
        <h2 id="review-band-title" class="section-title">Heute wiederholen</h2>
        <p class="label">${plan.today.length ? `${plural(plan.today.length, 'Thema', 'Themen')} · ca. ${plan.minutes} min${plan.later.length ? ` · ${plan.later.length} weitere fällig` : ''}` : 'Nichts fällig'}</p>
        <a class="btn small" href="/wiederholen">Alle Schwachstellen ${raw(icons.arrow)}</a>
      </div>
      ${plan.today.length ? html`<ol class="topic-cards">${plan.today.map(topicCard)}</ol>` : html`<p class="review-empty">Heute ist nichts fällig. Übungen mit Fehlversuchen, vergessene Karten und lange liegende Module erscheinen hier, sobald sie dran sind.</p>`}
    </section>` : ''}
    <section class="area-grid" aria-label="Lernbereiche">
      ${areas.map((area, i) => {
        const stats = areaStats(area, progressOf(area.id));
        const next = resolveResume(area, progressOf(area.id));
        return html`
        <a class="area-block ${layout[i % layout.length]}" href="${next.started ? next.href : `/${area.id}`}" style="--area:${area.color}">
          <span class="area-number" aria-hidden="true">${pad(i + 1)}</span>
          <span class="area-name">${area.title}</span>
          <span class="area-tagline">${area.tagline}</span>
          <span class="area-meta label">${area.counts.modules}&nbsp;Module · ${area.counts.exercises}&nbsp;Übungen · ${area.counts.cards}&nbsp;Karten${area.counts.projects ? raw(` · ${area.counts.projects}&nbsp;Projekte`) : ''}</span>
          <span class="area-progress" aria-label="${stats.percent} Prozent der Übungen gelöst"><span style="width:${stats.percent}%"></span></span>
          <span class="area-foot label"><span>${stats.done || next.started ? `${stats.done} / ${stats.total} gelöst · ${stats.percent} %` : 'Noch nicht begonnen'}</span><span class="area-go">${next.started ? 'Weiter' : 'Öffnen'} ${raw(icons.arrow)}</span></span>
        </a>`;
      })}
    </section>`.value;
};
export default home;
