/// <reference lib="webworker" />
// Runs Python in Pyodide, off the main thread. The main thread terminates this worker on timeout.
import harness from './harness.py?raw';

type Pyodide = {
  FS: { writeFile(path: string, data: string): void };
  runPython(code: string): unknown;
  runPythonAsync(code: string): Promise<unknown>;
  loadPackage(names: string | string[]): Promise<unknown>;
  loadPackagesFromImports(code: string): Promise<unknown>;
  globals: { set(name: string, value: unknown): void };
  toPy(value: unknown): unknown;
};
export type Job = { id: number; kind: 'exercise' | 'snippet'; code: string; setup?: string; tests?: { name: string; code: string }[] };

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
    const all = [job.setup ?? '', job.code, ...(job.tests ?? []).map((test) => test.code)].join('\n');
    try { await pyodide.loadPackagesFromImports(all); } catch { /* unknown imports surface as ImportError in Python */ }
    if (/zoneinfo|ZoneInfo/.test(all)) await pyodide.loadPackage('tzdata');
    pyodide.globals.set('job', pyodide.toPy(job));
    const json = job.kind === 'exercise'
      ? await pyodide.runPythonAsync('json.dumps(await harness.run_exercise(job.get("setup") or "", job["code"], job["tests"]))')
      : await pyodide.runPythonAsync('json.dumps(await harness.run_snippet(job["code"]))');
    self.postMessage({ id: job.id, result: JSON.parse(String(json)) });
  } catch (error) {
    self.postMessage({ id: job.id, error: String((error as Error)?.message ?? error) });
  }
};
