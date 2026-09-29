// Existing progress view, legacy localStorage reader and portable JSON backups.
import type { AreaSummary } from '../content/types.ts';
import { GRADES, NOTE_LIMIT, parsePosition, type Grade, type Position } from '../../convex/model.ts';

export const VERSION = 1;
export const keyFor = (area: string) => `learn:${area}:v${VERSION}`;
export const LEGACY_BEAR_KEY = 'kotlin-lernen:bear:progress:v2';

export type Completion = { at: string; fp: string; help?: boolean };
export type CardState = { box: number; due: string; seen: number; last?: string; lapses?: number; grade?: Grade };
export type AreaProgress = {
  version: 1;
  /** Solved exercises by id, with the fingerprint they were solved against. */
  done: Record<string, Completion>;
  /** Type-specific drafts (answers, code, order …) by exercise id. */
  drafts: Record<string, unknown>;
  /** New backups retain the content version attached to answer drafts. */
  draftFingerprints?: Record<string, string>;
  /** Exercises whose solution was revealed before they were solved. */
  revealed: Record<string, true>;
  read: Record<string, string>;
  cards: Record<string, CardState>;
  projects: Record<string, Record<string, boolean>>;
  last: string | null;
  position?: Position;
  /** Personal lesson notes by module id. Convex keeps them apart from progress; here only in backups and local tests. */
  notes?: Record<string, string>;
};

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export const freshProgress = (): AreaProgress => ({ version: 1, done: {}, drafts: {}, revealed: {}, read: {}, cards: {}, projects: {}, last: null });
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const safeKey = (key: string) => !['__proto__', 'constructor', 'prototype'].includes(key);

/** Accepts anything that parses; drops malformed parts instead of failing as a whole. */
export function sanitize(data: unknown): AreaProgress {
  const progress = freshProgress();
  if (!record(data) || data.version !== VERSION) throw new Error('Unbekanntes Format');
  if (record(data.done)) for (const [id, value] of Object.entries(data.done)) {
    if (!safeKey(id)) continue;
    if (record(value) && typeof value.at === 'string' && typeof value.fp === 'string') progress.done[id] = { at: value.at, fp: value.fp, ...(value.help ? { help: true } : {}) };
  }
  if (record(data.drafts)) for (const [id, value] of Object.entries(data.drafts)) {
    if (safeKey(id) && (JSON.stringify(value)?.length ?? Infinity) <= 60000) progress.drafts[id] = value;
  }
  if (record(data.draftFingerprints)) progress.draftFingerprints = Object.fromEntries(Object.entries(data.draftFingerprints).filter(([, value]) => typeof value === 'string')) as Record<string, string>;
  if (record(data.revealed)) for (const id of Object.keys(data.revealed)) if (safeKey(id)) progress.revealed[id] = true;
  if (record(data.read)) for (const [id, value] of Object.entries(data.read)) if (safeKey(id) && typeof value === 'string') progress.read[id] = value;
  if (record(data.cards)) for (const [id, value] of Object.entries(data.cards)) {
    if (safeKey(id) && record(value) && typeof value.box === 'number' && Number.isInteger(value.box) && value.box >= 1 && value.box <= 5 && typeof value.due === 'string') {
      progress.cards[id] = {
        box: value.box, due: value.due, seen: Number(value.seen) || 0,
        ...(typeof value.last === 'string' ? { last: value.last } : {}),
        ...(Number.isSafeInteger(value.lapses) && (value.lapses as number) > 0 ? { lapses: value.lapses as number } : {}),
        ...(GRADES.includes(value.grade as Grade) ? { grade: value.grade as Grade } : {}),
      };
    }
  }
  if (record(data.projects)) for (const [id, steps] of Object.entries(data.projects)) {
    if (safeKey(id) && record(steps)) progress.projects[id] = Object.fromEntries(Object.entries(steps).filter(([key, v]) => safeKey(key) && v === true).map(([key]) => [key, true]));
  }
  if (typeof data.last === 'string' && /^\/[a-z0-9-]+(?:\/[a-z0-9-]+){0,2}$/.test(data.last)) progress.last = data.last;
  const position = parsePosition(data.position);
  if (position) progress.position = position;
  if (record(data.notes)) {
    const notes = Object.entries(data.notes).filter(([id, text]) => safeKey(id) && typeof text === 'string' && text.trim() && text.length <= NOTE_LIMIT);
    if (notes.length) progress.notes = Object.fromEntries(notes) as Record<string, string>;
  }
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
  for (const [id, value] of Object.entries(incoming.cards)) {
    const existing = merged.cards[id];
    if (!existing || (existing.last ?? '') < (value.last ?? '') || ((existing.last ?? '') === (value.last ?? '') && value.seen > existing.seen)) merged.cards[id] = value;
  }
  for (const [id, steps] of Object.entries(incoming.projects)) merged.projects[id] = { ...steps, ...merged.projects[id] };
  merged.last ??= incoming.last;
  merged.position ??= incoming.position;
  if (incoming.notes) merged.notes = { ...incoming.notes, ...merged.notes };
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
  const active = typeof data.activeId === 'string' ? byTask.get(data.activeId) : undefined;
  if (active) {
    const moduleId = active.id.split('/')[0];
    const index = modules.find((m) => m.id === moduleId)!.exercises.findIndex((e) => e.id === active.id);
    progress.position = { page: 'exercise', moduleId, exerciseId: active.id };
    progress.last = `/kotlin/${moduleId}/${index + 1}`;
  }
  return progress;
}
