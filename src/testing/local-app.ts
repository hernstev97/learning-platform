// Shared application state: catalog, lazily loaded areas and per-area progress.
import catalog from 'virtual:catalog';
import loaders from 'virtual:area-loaders';
import type { Area, AreaSummary } from '../content/types.ts';
import { exportAll, freshProgress, readProgress, writeProgress, type AreaProgress, type Backup } from '../engine/storage.ts';

export { catalog };
const areas = new Map<string, Area>();
const progress = new Map<string, AreaProgress>();
let storageWarning: string | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

export const summaryOf = (id: string): AreaSummary | undefined => catalog.areas.find((area) => area.id === id);

export async function loadArea(id: string): Promise<Area> {
  const cached = areas.get(id);
  if (cached) return cached;
  const loader = loaders[id];
  if (!loader) throw new Error(`Unbekannter Bereich: ${id}`);
  const area = (await loader()).default;
  areas.set(id, area);
  return area;
}

export function progressOf(area: string): AreaProgress {
  let value = progress.get(area);
  if (!value) {
    const store = storage();
    if (!store) {
      value = freshProgress();
      storageWarning = 'Dein Browser erlaubt keine lokale Speicherung. Der Lernstand bleibt nur in diesem Tab erhalten.';
    } else {
      const read = readProgress(store, area);
      value = read.progress;
      if (read.warning) storageWarning = read.warning;
    }
    progress.set(area, value);
  }
  return value;
}

export function save(area: string): void {
  const store = storage();
  const ok = !!store && writeProgress(store, area, progressOf(area));
  const next = ok ? null : 'Speichern ist gerade nicht möglich (Speicher voll oder gesperrt). Dein Stand bleibt nur in diesem Tab erhalten.';
  const changed = next !== storageWarning;
  storageWarning = next;
  if (changed) listeners.forEach((listener) => listener());
}

/** Replace progress (import/reset) and persist it. */
export function replaceProgress(area: string, value: AreaProgress): void {
  progress.set(area, value);
  save(area);
}
/** Include unsaved work even when localStorage is blocked or full. */
export function backupProgress(): Backup {
  let backup: Backup = { app: 'learn.kiumu.app', exported: new Date().toISOString(), areas: {} };
  const store = storage();
  if (store) {
    try { backup = exportAll(store); } catch { /* the in-memory state below is still recoverable */ }
  }
  for (const area of catalog.areas) backup.areas[area.id] = progressOf(area.id);
  for (const [id, value] of progress) backup.areas[id] = value;
  return backup;
}

export const getStorageWarning = () => storageWarning;
export function onStorageChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Development-only regression adapter. Vite never includes this module in production.
import { gradeCard, mergeProgress } from '../engine/storage.ts';
import { positionHref } from '../engine/persistence.ts';
import type { Exercise } from '../content/types.ts';
import type { Entry, Position } from '../../convex/model.ts';
export const isCloud = false;
export const getSyncStatus = () => getStorageWarning() ? 'Nicht gespeichert' : 'Lernstand nur in diesem Browser gespeichert';
export const hasPendingWrites = () => false;
export const getContinueHref = () => null;
export const onProgressChange = (_fn: (draft: boolean) => void) => () => {};
export const closeDraft = () => {};
export const prepareDraft = async (_area: string, _exercise: Exercise) => {};
export function saveAnswer(area: string, exercise: Exercise, draft: unknown) { progressOf(area).drafts[exercise.id] = structuredClone(draft); save(area); }
export function setEntry(area: string, entry: Entry) {
  const p = progressOf(area);
  switch (entry.kind) {
    case 'lesson': if (entry.completedAt) p.read[entry.id] = entry.completedAt; else delete p.read[entry.id]; break;
    case 'completion': if (entry.value) p.done[entry.id] = entry.value; else delete p.done[entry.id]; break;
    case 'revealed': if (entry.value) p.revealed[entry.id] = true; else delete p.revealed[entry.id]; break;
    case 'step': { const [project, step] = entry.id.split('/'); (p.projects[project] ??= {})[step] = entry.completed; break; }
    case 'card': p.cards[entry.id] = entry.value; break;
    case 'position': p.last = positionHref(summaryOf(area)!, entry.value); break;
  }
  save(area);
}
export function visit(area: string, value: Position) { setEntry(area, { kind: 'position', id: 'last', value }); }
export function reviewCard(area: string, card: string, knew: boolean) { progressOf(area).cards[card] = gradeCard(progressOf(area).cards[card], knew); save(area); }
export async function resetProgress(area: string) { replaceProgress(area, freshProgress()); }
export async function importProgress(values: Record<string, AreaProgress>) { for (const [id, value] of Object.entries(values)) replaceProgress(id, mergeProgress(progressOf(id), value)); }
