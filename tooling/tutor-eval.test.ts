import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContent } from './content.ts';
import { attemptIsWrong, DEFAULT_VARIANTS, estimateMicros, gradingSheet, loadCases, prepare, VARIANTS } from './tutor-eval.ts';
import { leaksSolution, tutorRequestProblem } from '../src/engine/tutor.ts';
import { tutorRequest } from '../src/engine/tutor-context.ts';

// The eval never calls a model here: it checks the cases and the prompts the live run would send.
describe('tutor eval cases', () => {
  const cases = loadCases();
  const prepared = prepare(cases);
  it('has 30 valid cases across the planned areas and levels', () => {
    expect(prepared).toHaveLength(30);
    const areas = cases.map((c) => c.exercise.split('/')[0]);
    for (const area of ['kotlin', 'rust', 'python', 'linux', 'git']) expect(areas).toContain(area);
    expect(prepared.filter((p) => p.exercise.type === 'explain')).toHaveLength(5);
    expect([1, 2, 3].map((level) => cases.filter((c) => c.level === level).length)).toEqual([10, 10, 10]);
    expect(areas.some((area) => area === 'narrative' || area === 'combat')).toBe(false);
  });
  it('stays under the 2 dollars planned in LRN-6 for the default variants', () => {
    const total = DEFAULT_VARIANTS.reduce((sum, name) => sum + estimateMicros(prepared, VARIANTS[name]), 0);
    expect(total).toBeLessThan(2_000_000);
  });
  it('writes a grading sheet from results', () => {
    const sheet = gradingSheet(prepared.slice(0, 1), [VARIANTS['sonnet-medium']], [{ case: prepared[0].case.id, variant: 'sonnet-medium', level: 1, text: 'Welchen Typ hat `erledigt / gesamt`?', leaked: false, retryText: null, retryLeaked: null, stop: 'end_turn', forbidden: [], ms: 6400, micros: 12_000, usage: { input: 400, cacheWrite: 7000, cacheRead: 0, output: 300 } }]);
    expect(sheet).toContain('| sonnet-medium | 1 | 0 / 0 | 6.4 s | 0.01 $ |');
    expect(sheet).toContain('> Welchen Typ hat `erledigt / gesamt`?');
  });
  it('does not count quoting the learner’s own attempt as giving the solution away', () => {
    for (const p of prepared) expect(leaksSolution(`Dein Versuch:\n${p.request.attempt}`, p.request.leak, p.request.attempt), p.case.id).toBe(false);
  });
  it('rejects a correct attempt', () => {
    const gap = loadContent(undefined, join(import.meta.dirname, 'fixtures')).areas.beispiel.modules['alle-typen'].exercises.find((e) => e.type === 'gap')!;
    expect(attemptIsWrong(gap, { g1: 'def', g2: 'x * 2' })).toBe('Versuch ist richtig');
    expect(attemptIsWrong(gap, { g1: 'fun', g2: 'x * 2' })).toBe(true);
  });
});

describe('tutor requests for all content', () => {
  // Every exercise must fit the server's limits, and restating its own task must not count as giving the answer away.
  const { areas } = loadContent();
  const all = Object.values(areas).flatMap((area) => Object.values(area.modules).flatMap((module) => module.exercises.map((exercise) => ({ area, module, exercise }))));
  it('fits every exercise', () => {
    const problems = all.flatMap(({ area, module, exercise }) => {
      const problem = tutorRequestProblem(tutorRequest({ areaId: area.id, module, exercise, draft: undefined, done: false, feedback: '', previous: [], question: '', level: 1 }));
      return problem ? [`${area.id}/${exercise.id}: ${problem}`] : [];
    });
    expect(problems).toEqual([]);
  });
  it('lets the tutor restate the task', () => {
    const flagged = all.filter(({ area, module, exercise }) => {
      const { leak } = tutorRequest({ areaId: area.id, module, exercise, draft: undefined, done: false, feedback: '', previous: [], question: '', level: 1 });
      return leaksSolution(leak.visible, leak);
    }).map(({ area, exercise }) => `${area.id}/${exercise.id}`);
    expect(flagged).toEqual([]);
  });
});
