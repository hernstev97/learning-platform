// pnpm pg:run datei.sql … | pnpm pg:run -e 'SELECT …'
// Runs SQL in the PostgreSQL of the browser (PGlite) on a fresh database and prints every statement's result as psql
// does with --no-align: header, rows separated by |, row count, command tags, notices and errors. For writing lessons
// and exercises: the expected output of an `output` exercise is the rows without header (`--tuples`, like psql -At).
import { readFileSync } from 'node:fs';
import { nodeEngine } from './pg-node.ts';

const args = process.argv.slice(2);
const tuples = args.includes('--tuples');
const sources: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-e') sources.push(args[++i] ?? '');
  else if (!args[i].startsWith('--')) sources.push(readFileSync(args[i], 'utf8'));
}
if (!sources.length) { console.error("Aufruf: pnpm pg:run datei.sql … oder pnpm pg:run -e 'SELECT 1' [--tuples]"); process.exit(2); }

const engine = await nodeEngine();
const result = await engine.script(sources.join('\n'));
if (tuples) process.stdout.write(result.text);
else {
  for (const statement of result.results) {
    for (const notice of statement.notices) console.log(notice);
    if (!statement.returnsRows) { console.log(statement.tag); continue; }
    console.log(statement.columns.join('|'));
    for (const row of statement.cells) console.log(row.join('|'));
    console.log(`(${statement.rows.length} ${statement.rows.length === 1 ? 'row' : 'rows'})\n`);
  }
}
if (result.error) console.error(result.error);
await engine.base.close();
process.exit(result.error ? 1 : 0);
