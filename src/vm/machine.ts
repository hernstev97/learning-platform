// Browser side of the Linux VM: loads v86 and the snapshot from /vm/ only when the learner starts a scenario, restores
// it and connects the terminal (ttyS0) and lp-agent (ttyS1). The VM has no network (see config.ts) and loads nothing
// from other sites.
import type { V86 } from 'v86';
import { AgentChannel } from './channel.ts';
import { VM_IMAGE, vmOptions } from './config.ts';

const BASE = `/vm/${VM_IMAGE}`;
const START_LIMIT = 90_000;
/** Every v86 state file starts with the zstd magic number (little endian). */
const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

export type Machine = {
  agent: AgentChannel;
  /** Keystrokes from the terminal. */
  type(data: string): void;
  /** Back to the snapshot; the caller sets the scenario up again. */
  reset(): Promise<void>;
  pause(): void;
  resume(): void;
  destroy(): void;
};

/** Kept for the session: another scenario or "Neu starten" restores without downloading again. */
let snapshot: Promise<ArrayBuffer> | null = null;

async function download(url: string, progress: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`${url} lieferte HTTP ${response.status}.`);
  const total = Number(response.headers.get('content-length')) || 0;
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  const reader = response.body.getReader();
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    chunks.push(part.value);
    loaded += part.value.length;
    progress(loaded, total);
  }
  const bytes = new Uint8Array(loaded);
  chunks.reduce((offset, chunk) => { bytes.set(chunk, offset); return offset + chunk.length; }, 0);
  // A proxy may answer with its own page instead of the file.
  if (!ZSTD_MAGIC.every((byte, i) => bytes[i] === byte)) throw new Error(`${url} ist kein VM-Abbild (${response.headers.get('content-type') ?? 'unbekannter Typ'}).`);
  return bytes.buffer;
}

export async function startMachine(output: (bytes: Uint8Array) => void, progress: (loaded: number, total: number) => void): Promise<Machine> {
  snapshot ??= download(`${BASE}/state.bin.zst`, progress).catch((error) => { snapshot = null; throw error; });
  const [{ V86: Emulator }, state] = await Promise.all([
    import(/* @vite-ignore */ `${location.origin}/vm/libv86.mjs`) as Promise<typeof import('v86')>,
    snapshot,
  ]);
  const emulator: V86 = new Emulator({
    ...vmOptions({ wasm: '/vm/v86.wasm', bios: `${BASE}/seabios.bin`, vgaBios: `${BASE}/vgabios.bin`, files: `${BASE}/files/` }),
    initial_state: { buffer: state.slice(0) },
    autostart: true,
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Die VM ist nicht rechtzeitig gestartet.')), START_LIMIT);
      emulator.add_listener('emulator-loaded', () => { clearTimeout(timer); resolve(); });
      emulator.add_listener('download-error', (event) => { clearTimeout(timer); reject(new Error(`${event.file_name} ließ sich nicht laden.`)); });
    });
  } catch (error) {
    void emulator.destroy();
    throw error;
  }

  // v86 emits one event per byte; hand them to the terminal in one piece per task.
  let pending: number[] = [];
  emulator.add_listener('serial0-output-byte', (byte) => {
    if (!pending.length) queueMicrotask(() => { const bytes = Uint8Array.from(pending); pending = []; output(bytes); });
    pending.push(byte);
  });
  const agent = new AgentChannel((bytes) => emulator.serial_send_bytes(1, bytes));
  emulator.add_listener('serial1-output-byte', (byte) => agent.receive(byte));
  const encoder = new TextEncoder();
  return {
    agent,
    type: (data) => emulator.serial_send_bytes(0, encoder.encode(data)),
    async reset() {
      agent.reset();
      await emulator.stop();
      await emulator.restore_state(state.slice(0));
      await emulator.run();
    },
    pause: () => void emulator.stop(),
    resume: () => void emulator.run(),
    destroy() {
      agent.reset('Die VM wurde beendet.');
      void emulator.destroy();
    },
  };
}
