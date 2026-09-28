// Static content and the existing AreaProgress view, backed exclusively by Convex after login.
import catalog from 'virtual:catalog';
import loaders from 'virtual:area-loaders';
import type { ConvexClient } from 'convex/browser';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../convex/_generated/api.js';
import { applyEntries, generationOf, validateDraft, validateEntry, type DraftInput, type Entry, type Position, type Snapshot } from '../convex/model.ts';
import type { Area, AreaSummary, Exercise } from './content/types.ts';
import { freshProgress, gradeCard, localDay, type AreaProgress, type Backup } from './engine/storage.ts';
import { latestPosition, projectSnapshot, safeDraft, sameEntry, toEntries } from './engine/persistence.ts';

export { catalog };
const areas = new Map<string, Area>();
const progress = new Map<string, AreaProgress>();
const statusListeners = new Set<() => void>();
const progressListeners = new Set<(draft: boolean) => void>();
let client: ConvexClient;
let snapshot: Snapshot = { entries: [], resets: [] };
let warning: string | null = null;
let connected = false;
let active = false;
let pending = 0;
const inflight = new Set<Promise<unknown>>();
let stopDraft: (() => void) | undefined;
let draftToken = 0;
let draftArea: string | null = null;
let cancelDraftLoad: (() => void) | undefined;
export const summaryOf = (id: string): AreaSummary | undefined => catalog.areas.find((a) => a.id === id);
export async function loadArea(id: string): Promise<Area> {
  const cached = areas.get(id);
  if (cached) return cached;
  if (!loaders[id]) throw new Error(`Unbekannter Bereich: ${id}`);
  const area = (await loaders[id]()).default;
  areas.set(id, area);
  return area;
}
export function progressOf(id: string): AreaProgress {
  if (!progress.has(id)) progress.set(id, freshProgress());
  return progress.get(id)!;
}
const statusChanged = () => statusListeners.forEach((fn) => fn());
export const getStorageWarning = () => warning;
export const getSyncStatus = () => warning ? 'Synchronisierung fehlgeschlagen' : pending ? `${pending} Änderung${pending === 1 ? '' : 'en'} wird gespeichert …` : !connected ? 'Verbindung wird wiederhergestellt …' : 'Lernstand synchronisiert';
export const hasPendingWrites = () => active && pending > 0;
export const getContinueHref = () => latestPosition(snapshot, catalog);
export const isCloud = true;
export function onStorageChange(fn: () => void): () => void { statusListeners.add(fn); return () => { statusListeners.delete(fn); }; }
export function onProgressChange(fn: (draft: boolean) => void): () => void { progressListeners.add(fn); return () => { progressListeners.delete(fn); }; }

function applySnapshot(next: Snapshot): void {
  const previous = snapshot;
  snapshot = next;
  const projected = projectSnapshot(next, catalog);
  let activeDraftWasReset = false;
  for (const [id, value] of Object.entries(projected)) {
    const p = progressOf(id);
    const reset = generationOf(previous, id) !== generationOf(next, id);
    const drafts = reset ? {} : p.drafts;
    if (reset && id === draftArea) activeDraftWasReset = true;
    Object.assign(p, value, { drafts });
  }
  progressListeners.forEach((fn) => fn(false));
  if (activeDraftWasReset) progressListeners.forEach((fn) => fn(true));
}

export async function connectProgress(convex: ConvexClient, denied: () => void): Promise<() => void> {
  client = convex;
  active = true;
  let stopSnapshot = () => {};
  const stopConnection = client.subscribeToConnectionState((state) => { connected = state.isWebSocketConnected; statusChanged(); });
  await new Promise<void>((resolve, reject) => {
    let initial = true;
    stopSnapshot = client.onUpdate(api.progress.snapshot, {}, (value) => {
      if (!active) return;
      applySnapshot(value);
      if (initial) { initial = false; resolve(); }
    }, (error) => {
      if (initial) { initial = false; reject(error); }
      else denied();
    });
  }).catch((error: unknown) => { stopConnection(); stopSnapshot(); active = false; throw error; });
  return () => {
    active = false; ++draftToken; stopSnapshot(); stopConnection(); stopDraft?.();
    progress.clear(); snapshot = { entries: [], resets: [] };
  };
}

function track<T>(work: Promise<T>): Promise<T> {
  pending++; inflight.add(work); statusChanged();
  return work.catch((error: unknown) => {
    if (active) {
      warning = 'Eine Änderung wurde nicht gespeichert. Prüfe Anmeldung und Verbindung; wiederhole die Änderung. Ein zurückgesetzter Lernstand muss neu geladen werden.';
      statusChanged();
    }
    throw error;
  }).finally(() => { pending--; inflight.delete(work); statusChanged(); });
}
export function setEntry(areaId: string, value: Entry): void {
  if (!active || (value.kind !== 'position' && sameEntry(snapshot, areaId, value))) return;
  validateEntry(value);
  const generation = generationOf(snapshot, areaId);
  void track(client.mutation(api.progress.set, { areaId, generation, changes: [value] }, {
    optimisticUpdate(store) {
      const current = store.getQuery(api.progress.snapshot, {});
      if (current && generationOf(current, areaId) === generation) store.setQuery(api.progress.snapshot, {}, applyEntries(current, areaId, [value], Date.now()));
    },
  })).catch(() => {});
}
export function visit(areaId: string, value: Position): void { setEntry(areaId, { kind: 'position', id: 'last', value }); }
export function reviewCard(areaId: string, cardId: string, knew: boolean): void {
  const today = localDay();
  const generation = generationOf(snapshot, areaId);
  void track(client.mutation(api.progress.reviewCard, { areaId, generation, cardId, knew, today }, {
    optimisticUpdate(store) {
      const current = store.getQuery(api.progress.snapshot, {});
      if (!current || generationOf(current, areaId) !== generation) return;
      const card = current.entries.find((e) => e.areaId === areaId && e.key === `card:${cardId}`)?.value;
      const value = gradeCard(card?.kind === 'card' ? card.value : undefined, knew, today);
      store.setQuery(api.progress.snapshot, {}, applyEntries(current, areaId, [{ kind: 'card', id: cardId, value }], Date.now()));
    },
  })).catch(() => {});
}

export function closeDraft(): void { ++draftToken; stopDraft?.(); stopDraft = undefined; cancelDraftLoad?.(); cancelDraftLoad = undefined; draftArea = null; }
export async function prepareDraft(areaId: string, exercise: Exercise): Promise<void> {
  closeDraft();
  const token = draftToken;
  draftArea = areaId;
  await new Promise<void>((resolve, reject) => {
    cancelDraftLoad = resolve;
    let initial = true;
    stopDraft = client.onUpdate(api.progress.draft, { areaId, exerciseId: exercise.id }, (value) => {
      if (token !== draftToken || !active) { resolve(); return; }
      const p = progressOf(areaId);
      const draft = value?.fingerprint === exercise.fingerprint ? safeDraft(exercise, JSON.parse(value.json)) : undefined;
      const changed = JSON.stringify(p.drafts[exercise.id]) !== JSON.stringify(draft);
      if (draft === undefined) delete p.drafts[exercise.id]; else p.drafts[exercise.id] = draft;
      if (initial) { initial = false; resolve(); }
      else if (changed) progressListeners.forEach((fn) => fn(true));
    }, (error) => { reject(error); warning = 'Der Entwurf konnte nicht geladen werden. Bitte neu anmelden oder erneut laden.'; statusChanged(); });
  });
}
export function saveAnswer(areaId: string, exercise: Exercise, value: unknown): void {
  const draft = { exerciseId: exercise.id, fingerprint: exercise.fingerprint, json: JSON.stringify(value) };
  try { validateDraft(draft); }
  catch { warning = 'Dieser Entwurf ist zu groß oder ungültig. Maximal 60 KB pro Übung; bitte kopiere deinen Text, bevor du die Seite verlässt.'; statusChanged(); return; }
  progressOf(areaId).drafts[exercise.id] = structuredClone(value);
  const generation = generationOf(snapshot, areaId);
  void track(client.mutation(api.progress.saveDraft, { areaId, generation, draft }, {
    optimisticUpdate(store) {
      const current = store.getQuery(api.progress.snapshot, {});
      if (current && generationOf(current, areaId) === generation) store.setQuery(api.progress.draft, { areaId, exerciseId: exercise.id }, { json: draft.json, fingerprint: draft.fingerprint });
    },
  })).catch(() => {});
}

export async function backupProgress(): Promise<Backup> {
  await Promise.all([...inflight]);
  const backup: Backup = { app: 'learn.kiumu.app', exported: new Date().toISOString(), areas: projectSnapshot(await client.query(api.progress.snapshot, {}), catalog) };
  let cursor: string | null = null;
  do {
    const page: FunctionReturnType<typeof api.progress.exportDrafts> = await client.query(api.progress.exportDrafts, { paginationOpts: { numItems: 16, cursor } });
    for (const draft of page.page) {
      const p = backup.areas[draft.areaId] ??= freshProgress();
      p.drafts[draft.exerciseId] = JSON.parse(draft.json);
      (p.draftFingerprints ??= {})[draft.exerciseId] = draft.fingerprint;
    }
    cursor = page.isDone ? null : page.continueCursor;
  } while (cursor);
  return backup;
}

async function hash(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export async function importProgress(values: Record<string, AreaProgress>, mode: 'legacy' | 'backup' = 'backup'): Promise<void> {
  await Promise.all([...inflight]);
  for (const [areaId, p] of Object.entries(values)) {
    const generation = generationOf(snapshot, areaId);
    const entries = toEntries(p, summaryOf(areaId));
    entries.forEach(validateEntry);
    const drafts: DraftInput[] = Object.entries(p.drafts).map(([exerciseId, value]) => ({
      exerciseId,
      fingerprint: p.draftFingerprints?.[exerciseId] ?? p.done[exerciseId]?.fp ?? summaryOf(areaId)?.modules.flatMap((m) => m.exercises).find((e) => e.id === exerciseId)?.fingerprint ?? 'legacy-unknown',
      json: JSON.stringify(value),
    }));
    drafts.forEach(validateDraft);
    for (let offset = 0; offset < Math.max(entries.length / 32, drafts.length / 4); offset++) {
      const chunk = { entries: entries.slice(offset * 32, (offset + 1) * 32), drafts: drafts.slice(offset * 4, (offset + 1) * 4) };
      const importId = await hash([mode, areaId, generation, chunk]);
      await track(client.mutation(api.progress.importLegacy, { areaId, generation, importId, mode, ...chunk }));
    }
  }
}
export async function resetProgress(areaId: string): Promise<void> {
  await Promise.all([...inflight]);
  await track(client.mutation(api.progress.resetArea, { areaId, generation: generationOf(snapshot, areaId) }));
}
