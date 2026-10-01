// A terminal on the Linux VM: xterm.js on ttyS0 of a machine from machine.ts, prepared with a bash script (a scenario's
// setup or a lesson's lab). Shared by scenario exercises and the terminal in Linux lessons. Nothing loads before
// startSession; the VM pauses in a background tab and stops with dispose().
import type { Terminal } from '@xterm/xterm';
import { startMachine, type Machine } from './machine.ts';
import { prepareScenario } from './scenario.ts';

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
/** A fresh autologin on ttyS0; done once the new login shell runs. */
const RELOGIN = `old=$(pgrep -t ttyS0 -x bash)
systemctl restart serial-getty@ttyS0.service
for i in $(seq 150); do
  new=$(pgrep -t ttyS0 -x bash)
  [ -n "$new" ] && [ "$new" != "$old" ] && exit 0
  sleep 0.2
done
exit 1`;

export type SessionOptions = {
  /** The element the terminal fills. */
  screen: HTMLElement;
  /** Bash script run as root after every restore, before the prompt appears. */
  prepare: string;
  /** Shown while `prepare` runs, in the status line and in the terminal. */
  preparing: string;
  /** Progress while loading and preparing, for a status line. */
  status(text: string): void;
  /** Called once right before the terminal opens: make `screen` visible, xterm measures it. */
  show(): void;
  /** The prompt is the learner's: after the start and after every reset. */
  live?(): void;
  /** Every input from the learner; `enters` counts the Enter presses in it (one per command). */
  input?(enters: number): void;
  /** Aborts the start, e.g. when the page is left while Linux is loading. */
  signal: AbortSignal;
};

export type Session = {
  machine: Machine;
  /** Back to the snapshot, `prepare` again, fresh prompt. The fault of a scenario is back in place. */
  reset(): Promise<void>;
  /** Pastes commands at the prompt as one block and runs them. */
  paste(text: string): void;
  focus(): void;
  dispose(): void;
};

/** Thrown when the start was aborted; callers ignore it. */
export class Aborted extends Error {}

export async function startSession(options: SessionOptions): Promise<Session> {
  const { screen, signal } = options;
  const check = () => { if (signal.aborted) throw new Aborted('abgebrochen'); };
  options.status('Linux wird geladen …');
  const [{ Terminal: Xterm }, { FitAddon }] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit'), import('@xterm/xterm/css/xterm.css'), document.fonts.ready]);
  check();
  let terminal: Terminal | null = null;
  // Only a prepared machine reaches the terminal: output from the setup phase (bash redrawing its prompt after a
  // resize, for example) is dropped, and typing waits until `prepare` has run.
  let live = false;
  const machine = await startMachine((bytes) => { if (live) terminal?.write(bytes); }, (loaded, total) => {
    options.status(`Linux wird geladen … ${mb(loaded)}${total ? ` von ${mb(total)}` : ''}`);
  });
  if (signal.aborted) { machine.destroy(); check(); }

  let observer: ResizeObserver | null = null;
  const onVisibility = () => { if (document.hidden) machine.pause(); else machine.resume(); };
  const dispose = () => {
    document.removeEventListener('visibilitychange', onVisibility);
    observer?.disconnect();
    terminal?.dispose();
    machine.destroy();
  };
  try {
    // A VM in a background tab would only burn CPU.
    document.addEventListener('visibilitychange', onVisibility);
    const sizeTty = (term: Terminal) => machine.agent.run(`stty -F /dev/ttyS0 rows ${term.rows} cols ${term.cols}`);
    const prepare = async () => {
      live = false;
      if (terminal) {
        terminal.options.disableStdin = true;
        terminal.reset();
        terminal.write(`\x1b[90m${options.preparing}\x1b[0m`);
      }
      options.status(options.preparing);
      await prepareScenario(machine.agent, options.prepare);
      // The login shell on ttyS0 comes from the snapshot and is older than `prepare`: it knows neither new groups nor
      // changed start files. Restarting the getty logs ops in again, as a learner would after logging out and in.
      if (options.prepare.trim()) await machine.agent.run(RELOGIN, 30_000);
    };
    // A fresh prompt (Ctrl+L makes bash redraw it) and the learner's turn.
    const goLive = async (term: Terminal) => {
      await sizeTty(term);
      term.reset();
      // bash switched on bracketed paste at this prompt before the snapshot; the reset forgot it. Without it, pasted
      // lines arrive as typed-ahead input, which sudo discards.
      term.write('\x1b[?2004h');
      live = true;
      term.options.disableStdin = false;
      machine.type('\x0c');
      options.live?.();
      term.focus();
    };

    await prepare();
    check();
    const term = new Xterm({
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 14,
      cursorBlink: true,
      scrollback: 5000,
      disableStdin: true,
      theme: { background: '#0b0b0b', foreground: '#f3f0e8', cursor: '#ff4f00', selectionBackground: '#5a4a3a' },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    options.show();
    term.open(screen);
    fit.fit();
    terminal = term;
    term.onData((data) => {
      if (!live) return;
      options.input?.(data.split('\r').length - 1);
      machine.type(data);
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (screen.offsetHeight) fit.fit(); if (live) sizeTty(term).catch(() => undefined); }, 150);
    });
    observer.observe(screen);
    // After a reboot inside the VM the serial line starts at 80×24 again; set the size once the new login shell runs.
    machine.agent.onReady(() => {
      machine.agent.run(`for i in $(seq 60); do pgrep -t ttyS0 -x bash >/dev/null && break; sleep 0.5; done; stty -F /dev/ttyS0 rows ${term.rows} cols ${term.cols}`, 45_000).catch(() => undefined);
    });
    await goLive(term);

    return {
      machine,
      async reset() {
        await machine.reset();
        await prepare();
        await goLive(term);
      },
      paste(text) {
        if (!live) return;
        // Both go through onData like typed input: bracketed paste if bash asked for it, then Enter.
        term.paste(text.replace(/\n+$/, ''));
        term.input('\r');
        term.focus();
      },
      focus: () => term.focus(),
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
