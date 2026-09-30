// sql: write a query that runs in the browser (SQLite in Pyodide) and returns the same result as the model solution.
import type { SqlExercise } from '../content/types.ts';
import { compareSql } from '../engine/sql.ts';
import { onRunnerState, runnerNotice, runSql } from '../python/runner.ts';
import { autosize, editorKeys } from '../ui/code.ts';
import { $, escape, html, icons, raw } from '../ui/dom.ts';
import { rowCount, sqlTableMarkup } from '../ui/sql-table.ts';
import { codeCard } from './basic.ts';
import { failOnce, type ExerciseRenderer } from './types.ts';

const RUNNER_IDLE = '<span class="kbd-hint">Strg + Enter · </span>läuft direkt im Browser (SQLite)';

export const sql: ExerciseRenderer<SqlExercise, string> = (exercise, ctx) => ({
  markup: html`
    <section class="sql-tables" aria-label="Tabellen der Übung">
      <p class="label">Datenbank · ${exercise.tables.length === 1 ? '1 Tabelle' : `${exercise.tables.length} Tabellen`}</p>
      ${exercise.tables.map((table, i) => html`<details class="sql-table" ${i === 0 || exercise.tables.length <= 2 ? 'open' : ''}>
        <summary><code>${table.name}</code><span class="muted small">${rowCount(table.total)} · ${table.columns.length} Spalten</span></summary>
        ${raw(sqlTableMarkup(table.columns, table.rows, table.cells, table.total))}
      </details>`)}
      <details class="test-source"><summary class="label">Tabellen als SQL ansehen</summary>${raw(codeCard(exercise.schema, 'sql', 'SQL · Aufbau der Datenbank'))}</details>
    </section>
    <div class="codeblock editor-block" data-lang="sql">
      <div class="codeblock-bar"><span>SQL · deine Abfrage</span><button type="button" id="reset">Zurücksetzen</button></div>
      <textarea id="editor" class="code-editor" wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Deine SQL-Abfrage. Tab rückt ein, Strg+Enter führt aus, Escape dann Tab verlässt den Editor.">${ctx.draft ?? exercise.starter}</textarea>
    </div>
    <div class="exercise-actions"><button type="button" class="btn primary" id="run">${raw(icons.play)} Abfrage ausführen &amp; prüfen</button><span class="muted small" id="runner-state">${raw(RUNNER_IDLE)}</span></div>
    <section id="sql-result" class="sql-result" aria-live="polite" hidden></section>
    <p class="check-note">Verglichen wird dein Ergebnis mit dem der Musterlösung: Spaltennamen (Groß-/Kleinschreibung egal), Werte${exercise.ordered ? ' und Reihenfolge der Zeilen' : '. Die Reihenfolge der Zeilen zählt hier nicht'}. Die Datenbank wird für jeden Lauf neu aufgebaut.</p>`.value,
  solution: () => codeCard(exercise.solution, 'sql', 'Musterlösung'),
  bind(root) {
    const editor = $<HTMLTextAreaElement>('#editor', root);
    const runButton = $<HTMLButtonElement>('#run', root);
    const stateLabel = $('#runner-state', root);
    const out = $('#sql-result', root);
    // Like code exercises: running is part of writing, so a wrong result counts once per distinct query.
    const fail = failOnce(ctx);
    let active = true;
    autosize(editor, 6);
    const run = async () => {
      if (runButton.disabled) return;
      if (!editor.value.trim()) { ctx.feedback('bad', 'Schreib zuerst eine Abfrage.'); return; }
      runButton.disabled = true;
      ctx.feedback('info', 'Abfrage läuft …');
      try {
        const { actual, expected } = await runSql(exercise.schema, editor.value, exercise.solution);
        if (!active) return;
        const verdict = compareSql(expected, actual, exercise.ordered);
        out.hidden = false;
        out.className = `sql-result${actual.error ? ' error' : ''}`;
        out.innerHTML = actual.error
          ? `<p class="label">Fehler</p><pre class="run-output standalone error">${escape(actual.error)}</pre>`
          : `<p class="label">Dein Ergebnis · ${rowCount(actual.rows.length)}${actual.truncated ? ' (gekürzt)' : ''}</p>${sqlTableMarkup(actual.columns, actual.rows, actual.cells)}`;
        if (verdict.ok) ctx.complete();
        else { fail(editor.value.trim()); ctx.feedback(actual.error ? 'bad' : 'partial', verdict.message); }
      } catch (error) {
        if (!active) return;
        out.hidden = false;
        out.className = 'sql-result error';
        out.innerHTML = `<pre class="run-output standalone error">${escape((error as Error).message)}</pre>`;
        ctx.feedback('bad', 'Die Abfrage konnte nicht ausgeführt werden.');
      } finally { runButton.disabled = false; }
    };
    editorKeys(editor, run);
    editor.addEventListener('input', () => ctx.save(editor.value));
    runButton.addEventListener('click', run);
    $('#reset', root).addEventListener('click', () => {
      if (editor.value !== exercise.starter && !confirm('Deine Abfrage durch den Start ersetzen?')) return;
      editor.value = exercise.starter;
      ctx.save(editor.value);
      editor.dispatchEvent(new Event('input'));
    });
    const unsubscribe = onRunnerState((state) => { stateLabel.innerHTML = runnerNotice(state, RUNNER_IDLE); });
    return () => { active = false; unsubscribe(); };
  },
});
