// Main-thread side of the Python worker: queues jobs, reports loading state, enforces a time limit.
import type { Job } from './worker.ts';

export type TestResult = { name: string; ok: boolean; message: string };
export type ExerciseResult = { stdout: string; error: string | null; tests: TestResult[] };
export type SnippetResult = { stdout: string; error: string | null };
export type RunnerState = 'idle' | 'loading' | 'ready' | 'running';

const TIME_LIMIT = 10_000;
let worker: Worker | null = null;
let booted = false;
let nextId = 1;
let state: RunnerState = 'idle';
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

function send<T>(job: Omit<Job, 'id'> | { kind: 'boot' }, limit: number | null): Promise<T> {
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
  if (state !== 'loading') setState('loading');
  await send({ kind: 'boot' }, null);
  booted = true;
  setState('ready');
}

async function run<T>(job: Omit<Job, 'id'>): Promise<T> {
  await ensurePython();
  setState('running');
  try { return await send<T>(job, TIME_LIMIT); }
  finally { if (state === 'running') setState('ready'); }
}
export const runExercise = (setup: string, code: string, tests: { name: string; code: string }[]) => run<ExerciseResult>({ kind: 'exercise', setup, code, tests });
export const runSnippet = (code: string) => run<SnippetResult>({ kind: 'snippet', code });
