import type { AreaSummary } from '../content/types.ts';
import { areaStats, isDone, type AreaProgress } from '../engine/storage.ts';
import { html, pad, raw } from './dom.ts';

export type Tab = 'pfad' | 'karten' | 'projekte' | 'spickzettel' | 'glossar' | 'beruf';

/** The tab row shared by all area pages. */
export function areaTabs(area: AreaSummary, progress: AreaProgress, active: Tab) {
  const due = areaStats(area, progress).due;
  const tabs: [Tab, string, string, boolean][] = [
    ['pfad', 'Lernpfad', `/${area.id}`, true],
    ['karten', `Interview${area.counts.cards ? ` <b>${due}</b>` : ''}`, `/${area.id}/karten`, area.counts.cards > 0],
    ['projekte', 'Projekte', `/${area.id}/projekte`, area.counts.projects > 0],
    ['spickzettel', 'Spickzettel', `/${area.id}/spickzettel`, area.pages.cheatsheet],
    ['glossar', 'Glossar', `/${area.id}/glossar`, area.pages.glossary],
    ['beruf', 'Beruf', `/${area.id}/beruf`, area.pages.career],
  ];
  return html`<nav class="area-tabs no-print" aria-label="Bereich ${area.title}">
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

/** Tiny per-exercise bars for a module row. */
export function moduleBars(module: AreaSummary['modules'][number], progress: AreaProgress) {
  const done = module.exercises.filter((e) => isDone(progress, e)).length;
  return { done, total: module.exercises.length, markup: html`<span class="mini-bars" aria-hidden="true">${module.exercises.map((e) => html`<i class="${isDone(progress, e) ? 'on' : ''}"></i>`)}</span>` };
}
export const moduleNumber = (area: AreaSummary, id: string) => pad(area.modules.findIndex((m) => m.id === id) + 1);
