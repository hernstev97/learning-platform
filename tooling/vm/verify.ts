// pnpm vm:verify [bereich | bereich/modul ...] [--jobs N] – proves the Linux content against the real image:
// - every scenario exercise: after `setup` at least one check fails, after `setup` plus `solution` (run as the
//   learner `ops`) every check passes;
// - every lesson with code blocks marked `vm`: after the module's `lab`, each block runs as `ops` in a login shell
//   and exits with 0 (blocks marked `fails` must fail), one after the other in the same VM.
// Runs v86 under Node from vendor/vm (pnpm vm:build); the tooling/fixtures area is included. Jobs are spread over
// several processes, each with its own VM (default: half the CPU cores, at most 6).
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { availableParallelism } from 'node:os';
import { dirname, join } from 'node:path';
import { V86 } from 'v86';
import { parse as parseYaml } from 'yaml';
import type { ScenarioExercise } from '../../src/content/types.ts';
import { languageOf } from '../../src/engine/highlight.ts';
import { AgentChannel, toBase64 } from '../../src/vm/channel.ts';
import { vmCommands } from '../../src/vm/commands.ts';
import { VM_DISK_SIZE, VM_IMAGE, vmOptions } from '../../src/vm/config.ts';
import { prepareScenario, runChecks, type CheckResult } from '../../src/vm/scenario.ts';
import { CONTENT, ROOT, formatIssues, lessonBlocks, loadContent } from '../content.ts';

const IMAGE = join(ROOT, 'vendor/vm', VM_IMAGE);
const args = process.argv.slice(2);
const option = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const only = args.filter((arg, i) => !arg.startsWith('--') && !['--jobs', '--shard'].includes(args[i - 1]));
const verbose = args.includes('--verbose');

type Job =
  | { kind: 'scenario'; name: string; exercise: ScenarioExercise }
  | { kind: 'lesson'; name: string; lab: string; blocks: { label: string; commands: string; fails: boolean }[] };

const jobs: Job[] = [];
for (const root of [CONTENT, join(ROOT, 'tooling/fixtures')]) {
  const loaded = loadContent(undefined, root);
  if (loaded.errors.length) { console.error(formatIssues(loaded.errors)); process.exit(1); }
  const selected = (area: string, module: string) => !only.length || only.some((o) => o === area || o === `${area}/${module}`);
  for (const [areaId, area] of Object.entries(loaded.areas)) {
    for (const module of Object.values(area.modules)) {
      if (module.bear || !selected(areaId, module.id)) continue;
      if (module.vm) {
        const lesson = String(parseYaml(readFileSync(join(root, areaId, 'modules', `${module.id}.yaml`), 'utf8')).lesson ?? '');
        const blocks = lessonBlocks(lesson).filter((block) => block.vm)
          .map((block) => ({ label: `Codeblock ${block.n}`, commands: vmCommands(block.code, languageOf(block.lang)), fails: block.flags.includes('fails') }));
        jobs.push({ kind: 'lesson', name: `${areaId}/${module.id} (Lektion)`, lab: module.lab ?? '', blocks });
      }
      for (const exercise of module.exercises) {
        if (exercise.type === 'scenario') jobs.push({ kind: 'scenario', name: `${areaId}/${exercise.id}`, exercise });
      }
    }
  }
}
if (!jobs.length) { console.log('Keine Szenarien und keine vm-Blöcke gefunden.'); process.exit(0); }

const shard = option('--shard');
if (!shard) {
  // Parent: one child process per job slice, each with its own VM.
  const count = Math.max(1, Math.min(Number(option('--jobs')) || Math.min(6, Math.floor(availableParallelism() / 2)), jobs.length));
  const passthrough = args.filter((arg, i) => arg !== '--jobs' && args[i - 1] !== '--jobs');
  const codes = await Promise.all(Array.from({ length: count }, (_, i) => new Promise<number>((resolve) => {
    const child = spawn(process.execPath, [process.argv[1], ...passthrough, '--shard', `${i}/${count}`], { stdio: 'inherit' });
    child.on('exit', (code) => resolve(code ?? 1));
  })));
  const failed = codes.reduce((sum, code) => sum + (code === 0 ? 0 : 1), 0);
  console.log(failed ? `\n${failed} von ${count} Prozessen meldeten Fehler (siehe oben).` : `\nAlle ${jobs.length} Prüfungen in Ordnung (${count} VMs parallel).`);
  process.exit(failed ? 1 : 0);
}

const [index, total] = shard.split('/').map(Number);
const mine = jobs.filter((_, i) => i % total === index);
const state = readFileSync(join(IMAGE, 'state.bin.zst'));
const snapshot = () => state.buffer.slice(state.byteOffset, state.byteOffset + state.byteLength);
const emulator = new V86({
  ...vmOptions({
    wasm: join(dirname(createRequire(import.meta.url).resolve('v86')), 'v86.wasm'),
    bios: join(IMAGE, 'seabios.bin'),
    vgaBios: join(IMAGE, 'vgabios.bin'),
    files: `${join(IMAGE, 'files')}/`,
  }, new ArrayBuffer(VM_DISK_SIZE)),
  initial_state: { buffer: snapshot() },
  autostart: true,
});
await new Promise((resolve) => emulator.add_listener('emulator-loaded', resolve));
const agent = new AgentChannel((bytes) => emulator.serial_send_bytes(1, bytes));
emulator.add_listener('serial1-output-byte', (byte) => agent.receive(byte));
if (verbose) emulator.add_listener('serial0-output-byte', (byte) => process.stdout.write(String.fromCharCode(byte)));

const restore = async () => {
  agent.reset();
  await emulator.stop();
  await emulator.restore_state(snapshot());
  await emulator.run();
};
// Solutions and lesson blocks run as the learner types them: as ops in a login shell, with sudo for privileged steps.
const asLearner = (script: string) => `f=$(mktemp); chmod 644 "$f"; echo ${toBase64(script)} | base64 -d > "$f"; runuser -l ops -c "bash $f"; code=$?; rm -f "$f"; exit $code`;
const summary = (results: CheckResult[]) => results.map((r) => `${r.ok ? '✓' : '✗'} ${r.name}${r.ok || !r.output ? '' : ` (${r.output.split('\n').pop()})`}`).join('\n      ');
const indent = (text: string) => text.replace(/^/gm, '      ');

async function scenario(exercise: ScenarioExercise): Promise<{ problems: string[]; ok: string }> {
  const problems: string[] = [];
  await restore();
  await prepareScenario(agent, exercise.setup);
  const before = await runChecks(agent, exercise.checks);
  if (before.every((r) => r.ok)) problems.push(`Nach setup bestehen schon alle Prüfungen:\n      ${summary(before)}`);

  await restore();
  await prepareScenario(agent, exercise.setup);
  const solution = await agent.run(asLearner(exercise.solution), 300_000);
  const after = await runChecks(agent, exercise.checks);
  if (!after.every((r) => r.ok)) problems.push(`Nach der Lösung scheitern Prüfungen:\n      ${summary(after)}\n    Ausgabe der Lösung:\n${indent(solution.output)}`);
  return { problems, ok: `vorher ${before.filter((r) => !r.ok).length} von ${before.length} Prüfungen offen, nachher alle bestanden` };
}

async function lesson(job: Extract<Job, { kind: 'lesson' }>): Promise<{ problems: string[]; ok: string }> {
  const problems: string[] = [];
  await restore();
  await prepareScenario(agent, job.lab);
  for (const block of job.blocks) {
    const { code, output } = await agent.run(asLearner(block.commands), 120_000);
    if (block.fails && code === 0) problems.push(`${block.label} ist als "fails" markiert, läuft aber fehlerfrei:\n${indent(block.commands)}`);
    if (!block.fails && code !== 0) problems.push(`${block.label} endet mit Exit-Code ${code}:\n${indent(block.commands)}\n    Ausgabe:\n${indent(output.trim())}`);
  }
  return { problems, ok: `${job.blocks.length} vm-Blöcke laufen` };
}

let failed = 0;
for (const job of mine) {
  let result: { problems: string[]; ok: string };
  try {
    result = job.kind === 'scenario' ? await scenario(job.exercise) : await lesson(job);
  } catch (error) {
    result = { problems: [(error as Error).message], ok: '' };
  }
  if (result.problems.length) {
    failed++;
    console.error(`✗ ${job.name}\n    ${result.problems.join('\n    ')}`);
  } else {
    console.log(`✓ ${job.name}: ${result.ok}`);
  }
}
await emulator.destroy();
process.exit(failed ? 1 : 0);
