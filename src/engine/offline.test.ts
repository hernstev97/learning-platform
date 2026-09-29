import { describe, expect, it } from 'vitest';
import { validateEntry, type Snapshot } from '../../convex/model.ts';
import { OFFLINE_KEY, clearOfflineCopy, hasOfflineCopy, readOfflineCopy, waitForToken, writeOfflineCopy } from './offline.ts';

function memoryStorage() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } } as unknown as Storage & { data: Map<string, string> };
}

describe('offline copy', () => {
  const snapshot: Snapshot = {
    entries: [
      { areaId: 'rust', key: 'lesson:intro', value: { kind: 'lesson', id: 'intro', completedAt: '2026-09-28' }, updatedAt: 1 },
      { areaId: 'rust', key: 'completion:intro/a', value: { kind: 'completion', id: 'intro/a', value: { at: '2026-09-28', fp: 'abc' } }, updatedAt: 2 },
    ],
    resets: [{ areaId: 'rust', generation: 2 }],
  };
  it('round-trips, is outside the legacy key pattern and can be forgotten', () => {
    const store = memoryStorage();
    expect(hasOfflineCopy(store)).toBe(false);
    expect(writeOfflineCopy(store, snapshot, 42)).toBe(true);
    expect(readOfflineCopy(store, validateEntry)).toEqual({ savedAt: 42, snapshot });
    expect(/^learn:[a-z0-9-]+:v1$/.test(OFFLINE_KEY)).toBe(false);
    clearOfflineCopy(store);
    expect(hasOfflineCopy(store)).toBe(false);
    expect(readOfflineCopy(store, validateEntry)).toBeNull();
  });
  it('drops invalid entries and ignores unreadable or blocked storage', () => {
    const store = memoryStorage();
    const broken = { ...snapshot, entries: [...snapshot.entries, { areaId: 'rust', key: 'lesson:x', value: { kind: 'lesson', id: 'Bad Id', completedAt: null }, updatedAt: 3 }] };
    store.setItem(OFFLINE_KEY, JSON.stringify({ savedAt: 1, snapshot: broken }));
    expect(readOfflineCopy(store, validateEntry)?.snapshot.entries).toHaveLength(2);
    store.setItem(OFFLINE_KEY, '{bad');
    expect(readOfflineCopy(store, validateEntry)).toBeNull();
    store.setItem(OFFLINE_KEY, JSON.stringify({ savedAt: 'x', snapshot }));
    expect(readOfflineCopy(store, validateEntry)).toBeNull();
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => { throw new Error('blocked'); } } as unknown as Storage;
    expect(writeOfflineCopy(blocked, snapshot)).toBe(false);
    expect(hasOfflineCopy(blocked)).toBe(false);
    expect(readOfflineCopy(blocked, validateEntry)).toBeNull();
    expect(() => clearOfflineCopy(blocked)).not.toThrow();
    expect(writeOfflineCopy(null, snapshot)).toBe(false);
  });
});

describe('token for Convex', () => {
  const noWait = async () => {};
  it('waits through offline nulls and network errors instead of reporting a signed-out user', async () => {
    const answers: (string | null | Error)[] = [null, new TypeError('Failed to fetch'), 'jwt'];
    let calls = 0;
    const token = await waitForToken(() => { const next = answers[calls++]; return next instanceof Error ? Promise.reject(next) : Promise.resolve(next); }, noWait);
    expect(token).toBe('jwt');
    expect(calls).toBe(3);
  });
  it('returns null once the session is gone and rethrows errors from Clerk itself', async () => {
    let session = true;
    await expect(waitForToken(() => { if (!session) return null; session = false; return Promise.resolve(null); }, noWait)).resolves.toBeNull();
    await expect(waitForToken(() => Promise.reject(Object.assign(new Error('No JWT template'), { status: 404 })), noWait)).rejects.toThrow('No JWT template');
  });
});
