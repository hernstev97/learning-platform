// pnpm verify [bereich | bereich/modul ...]
// Executes what can be executed locally, so published solutions are known to work:
//  - Python `code` exercises: the solution passes every test, the starter fails at least one.
//  - Python/Rust/TypeScript/JavaScript `output` exercises: the program prints exactly the expected output
//    (TypeScript and JavaScript run in Node; only code without imports of npm packages works there).
//  - Rust programs (gap, order, practice, lesson blocks with fn main): they compile; #[test]s pass.
//  - Python lesson blocks marked `run`: they run without an exception (unless flagged `fails`).
//  - Shell `output` exercises only with `verify: true` (they run in a throwaway directory).
//  - Shell `practice` exercises with `verify: true`: the solution runs under `set -euo pipefail`
//    in a throwaway directory and must exit 0 (used for Git break-and-repair labs).
//  - SQL (`sql` exercises, `output` exercises and lesson blocks marked `run`) runs in Pyodide under Node,
//    i.e. with exactly the SQLite version of the browser: solutions return rows, starters do not already.
//  - PostgreSQL (`lang: postgres`, lesson blocks `postgres run`) runs in PGlite under Node, the same build as in the
//    browser: the same rules as for SQLite; with `check`, the check query returns rows after the solution and a
//    different result after the starter.
//  - Python lesson blocks marked `pytest`: pytest runs them; all tests pass (with `fails`: some fail).
//  - Python that imports pandas or numpy, uses pytest or Hypothesis or calls `run_pytest` runs in a virtual
//    environment with the versions the browser loads (node_modules/.cache/verify-python, created with uv on first use).
// Needs python3 and rustc, for pandas and pytest also uv. Kotlin is not compiled (no toolchain dependency); the Bear
// course is checked by its own generator instead.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ROOT, lessonBlocks, loadContent } from './content.ts';
import { assemble, fixedCode, gapSolution, normalizeOutput } from '../src/engine/answers.ts';
import { languageOf } from '../src/engine/highlight.ts';
import { compareSql } from '../src/engine/sql.ts';
import type { PgEngine } from '../src/pg/engine.ts';
import { testPins, USES_TESTS } from '../src/python/packages.ts';
import { nodeEngine } from './pg-node.ts';
import type { BugExercise, GapExercise, OrderExercise, OutputExercise, SqlExercise } from '../src/content/types.ts';

type Job = { label: string; run: () => Promise<string | null> };
const HARNESS = join(ROOT, 'src/python/harness.py');
const only = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const root = process.argv.includes('--fixtures') ? join(ROOT, 'tooling/fixtures') : join(ROOT, 'content');
const loaded = loadContent(only.map((arg) => arg.split('/')[0]), root, { allowMissing: process.argv.includes('--allow-missing') });
// `bereich/modul` checks single modules, e.g. while other modules of the same area are still being written.
const modules = only.filter((arg) => arg.includes('/'));
const selected = (area: string, module: string) => !modules.length || modules.includes(`${area}/${module}`) || only.includes(area);
const relevant = loaded.errors.filter((issue) => !modules.length || issue.file.endsWith('/area.yaml') || modules.some((m) => issue.file.endsWith(`${m.replace('/', '/modules/')}.yaml`)));
if (relevant.length) { console.error('Inhalte sind ungültig – erst pnpm content:check beheben.'); process.exit(1); }

function exec(command: string, args: string[], options: { input?: string; cwd?: string; timeout?: number; env?: Record<string, string> } = {}): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const env = options.env ? { ...process.env, ...options.env } : process.env;
    const child = spawn(command, args, { cwd: options.cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, options.timeout ?? 20000);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }); });
    child.stdin.on('error', () => { /* the program may exit before reading stdin (EPIPE) */ });
    child.stdin.end(options.input ?? '');
  });
}

// pandas and numpy in the browser's versions, pinned by Pyodide's lock file, plus pytest and Hypothesis in the
// versions of the wheels the browser loads.
const DATA_PACKAGES = ['numpy', 'pandas', 'python-dateutil', 'pytz', 'six'];
const USES_DATA = /^\s*(?:import|from)\s+(?:pandas|numpy)\b/m;
let packagePython: Promise<string> | null = null;
function packageEnvironment(): Promise<string> {
  packagePython ??= (async () => {
    const lock = JSON.parse(readFileSync(join(ROOT, 'node_modules/pyodide/pyodide-lock.json'), 'utf8'));
    const pins = [...DATA_PACKAGES.map((name) => `${name}==${lock.packages[name].version}`), ...testPins()];
    const dir = join(ROOT, 'node_modules/.cache/verify-python', createHash('sha256').update(pins.join(' ')).digest('hex').slice(0, 12));
    const bin = join(dir, 'bin/python');
    if (existsSync(bin)) return bin;
    for (const args of [['venv', '--quiet', '--python', '3.14', dir], ['pip', 'install', '--quiet', '--python', bin, ...pins]]) {
      const result = await exec('uv', args, { timeout: 300000 });
      if (result.code !== 0) throw new Error(`uv ${args[0]} fehlgeschlagen (für pandas- und pytest-Übungen wird uv gebraucht):\n${result.stderr.trim()}`);
    }
    return bin;
  })();
  return packagePython;
}

async function python(job: { code: string; setup?: string; tests?: { code: string }[] } & Record<string, unknown>): Promise<any> {
  const source = [job.setup ?? '', job.code, ...(job.tests ?? []).map((test) => test.code)].join('\n');
  const interpreter = job.kind === 'pytest' || USES_DATA.test(source) || USES_TESTS.test(source) ? await packageEnvironment() : 'python3';
  const result = await exec(interpreter, [HARNESS], { input: JSON.stringify(job), timeout: 15000 });
  if (result.timedOut) throw new Error('Zeitüberschreitung (15 s)');
  if (result.code !== 0) throw new Error(result.stderr.trim().split('\n').slice(-5).join('\n'));
  return JSON.parse(result.stdout);
}

// One Pyodide instance for all SQL checks: the same SQLite (and harness) as in the browser.
type Harness = (call: string, args: Record<string, unknown>) => any;
let sqlHarness: Promise<Harness> | null = null;
function pyodideHarness(): Promise<Harness> {
  sqlHarness ??= (async () => {
    const { loadPyodide } = await import('pyodide');
    const pyodide = await loadPyodide({ stdout: () => {}, stderr: () => {} });
    pyodide.FS.writeFile('/home/pyodide/harness.py', readFileSync(HARNESS, 'utf8'));
    pyodide.runPython('import sys\nsys.path.insert(0, "/home/pyodide")\nimport harness, json');
    return (call, args) => {
      pyodide.globals.set('args', pyodide.toPy(args));
      return JSON.parse(String(pyodide.runPython(`json.dumps(harness.${call})`)));
    };
  })();
  return sqlHarness;
}
const sqlScript = async (code: string): Promise<{ text: string; error: string | null }> => (await pyodideHarness())('run_sql_script(args["code"])', { code });
// One PostgreSQL for all checks; every run clones a fresh database from it, as in the browser.
let pgEngine: Promise<PgEngine> | null = null;
const postgres = () => pgEngine ??= nodeEngine();

/** Comments and whitespace only: nothing to run. */
const blankSql = (code: string) => !code.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '').trim();

const EXTERNAL_CRATE = /^\s*(?:use|extern crate)\s+(?!std\b|core\b|alloc\b|crate\b|self\b|super\b)([a-z_][a-z0-9_]*)/m;
const externalCrate = (code: string) => code.match(EXTERNAL_CRATE)?.[1] ?? (/#\[tokio::|\b(?:serde|tokio|anyhow|thiserror|clap|rayon|axum|reqwest)::/.test(code) ? 'extern' : null);

async function rust(code: string, mode: 'run' | 'check' | 'test'): Promise<{ stdout: string }> {
  const dir = mkdtempSync(join(tmpdir(), 'verify-rust-'));
  try {
    const source = join(dir, 'main.rs');
    writeFileSync(source, code);
    const hasMain = /\bfn main\s*\(/.test(code);
    const args = ['--edition', '2024', '-A', 'warnings', '-o', join(dir, 'bin'), source];
    if (mode === 'test') args.unshift('--test');
    else if (!hasMain) args.unshift('--crate-type', 'lib');
    const compiled = await exec('rustc', args, { cwd: dir, timeout: 60000 });
    if (compiled.code !== 0) throw new Error(compiled.stderr.trim().split('\n').slice(0, 25).join('\n'));
    if (mode === 'check' || (!hasMain && mode !== 'test')) return { stdout: '' };
    const ran = await exec(join(dir, 'bin'), mode === 'test' ? ['--quiet'] : [], { cwd: dir, timeout: 15000 });
    if (ran.timedOut) throw new Error('Zeitüberschreitung beim Ausführen');
    if (ran.code !== 0) throw new Error(`Exit-Code ${ran.code}\n${(ran.stdout + ran.stderr).trim().split('\n').slice(-15).join('\n')}`);
    return { stdout: ran.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Git scenarios must not depend on the machine: no global or system config, a fixed identity,
// no pager or editor, English messages. Hashes still differ per run (commit times are real).
const GIT_ENV = {
  GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'init.defaultBranch', GIT_CONFIG_VALUE_0: 'main',
  GIT_AUTHOR_NAME: 'Lea Lernt', GIT_AUTHOR_EMAIL: 'lea@example.com',
  GIT_COMMITTER_NAME: 'Lea Lernt', GIT_COMMITTER_EMAIL: 'lea@example.com',
  GIT_PAGER: 'cat', GIT_EDITOR: 'true', GIT_TERMINAL_PROMPT: '0', LC_MESSAGES: 'C', LANGUAGE: '',
};

async function bash(code: string, options: { strict?: boolean } = {}): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const dir = mkdtempSync(join(tmpdir(), 'verify-sh-'));
  try {
    const flags = options.strict ? ['-euo', 'pipefail'] : [];
    const result = await exec('bash', ['--noprofile', '--norc', ...flags, '-c', code], { cwd: dir, timeout: 15000, env: GIT_ENV });
    if (result.timedOut) throw new Error('Zeitüberschreitung (15 s)');
    return result;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** TypeScript and JavaScript `output` exercises run in Node (TypeScript through Node's type stripping). */
async function script(code: string, language: string): Promise<{ stdout: string }> {
  const dir = mkdtempSync(join(tmpdir(), 'verify-script-'));
  try {
    const file = join(dir, language === 'typescript' ? 'main.ts' : 'main.mjs');
    writeFileSync(file, code);
    const result = await exec(process.execPath, ['--disable-warning=ExperimentalWarning', file], { cwd: dir, timeout: 15000 });
    if (result.timedOut) throw new Error('Zeitüberschreitung (15 s)');
    if (result.code !== 0) throw new Error(`Exit-Code ${result.code}\n${result.stderr.trim().split('\n').slice(0, 15).join('\n')}`);
    return { stdout: result.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const diff = (expected: string, actual: string) => `erwartet:\n${expected.replace(/^/gm, '    │ ')}\n  tatsächlich:\n${actual.replace(/^/gm, '    │ ')}`;
const jobs: Job[] = [];
let skipped = 0;

for (const { area, module, file, exercise: authored, normalized } of loaded.raw) {
  if (!selected(area, module)) continue;
  const label = `${file} › ${normalized.id} (${normalized.type})`;
  const lang = 'lang' in normalized ? normalized.lang : '';
  if (authored.verify === false) { skipped++; continue; }
  if (normalized.type === 'code') {
    jobs.push({ label, run: async () => {
      const good = await python({ kind: 'exercise', setup: normalized.setup, code: normalized.solution, tests: normalized.tests });
      if (good.error) return `Lösung wirft einen Fehler:\n${good.error}`;
      const failed = good.tests.filter((t: any) => !t.ok);
      if (failed.length) return `Lösung besteht ${failed.length} Test(s) nicht: ${failed.map((t: any) => `${t.name} – ${t.message}`).join('; ')}`;
      const starter = await python({ kind: 'exercise', setup: normalized.setup, code: normalized.starter, tests: normalized.tests });
      if (!starter.error && starter.tests.every((t: any) => t.ok)) return 'Der Startcode besteht bereits alle Tests – die Tests prüfen zu wenig.';
      return null;
    } });
  } else if (normalized.type === 'output') {
    const ex = normalized as OutputExercise;
    if (lang === 'python') {
      jobs.push({ label, run: async () => {
        const result = await python({ kind: 'snippet', code: ex.code });
        if (result.error) return `Programm wirft einen Fehler:\n${result.error}`;
        return normalizeOutput(result.stdout) === normalizeOutput(ex.expected[0]) ? null : diff(normalizeOutput(ex.expected[0]), normalizeOutput(result.stdout));
      } });
    } else if (lang === 'rust') {
      if (!/\bfn main\s*\(/.test(ex.code)) { skipped++; continue; }
      if (externalCrate(ex.code)) { skipped++; continue; }
      jobs.push({ label, run: async () => {
        const { stdout } = await rust(ex.code, 'run');
        return normalizeOutput(stdout) === normalizeOutput(ex.expected[0]) ? null : diff(normalizeOutput(ex.expected[0]), normalizeOutput(stdout));
      } });
    } else if (['bash', 'sh', 'shell'].includes(lang) && authored.verify === true) {
      jobs.push({ label, run: async () => {
        const { stdout } = await bash(ex.code);
        return normalizeOutput(stdout) === normalizeOutput(ex.expected[0]) ? null : diff(normalizeOutput(ex.expected[0]), normalizeOutput(stdout));
      } });
    } else if (['typescript', 'javascript'].includes(languageOf(lang))) {
      jobs.push({ label, run: async () => {
        const { stdout } = await script(ex.code, languageOf(lang));
        return normalizeOutput(stdout) === normalizeOutput(ex.expected[0]) ? null : diff(normalizeOutput(ex.expected[0]), normalizeOutput(stdout));
      } });
    } else if (lang === 'sql' || lang === 'postgres') {
      jobs.push({ label, run: async () => {
        const result = lang === 'postgres' ? await (await postgres()).script(ex.code) : await sqlScript(ex.code);
        if (result.error) return `SQL wirft einen Fehler:\n${result.error}`;
        return normalizeOutput(result.text) === normalizeOutput(ex.expected[0]) ? null : diff(normalizeOutput(ex.expected[0]), normalizeOutput(result.text));
      } });
    } else skipped++;
  } else if (normalized.type === 'sql' && normalized.engine === 'postgres') {
    const ex = normalized as SqlExercise;
    jobs.push({ label, run: async () => {
      const engine = await postgres();
      const { expected } = await engine.exercise(ex.schema, ex.solution, ex.solution, ex.check);
      if (expected.error) return `Musterlösung ${ex.check ? 'oder Prüfabfrage ' : ''}wirft einen Fehler:\n${expected.error}`;
      if (!expected.rows.length) return `${ex.check ? 'Die Prüfabfrage' : 'Die Musterlösung'} liefert keine Zeilen – eine Aufgabe mit leerem Ergebnis lässt sich nicht sinnvoll prüfen.`;
      if (!blankSql(ex.starter)) {
        const { actual } = await engine.exercise(ex.schema, ex.starter, ex.solution, ex.check);
        if (compareSql(expected, actual, ex.ordered, !!ex.check).ok) return `${ex.check ? 'Nach den Startanweisungen liefert die Prüfabfrage' : 'Die Startabfrage liefert'} bereits das erwartete Ergebnis.`;
      } else if (ex.check) {
        // Without any statement of the learner: the check query on the bare schema must not pass yet.
        const { actual } = await engine.exercise(ex.schema, ex.check, ex.solution, null);
        if (compareSql(expected, actual, ex.ordered, true).ok) return 'Die Prüfabfrage besteht schon ohne eine Anweisung – sie prüft zu wenig.';
      }
      return null;
    } });
  } else if (normalized.type === 'sql') {
    const ex = normalized as SqlExercise;
    jobs.push({ label, run: async () => {
      const harness = await pyodideHarness();
      const run = (query: string) => harness('run_sql_exercise(args["schema"], args["query"], args["solution"])', { schema: ex.schema, query, solution: ex.solution });
      const { expected } = run(ex.solution);
      if (expected.error) return `Musterlösung wirft einen Fehler:\n${expected.error}`;
      if (!expected.rows.length) return 'Musterlösung liefert keine Zeilen – eine Aufgabe mit leerem Ergebnis lässt sich nicht sinnvoll prüfen.';
      if (!blankSql(ex.starter)) {
        const { actual } = run(ex.starter);
        if (compareSql(expected, actual, ex.ordered).ok) return 'Die Startabfrage liefert bereits das erwartete Ergebnis.';
      }
      return null;
    } });
  } else if (normalized.type === 'practice' && ['bash', 'sh', 'shell'].includes(lang) && authored.verify === true) {
    jobs.push({ label, run: async () => {
      const result = await bash(normalized.solution, { strict: true });
      // 141 is SIGPIPE: under pipefail, `producer | grep -q …` or `| head` fails whenever the producer writes after the reader has quit.
      const hint = result.code === 141 ? '\n(141 = SIGPIPE: eine Pipeline mit grep -q oder head hat den Leser früh beendet, der Schreiber schrieb weiter. Statt grep -q: grep … > /dev/null.)' : '';
      return result.code === 0 ? null : `Musterlösung endet mit Exit-Code ${result.code}:\n${(result.stdout + result.stderr).trim().split('\n').slice(-15).join('\n')}${hint}`;
    } });
  } else if (normalized.type === 'bug' && lang === 'python' && (normalized as BugExercise).fixes.length) {
    const code = fixedCode(normalized as BugExercise);
    jobs.push({ label, run: async () => {
      const result = await python({ kind: 'compile', code });
      return result.error ? `Korrigierter Code ist kein gültiges Python:\n${result.error}` : null;
    } });
  } else if (lang === 'rust') {
    let code = '';
    let mode: 'check' | 'test' = 'check';
    if (normalized.type === 'gap') code = assemble(normalized as GapExercise, gapSolution(normalized as GapExercise));
    else if (normalized.type === 'order') code = (normalized as OrderExercise).lines.join('\n');
    else if (normalized.type === 'practice') code = normalized.solution;
    else if (normalized.type === 'bug' && (normalized as BugExercise).fixes.length) code = fixedCode(normalized as BugExercise);
    if (!code || externalCrate(code)) { skipped++; continue; }
    const standalone = /\bfn main\s*\(/.test(code) || /#\[test\]/.test(code) || normalized.type === 'practice';
    if (!standalone) { skipped++; continue; }
    if (/#\[test\]/.test(code)) mode = 'test';
    jobs.push({ label, run: async () => { await rust(code, mode); return null; } });
  } else skipped++;
  void area;
}

// Lesson code blocks.
for (const areaId of Object.keys(loaded.areas)) {
  for (const module of Object.values(loaded.areas[areaId].modules)) {
    if (module.bear || !selected(areaId, module.id)) continue;
    const file = join(root, areaId, 'modules', `${module.id}.yaml`);
    const lesson = String(parseYaml(readFileSync(file, 'utf8')).lesson ?? '');
    for (const { n, lang, flags, code } of lessonBlocks(lesson)) {
      const label = `${areaId}/modules/${module.id}.yaml › Lektion, Codeblock ${n} (${lang})`;
      if (lang === 'python' && flags.includes('pytest')) {
        jobs.push({ label, run: async () => {
          const result = await python({ kind: 'pytest', code });
          if (result.error) return `${result.error}\n${result.stdout}`;
          if (flags.includes('fails')) return result.exit_code === 1 ? null : 'als "fails" markiert, aber alle Tests bestehen';
          return result.exit_code === 0 ? null : `Tests schlagen fehl:\n${result.stdout}`;
        } });
      } else if (lang === 'python' && flags.includes('run')) {
        jobs.push({ label, run: async () => {
          const result = await python({ kind: 'snippet', code });
          if (flags.includes('fails')) return result.error ? null : 'als "fails" markiert, läuft aber fehlerfrei';
          return result.error ? `Codeblock wirft einen Fehler:\n${result.error}` : null;
        } });
      } else if ((lang === 'sql' || languageOf(lang) === 'postgres') && flags.includes('run')) {
        jobs.push({ label, run: async () => {
          if (flags.includes('continue') && lang !== 'sql') {
            // Errors are part of the demonstration; the block only must show at least one and run to its end.
            const result = await (await postgres()).script(code, true);
            return result.results.some((r) => r.error) ? null : 'als "continue" markiert, aber keine Anweisung scheitert – dann genügt "run"';
          }
          const result = lang === 'sql' ? await sqlScript(code) : await (await postgres()).script(code);
          if (flags.includes('fails')) return result.error ? null : 'als "fails" markiert, läuft aber fehlerfrei';
          return result.error ? `Codeblock wirft einen Fehler:\n${result.error}` : null;
        } });
      } else if (lang === 'rust' && /\bfn main\s*\(/.test(code) && !flags.includes('nocheck') && !flags.includes('norun') && !externalCrate(code)) {
        jobs.push({ label, run: async () => { await rust(code, /#\[test\]/.test(code) ? 'test' : 'check'); return null; } });
      }
    }
  }
}

let failures = 0;
let done = 0;
const queue = [...jobs];
async function worker() {
  for (let job = queue.shift(); job; job = queue.shift()) {
    let problem: string | null;
    try { problem = await job.run(); } catch (error) { problem = (error as Error).message; }
    done++;
    if (problem) {
      failures++;
      console.error(`\n✗ ${job.label}\n  ${problem.replace(/\n/g, '\n  ')}`);
    }
  }
}
await Promise.all(Array.from({ length: Math.max(2, availableParallelism() - 1) }, worker));
const started = pgEngine as Promise<PgEngine> | null;
if (started) await (await started).base.close();
console.log(`\n${done} Prüfungen ausgeführt, ${failures} fehlgeschlagen, ${skipped} Übungen ohne ausführbare Prüfung.`);
process.exit(failures ? 1 : 0);
