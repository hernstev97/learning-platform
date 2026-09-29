import { describe, expect, it } from 'vitest';
import { loadContent } from '../../tooling/content.ts';
import { applyEntries, validateEntry, type Entry, type Position, type Snapshot } from '../../convex/model.ts';
import { areaStats, freshProgress, sanitize } from './storage.ts';
import { latestArea, legacyPosition, positionHref, projectSnapshot, resolveResume, safeDraft, toEntries } from './persistence.ts';

const loaded = loadContent(['kotlin']);
const area = loaded.catalog.areas[0];
const module = area.modules[0];
const exercise = module.exercises[0];
const empty: Snapshot = { entries: [], resets: [] };

describe('persistence projection and stable IDs', () => {
  it('derives totals from current fingerprints and ignores removed content', () => {
    const state = applyEntries(empty, area.id, [
      { kind: 'completion', id: exercise.id, value: { at: '2026-09-28', fp: exercise.fingerprint } },
      { kind: 'completion', id: module.exercises[1].id, value: { at: '2026-09-28', fp: 'outdated' } },
      { kind: 'completion', id: 'removed/exercise', value: { at: '2026-09-28', fp: 'unused' } },
    ], 1);
    const progress = projectSnapshot(state, loaded.catalog)[area.id];
    expect(areaStats(area, progress).done).toBe(1);
    expect(areaStats(area, progress).total).toBe(area.counts.exercises);
    expect(areaStats(area, progress).percent).toBe(Math.round(100 / area.counts.exercises));
    expect(progress.done['removed/exercise']).toBeDefined(); // Preserved for export and future curriculum reintroduction.
  });
  it('resume survives exercise insertion, module reorder and renaming a title', () => {
    const p = { page: 'exercise' as const, moduleId: module.id, exerciseId: exercise.id };
    const edited = structuredClone(area);
    const m = edited.modules[0]; m.title = 'Renamed';
    m.exercises.unshift({ ...exercise, id: `${module.id}/inserted` }); edited.modules.reverse();
    expect(positionHref(edited, p)).toBe(`/${area.id}/${module.id}/2`);
    m.exercises = []; expect(positionHref(edited, p)).toBe(`/${area.id}/${module.id}`);
    edited.modules = []; expect(positionHref(edited, p)).toBe(`/${area.id}`);
  });
  it('resolves old URL indexes once and rejects external or unrelated destinations', () => {
    expect(legacyPosition(area, `/${area.id}/${module.id}/1`)).toEqual({ page: 'exercise', moduleId: module.id, exerciseId: exercise.id });
    expect(legacyPosition(area, '//evil.example')).toBeNull();
    expect(legacyPosition(area, '/other/module/1')).toBeNull();
  });
  it('selects the most recently visited area, ignoring card reviews and unknown areas', () => {
    const first = applyEntries(empty, area.id, [{ kind: 'position', id: 'last', value: { page: 'lesson', moduleId: module.id } }], 1);
    const second = applyEntries(first, 'python', [{ kind: 'position', id: 'last', value: { page: 'cards' } }], 2);
    const third = applyEntries(second, 'removed-area', [{ kind: 'position', id: 'last', value: { page: 'lesson', moduleId: 'x' } }], 3);
    expect(latestArea(third, loaded.catalog)).toBe(area.id);
    expect(latestArea(empty, loaded.catalog)).toBeNull();
  });
  it('optimistic independent edits preserve other entries and removals remain explicit', () => {
    const lesson: Entry = { kind: 'lesson', id: module.id, completedAt: '2026-09-28' };
    const first = applyEntries(empty, area.id, [lesson], 1);
    const second = applyEntries(first, area.id, [{ kind: 'step', id: 'project/step', completed: true }], 2);
    const third = applyEntries(second, area.id, [{ ...lesson, completedAt: null }], 3);
    const p = projectSnapshot(third, loaded.catalog)[area.id];
    expect(p.read).toEqual({}); expect(p.projects.project.step).toBe(true);
    expect(third.entries).toHaveLength(2);
  });
  it('an empty legacy client produces no destructive writes', () => { expect(toEntries(freshProgress(), area)).toEqual([]); });
  it('round-trips review state of exercises and modules through backup entries', () => {
    const progress = freshProgress();
    progress.drills[exercise.id] = { box: 1, due: '2026-09-29', last: '2026-09-28', fails: 3, hints: 0, reveals: 1, open: 0 };
    progress.topics[module.id] = { reps: 1, last: '2026-09-28' };
    const entries = toEntries(progress, area);
    entries.forEach(validateEntry);
    const projected = projectSnapshot(applyEntries(empty, area.id, entries, 1), loaded.catalog)[area.id];
    expect(projected.drills).toEqual(progress.drills);
    expect(projected.topics).toEqual(progress.topics);
  });
  it('round-trips stable navigation through a backup even if the exercise index changes', () => {
    const position: Entry = { kind: 'position', id: 'last', value: { page: 'exercise', moduleId: module.id, exerciseId: exercise.id } };
    const p = projectSnapshot(applyEntries(empty, area.id, [position], 1), loaded.catalog)[area.id];
    const reordered = structuredClone(area); reordered.modules[0].exercises.reverse();
    expect(toEntries(sanitize(JSON.parse(JSON.stringify(p))), reordered)).toContainEqual(position);
  });
  it('rejects malformed renderer drafts and prototype keys in backups', () => {
    const gap = loaded.areas.kotlin.modules['bear-01'].exercises[0];
    expect(safeDraft(gap, [1, 2])).toBeUndefined(); expect(safeDraft(gap, { g1: 'val' })).toEqual({ g1: 'val' });
    const p = sanitize(JSON.parse('{"version":1,"done":{"__proto__":{"at":"2026-09-28","fp":"x"}},"projects":{"constructor":{"x":true}}}'));
    expect(Object.keys(p.done)).toEqual([]); expect(p.projects).toEqual({});
  });
});

describe('continue learning', () => {
  const next = area.modules[1];
  const at = (position: Position, entries: Entry[] = []) => {
    const state = applyEntries(empty, area.id, [...entries, { kind: 'position', id: 'last', value: position }], 1);
    return resolveResume(area, projectSnapshot(state, loaded.catalog)[area.id]);
  };
  const solve = (m: typeof module, count = m.exercises.length): Entry[] =>
    m.exercises.slice(0, count).map((e) => ({ kind: 'completion', id: e.id, value: { at: '2026-09-28', fp: e.fingerprint } }));

  it('returns the stored open exercise with module context and module progress', () => {
    const resume = at({ page: 'exercise', moduleId: module.id, exerciseId: module.exercises[2].id }, solve(module, 1));
    expect(resume).toMatchObject({ href: `/${area.id}/${module.id}/3`, moved: null, started: true, step: { page: 'exercise', index: 3, total: module.exercises.length } });
    expect(resume.module).toMatchObject({ id: module.id, title: module.title, number: 1, done: 1, total: module.exercises.length });
  });
  it('skips a solved exercise to the next open one in the same module', () => {
    const resume = at({ page: 'exercise', moduleId: module.id, exerciseId: exercise.id }, solve(module, 2));
    expect(resume).toMatchObject({ href: `/${area.id}/${module.id}/3`, moved: 'solved' });
  });
  it('wraps to earlier open exercises of the module before leaving it', () => {
    const last = module.exercises.at(-1)!;
    const resume = at({ page: 'exercise', moduleId: module.id, exerciseId: last.id }, [...solve(module).slice(1)]);
    expect(resume).toMatchObject({ href: `/${area.id}/${module.id}/1`, moved: 'solved' });
  });
  it('continues with the next module once the current one is complete', () => {
    expect(at({ page: 'exercise', moduleId: module.id, exerciseId: exercise.id }, solve(module))).toMatchObject({ href: `/${area.id}/${next.id}`, moved: 'solved', step: { page: 'lesson' } });
    expect(at({ page: 'lesson', moduleId: module.id }, solve(module))).toMatchObject({ href: `/${area.id}/${next.id}`, moved: 'solved' });
    expect(at({ page: 'lesson', moduleId: module.id }, solve(module, 1))).toMatchObject({ href: `/${area.id}/${module.id}`, moved: null });
  });
  it('enters an already begun module at its first open exercise', () => {
    expect(at({ page: 'lesson', moduleId: module.id }, [...solve(module), ...solve(next, 1)])).toMatchObject({ href: `/${area.id}/${next.id}/2` });
  });
  it('falls back safely when content was removed or moved', () => {
    expect(at({ page: 'lesson', moduleId: 'removed-module' })).toMatchObject({ href: `/${area.id}/${module.id}`, moved: 'removed' });
    expect(at({ page: 'exercise', moduleId: module.id, exerciseId: `${module.id}/removed` }, solve(module, 1))).toMatchObject({ href: `/${area.id}/${module.id}/2`, moved: 'removed' });
    expect(at({ page: 'project', projectId: 'removed' })).toMatchObject({ href: `/${area.id}/${module.id}`, moved: 'removed' });
    const project = area.projects[0];
    expect(at({ page: 'project', projectId: project.id })).toMatchObject({ href: `/${area.id}/projekte/${project.id}`, step: { page: 'project', title: project.title } });
  });
  it('treats outdated fingerprints as open work and old card positions as no position', () => {
    const stale: Entry = { kind: 'completion', id: exercise.id, value: { at: '2026-09-28', fp: 'outdated' } };
    expect(at({ page: 'exercise', moduleId: module.id, exerciseId: exercise.id }, [stale])).toMatchObject({ href: `/${area.id}/${module.id}/1`, moved: null });
    expect(at({ page: 'cards' })).toMatchObject({ href: `/${area.id}/${module.id}`, moved: null, started: false });
  });
  it('points to interview training once every exercise is solved', () => {
    const all = area.modules.flatMap((m) => solve(m));
    const state = applyEntries(empty, area.id, all, 1);
    expect(resolveResume(area, projectSnapshot(state, loaded.catalog)[area.id])).toMatchObject({ href: `/${area.id}/karten`, step: { page: 'finished' }, started: true });
  });
});
