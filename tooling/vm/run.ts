// pnpm vm:run [--tty] [--as ops|root] <skript.sh | -e 'befehle' | --reboot> … – for authors: restores a fresh VM and
// runs the given scripts one after the other, as root or, after --as ops, as the learner in a login shell (--as root
// switches back), and prints exit code, duration and output of each. --reboot between scripts reboots the VM and waits
// until lp-agent is back, so boot-related scenarios can be tried out; --tty also prints the console (ttyS0), e.g. GRUB
// and boot messages.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { V86 } from 'v86';
import { AgentChannel, toBase64 } from '../../src/vm/channel.ts';
import { VM_DISK_SIZE, VM_IMAGE, vmOptions } from '../../src/vm/config.ts';
import { prepareScenario } from '../../src/vm/scenario.ts';
import { ROOT } from '../content.ts';

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Aufruf: pnpm vm:run [--tty] [--as ops|root] skript.sh [-e 'befehle'] [--reboot] …");
  process.exit(2);
}
const IMAGE = join(ROOT, 'vendor/vm', VM_IMAGE);
const state = readFileSync(join(IMAGE, 'state.bin.zst'));
const emulator = new V86({
  ...vmOptions({
    wasm: join(dirname(createRequire(import.meta.url).resolve('v86')), 'v86.wasm'),
    bios: join(IMAGE, 'seabios.bin'),
    vgaBios: join(IMAGE, 'vgabios.bin'),
    files: `${join(IMAGE, 'files')}/`,
  }, new ArrayBuffer(VM_DISK_SIZE)),
  initial_state: { buffer: state.buffer.slice(state.byteOffset, state.byteOffset + state.byteLength) },
  autostart: true,
});
await new Promise((resolve) => emulator.add_listener('emulator-loaded', resolve));
const agent = new AgentChannel((bytes) => emulator.serial_send_bytes(1, bytes));
emulator.add_listener('serial1-output-byte', (byte) => agent.receive(byte));
if (args.includes('--tty')) emulator.add_listener('serial0-output-byte', (byte) => process.stdout.write(String.fromCharCode(byte)));
await prepareScenario(agent, '');

let asOps = false;
const wrap = (script: string) => asOps
  ? `f=$(mktemp); chmod 644 "$f"; echo ${toBase64(script)} | base64 -d > "$f"; runuser -l ops -c "bash $f"; code=$?; rm -f "$f"; exit $code`
  : script;
let failed = false;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--tty') continue;
  if (arg === '--as') { asOps = args[++i] === 'ops'; continue; }
  const started = Date.now();
  if (arg === '--reboot') {
    const back = agent.ready();
    await agent.run("setsid -f sh -c 'sleep 1; systemctl reboot' >/dev/null 2>&1 </dev/null");
    const timer = setTimeout(() => { console.error('\nKein Steuerkanal nach 4 Minuten (Rescue- oder Emergency-Modus?).'); process.exit(1); }, 240_000);
    await back;
    clearTimeout(timer);
    console.log(`--- Neustart: Steuerkanal nach ${((Date.now() - started) / 1000).toFixed(1)} s`);
    continue;
  }
  const [label, script] = arg === '-e' ? ['-e', args[++i]] : [arg, readFileSync(arg, 'utf8')];
  const { code, output } = await agent.run(wrap(script), 600_000);
  console.log(`--- ${label}: Exit-Code ${code} (${((Date.now() - started) / 1000).toFixed(1)} s)\n${output}`);
  failed ||= code !== 0;
}
await emulator.destroy();
process.exit(failed ? 1 : 0);
