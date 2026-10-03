// Main-thread side of the Python worker: queues jobs, reports loading state, enforces a time limit.
import type { SqlValue } from '../content/types.ts';
import type { Job } from './worker.ts';

export type TestResult = { name: string; ok: boolean; message: string };
export type ExerciseResult = { stdout: string; error: string | null; tests: TestResult[] };
export type SnippetResult = { stdout: string; error: string | null };
/** `cells` are the values as the sqlite3 shell prints them; `rows` keep the raw values for comparing. */
export type SqlResultSet = { columns: string[]; rows: SqlValue[][]; cells: string[][]; truncated: boolean };
export type SqlResult = SqlResultSet & { error: string | null };
export type SqlScriptResult = { results: SqlResultSet[]; text: string; error: string | null };
export type RunnerState = 'idle' | 'loading' | 'packages' | 'ready' | 'running';

const TIME_LIMIT = 10_000;
/** Loading packages such as pandas (about 8 MB) happens before the time limit starts. */
const PACKAGE_LIMIT = 120_000;
let worker: Worker | null = null;
let booted = false;
let nextId = 1;
let state: RunnerState = 'idle';
let queue: Promise<unknown> = Promise.resolve();
let booting: Promise<void> | null = null;
const listeners = new Set<(state: RunnerState) => void>();
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();

function setState(next: RunnerState) { state = next; listeners.forEach((listener) => listener(state)); }
export const runnerState = () => state;
export function onRunnerState(listener: (state: RunnerState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
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
    for (const entry of pending.values()) entry.reject(new Error(event.message || 'Python konnte nicht geladen werden.'));
    pending.clear();
    worker = null;
    booted = false;
    setState('idle');
  };
  return created;
}

/** A job without its id, per kind (the runner assigns ids). */
type WithoutId<J> = J extends unknown ? Omit<J, 'id'> : never;
type NewJob = WithoutId<Job>;
function send<T>(job: NewJob | { kind: 'boot' }, limit: number | null): Promise<T> {
  worker ??= spawn();
  const id = nextId++;
  const current = worker;
  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    pending.set(id, {
      resolve: (value) => { if (timer) clearTimeout(timer); resolve(value); },
      reject: (error) => { if (timer) clearTimeout(timer); reject(error); },
    });
    if (limit !== null) timer = setTimeout(() => {
      pending.delete(id);
      current.terminate();
      if (worker === current) { worker = null; booted = false; }
      setState('idle');
      reject(new Error(`Zeitlimit von ${limit / 1000} Sekunden überschritten. Endlosschleife? Python wurde neu gestartet.`));
    }, limit);
    current.postMessage({ ...job, id });
  });
}

/** Loads Pyodide (about 12 MB, cached by the browser afterwards). */
export async function ensurePython(): Promise<void> {
  if (booted) return;
  if (!booting) booting = (async () => {
    setState('loading');
    try {
      await send({ kind: 'boot' }, 60_000);
      booted = true;
      setState('ready');
    } catch (error) {
      worker?.terminate();
      worker = null;
      booted = false;
      setState('idle');
      throw error;
    } finally { booting = null; }
  })();
  await booting;
}

function run<T>(job: NewJob, imports: string): Promise<T> {
  // Pyodide and the harness share globals/cwd/stdout. Async snippets must never overlap.
  const result = queue.then(async () => {
    await ensurePython();
    // Already loaded packages make this a few milliseconds; only a real download or first import shows the notice.
    const slow = setTimeout(() => setState('packages'), 300);
    try { await send({ kind: 'prepare', code: imports }, PACKAGE_LIMIT); }
    finally { clearTimeout(slow); }
    setState('running');
    try { return await send<T>(job, TIME_LIMIT); }
    finally { if (state === 'running') setState('ready'); }
  });
  queue = result.catch(() => {});
  return result;
}
export const runExercise = (setup: string, code: string, tests: { name: string; code: string }[]) =>
  run<ExerciseResult>({ kind: 'exercise', setup, code, tests }, [setup, code, ...tests.map((test) => test.code)].join('\n'));
export const runSnippet = (code: string) => run<SnippetResult>({ kind: 'snippet', code }, code);
/** A lesson block that is a test file; `stdout` is pytest's report. */
export const runPytest = (code: string) => run<SnippetResult & { exit_code: number }>({ kind: 'pytest', code }, `${code}\nimport pytest`);
export const runSql = (schema: string, query: string, solution: string) => run<{ actual: SqlResult; expected: SqlResult }>({ kind: 'sql', schema, query, solution }, 'import sqlite3');
export const runSqlScript = (code: string) => run<SqlScriptResult>({ kind: 'sql-script', code }, 'import sqlite3');

/** The runner's state as a short notice for the learner. */
export function runnerNotice(state: RunnerState, idle: string): string {
  if (state === 'loading') return 'Python wird geladen (einmalig ca. 12 MB) …';
  if (state === 'packages') return 'Bibliotheken wie pandas oder pytest werden geladen (einmalig einige MB) …';
  if (state === 'running') return 'Läuft …';
  return idle;
}
