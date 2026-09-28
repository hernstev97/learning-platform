import type { AreaSummary, Catalog, Exercise } from '../content/types.ts';
import { freshProgress, type AreaProgress } from './storage.ts';
import { entryKey, type Entry, type Position, type Snapshot } from '../../convex/model.ts';

/** URLs stay unchanged; stored resume positions use content IDs, never exercise indexes. */
export function positionHref(area: AreaSummary, position: Position): string {
  if (position.page === 'cards') return `/${area.id}/karten`;
  if (position.page === 'project') return area.projects.some((p) => p.id === position.projectId) ? `/${area.id}/projekte/${position.projectId}` : `/${area.id}/projekte`;
  const module = area.modules.find((m) => m.id === position.moduleId);
  if (!module) return `/${area.id}`;
  const base = `/${area.id}/${module.id}`;
  if (position.page === 'lesson') return base;
  const index = module.exercises.findIndex((e) => e.id === position.exerciseId);
  return index < 0 ? base : `${base}/${index + 1}`;
}

export function legacyPosition(area: AreaSummary, path: string | null): Position | null {
  if (!path) return null;
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== area.id) return null;
  if (parts[1] === 'karten') return { page: 'cards' };
  if (parts[1] === 'projekte' && area.projects.some((p) => p.id === parts[2])) return { page: 'project', projectId: parts[2] };
  const module = area.modules.find((m) => m.id === parts[1]);
  if (!module) return null;
  const exercise = module.exercises[Number(parts[2]) - 1];
  return exercise ? { page: 'exercise', moduleId: module.id, exerciseId: exercise.id } : { page: 'lesson', moduleId: module.id };
}

export function toEntries(progress: AreaProgress, area?: AreaSummary): Entry[] {
  const entries: Entry[] = [];
  for (const [id, completedAt] of Object.entries(progress.read)) entries.push({ kind: 'lesson', id, completedAt });
  for (const [id, value] of Object.entries(progress.done)) entries.push({ kind: 'completion', id, value });
  for (const id of Object.keys(progress.revealed)) entries.push({ kind: 'revealed', id, value: true });
  for (const [id, value] of Object.entries(progress.cards)) entries.push({ kind: 'card', id, value });
  for (const [project, steps] of Object.entries(progress.projects)) for (const [step, completed] of Object.entries(steps)) entries.push({ kind: 'step', id: `${project}/${step}`, completed });
  const position = progress.position ?? (area && legacyPosition(area, progress.last));
  if (position) entries.push({ kind: 'position', id: 'last', value: position });
  return entries;
}

export function projectSnapshot(snapshot: Snapshot, catalog: Catalog): Record<string, AreaProgress> {
  const areas: Record<string, AreaProgress> = Object.fromEntries(catalog.areas.map((area) => [area.id, freshProgress()]));
  for (const { areaId, value } of snapshot.entries) {
    const p = areas[areaId] ??= freshProgress();
    switch (value.kind) {
      case 'lesson': if (value.completedAt) p.read[value.id] = value.completedAt; break;
      case 'completion': if (value.value) p.done[value.id] = value.value; break;
      case 'revealed': if (value.value) p.revealed[value.id] = true; break;
      case 'card': p.cards[value.id] = value.value; break;
      case 'step': {
        const [project, step] = value.id.split('/');
        if (value.completed) (p.projects[project] ??= {})[step] = true;
        break;
      }
      case 'position': {
        p.position = value.value;
        const area = catalog.areas.find((a) => a.id === areaId);
        if (area) p.last = positionHref(area, value.value);
      }
    }
  }
  return areas;
}

export function latestPosition(snapshot: Snapshot, catalog: Catalog): string | null {
  const last = snapshot.entries.filter((e) => e.value.kind === 'position' && catalog.areas.some((a) => a.id === e.areaId)).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return last?.value.kind === 'position' ? positionHref(catalog.areas.find((a) => a.id === last.areaId)!, last.value.value) : null;
}

/** Do not hand unchecked JSON to renderers that expect arrays/objects of a specific shape. */
export function safeDraft(exercise: Exercise, value: unknown): unknown {
  const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
  const numbers = (x: unknown, max: number): x is number[] => Array.isArray(x) && new Set(x).size === x.length && x.every((n) => Number.isInteger(n) && n >= 0 && n < max);
  const strings = (x: unknown): boolean => record(x) && Object.values(x).every((s) => typeof s === 'string');
  switch (exercise.type) {
    case 'gap': return strings(value) ? value : undefined;
    case 'choice': return numbers(value, exercise.options.length) ? value : undefined;
    case 'order': return numbers(value, exercise.lines.length) && value.length === exercise.lines.length ? value : undefined;
    case 'output': case 'code': return typeof value === 'string' ? value : undefined;
    case 'command': return record(value) && typeof value.value === 'string' && Array.isArray(value.history) && value.history.every((x) => typeof x === 'string') ? value : undefined;
    case 'practice': return record(value) && typeof value.code === 'string' && numbers(value.checked, exercise.checklist.length) ? value : undefined;
    case 'explain': return record(value) && typeof value.text === 'string' && typeof value.revealed === 'boolean' && numbers(value.checked, exercise.points.length) ? value : undefined;
    case 'bug': return record(value) && numbers(value.selected, exercise.code.split('\n').length + 1) && typeof value.found === 'boolean' && strings(value.fixes) ? value : undefined;
  }
}

export const sameEntry = (state: Snapshot, areaId: string, value: Entry): boolean => {
  const current = state.entries.find((e) => e.areaId === areaId && e.key === entryKey(value));
  return !!current && JSON.stringify(current.value) === JSON.stringify(value);
};
