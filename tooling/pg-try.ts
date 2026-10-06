// pnpm pg:try bereich/modul/übung datei.sql | pnpm pg:try bereich/modul/übung -e 'SELECT …'
// Runs a candidate answer against a PostgreSQL `sql` exercise exactly as the browser does and prints the verdict the
// learner would see. For authors: does a different correct solution count, does a typical wrong one fail?
import { readFileSync } from 'node:fs';
import { loadContent } from './content.ts';
import { nodeEngine } from './pg-node.ts';
import { compareSql } from '../src/engine/sql.ts';
import type { SqlExercise } from '../src/content/types.ts';

const [target, ...rest] = process.argv.slice(2);
const [area, module, id] = (target ?? '').split('/');
const query = rest[0] === '-e' ? rest[1] ?? '' : rest[0] ? readFileSync(rest[0], 'utf8') : '';
if (!area || !module || !id || !query) { console.error("Aufruf: pnpm pg:try bereich/modul/übung datei.sql oder -e 'SELECT …'"); process.exit(2); }
const exercise = loadContent([area], undefined, { allowMissing: true }).areas[area]?.modules[module]?.exercises.find((e) => e.id === `${module}/${id}`);
if (!exercise || exercise.type !== 'sql' || exercise.engine !== 'postgres') { console.error(`${target}: keine sql-Übung mit lang: postgres`); process.exit(2); }
const ex = exercise as SqlExercise;
const engine = await nodeEngine();
const { actual, expected, script } = await engine.exercise(ex.schema, query, ex.solution, ex.check);
for (const statement of script ?? []) console.log(statement.error ?? statement.tag);
if (!actual.error) {
  console.log(actual.columns.join('|'));
  for (const row of actual.cells) console.log(row.join('|'));
}
const verdict = compareSql(expected, actual, ex.ordered);
console.log(`\n${verdict.ok ? '✓' : '✗'} ${verdict.message}`);
await engine.base.close();
process.exit(verdict.ok ? 0 : 1);
