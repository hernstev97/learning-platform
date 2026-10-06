/// <reference lib="webworker" />
// Runs PostgreSQL (PGlite) off the main thread. The main thread terminates this worker on timeout: PostgreSQL in
// WebAssembly cannot interrupt a running statement itself (statement_timeout has no effect there).
import { createBase, PgEngine } from './engine.ts';

export type PgJob =
  | { id: number; kind: 'script'; code: string }
  | { id: number; kind: 'exercise'; schema: string; query: string; solution: string; check: string | null };

let ready: Promise<PgEngine> | null = null;
function boot(): Promise<PgEngine> {
  ready ??= (async () => {
    return new PgEngine(await createBase());
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

self.onmessage = async (event: MessageEvent<PgJob | { id: number; kind: 'boot' }>) => {
  const job = event.data;
  try {
    const engine = await boot();
    if (job.kind === 'boot') { self.postMessage({ id: job.id, result: { ready: true } }); return; }
    const result = job.kind === 'script'
      ? await engine.script(job.code)
      : await engine.exercise(job.schema, job.query, job.solution, job.check);
    self.postMessage({ id: job.id, result });
  } catch (error) {
    self.postMessage({ id: job.id, error: String((error as Error)?.message ?? error) });
  }
};
