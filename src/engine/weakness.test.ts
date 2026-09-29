import { describe, expect, it } from 'vitest';
import type { AreaSummary, ExerciseType } from '../content/types.ts';
import { freshProgress, type AreaProgress, type DrillState } from './storage.ts';
import { analyzeArea, dailyPlan, looseDueCards, planRound, refresherPicks } from './weakness.ts';

const today = '2026-09-28';
const types: ExerciseType[] = ['choice', 'gap', 'explain', 'output', 'bug', 'practice'];
const module = (id: string, count: number) => ({ id, title: id.toUpperCase(), summary: '', level: 1 as const, minutes: 60, bear: false, exercises: Array.from({ length: count }, (_, i) => ({ id: `${id}/e${i + 1}`, type: types[i % types.length], fingerprint: 'fp' })) });
const area = {
  id: 'demo', title: 'Demo', modules: [module('eins', 6), module('zwei', 4)],
  cards: ['c1', 'c2', 'c3'],
  topics: [
    { id: 'eins', title: 'EINS', module: 'eins', cards: ['c1', 'c2'] },
    { id: 'zwei', title: 'ZWEI', module: 'zwei', cards: [] },
    { id: 'interview-praxis', title: 'Interview: Praxis', module: null, cards: ['c3'] },
  ],
} as unknown as AreaSummary;
const drill = (extra: Partial<DrillState>): DrillState => ({ box: 0, last: '2026-09-20', fails: 0, hints: 0, reveals: 0, open: 0, ...extra });
const solve = (p: AreaProgress, ids: string[], at = '2026-09-20T10:00:00.000Z', help = false) => { for (const id of ids) p.done[id] = { at, fp: 'fp', ...(help ? { help } : {}) }; };
const report = (p: AreaProgress, id: string, day = today) => analyzeArea(area, p, day).find((r) => r.topic.id === id)!;

describe('weak spots', () => {
  it('suggests nothing without progress', () => {
    const reports = analyzeArea(area, freshProgress(), today);
    expect(reports.map((r) => r.status)).toEqual(['new', 'new', 'new']);
    expect(dailyPlan(reports).today).toEqual([]);
  });
  it('brings back an exercise solved with trouble when it is due, and explains why', () => {
    const p = freshProgress();
    solve(p, ['eins/e1', 'eins/e2']);
    p.drills['eins/e2'] = drill({ box: 1, due: '2026-09-27', fails: 3, hints: 1 });
    const r = report(p, 'eins');
    expect(r.status).toBe('due');
    expect(r.reasons.map((x) => x.text)).toEqual(['3 Fehlversuche in 1 Übung']);
    expect(r.plan).toEqual([{ kind: 'exercise', id: 'eins/e2', module: 'eins', number: 2, type: 'gap', reason: 'weak', why: '3 Fehlversuche · 1 Hinweis · Stufe 1 von 3' }]);
    expect(r.minutes).toBe(2);
    expect(report(p, 'eins', '2026-09-26')).toMatchObject({ status: 'weak', next: '2026-09-27', score: 0, plan: [] });
  });
  it('uses solutions shown before recording started', () => {
    const p = freshProgress();
    solve(p, ['eins/e1'], '2026-09-10T08:00:00.000Z', true);
    p.revealed['eins/e3'] = true;
    const r = report(p, 'eins');
    expect(r.exercises.filter((e) => e.dueNow).map((e) => e.id)).toEqual(['eins/e1', 'eins/e3']);
    expect(r.reasons.map((x) => x.kind)).toEqual(['revealed', 'open']);
    expect(r.reasons[0].text).toBe('Lösung bei 2 Übungen angesehen');
  });
  it('lists unsolved attempts from the next day on, not while still working on them', () => {
    const p = freshProgress();
    p.drills['zwei/e1'] = drill({ fails: 2, open: 2, last: today });
    expect(report(p, 'zwei')).toMatchObject({ status: 'weak', next: '2026-09-29' });
    const tomorrow = report(p, 'zwei', '2026-09-29');
    expect(tomorrow.status).toBe('due');
    expect(tomorrow.reasons.map((x) => x.text)).toEqual(['1 Übung angefangen, aber noch nicht gelöst', '2 Fehlversuche in 1 Übung']);
    expect(tomorrow.plan[0].why).toBe('Noch nicht gelöst · 2 Fehlversuche');
  });
  it('waits until tomorrow after new trouble today, even if the exercise was due before', () => {
    const p = freshProgress();
    solve(p, ['eins/e2']);
    p.drills['eins/e2'] = drill({ box: 1, due: '2026-09-25', last: today, fails: 2, reveals: 1, open: 3 });
    expect(report(p, 'eins')).toMatchObject({ status: 'weak', next: '2026-09-29', plan: [] });
  });
  it('asks for a refresher once a learned module was left alone long enough, then waits longer', () => {
    const p = freshProgress();
    solve(p, ['eins/e1', 'eins/e2', 'eins/e3', 'eins/e4', 'eins/e5', 'eins/e6'], '2026-09-10T10:00:00.000Z');
    const r = report(p, 'eins');
    expect(r).toMatchObject({ status: 'stale', stale: true, idle: 18, refresh: { reps: 0, interval: 10 } });
    expect(r.reasons[0].text).toBe('Seit 18 Tagen nicht geübt – Auffrischung nach 10 Tagen fällig');
    // Quick checks first, spread over the module; explain and practice only if nothing else is left.
    expect(r.plan.map((i) => i.kind === 'exercise' && [i.number, i.type, i.reason])).toEqual([[1, 'choice', 'refresh'], [4, 'output', 'refresh'], [5, 'bug', 'refresh']]);
    p.topics.eins = { reps: 1, last: '2026-09-20' };
    p.drills['eins/e1'] = drill({ last: '2026-09-20' });
    expect(report(p, 'eins')).toMatchObject({ status: 'solid', stale: false, refresh: { interval: 30 } });
  });
  it('does not treat a barely started module as stale or as solid', () => {
    const p = freshProgress();
    solve(p, ['eins/e1', 'eins/e2'], '2026-08-01T10:00:00.000Z');
    expect(report(p, 'eins')).toMatchObject({ status: 'started', stale: false });
  });
  it('bundles forgotten cards with their module; routine due cards join a round but do not start one', () => {
    const p = freshProgress();
    p.cards.c1 = { box: 1, due: today, seen: 3, last: '2026-09-27', lapses: 1, grade: 'again' };
    p.cards.c2 = { box: 4, due: today, seen: 5, last: '2026-09-12', grade: 'good' };
    p.cards.c3 = { box: 3, due: today, seen: 3, last: '2026-09-21', grade: 'good' };
    const eins = report(p, 'eins');
    expect(eins.status).toBe('due');
    expect(eins.reasons.map((x) => x.text)).toEqual(['1 Interviewkarte zuletzt vergessen']);
    expect(eins.plan.map((i) => [i.id, i.reason, i.why])).toEqual([['c1', 'weak', 'Zuletzt vergessen'], ['c2', 'due', 'Fällig · Box 4']]);
    expect(report(p, 'interview-praxis')).toMatchObject({ status: 'solid', score: 0 });
    // Only the routine card outside every due round is left for the interview training.
    expect(looseDueCards(analyzeArea(area, p, today))).toBe(1);
  });
  it('plans the most urgent topics within the daily time budget, always at least one', () => {
    const p = freshProgress();
    solve(p, ['eins/e1', 'zwei/e1']);
    p.drills['eins/e1'] = drill({ box: 1, due: today, reveals: 1 });
    p.drills['zwei/e1'] = drill({ box: 2, due: today, fails: 1 });
    p.cards.c3 = { box: 1, due: today, seen: 2, grade: 'hard' };
    const reports = analyzeArea(area, p, today);
    expect(dailyPlan(reports).today.map((r) => r.topic.id)).toEqual(['eins', 'zwei', 'interview-praxis']);
    const tight = dailyPlan(reports, 1);
    expect(tight.today.map((r) => r.topic.id)).toEqual(['eins']);
    expect(tight.later.map((r) => r.topic.id)).toEqual(['zwei', 'interview-praxis']);
  });
  it('offers a voluntary round when nothing is due', () => {
    const p = freshProgress();
    solve(p, ['eins/e1', 'eins/e2'], `${today}T08:00:00.000Z`);
    p.cards.c1 = { box: 3, due: '2026-10-05', seen: 2, grade: 'good' };
    const r = report(p, 'eins');
    expect(r.plan).toEqual([]);
    expect(planRound(r, true).map((i) => [i.id, i.reason])).toEqual([['eins/e1', 'practice'], ['eins/e2', 'practice'], ['c1', 'practice']]);
  });
  it('picks refresher exercises with earlier trouble before the longest unpracticed ones', () => {
    const p = freshProgress();
    solve(p, area.modules[0].exercises.map((e) => e.id), '2026-09-01T10:00:00.000Z');
    p.drills['eins/e2'] = drill({ last: '2026-09-15', fails: 4 });
    p.drills['eins/e1'] = drill({ last: '2026-09-15' });
    const exercises = report(p, 'eins').exercises;
    expect(refresherPicks(exercises, 2).map((e) => e.number)).toEqual([2, 5]);
    expect(refresherPicks(exercises, 6).map((e) => e.number)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

