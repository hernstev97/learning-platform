import { describe, expect, it } from 'vitest';
import { loadContent } from '../../tooling/content.ts';
import { applyEntries, type Entry, type Snapshot } from '../../convex/model.ts';
import { areaStats, freshProgress, sanitize } from './storage.ts';
import { latestPosition, legacyPosition, positionHref, projectSnapshot, safeDraft, toEntries } from './persistence.ts';

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
  it('selects the most recently visited area and projects, with safe removed-content fallbacks', () => {
    const first = applyEntries(empty, area.id, [{ kind: 'position', id: 'last', value: { page: 'cards' } }], 1);
    const second = applyEntries(first, area.id, [{ kind: 'position', id: 'last', value: { page: 'project', projectId: 'removed' } }], 2);
    expect(latestPosition(second, loaded.catalog)).toBe(`/${area.id}/projekte`);
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
