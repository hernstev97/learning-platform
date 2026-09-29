import { describe, expect, it } from 'vitest';
import { addDays, convertLegacyBear, exportAll, freshProgress, keyFor, mergeProgress, parseBackup, readProgress, sanitize, writeProgress } from './storage.ts';
import { schedule } from './review.ts';

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
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('keeps mastery data of cards in backups and drops malformed values', () => {
    const cards = { a: { box: 2, due: '2026-10-01', seen: 4, lapses: 2, grade: 'hard' }, b: { box: 1, due: '2026-10-01', seen: 1, lapses: -1, grade: 'perfect' } };
    expect(sanitize({ ...freshProgress(), cards }).cards).toEqual({ a: cards.a, b: { box: 1, due: '2026-10-01', seen: 1 } });
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
  it('keeps valid lesson notes in backups and never overwrites an existing note on merge', () => {
    const parsed = parseBackup(JSON.stringify({ app: 'learn.kiumu.app', exported: '2026-09-29', areas: { python: { version: 1, notes: { intro: 'Mitnehmen', second: 'Neu', blank: '  ', long: 'x'.repeat(20_001), bad: 3 } } } }));
    expect(parsed.python.notes).toEqual({ intro: 'Mitnehmen', second: 'Neu' });
    expect(sanitize({ version: 1 }).notes).toBeUndefined();
    const local = freshProgress();
    local.notes = { intro: 'Lokal' };
    expect(mergeProgress(local, parsed.python).notes).toEqual({ intro: 'Lokal', second: 'Neu' });
  });
  it('converts progress from kotlin.kiumu.app', () => {
    const modules = [{ id: 'bear-01', exercises: [{ id: 'bear-01/bear-001', fingerprint: 'f1' }, { id: 'bear-01/bear-002', fingerprint: 'f2' }] }];
    const old = JSON.stringify({ version: 2, activeId: 'bear-002', drafts: { 'bear-002': { g1: '"Be' } }, completed: { 'bear-001': { answers: { g1: 'val' }, at: '2026-09-28', fingerprint: 'f1' }, 'bear-002': { answers: {}, at: 'x', fingerprint: 'stale' } } });
    const converted = convertLegacyBear(old, modules);
    expect(converted.done).toEqual({ 'bear-01/bear-001': { at: '2026-09-28', fp: 'f1' } });
    expect(converted.drafts['bear-01/bear-002']).toEqual({ g1: '"Be' });
  });
  it('imports the later review on the same day without reverting it on a second import', () => {
    const older = freshProgress();
    older.cards.c = schedule(undefined, 'again', '2026-09-28');
    const newer = freshProgress();
    newer.cards.c = schedule(older.cards.c, 'good', '2026-09-28');
    const merged = mergeProgress(older, newer);
    expect(merged.cards.c).toEqual(newer.cards.c);
    expect(mergeProgress(merged, older).cards.c).toEqual(newer.cards.c);
  });
  it('restores only local learning routes as resume destinations', () => {
    for (const last of ['//example.com', '/\\example.com', '/%E0%A4%A']) {
      expect(sanitize({ ...freshProgress(), last }).last).toBeNull();
    }
    expect(sanitize({ ...freshProgress(), last: '/python/python-einstieg/2' }).last).toBe('/python/python-einstieg/2');
  });
});
