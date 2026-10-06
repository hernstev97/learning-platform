## Abfragen für Listen und Detailseiten

Logische Reihenfolge: `FROM`/`JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `DISTINCT` → `ORDER BY` → `LIMIT`/`OFFSET`. Ausführlich in [SQL-Abfragen für Analysen](/data/sql-abfragen) und [Joins](/data/sql-joins). [SELECT](https://www.postgresql.org/docs/current/sql-select.html)

```postgres
-- Listenansicht: eine Zeile je Buchung, mit Raum und Mitglied
SELECT b.id, b.beginn, r.name AS raum, m.name AS mitglied
FROM buchungen b
JOIN raeume r     ON r.id = b.raum_id
JOIN mitglieder m ON m.id = b.mitglied_id
WHERE b.status = 'bestaetigt'
ORDER BY b.beginn, b.id;               -- Tiebreaker: id

-- Alle Mitglieder mit Anzahl Buchungen, auch 0
SELECT m.name,
       count(b.id) AS buchungen,                                     -- nicht count(*)
       count(*) FILTER (WHERE b.status = 'storniert') AS storniert,
       coalesce(sum(b.preis) FILTER (WHERE b.status = 'bestaetigt'), 0) AS umsatz,
       string_agg(DISTINCT r.name, ', ' ORDER BY r.name) AS raeume
FROM mitglieder m
LEFT JOIN buchungen b ON b.mitglied_id = m.id
LEFT JOIN raeume r    ON r.id = b.raum_id
GROUP BY m.id, m.name
HAVING count(b.id) < 5
ORDER BY m.name;
```

| Muster | Code |
| --- | --- |
| Letzte Buchung je Mitglied | `SELECT DISTINCT ON (mitglied_id) * FROM buchungen ORDER BY mitglied_id, beginn DESC, id DESC` |
| Top 3 je Mitglied | `FROM mitglieder m CROSS JOIN LATERAL (SELECT … WHERE b.mitglied_id = m.id ORDER BY beginn DESC LIMIT 3) b` |
| Gibt es (Semi-Join) | `WHERE EXISTS (SELECT 1 FROM buchungen b WHERE b.mitglied_id = m.id)` |
| Gibt es nicht (Anti-Join) | `WHERE NOT EXISTS (…)` – nie `NOT IN (SELECT …)` bei möglichen `NULL` |
| Liste als Parameter | `WHERE id = ANY($1)` mit einem Array statt `IN ($1, $2, …)` |
| Monat (halboffen) | `WHERE beginn >= '2026-03-01' AND beginn < '2026-04-01'` |
| Tag in Berlin | `date_trunc('day', beginn, 'Europe/Berlin')` oder `(beginn AT TIME ZONE 'Europe/Berlin')::date` |
| Nullsicherer Vergleich | `a IS DISTINCT FROM b` |
| Schätzung statt `count(*)` | `SELECT reltuples::bigint FROM pg_class WHERE oid = 'buchungen'::regclass` (`-1` = nie analysiert) |

```postgres
-- Paginierung: Keyset (Seek) statt OFFSET; braucht Index auf (beginn, id)
SELECT id, beginn, raum_id
FROM buchungen
WHERE (beginn, id) > ('2026-03-02 11:00+01', 3)    -- letzte Zeile der vorigen Seite
ORDER BY beginn, id
LIMIT 20;

-- Rekursiv: wer hat wen geworben; CYCLE bricht Zyklen ab (seit PostgreSQL 14)
WITH RECURSIVE kette AS (
  SELECT id, geworben_von, 1 AS tiefe FROM mitglieder WHERE geworben_von IS NULL
  UNION ALL
  SELECT m.id, m.geworben_von, k.tiefe + 1
  FROM mitglieder m JOIN kette k ON m.geworben_von = k.id
) CYCLE id SET zyklus USING pfad
SELECT * FROM kette;
```

| Falle | Symptom | Richtig |
| --- | --- | --- |
| `count(*)` nach `LEFT JOIN` | Mitglied ohne Buchung hat 1 | `count(b.id)` |
| Bedingung auf rechte Tabelle im `WHERE` | `LEFT JOIN` verhält sich wie `INNER JOIN` | Bedingung ins `ON` |
| `NOT IN (SELECT x …)` mit `NULL` in `x` | leeres Ergebnis | `NOT EXISTS` |
| `ORDER BY beginn` bei Gleichständen | Zeilen springen zwischen Seiten | `ORDER BY beginn, id` |
| `BETWEEN '2026-03-01' AND '2026-03-31'` auf `timestamptz` | 31. 3. nach 00:00 fehlt | `>= '2026-03-01' AND < '2026-04-01'` |
| `OFFSET 50000` | jede Seite langsamer | Keyset |
| `= NULL` | nie wahr | `IS NULL` |
| Summe über 1:n-Join | Beträge doppelt (Fan-out) | erst verdichten, dann joinen |

## Schreiben: INSERT, UPDATE, DELETE, Upsert

[INSERT](https://www.postgresql.org/docs/current/sql-insert.html) · [ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT) · [MERGE](https://www.postgresql.org/docs/current/sql-merge.html) · [RETURNING](https://www.postgresql.org/docs/current/dml-returning.html)

```postgres
INSERT INTO mitglieder (email, name) VALUES
  ('jana.richter@example.org', 'Jana Richter'),
  ('emre.yilmaz@example.org',  'Emre Yilmaz')
RETURNING id, erstellt_am;                         -- wie ein ORM nach dem flush

INSERT INTO rechnungen (mitglied_id, monat, betrag)
SELECT mitglied_id, date '2026-03-01', sum(preis)
FROM buchungen
WHERE status = 'bestaetigt' AND beginn >= '2026-03-01' AND beginn < '2026-04-01'
GROUP BY mitglied_id;

UPDATE buchungen b SET preis = r.preis_pro_stunde * extract(epoch FROM b.ende - b.beginn) / 3600
FROM raeume r
WHERE r.id = b.raum_id AND b.preis IS NULL
RETURNING b.id, old.preis, new.preis;             -- old/new seit PostgreSQL 18

DELETE FROM checkins c USING mitglieder m
WHERE m.id = c.mitglied_id AND m.email LIKE '%@test.invalid';

-- Upsert: Konfliktziel braucht passenden Unique-Index oder -Constraint
INSERT INTO rechnungen (mitglied_id, monat, betrag)
VALUES (1, '2026-03-01', 75.00)
ON CONFLICT (mitglied_id, monat)
DO UPDATE SET betrag = EXCLUDED.betrag
WHERE rechnungen.bezahlt_am IS NULL               -- bezahlte nicht überschreiben
RETURNING id, betrag;

-- Daten verschieben in einer Anweisung (datenverändernde CTE)
WITH alt AS (
  DELETE FROM checkins WHERE zeitpunkt < '2026-01-01' RETURNING *
)
INSERT INTO checkins_archiv SELECT * FROM alt;
```

| Werkzeug | Wann | Achtung |
| --- | --- | --- |
| `ON CONFLICT DO NOTHING` | Idempotentes Einfügen | `RETURNING` liefert für übersprungene Zeilen nichts |
| `ON CONFLICT … DO UPDATE` | Upsert auf einen Schlüssel | atomar auch bei gleichzeitigen Aufrufen; dieselbe Zeile zweimal in einem `INSERT` → Fehler |
| `MERGE` (seit 15) | Abgleich mit Quelle: einfügen, ändern, löschen | gleichzeitige Inserts können `23505` auslösen, für reines Upsert `ON CONFLICT`; `RETURNING merge_action()` seit 17 |
| `UPDATE … FROM` | Werte aus anderer Tabelle | mehrere Treffer je Zielzeile → beliebiger gewinnt |
| `DELETE … USING` | Löschen mit Join | erst als `SELECT` testen |
| `TRUNCATE` | Tabelle leeren | `ACCESS EXCLUSIVE`, keine `DELETE`-Trigger, `RESTART IDENTITY` optional |
| Batch | viele Zeilen | ein `INSERT … SELECT` oder `unnest($1::int[], $2::text[])` statt Schleife; `COPY` für Massenimport |

## Constraints

[Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) · [Exclusion](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION)

| Constraint | Beispiel | Merke |
| --- | --- | --- |
| `NOT NULL` | `email text NOT NULL` | Standard für Pflichtfelder |
| `CHECK` | `CHECK (ende > beginn)` | `NULL` besteht den Check |
| `UNIQUE` | `UNIQUE (standort_id, name)` | mehrere `NULL` erlaubt, außer `UNIQUE NULLS NOT DISTINCT` (seit 15) |
| Partieller Unique-Index | `CREATE UNIQUE INDEX ON mitglieder (lower(email)) WHERE geloescht_am IS NULL` | Soft Delete, Groß-/Kleinschreibung |
| `PRIMARY KEY` | `id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY` | = `UNIQUE` + `NOT NULL` |
| `REFERENCES` | `mitglied_id int NOT NULL REFERENCES mitglieder (id)` | legt **keinen** Index auf `mitglied_id` an |
| `EXCLUDE` | `EXCLUDE USING gist (raum_id WITH =, zeitraum WITH &&)` | braucht `btree_gist` für `=` auf `int` |
| `DEFERRABLE` | `… REFERENCES … DEFERRABLE INITIALLY DEFERRED` | geprüft erst bei `COMMIT` |
| Domain | `CREATE DOMAIN betrag AS numeric(10,2) CHECK (VALUE >= 0)` | Regel einmal, an vielen Spalten |

```postgres
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE buchungen
  ADD COLUMN zeitraum tstzrange GENERATED ALWAYS AS (tstzrange(beginn, ende)) STORED,
  ADD CONSTRAINT keine_doppelbuchung
    EXCLUDE USING gist (raum_id WITH =, zeitraum WITH &&) WHERE (status = 'bestaetigt');

-- PostgreSQL 18: zeitlicher Schlüssel als Kurzform
CREATE TABLE mitglied_tarife (
  mitglied_id int NOT NULL REFERENCES mitglieder (id),
  tarif       text NOT NULL CHECK (tarif IN ('flex', 'fix', 'team')),
  gueltig     daterange NOT NULL,
  PRIMARY KEY (mitglied_id, gueltig WITHOUT OVERLAPS)
);
```

| `ON DELETE` | Wirkung | Typisch für |
| --- | --- | --- |
| `NO ACTION` (Standard) / `RESTRICT` | Löschen scheitert, solange Kinder existieren | Buchungen eines Mitglieds |
| `CASCADE` | Kinder werden mitgelöscht | Positionen einer Rechnung |
| `SET NULL` / `SET DEFAULT` | Verweis wird geleert | optionaler Ansprechpartner |

## Fehlercodes für die App

[Appendix A. Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)

| SQLSTATE | Name | Reaktion der App |
| --- | --- | --- |
| `23505` | `unique_violation` | 409 Conflict („E-Mail schon vergeben“) |
| `23P01` | `exclusion_violation` | 409 („Raum in diesem Zeitraum belegt“) |
| `23503` | `foreign_key_violation` | 422 (Bezug fehlt) oder 409 (Zeile hat noch Kinder) |
| `23001` | `restrict_violation` | 409; seit PostgreSQL 18 bei `ON DELETE RESTRICT`, vorher `23503` |
| `23502` / `23514` | `not_null_violation` / `check_violation` | 422, App-Validierung hat etwas übersehen |
| `40001` | `serialization_failure` | ganze Transaktion wiederholen |
| `40P01` | `deadlock_detected` | wiederholen; Sperrreihenfolge prüfen |
| `55P03` | `lock_not_available` | `lock_timeout` oder `NOWAIT`; später erneut |
| `57014` | `query_canceled` | `statement_timeout`; Abfrage oder Index prüfen |
| `25P02` | `in_failed_sql_transaction` | vorherigen Fehler suchen, `ROLLBACK` |

## Typen

[Datentypen](https://www.postgresql.org/docs/current/datatype.html)

| Wofür | Nimm | Nicht |
| --- | --- | --- |
| Text | `text`, Länge per `CHECK (length(x) <= 200)` | `char(n)`; `varchar(n)` nur, wenn die Grenze fachlich ist |
| Ganzzahl / ID | `int`, `bigint` für wachsende Tabellen | `serial` (alt), `smallint` ohne Grund |
| Schlüssel | `GENERATED ALWAYS AS IDENTITY`; `uuid` mit `uuidv7()` (seit 18), wenn IDs außerhalb entstehen | `uuid` v4 als Primärschlüssel großer Tabellen ohne Grund |
| Geld | `numeric(10,2)` oder Cent als `bigint` | `real`, `double precision`, `money` |
| Zeitpunkt | `timestamptz` (speichert UTC, zeigt in `TimeZone`) | `timestamp` ohne Zone für Ereignisse |
| Kalendertag | `date` | `timestamptz` um Mitternacht |
| Zeitraum | `tstzrange`, `daterange` (Standard `[)`) | zwei Spalten ohne `CHECK` |
| Ja/Nein | `boolean NOT NULL DEFAULT false` | `'J'`/`'N'` |
| Strukturierte Zusatzdaten | `jsonb` | `json` (Text, kein Index), JSON für Spalten, nach denen gefiltert und gejoint wird |
| Feste Auswahl | `CHECK (x IN (…))`, Lookup-Tabelle oder `ENUM` | freier Text |

## PostgreSQL-Features

[JSON-Funktionen](https://www.postgresql.org/docs/current/functions-json.html) · [Ranges](https://www.postgresql.org/docs/current/rangetypes.html) · [Arrays](https://www.postgresql.org/docs/current/functions-array.html) · [Generierte Spalten](https://www.postgresql.org/docs/current/ddl-generated-columns.html) · [Volltext](https://www.postgresql.org/docs/current/textsearch-controls.html)

| Ausdruck | Ergebnis |
| --- | --- |
| `einstellungen -> 'mail'` | `jsonb` |
| `einstellungen ->> 'sprache'` | `text` |
| `einstellungen #>> '{mail,newsletter}'` | `text` aus Pfad |
| `einstellungen @> '{"sprache": "de"}'` | enthält (GIN-fähig) |
| `einstellungen ? 'mail'` | Schlüssel vorhanden |
| `jsonb_set(einstellungen, '{mail,newsletter}', 'false')` | geänderte Kopie |
| `einstellungen \|\| '{"theme": "dunkel"}'` / `einstellungen - 'theme'` | zusammenführen / Schlüssel entfernen |
| `einstellungen @? '$.geraete[*] ? (@ == "laptop")'` | jsonpath-Treffer |
| `'beamer' = ANY(ausstattung)`, `ausstattung @> ARRAY['beamer']` | Array enthält |
| `unnest(ausstattung)`, `array_agg(x ORDER BY x)`, `cardinality(a)` | Array ↔ Zeilen, Länge |
| `zeitraum && tstzrange($1, $2)` | überlappt |
| `zeitraum @> timestamptz '2026-03-02 10:00+01'` | enthält Zeitpunkt |
| `lower(zeitraum)`, `upper(zeitraum)`, `a -\|- b`, `a * b` | Grenzen, grenzt an, Schnitt |

```postgres
-- Generiert: PostgreSQL 18 legt standardmäßig VIRTUAL an (berechnet beim Lesen);
-- für Indexe STORED
ALTER TABLE raeume ADD COLUMN preis_brutto numeric(8,2)
  GENERATED ALWAYS AS (round(preis_pro_stunde * 1.19, 2)) STORED;

-- Volltext
SELECT name FROM raeume
WHERE to_tsvector('german', name) @@ websearch_to_tsquery('german', 'atelier -loft');

-- Materialisierte Sicht: CONCURRENTLY braucht einen Unique-Index
CREATE MATERIALIZED VIEW auslastung AS
  SELECT raum_id, date_trunc('month', beginn, 'Europe/Berlin') AS monat, count(*) AS buchungen
  FROM buchungen WHERE status = 'bestaetigt' GROUP BY 1, 2;
CREATE UNIQUE INDEX ON auslastung (raum_id, monat);
REFRESH MATERIALIZED VIEW CONCURRENTLY auslastung;

SELECT pg_notify('buchung_neu', '42');   -- Zustellung erst beim COMMIT
```

## Transaktionen und Isolation

[Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) · [SAVEPOINT](https://www.postgresql.org/docs/current/sql-savepoint.html)

```postgres
BEGIN;
INSERT INTO buchungen (raum_id, mitglied_id, beginn, ende) VALUES (1, 1, '2026-03-03 09:00+01', '2026-03-03 10:00+01');
SAVEPOINT vor_rechnung;
INSERT INTO rechnungen (mitglied_id, monat, betrag) VALUES (1, '2026-03-01', 25.00);
ROLLBACK TO SAVEPOINT vor_rechnung;   -- nur der Teil nach dem Savepoint
COMMIT;

BEGIN ISOLATION LEVEL SERIALIZABLE;    -- oder SET TRANSACTION … als erste Anweisung
SHOW transaction_isolation;
COMMIT;
```

| Stufe | Schnappschuss | Non-repeatable Read | Phantom | Lost Update (read-modify-write) | Write Skew |
| --- | --- | --- | --- | --- | --- |
| Read Committed (Standard) | je Anweisung | möglich | möglich | möglich | möglich |
| Repeatable Read | je Transaktion | nein | nein (in PostgreSQL) | Fehler `40001` | möglich |
| Serializable | je Transaktion + Abhängigkeitsprüfung | nein | nein | Fehler `40001` | Fehler `40001` |

Dirty Reads gibt es in PostgreSQL auf keiner Stufe; `READ UNCOMMITTED` verhält sich wie Read Committed.

| Problem | Lösung |
| --- | --- |
| Zähler erhöhen | `UPDATE … SET x = x + 1` statt lesen, rechnen, schreiben |
| Lesen, entscheiden, schreiben | `SELECT … FOR UPDATE` in derselben Transaktion |
| Formular lange offen | optimistisch: `UPDATE … SET …, version = version + 1 WHERE id = $1 AND version = $2` → 0 Zeilen = 409 |
| Regel über mehrere Zeilen (Doppelbuchung) | Constraint (`EXCLUDE`, `UNIQUE`); sonst Serializable + Retry |
| „Erst prüfen, dann einfügen“ | Constraint + Fehler `23505`/`23P01` abfangen |

Regeln: Transaktionen kurz halten, keine HTTP-Aufrufe darin. Autocommit: jede Anweisung ohne `BEGIN` ist eine eigene Transaktion. Nach einem Fehler gilt bis `ROLLBACK` nur noch `current transaction is aborted` (`25P02`). DDL ist transaktional. Sequenzen sind es nicht: IDs haben Lücken.

## Sperren

[Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html) · [Tabellensperren](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-TABLES) · [Zeilensperren](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS)

| Tabellensperre | Wer sie nimmt | Blockiert |
| --- | --- | --- |
| `ACCESS SHARE` | `SELECT` | nur `ACCESS EXCLUSIVE` |
| `ROW SHARE` | `SELECT … FOR UPDATE/SHARE` | `EXCLUSIVE`, `ACCESS EXCLUSIVE` |
| `ROW EXCLUSIVE` | `INSERT`, `UPDATE`, `DELETE`, `MERGE` | `SHARE` und stärker |
| `SHARE UPDATE EXCLUSIVE` | `VACUUM`, `ANALYZE`, `CREATE INDEX CONCURRENTLY`, `VALIDATE CONSTRAINT` | DDL, sich selbst |
| `SHARE` | `CREATE INDEX` | alle Schreiber |
| `SHARE ROW EXCLUSIVE` | `ADD FOREIGN KEY`, `CREATE TRIGGER` | Schreiber |
| `ACCESS EXCLUSIVE` | die meisten `ALTER TABLE`, `DROP`, `TRUNCATE`, `VACUUM FULL`, `REFRESH MATERIALIZED VIEW` | **alles**, auch `SELECT` |

| Zeilensperre | Genommen von | Merke |
| --- | --- | --- |
| `FOR UPDATE` | `SELECT … FOR UPDATE`, `DELETE`, `UPDATE` von Schlüsselspalten | stärkste |
| `FOR NO KEY UPDATE` | übrige `UPDATE` | blockiert FK-Prüfungen nicht |
| `FOR SHARE` | `SELECT … FOR SHARE` | andere dürfen auch lesen-sperren |
| `FOR KEY SHARE` | Fremdschlüsselprüfung | nur gegen Löschen/Schlüsseländerung |

```postgres
-- Job-Queue: jeder Worker holt andere Zeilen
WITH naechste AS (
  SELECT id FROM jobs
  WHERE status = 'offen'
  ORDER BY erstellt_am, id
  LIMIT 10
  FOR UPDATE SKIP LOCKED
)
UPDATE jobs j SET status = 'laeuft', worker = 'worker-2', versuche = versuche + 1
FROM naechste WHERE j.id = naechste.id
RETURNING j.id, j.art;

BEGIN;                                                         -- xact-Sperren gelten nur in einer Transaktion
SELECT pg_advisory_xact_lock(hashtext('monatsabrechnung'));   -- bis Transaktionsende
-- … geschützte Abrechnung …
COMMIT;                                                        -- gibt die Sperre frei
SELECT pg_try_advisory_lock(42);                               -- true/false, bis pg_advisory_unlock(42)

SET lock_timeout = '3s';      -- statt endlos warten: Fehler 55P03
SELECT * FROM raeume WHERE id IN (3, 1) ORDER BY id FOR UPDATE;  -- feste Reihenfolge gegen Deadlocks

-- Wer blockiert wen?
SELECT pid, pg_blocking_pids(pid) AS blockiert_von, state, wait_event_type, left(query, 60) AS abfrage
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

## Indexe

[Index-Typen](https://www.postgresql.org/docs/current/indexes-types.html) · [Mehrspaltig](https://www.postgresql.org/docs/current/indexes-multicolumn.html) · [Index-Only Scans](https://www.postgresql.org/docs/current/indexes-index-only-scans.html) · [CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)

| Typ | Für | Beispiel |
| --- | --- | --- |
| B-Baum (Standard) | `=`, `<`, `>`, `BETWEEN`, `ORDER BY`; `LIKE 'abc%'` nur bei Sortierung `C` oder mit `text_pattern_ops` | `CREATE INDEX ON buchungen (mitglied_id, beginn)` |
| Partiell | häufiger Filter auf Teilmenge | `… (raum_id, beginn) WHERE status = 'bestaetigt'` |
| Ausdruck | Funktion in der Abfrage | `CREATE UNIQUE INDEX ON mitglieder (lower(email))` |
| Covering | Index-Only Scan | `… (mitglied_id, beginn) INCLUDE (preis)` |
| GIN | `jsonb @>`, `?`, Arrays, Volltext, `pg_trgm` | `USING gin (einstellungen)` (`jsonb_path_ops`: kleiner, kein `?`), `USING gin (name gin_trgm_ops)` |
| GiST | Ranges `&&`, Exclusion, Geodaten | `USING gist (raum_id, zeitraum)` mit `btree_gist` |
| BRIN | sehr große, nach Zeit geordnete Tabellen | `USING brin (zeitpunkt)` |

| Regel | Warum |
| --- | --- |
| Gleichheit vor Bereich: `(mitglied_id, beginn)` für `WHERE mitglied_id = $1 AND beginn >= $2` | Bereich auf der ersten Spalte zerstreut die Treffer |
| Index passt zu `ORDER BY … LIMIT` | kein Sort, früher Abbruch |
| Fremdschlüsselspalten indizieren | Joins und `DELETE` auf der Elterntabelle |
| `WHERE lower(email) = …` braucht Index auf `lower(email)` | Funktion auf der Spalte verhindert den normalen Index |
| `LIKE '%x'` nutzt keinen B-Baum | `pg_trgm` mit GIN |
| Seit 18: Skip Scan | `(a, b)` hilft bei `WHERE b = …`, wenn `a` wenige Werte hat |
| Jeder Index kostet | langsamere Schreibvorgänge, Speicher, weniger HOT-Updates |

```postgres
CREATE INDEX CONCURRENTLY buchungen_raum_beginn_idx
  ON buchungen (raum_id, beginn) WHERE status = 'bestaetigt';   -- nicht in einer Transaktion

-- Unbenutzte Indexe (Statistik seit letztem Reset; Unique-Indexe nicht löschen)
SELECT relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS groesse
FROM pg_stat_user_indexes WHERE idx_scan = 0 ORDER BY pg_relation_size(indexrelid) DESC;

-- Ungültige Indexe nach abgebrochenem CONCURRENTLY
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
```

## EXPLAIN lesen

[Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) · [EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)

| Befehl | Wirkung |
| --- | --- |
| `EXPLAIN …` | geschätzter Plan, führt nicht aus |
| `EXPLAIN (ANALYZE) …` | führt aus, echte Zeilen und Zeiten; seit 18 mit Buffers |
| `BEGIN; EXPLAIN (ANALYZE) UPDATE …; ROLLBACK;` | DML messen, ohne zu ändern |
| `EXPLAIN (ANALYZE, BUFFERS, SETTINGS) …` | plus gelesene Seiten und geänderte Einstellungen |
| `EXPLAIN (COSTS OFF) …` | Plan ohne Zahlen (Tests, Doku) |

```text
Limit (actual rows=5.00 loops=1)
  ->  Sort (actual rows=5.00 loops=1)
        Sort Key: beginn DESC
        Sort Method: quicksort  Memory: 17kB
        ->  Seq Scan on buchungen (actual rows=10.00 loops=1)
              Filter: (mitglied_id = 42)
              Rows Removed by Filter: 19990
```

Von innen nach außen lesen. Nach `CREATE INDEX ON buchungen (mitglied_id, beginn)`:

```text
Limit (actual rows=5.00 loops=1)
  ->  Index Scan Backward using buchungen_mitglied_beginn_idx on buchungen (actual rows=5.00 loops=1)
        Index Cond: (mitglied_id = 42)
        Index Searches: 1
```

| Knoten | Bedeutet |
| --- | --- |
| `Seq Scan` | ganze Tabelle; richtig bei kleinen Tabellen und vielen Treffern |
| `Index Scan` | Index, dann Heap je Treffer |
| `Index Only Scan` | nur Index; `Heap Fetches` hoch → `VACUUM` fehlt |
| `Bitmap Index Scan` + `Bitmap Heap Scan` | viele Treffer, Seiten sortiert lesen; `Recheck Cond` |
| `Nested Loop` | wenige äußere Zeilen, Index innen |
| `Hash Join` | große ungeordnete Mengen, Gleichheit |
| `Merge Join` | beide Seiten sortiert |
| `Sort Method: external merge  Disk: …` | `work_mem` zu klein oder Index für `ORDER BY` fehlt |
| `HashAggregate` / `GroupAggregate` | Gruppieren per Hash / sortiert |

| Warnsignal | Ursache |
| --- | --- |
| `rows=` geschätzt vs. `actual rows` um Faktor 10+ | Statistik veraltet (`ANALYZE`), korrelierte Spalten (`CREATE STATISTICS`) |
| `Rows Removed by Filter` groß | Index fehlt oder passt nicht |
| hohes `loops=` innen im `Nested Loop` | Schätzung zu klein, N+1 im Plan |
| `Filter: (lower(email) = …)` oder `(id)::text = …` | Funktion oder Cast auf der Spalte |

## Performance-Checkliste

1. **Messen:** `pg_stat_statements` nach `total_exec_time` sortieren; `log_min_duration_statement = '250ms'`.
2. **Eine Abfrage:** `EXPLAIN (ANALYZE, BUFFERS)` mit echten Parametern, Schätzung gegen Realität.
3. **Zählen, was die App schickt:** SQL-Log des ORM; 1 + N gleiche Abfragen = N+1 → `selectinload` / `include`.
4. **Index** passend zu `WHERE`, `JOIN`, `ORDER BY … LIMIT`; danach erneut messen.
5. **Paginierung** per Keyset; kein `count(*)` über alles bei jeder Seite.
6. **Batches:** ein `INSERT … SELECT`/`unnest`/`COPY` statt 10 000 Einzel-`INSERT`; Massen-`UPDATE` in SQL statt Objekt für Objekt.
7. **Timeouts:** `statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout` je Rolle setzen.
8. **Verbindungen:** Pool in der App, PgBouncer im Transaction Mode bei vielen Prozessen.
9. **Wartung:** `pg_stat_user_tables` (`n_dead_tup`, `last_autovacuum`) prüfen; Bloat → autovacuum enger einstellen.
10. **Erst danach** Hardware, `work_mem`, Partitionierung, Caching.

```postgres
-- als Text: braucht die Erweiterung pg_stat_statements
SELECT calls, round(total_exec_time::numeric) AS gesamt_ms, round(mean_exec_time::numeric, 1) AS mittel_ms,
       rows, left(query, 80)
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;
```

## Sichere Migrationen

[ALTER TABLE · Hinweise](https://www.postgresql.org/docs/current/sql-altertable.html) · [CREATE INDEX CONCURRENTLY](https://www.postgresql.org/docs/current/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY)

Jede Migration: `SET lock_timeout = '3s';` und bei Fehler wiederholen. Eine wartende `ACCESS EXCLUSIVE`-Sperre blockiert alle Abfragen, die nach ihr kommen.

| Vorhaben | Riskant | Sicher |
| --- | --- | --- |
| Spalte hinzufügen | volatiler Default (`clock_timestamp()`, `gen_random_uuid()`) → Rewrite | `ADD COLUMN … DEFAULT 'flex'` (seit 11 ohne Rewrite) oder ohne Default |
| `NOT NULL` nachrüsten | `SET NOT NULL` scannt unter `ACCESS EXCLUSIVE` | `ADD CONSTRAINT … NOT NULL spalte NOT VALID` → `VALIDATE CONSTRAINT` (18); vorher `CHECK (spalte IS NOT NULL) NOT VALID` → `VALIDATE` → `SET NOT NULL` |
| Fremdschlüssel | `ADD FOREIGN KEY` prüft alle Zeilen | `… NOT VALID`, dann `VALIDATE CONSTRAINT` |
| Index | `CREATE INDEX` blockiert Schreiber | `CREATE INDEX CONCURRENTLY`; danach `indisvalid` prüfen |
| Unique-Constraint | `ADD UNIQUE` baut Index unter Sperre | `CREATE UNIQUE INDEX CONCURRENTLY` → `ADD CONSTRAINT … UNIQUE USING INDEX` |
| Typ ändern | `ALTER COLUMN TYPE` schreibt meist neu | Expand and Contract (neue Spalte) |
| Umbenennen | alte App-Version findet die Spalte nicht mehr | Expand and Contract |
| Spalte löschen | alte App-Version liest sie noch | erst aus Code und ORM-Modell entfernen, deployen, dann `DROP COLUMN` |
| Backfill | ein `UPDATE` über Millionen Zeilen | Batches mit `COMMIT` dazwischen |

```postgres
-- Backfill in Batches; wiederholen, bis 0 Zeilen
UPDATE buchungen SET preis = 0
WHERE id IN (SELECT id FROM buchungen WHERE preis IS NULL ORDER BY id LIMIT 5000);

-- NOT NULL nachrüsten, PostgreSQL 18 (erst nach dem Backfill)
ALTER TABLE buchungen ADD CONSTRAINT buchungen_preis_nn NOT NULL preis NOT VALID;
ALTER TABLE buchungen VALIDATE CONSTRAINT buchungen_preis_nn;  -- SHARE UPDATE EXCLUSIVE

-- Fremdschlüssel ohne langen Scan unter Sperre
ALTER TABLE checkins ADD CONSTRAINT checkins_standort_fk
  FOREIGN KEY (standort_id) REFERENCES standorte (id) NOT VALID;
ALTER TABLE checkins VALIDATE CONSTRAINT checkins_standort_fk;
```

| Expand and Contract | App-Version |
| --- | --- |
| 1. neue Spalte anlegen (nullable) | alt |
| 2. App schreibt alt **und** neu | neu A |
| 3. Backfill in Batches | neu A |
| 4. App liest neu, Constraint nachrüsten | neu B |
| 5. alte Spalte nicht mehr schreiben | neu C |
| 6. alte Spalte löschen | neu C |

Werkzeuge: Alembic (`alembic revision --autogenerate`, `alembic upgrade head`), Prisma Migrate (`prisma migrate dev`, `prisma migrate deploy`), Flyway (`V3__exclusion_constraint.sql`). Generierte Migrationen immer lesen.

## ORM und Treiber

| Thema | SQLAlchemy 2 | Prisma |
| --- | --- | --- |
| SQL sehen | `create_engine(url, echo=True)` | `new PrismaClient({ log: ['query'] })` |
| N+1 vermeiden | `select(Mitglied).options(selectinload(Mitglied.buchungen))` | `findMany({ include: { buchungen: true } })` |
| Transaktion | `with Session(engine) as s, s.begin(): …` | `prisma.$transaction(async (tx) => { … })` |
| Zeilensperre | `select(…).with_for_update(skip_locked=True)` | `$queryRaw` mit `FOR UPDATE SKIP LOCKED` |
| Upsert | `insert(…).on_conflict_do_update(…)` aus `sqlalchemy.dialects.postgresql` | `upsert({ where, create, update })` |
| Raw SQL mit Parametern | `text("… WHERE id = :id")`, `{"id": 7}` | `` $queryRaw`… WHERE id = ${id}` `` |

Nie Werte per String-Verkettung oder f-String ins SQL. Platzhalter: `$1` (Protokoll, asyncpg), `%s` (psycopg), `:name` (SQLAlchemy `text()`).

## psql-Befehle

[psql](https://www.postgresql.org/docs/current/app-psql.html)

| Befehl | Wirkung |
| --- | --- |
| `psql "postgresql://app@localhost:5432/deskwerk"` | verbinden |
| `\l` / `\c deskwerk` | Datenbanken / wechseln |
| `\dt` / `\d buchungen` / `\d+ buchungen` | Tabellen / Spalten, Indexe, Constraints / mit Größe |
| `\di` / `\dx` / `\dn` / `\du` | Indexe / Erweiterungen / Schemas / Rollen |
| `\df` / `\sf funktion` | Funktionen / Quelltext einer Funktion |
| `\x auto` | breite Zeilen untereinander |
| `\timing on` | Laufzeit je Anweisung |
| `\e` | letzte Abfrage im Editor |
| `\i migration.sql` | Datei ausführen |
| `\copy buchungen TO 'buchungen.csv' CSV HEADER` | Export über den Client |
| `\set ON_ERROR_STOP on` | Skript bricht beim ersten Fehler ab |
| `\errverbose` | letzte Fehlermeldung mit SQLSTATE und Details |
| `\watch 2` | letzte Abfrage alle 2 Sekunden |
| `\conninfo` | aktuelle Verbindung |
| `\q` | beenden |
