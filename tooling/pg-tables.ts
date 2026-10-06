// Table previews for `sql` exercises in PostgreSQL. tooling/content.ts loads content synchronously, PGlite is async:
// content.ts runs this script as a child process with the schemas as JSON on stdin and reads the previews from stdout.
// Results are cached per schema (pgTables in content.ts), so only new or changed schemas start PostgreSQL.
import { readFileSync } from 'node:fs';
import { nodeEngine } from './pg-node.ts';

const schemas: string[] = JSON.parse(readFileSync(0, 'utf8'));
const engine = await nodeEngine();
const results = [];
for (const schema of schemas) results.push(await engine.tables(schema));
await engine.base.close();
process.stdout.write(JSON.stringify(results));
