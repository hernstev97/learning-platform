import { describe, expect, it } from 'vitest';
import type { DrillEvent } from '../../convex/model.ts';
import { drill, legacyDrill, refreshInterval, refreshTopic } from './drill.ts';
import type { DrillState } from './storage.ts';

const today = '2026-09-28';
const run = (events: DrillEvent[], review = false, state?: DrillState) => events.reduce<DrillState | undefined>((s, event) => drill(s, event, today, review), state);

describe('exercise review rules', () => {
  it('needs no record for a clean first solve, but keeps one for a clean review', () => {
    expect(run(['solve'])).toBeUndefined();
    expect(run(['solve'], true)).toEqual({ box: 0, last: today, fails: 0, hints: 0, reveals: 0, open: 0 });
  });
  it('counts wrong checks, hints and shown solutions as trouble until the next solve', () => {
    expect(run(['fail', 'hint', 'fail'])).toEqual({ box: 0, last: today, fails: 2, hints: 1, reveals: 0, open: 3 });
    expect(run(['reveal'])).toMatchObject({ reveals: 1, open: 3 });
  });
  it('schedules by trouble: heavy → tomorrow, some → in four days, none → off the list', () => {
    expect(run(['fail', 'fail', 'fail', 'solve'])).toMatchObject({ box: 1, due: '2026-09-29', open: 0 });
    expect(run(['reveal', 'solve'])).toMatchObject({ box: 1, due: '2026-09-29' });
    expect(run(['hint', 'solve'])).toMatchObject({ box: 2, due: '2026-10-02' });
    expect(run(['fail', 'solve'])).toMatchObject({ box: 2, due: '2026-10-02' });
  });
  it('moves a weak exercise up with clean reviews and takes it off the list after the last box', () => {
    const weak = run(['reveal', 'solve'])!;
    const second = drill(weak, 'solve', today, true)!;
    expect(second).toMatchObject({ box: 2, due: '2026-10-02' });
    const third = drill(second, 'solve', today, true)!;
    expect(third).toMatchObject({ box: 3, due: '2026-10-08' });
    const cleared = drill(third, 'solve', today, true)!;
    expect(cleared.box).toBe(0);
    expect(cleared).not.toHaveProperty('due');
    expect(cleared).toMatchObject({ reveals: 1, fails: 0 });
  });
  it('drops back after new trouble in a review, never above box 2', () => {
    const three: DrillState = { box: 3, due: today, last: today, fails: 1, hints: 0, reveals: 0, open: 0 };
    expect(run(['fail', 'solve'], true, three)).toMatchObject({ box: 2, fails: 2 });
    expect(run(['fail', 'fail', 'fail', 'solve'], true, three)).toMatchObject({ box: 1 });
    expect(run(['hint', 'solve'], true, { ...three, box: 1 })).toMatchObject({ box: 1 });
  });
  it('treats a solution shown before recording started as heavy trouble', () => {
    expect(legacyDrill(true, true, '2026-09-01')).toMatchObject({ box: 1, due: '2026-09-02', reveals: 1, open: 0 });
    expect(legacyDrill(false, true, '2026-09-01')).toMatchObject({ box: 0, reveals: 1, open: 3 });
    expect(legacyDrill(false, false, '2026-09-01')).toBeUndefined();
    expect(drill(legacyDrill(false, true, today), 'solve', today, false)).toMatchObject({ box: 1 });
  });
  it('spaces module refreshers further apart after each clean one and starts over after trouble', () => {
    const first = refreshTopic(undefined, true, today);
    expect(first).toEqual({ reps: 1, last: today });
    expect([0, 1, 2, 3, 9].map(refreshInterval)).toEqual([10, 30, 75, 180, 180]);
    expect(refreshTopic(refreshTopic(first, true, today), false, today)).toEqual({ reps: 0, last: today });
  });
});
