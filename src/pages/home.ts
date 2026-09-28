import { catalog, progressOf } from '../app.ts';
import { areaStats } from '../engine/storage.ts';
import { html, icons, pad, raw } from '../ui/dom.ts';
import type { Page } from '../router.ts';

const home: Page = (main) => {
  document.title = 'learn.kiumu.app – vom Verstehen zum Können';
  const areas = catalog.areas;
  const totals = areas.reduce((sum, a) => ({ modules: sum.modules + a.counts.modules, exercises: sum.exercises + a.counts.exercises, cards: sum.cards + a.counts.cards }), { modules: 0, exercises: 0, cards: 0 });
  const layout = ['wide', 'narrow', 'narrow', 'wide', 'full'];
  main.innerHTML = html`
    <section class="hero">
      <div class="hero-text">
        <p class="label">Private Lernplattform · ${areas.length} Bereiche</p>
        <h1 class="hero-title">Vom Verstehen<br>zum Können.</h1>
      </div>
      <div class="hero-side">
        <p class="hero-lead">Hier lerne ich die Dinge, die ich im Job brauche. Jede Lektion endet in Übungen, in denen ich selbst Code schreibe, Fehler suche, Verhalten vorhersage und fremden Code erkläre. Jeder Bereich endet mit einem Projekt, das sich wie eine echte Aufgabe im Job anfühlt.</p>
        <ol class="hero-areas">
          ${areas.map((area, i) => html`<li><a href="/${area.id}" style="--area:${area.color}"><span class="label">${pad(i + 1)}</span>${area.title}</a></li>`)}
        </ol>
        <p class="hero-stats label">${totals.modules} Module · ${totals.exercises} Übungen · ${totals.cards} Interview-Karten</p>
      </div>
    </section>
    <section class="area-grid" aria-label="Lernbereiche">
      ${areas.map((area, i) => {
        const stats = areaStats(area, progressOf(area.id));
        const last = progressOf(area.id).last;
        return html`
        <a class="area-block ${layout[i % layout.length]}" href="${last ?? `/${area.id}`}" style="--area:${area.color}">
          <span class="area-number" aria-hidden="true">${pad(i + 1)}</span>
          <span class="area-name">${area.title}</span>
          <span class="area-tagline">${area.tagline}</span>
          <span class="area-meta label">${area.counts.modules} Module · ${area.counts.exercises} Übungen · ${area.counts.cards} Karten${area.counts.projects ? ` · ${area.counts.projects} Projekte` : ''}</span>
          <span class="area-progress" aria-label="${stats.percent} Prozent der Übungen gelöst"><span style="width:${stats.percent}%"></span></span>
          <span class="area-foot label"><span>${stats.done ? `${stats.done} / ${stats.total} gelöst · ${stats.percent} %` : 'Noch nicht begonnen'}</span><span class="area-go">${last ? 'Weiter' : 'Öffnen'} ${raw(icons.arrow)}</span></span>
        </a>`;
      })}
    </section>`.value;
};
export default home;
