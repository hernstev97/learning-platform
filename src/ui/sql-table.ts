// Result tables for SQL: table previews of `sql` exercises, the learner's result and runnable SQL blocks in lessons.
import type { SqlValue } from '../content/types.ts';
import { escape } from './dom.ts';

const DISPLAY_LIMIT = 50;

/** `cells` are display strings (as the sqlite3 shell prints them); `rows` decide which cells are NULL. */
export function sqlTableMarkup(columns: string[], rows: SqlValue[][], cells: string[][] = rows.map((row) => row.map((v) => v === null ? '' : String(v))), total = rows.length): string {
  const shown = rows.slice(0, DISPLAY_LIMIT);
  const head = `<tr>${columns.map((column) => `<th scope="col">${escape(column)}</th>`).join('')}</tr>`;
  const body = shown.map((row, r) => `<tr>${row.map((value, c) => value === null
    ? '<td class="sql-null">NULL</td>'
    : `<td${typeof value === 'number' ? ' class="sql-number"' : ''}>${escape(cells[r][c])}</td>`).join('')}</tr>`).join('');
  const more = total - shown.length;
  return `<div class="table-wrap sql-grid"><table><thead>${head}</thead><tbody>${body || `<tr><td colspan="${columns.length || 1}" class="sql-empty">keine Zeilen</td></tr>`}</tbody></table></div>`
    + (more > 0 ? `<p class="sql-more muted small">… und ${more} weitere Zeile${more === 1 ? '' : 'n'}</p>` : '');
}

export const rowCount = (n: number) => `${n} Zeile${n === 1 ? '' : 'n'}`;
