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
