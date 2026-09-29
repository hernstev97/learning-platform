import type { AreaSummary } from '../content/types.ts';
import type { Resume } from '../engine/persistence.ts';
import { areaStats, isDone, type AreaProgress } from '../engine/storage.ts';
import { analyzeArea, dueTopics } from '../engine/weakness.ts';
import { TYPE_LABELS, html, pad, raw } from './dom.ts';

export type Tab = 'pfad' | 'wiederholen' | 'karten' | 'projekte' | 'spickzettel' | 'glossar' | 'beruf';

/** The tab row shared by all area pages. */
export function areaTabs(area: AreaSummary, progress: AreaProgress, active: Tab) {
  const due = areaStats(area, progress).due;
  const review = dueTopics(analyzeArea(area, progress)).length;
  const tabs: [Tab, string, string, boolean][] = [
    ['pfad', 'Lernpfad', `/${area.id}`, true],
    ['wiederholen', `Wiederholen${review ? ` <b>${review}</b>` : ''}`, `/${area.id}/wiederholen`, true],
    ['karten', `Interview${area.counts.cards ? ` <b>${due}</b>` : ''}`, `/${area.id}/karten`, area.counts.cards > 0],
    ['projekte', 'Projekte', `/${area.id}/projekte`, area.counts.projects > 0],
    ['spickzettel', 'Spickzettel', `/${area.id}/spickzettel`, area.pages.cheatsheet],
    ['glossar', 'Glossar', `/${area.id}/glossar`, area.pages.glossary],
    ['beruf', 'Beruf', `/${area.id}/beruf`, area.pages.career],
  ];
  return html`<nav class="area-tabs no-print" aria-label="Bereich ${area.title}" style="--area:${area.color}">
    ${tabs.filter((t) => t[3]).map(([id, label, href]) => html`<a href="${href}" ${id === active ? html`aria-current="page"` : ''}>${raw(label)}</a>`)}
  </nav>`;
}

/** Compact header for subpages (cards, projects, reference). */
export function areaBanner(area: AreaSummary, progress: AreaProgress, active: Tab, title: string) {
  return html`<header class="area-banner" style="--area:${area.color}">
    <div class="area-banner-inner">
      <nav class="crumbs" aria-label="Brotkrumen"><a href="/">Start</a><span aria-hidden="true">/</span><a href="/${area.id}">${area.title}</a></nav>
      <h1 class="page-title" tabindex="-1">${title}</h1>
    </div>
  </header>${areaTabs(area, progress, active)}`;
}

/** Tiny per-exercise bars for a module row; exercises on the review list are marked. */
export function moduleBars(module: AreaSummary['modules'][number], progress: AreaProgress, weak: Set<string> = new Set()) {
  const done = module.exercises.filter((e) => isDone(progress, e)).length;
  return { done, total: module.exercises.length, markup: html`<span class="mini-bars" aria-hidden="true">${module.exercises.map((e) => html`<i class="${[isDone(progress, e) ? 'on' : '', weak.has(e.id) ? 'weak' : ''].filter(Boolean).join(' ')}"></i>`)}</span>` };
}
export const moduleNumber = (area: AreaSummary, id: string) => pad(area.modules.findIndex((m) => m.id === id) + 1);

/** Short description of where "Weiterlernen" leads, e.g. "Übung 3 von 8 · Lückencode". */
export function resumeStep(resume: Resume): string {
  switch (resume.step.page) {
    case 'lesson': return 'Lektion';
    case 'exercise': return `Übung ${resume.step.index} von ${resume.step.total} · ${TYPE_LABELS[resume.step.type]}`;
    case 'project': return 'Projekt';
    case 'finished': return 'Alle Übungen gelöst';
  }
}
export const RESUME_NOTES = {
  solved: 'Deine letzte Stelle ist schon erledigt – hier geht es weiter.',
  removed: 'Deine letzte Stelle gibt es nicht mehr – hier geht es weiter.',
} as const;
