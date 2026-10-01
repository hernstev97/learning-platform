// scenario: diagnose and repair a broken system in a real Linux VM (src/vm/). Nothing loads before "Linux starten".
import type { Terminal } from '@xterm/xterm';
import type { ScenarioExercise } from '../content/types.ts';
import { $, $$, escape, html, icons, plural, raw } from '../ui/dom.ts';
import { startMachine, type Machine } from '../vm/machine.ts';
import { prepareScenario, runChecks } from '../vm/scenario.ts';
import { codeCard } from './basic.ts';
import { failOnce, type ExerciseRenderer } from './types.ts';

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

export const scenario: ExerciseRenderer<ScenarioExercise, undefined> = (exercise, ctx) => ({
  markup: html`
    <div class="terminal vm">
      <div class="codeblock-bar"><span>ops@web01 · Debian 12</span><span class="vm-meta"><span id="vm-steps"></span><button type="button" id="vm-reset" hidden>Neu starten</button></span></div>
      <div class="vm-start" id="vm-start">
        <p>Hier läuft ein echtes Debian mit systemd im Browser, ohne Netzwerk. Der erste Start lädt rund 20 MB, weitere Dateien kommen bei Bedarf.</p>
        <button type="button" class="btn primary" id="vm-boot">${raw(icons.play)} Linux starten</button>
        <p class="vm-status" id="vm-status" role="status" aria-live="polite"></p>
      </div>
      <div class="vm-screen" id="vm-screen" hidden></div>
    </div>
    <div class="exercise-actions"><button type="button" class="btn primary" id="check" disabled>Prüfen</button><span class="muted small">Prüft den Zustand der VM, nicht den Weg dorthin.</span></div>
    <div class="test-results" id="results" hidden aria-live="polite">
      <p class="label">${plural(exercise.checks.length, 'Prüfung', 'Prüfungen')}</p>
      <ul>${exercise.checks.map((check, i) => html`<li id="check-${i}" class="test pending"><span class="test-mark" aria-hidden="true">·</span><span>${check.name}</span></li>`)}</ul>
    </div>`.value,
  solution: () => `${codeCard(exercise.solution, 'bash', 'Musterlösung')}${html`<p class="label">Geprüft wird</p><ul class="solution-list">${exercise.checks.map((check) => html`<li>${check.name}: <code>${check.run}</code></li>`)}</ul>`.value}`,
  bind(root) {
    const fail = failOnce(ctx);
    const boot = $<HTMLButtonElement>('#vm-boot', root);
    const status = $('#vm-status', root);
    const screen = $('#vm-screen', root);
    const checkButton = $<HTMLButtonElement>('#check', root);
    const resetButton = $<HTMLButtonElement>('#vm-reset', root);
    let machine: Machine | null = null;
    let terminal: Terminal | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let active = true;
    let busy = false;
    // Only a prepared scenario reaches the terminal: output from the setup phase (bash redrawing its prompt after a
    // resize, for example) is dropped, and typing waits until the fault is in place.
    let live = false;
    let steps = 0;
    const countSteps = (n: number) => { steps = n; $('#vm-steps', root).textContent = steps ? plural(steps, 'Befehl', 'Befehle') : ''; };
    const sizeTty = (vm: Machine, term: Terminal) => vm.agent.run(`stty -F /dev/ttyS0 rows ${term.rows} cols ${term.cols}`);

    const setUp = async (vm: Machine) => {
      live = false;
      if (terminal) {
        terminal.options.disableStdin = true;
        terminal.reset();
        terminal.write('\x1b[90mDas Szenario wird eingerichtet …\x1b[0m');
      }
      await prepareScenario(vm.agent, exercise.setup);
    };
    // A fresh prompt (Ctrl+L makes bash redraw it) and the learner's turn.
    const goLive = async (vm: Machine, term: Terminal) => {
      await sizeTty(vm, term);
      term.reset();
      // bash switched on bracketed paste at this prompt before the snapshot; the reset forgot it. Without it, pasted
      // lines arrive as typed-ahead input, which sudo discards.
      term.write('\x1b[?2004h');
      live = true;
      term.options.disableStdin = false;
      vm.type('\x0c');
      countSteps(0);
      $('#results', root).hidden = true;
      $$('.test', root).forEach((li) => { li.className = 'test pending'; li.querySelector('.test-mark')!.textContent = '·'; li.querySelector('.test-message')?.remove(); });
      checkButton.disabled = resetButton.disabled = resetButton.hidden = false;
      term.focus();
    };

    const start = async () => {
      boot.disabled = true;
      status.textContent = 'Linux wird geladen …';
      try {
        const [{ Terminal }, { FitAddon }] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit'), import('@xterm/xterm/css/xterm.css'), document.fonts.ready]);
        const vm = await startMachine((bytes) => { if (live) terminal?.write(bytes); }, (loaded, total) => {
          status.textContent = `Linux wird geladen … ${mb(loaded)}${total ? ` von ${mb(total)}` : ''}`;
        });
        if (!active) { vm.destroy(); return; }
        machine = vm;
        status.textContent = 'Das Szenario wird eingerichtet …';
        await setUp(vm);
        if (!active) return;
        const term = new Terminal({
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 14,
          cursorBlink: true,
          scrollback: 5000,
          disableStdin: true,
          theme: { background: '#0b0b0b', foreground: '#f3f0e8', cursor: '#ff4f00', selectionBackground: '#5a4a3a' },
        });
        const fit = new FitAddon();
        term.loadAddon(fit);
        $('#vm-start', root).hidden = true;
        screen.hidden = false;
        term.open(screen);
        fit.fit();
        terminal = term;
        term.onData((data) => {
          if (!live) return;
          const enters = data.split('\r').length - 1;
          if (enters) countSteps(steps + enters);
          vm.type(data);
        });
        let timer: ReturnType<typeof setTimeout> | undefined;
        resizeObserver = new ResizeObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(() => { fit.fit(); if (live) sizeTty(vm, term).catch(() => undefined); }, 150);
        });
        resizeObserver.observe(screen);
        await goLive(vm, term);
      } catch (error) {
        if (!active) return;
        // Without a machine, loading failed; with one, the scenario's setup did.
        const hint = machine ? '' : ' Das passiert zum Beispiel, wenn ein Proxy große Downloads sperrt. Der Rest der Seite funktioniert weiter.';
        machine?.destroy();
        machine = null;
        terminal?.dispose();
        terminal = null;
        screen.hidden = true;
        screen.replaceChildren();
        $('#vm-start', root).hidden = false;
        boot.disabled = false;
        boot.innerHTML = `${icons.play} Erneut versuchen`;
        status.innerHTML = html`<strong>Linux ließ sich nicht starten.</strong> ${(error as Error).message}${hint}`.value;
      }
    };

    const check = async () => {
      if (!machine || busy) return;
      busy = true;
      checkButton.disabled = true;
      ctx.feedback('info', 'Der Zustand der VM wird geprüft …');
      try {
        const results = await runChecks(machine.agent, exercise.checks);
        if (!active) return;
        $('#results', root).hidden = false;
        results.forEach((result, i) => {
          const li = $(`#check-${i}`, root);
          li.className = `test ${result.ok ? 'pass' : 'fail'}`;
          li.querySelector('.test-mark')!.textContent = result.ok ? '✓' : '✗';
          li.querySelector('.test-message')?.remove();
          if (!result.ok && result.output) li.insertAdjacentHTML('beforeend', `<span class="test-message">${escape(result.output.slice(-400))}</span>`);
        });
        const passed = results.filter((result) => result.ok).length;
        if (passed === results.length) ctx.complete();
        else {
          fail(results.map((result) => result.ok));
          ctx.feedback(passed ? 'partial' : 'bad', `${passed} von ${results.length} Prüfungen bestanden. Lies die Meldungen, dann weiter im Terminal.`);
        }
      } catch (error) {
        if (active) ctx.feedback('bad', `Die Prüfung lief nicht durch: ${(error as Error).message} Hilft nichts, setze das Szenario mit „Neu starten“ zurück.`);
      } finally {
        busy = false;
        checkButton.disabled = !machine;
      }
    };

    const reset = async () => {
      if (!machine || !terminal || busy) return;
      if (!confirm('Die VM auf den Anfang des Szenarios zurücksetzen? Deine Änderungen gehen verloren.')) return;
      busy = true;
      live = false;
      checkButton.disabled = resetButton.disabled = true;
      try {
        await machine.reset();
        await setUp(machine);
        await goLive(machine, terminal);
      } catch (error) {
        if (!active) return;
        resetButton.disabled = false;
        ctx.feedback('bad', `Neu starten hat nicht geklappt: ${(error as Error).message}`);
      } finally {
        busy = false;
      }
    };

    // A VM in a background tab would only burn CPU.
    const onVisibility = () => { if (machine) { if (document.hidden) machine.pause(); else machine.resume(); } };
    document.addEventListener('visibilitychange', onVisibility);
    boot.addEventListener('click', start);
    checkButton.addEventListener('click', check);
    resetButton.addEventListener('click', reset);
    if (ctx.done) ctx.feedback('ok', 'Bereits gelöst.');
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibility);
      resizeObserver?.disconnect();
      terminal?.dispose();
      machine?.destroy();
    };
  },
});
