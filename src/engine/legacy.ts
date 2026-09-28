import { convertLegacyBear, freshProgress, LEGACY_BEAR_KEY, mergeProgress, sanitize, type AreaProgress } from './storage.ts';
import type { Catalog } from '../content/types.ts';

const MARKER = 'learn-convex:legacy-import:v1';
const BLOCKED = 'Der lokale Browserspeicher ist gesperrt. Alte Daten können hier nicht geprüft werden; die Convex-Synchronisierung benötigt ihn nicht.';
export type LegacyScan = { areas: Record<string, AreaProgress>; fingerprint: string; warning: string | null; imported: boolean };
export async function scanLegacy(catalog: Catalog): Promise<LegacyScan> {
  const areas: Record<string, AreaProgress> = {};
  const originals: [string, string][] = [];
  let warning: string | null = null;
  let store: Storage;
  let marker: string | null;
  try {
    store = window.localStorage;
    const keys = Array.from({ length: store.length }, (_, i) => store.key(i)).filter((key): key is string => !!key && /^learn:[a-z0-9-]+:v1$/.test(key)).sort();
    for (const key of [...keys, LEGACY_BEAR_KEY]) {
      const raw = store.getItem(key);
      if (raw) originals.push([key, raw]);
    }
    marker = store.getItem(MARKER);
  } catch { return { areas, fingerprint: '', warning: BLOCKED, imported: false }; }
  for (const [key, raw] of originals) {
    try {
      const areaId = key === LEGACY_BEAR_KEY ? 'kotlin' : key.split(':')[1];
      const value = key === LEGACY_BEAR_KEY ? convertLegacyBear(raw, catalog.areas.find((a) => a.id === 'kotlin')?.modules ?? []) : sanitize(JSON.parse(raw));
      if (JSON.stringify(value) === JSON.stringify(freshProgress())) continue;
      areas[areaId] = areas[areaId] ? mergeProgress(areas[areaId], value) : value;
    } catch { warning = 'Mindestens ein alter Speichereintrag ist beschädigt und wurde übersprungen. Die Originaldaten bleiben unverändert im Browser.'; }
  }
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(originals)));
  const fingerprint = [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, '0')).join('');
  return { areas, fingerprint, warning, imported: marker === fingerprint };
}
export function markLegacyImported(scan: LegacyScan): void {
  try { window.localStorage.setItem(MARKER, scan.fingerprint); } catch { /* server receipts remain authoritative */ }
}
