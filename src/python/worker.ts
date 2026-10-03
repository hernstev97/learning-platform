/// <reference lib="webworker" />
// Runs Python in Pyodide, off the main thread. The main thread terminates this worker on timeout.
import harness from './harness.py?raw';
import { TEST_WHEELS, USES_TESTS } from './packages.ts';

type Pyodide = {
  FS: { writeFile(path: string, data: string): void };
  runPython(code: string): unknown;
  runPythonAsync(code: string): Promise<unknown>;
  loadPackage(names: string | string[]): Promise<unknown>;
  loadPackagesFromImports(code: string): Promise<unknown>;
  globals: { set(name: string, value: unknown): void };
  toPy(value: unknown): unknown;
};
export type Job =
  | { id: number; kind: 'exercise'; code: string; setup?: string; tests?: { name: string; code: string }[] }
  | { id: number; kind: 'snippet'; code: string }
  /** A lesson block that is a test file: pytest runs it. */
  | { id: number; kind: 'pytest'; code: string }
  | { id: number; kind: 'sql'; schema: string; query: string; solution: string }
  | { id: number; kind: 'sql-script'; code: string }
  /** Loads and imports the packages `code` needs (pandas takes seconds the first time), outside the time limit. */
  | { id: number; kind: 'prepare'; code: string };

let ready: Promise<Pyodide> | null = null;
function boot(): Promise<Pyodide> {
  ready ??= (async () => {
    // Absolute URL: keeps Vite from rewriting the import of this public (non-bundled) file.
    const url = `${self.location.origin}/pyodide/pyodide.mjs`;
    const { loadPyodide } = await import(/* @vite-ignore */ url);
    const pyodide: Pyodide = await loadPyodide({ indexURL: '/pyodide/', stdout: () => {}, stderr: () => {} });
    pyodide.FS.writeFile('/home/pyodide/harness.py', harness);
    pyodide.runPython('import sys\nsys.path.insert(0, "/home/pyodide")\nimport harness, json');
    return pyodide;
  })();
  return ready;
}

self.onmessage = async (event: MessageEvent<Job | { id: number; kind: 'boot' }>) => {
  const job = event.data;
  try {
    const pyodide = await boot();
    if (job.kind === 'boot') { self.postMessage({ id: job.id, result: { ready: true } }); return; }
    if (job.kind === 'prepare') {
      // Before the imports: resolving `import pytest` through the lock file would ask for wheels that are not there.
      if (USES_TESTS.test(job.code)) await pyodide.loadPackage(TEST_WHEELS.map((file) => `${self.location.origin}/pyodide/${file}`));
      try { await pyodide.loadPackagesFromImports(job.code); } catch { /* unknown imports surface as ImportError in Python */ }
      if (/zoneinfo|ZoneInfo/.test(job.code)) await pyodide.loadPackage('tzdata');
      // Exercises that only call run_pytest import pytest inside the timed run; its first import takes a second or two.
      pyodide.globals.set('source', USES_TESTS.test(job.code) ? `${job.code}\nimport pytest` : job.code);
      pyodide.runPython('harness.warm_imports(source)');
      self.postMessage({ id: job.id, result: { ready: true } });
      return;
    }
    pyodide.globals.set('job', pyodide.toPy(job));
    const json = job.kind === 'exercise'
      ? await pyodide.runPythonAsync('json.dumps(await harness.run_exercise(job.get("setup") or "", job["code"], job["tests"]))')
      : job.kind === 'sql'
        ? pyodide.runPython('json.dumps(harness.run_sql_exercise(job["schema"], job["query"], job["solution"]))')
        : job.kind === 'sql-script'
          ? pyodide.runPython('json.dumps(harness.run_sql_script(job["code"]))')
          : job.kind === 'pytest'
            ? pyodide.runPython('json.dumps(harness.run_pytest_snippet(job["code"]))')
            : await pyodide.runPythonAsync('json.dumps(await harness.run_snippet(job["code"]))');
    self.postMessage({ id: job.id, result: JSON.parse(String(json)) });
  } catch (error) {
    self.postMessage({ id: job.id, error: String((error as Error)?.message ?? error) });
  }
};
