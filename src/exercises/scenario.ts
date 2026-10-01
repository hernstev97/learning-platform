// scenario: diagnose and repair a broken system in a real Linux VM (src/vm/). Nothing loads before "Linux starten".
import type { ScenarioExercise } from '../content/types.ts';
import { $, $$, escape, html, icons, plural, raw } from '../ui/dom.ts';
import { runChecks } from '../vm/scenario.ts';
import { Aborted, startSession, type Session } from '../vm/terminal.ts';
import { codeCard } from './basic.ts';
import { failOnce, type ExerciseRenderer } from './types.ts';

export const scenario: ExerciseRenderer<ScenarioExercise, undefined> = (exercise, ctx) => ({
  markup: html`
    <div class="terminal vm">
      <div class="codeblock-bar"><span>ops@web01 · Debian 12</span><span class="vm-meta"><span id="vm-steps"></span><button type="button" id="vm-reset" hidden>Zurücksetzen</button></span></div>
      <div class="vm-start" id="vm-start">
        <p>Hier läuft ein echtes Debian mit systemd im Browser, ohne Netzwerk. Der erste Start lädt rund 30 MB, weitere Dateien kommen bei Bedarf. Du darfst alles, auch <code>sudo reboot</code>.</p>
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
    const leave = new AbortController();
    let session: Session | null = null;
    let busy = false;
    let steps = 0;
    const countSteps = (n: number) => { steps = n; $('#vm-steps', root).textContent = steps ? plural(steps, 'Befehl', 'Befehle') : ''; };

    const start = async () => {
      boot.disabled = true;
      try {
        session = await startSession({
          screen,
          prepare: exercise.setup,
          signal: leave.signal,
          preparing: 'Das Szenario wird eingerichtet …',
          status: (text) => { status.textContent = text; },
          show: () => { $('#vm-start', root).hidden = true; screen.hidden = false; },
          input: (enters) => { if (enters) countSteps(steps + enters); },
          live: () => {
            countSteps(0);
            $('#results', root).hidden = true;
            $$('.test', root).forEach((li) => { li.className = 'test pending'; li.querySelector('.test-mark')!.textContent = '·'; li.querySelector('.test-message')?.remove(); });
            checkButton.disabled = resetButton.disabled = resetButton.hidden = false;
          },
        });
      } catch (error) {
        if (error instanceof Aborted || leave.signal.aborted) return;
        // Loading failed before the terminal appeared, or the scenario's setup failed.
        const loading = screen.hidden;
        screen.hidden = true;
        screen.replaceChildren();
        $('#vm-start', root).hidden = false;
        boot.disabled = false;
        boot.innerHTML = `${icons.play} Erneut versuchen`;
        const hint = loading && !/Aufbau des Szenarios/.test((error as Error).message) ? ' Das passiert zum Beispiel, wenn ein Proxy große Downloads sperrt. Der Rest der Seite funktioniert weiter.' : '';
        status.innerHTML = html`<strong>Linux ließ sich nicht starten.</strong> ${(error as Error).message}${hint}`.value;
      }
    };

    const check = async () => {
      if (!session || busy) return;
      busy = true;
      checkButton.disabled = true;
      ctx.feedback('info', 'Der Zustand der VM wird geprüft …');
      try {
        const results = await runChecks(session.machine.agent, exercise.checks);
        if (leave.signal.aborted) return;
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
        if (!leave.signal.aborted) ctx.feedback('bad', `Die Prüfung lief nicht durch: ${(error as Error).message}`);
      } finally {
        busy = false;
        checkButton.disabled = !session;
      }
    };

    const reset = async () => {
      if (!session || busy) return;
      if (!confirm('Die VM auf den Anfang des Szenarios zurücksetzen? Deine Änderungen gehen verloren.')) return;
      busy = true;
      checkButton.disabled = resetButton.disabled = true;
      countSteps(0);
      try {
        await session.reset();
      } catch (error) {
        if (leave.signal.aborted) return;
        resetButton.disabled = false;
        ctx.feedback('bad', `Zurücksetzen hat nicht geklappt: ${(error as Error).message}`);
      } finally {
        busy = false;
      }
    };

    boot.addEventListener('click', start);
    checkButton.addEventListener('click', check);
    resetButton.addEventListener('click', reset);
    if (ctx.done) ctx.feedback('ok', 'Bereits gelöst.');
    return () => {
      leave.abort();
      session?.dispose();
    };
  },
});
