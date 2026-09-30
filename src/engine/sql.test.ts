import { describe, expect, it } from 'vitest';
import type { SqlValue } from '../content/types.ts';
import { compareSql, type SqlResultLike } from './sql.ts';

const result = (columns: string[], rows: SqlValue[][], error: string | null = null): SqlResultLike =>
  ({ columns, rows, cells: rows.map((row) => row.map((v) => v === null ? '' : String(v))), error });
const expected = result(['region', 'umsatz'], [['Nord', 160.5], ['Süd', 80], ['West', null]]);

describe('SQL results', () => {
  it('accepts the same rows in any order unless order is required', () => {
    const shuffled = result(['REGION', 'Umsatz'], [['Süd', 80.0], ['West', null], ['Nord', 160.5]]);
    expect(compareSql(expected, shuffled, false).ok).toBe(true);
    expect(compareSql(expected, shuffled, true)).toEqual({ ok: false, message: expect.stringContaining('Reihenfolge (ab Zeile 1)') });
    expect(compareSql(expected, expected, true).ok).toBe(true);
  });
  it('ignores floating-point noise but not real differences', () => {
    expect(compareSql(result(['x'], [[0.3]]), result(['x'], [[0.1 + 0.2]]), false).ok).toBe(true);
    expect(compareSql(result(['x'], [[3]]), result(['x'], [[3.0]]), false).ok).toBe(true);
    expect(compareSql(result(['x'], [[3]]), result(['x'], [['3']]), false).ok).toBe(false);
    expect(compareSql(result(['x'], [[0.33]]), result(['x'], [[1 / 3]]), false).ok).toBe(false);
  });
  it('explains what is wrong', () => {
    expect(compareSql(expected, result(['region'], [['Nord']]), false).message).toBe('Deine Abfrage liefert 1 Spalte, erwartet sind 2 Spalten: region, umsatz.');
    expect(compareSql(expected, result(['region', 'summe'], expected.rows), false).message).toContain('Spalte 2 heißt „summe“, erwartet ist „umsatz“');
    expect(compareSql(expected, result(['region', 'umsatz'], expected.rows.slice(0, 2)), false).message).toBe('Deine Abfrage liefert 2 Zeilen, erwartet sind 3 Zeilen.');
    expect(compareSql(expected, result(['region', 'umsatz'], [['Nord', 160.5], ['Süd', 80], ['West', 0]]), false).message).toContain('Die Zeile (West, 0) gehört so nicht ins Ergebnis (Zeile 3');
    expect(compareSql(expected, result(['region', 'umsatz'], [['Nord', 160.5], ['Süd', 80], ['Süd', 80]]), false).ok).toBe(false);
    expect(compareSql(expected, result([], [], 'OperationalError: no such column: betrag'), false)).toEqual({ ok: false, message: 'OperationalError: no such column: betrag' });
  });
});
