// The Linux terminal of a lesson: docked at the bottom of the window, started on first use (a `vm` code block or the
// button in the lesson head), stopped when it is closed or the lesson is left. The module's `lab` script prepares the
// VM, e.g. with the sample files the lesson's examples use.
import { $, icons } from '../ui/dom.ts';
import { Aborted, startSession, type Session } from './terminal.ts';

export type Dock = {
  /** Opens the terminal (starting Linux if needed) and runs the commands at the prompt. */
  run(commands: string): void;
  open(): void;
  dispose(): void;
};

export function createDock(lab: string | null): Dock {
  let element: HTMLElement | null = null;
  let session: Session | null = null;
  let leave: AbortController | null = null;
  let queued: string[] = [];
  let busy = false;

  const close = () => {
    leave?.abort();
    session?.dispose();
    session = null;
    queued = [];
    element?.remove();
    element = null;
    document.body.classList.remove('vm-dock-open');
  };

  const open = () => {
    if (element) {
      element.classList.remove('collapsed');
      document.body.classList.add('vm-dock-open');
      $('#dock-toggle', element).textContent = 'Einklappen';
      session?.focus();
      return;
    }
    const dock = document.createElement('section');
    dock.className = 'vm-dock terminal no-print';
    dock.setAttribute('aria-label', 'Linux-Terminal');
    dock.innerHTML = `
      <div class="codeblock-bar"><span>Linux-Terminal · ops@web01</span><span class="vm-meta">
        <button type="button" id="dock-reset" hidden>Zurücksetzen</button>
        <button type="button" id="dock-toggle">Einklappen</button>
        <button type="button" id="dock-close" aria-label="Terminal schließen">${icons.cross}</button>
      </span></div>
      <p class="vm-status" id="dock-status" role="status" aria-live="polite"></p>
      <div class="vm-screen" id="dock-screen" hidden></div>`;
    document.body.append(dock);
    document.body.classList.add('vm-dock-open');
    element = dock;
    const status = $('#dock-status', dock);
    const screen = $('#dock-screen', dock);
    const resetButton = $<HTMLButtonElement>('#dock-reset', dock);
    $('#dock-close', dock).addEventListener('click', close);
    $('#dock-toggle', dock).addEventListener('click', () => {
      const collapsed = dock.classList.toggle('collapsed');
      document.body.classList.toggle('vm-dock-open', !collapsed);
      $('#dock-toggle', dock).textContent = collapsed ? 'Aufklappen' : 'Einklappen';
      if (!collapsed) session?.focus();
    });
    resetButton.addEventListener('click', async () => {
      if (!session || busy || !confirm('Das Terminal auf den Anfang zurücksetzen? Deine Änderungen in der VM gehen verloren.')) return;
      busy = true;
      resetButton.disabled = true;
      try { await session.reset(); } catch (error) { status.textContent = `Zurücksetzen hat nicht geklappt: ${(error as Error).message}`; } finally { busy = false; resetButton.disabled = false; }
    });

    const signal = (leave = new AbortController()).signal;
    startSession({
      screen,
      prepare: lab ?? '',
      signal,
      preparing: 'Beispieldateien werden angelegt …',
      status: (text) => { status.textContent = text; },
      show: () => { status.textContent = ''; screen.hidden = false; },
      live: () => { resetButton.hidden = false; },
    }).then((started) => {
      session = started;
      // Blocks clicked while Linux was loading run now, one after the other.
      for (const command of queued.splice(0)) started.paste(command);
    }).catch((error) => {
      if (error instanceof Aborted || signal.aborted) return;
      status.innerHTML = '';
      const strong = document.createElement('strong');
      strong.textContent = 'Linux ließ sich nicht starten. ';
      status.append(strong, `${(error as Error).message} Das passiert zum Beispiel, wenn ein Proxy große Downloads sperrt. Der Rest der Seite funktioniert weiter.`);
    });
  };

  return {
    run(commands) {
      open();
      if (session) session.paste(commands);
      else queued.push(commands);
    },
    open,
    dispose: close,
  };
}
