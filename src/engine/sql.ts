// Compares the result of the learner's SQL query with the result of the model solution.
// Both ran against identical, fresh databases (src/python/harness.py, run_sql_exercise).
import type { SqlValue } from '../content/types.ts';

export type SqlResultLike = { columns: string[]; rows: SqlValue[][]; cells: string[][]; error: string | null };
export type SqlVerdict = { ok: boolean; message: string };

/** 3 and 3.0 are equal; floating-point noise below 1e-9 does not count. Text compares exactly. */
function key(value: SqlValue): string {
  if (typeof value === 'number') return `n:${Number.isInteger(value) ? value : Math.round(value * 1e9) / 1e9}`;
  return value === null ? 'null' : `s:${value}`;
}
const rowKey = (row: SqlValue[]) => JSON.stringify(row.map(key));
const show = (row: SqlValue[], cells: string[]) => `(${cells.map((cell, i) => row[i] === null ? 'NULL' : cell).join(', ')})`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const name = (column: string) => column.trim().toLowerCase();

/** Columns whose values (as a multiset) differ: in a check query each column usually tests one rule. */
function differingColumns(expected: SqlResultLike, actual: SqlResultLike): string[] {
  const values = (result: SqlResultLike, i: number) => result.rows.map((row) => key(row[i])).sort().join('\u0000');
  return expected.columns.filter((_, i) => values(expected, i) !== values(actual, i));
}

/** `check`: the results come from a check query after the learner's statements, not from the learner's own query. */
export function compareSql(expected: SqlResultLike, actual: SqlResultLike, ordered: boolean, check = false): SqlVerdict {
  if (expected.error) return { ok: false, message: `Die Musterlösung lässt sich nicht ausführen: ${expected.error}` };
  if (actual.error) return { ok: false, message: actual.error };
  if (actual.columns.length !== expected.columns.length) {
    return { ok: false, message: `Deine Abfrage liefert ${plural(actual.columns.length, 'Spalte', 'Spalten')}, erwartet ${expected.columns.length === 1 ? 'ist' : 'sind'} ${plural(expected.columns.length, 'Spalte', 'Spalten')}: ${expected.columns.join(', ')}.` };
  }
  const renamed = expected.columns.findIndex((column, i) => name(column) !== name(actual.columns[i]));
  if (renamed >= 0) {
    return { ok: false, message: `Spalte ${renamed + 1} heißt „${actual.columns[renamed]}“, erwartet ist „${expected.columns[renamed]}“. Benenne sie mit AS ${expected.columns[renamed]} oder prüfe die Reihenfolge der Spalten.` };
  }
  if (actual.rows.length !== expected.rows.length) {
    return { ok: false, message: `Deine Abfrage liefert ${plural(actual.rows.length, 'Zeile', 'Zeilen')}, erwartet ${expected.rows.length === 1 ? 'ist' : 'sind'} ${plural(expected.rows.length, 'Zeile', 'Zeilen')}.` };
  }
  const wanted = new Map<string, number>();
  for (const row of expected.rows) wanted.set(rowKey(row), (wanted.get(rowKey(row)) ?? 0) + 1);
  const extra = actual.rows.findIndex((row) => {
    const k = rowKey(row);
    const left = wanted.get(k) ?? 0;
    if (!left) return true;
    wanted.set(k, left - 1);
    return false;
  });
  if (extra >= 0 && check) {
    const columns = differingColumns(expected, actual);
    const named = columns.length ? `in ${columns.length === 1 ? 'der Spalte' : 'den Spalten'} ${columns.map((column) => `„${column}“`).join(', ')}` : `in der Zeile ${show(actual.rows[extra], actual.cells[extra])}`;
    return { ok: false, message: `Nach deinen Anweisungen weicht die Prüfabfrage ${named} ab. Lies im Prompt nach, welche Regel ${columns.length > 1 ? 'diese Spalten prüfen' : 'das prüft'}.` };
  }
  if (extra >= 0) {
    return { ok: false, message: `Die Zeile ${show(actual.rows[extra], actual.cells[extra])} gehört so nicht ins Ergebnis (Zeile ${extra + 1} deiner Ausgabe). Prüfe Filter, Gruppierung und Berechnung.` };
  }
  if (ordered) {
    const moved = actual.rows.findIndex((row, i) => rowKey(row) !== rowKey(expected.rows[i]));
    if (moved >= 0) return { ok: false, message: `Alle Zeilen stimmen, aber nicht ihre Reihenfolge (ab Zeile ${moved + 1}). Prüfe ORDER BY.` };
  }
  return { ok: true, message: `Ergebnis stimmt: ${plural(expected.rows.length, 'Zeile', 'Zeilen')}, ${plural(expected.columns.length, 'Spalte', 'Spalten')}${ordered ? ', in der richtigen Reihenfolge' : ''}.` };
}
