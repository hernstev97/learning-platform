// sql: write a query that runs in the browser (SQLite in Pyodide or PostgreSQL in PGlite) and returns the same result
// as the model solution. With `check` (PostgreSQL), the learner writes statements and a check query judges the result.
import type { SqlExercise } from '../content/types.ts';
import type { PgStatementResult } from '../pg/engine.ts';
import { onPgState, pgNotice, runPgExercise } from '../pg/runner.ts';
import { compareSql, type SqlResultLike } from '../engine/sql.ts';
import { onRunnerState, runnerNotice, runSql } from '../python/runner.ts';
import { autosize, editorKeys } from '../ui/code.ts';
import { $, escape, html, icons, raw } from '../ui/dom.ts';
import { pgResultsMarkup, rowCount, sqlTableMarkup } from '../ui/sql-table.ts';
import { codeCard } from './basic.ts';
import { failOnce, type ExerciseRenderer } from './types.ts';

const idle = (engine: SqlExercise['engine']) => `<span class="kbd-hint">Strg + Enter · </span>läuft direkt im Browser (${engine === 'postgres' ? 'PostgreSQL 18' : 'SQLite'})`;

/** Runs the learner's SQL and the solution on the exercise's engine; `script` is the output of the learner's statements (check mode). */
async function execute(exercise: SqlExercise, query: string): Promise<{ actual: SqlResultLike & { truncated: boolean }; expected: SqlResultLike; script: PgStatementResult[] | null }> {
  if (exercise.engine === 'postgres') return runPgExercise(exercise.schema, query, exercise.solution, exercise.check);
  return { ...await runSql(exercise.schema, query, exercise.solution), script: null };
}

export const sql: ExerciseRenderer<SqlExercise, string> = (exercise, ctx) => ({
  markup: html`
    <section class="sql-tables" aria-label="Tabellen der Übung">
      <p class="label">Datenbank · ${exercise.tables.length === 1 ? '1 Tabelle' : `${exercise.tables.length} Tabellen`}</p>
      ${exercise.tables.map((table, i) => html`<details class="sql-table" ${i === 0 || exercise.tables.length <= 2 ? 'open' : ''}>
        <summary><code>${table.name}</code><span class="muted small">${rowCount(table.total)} · ${table.columns.length} Spalten</span></summary>
        ${raw(sqlTableMarkup(table.columns, table.rows, table.cells, table.total))}
      </details>`)}
      <details class="test-source"><summary class="label">Tabellen als SQL ansehen</summary>${raw(codeCard(exercise.schema, exercise.lang, `${exercise.engine === 'postgres' ? 'PostgreSQL' : 'SQL'} · Aufbau der Datenbank`))}</details>
      ${exercise.check ? html`<details class="test-source"><summary class="label">Prüfabfrage ansehen</summary>${raw(codeCard(exercise.check, exercise.lang, 'Läuft nach deinen Anweisungen'))}</details>` : ''}
    </section>
    <div class="codeblock editor-block" data-lang="${exercise.lang}">
      <div class="codeblock-bar"><span>${exercise.engine === 'postgres' ? 'PostgreSQL' : 'SQL'} · ${exercise.check ? 'deine Anweisungen' : 'deine Abfrage'}</span><button type="button" id="reset">Zurücksetzen</button></div>
      <textarea id="editor" class="code-editor" wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="${exercise.check ? 'Deine SQL-Anweisungen' : 'Deine SQL-Abfrage'}. Tab rückt ein, Strg+Enter führt aus, Escape dann Tab verlässt den Editor.">${ctx.draft ?? exercise.starter}</textarea>
    </div>
    <div class="exercise-actions"><button type="button" class="btn primary" id="run">${raw(icons.play)} ${exercise.check ? 'Ausführen' : 'Abfrage ausführen'} &amp; prüfen</button><span class="muted small" id="runner-state">${raw(idle(exercise.engine))}</span></div>
    <section id="sql-result" class="sql-result" aria-live="polite" hidden></section>
    <p class="check-note">${exercise.check
      ? `Nach deinen Anweisungen läuft die Prüfabfrage. Verglichen wird ihr Ergebnis mit dem nach der Musterlösung: Spaltennamen, Werte${exercise.ordered ? ' und Reihenfolge der Zeilen' : ''}. Wie du dorthin kommst, ist dir überlassen.`
      : `Verglichen wird dein Ergebnis mit dem der Musterlösung: Spaltennamen (Groß-/Kleinschreibung egal), Werte${exercise.ordered ? ' und Reihenfolge der Zeilen' : '. Die Reihenfolge der Zeilen zählt hier nicht'}.`} Die Datenbank wird für jeden Lauf neu aufgebaut.</p>`.value,
  solution: () => codeCard(exercise.solution, exercise.lang, 'Musterlösung'),
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
      if (!editor.value.trim()) { ctx.feedback('bad', exercise.check ? 'Schreib zuerst deine Anweisungen.' : 'Schreib zuerst eine Abfrage.'); return; }
      runButton.disabled = true;
      ctx.feedback('info', 'Abfrage läuft …');
      try {
        const { actual, expected, script } = await execute(exercise, editor.value);
        if (!active) return;
        const verdict = compareSql(expected, actual, exercise.ordered);
        out.hidden = false;
        out.className = `sql-result${actual.error ? ' error' : ''}`;
        // In check mode the learner first sees what their statements did, then the check query's result.
        const statements = script?.length ? `<p class="label">Deine Anweisungen</p><div class="run-output standalone">${pgResultsMarkup(script, null)}</div>` : '';
        out.innerHTML = statements + (actual.error
          ? `<p class="label">Fehler</p><pre class="run-output standalone error">${escape(actual.error)}</pre>`
          : `<p class="label">${exercise.check ? 'Prüfabfrage' : 'Dein Ergebnis'} · ${rowCount(actual.rows.length)}${actual.truncated ? ' (gekürzt)' : ''}</p>${sqlTableMarkup(actual.columns, actual.rows, actual.cells)}`);
        if (verdict.ok) ctx.complete();
        else { fail(editor.value.trim()); ctx.feedback(actual.error ? 'bad' : 'partial', verdict.message); }
      } catch (error) {
        if (!active) return;
        out.hidden = false;
        out.className = 'sql-result error';
        out.innerHTML = `<pre class="run-output standalone error">${escape((error as Error).message)}</pre>`;
        ctx.feedback('bad', exercise.check ? 'Die Anweisungen konnten nicht ausgeführt werden.' : 'Die Abfrage konnte nicht ausgeführt werden.');
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
    const unsubscribe = exercise.engine === 'postgres'
      ? onPgState((state) => { stateLabel.innerHTML = pgNotice(state, idle(exercise.engine)); })
      : onRunnerState((state) => { stateLabel.innerHTML = runnerNotice(state, idle(exercise.engine)); });
    return () => { active = false; unsubscribe(); };
  },
});
