// PostgreSQL (PGlite) under Node for `pnpm verify` and the table previews: the same engine as in the browser.
import { createBase, PgEngine } from '../src/pg/engine.ts';

export const nodeEngine = async (): Promise<PgEngine> => new PgEngine(await createBase());
