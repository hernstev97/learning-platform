import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { compareSql } from '../engine/sql.ts';
import { createBase, formatError, PgEngine, splitStatements } from './engine.ts';

describe('splitStatements', () => {
  it('splits at semicolons outside strings, identifiers, dollar quotes and comments', () => {
    expect(splitStatements(`SELECT 'a;b'; SELECT $$x;y$$; -- c;
SELECT E'it\\'s;'; /* a /* ; */ ; */ SELECT "a;b" FROM t; DO $f$ BEGIN PERFORM 1; END $f$`)).toEqual([
      "SELECT 'a;b';",
      'SELECT $$x;y$$;',
      "-- c;\nSELECT E'it\\'s;';",
      '/* a /* ; */ ; */ SELECT "a;b" FROM t;',
      'DO $f$ BEGIN PERFORM 1; END $f$',
    ]);
  });

  it('drops statements made only of comments and semicolons', () => {
    expect(splitStatements('-- nur ein Kommentar\n;;\n/* noch einer */')).toEqual([]);
    expect(splitStatements("SELECT 'it''s'")).toEqual(["SELECT 'it''s'"]);
  });

  it('does not mistake $1 parameters or identifiers with $ for dollar quotes', () => {
    expect(splitStatements('SELECT a$b FROM t; SELECT $1;')).toEqual(['SELECT a$b FROM t;', 'SELECT $1;']);
  });
});

describe('formatError', () => {
  it('points at the position like psql', () => {
    const error = Object.assign(new Error('column "nope" does not exist'), { severity: 'ERROR', position: '14', hint: 'Perhaps you meant "name".' });
    expect(formatError(error, 'SELECT id,\n  nope FROM t')).toBe([
      'ERROR:  column "nope" does not exist',
      'LINE 2:   nope FROM t',
      '          ^',
      'HINT:  Perhaps you meant "name".',
    ].join('\n'));
  });
});

describe('PgEngine (PostgreSQL in PGlite)', () => {
  let engine: PgEngine;
  beforeAll(async () => { engine = new PgEngine(await createBase()); }, 60_000);
  afterAll(async () => { await engine.base.close(); });

  it('prints values like psql -At and keeps numbers comparable', async () => {
    const result = await engine.script(`
      CREATE TABLE t (n numeric(6,2), b boolean, j jsonb, a text[], ts timestamptz);
      INSERT INTO t VALUES (12.5, true, '{"x": 1}', '{a,b}', '2026-07-01 10:00+00'), (NULL, NULL, NULL, NULL, NULL);
      SELECT * FROM t;`);
    expect(result.error).toBeNull();
    expect(result.results.map((r) => r.tag)).toEqual(['CREATE TABLE', 'INSERT 0 2', 'SELECT 2']);
    const created = await engine.script('CREATE TABLE z AS SELECT generate_series(1, 3) AS n; CREATE MATERIALIZED VIEW mz AS SELECT * FROM z; UPDATE z SET n = n + 1;');
    expect(created.results.map((r) => r.tag)).toEqual(['SELECT 3', 'SELECT 3', 'UPDATE 3']);
    // The course's time zone is Europe/Berlin, summer time included.
    expect(result.text).toBe('12.50|t|{"x": 1}|{a,b}|2026-07-01 12:00:00+02\n||||\n');
    expect(result.results[2].rows[0][0]).toBe(12.5);
  });

  it('stops at the first error and keeps what ran before, notices included', async () => {
    const result = await engine.script('DROP TABLE IF EXISTS fehlt; SELECT 1 AS eins; SELECT 1/0; SELECT 2;');
    expect(result.results.map((r) => r.tag)).toEqual(['DROP TABLE', 'SELECT 1']);
    expect(result.results[0].notices).toEqual(['NOTICE:  table "fehlt" does not exist, skipping']);
    expect(result.error).toBe('ERROR:  division by zero');
  });

  it('keeps going after an error on request, so an aborted transaction can be shown', async () => {
    const result = await engine.script('BEGIN; SELECT 1/0; SELECT 1; COMMIT; SELECT 2 AS danach;', true);
    expect(result.error).toBeNull();
    expect(result.results.map((r) => r.error ?? r.tag)).toEqual([
      'BEGIN',
      'ERROR:  division by zero',
      'ERROR:  current transaction is aborted, commands ignored until end of transaction block',
      'ROLLBACK',
      'SELECT 1',
    ]);
  });

  it('starts every run on a fresh database', async () => {
    await engine.script('CREATE TABLE bleibt_nicht (id int);');
    const result = await engine.script('SELECT count(*) FROM bleibt_nicht;');
    expect(result.error).toContain('relation "bleibt_nicht" does not exist');
  });

  it('compares a query with the solution, rows returned by DML included', async () => {
    const schema = "CREATE TABLE raum (id int PRIMARY KEY, name text); INSERT INTO raum VALUES (1, 'Atelier'), (2, 'Loft');";
    const select = await engine.exercise(schema, 'SELECT name FROM raum WHERE id = 2', "SELECT 'Loft' AS name", null);
    expect(compareSql(select.expected, select.actual, false).ok).toBe(true);
    const returning = await engine.exercise(schema, "UPDATE raum SET name = 'Studio' WHERE id = 1 RETURNING id, name", "SELECT 1 AS id, 'Studio' AS name", null);
    expect(compareSql(returning.expected, returning.actual, false).ok).toBe(true);
    const selectInstead = await engine.exercise(schema, "SELECT 1 AS id, 'Studio' AS name", "UPDATE raum SET name = 'Studio' WHERE id = 1 RETURNING id, name", null);
    expect(selectInstead.actual.error).toContain('Gesucht ist eine Änderung der Daten (UPDATE … RETURNING)');
    const otherChange = await engine.exercise(schema, "INSERT INTO raum VALUES (1, 'Studio') ON CONFLICT (id) DO UPDATE SET name = excluded.name RETURNING id, name", "UPDATE raum SET name = 'Studio' WHERE id = 1 RETURNING id, name", null);
    expect(compareSql(otherChange.expected, otherChange.actual, false).ok).toBe(true);
    const tooMany = await engine.exercise(schema, 'SELECT 1; SELECT 2', 'SELECT 1', null);
    expect(tooMany.actual.error).toContain('2 Anweisungen');
    const noRows = await engine.exercise(schema, 'DELETE FROM raum', 'SELECT 1', null);
    expect(noRows.actual.error).toContain('RETURNING');
  });

  it('judges statements by a check query, with lp.versuch naming the violated constraint', async () => {
    const schema = 'CREATE TABLE buchung (id int PRIMARY KEY, preis numeric);';
    const check = "SELECT lp.versuch('INSERT INTO buchung VALUES (1, -5)') AS negativ, lp.versuch('INSERT INTO buchung VALUES (1, 5)') AS positiv, count(*) AS zeilen FROM buchung";
    const result = await engine.exercise(schema, 'ALTER TABLE buchung ADD CHECK (preis >= 0);', 'ALTER TABLE buchung ADD CONSTRAINT p CHECK (preis >= 0);', check);
    expect(result.script?.map((r) => r.tag)).toEqual(['ALTER TABLE']);
    expect(result.actual.cells).toEqual([['check_violation', 'ok', '0']]);
    expect(compareSql(result.expected, result.actual, false).ok).toBe(true);
    const broken = await engine.exercise(schema, 'ALTER TABLE buchung ADD CHECK (preis > 100);', 'ALTER TABLE buchung ADD CHECK (preis >= 0);', check);
    expect(compareSql(broken.expected, broken.actual, false).ok).toBe(false);
  });

  it('previews the tables a schema creates', async () => {
    const { tables, error } = await engine.tables(`CREATE TABLE raum (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text, preis numeric(6,2));
      INSERT INTO raum (name, preis) SELECT 'Raum ' || i, i * 10 FROM generate_series(1, 20) AS i;
      CREATE SCHEMA archiv; CREATE TABLE archiv.raum (id int);`);
    expect(error).toBeNull();
    expect(tables.map((t) => [t.name, t.total, t.rows.length])).toEqual([['raum', 20, 12], ['archiv.raum', 0, 0]]);
    expect(tables[0].cells[0]).toEqual(['1', 'Raum 1', '10.00']);
  });
});
