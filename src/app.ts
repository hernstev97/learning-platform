// Shared application state: catalog, lazily loaded areas and per-area progress.
import catalog from 'virtual:catalog';
import loaders from 'virtual:area-loaders';
import type { Area, AreaSummary } from './content/types.ts';
import { exportAll, freshProgress, readProgress, writeProgress, type AreaProgress, type Backup } from './engine/storage.ts';

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
