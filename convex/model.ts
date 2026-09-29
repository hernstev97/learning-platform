import { ConvexError, v, type Infer } from 'convex/values';

export const completion = v.object({ at: v.string(), fp: v.string(), help: v.optional(v.boolean()) });
export const grade = v.union(v.literal('again'), v.literal('hard'), v.literal('good'), v.literal('easy'));
export type Grade = Infer<typeof grade>;
/** Self-ratings after a card review, from weakest to strongest. */
export const GRADES: readonly Grade[] = ['again', 'hard', 'good', 'easy'];
/** lapses counts "again" ratings; grade is the latest rating. Both are absent on cards reviewed before four ratings existed. */
export const cardState = v.object({ box: v.number(), due: v.string(), seen: v.number(), last: v.optional(v.string()), lapses: v.optional(v.number()), grade: v.optional(grade) });
export const position = v.union(
  v.object({ page: v.literal('lesson'), moduleId: v.string() }),
  v.object({ page: v.literal('exercise'), moduleId: v.string(), exerciseId: v.string() }),
  v.object({ page: v.literal('project'), projectId: v.string() }),
  v.object({ page: v.literal('cards') }),
);
export const entry = v.union(
  v.object({ kind: v.literal('lesson'), id: v.string(), completedAt: v.union(v.string(), v.null()) }),
  v.object({ kind: v.literal('completion'), id: v.string(), value: v.union(completion, v.null()) }),
  v.object({ kind: v.literal('revealed'), id: v.string(), value: v.boolean() }),
  v.object({ kind: v.literal('card'), id: v.string(), value: cardState }),
  v.object({ kind: v.literal('step'), id: v.string(), completed: v.boolean() }),
  v.object({ kind: v.literal('position'), id: v.literal('last'), value: position }),
);
export type Entry = Infer<typeof entry>;
export type Position = Infer<typeof position>;
/** Portable backups may come from older or manually edited files. */
export function parsePosition(input: unknown): Position | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  let result: Position;
  if (value.page === 'cards') result = { page: 'cards' };
  else if (value.page === 'project' && typeof value.projectId === 'string') result = { page: 'project', projectId: value.projectId };
  else if (value.page === 'lesson' && typeof value.moduleId === 'string') result = { page: 'lesson', moduleId: value.moduleId };
  else if (value.page === 'exercise' && typeof value.moduleId === 'string' && typeof value.exerciseId === 'string') result = { page: 'exercise', moduleId: value.moduleId, exerciseId: value.exerciseId };
  else return null;
  try { validateEntry({ kind: 'position', id: 'last', value: result }); return result; } catch { return null; }
}
export type StoredEntry = { areaId: string; key: string; value: Entry; updatedAt: number };
export type Snapshot = { entries: StoredEntry[]; resets: { areaId: string; generation: number }[] };
export const entryKey = (value: Entry): string => `${value.kind}:${value.id}`;
export const generationOf = (state: Snapshot, areaId: string): number => state.resets.find((r) => r.areaId === areaId)?.generation ?? 0;

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function assertId(id: string): void {
  if (id.length > 120 || !ID.test(id) || ['constructor', 'prototype'].includes(id)) throw new ConvexError('INVALID_ID');
}
export function assertPair(id: string): void {
  const parts = id.split('/');
  if (parts.length !== 2) throw new ConvexError('INVALID_ID');
  parts.forEach(assertId);
}
function assertDate(value: string): void {
  if (value.length > 30 || !/^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(value) || !Number.isFinite(Date.parse(value))) throw new ConvexError('INVALID_DATE');
}
export function assertFingerprint(value: string): void {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new ConvexError('INVALID_FINGERPRINT');
}
export function validateEntry(value: Entry): void {
  if (['completion', 'revealed', 'step'].includes(value.kind)) assertPair(value.id); else assertId(value.id);
  switch (value.kind) {
    case 'lesson': if (value.completedAt !== null) assertDate(value.completedAt); break;
    case 'completion': if (value.value) { assertDate(value.value.at); assertFingerprint(value.value.fp); } break;
    case 'card': {
      const c = value.value;
      if (!Number.isInteger(c.box) || c.box < 1 || c.box > 5 || !Number.isSafeInteger(c.seen) || c.seen < 0) throw new ConvexError('INVALID_CARD');
      if (c.lapses !== undefined && (!Number.isSafeInteger(c.lapses) || c.lapses < 0)) throw new ConvexError('INVALID_CARD');
      assertDate(c.due);
      if (c.last) assertDate(c.last);
      break;
    }
    case 'position': {
      const p = value.value;
      if ('moduleId' in p) assertId(p.moduleId);
      if ('projectId' in p) assertId(p.projectId);
      if (p.page === 'exercise') {
        assertPair(p.exerciseId);
        if (!p.exerciseId.startsWith(`${p.moduleId}/`)) throw new ConvexError('INVALID_POSITION');
      }
    }
  }
}

export const draftInput = v.object({ exerciseId: v.string(), fingerprint: v.string(), json: v.string() });
export type DraftInput = Infer<typeof draftInput>;
export function validateDraft(draft: DraftInput): void {
  assertPair(draft.exerciseId);
  assertFingerprint(draft.fingerprint);
  if (new TextEncoder().encode(draft.json).length > 60_000) throw new ConvexError('DRAFT_TOO_LARGE');
  let value: unknown;
  try { value = JSON.parse(draft.json); } catch { throw new ConvexError('INVALID_DRAFT'); }
  const valid = (item: unknown, depth: number): boolean => {
    if (depth > 8) return false;
    if (item === null || typeof item === 'boolean' || typeof item === 'string') return true;
    if (typeof item === 'number') return Number.isFinite(item);
    if (Array.isArray(item)) return item.length <= 1000 && item.every((x) => valid(x, depth + 1));
    if (typeof item === 'object') return Object.entries(item).every(([key, x]) => !['__proto__', 'constructor', 'prototype'].includes(key) && valid(x, depth + 1));
    return false;
  };
  if (!valid(value, 0)) throw new ConvexError('INVALID_DRAFT');
}

/** Same per-entry projection used by Convex optimistic updates and tests. */
export function applyEntries(state: Snapshot, areaId: string, changes: Entry[], updatedAt: number): Snapshot {
  const entries = new Map(state.entries.map((e) => [`${e.areaId}:${e.key}`, e]));
  for (const value of changes) {
    const key = entryKey(value);
    entries.set(`${areaId}:${key}`, { areaId, key, value, updatedAt });
  }
  return { ...state, entries: [...entries.values()] };
}
