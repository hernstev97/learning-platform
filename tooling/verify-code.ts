// pnpm verify [bereich ...]
// Executes what can be executed locally, so published solutions are known to work:
//  - Python `code` exercises: the solution passes every test, the starter fails at least one.
//  - Python/Rust `output` exercises: the program prints exactly the expected output.
//  - Rust programs (gap, order, practice, lesson blocks with fn main): they compile; #[test]s pass.
//  - Python lesson blocks marked `run`: they run without an exception (unless flagged `fails`).
//  - Shell `output` exercises only with `verify: true` (they run in a throwaway directory).
//  - Shell `practice` exercises with `verify: true`: the solution runs under `set -euo pipefail`
//    in a throwaway directory and must exit 0 (used for Git break-and-repair labs).
// Needs python3 and rustc. Kotlin is not compiled (no toolchain dependency); the Bear course is
// checked by its own generator instead.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ROOT, loadContent } from './content.ts';
import { assemble, fixedCode, gapSolution, normalizeOutput } from '../src/engine/answers.ts';
import type { BugExercise, GapExercise, OrderExercise, OutputExercise } from '../src/content/types.ts';

type Job = { label: string; run: () => Promise<string | null> };
const HARNESS = join(ROOT, 'src/python/harness.py');
const only = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const root = process.argv.includes('--fixtures') ? join(ROOT, 'tooling/fixtures') : join(ROOT, 'content');
const loaded = loadContent(only, root, { allowMissing: process.argv.includes('--allow-missing') });
if (loaded.errors.length) { console.error('Inhalte sind ungültig – erst pnpm content:check beheben.'); process.exit(1); }

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

async function python(job: object): Promise<any> {
  const result = await exec('python3', [HARNESS], { input: JSON.stringify(job), timeout: 15000 });
  if (result.timedOut) throw new Error('Zeitüberschreitung (15 s)');
  if (result.code !== 0) throw new Error(result.stderr.trim().split('\n').slice(-5).join('\n'));
  return JSON.parse(result.stdout);
}

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

const diff = (expected: string, actual: string) => `erwartet:\n${expected.replace(/^/gm, '    │ ')}\n  tatsächlich:\n${actual.replace(/^/gm, '    │ ')}`;
const jobs: Job[] = [];
let skipped = 0;

for (const { area, file, exercise: authored, normalized } of loaded.raw) {
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
    } else skipped++;
  } else if (normalized.type === 'practice' && ['bash', 'sh', 'shell'].includes(lang) && authored.verify === true) {
    jobs.push({ label, run: async () => {
      const result = await bash(normalized.solution, { strict: true });
      return result.code === 0 ? null : `Musterlösung endet mit Exit-Code ${result.code}:\n${(result.stdout + result.stderr).trim().split('\n').slice(-15).join('\n')}`;
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
const FENCE = /^```(\S+)([^\n]*)\n([\s\S]*?)^```\s*$/gm;
for (const areaId of Object.keys(loaded.areas)) {
  for (const module of Object.values(loaded.areas[areaId].modules)) {
    if (module.bear) continue;
    const file = join(root, areaId, 'modules', `${module.id}.yaml`);
    const lesson = String(parseYaml(readFileSync(file, 'utf8')).lesson ?? '');
    let n = 0;
    for (const match of lesson.matchAll(FENCE)) {
      n++;
      const [, lang, flagText, code] = match;
      const flags = flagText.trim().split(/\s+/);
      const label = `${areaId}/modules/${module.id}.yaml › Lektion, Codeblock ${n} (${lang})`;
      if (lang === 'python' && flags.includes('run')) {
        jobs.push({ label, run: async () => {
          const result = await python({ kind: 'snippet', code });
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
console.log(`\n${done} Prüfungen ausgeführt, ${failures} fehlgeschlagen, ${skipped} Übungen ohne ausführbare Prüfung.`);
process.exit(failures ? 1 : 0);
