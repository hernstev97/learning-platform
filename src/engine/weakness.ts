// Weak spots and "Heute wiederholen": rule-based, explainable, computed only from recorded progress. No AI.
// A topic bundles a module's exercises with the interview cards assigned to it (see TopicSummary). Every suggestion
// carries the reasons that produced it, so the page can say why a topic is on the list.
import type { AreaSummary, ExerciseType, TopicSummary } from '../content/types.ts';
import { byWeakness } from './review.ts';
import { DRILL_MAX, legacyDrill, refreshInterval } from './drill.ts';
import { addDays, daysBetween, isDone, localDay, type AreaProgress, type CardState, type DrillState } from './storage.ts';

/** Rough minutes per review item, for the time estimate of a round. */
export const MINUTES: Record<ExerciseType | 'card', number> = { gap: 2, choice: 1, order: 2, output: 2, command: 1, code: 6, practice: 8, bug: 3, explain: 5, card: 1 };
/** Quick recall checks; refreshers prefer them over long self-checked tasks. */
const QUICK = new Set<ExerciseType>(['gap', 'choice', 'order', 'output', 'command', 'bug', 'code']);
/** A module counts as learned, and can go stale, once this share of its exercises is solved. */
export const LEARNED = 0.5;
/** Upper limits of one round, and how many solved exercises a refresher asks again. */
export const ROUND = { exercises: 5, cards: 8, refresher: 3 };
/** Minutes and topics "Heute wiederholen" plans at most. */
export const DAILY = { minutes: 25, topics: 4 };

export type ExerciseSignal = {
  id: string;
  /** 1-based position in the module, as in the exercise URL. */
  number: number;
  type: ExerciseType;
  solved: boolean;
  /** Recorded review state (or one derived from a solution shown before recording started). */
  drill?: DrillState;
  /** Needs repetition: trouble that clean reviews have not cleared yet. */
  weak: boolean;
  /** Tried with trouble, but not solved (yet). */
  open: boolean;
  /** When a weak exercise is next due. */
  due: string | null;
  dueNow: boolean;
  /** Local day of the latest solve or recorded event. */
  last: string | null;
  /** How much this exercise speaks for a review; only weak exercises weigh anything. */
  weight: number;
};
export type CardSignal = { id: string; state?: CardState; weak: boolean; dueNow: boolean; weight: number };
export type ReasonKind = 'open' | 'revealed' | 'fails' | 'hints' | 'forgotten' | 'shaky' | 'stale';
export type Reason = { kind: ReasonKind; text: string; weight: number };
/**
 * due: weak items are due; stale: learned but long unpracticed; weak: weak items come back later;
 * solid: learned (or, for card topics, rated) without weak spots; started: begun, but not learned yet.
 */
export type TopicStatus = 'due' | 'stale' | 'weak' | 'solid' | 'started' | 'new';
export type ReviewItem =
  | { kind: 'exercise'; id: string; module: string; number: number; type: ExerciseType; reason: 'weak' | 'refresh' | 'practice'; why: string }
  | { kind: 'card'; id: string; reason: 'weak' | 'due' | 'practice'; why: string };
export type TopicReport = {
  area: string;
  topic: TopicSummary;
  status: TopicStatus;
  /** Priority for today; 0 if nothing is due. */
  score: number;
  /** Strongest first. */
  reasons: Reason[];
  exercises: ExerciseSignal[];
  cards: CardSignal[];
  started: boolean;
  /** Days since the latest practice; null if never practiced. */
  idle: number | null;
  refresh: { reps: number; interval: number };
  stale: boolean;
  /** Next day on which a weak item becomes due, if none is due now. */
  next: string | null;
  /** The items of a review round for this topic, right now. */
  plan: ReviewItem[];
  minutes: number;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const dayOf = (at: string) => /^\d{4}-\d{2}-\d{2}$/.test(at) ? at : localDay(new Date(at));
const latest = (days: (string | null | undefined)[]) => days.reduce<string | null>((max, day) => day && (!max || day > max) ? day : max, null);

/** When a weak exercise is due: the day after fresh trouble (even if an older box was due earlier), else its box's day. */
export const drillDue = (drill: DrillState): string | null => drill.open > 0 ? addDays(drill.last, 1) : drill.box > 0 ? drill.due ?? drill.last : null;

/** A shown solution weighs most, then every wrong check and hint; long overdue adds a little. */
export function exerciseWeight(drill: DrillState, overdue = 0): number {
  return 3 + (drill.reveals ? 2 : 0) + Math.min(drill.fails, 6) * 0.5 + Math.min(drill.hints, 2) * 0.5 + (overdue > 3 ? 1 : 0);
}

export function exerciseSignal(exercise: AreaSummary['modules'][number]['exercises'][number], number: number, progress: AreaProgress, today: string): ExerciseSignal {
  const solved = isDone(progress, exercise);
  const completion = progress.done[exercise.id];
  const solvedDay = completion ? dayOf(completion.at) : null;
  // A legacy flag without a date happened before today; that is all that matters for being due.
  const drill = progress.drills[exercise.id] ?? legacyDrill(!!completion?.help, !!progress.revealed[exercise.id] && !solved, solvedDay ?? addDays(today, -1));
  const open = !solved && !!drill && drill.open > 0;
  const weak = !!drill && (drill.box > 0 || drill.open > 0);
  const due = drill ? drillDue(drill) : null;
  const dueNow = !!due && due <= today;
  return {
    id: exercise.id, number, type: exercise.type, solved, drill, weak, open, due, dueNow,
    last: latest([solvedDay, progress.drills[exercise.id]?.last]),
    weight: weak ? exerciseWeight(drill, dueNow ? daysBetween(due, today) : 0) : 0,
  };
}

/** Weak: last rated „Vergessen“ or „Schwer“, or forgotten repeatedly and not yet in a high box. */
export function cardSignal(id: string, state: CardState | undefined, today: string): CardSignal {
  if (!state) return { id, weak: false, dueNow: false, weight: 0 };
  const lapses = state.lapses ?? 0;
  const weak = state.grade === 'again' || state.grade === 'hard' || (lapses >= 2 && state.box <= 3);
  return { id, state, weak, dueNow: state.due <= today, weight: weak ? (state.grade === 'again' ? 2.5 : 1.5) + Math.min(lapses, 4) * 0.5 : 0 };
}

function reasonsOf(exercises: ExerciseSignal[], cards: CardSignal[], stale: { idle: number; interval: number; weight: number } | null): Reason[] {
  const reasons: Reason[] = [];
  const add = (kind: ReasonKind, items: { weight: number }[], text: string) => { if (items.length) reasons.push({ kind, text, weight: items.reduce((sum, i) => sum + i.weight, 0) }); };
  const weak = exercises.filter((e) => e.weak);
  const open = weak.filter((e) => e.open);
  add('open', open, `${plural(open.length, 'Übung', 'Übungen')} angefangen, aber noch nicht gelöst`);
  const revealed = weak.filter((e) => e.drill!.reveals > 0);
  add('revealed', revealed, `Lösung bei ${plural(revealed.length, 'Übung', 'Übungen')} angesehen`);
  const failed = weak.filter((e) => e.drill!.fails > 0);
  const fails = failed.reduce((sum, e) => sum + e.drill!.fails, 0);
  add('fails', failed, `${plural(fails, 'Fehlversuch', 'Fehlversuche')} in ${plural(failed.length, 'Übung', 'Übungen')}`);
  const hinted = weak.filter((e) => e.drill!.hints > 0 && !e.drill!.fails && !e.drill!.reveals && !e.open);
  add('hints', hinted, `${plural(hinted.length, 'Übung', 'Übungen')} nur mit Hinweis gelöst`);
  const forgotten = cards.filter((c) => c.weak && c.state?.grade === 'again');
  add('forgotten', forgotten, `${plural(forgotten.length, 'Interviewkarte', 'Interviewkarten')} zuletzt vergessen`);
  const shaky = cards.filter((c) => c.weak && c.state?.grade !== 'again');
  add('shaky', shaky, `${plural(shaky.length, 'Interviewkarte', 'Interviewkarten')} ${shaky.length === 1 ? 'wackelt' : 'wackeln'} („Schwer“ oder mehrfach vergessen)`);
  if (stale) reasons.push({ kind: 'stale', text: `Seit ${stale.idle} Tagen nicht geübt – Auffrischung nach ${stale.interval} Tagen fällig`, weight: stale.weight });
  return reasons.sort((a, b) => b.weight - a.weight);
}

/** Why an exercise is in a round, e.g. "Lösung angesehen · 3 Fehlversuche · Stufe 1 von 3". */
export function exerciseWhy(signal: ExerciseSignal): string {
  const d = signal.drill;
  if (!d) return '';
  return [
    signal.open ? 'Noch nicht gelöst' : null,
    d.reveals ? 'Lösung angesehen' : null,
    d.fails ? plural(d.fails, 'Fehlversuch', 'Fehlversuche') : null,
    d.hints ? plural(d.hints, 'Hinweis', 'Hinweise') : null,
    d.box ? `Stufe ${d.box} von ${DRILL_MAX}` : null,
  ].filter(Boolean).join(' · ');
}
export function cardWhy(signal: CardSignal): string {
  const s = signal.state;
  if (!s) return 'Neue Karte';
  if (s.grade === 'again') return 'Zuletzt vergessen';
  if (s.grade === 'hard') return 'Zuletzt „Schwer“';
  if ((s.lapses ?? 0) >= 2) return `${s.lapses}× vergessen · Box ${s.box}`;
  return `Fällig · Box ${s.box}`;
}

/** Solved exercises to ask again: quick checks first, earlier trouble first, longest unpracticed first, spread over the module. */
export function refresherPicks(exercises: ExerciseSignal[], count: number, exclude = new Set<string>()): ExerciseSignal[] {
  const pool = exercises.filter((e) => e.solved && !exclude.has(e.id));
  const key = (e: ExerciseSignal) => [QUICK.has(e.type) ? 0 : 1, e.drill && (e.drill.fails || e.drill.reveals) ? 0 : 1, e.last ?? ''] as const;
  const picked: ExerciseSignal[] = [];
  while (picked.length < count && pool.length) {
    const distance = (e: ExerciseSignal) => picked.length ? Math.min(...picked.map((p) => Math.abs(p.number - e.number))) : e.number;
    pool.sort((a, b) => {
      const [ka, kb] = [key(a), key(b)];
      return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2]) || distance(b) - distance(a) || b.number - a.number;
    });
    picked.push(pool.shift()!);
  }
  return picked.sort((a, b) => a.number - b.number);
}

/**
 * The round for a topic: due weak exercises (strongest reasons first), refresher exercises if the module went stale,
 * then due cards, weak ones first. `practice` builds a voluntary round when nothing is due.
 */
export function planRound(report: Omit<TopicReport, 'plan' | 'minutes'>, practice = false): ReviewItem[] {
  const module = report.topic.module;
  const items: ReviewItem[] = [];
  const exercises = report.exercises.filter((e) => e.dueNow).sort((a, b) => b.weight - a.weight || a.number - b.number).slice(0, ROUND.exercises);
  for (const e of exercises) items.push({ kind: 'exercise', id: e.id, module: module!, number: e.number, type: e.type, reason: 'weak', why: exerciseWhy(e) });
  if (module && report.stale && exercises.length < ROUND.refresher) {
    for (const e of refresherPicks(report.exercises, ROUND.refresher - exercises.length, new Set(exercises.map((x) => x.id)))) {
      items.push({ kind: 'exercise', id: e.id, module, number: e.number, type: e.type, reason: 'refresh', why: `Auffrischung · zuletzt vor ${report.idle} Tagen geübt` });
    }
  }
  const cards = report.cards.filter((c) => c.dueNow).sort((a, b) => b.weight - a.weight || byWeakness(a.state!, b.state!)).slice(0, ROUND.cards);
  for (const c of cards) items.push({ kind: 'card', id: c.id, reason: c.weak ? 'weak' : 'due', why: cardWhy(c) });
  if (items.length || !practice) return items;
  if (module) for (const e of refresherPicks(report.exercises, ROUND.refresher)) items.push({ kind: 'exercise', id: e.id, module, number: e.number, type: e.type, reason: 'practice', why: e.last ? `Freiwillig · zuletzt vor ${daysBetween(e.last, localDay())} Tagen geübt` : 'Freiwillig' });
  const seen = report.cards.filter((c) => c.state).sort((a, b) => byWeakness(a.state!, b.state!)).slice(0, 5);
  for (const c of seen) items.push({ kind: 'card', id: c.id, reason: 'practice', why: cardWhy(c) });
  return items;
}
export const roundMinutes = (items: ReviewItem[]) => items.reduce((sum, item) => sum + MINUTES[item.kind === 'card' ? 'card' : item.type], 0);

export function analyzeTopic(area: AreaSummary, topic: TopicSummary, progress: AreaProgress, today = localDay()): TopicReport {
  const module = topic.module ? area.modules.find((m) => m.id === topic.module) : undefined;
  const exercises = module?.exercises.map((e, i) => exerciseSignal(e, i + 1, progress, today)) ?? [];
  const cards = topic.cards.map((id) => cardSignal(id, progress.cards[id], today));
  const started = exercises.some((e) => e.solved || e.drill) || cards.some((c) => c.state);
  const last = module ? latest(exercises.map((e) => e.last)) : latest(cards.map((c) => c.state?.last));
  const idle = last ? daysBetween(last, today) : null;
  const reps = module ? progress.topics[module.id]?.reps ?? 0 : 0;
  const interval = refreshInterval(reps);
  const learned = exercises.length > 0 && exercises.filter((e) => e.solved).length / exercises.length >= LEARNED;
  const stale = !!module && learned && idle !== null && idle >= interval;
  const staleWeight = stale ? 2.5 + Math.min((idle! - interval) / interval, 1) * 1.5 : 0;
  const score = exercises.filter((e) => e.dueNow).reduce((sum, e) => sum + e.weight, 0) + cards.filter((c) => c.dueNow).reduce((sum, c) => sum + c.weight, 0) + staleWeight;
  const weakDue = exercises.some((e) => e.dueNow) || cards.some((c) => c.weak && c.dueNow);
  const weak = exercises.some((e) => e.weak) || cards.some((c) => c.weak);
  const status: TopicStatus = weakDue ? 'due' : stale ? 'stale' : weak ? 'weak' : !started ? 'new' : !module || learned ? 'solid' : 'started';
  const upcoming = [...exercises.filter((e) => e.weak && !e.dueNow).map((e) => e.due), ...cards.filter((c) => c.weak && !c.dueNow).map((c) => c.state!.due)].filter((d): d is string => !!d).sort();
  const report = {
    area: area.id, topic, status, score, exercises, cards, started, idle, refresh: { reps, interval }, stale,
    reasons: reasonsOf(exercises, cards, stale ? { idle: idle!, interval, weight: staleWeight } : null),
    next: weakDue ? null : upcoming[0] ?? null,
  };
  const plan = planRound(report);
  return { ...report, plan, minutes: roundMinutes(plan) };
}

export const analyzeArea = (area: AreaSummary, progress: AreaProgress, today = localDay()): TopicReport[] =>
  area.topics.map((topic) => analyzeTopic(area, topic, progress, today));

/** Rated cards due today that no due topic's round asks, for the interview training. */
export function looseDueCards(reports: TopicReport[]): number {
  const planned = new Set(dueTopics(reports).flatMap((r) => r.plan.filter((i) => i.kind === 'card').map((i) => `${r.area}/${i.id}`)));
  return reports.reduce((n, r) => n + r.cards.filter((c) => c.state && c.dueNow && !planned.has(`${r.area}/${c.id}`)).length, 0);
}

/** Topics with something to review today, strongest reasons first. */
export const dueTopics = (reports: TopicReport[]) => reports.filter((r) => r.score > 0 && r.plan.length).sort((a, b) => b.score - a.score);

/** Today's plan: the most urgent topics that fit into the daily time budget (at least one), and the rest for later. */
export function dailyPlan(reports: TopicReport[], budget = DAILY.minutes): { today: TopicReport[]; later: TopicReport[]; minutes: number } {
  const today: TopicReport[] = [];
  const later: TopicReport[] = [];
  let minutes = 0;
  for (const report of dueTopics(reports)) {
    if (today.length < DAILY.topics && (!today.length || minutes + report.minutes <= budget)) { today.push(report); minutes += report.minutes; }
    else later.push(report);
  }
  return { today, later, minutes };
}
