// Building blocks for "Wiederholen" and the home page: topic cards with their reasons, the topic map and the rules.
import { catalog, progressOf, summaryOf } from '../app.ts';
import type { AreaSummary } from '../content/types.ts';
import { DRILL_INTERVALS, HEAVY, REFRESH_INTERVALS } from '../engine/drill.ts';
import { daysBetween, localDay } from '../engine/storage.ts';
import { DAILY, LEARNED, ROUND, analyzeArea, dueTopics, type ReviewItem, type TopicReport, type TopicStatus } from '../engine/weakness.ts';
/** The legend of the marks in topicRow. */
export const topicLegend = () => html`<p class="topic-legend label"><span>Übungen:</span><span><i class="on"></i>gelöst</span><span><i class="weak"></i>auf der Liste</span><span><i></i>offen</span><span class="topic-legend-cards">Karten:</span><span><b class="on"></b>sitzt (Box 3+)</span><span><b class="half"></b>bewertet</span><span><b class="weak"></b>wackelig</span><span><b></b>neu</span></p>`;
import { html, icons, pad, plural, raw } from './dom.ts';

export const allReports = (today = localDay()): TopicReport[] => catalog.areas.flatMap((area) => analyzeArea(area, progressOf(area.id), today));
export const dueTopicCount = () => dueTopics(allReports()).length;

export const STATUS: Record<TopicStatus, string> = { due: 'Fällig', stale: 'Auffrischen', weak: 'Wackelig', solid: 'Sicher', started: 'Begonnen', new: 'Neu' };
export const roundHref = (report: TopicReport) => `/${report.area}/wiederholen/${report.topic.id}`;
export const inDays = (days: number) => days <= 0 ? 'heute' : days === 1 ? 'morgen' : `in ${days} Tagen`;
export const daysAgo = (days: number) => days <= 0 ? 'heute' : days === 1 ? 'gestern' : `vor ${days} Tagen`;

export function planText(items: ReviewItem[], minutes: number): string {
  const exercises = items.filter((item) => item.kind === 'exercise').length;
  const cards = items.length - exercises;
  return [exercises ? plural(exercises, 'Übung', 'Übungen') : '', cards ? plural(cards, 'Karte', 'Karten') : '', `ca. ${minutes} min`].filter(Boolean).join(' · ');
}
export function topicLabel(area: AreaSummary, report: TopicReport): string {
  return report.topic.module ? `${area.title} · Modul ${pad(area.modules.findIndex((m) => m.id === report.topic.module) + 1)}` : `${area.title} · Interview`;
}
export const reasonList = (report: TopicReport, limit = 3) => html`<ul class="reasons">${report.reasons.slice(0, limit).map((reason) => html`<li>${reason.text}</li>`)}</ul>`;

/** A topic suggested for today: where it belongs, why, and what its round contains. */
export function topicCard(report: TopicReport) {
  const area = summaryOf(report.area)!;
  return html`<li class="topic-card" style="--area:${area.color}">
    <p class="topic-card-area label">${topicLabel(area, report)}</p>
    <h3 class="topic-card-title">${report.topic.title}</h3>
    ${reasonList(report)}
    <p class="topic-card-plan label">${planText(report.plan, report.minutes)}</p>
    <div class="topic-card-actions"><a class="btn primary" href="${roundHref(report)}">Wiederholen ${raw(icons.arrow)}</a>${report.topic.module ? html`<a class="topic-card-lesson" href="/${report.area}/${report.topic.module}">Lektion</a>` : ''}</div>
  </li>`;
}

/** What the map says about a topic besides its reasons. */
function topicNote(report: TopicReport, today: string): string {
  switch (report.status) {
    case 'weak': return `Nächste Wiederholung ${inDays(daysBetween(today, report.next!))}`;
    case 'solid': case 'started': return report.idle === null ? '' : `Zuletzt ${daysAgo(report.idle)} geübt${report.refresh.reps ? ` · ${plural(report.refresh.reps, 'Auffrischung', 'Auffrischungen')} ohne Hilfe` : ''}`;
    case 'new': return report.topic.module ? 'Noch nicht begonnen' : 'Noch keine Karte bewertet';
    default: return report.idle === null ? '' : `Zuletzt ${daysAgo(report.idle)} geübt`;
  }
}

/** One row of an area's topic map: status, reasons, exercises (solid, weak, open) and cards at a glance. */
export function topicRow(report: TopicReport, today = localDay()) {
  const seen = report.cards.filter((c) => c.state);
  const weakCards = report.cards.filter((c) => c.weak).length;
  const exercises = report.exercises;
  const weakExercises = exercises.filter((e) => e.weak).length;
  const solved = exercises.filter((e) => e.solved).length;
  const summary = [
    exercises.length ? `${solved} / ${plural(exercises.length, 'Übung', 'Übungen')} gelöst${weakExercises ? `, ${weakExercises} auf der Liste` : ''}` : '',
    report.cards.length ? `${seen.length} / ${plural(report.cards.length, 'Karte', 'Karten')} bewertet${weakCards ? `, ${weakCards} wackelig` : ''}` : '',
  ].filter(Boolean).join(' · ');
  const action = report.status === 'due' || report.status === 'stale' ? html`<a class="btn small primary" href="${roundHref(report)}">Wiederholen</a>`
    : report.started ? html`<a class="btn small" href="${roundHref(report)}">Üben</a>`
    : report.topic.module ? html`<a class="btn small ghost" href="/${report.area}/${report.topic.module}">Lektion</a>` : '';
  return html`<li class="topic-row status-${report.status}" id="thema-${report.topic.id}">
    <span class="topic-status tag">${STATUS[report.status]}</span>
    <span class="topic-main">
      <span class="topic-name">${report.topic.title}</span>
      ${report.reasons.length ? html`<span class="topic-reasons">${report.reasons.map((r) => r.text).join(' · ')}</span>` : ''}
      <span class="topic-note label">${[topicNote(report, today), summary].filter(Boolean).join(' · ')}</span>
    </span>
    <span class="topic-bars" aria-hidden="true">${exercises.length ? html`<span class="topic-exercise-marks">${exercises.map((e) => html`<i class="${e.weak ? 'weak' : e.solved ? 'on' : ''}"></i>`)}</span>` : ''}${report.cards.length ? html`<span class="topic-card-marks">${report.cards.map((c) => html`<i class="${c.weak ? 'weak' : c.state && c.state.box >= 3 ? 'on' : c.state ? 'half' : ''}"></i>`)}</span>` : ''}</span>
    <span class="topic-action">${action}</span>
  </li>`;
}

/** The rules in plain words, generated from the same constants the engine uses. */
export const rulesMarkup = () => html`<details class="review-rules">
  <summary><span class="label">So entscheidet die Plattform</span></summary>
  <div class="prose compact">
    <p>Alles hier folgt festen Regeln aus deinem gespeicherten Lernstand. Es gibt keine KI und keine Schätzung von außen.</p>
    <ul>
      <li><strong>Übungen:</strong> Jede falsch oder unvollständig geprüfte Antwort ist ein Fehlversuch. Dieselbe falsche Antwort zählt pro Besuch nur einmal, rote Testläufe einer Programmieraufgabe ebenso. Jeder geöffnete Hinweis zählt einen Punkt, „Lösung zeigen“ vor dem Lösen drei. Hinweise und Lösungen, die du schon bei einem früheren Besuch gebraucht hast, zählen nicht erneut. Ab ${HEAVY} Punkten bis zum Lösen kommt die Übung nach ${plural(DRILL_INTERVALS[1], 'Tag', 'Tagen')} wieder (Stufe 1), mit weniger nach ${plural(DRILL_INTERVALS[2], 'Tag', 'Tagen')} (Stufe 2). Löst du sie in der Wiederholung ohne Hilfe, rückt sie eine Stufe weiter (${DRILL_INTERVALS.slice(1).join(', ')} Tage). Nach der letzten Stufe ist sie von der Liste. Neue Fehler setzen sie zurück.</li>
      <li><strong>Angefangen, nicht gelöst:</strong> Eine Übung mit Fehlversuchen, die du ohne Lösung verlassen hast, steht ab dem nächsten Tag auf der Liste.</li>
      <li><strong>Interviewkarten:</strong> Eine Karte gilt als wackelig, wenn du sie zuletzt mit „Vergessen“ oder „Schwer“ bewertet oder mehrfach vergessen hast. Wackelige fällige Karten bringen ihr Thema auf die Liste. Andere fällige Karten des Themas kommen in dessen Runde mit dran und bleiben sonst im Interview-Training.</li>
      <li><strong>Auffrischen:</strong> Hast du mindestens ${Math.round(LEARNED * 100)} % eines Moduls gelöst und ${REFRESH_INTERVALS[0]} Tage lang weder neue Übungen darin gelöst noch sie in einer Runde wiederholt, schlägt die Plattform eine Auffrischung vor. Das sind ${ROUND.refresher} gelöste Übungen, bevorzugt kurze Abfragen und solche, bei denen du früher Fehler hattest. Klappt sie ohne Hilfe, wächst der Abstand auf ${REFRESH_INTERVALS.slice(1).join(', ')} Tage. Mit Fehlern beginnt er wieder bei ${REFRESH_INTERVALS[0]}.</li>
      <li><strong>Heute:</strong> Die Themen mit den stärksten Gründen kommen zuerst, bis etwa ${DAILY.minutes} Minuten erreicht sind. Eine angesehene Lösung wiegt mehr als ein Fehlversuch und eine vergessene Karte mehr als eine schwere. Wer weiter üben will, findet alle fälligen Themen darunter.</li>
    </ul>
  </div>
</details>`;
