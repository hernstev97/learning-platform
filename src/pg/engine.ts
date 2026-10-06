// PostgreSQL in WebAssembly (PGlite): runs `postgres` lesson blocks, `sql` exercises with `lang: postgres` and
// `output` exercises in PostgreSQL. The same code runs in the browser (src/pg/worker.ts) and in Node (`pnpm verify`,
// table previews at build time), so a solution that passes `pnpm verify` behaves identically for the learner.
// PGlite finds its WebAssembly, file system bundle and extension archives relative to its own module: in Node in
// node_modules, in the browser as hashed build assets (the service worker caches them on first use).
import { PGlite, type Results } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import type { SqlValue } from '../content/types.ts';

export type PgResultSet = {
  columns: string[];
  /** Raw values for comparing: numbers for numeric types, PostgreSQL's text output for everything else. */
  rows: SqlValue[][];
  /** Values as psql prints them (`t`/`f`, `12.50`, `{"a": 1}`); NULL is empty. */
  cells: string[][];
  truncated: boolean;
};
/** One statement of a script: its rows (if it returns any), its command tag and its notices; `error` when it failed. */
export type PgStatementResult = PgResultSet & { tag: string; returnsRows: boolean; notices: string[]; error?: string };
export type PgScriptResult = { results: PgStatementResult[]; text: string; error: string | null };
export type PgQueryResult = PgResultSet & { error: string | null };
export type PgExerciseResult = { actual: PgQueryResult; expected: PgQueryResult; script: PgStatementResult[] | null };
export type PgTable = { name: string; columns: string[]; rows: SqlValue[][]; cells: string[][]; total: number };

const ROW_LIMIT = 1000;
const DML = new Set(['INSERT', 'UPDATE', 'DELETE', 'MERGE']);
/** A data-modifying CTE (`WITH x AS (UPDATE … RETURNING …) SELECT …`) changes data although its tag says SELECT. */
const changesData = (statement: string) => /\b(?:insert|update|delete|merge)\b/i.test(statement
  .replace(/--[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^']|'')*'|"(?:[^"]|"")*"/g, ' ')
  .replace(/\bfor\s+(?:no\s+key\s+)?update\b/gi, ' '));
const PREVIEW_ROWS = 12;
// int8, int2, int4, oid, float4, float8, numeric: compared as numbers, so 3, 3.0 and 3.00 are equal.
const NUMERIC_TYPES = new Set([20, 21, 23, 26, 700, 701, 1700]);

/**
 * Settings of every database: the course's time zone instead of the host's, and no parallel plans (PGlite has no
 * worker processes; Gather nodes would only add noise to EXPLAIN). Clones keep them.
 */
const CONFIG = ["timezone = 'Europe/Berlin'", 'max_parallel_workers_per_gather = 0'];
/**
 * Prepared once per runtime: `lp.versuch` runs a statement, always rolls it back and names the error it raised, if
 * any. Checks use it to show that a constraint rejects a row.
 */
const BASE_SETUP = `
CREATE SCHEMA lp;
COMMENT ON SCHEMA lp IS 'Hilfsfunktionen der Lernplattform';
CREATE FUNCTION lp.versuch(anweisung text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE anweisung;
    RAISE EXCEPTION USING ERRCODE = 'LPROK';
  EXCEPTION WHEN OTHERS THEN
    RETURN CASE SQLSTATE
      WHEN 'LPROK' THEN 'ok'
      WHEN '23001' THEN 'restrict_violation'
      WHEN '23502' THEN 'not_null_violation'
      WHEN '23503' THEN 'foreign_key_violation'
      WHEN '23505' THEN 'unique_violation'
      WHEN '23514' THEN 'check_violation'
      WHEN '23P01' THEN 'exclusion_violation'
      WHEN '22001' THEN 'string_data_right_truncation'
      WHEN '22003' THEN 'numeric_value_out_of_range'
      WHEN '22007' THEN 'invalid_datetime_format'
      WHEN '22008' THEN 'datetime_field_overflow'
      WHEN '22012' THEN 'division_by_zero'
      WHEN '22P02' THEN 'invalid_text_representation'
      WHEN '22023' THEN 'invalid_parameter_value'
      WHEN '42501' THEN 'insufficient_privilege'
      WHEN '42703' THEN 'undefined_column'
      WHEN '42P01' THEN 'undefined_table'
      WHEN '42883' THEN 'undefined_function'
      WHEN 'P0001' THEN 'raise_exception'
      ELSE SQLSTATE
    END;
  END;
END $$;
COMMENT ON FUNCTION lp.versuch(text) IS 'Führt eine Anweisung aus, rollt sie immer zurück und liefert ok oder den Namen des Fehlers';
`;

/** The database every run clones. Contrib extensions available to `CREATE EXTENSION`: btree_gist and pg_trgm. */
export async function createBase(): Promise<PGlite> {
  const base = await PGlite.create({ extensions: { btree_gist, pg_trgm }, postgresqlconf: CONFIG });
  await base.exec(BASE_SETUP);
  const types = await base.query<{ oid: number }>('SELECT oid::int AS oid FROM pg_type');
  for (const { oid } of types.rows) RAW[oid] = (value) => value;
  return base;
}

/**
 * Splits a script into statements at `;`, ignoring semicolons in strings ('…', E'…' with backslash escapes),
 * quoted identifiers, dollar-quoted bodies ($$…$$, $tag$…$tag$) and comments (-- and nested /* *\/).
 * Statements made only of comments and whitespace are dropped.
 */
export function splitStatements(script: string): string[] {
  const statements: string[] = [];
  let start = 0;
  let i = 0;
  const n = script.length;
  while (i < n) {
    const c = script[i];
    const next = script[i + 1];
    if (c === '-' && next === '-') {
      const end = script.indexOf('\n', i);
      i = end < 0 ? n : end + 1;
    } else if (c === '/' && next === '*') {
      let depth = 1;
      i += 2;
      while (i < n && depth) {
        if (script[i] === '/' && script[i + 1] === '*') { depth++; i += 2; }
        else if (script[i] === '*' && script[i + 1] === '/') { depth--; i += 2; }
        else i++;
      }
    } else if (c === "'") {
      const escapes = /[eE]/.test(script[i - 1] ?? '') && !/[\w$]/.test(script[i - 2] ?? '');
      i++;
      while (i < n) {
        if (escapes && script[i] === '\\') { i += 2; continue; }
        if (script[i] === "'") { if (script[i + 1] === "'") { i += 2; continue; } break; }
        i++;
      }
      i++;
    } else if (c === '"') {
      i++;
      while (i < n && !(script[i] === '"' && script[i + 1] !== '"')) i += script[i] === '"' ? 2 : 1;
      i++;
    } else if (c === '$' && !/[\w$]/.test(script[i - 1] ?? '')) {
      const tag = script.slice(i).match(/^\$(?:[A-Za-z_\u0080-￿][\w\u0080-￿]*)?\$/)?.[0];
      if (tag) {
        const end = script.indexOf(tag, i + tag.length);
        i = end < 0 ? n : end + tag.length;
      } else i++;
    } else if (c === ';') {
      statements.push(script.slice(start, i + 1));
      start = ++i;
    } else i++;
  }
  statements.push(script.slice(start));
  return statements.filter(hasCode).map((statement) => statement.trim());
}

/** False for text made only of whitespace, semicolons and comments. */
function hasCode(statement: string): boolean {
  return !!statement.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/;/g, '').trim();
}

type PgError = Error & { severity?: string; detail?: string; hint?: string; position?: string | number; where?: string };
/** Like psql: severity, message, the line with a caret under the position, DETAIL and HINT. */
export function formatError(error: unknown, statement: string): string {
  const e = error as PgError;
  const lines = [`${e.severity ?? 'ERROR'}:  ${e.message}`];
  const position = Number(e.position);
  if (position > 0) {
    const before = statement.slice(0, position - 1);
    const lineNo = before.split('\n').length;
    const line = statement.split('\n')[lineNo - 1];
    const prefix = `LINE ${lineNo}: `;
    const column = before.length - (before.lastIndexOf('\n') + 1);
    lines.push(prefix + line, ' '.repeat(prefix.length + column) + '^');
  }
  if (e.detail) lines.push(`DETAIL:  ${e.detail}`);
  if (e.hint) lines.push(`HINT:  ${e.hint}`);
  return lines.join('\n');
}

/** Identity parsers for every built-in type, filled by createBase. Types created later have no parser anyway. */
const RAW: Record<number, (value: string) => string> = {};
/** Every value as PostgreSQL's text output; the numeric types additionally as numbers for comparing. */
function resultSet(result: Results<unknown[]>): PgResultSet {
  const rows = result.rows.slice(0, ROW_LIMIT) as (string | null)[][];
  const types = result.fields.map((field) => field.dataTypeID);
  return {
    columns: result.fields.map((field) => field.name),
    rows: rows.map((row) => row.map((value, i) => {
      if (value === null) return null;
      if (!NUMERIC_TYPES.has(types[i])) return value;
      const number = Number(value);
      return Number.isFinite(number) ? number : value;
    })),
    cells: rows.map((row) => row.map((value) => value ?? '')),
    truncated: result.rows.length > ROW_LIMIT,
  };
}

/** The command tag as psql prints it after a statement without rows: INSERT 0 3, UPDATE 2, CREATE TABLE … */
function tag(result: Results, statement: string): string {
  const words = statement.replace(/^(?:\s|--[^\n]*\n|\/\*[\s\S]*?\*\/)+/, '').split(/\s+/).map((word) => word.toUpperCase());
  const command = (result as Results & { command?: string }).command?.toUpperCase() || words[0];
  // rowCount is PostgreSQL's count from the command tag (also for CREATE TABLE AS and materialized views).
  const count = (result as Results & { rowCount?: number }).rowCount ?? result.affectedRows ?? 0;
  if (command === 'INSERT') return `INSERT 0 ${count}`;
  if (['UPDATE', 'DELETE', 'MERGE', 'SELECT', 'COPY', 'FETCH', 'MOVE'].includes(command)) return `${command} ${count}`;
  if (['CREATE', 'DROP', 'ALTER'].includes(command)) {
    const object = words.slice(1).filter((word) => !['OR', 'REPLACE', 'UNIQUE', 'TEMP', 'TEMPORARY', 'UNLOGGED', 'MATERIALIZED', 'RECURSIVE', 'TRUSTED', 'PROCEDURAL'].includes(word));
    const kind = ['INDEX', 'TABLE', 'VIEW', 'FUNCTION', 'PROCEDURE', 'SEQUENCE', 'TYPE', 'DOMAIN', 'SCHEMA', 'EXTENSION', 'TRIGGER', 'ROLE', 'POLICY', 'STATISTICS'].includes(object[0]) ? object[0] : object[0] ?? '';
    const materialized = /\bMATERIALIZED\s+VIEW\b/i.test(statement) ? 'MATERIALIZED VIEW' : kind;
    return `${command} ${materialized}`.trim();
  }
  return command;
}

/** Runs one statement in the simple query protocol, like psql. Throws PostgreSQL's error. */
async function statementResult(db: PGlite, statement: string): Promise<PgStatementResult[]> {
  const notices: string[] = [];
  const results = await db.exec(statement, { rowMode: 'array', parsers: RAW, onNotice: (notice) => notices.push(`${notice.severity}:  ${notice.message}`) });
  return results.map((result, i) => {
    const returnsRows = result.fields.length > 0;
    return { ...resultSet(result as Results<unknown[]>), tag: tag(result, statement), returnsRows, notices: i === results.length - 1 ? notices : [] };
  });
}

/** psql -At: values separated by |, NULL empty, no header and no command tags. */
const scriptText = (results: PgStatementResult[]) => results.filter((r) => r.returnsRows).map((r) => r.cells.map((row) => `${row.join('|')}\n`).join('')).join('');

export class PgEngine {
  base: PGlite;
  private expected = new Map<string, PgQueryResult>();
  constructor(base: PGlite) { this.base = base; }

  /** A fresh clone of the base per run: nothing a learner does survives into the next run. */
  async fresh<T>(use: (db: PGlite) => Promise<T>): Promise<T> {
    const db = await this.base.clone() as PGlite;
    try { return await use(db); } finally { await db.close(); }
  }

  /**
   * Lesson blocks and `output` exercises: every statement in order, stopping at the first error. With `keepGoing`
   * (lesson blocks marked `continue`), a failed statement becomes an entry with its error and the script goes on, like
   * psql without ON_ERROR_STOP – which shows what an aborted transaction does with the statements that follow.
   */
  async script(code: string, keepGoing = false): Promise<PgScriptResult> {
    return this.fresh((db) => runScript(db, code, keepGoing));
  }

  /**
   * `sql` exercises. Without `check`, `query` is exactly one statement that returns rows. With `check`, `query` may be
   * any number of statements (DDL, DML, transactions); afterwards the check query runs and its result is compared.
   * The solution runs the same way on its own fresh database.
   */
  async exercise(schema: string, query: string, solution: string, check: string | null): Promise<PgExerciseResult> {
    const run = (code: string) => this.fresh(async (db): Promise<{ result: PgQueryResult; script: PgStatementResult[] | null }> => {
      const empty: PgQueryResult = { columns: [], rows: [], cells: [], truncated: false, error: null };
      const setup = await runScript(db, schema);
      if (setup.error) return { result: { ...empty, error: `Die Tabellen der Übung ließen sich nicht anlegen:\n${setup.error}` }, script: null };
      const statements = splitStatements(code);
      if (!statements.length) return { result: { ...empty, error: check ? 'Es gibt noch keine Anweisung.' : 'Die Abfrage ist leer.' }, script: null };
      if (check) {
        const script = await runScript(db, code);
        if (script.error) return { result: { ...empty, error: script.error }, script: script.results };
        const checked = await runScript(db, check);
        if (checked.error) return { result: { ...empty, error: `Die Prüfabfrage scheitert nach deinen Anweisungen:\n${checked.error}` }, script: script.results };
        const last = checked.results.findLast((r) => r.returnsRows);
        return { result: last ? { ...last, error: null } : { ...empty, error: 'Die Prüfabfrage liefert keine Zeilen.' }, script: script.results };
      }
      if (statements.length > 1) return { result: { ...empty, error: `Das sind ${statements.length} Anweisungen. Gesucht ist genau eine Abfrage (SELECT, gern mit WITH davor).` }, script: null };
      let results: PgStatementResult[];
      try { results = await statementResult(db, statements[0]); } catch (error) { return { result: { ...empty, error: formatError(error, statements[0]) }, script: null }; }
      const last = results.at(-1)!;
      if (!last.returnsRows) return { result: { ...empty, error: `Die Anweisung liefert keine Zeilen (${last.tag}). Gesucht ist eine Abfrage mit SELECT${/^(insert|update|delete|merge)\b/i.test(statements[0]) ? ' oder eine Änderung mit RETURNING' : ''}.` }, script: null };
      return { result: { ...last, error: null }, script: null };
    });
    const actual = await run(query);
    // The solution's result never changes; a second attempt at the same exercise only runs the learner's statements.
    const key = JSON.stringify([schema, solution, check]);
    let expected = this.expected.get(key);
    if (!expected) { expected = (await run(solution)).result; this.expected.set(key, expected); }
    // A change with RETURNING is only solved by a change: a SELECT computing the same rows does not count.
    const command = (result: PgQueryResult) => (result as PgQueryResult & { tag?: string }).tag?.split(' ')[0] ?? '';
    if (!check && !actual.result.error && DML.has(command(expected)) && !DML.has(command(actual.result)) && !changesData(query)) {
      return { actual: { ...actual.result, error: `Gesucht ist eine Änderung der Daten (${command(expected)} … RETURNING), keine reine Abfrage.` }, expected, script: actual.script };
    }
    return { actual: actual.result, expected, script: actual.script };
  }

  /**
   * Build-time preview of every table `schema` creates (the first rows, as psql prints them, and the row count).
   * Tables are listed in the order they were created; schemas other than the platform's own count, too.
   */
  async tables(schema: string): Promise<{ tables: PgTable[]; error: string | null }> {
    return this.fresh(async (db) => {
      const setup = await runScript(db, schema);
      if (setup.error) return { tables: [], error: setup.error };
      const list = await db.query<{ name: string; oid: number }>(`
        SELECT CASE WHEN n.nspname = 'public' THEN quote_ident(c.relname) ELSE quote_ident(n.nspname) || '.' || quote_ident(c.relname) END AS name, c.oid
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r', 'p') AND NOT c.relispartition AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'lp') AND n.nspname NOT LIKE 'pg_toast%'
        ORDER BY c.oid`);
      const tables: PgTable[] = [];
      for (const { name } of list.rows) {
        const [preview] = await statementResult(db, `SELECT * FROM ${name} LIMIT ${PREVIEW_ROWS}`);
        const count = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${name}`);
        tables.push({ name: name.replace(/"/g, ''), columns: preview.columns, rows: preview.rows, cells: preview.cells, total: count.rows[0].n });
      }
      return { tables, error: null };
    });
  }
}

async function runScript(db: PGlite, code: string, keepGoing = false): Promise<PgScriptResult> {
  const results: PgStatementResult[] = [];
  let error: string | null = null;
  for (const statement of splitStatements(code)) {
    try { results.push(...await statementResult(db, statement)); } catch (e) {
      if (!keepGoing) { error = formatError(e, statement); break; }
      results.push({ columns: [], rows: [], cells: [], truncated: false, tag: '', returnsRows: false, notices: [], error: formatError(e, statement) });
    }
  }
  return { results, text: scriptText(results), error };
}
