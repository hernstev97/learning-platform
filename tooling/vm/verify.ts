// pnpm vm:verify [bereich | bereich/modul ...] – proves every scenario exercise against the real image: after `setup`
// at least one check fails, after `setup` plus `solution` (run as the learner `ops`) every check passes. Runs v86
// under Node from vendor/vm (pnpm vm:build); the tooling/fixtures scenario is included. Takes seconds per scenario.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { V86 } from 'v86';
import type { ScenarioExercise } from '../../src/content/types.ts';
import { AgentChannel, toBase64 } from '../../src/vm/channel.ts';
import { VM_IMAGE, vmOptions } from '../../src/vm/config.ts';
import { prepareScenario, runChecks, type CheckResult } from '../../src/vm/scenario.ts';
import { ROOT, formatIssues, loadContent } from '../content.ts';

const IMAGE = join(ROOT, 'vendor/vm', VM_IMAGE);
const only = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const verbose = process.argv.includes('--verbose');

const loaded = [loadContent(), loadContent(undefined, join(ROOT, 'tooling/fixtures'))];
const errors = loaded.flatMap((l) => l.errors);
if (errors.length) { console.error(formatIssues(errors)); process.exit(1); }
const scenarios = loaded.flatMap((l) => l.raw)
  .filter((r) => r.normalized.type === 'scenario')
  .filter((r) => !only.length || only.some((o) => o === r.area || o === `${r.area}/${r.module}`))
  .map((r) => ({ name: `${r.area}/${r.normalized.id}`, exercise: r.normalized as ScenarioExercise }));
if (!scenarios.length) { console.log('Keine Szenarien gefunden.'); process.exit(0); }

const state = readFileSync(join(IMAGE, 'state.bin.zst'));
const snapshot = () => state.buffer.slice(state.byteOffset, state.byteOffset + state.byteLength);
const emulator = new V86({
  ...vmOptions({
    wasm: join(dirname(createRequire(import.meta.url).resolve('v86')), 'v86.wasm'),
    bios: join(IMAGE, 'seabios.bin'),
    vgaBios: join(IMAGE, 'vgabios.bin'),
    files: `${join(IMAGE, 'files')}/`,
  }),
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
// The solution runs as the learner types it: as ops in a login shell, with sudo for privileged steps.
const asLearner = (script: string) => `f=$(mktemp); chmod 644 "$f"; echo ${toBase64(script)} | base64 -d > "$f"; runuser -l ops -c "bash $f"; code=$?; rm -f "$f"; exit $code`;
const summary = (results: CheckResult[]) => results.map((r) => `${r.ok ? '✓' : '✗'} ${r.name}${r.ok || !r.output ? '' : ` (${r.output.split('\n').pop()})`}`).join('\n      ');

let failed = 0;
for (const { name, exercise } of scenarios) {
  const problems: string[] = [];
  try {
    await restore();
    await prepareScenario(agent, exercise.setup);
    const before = await runChecks(agent, exercise.checks);
    if (before.every((r) => r.ok)) problems.push(`Nach setup bestehen schon alle Prüfungen:\n      ${summary(before)}`);

    await restore();
    await prepareScenario(agent, exercise.setup);
    const solution = await agent.run(asLearner(exercise.solution), 120_000);
    const after = await runChecks(agent, exercise.checks);
    if (!after.every((r) => r.ok)) problems.push(`Nach der Lösung scheitern Prüfungen:\n      ${summary(after)}\n    Ausgabe der Lösung:\n${solution.output.replace(/^/gm, '      ')}`);
    if (!problems.length) console.log(`✓ ${name}: vorher ${before.filter((r) => !r.ok).length} von ${before.length} Prüfungen offen, nachher alle bestanden`);
  } catch (error) {
    problems.push((error as Error).message);
  }
  if (problems.length) {
    failed++;
    console.error(`✗ ${name}\n    ${problems.join('\n    ')}`);
  }
}
await emulator.destroy();
console.log(`\n${scenarios.length - failed} von ${scenarios.length} Szenarien in Ordnung.`);
process.exit(failed ? 1 : 0);
