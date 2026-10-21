// Read-only copy of the last authorized Convex snapshot, so a browser started without a connection can show progress.
// It is never written back to Convex and grants nothing: content is public and the server checks every call.
// No runtime imports: src/main.ts uses this module before the app chunk (and Convex) is loaded.
import type { Entry, Snapshot } from '../../convex/model.ts';

// Deliberately outside the `learn:<area>:v1` pattern that scanLegacy() imports.
export const OFFLINE_KEY = 'learn-offline:snapshot:v1';
export type OfflineCopy = { savedAt: number; snapshot: Snapshot };

export function browserStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

export function writeOfflineCopy(store: Storage | null, snapshot: Snapshot, savedAt = Date.now()): boolean {
  try { store?.setItem(OFFLINE_KEY, JSON.stringify({ savedAt, snapshot })); return !!store; } catch { return false; }
}

export function hasOfflineCopy(store: Storage | null): boolean {
  try { return !!store?.getItem(OFFLINE_KEY); } catch { return false; }
}

/** Entries failing `validate` are dropped; anything unreadable counts as no copy. */
export function readOfflineCopy(store: Storage | null, validate: (value: Entry) => void): OfflineCopy | null {
  try {
    const raw = store?.getItem(OFFLINE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as OfflineCopy;
    if (!Number.isFinite(value.savedAt) || !Array.isArray(value.snapshot?.entries) || !Array.isArray(value.snapshot.resets)) return null;
    const entries = value.snapshot.entries.filter((e) => {
      try { validate(e.value); return typeof e.areaId === 'string' && typeof e.key === 'string' && Number.isFinite(e.updatedAt); } catch { return false; }
    });
    const resets = value.snapshot.resets.filter((r) => typeof r.areaId === 'string' && Number.isSafeInteger(r.generation));
    return { savedAt: value.savedAt, snapshot: { entries, resets } };
  } catch { return null; }
}

export function clearOfflineCopy(store: Storage | null): void {
  try { store?.removeItem(OFFLINE_KEY); } catch { /* nothing to forget */ }
}

// Drafts typed in offline reading mode, one key per area, exercise and fingerprint. They wait on this device until the
// next authorized start adopts them (see adoptOfflineDrafts in src/app.ts); signing out forgets them.
export const OFFLINE_DRAFT_PREFIX = 'learn-offline:draft:v1:';
export type OfflineDraft = { areaId: string; exerciseId: string; fingerprint: string; json: string; savedAt: number };
const draftKey = (d: Pick<OfflineDraft, 'areaId' | 'exerciseId' | 'fingerprint'>) => `${OFFLINE_DRAFT_PREFIX}${d.areaId}:${d.exerciseId}:${d.fingerprint}`;

export function writeOfflineDraft(store: Storage | null, draft: OfflineDraft): boolean {
  try { store?.setItem(draftKey(draft), JSON.stringify(draft)); return !!store; } catch { return false; }
}

/** Drafts failing `validate` or not matching their key are skipped (and kept, like any unreadable entry). */
export function readOfflineDrafts(store: Storage | null, validate: (draft: OfflineDraft) => void): OfflineDraft[] {
  const drafts: OfflineDraft[] = [];
  try {
    if (!store) return drafts;
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (!key?.startsWith(OFFLINE_DRAFT_PREFIX)) continue;
      try {
        const value = JSON.parse(store.getItem(key) ?? '') as OfflineDraft;
        if (typeof value?.areaId !== 'string' || typeof value.exerciseId !== 'string' || typeof value.fingerprint !== 'string' || typeof value.json !== 'string' || !Number.isFinite(value.savedAt) || draftKey(value) !== key) continue;
        validate(value);
        drafts.push({ areaId: value.areaId, exerciseId: value.exerciseId, fingerprint: value.fingerprint, json: value.json, savedAt: value.savedAt });
      } catch { /* skip this one */ }
    }
  } catch { /* blocked storage holds nothing */ }
  return drafts;
}

export function removeOfflineDraft(store: Storage | null, draft: Pick<OfflineDraft, 'areaId' | 'exerciseId' | 'fingerprint'>): void {
  try { store?.removeItem(draftKey(draft)); } catch { /* nothing to forget */ }
}

export function clearOfflineDrafts(store: Storage | null): void {
  try {
    if (!store) return;
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) { const key = store.key(i); if (key?.startsWith(OFFLINE_DRAFT_PREFIX)) keys.push(key); }
    keys.forEach((key) => store.removeItem(key));
  } catch { /* nothing to forget */ }
}

/**
 * Clerk answers null while the browser is offline and throws on a flaky connection. Returning null would make Convex
 * drop the authentication and fail every queued write after reconnecting, so keep waiting while the session exists.
 * Errors with an HTTP status come from Clerk itself (for example a missing JWT template) and are not retried.
 */
export async function waitForToken(fetch: () => Promise<string | null> | null, wait: (attempt: number) => Promise<void>): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    const request = fetch();
    if (!request) return null;
    try {
      const token = await request;
      if (token) return token;
    } catch (error) {
      if (typeof (error as { status?: unknown })?.status === 'number') throw error;
    }
    await wait(attempt);
  }
}
