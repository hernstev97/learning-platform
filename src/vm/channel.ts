// Client for lp-agent, the control channel on the VM's second serial port (tooling/vm/rootfs/usr/local/sbin/lp-agent).
// A request is one line "<id> <bash script as base64>", the answer one line "@@<id> <exit code> <output as base64>".
// Used by the browser (scenario setup, checks, clock, terminal size) and by tooling/vm/build.ts.

export type RunResult = { code: number; output: string };
type Pending = { id: number; script: string; timeout: number; resolve: (result: RunResult) => void; reject: (error: Error) => void };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(text: string): string {
  let binary = '';
  for (const byte of encoder.encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(value: string): string {
  return decoder.decode(Uint8Array.from(atob(value), (char) => char.charCodeAt(0)));
}

export class AgentChannel {
  private line = '';
  private nextId = 1;
  private queue: Pending[] = [];
  private current: (Pending & { timer: ReturnType<typeof setTimeout> }) | null = null;
  private readyListeners: (() => void)[] = [];
  private readonly send: (bytes: Uint8Array) => void;

  /** `send` writes raw bytes to ttyS1 (v86: `serial_send_bytes(1, bytes)`). */
  constructor(send: (bytes: Uint8Array) => void) {
    this.send = send;
  }

  /** Feed every byte from ttyS1 (v86 event `serial1-output-byte`). */
  receive(byte: number): void {
    if (byte !== 10) {
      this.line += String.fromCharCode(byte);
      return;
    }
    const line = this.line.replace(/\r$/, '');
    this.line = '';
    if (line === '@@ready') {
      for (const listener of this.readyListeners.splice(0)) listener();
      return;
    }
    const match = /^@@(\d+) (\d+) ?([A-Za-z0-9+/=]*)$/.exec(line);
    if (!match || !this.current || Number(match[1]) !== this.current.id) return;
    const { resolve, timer } = this.current;
    clearTimeout(timer);
    this.current = null;
    resolve({ code: Number(match[2]), output: fromBase64(match[3]) });
    this.next();
  }

  /** Resolves when the agent announces itself (only after a boot, not after restoring a snapshot). */
  ready(): Promise<void> {
    return new Promise((resolve) => this.readyListeners.push(resolve));
  }

  /** Runs a bash script as root inside the VM. Requests are sent one at a time. */
  run(script: string, timeout = 30_000): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ id: this.nextId++, script, timeout, resolve, reject });
      if (!this.current) this.next();
    });
  }

  /** Rejects everything that is pending, e.g. when the VM is restarted. */
  reset(reason = 'Die VM wurde neu gestartet.'): void {
    const pending = [...(this.current ? [this.current] : []), ...this.queue.splice(0)];
    if (this.current) clearTimeout(this.current.timer);
    this.current = null;
    this.line = '';
    for (const request of pending) request.reject(new Error(reason));
  }

  private next(): void {
    const request = this.queue.shift();
    if (!request) return;
    const timer = setTimeout(() => {
      this.current = null;
      request.reject(new Error('Die VM antwortet nicht.'));
      this.next();
    }, request.timeout);
    this.current = { ...request, timer };
    this.send(encoder.encode(`${request.id} ${toBase64(request.script)}\n`));
  }
}
