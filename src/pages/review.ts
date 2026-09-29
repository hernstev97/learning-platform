// "Wiederholen": today's plan across all areas (/wiederholen) and one area's topic map (/<area>/wiederholen).
import { catalog, progressOf, summaryOf } from '../app.ts';
import { localDay } from '../engine/storage.ts';
import { analyzeArea, dailyPlan, dueTopics, looseDueCards, type TopicReport } from '../engine/weakness.ts';
import type { Page } from '../router.ts';
import { areaBanner } from '../ui/area-nav.ts';
import { html, icons, plural, raw } from '../ui/dom.ts';
import { allReports, planText, roundHref, rulesMarkup, STATUS, topicCard, topicLabel, topicLegend, topicRow } from '../ui/review.ts';

const INTRO = 'Die Plattform sucht in deinem Lernstand nach Übungen mit Fehlversuchen, Hinweisen oder angesehener Lösung, nach vergessenen Interviewkarten und nach Modulen, die lange liegen. Sie bündelt das nach Themen und sagt jeweils, warum ein Thema dran ist.';

/** Further due topics as compact rows. */
const laterList = (reports: TopicReport[]) => html`<ol class="review-later-list">${reports.map((r) => {
  const area = summaryOf(r.area)!;
  return html`<li style="--area:${area.color}"><a href="${roundHref(r)}"><span class="label">${topicLabel(area, r)}</span><span class="review-later-title">${r.topic.title}</span><span class="review-later-why">${r.reasons[0]?.text ?? ''}</span><span class="label">${planText(r.plan, r.minutes)}</span></a></li>`;
})}</ol>`;

const reviewHome: Page = (main) => {
  document.title = 'Wiederholen · learn.kiumu.app';
  const reports = allReports();
  const plan = dailyPlan(reports);
  const started = reports.some((r) => r.started);
  main.innerHTML = html`
    <header class="area-banner review-banner">
      <div class="area-banner-inner">
        <nav class="crumbs" aria-label="Brotkrumen"><a href="/">Start</a></nav>
        <h1 class="page-title" tabindex="-1">Wiederholen</h1>
      </div>
    </header>
    <div class="page review-page">
      <p class="page-intro">${INTRO}</p>
      <section class="review-today" aria-labelledby="today-title">
        <div class="review-head"><h2 id="today-title" class="section-title">Heute</h2>${plan.today.length ? html`<p class="label">${plural(plan.today.length, 'Thema', 'Themen')} · ca. ${plan.minutes} min</p>` : ''}</div>
        ${plan.today.length ? html`<ol class="topic-cards">${plan.today.map(topicCard)}</ol>`
          : html`<p class="review-empty">${started ? 'Heute ist nichts fällig. Alles, was du gelernt hast, sitzt – oder kommt erst später wieder dran.' : 'Noch nichts zu wiederholen. Sobald du Übungen löst und Interviewkarten bewertest, erscheinen hier deine Schwachstellen.'}</p>`}
        ${plan.later.length ? html`<details class="review-later"><summary><span class="label">${plural(plan.later.length, 'weiteres Thema', 'weitere Themen')} fällig</span></summary>${laterList(plan.later)}</details>` : ''}
      </section>
      <section class="review-areas" aria-labelledby="areas-title">
        <h2 id="areas-title" class="section-title">Nach Bereich</h2>
        <ul class="review-area-list">${catalog.areas.map((area) => {
          const own = reports.filter((r) => r.area === area.id);
          const count = (status: TopicReport['status']) => own.filter((r) => r.status === status).length;
          const due = dueTopics(own).length;
          const cards = looseDueCards(own);
          const parts = [due ? `${due} fällig` : '', ...(['weak', 'started', 'solid'] as const).map((status) => count(status) ? `${count(status)} ${STATUS[status].toLowerCase()}` : '')].filter(Boolean);
          return html`<li style="--area:${area.color}"><a href="/${area.id}/wiederholen"><span class="review-area-name">${area.title}</span><span class="review-area-info"><span class="label">${parts.length ? parts.join(' · ') : 'Noch nicht begonnen'}</span>${cards ? html`<span class="label muted">Außerdem im Interview-Training: ${plural(cards, 'Karte', 'Karten')} fällig</span>` : ''}</span><span class="review-area-go">${raw(icons.arrow)}</span></a></li>`;
        })}</ul>
      </section>
      ${rulesMarkup()}
    </div>`.value;
};

const reviewArea: Page<{ name: 'review'; area: string }> = (main, route) => {
  const summary = summaryOf(route.area)!;
  const progress = progressOf(summary.id);
  const today = localDay();
  document.title = `Wiederholen · ${summary.title}`;
  const reports = analyzeArea(summary, progress, today);
  const due = dueTopics(reports);
  const rest = reports.filter((r) => !due.includes(r));
  // Weak before solid before untouched; within a group in curriculum order.
  const order: TopicReport['status'][] = ['weak', 'stale', 'started', 'solid', 'new'];
  rest.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const cards = looseDueCards(reports);
  main.innerHTML = html`
    ${areaBanner(summary, progress, 'wiederholen', 'Wiederholen')}
    <div class="page review-page">
      <p class="page-intro">${INTRO}</p>
      <section class="review-today" aria-labelledby="today-title">
        <div class="review-head"><h2 id="today-title" class="section-title">Fällig</h2>${due.length ? html`<p class="label">${plural(due.length, 'Thema', 'Themen')} · ca. ${due.reduce((n, r) => n + r.minutes, 0)} min</p>` : ''}</div>
        ${due.length ? html`<ol class="topic-cards">${due.map(topicCard)}</ol>`
          : html`<p class="review-empty">${reports.some((r) => r.started) ? 'In diesem Bereich ist gerade nichts fällig.' : 'Noch nichts zu wiederholen. Sobald du hier Übungen löst und Interviewkarten bewertest, erscheinen deine Schwachstellen.'}</p>`}
        ${cards ? html`<p class="review-cards-note">Außerdem ${cards === 1 ? 'ist 1 bewertete Interviewkarte' : `sind ${cards} bewertete Interviewkarten`} regulär fällig. <a href="/${summary.id}/karten">Zum Interview-Training</a></p>` : ''}
      </section>
      <section class="topic-map" aria-labelledby="map-title">
        <h2 id="map-title" class="section-title">Alle Themen</h2>
        ${topicLegend()}
        <ol class="topic-list">${[...due, ...rest].map((r) => topicRow(r, today))}</ol>
      </section>
      ${rulesMarkup()}
    </div>`.value;
};

const review: Page<{ name: 'review-home' } | { name: 'review'; area: string }> = (main, route) => route.name === 'review' ? reviewArea(main, route) : reviewHome(main, route);
export default review;
