import { describe, expect, it } from 'vitest';
import { addDays, convertLegacyBear, exportAll, freshProgress, gradeCard, keyFor, mergeProgress, parseBackup, readProgress, writeProgress } from './storage.ts';

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return { data, get length() { return data.size; }, key: (i: number) => [...data.keys()][i] ?? null, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

describe('progress storage', () => {
  it('round-trips and keeps areas separate', () => {
    const storage = memoryStorage();
    const progress = freshProgress();
    progress.done['m/a'] = { at: '2026-09-28', fp: 'abc' };
    progress.drafts['m/b'] = { g1: 'val' };
    expect(writeProgress(storage, 'rust', progress)).toBe(true);
    expect(readProgress(storage, 'rust').progress).toEqual(progress);
    expect(readProgress(storage, 'linux').progress).toEqual(freshProgress());
  });
  it('drops malformed parts and reports corrupt data', () => {
    const storage = memoryStorage({ [keyFor('rust')]: JSON.stringify({ version: 1, done: { x: { at: 1 }, y: { at: 'a', fp: 'b' } }, cards: { c: { box: 9, due: 'x' } }, last: 'javascript:alert(1)' }) });
    const { progress } = readProgress(storage, 'rust');
    expect(Object.keys(progress.done)).toEqual(['y']);
    expect(progress.cards).toEqual({});
    expect(progress.last).toBeNull();
    expect(readProgress(memoryStorage({ [keyFor('rust')]: '{bad' }), 'rust').warning).toBeTruthy();
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } };
    expect(readProgress(blocked, 'rust').progress).toEqual(freshProgress());
    expect(writeProgress(blocked, 'rust', freshProgress())).toBe(false);
  });
  it('schedules cards with Leitner intervals', () => {
    const first = gradeCard(undefined, true, '2026-09-28');
    expect(first).toMatchObject({ box: 1, due: '2026-09-29' });
    const second = gradeCard(first, true, '2026-09-29');
    expect(second).toMatchObject({ box: 2, due: '2026-10-02' });
    expect(gradeCard(second, false, '2026-10-02')).toMatchObject({ box: 1, due: '2026-10-02' });
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('exports, imports and merges without losing progress', () => {
    const storage = memoryStorage();
    const a = freshProgress();
    a.done['m/x'] = { at: '2026-09-01', fp: '1' };
    writeProgress(storage, 'python', a);
    storage.setItem('unrelated', 'x');
    const backup = exportAll(storage);
    expect(Object.keys(backup.areas)).toEqual(['python']);
    const parsed = parseBackup(JSON.stringify(backup));
    const local = freshProgress();
    local.done['m/y'] = { at: '2026-09-02', fp: '2' };
    const merged = mergeProgress(local, parsed.python);
    expect(Object.keys(merged.done).sort()).toEqual(['m/x', 'm/y']);
    expect(() => parseBackup('{"foo":1}')).toThrow();
  });
  it('converts progress from kotlin.kiumu.app', () => {
    const modules = [{ id: 'bear-01', exercises: [{ id: 'bear-01/bear-001', fingerprint: 'f1' }, { id: 'bear-01/bear-002', fingerprint: 'f2' }] }];
    const old = JSON.stringify({ version: 2, activeId: 'bear-002', drafts: { 'bear-002': { g1: '"Be' } }, completed: { 'bear-001': { answers: { g1: 'val' }, at: '2026-09-28', fingerprint: 'f1' }, 'bear-002': { answers: {}, at: 'x', fingerprint: 'stale' } } });
    const converted = convertLegacyBear(old, modules);
    expect(converted.done).toEqual({ 'bear-01/bear-001': { at: '2026-09-28', fp: 'f1' } });
    expect(converted.drafts['bear-01/bear-002']).toEqual({ g1: '"Be' });
  });
});
