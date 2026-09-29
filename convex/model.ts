import { ConvexError, v, type Infer } from 'convex/values';

export const completion = v.object({ at: v.string(), fp: v.string(), help: v.optional(v.boolean()) });
export const grade = v.union(v.literal('again'), v.literal('hard'), v.literal('good'), v.literal('easy'));
export type Grade = Infer<typeof grade>;
/** Self-ratings after a card review, from weakest to strongest. */
export const GRADES: readonly Grade[] = ['again', 'hard', 'good', 'easy'];
/** lapses counts "again" ratings; grade is the latest rating. Both are absent on cards reviewed before four ratings existed. */
export const cardState = v.object({ box: v.number(), due: v.string(), seen: v.number(), last: v.optional(v.string()), lapses: v.optional(v.number()), grade: v.optional(grade) });
/** What happened on an exercise: a wrong check, an opened hint, the solution shown, or a solve. */
export const drillEvent = v.union(v.literal('fail'), v.literal('hint'), v.literal('reveal'), v.literal('solve'));
export type DrillEvent = Infer<typeof drillEvent>;
/**
 * Review state of one exercise, written only once something went wrong or it was reviewed (rules: src/engine/drill.ts).
 * box 0 is off the review list, 1–3 returns on `due`. fails, hints and reveals count every attempt; open is the
 * trouble since the last solve, which decides the box at the next one. last is the local day of the latest event.
 */
export const drillState = v.object({ box: v.number(), due: v.optional(v.string()), last: v.string(), fails: v.number(), hints: v.number(), reveals: v.number(), open: v.number() });
/** Refreshers of a learned module: clean ones in a row and the local day of the latest. */
export const topicState = v.object({ reps: v.number(), last: v.string() });
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
  v.object({ kind: v.literal('drill'), id: v.string(), value: drillState }),
  v.object({ kind: v.literal('topic'), id: v.string(), value: topicState }),
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
/** A local calendar day as sent by the client, e.g. for card reviews. */
export function assertDay(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value))) throw new ConvexError('INVALID_DATE');
}
const count = (value: number) => Number.isSafeInteger(value) && value >= 0;
export function assertFingerprint(value: string): void {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new ConvexError('INVALID_FINGERPRINT');
}
export function validateEntry(value: Entry): void {
  if (['completion', 'revealed', 'step', 'drill'].includes(value.kind)) assertPair(value.id); else assertId(value.id);
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
    case 'drill': {
      const d = value.value;
      if (!Number.isInteger(d.box) || d.box < 0 || d.box > 3 || ![d.fails, d.hints, d.reveals, d.open].every(count)) throw new ConvexError('INVALID_DRILL');
      assertDay(d.last);
      if (d.due !== undefined) assertDay(d.due);
      break;
    }
    case 'topic': if (!count(value.value.reps)) throw new ConvexError('INVALID_TOPIC'); assertDay(value.value.last); break;
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

export const NOTE_LIMIT = 20_000;
export const noteInput = v.object({ moduleId: v.string(), text: v.string() });
export type NoteInput = Infer<typeof noteInput>;
export function validateNote(note: NoteInput): void {
  assertId(note.moduleId);
  if (note.text.length > NOTE_LIMIT) throw new ConvexError('NOTE_TOO_LARGE');
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
