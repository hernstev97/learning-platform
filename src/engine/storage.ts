// Learning progress, one localStorage entry per area. Nothing leaves the browser unless exported.
import type { AreaSummary } from '../content/types.ts';

export const VERSION = 1;
export const keyFor = (area: string) => `learn:${area}:v${VERSION}`;
export const LEGACY_BEAR_KEY = 'kotlin-lernen:bear:progress:v2';

export type Completion = { at: string; fp: string; help?: boolean };
export type CardState = { box: number; due: string; seen: number; last?: string };
export type AreaProgress = {
  version: 1;
  /** Solved exercises by id, with the fingerprint they were solved against. */
  done: Record<string, Completion>;
  /** Type-specific drafts (answers, code, order …) by exercise id. */
  drafts: Record<string, unknown>;
  /** Exercises whose solution was revealed before they were solved. */
  revealed: Record<string, true>;
  read: Record<string, string>;
  cards: Record<string, CardState>;
  projects: Record<string, Record<string, boolean>>;
  last: string | null;
};

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export const freshProgress = (): AreaProgress => ({ version: 1, done: {}, drafts: {}, revealed: {}, read: {}, cards: {}, projects: {}, last: null });
const record = (value: unknown): value is Record<string, any> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Accepts anything that parses; drops malformed parts instead of failing as a whole. */
export function sanitize(data: unknown): AreaProgress {
  const progress = freshProgress();
  if (!record(data) || data.version !== VERSION) throw new Error('Unbekanntes Format');
  if (record(data.done)) for (const [id, value] of Object.entries(data.done)) {
    if (record(value) && typeof value.at === 'string' && typeof value.fp === 'string') progress.done[id] = { at: value.at, fp: value.fp, ...(value.help ? { help: true } : {}) };
  }
  if (record(data.drafts)) for (const [id, value] of Object.entries(data.drafts)) {
    if (JSON.stringify(value).length <= 60000) progress.drafts[id] = value;
  }
  if (record(data.revealed)) for (const id of Object.keys(data.revealed)) progress.revealed[id] = true;
  if (record(data.read)) for (const [id, value] of Object.entries(data.read)) if (typeof value === 'string') progress.read[id] = value;
  if (record(data.cards)) for (const [id, value] of Object.entries(data.cards)) {
    if (record(value) && Number.isInteger(value.box) && value.box >= 0 && value.box <= 5 && typeof value.due === 'string') {
      progress.cards[id] = { box: value.box, due: value.due, seen: Number(value.seen) || 0, ...(typeof value.last === 'string' ? { last: value.last } : {}) };
    }
  }
  if (record(data.projects)) for (const [id, steps] of Object.entries(data.projects)) {
    if (record(steps)) progress.projects[id] = Object.fromEntries(Object.entries(steps).filter(([, v]) => v === true));
  }
  if (typeof data.last === 'string' && data.last.startsWith('/')) progress.last = data.last;
  return progress;
}

export function readProgress(storage: StoragePort, area: string): { progress: AreaProgress; warning: string | null } {
  try {
    const raw = storage.getItem(keyFor(area));
    if (!raw) return { progress: freshProgress(), warning: null };
    return { progress: sanitize(JSON.parse(raw)), warning: null };
  } catch {
    return { progress: freshProgress(), warning: 'Dein gespeicherter Lernstand konnte nicht gelesen werden. Neue Eingaben werden wieder gespeichert.' };
  }
}
export function writeProgress(storage: StoragePort, area: string, progress: AreaProgress): boolean {
  try { storage.setItem(keyFor(area), JSON.stringify(progress)); return true; } catch { return false; }
}

/** Counts only successes whose fingerprint still matches the current exercise. */
export function isDone(progress: AreaProgress, exercise: { id: string; fingerprint: string }): boolean {
  return progress.done[exercise.id]?.fp === exercise.fingerprint;
}
export function areaStats(summary: AreaSummary, progress: AreaProgress, today = localDay()) {
  const exercises = summary.modules.flatMap((m) => m.exercises);
  const done = exercises.filter((e) => isDone(progress, e)).length;
  const due = summary.cards.filter((id) => { const c = progress.cards[id]; return !c || c.due <= today; }).length;
  const learned = summary.cards.filter((id) => (progress.cards[id]?.box ?? 0) >= 3).length;
  return { done, total: exercises.length, percent: exercises.length ? Math.round(done / exercises.length * 100) : 0, due, learned };
}

export const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + days));
}
/** Leitner intervals in days for boxes 1–5. */
export const INTERVALS = [0, 1, 3, 7, 16, 35];
export function gradeCard(state: CardState | undefined, knew: boolean, today = localDay()): CardState {
  const box = knew ? Math.min((state?.box ?? 0) + 1, 5) : 1;
  return { box, due: knew ? addDays(today, INTERVALS[box]) : today, seen: (state?.seen ?? 0) + 1, last: today };
}

// ---- Export / import ---------------------------------------------------------------------------

export type Backup = { app: 'learn.kiumu.app'; exported: string; areas: Record<string, AreaProgress> };
export function exportAll(storage: Pick<Storage, 'getItem' | 'key' | 'length'>): Backup {
  const areas: Record<string, AreaProgress> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    const match = key?.match(/^learn:([a-z0-9-]+):v1$/);
    if (!match) continue;
    try { areas[match[1]] = sanitize(JSON.parse(storage.getItem(key!)!)); } catch { /* skip unreadable entries */ }
  }
  return { app: 'learn.kiumu.app', exported: new Date().toISOString(), areas };
}
/** Merge keeps the newer or better state per entry, so importing never loses local progress. */
export function mergeProgress(local: AreaProgress, incoming: AreaProgress): AreaProgress {
  const merged = structuredClone(local);
  for (const [id, value] of Object.entries(incoming.done)) if (!merged.done[id] || merged.done[id].at < value.at) merged.done[id] = value;
  for (const [id, value] of Object.entries(incoming.drafts)) if (!(id in merged.drafts)) merged.drafts[id] = value;
  Object.assign(merged.revealed, incoming.revealed);
  for (const [id, value] of Object.entries(incoming.read)) if (!merged.read[id]) merged.read[id] = value;
  for (const [id, value] of Object.entries(incoming.cards)) if (!merged.cards[id] || (merged.cards[id].last ?? '') < (value.last ?? '')) merged.cards[id] = value;
  for (const [id, steps] of Object.entries(incoming.projects)) merged.projects[id] = { ...steps, ...merged.projects[id] };
  merged.last ??= incoming.last;
  return merged;
}
export function parseBackup(text: string): Record<string, AreaProgress> {
  const data = JSON.parse(text);
  if (!record(data) || data.app !== 'learn.kiumu.app' || !record(data.areas)) throw new Error('Das ist keine Sicherung von learn.kiumu.app.');
  const out: Record<string, AreaProgress> = {};
  for (const [area, value] of Object.entries(data.areas)) if (/^[a-z0-9-]+$/.test(area)) out[area] = sanitize(value);
  return out;
}

/**
 * Progress from the former kotlin.kiumu.app (key kotlin-lernen:bear:progress:v2) becomes Kotlin progress.
 * Bear task ids stay the same; they only gain their module prefix.
 */
export function convertLegacyBear(text: string, modules: { id: string; exercises: { id: string; fingerprint: string }[] }[]): AreaProgress {
  const data = JSON.parse(text);
  if (!record(data) || data.version !== 2 || !record(data.completed)) throw new Error('Das ist kein Lernstand aus „Kotlin mit Bear“.');
  const byTask = new Map(modules.flatMap((m) => m.exercises).map((e) => [e.id.split('/')[1], e]));
  const progress = freshProgress();
  for (const [task, value] of Object.entries(data.completed)) {
    const exercise = byTask.get(task);
    if (exercise && record(value) && value.fingerprint === exercise.fingerprint) progress.done[exercise.id] = { at: String(value.at), fp: exercise.fingerprint };
  }
  if (record(data.drafts)) for (const [task, answers] of Object.entries(data.drafts)) {
    const exercise = byTask.get(task);
    if (exercise && record(answers)) progress.drafts[exercise.id] = answers;
  }
  return progress;
}
