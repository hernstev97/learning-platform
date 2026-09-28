import { afterEach, expect, it, vi } from 'vitest';
import { scanLegacy, markLegacyImported } from './legacy.ts';
import { freshProgress } from './storage.ts';
import type { Catalog } from '../content/types.ts';

const catalog: Catalog = { areas: [], builtAt: '2026-09-28' };
afterEach(() => vi.unstubAllGlobals());

it.each(['getter', 'length', 'getItem'] as const)('keeps cloud usage available when localStorage %s is blocked', async (part) => {
  const blocked = () => { throw new DOMException('Blocked', 'SecurityError'); };
  const storage = { get length() { return part === 'length' ? blocked() : 0; }, getItem: blocked };
  vi.stubGlobal('window', { get localStorage() { return part === 'getter' ? blocked() : storage; } });
  const scan = await scanLegacy(catalog);
  expect(scan.areas).toEqual({});
  expect(scan.warning).toContain('Browserspeicher ist gesperrt');
});

it('keeps the original source and excludes its own marker from subsequent migration scans', async () => {
  const p = freshProgress(); p.read.intro = '2026-09-28';
  const original = JSON.stringify(p);
  const values = new Map([['learn:python:v1', original], ['learn:broken:v1', '{bad']]);
  vi.stubGlobal('window', { localStorage: {
    get length() { return values.size; }, key: (i: number) => [...values.keys()][i],
    getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value),
  } });
  const first = await scanLegacy(catalog);
  expect(first.warning).toContain('beschädigt');
  expect(first.areas).toEqual({ python: p });
  markLegacyImported(first);
  const second = await scanLegacy(catalog);
  expect(second.fingerprint).toBe(first.fingerprint);
  expect(second.imported).toBe(true);
  expect(values.get('learn:python:v1')).toBe(original);
  expect(values.get('learn:broken:v1')).toBe('{bad');
});
