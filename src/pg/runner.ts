// Main-thread side of the PostgreSQL worker: queues jobs, reports loading state, enforces a time limit.
import type { PgExerciseResult, PgScriptResult } from './engine.ts';
import type { PgJob } from './worker.ts';

export type PgRunnerState = 'idle' | 'loading' | 'ready' | 'running';

const TIME_LIMIT = 10_000;
const BOOT_LIMIT = 90_000;
let worker: Worker | null = null;
let booted = false;
let nextId = 1;
let state: PgRunnerState = 'idle';
let queue: Promise<unknown> = Promise.resolve();
let booting: Promise<void> | null = null;
const listeners = new Set<(state: PgRunnerState) => void>();
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

function setState(next: PgRunnerState) { state = next; listeners.forEach((listener) => listener(state)); }
export function onPgState(listener: (state: PgRunnerState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function reset() {
  worker?.terminate();
  worker = null;
  booted = false;
  setState('idle');
}

function spawn(): Worker {
  const created = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  created.onmessage = (event) => {
    const { id, result, error } = event.data;
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (error) entry.reject(new Error(error)); else entry.resolve(result);
  };
  created.onerror = (event) => {
    for (const entry of pending.values()) entry.reject(new Error(event.message || 'PostgreSQL konnte nicht geladen werden.'));
    pending.clear();
    reset();
  };
  return created;
}

type WithoutId<J> = J extends unknown ? Omit<J, 'id'> : never;
type NewJob = WithoutId<PgJob>;
function send<T>(job: NewJob | { kind: 'boot' }, limit: number): Promise<T> {
  worker ??= spawn();
  const id = nextId++;
  const current = worker;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      if (worker === current) reset(); else current.terminate();
      reject(new Error(job.kind === 'boot'
        ? 'PostgreSQL ließ sich nicht rechtzeitig starten. Lade die Seite neu und versuche es noch einmal.'
        : `Zeitlimit von ${limit / 1000} Sekunden überschritten. Endlose Rekursion oder eine riesige Tabelle? PostgreSQL wurde neu gestartet.`));
    }, limit);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timer); resolve(value as T); },
      reject: (error) => { clearTimeout(timer); reject(error); },
    });
    current.postMessage({ ...job, id });
  });
}

/** Loads PostgreSQL (about 5 MB compressed, cached afterwards) and creates the base database. */
async function ensurePostgres(): Promise<void> {
  if (booted) return;
  booting ??= (async () => {
    setState('loading');
    try {
      await send({ kind: 'boot' }, BOOT_LIMIT);
      booted = true;
      setState('ready');
    } catch (error) {
      reset();
      throw error;
    } finally { booting = null; }
  })();
  await booting;
}

function run<T>(job: NewJob): Promise<T> {
  const result = queue.then(async () => {
    await ensurePostgres();
    setState('running');
    try { return await send<T>(job, TIME_LIMIT); }
    finally { if (state === 'running') setState('ready'); }
  });
  queue = result.catch(() => {});
  return result;
}

export const runPgScript = (code: string, keepGoing = false) => run<PgScriptResult>({ kind: 'script', code, keepGoing });
export const runPgExercise = (schema: string, query: string, solution: string, check: string | null) =>
  run<PgExerciseResult>({ kind: 'exercise', schema, query, solution, check });

export function pgNotice(state: PgRunnerState, idle: string): string {
  if (state === 'loading') return 'PostgreSQL wird geladen (einmalig ca. 5 MB) …';
  if (state === 'running') return 'Läuft …';
  return idle;
}
