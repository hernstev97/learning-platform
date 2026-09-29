// Static content and the existing AreaProgress view, backed exclusively by Convex after login.
import catalog from 'virtual:catalog';
import loaders from 'virtual:area-loaders';
import type { ConvexClient } from 'convex/browser';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../convex/_generated/api.js';
import { applyEntries, generationOf, validateDraft, validateEntry, validateNote, type DrillEvent, type DraftInput, type Entry, type Grade, type NoteInput, type Position, type Snapshot } from '../convex/model.ts';
import type { Area, AreaSummary, Exercise } from './content/types.ts';
import { freshProgress, localDay, type AreaProgress, type Backup } from './engine/storage.ts';
import { schedule } from './engine/review.ts';
import { drill, drillBase } from './engine/drill.ts';
import { latestArea, projectSnapshot, safeDraft, sameEntry, toEntries } from './engine/persistence.ts';
import { browserStorage, readOfflineCopy, writeOfflineCopy } from './engine/offline.ts';

export { catalog };
const areas = new Map<string, Area>();
const progress = new Map<string, AreaProgress>();
const statusListeners = new Set<() => void>();
const progressListeners = new Set<(draft: boolean) => void>();
let client: ConvexClient;
let snapshot: Snapshot = { entries: [], resets: [] };
let warning: string | null = null;
let connected = false;
let unreachable = false;
let downSince: number | null = null;
let copyTimer: ReturnType<typeof setTimeout> | undefined;
/** Offline reading mode: time of the shown snapshot copy; nothing is written. */
let offlineSince: number | null = null;
let active = false;
let pending = 0;
const inflight = new Set<Promise<unknown>>();
let stopDraft: (() => void) | undefined;
let draftToken = 0;
let draftArea: string | null = null;
let cancelDraftLoad: (() => void) | undefined;
// Until the open exercise's saved draft has arrived, a typed draft is held instead of blindly replacing it.
let draftKnown = true;
let heldDraft: { json: string; send: () => void } | undefined;
// Lessons with notes by area. Typed note text is sent after a short pause; confirmed text reaches the open lesson
// only once none of its own writes is outstanding, so server echoes never replace newer typing.
let noted = new Map<string, Set<string>>();
let queuedNote: { areaId: string; moduleId: string; text: string; timer: ReturnType<typeof setTimeout> } | undefined;
const notesInFlight = new Map<string, number>();
let openNote: { key: string; show: (text: string) => void; latest?: string } | undefined;
const noteKey = (areaId: string, moduleId: string) => `${areaId}/${moduleId}`;
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
const waiting = () => pending + (heldDraft ? 1 : 0) + (queuedNote ? 1 : 0);
const changes = (n: number) => `${n} Änderung${n === 1 ? '' : 'en'}`;
const stamp = (time: number) => new Date(time).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export const getSyncStatus = () => offlineSince !== null ? `Offline · Lernstand vom ${stamp(offlineSince)}`
  : warning ? 'Synchronisierung fehlgeschlagen'
  : unreachable ? waiting() ? `Offline · ${changes(waiting())} nicht synchronisiert` : 'Offline · Lernstand synchronisiert'
  : waiting() ? `${changes(waiting())} ${waiting() === 1 ? 'wird' : 'werden'} gespeichert …` : !connected ? 'Verbindung wird wiederhergestellt …' : 'Lernstand synchronisiert';
/** Explains a lasting connection problem above the page; null while everything is (or is about to be) synchronized. */
export function getSyncNotice(): string | null {
  if (offlineSince !== null) return `Offline-Modus: Lerninhalte und dein Lernstand vom ${stamp(offlineSince)}. Änderungen werden hier nicht gespeichert.`;
  if (!unreachable) return null;
  const n = waiting();
  return n ? `Keine Verbindung. ${changes(n)} ${n === 1 ? 'ist' : 'sind'} noch nicht synchronisiert und ${n === 1 ? 'wird' : 'werden'} automatisch gespeichert, sobald die Verbindung zurück ist. Lass diese Seite bis dahin geöffnet.`
    : 'Keine Verbindung. Dein Lernstand ist synchronisiert; neue Änderungen werden gespeichert, sobald die Verbindung zurück ist.';
}
export const isOffline = () => offlineSince !== null;
export const hasPendingWrites = () => active && waiting() > 0;
export const getContinueArea = () => latestArea(snapshot, catalog);
export const hasNote = (areaId: string, moduleId: string) => !!noted.get(areaId)?.has(moduleId);
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
  keepOfflineCopy();
}
/** The copy for offline starts holds confirmed server state only, never optimistic changes that may still fail. */
function keepOfflineCopy(): void {
  if (!active) return;
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { if (active && !pending) writeOfflineCopy(browserStorage(), snapshot); }, 1000);
}

/** Shows the last authorized snapshot without a connection. False if this browser has no usable copy. */
export function startOffline(): boolean {
  const copy = readOfflineCopy(browserStorage(), validateEntry);
  if (!copy) return false;
  active = false;
  offlineSince = copy.savedAt;
  applySnapshot(copy.snapshot);
  return true;
}

export async function connectProgress(convex: ConvexClient, denied: () => void): Promise<() => void> {
  client = convex;
  active = true;
  let stopSnapshot = () => {};
  // A socket on a lost network can stay "connected" for a long time. The browser's offline flag and requests
  // left unanswered for seconds reveal the outage earlier. Short hiccups are normal; only a lasting one is announced.
  const checkConnection = () => {
    const state = client.connectionState();
    connected = state.isWebSocketConnected;
    const oldest = state.timeOfOldestInflightRequest?.getTime();
    const down = !navigator.onLine || !connected || (oldest !== undefined && Date.now() - oldest > 5000);
    downSince = down ? downSince ?? Date.now() : null;
    const next = downSince !== null && Date.now() - downSince >= 3000;
    if (next !== unreachable) { unreachable = next; statusChanged(); }
  };
  const stopState = client.subscribeToConnectionState(() => { checkConnection(); statusChanged(); });
  const watch = setInterval(checkConnection, 1000);
  const stopConnection = () => { stopState(); clearInterval(watch); };
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
  // Markers only; a lost authorization is already handled by the snapshot subscription.
  const stopNotes = client.onUpdate(api.progress.noteIndex, {}, (value) => {
    if (!active) return;
    const next = new Map<string, Set<string>>();
    for (const { areaId, moduleId } of value) (next.get(areaId) ?? next.set(areaId, new Set()).get(areaId)!).add(moduleId);
    const same = next.size === noted.size && [...next].every(([area, ids]) => ids.size === noted.get(area)?.size && [...ids].every((id) => noted.get(area)!.has(id)));
    noted = next;
    if (!same) progressListeners.forEach((fn) => fn(false));
  }, () => {});
  return () => {
    active = false; ++draftToken; stopSnapshot(); stopNotes(); stopConnection(); stopDraft?.();
    clearTimeout(copyTimer); clearTimeout(queuedNote?.timer); queuedNote = undefined; openNote = undefined;
    progress.clear(); snapshot = { entries: [], resets: [] }; noted = new Map();
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
  }).finally(() => { pending--; inflight.delete(work); statusChanged(); keepOfflineCopy(); });
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
export function reviewCard(areaId: string, cardId: string, grade: Grade): void {
  if (!active) return;
  const today = localDay();
  const generation = generationOf(snapshot, areaId);
  void track(client.mutation(api.progress.reviewCard, { areaId, generation, cardId, grade, today }, {
    optimisticUpdate(store) {
      const current = store.getQuery(api.progress.snapshot, {});
      if (!current || generationOf(current, areaId) !== generation) return;
      const card = current.entries.find((e) => e.areaId === areaId && e.key === `card:${cardId}`)?.value;
      const value = schedule(card?.kind === 'card' ? card.value : undefined, grade, today);
      store.setQuery(api.progress.snapshot, {}, applyEntries(current, areaId, [{ kind: 'card', id: cardId, value }], Date.now()));
    },
  })).catch(() => {});
}

/** A wrong check, hint, shown solution or solve on an exercise; `review` for rounds under „Wiederholen“. */
export function recordDrill(areaId: string, exerciseId: string, event: DrillEvent, review: boolean): void {
  if (!active) return;
  const today = localDay();
  const generation = generationOf(snapshot, areaId);
  void track(client.mutation(api.progress.recordDrill, { areaId, generation, exerciseId, event, review, today }, {
    optimisticUpdate(store) {
      const current = store.getQuery(api.progress.snapshot, {});
      if (!current || generationOf(current, areaId) !== generation) return;
      const find = (kind: string) => current.entries.find((e) => e.areaId === areaId && e.key === `${kind}:${exerciseId}`)?.value;
      const value = drill(drillBase(find('drill'), find('completion'), find('revealed'), today), event, today, review);
      if (value) store.setQuery(api.progress.snapshot, {}, applyEntries(current, areaId, [{ kind: 'drill', id: exerciseId, value }], Date.now()));
    },
  })).catch(() => {});
}

export function closeDraft(): void {
  ++draftToken; stopDraft?.(); stopDraft = undefined; cancelDraftLoad?.(); cancelDraftLoad = undefined; draftArea = null;
  // Leaving the page must not lose typed text; without a known saved draft the latest explicit change wins as usual.
  const held = heldDraft;
  heldDraft = undefined; draftKnown = true;
  if (active) held?.send();
}
export async function prepareDraft(areaId: string, exercise: Exercise): Promise<void> {
  closeDraft();
  if (!active) return;
  const token = draftToken;
  draftArea = areaId;
  draftKnown = false;
  await new Promise<void>((resolve, reject) => {
    cancelDraftLoad = resolve;
    let initial = true;
    stopDraft = client.onUpdate(api.progress.draft, { areaId, exerciseId: exercise.id }, (value) => {
      if (token !== draftToken || !active) { resolve(); return; }
      const p = progressOf(areaId);
      const draft = value?.fingerprint === exercise.fingerprint ? safeDraft(exercise, JSON.parse(value.json)) : undefined;
      const held = heldDraft;
      heldDraft = undefined; draftKnown = true;
      // Text typed offline replaces only a missing or identical saved draft. A different one is offered below.
      if (held && (draft === undefined || held.json === value?.json)) { held.send(); statusChanged(); return; }
      if (held) statusChanged();
      const changed = JSON.stringify(p.drafts[exercise.id]) !== JSON.stringify(draft);
      if (draft === undefined) delete p.drafts[exercise.id]; else p.drafts[exercise.id] = draft;
      if (initial) { initial = false; resolve(); }
      else if (changed) progressListeners.forEach((fn) => fn(true));
    }, (error) => { reject(error); warning = 'Der Entwurf konnte nicht geladen werden. Bitte neu anmelden oder erneut laden.'; statusChanged(); });
    // Without a connection the exercise opens right away, on a slow one after a few seconds.
    // A draft saved elsewhere is offered once it arrives; typed text is held until then (see above).
    setTimeout(() => { if (initial) { initial = false; resolve(); } }, connected && navigator.onLine ? 4000 : 0);
  });
}
export function saveAnswer(areaId: string, exercise: Exercise, value: unknown): void {
  const draft = { exerciseId: exercise.id, fingerprint: exercise.fingerprint, json: JSON.stringify(value) };
  try { validateDraft(draft); }
  catch { warning = 'Dieser Entwurf ist zu groß oder ungültig. Maximal 60 KB pro Übung; bitte kopiere deinen Text, bevor du die Seite verlässt.'; statusChanged(); return; }
  progressOf(areaId).drafts[exercise.id] = structuredClone(value);
  if (!active) return;
  const generation = generationOf(snapshot, areaId);
  const send = () => void track(client.mutation(api.progress.saveDraft, { areaId, generation, draft }, {
    optimisticUpdate(store) {
      const current = store.getQuery(api.progress.snapshot, {});
      if (current && generationOf(current, areaId) === generation) store.setQuery(api.progress.draft, { areaId, exerciseId: exercise.id }, { json: draft.json, fingerprint: draft.fingerprint });
    },
  })).catch(() => {});
  if (draftKnown) send();
  else { heldDraft = { json: draft.json, send }; statusChanged(); }
}

/** Shows the saved note of one lesson, first on arrival and later for changes made elsewhere. */
export function watchNote(areaId: string, moduleId: string, show: (text: string) => void): () => void {
  if (!active) return () => {};
  const watch: NonNullable<typeof openNote> = { key: noteKey(areaId, moduleId), show };
  openNote = watch;
  const stop = client.onUpdate(api.progress.note, { areaId, moduleId }, (value) => {
    if (openNote !== watch || !active) return;
    watch.latest = value ?? '';
    if (!noteBusy(watch.key)) show(watch.latest);
  }, () => { warning = 'Die Notiz konnte nicht geladen werden. Bitte neu anmelden oder erneut laden.'; statusChanged(); });
  return () => { stop(); if (openNote === watch) openNote = undefined; };
}
const noteBusy = (key: string) => (notesInFlight.get(key) ?? 0) > 0 || (!!queuedNote && noteKey(queuedNote.areaId, queuedNote.moduleId) === key);
/** Saves after a pause in typing; flushNote() sends right away. */
export function saveNote(areaId: string, moduleId: string, text: string): void {
  try { validateNote({ moduleId, text }); }
  catch { warning = 'Diese Notiz ist zu lang (maximal 20 000 Zeichen). Bitte kürze sie, bevor du die Seite verlässt.'; statusChanged(); return; }
  if (!active) return;
  if (queuedNote && noteKey(queuedNote.areaId, queuedNote.moduleId) !== noteKey(areaId, moduleId)) flushNote();
  clearTimeout(queuedNote?.timer);
  queuedNote = { areaId, moduleId, text, timer: setTimeout(flushNote, 800) };
  statusChanged();
}
export function flushNote(): void {
  const queued = queuedNote;
  if (!queued) return;
  clearTimeout(queued.timer);
  queuedNote = undefined;
  if (!active) return;
  const { areaId, moduleId, text } = queued;
  const key = noteKey(areaId, moduleId);
  const note: NoteInput = { moduleId, text };
  notesInFlight.set(key, (notesInFlight.get(key) ?? 0) + 1);
  void track(client.mutation(api.progress.saveNote, { areaId, note }, {
    optimisticUpdate(store) {
      const kept = !!text.trim();
      store.setQuery(api.progress.note, { areaId, moduleId }, kept ? text : null);
      const index = store.getQuery(api.progress.noteIndex, {});
      if (index) store.setQuery(api.progress.noteIndex, {}, [...index.filter((n) => n.areaId !== areaId || n.moduleId !== moduleId), ...kept ? [{ areaId, moduleId }] : []]);
    },
  })).catch(() => {}).finally(() => {
    notesInFlight.set(key, notesInFlight.get(key)! - 1);
    if (!notesInFlight.get(key)) notesInFlight.delete(key);
    if (openNote?.key === key && openNote.latest !== undefined && !noteBusy(key)) openNote.show(openNote.latest);
  });
}

const OFFLINE_ONLY = 'Im Offline-Modus nicht verfügbar. Lade die Seite mit Verbindung neu.';

export async function backupProgress(): Promise<Backup> {
  if (!active) throw new Error(OFFLINE_ONLY);
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
  do {
    const page: FunctionReturnType<typeof api.progress.exportNotes> = await client.query(api.progress.exportNotes, { paginationOpts: { numItems: 16, cursor } });
    for (const note of page.page) ((backup.areas[note.areaId] ??= freshProgress()).notes ??= {})[note.moduleId] = note.text;
    cursor = page.isDone ? null : page.continueCursor;
  } while (cursor);
  return backup;
}

async function hash(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export async function importProgress(values: Record<string, AreaProgress>, mode: 'legacy' | 'backup' = 'backup'): Promise<void> {
  if (!active) throw new Error(OFFLINE_ONLY);
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
    const notes: NoteInput[] = Object.entries(p.notes ?? {}).map(([moduleId, text]) => ({ moduleId, text }));
    notes.forEach(validateNote);
    for (let offset = 0; offset < Math.max(entries.length / 32, drafts.length / 4, notes.length / 4); offset++) {
      const chunk = { entries: entries.slice(offset * 32, (offset + 1) * 32), drafts: drafts.slice(offset * 4, (offset + 1) * 4), ...notes.length ? { notes: notes.slice(offset * 4, (offset + 1) * 4) } : {} };
      const importId = await hash([mode, areaId, generation, chunk]);
      await track(client.mutation(api.progress.importLegacy, { areaId, generation, importId, mode, ...chunk }));
    }
  }
}
export async function resetProgress(areaId: string): Promise<void> {
  if (!active) throw new Error(OFFLINE_ONLY);
  await Promise.all([...inflight]);
  await track(client.mutation(api.progress.resetArea, { areaId, generation: generationOf(snapshot, areaId) }));
}
