import { describe, expect, it } from 'vitest';
import { chapters, sourceFiles, tasks } from './curriculum';
import { assemble, isCorrect, isGapCorrect, solution } from './validation';
import { freshProgress, LEGACY_KEY, readProgress, STORAGE_KEY, writeProgress } from './storage';
import type { Answers } from './types';

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
function dedent(value: string): string {
  const lines = value.split('\n');
  const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)![0].length));
  return lines.map((line) => line.trim() ? line.slice(indent) : '').join('\n');
}

describe('Kotlin reconstruction', () => {
  it('does not merge identifier parts or compound operators', () => {
    const valGap = tasks[0].gaps[0];
    expect(isGapCorrect(valGap, ' val ')).toBe(true);
    expect(isGapCorrect(valGap, 'v al')).toBe(false);
    expect(isGapCorrect(valGap, 'VAL')).toBe(false);
    expect(isGapCorrect(valGap, 'val // comment')).toBe(false);
    const safe = tasks[24].gaps[0];
    expect(isGapCorrect(safe, '?.')).toBe(true);
    expect(isGapCorrect(safe, '? .')).toBe(false);
  });
  it('preserves Kotlin strings, escapes and numeric literal suffixes', () => {
    const string = tasks[1].gaps[0];
    expect(isGapCorrect(string, '"Bear"')).toBe(true);
    expect(isGapCorrect(string, "'Bear'")).toBe(false);
    expect(isGapCorrect(string, '" Bear "')).toBe(false);
    const regex = tasks[90].gaps[1];
    expect(isGapCorrect(regex, String.raw`replace(Regex("\\s+"), " ")`)).toBe(true);
    expect(isGapCorrect(regex, String.raw`replace(Regex("\s+"), " ")`)).toBe(false);
    expect(isGapCorrect(tasks[99].gaps[6], 'Progress(if (onTrack) value else value * 0.6, onTrack)')).toBe(false);
  });
  it('accepts harmless token spacing in long expressions', () => {
    const gap = tasks[70].gaps[0];
    expect(isGapCorrect(gap, 'UUID . randomUUID ( ) . toString ( )')).toBe(true);
  });
  it('only completes a task once every gap is correct', () => {
    const task = tasks[99];
    const answers: Answers = {};
    for (const gap of task.gaps) {
      expect(isCorrect(task, answers)).toBe(false);
      answers[gap.id] = gap.answers[0];
    }
    expect(isCorrect(task, answers)).toBe(true);
    answers.g3 = 'false';
    expect(isCorrect(task, answers)).toBe(false);
  });
  it.each(tasks)('$id reconstructs its exact Bear source excerpt', (task) => {
    const original = sourceFiles[task.source.file].split('\n').slice(task.source.start - 1, task.source.end).join('\n');
    expect(assemble(task, solution(task))).toBe(dedent(original));
    expect(isCorrect(task, solution(task))).toBe(true);
    expect(isCorrect(task, {})).toBe(false);
    expect(task.code.match(/⟦\d+⟧/g)).toHaveLength(task.gaps.length);
    for (const gap of task.gaps) {
      expect(isGapCorrect(gap, '')).toBe(false);
      expect(isGapCorrect(gap, 'incorrect')).toBe(false);
      expect(task.code.match(new RegExp(`⟦${gap.id.slice(1)}⟧`, 'g'))).toHaveLength(1);
    }
    expect(task.resources.length).toBeGreaterThan(0);
    expect(task.wiki.body.length).toBeGreaterThan(70);
  });
  it('contains a progressive 100-task course and complex final chapters', () => {
    expect(tasks).toHaveLength(100);
    expect(new Set(tasks.map((task) => task.id)).size).toBe(100);
    chapters.forEach((_, index) => expect(tasks.filter((task) => task.chapter === index)).toHaveLength(10));
    expect(tasks.slice(0, 10).every((task) => task.gaps.length === 1)).toBe(true);
    expect(tasks.slice(90).every((task) => task.gaps.length >= 3)).toBe(true);
    expect(tasks[99].gaps).toHaveLength(7);
    expect(Object.keys(sourceFiles)).toHaveLength(21);
  });
});

describe('Bear progress', () => {
  it('retains partially correct drafts and completion snapshots independently', () => {
    const storage = memoryStorage();
    const progress = freshProgress();
    const task = tasks[99];
    progress.activeId = task.id;
    progress.drafts[task.id] = { g1: task.gaps[0].answers[0], g2: 'norm' };
    progress.completed[task.id] = { answers: solution(task), at: '2026-09-27', fingerprint: task.fingerprint };
    expect(writeProgress(storage, progress)).toBe(true);
    expect(readProgress(storage).progress).toEqual(progress);
  });
  it('preserves the legacy course verbatim, without marking new Bear tasks complete', () => {
    const old = JSON.stringify({ version: 1, completed: { val: { answer: 'val' } } });
    const storage = memoryStorage({ [LEGACY_KEY]: old });
    const loaded = readProgress(storage);
    expect(loaded.legacy).toBe(true);
    expect(loaded.progress).toEqual(freshProgress());
    writeProgress(storage, loaded.progress);
    expect(storage.getItem(LEGACY_KEY)).toBe(old);
  });
  it('rejects incomplete completions, stale fingerprints and malformed drafts', () => {
    const task = tasks[99];
    const data = { version: 2, activeId: 'deleted', drafts: { [task.id]: { g1: 42, g2: 'draft', unknown: 'x' } }, completed: { [task.id]: { answers: { g1: 'normalize(typed)' }, at: 'today', fingerprint: task.fingerprint }, [tasks[0].id]: { answers: solution(tasks[0]), at: 'today', fingerprint: 'old' } } };
    const loaded = readProgress(memoryStorage({ [STORAGE_KEY]: JSON.stringify(data) }));
    expect(loaded.progress).toEqual({ ...freshProgress(), drafts: { [task.id]: { g2: 'draft' } } });
  });
  it('reports corrupt reads and failed writes without preventing study', () => {
    expect(readProgress(memoryStorage({ [STORAGE_KEY]: '{bad' })).warning).toBeTruthy();
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } };
    expect(readProgress(blocked).progress).toEqual(freshProgress());
    expect(writeProgress(blocked, freshProgress())).toBe(false);
  });
});
