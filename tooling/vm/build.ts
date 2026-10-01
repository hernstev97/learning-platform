// pnpm vm:build – builds the Linux image for scenario exercises into vendor/vm/<image>/ (committed, like the
// Pyodide wheels in vendor/pyodide). Steps:
// 1. Docker builds the root filesystem from tooling/vm/Dockerfile and exports it as a tar.
// 2. The v86 tools (tooling/vm/v86) turn it into one zstd file per file, which the browser fetches only when the VM
//    reads it, plus a file table (fs.json) that only this boot needs: the snapshot carries its own.
// 3. v86 boots the system under Node, waits for lp-agent and the login prompt and saves the state, so the
//    browser starts in seconds instead of booting.
// Needs docker with buildx, python3 (3.14, or the zstandard module) and zstd. Takes a few minutes.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { V86 } from 'v86';
import { AgentChannel } from '../../src/vm/channel.ts';
import { VM_IMAGE, vmOptions } from '../../src/vm/config.ts';
import { ROOT } from '../content.ts';

const HERE = join(ROOT, 'tooling/vm');
const OUT = join(ROOT, 'vendor/vm', VM_IMAGE);
const BOOT_LIMIT = 15 * 60_000;
const verbose = process.argv.includes('--verbose');

// Docker and the v86 tools log every file; show that only with --verbose or when a step fails.
const run = (cmd: string, args: string[]) => {
  try {
    execFileSync(cmd, args, { stdio: verbose ? 'inherit' : 'pipe', maxBuffer: 256 * 1024 * 1024 });
  } catch (error) {
    process.stderr.write((error as { stderr?: Buffer }).stderr ?? '');
    throw error;
  }
};
const step = (text: string) => console.log(`\n▸ ${text}`);

const work = mkdtempSync(join(tmpdir(), 'lp-vm-'));
const tar = join(work, 'rootfs.tar');
const fsJson = join(work, 'fs.json');
try {
  step('Root-Dateisystem mit Docker bauen');
  run('docker', ['buildx', 'build', '--platform', 'linux/386', '--output', `type=tar,dest=${tar}`, HERE]);

  step(`Dateien nach ${OUT.replace(`${ROOT}/`, '')} schreiben`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, 'files'), { recursive: true });
  run('python3', [join(HERE, 'v86/fs2json.py'), '--zstd', '--out', fsJson, tar]);
  run('python3', [join(HERE, 'v86/copy-to-sha256.py'), '--zstd', tar, join(OUT, 'files')]);
  for (const bios of ['seabios.bin', 'vgabios.bin']) writeFileSync(join(OUT, bios), readFileSync(join(HERE, 'v86', bios)));

  step('System in v86 booten und Zustand speichern');
  const state = await boot();
  const raw = join(work, 'state.bin');
  writeFileSync(raw, new Uint8Array(state));
  run('zstd', ['-19', '-q', '-f', raw, '-o', join(OUT, 'state.bin.zst')]);

  const files = readdirSync(join(OUT, 'files'));
  const bytes = (path: string) => statSync(path).size;
  const total = files.reduce((sum, name) => sum + bytes(join(OUT, 'files', name)), 0);
  const manifest = {
    image: VM_IMAGE,
    v86: createRequire(import.meta.url)('v86/package.json').version as string,
    built: new Date().toISOString(),
    files: files.length,
    filesBytes: total,
    stateBytes: bytes(join(OUT, 'state.bin.zst')),
  };
  writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  console.log(`\nFertig: ${manifest.files} Dateien (${mb(total)}), Zustand ${mb(manifest.stateBytes)}.`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

async function boot(): Promise<ArrayBuffer> {
  const v86Dir = dirname(createRequire(import.meta.url).resolve('v86'));
  const emulator = new V86({
    ...vmOptions({
      wasm: join(v86Dir, 'v86.wasm'),
      bios: join(OUT, 'seabios.bin'),
      vgaBios: join(OUT, 'vgabios.bin'),
      fsJson,
      files: `${join(OUT, 'files')}/`,
    }),
    bzimage_initrd_from_filesystem: true,
    autostart: true,
  });
  const agent = new AgentChannel((bytes) => emulator.serial_send_bytes(1, bytes));
  emulator.add_listener('serial1-output-byte', (byte) => agent.receive(byte));
  let console0 = '';
  emulator.add_listener('serial0-output-byte', (byte) => {
    const char = String.fromCharCode(byte);
    console0 = (console0 + char).slice(-4000);
    if (verbose) process.stdout.write(char);
  });
  const started = Date.now();
  const limit = setTimeout(() => {
    console.error(`\nKein Start nach ${BOOT_LIMIT / 60_000} Minuten. Letzte Ausgabe auf ttyS0:\n${console0}`);
    process.exit(1);
  }, BOOT_LIMIT);

  await agent.ready();
  console.log(`  Steuerkanal nach ${Math.round((Date.now() - started) / 1000)} s`);
  const status = await agent.run('systemctl is-system-running --wait; systemctl --failed --no-legend --plain', 10 * 60_000);
  console.log(`  System: ${status.output.trim().replace(/\n/g, '\n          ')}`);
  if (!/^(running|degraded)/.test(status.output)) throw new Error('systemd ist nicht hochgefahren.');
  // The prompt is coloured and sets the window title, so compare without escape sequences.
  const plain = () => console0.replace(/\x1b\][^\x07]*\x07|\x1b\[[0-9;?]*[A-Za-z]/g, '');
  while (!plain().trimEnd().endsWith('ops@web01:~$')) await new Promise((resolve) => setTimeout(resolve, 500));
  // The image must not reach any network: loopback is the only interface allowed.
  const interfaces = (await agent.run('ls /sys/class/net')).output.trim();
  if (interfaces !== 'lo') throw new Error(`Die VM hat Netzwerkschnittstellen außer lo: ${interfaces.replace(/\n/g, ', ')}`);
  console.log('  Netzwerk: nur lo');
  // Keep kernel messages off the learner's terminal; drop caches so the state holds less memory.
  await agent.run('dmesg -n 1; sync; echo 3 > /proc/sys/vm/drop_caches');
  clearTimeout(limit);
  console.log(`  Bereit nach ${Math.round((Date.now() - started) / 1000)} s`);
  const state = await emulator.save_state();
  await emulator.destroy();
  return state;
}
