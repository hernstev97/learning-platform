## Datenbanken im Berufsalltag von Anwendungsentwicklern

Fast jede Backend-Stelle ist auch eine Datenbankstelle, auch wenn das in der Anzeige nur als „SQL-Kenntnisse“ oder „Erfahrung mit relationalen Datenbanken“ auftaucht. Im Alltag heißt das: Datenmodelle für neue Features entwerfen, Migrationen schreiben, die im laufenden Betrieb durchgehen, Abfragen hinter dem ORM verstehen und reparieren, wenn eine Seite langsam wird, und Fehler finden, die nur bei gleichzeitigen Zugriffen auftreten. Ein eigenes DBA-Team gibt es in vielen Firmen nicht mehr, oder es kümmert sich um Betrieb und Backups, nicht um dein Schema.

Was Teams suchen, ist deshalb selten „jemand, der PostgreSQL administriert“, sondern jemand, der weiß, was unter dem ORM passiert. Diese Seite beschreibt Rollen, Erwartungen und Gesprächsformate aus dieser Sicht. Stellenanforderungen ändern sich; nimm die Punkte als Kompetenzziele und gleiche sie mit Anzeigen deiner Zielrolle ab. Diese Seite ist keine Arbeitsmarktstudie.

## Rollen und Jobtitel

Titel bedeuten in jedem Unternehmen etwas anderes. Lies die Aufgaben, nicht nur die Überschrift.

| Rolle | Typische Titel | Alltag mit der Datenbank | Was oft verlangt wird |
| --- | --- | --- | --- |
| Backend-Entwicklung | Backend Developer, Softwareentwickler (m/w/d) Python, Java, Kotlin oder Node.js | Datenmodell und Migrationen für Features, Abfragen über ein ORM und in SQL, Fehler unter Last | SQL, ein ORM (Hibernate/JPA, SQLAlchemy, Prisma, Django ORM), PostgreSQL oder MySQL, Docker, Tests gegen echte Datenbanken |
| Full-Stack-Entwicklung | Full-Stack Developer, Webentwickler | wie Backend, dazu die Oberfläche; Paginierung, Suche und Filter enden in SQL | TypeScript, ein Web-Framework, ein ORM, Grundlagen von Indexen |
| Datenbankentwicklung | Datenbankentwickler, SQL-Entwickler, PL/SQL-Entwickler | Logik in Prozeduren, Schnittstellen und Batch-Läufe, oft in Banken, Versicherungen, Handel und Verwaltung | Oracle PL/SQL oder Microsoft T-SQL, Performance, ETL, Fachwissen der Branche |
| Datenbankbetrieb | Datenbankadministrator (DBA), PostgreSQL DBA, Database Reliability Engineer | Installation, Backups und Wiederherstellung, Replikation, Upgrades, Monitoring, Tuning | Linux, Backup-Werkzeuge wie pgBackRest, Hochverfügbarkeit (Patroni), Cloud-Datenbanken, Automatisierung |
| Plattform und Betrieb | Platform Engineer, Site Reliability Engineer | Datenbanken als Dienst für viele Teams, Pooler, Migrationspipelines, Alarme | Kubernetes (etwa CloudNativePG), Terraform, Observability |
| Nachbarrolle Daten | Data Engineer, Analytics Engineer | Daten aus den Anwendungsdatenbanken in ein Warehouse bringen und modellieren | SQL auf hohem Niveau, Python, dbt, Orchestrierung; siehe [Data Analysis](/data/beruf) |

Für dich als Anwendungsentwickler mit Python, TypeScript und Kotlin sind die ersten beiden Zeilen der Kern. Wer dort Schema, Transaktionen und Query-Pläne sicher beherrscht, ist oft die Person, die das Team bei Datenbankfragen anspricht, auch ohne eigenen Titel. Datenbankbetrieb ist ein eigener Beruf mit viel Linux und Betrieb; die Module zu Sperren, Migrationen und Performance sind dafür ein guter Einstieg, ersetzen ihn aber nicht.

## Was Arbeitgeber im deutschsprachigen Raum erwarten

**Die Datenbanken:** PostgreSQL ist bei Produktfirmen, Start-ups und Agenturen verbreitet, oft als verwalteter Dienst in einer Cloud. In Konzernen, Banken, Versicherungen und Behörden laufen daneben häufig Oracle und Microsoft SQL Server, im Webumfeld MySQL und MariaDB. Das Wissen aus diesem Bereich überträgt sich: Constraints, Transaktionen, Isolationsstufen, B-Baum-Indexe und Query-Pläne gibt es überall, nur Syntax und Werkzeuge unterscheiden sich.

**Die ORMs:** In vielen Backend-Anzeigen im deutschsprachigen Raum steht Java oder Kotlin mit Spring Boot und Hibernate/JPA. Dort heißen die Probleme gleich wie hier – N+1 durch Lazy Loading, Transaktionsgrenzen, optimistisches Locking mit `@Version` –, und Migrationen laufen meist mit Flyway oder Liquibase. Im Python-Umfeld sind es SQLAlchemy mit Alembic oder das Django ORM, im TypeScript-Umfeld Prisma, Drizzle oder TypeORM.

Zwischen den Zeilen erwarten die meisten Teams, dass du

- ein Datenmodell entwirfst, das fachliche Regeln mit Constraints absichert, und deine Entscheidungen begründest,
- SQL ohne ORM lesen und schreiben kannst, auch Joins mit Aggregation, Unterabfragen und Upserts,
- weißt, was dein ORM an SQL erzeugt, und N+1 im Log erkennst,
- Transaktionen bewusst setzt und Race Conditions wie Lost Update und Doppelbuchung erklärst und verhinderst,
- einen Query-Plan liest und einen Index begründet, statt ihn zu raten,
- Migrationen schreibst, die im laufenden Betrieb mit mehreren App-Instanzen funktionieren,
- gegen eine echte Datenbank testest, etwa mit Testcontainers oder einem Service-Container in der CI, statt sie wegzumocken.

**Datenschutz:** Mitgliederdaten sind personenbezogen. Arbeitgeber achten darauf, dass du die DSGVO mitdenkst: Löschung oder Anonymisierung statt Soft Delete für immer, keine Produktionsdaten in Test- und Entwicklungsumgebungen, Zugriffsrechte nach dem Minimalprinzip. Für Rechnungen und Buchungsbelege gelten zugleich gesetzliche Aufbewahrungspflichten; wie lange und in welcher Form, klärt das Team mit Buchhaltung oder Datenschutzbeauftragten. Für dein Schema heißt das oft: Personendaten von Abrechnungsdaten trennen, damit sich das eine löschen lässt, ohne das andere zu verlieren.

**Zertifikate** spielen für Entwicklerstellen kaum eine Rolle. Hersteller wie Oracle und Microsoft bieten Prüfungen an, die bei Arbeitgebern mit deren Produkten gelegentlich in Anzeigen auftauchen. Ein Repository mit einem durchdachten Schema, Migrationen, Plänen und Nebenläufigkeitstests überzeugt im Gespräch mehr.

## Wie Vorstellungsgespräche Datenbankwissen prüfen

| Format | Ablauf | Worauf geachtet wird | Übung hier |
| --- | --- | --- | --- |
| Fachgespräch | Fragen zu Transaktionen, Indexen, ORM, deinen Projekten | Begriffe mit Beispiel erklären, Abwägungen und Grenzen nennen | [Interview-Karten](/postgres/karten) |
| SQL-Live-Coding | Zwei bis vier Aufgaben an einem vorgegebenen Schema, im Browser-Editor oder geteilten Dokument | Rückfragen, `NULL`, Joins ohne Doppelzählung, eindeutige Sortierung, Ergebnis prüfen | `sql`-Übungen in [Abfragen](/postgres/abfragen), [Unterabfragen und CTEs](/postgres/unterabfragen-ctes), [Daten ändern](/postgres/daten-aendern) |
| Schema-Design | „Entwirf das Datenmodell für ein Buchungssystem“ am Whiteboard oder im Editor | Entitäten und Kardinalitäten, Schlüssel, Constraints, Zeit und Geld, spätere Abfragen | [Datenmodellierung](/postgres/datenmodellierung), [Constraints](/postgres/constraints), Karte [Doppelbuchung](/postgres/karten#karte-doppelbuchung-gleichzeitig) |
| Code-Review | Ein Pull Request mit ORM-Code, SQL oder einer Migration | N+1, SQL-Injection, Lost Update, Transaktionsgrenzen, sperrende Migration | Karten [N+1](/postgres/karten#karte-n-plus-eins-review), [Injection](/postgres/karten#karte-injection-review), [Guthaben](/postgres/karten#karte-guthaben-lost-update), [HTTP in der Transaktion](/postgres/karten#karte-http-in-transaktion) |
| Debugging und Performance | Eine langsame Abfrage mit Plan oder eine Fehlerbeschreibung aus dem Betrieb | Methode statt Raten: messen, Plan lesen, Ursache benennen, Wirkung belegen | [Query-Pläne](/postgres/query-plaene), [Performance](/postgres/performance), Karte [Buchungsseite langsam](/postgres/karten#karte-buchungsseite-langsam) |
| System Design | „Wie baust du Buchungen für 50 Standorte?“ | Konsistenz, Transaktionen, Queues, Caching, wann eine zweite Datenbank nötig ist | Karten [Job-Queue](/postgres/karten#karte-job-queue-worker), [Write Skew](/postgres/karten#karte-write-skew-repeatable-read) |
| Take-Home | Ein kleines Backend mit Datenbank, einige Tage Zeit, danach Besprechung | Schema, Migrationen, Tests gegen echte Datenbank, README mit Entscheidungen | [Abschlussprojekt](/postgres/projekte/abschluss-buchungs-backend) |

### SQL-Live-Coding: so gehst du vor

1. **Schema lesen und nachfragen:** Was ist eine Zeile in jeder Tabelle? Zählen stornierte Buchungen? Was passiert bei Gleichstand? Welche Zeitzone gilt? Solche Rückfragen sind Teil der Bewertung.
2. **In Schritten bauen:** erst die Zeilen, die zählen, dann Joins, dann Aggregation, gern als CTEs mit sprechenden Namen. Nach jedem Join kurz die Zeilenzahl prüfen.
3. **Fallen ansprechen:** `count(*)` nach `LEFT JOIN`, `NOT IN` mit `NULL`, `BETWEEN` auf Zeitpunkten, Sortierung ohne Tiebreaker. Wer sie von sich aus nennt, zeigt Erfahrung.
4. **Laut denken und Grenzen nennen:** „Mit einem Index auf `(mitglied_id, beginn)` wäre das auch bei Millionen Zeilen schnell.“ „In Produktion würde ich hier Keyset-Paginierung nehmen.“

Typische Aufgaben: Mitglieder mit Anzahl Buchungen auch ohne Buchung, letzte Buchung je Mitglied, freie Räume in einem Zeitfenster, Umsatz je Monat, Duplikate finden und bereinigen, ein Upsert. Fensterfunktionen kommen in Backend-Gesprächen seltener vor als bei Analystenstellen, aber Top-N je Gruppe solltest du auf zwei Arten lösen können.

### Schema-Design: so gehst du vor

1. **Anforderungen sammeln:** Welche Vorgänge gibt es, welche Regeln, welche Abfragen braucht die App? Was muss nie passieren (Doppelbuchung, negative Beträge)?
2. **Entitäten und Beziehungen:** Kardinalitäten benennen, n:m-Beziehungen mit eigener Tabelle, Attribute an die Stelle, von der sie abhängen.
3. **Schlüssel und Typen:** Identity oder UUID mit Begründung, `numeric` für Geld, `timestamptz` für Zeitpunkte, Ranges für Zeiträume.
4. **Regeln als Constraints:** `NOT NULL`, `UNIQUE`, `CHECK`, Fremdschlüssel mit bewusstem `ON DELETE`, der Exclusion Constraint gegen Überschneidungen.
5. **Zugriffsmuster und Indexe:** Für die wichtigsten Abfragen den passenden Index nennen, Fremdschlüssel nicht vergessen.
6. **Wachstum und Änderungen:** Historie (Tarifwechsel), Soft Delete oder nicht, wie eine spätere Änderung ohne Ausfall migriert würde.

### Take-Home: was Prüfer lesen

Rechne damit, dass Prüfer zuerst README, Migrationen und Tests öffnen, dann den Code. Eine starke Abgabe enthält:

- einen Befehl, der Datenbank, Migrationen, Seed und Tests startet, und eine CI, die es beweist,
- Migrationen statt `create_all()`, mit lesbaren Namen und von Hand ergänzten Constraints,
- Constraints für die fachlichen Regeln, nicht nur Validierung in der App,
- Tests gegen PostgreSQL, nicht gegen SQLite oder Mocks, darunter mindestens einen Nebenläufigkeitstest,
- für wichtige Abfragen einen Plan oder eine Messung, die den Index begründet,
- einen Abschnitt „Entscheidungen und Grenzen“: was du bewusst weggelassen hast und was mit mehr Zeit käme.

Im Gespräch danach wirst du nach Entscheidungen gefragt: Warum dieser Constraint? Was passiert, wenn zwei Requests gleichzeitig kommen? Wie migrierst du die Preisspalte auf Cent? Die [Karten](/postgres/karten) dieses Bereichs trainieren genau diese Antworten.

## Portfolio: Projekte, die zählen

Zwei bis drei Projekte, in denen man die Datenbankarbeit sieht, sagen mehr als eine Liste von Technologien. Sichtbar wird sie durch Schema-Dokumentation, Migrationen, Pläne und Tests, nicht durch Screenshots der Oberfläche.

| Projekt | Was es belegt |
| --- | --- |
| [Die alte Buchungsliste normalisieren und migrieren](/postgres/projekte/legacy-normalisieren) | Du erkennst Anomalien, normalisierst begründet und migrierst Daten nachprüfbar ohne Verlust |
| [Slow-Query-Jagd auf einer Million Buchungen](/postgres/projekte/slow-query-jagd) | Du misst, liest Pläne, setzt Indexe gezielt und belegst jede Verbesserung mit Zahlen |
| [Job-Queue mit FOR UPDATE SKIP LOCKED](/postgres/projekte/job-queue) | Du beherrschst Sperren und Nebenläufigkeit und kennst die Grenzen von „genau einmal“ |
| [Abschlussprojekt: Buchungs-Backend für Deskwerk](/postgres/projekte/abschluss-buchungs-backend) | Du verantwortest das Datenbankfundament eines Backends von Schema bis Migration, mit Tests und Performance-Budget |

Praktische Hinweise:

- **README zuerst:** In zwei Minuten muss klar sein, was das Projekt tut, wie man es startet und welche Entscheidungen du getroffen hast.
- **`docs/schema.md`:** ER-Diagramm als Text und je Constraint ein Satz, welche Regel er sichert. Im Gespräch kannst du darauf zeigen.
- **Belege statt Behauptungen:** Pläne vorher und nachher als Dateien, ein Test mit zwei Verbindungen, Messwerte mit Angabe der Hardware.
- **Commit-Historie:** Migrationen in kleinen Schritten und ein Bugfix mit dem Test, der vorher rot war, zeigen deine Arbeitsweise.
- **Erfundene Daten:** Seeds mit `generate_series` oder einem Generator. Keine echten Personendaten, auch nicht „anonymisiert“ aus einem früheren Job.

## Lernplan in 15 Wochen

Der Plan geht von acht bis zehn Stunden pro Woche aus. Die Module bauen aufeinander auf, die Projekte liegen dort, wo ihr Stoff sitzt. Wiederhole jede Woche einige [Interview-Karten](/postgres/karten) und nutze [Wiederholen](/postgres/wiederholen) für Themen mit Fehlversuchen.

| Woche | Track | Module und Projekte | Sichtbares Ergebnis |
| --- | --- | --- | --- |
| 1 | Relationen und Abfragen | [Das relationale Modell](/postgres/relationales-modell), [Abfragen](/postgres/abfragen) | Deskwerk-Schema lokal in PostgreSQL, eine Listenabfrage mit Keyset-Paginierung |
| 2 | Relationen und Abfragen | [Unterabfragen und CTEs](/postgres/unterabfragen-ctes), [Daten ändern](/postgres/daten-aendern) | Top-N je Mitglied auf zwei Arten, ein idempotenter Import mit `ON CONFLICT` |
| 3 | Datenmodell und Integrität | [Constraints](/postgres/constraints), [Normalisierung](/postgres/normalisierung) | Exclusion Constraint gegen Doppelbuchung, eine zerlegte Altdatentabelle |
| 4 | Projekt | [Alte Buchungsliste normalisieren](/postgres/projekte/legacy-normalisieren) | Migrationsskript mit Abgleich |
| 5 | Datenmodell und Integrität | [Datenmodellierung](/postgres/datenmodellierung), [PostgreSQL-Features](/postgres/postgres-features) | Tarifhistorie mit Ranges, JSONB-Einstellungen mit GIN-Index |
| 6 | Transaktionen und Anwendung | [Transaktionen](/postgres/transaktionen), [Isolation und Sperren](/postgres/isolation-sperren) | Lost Update und Write Skew als Zeitleiste erklärt und verhindert |
| 7 | Transaktionen und Anwendung | [SQL hinter dem ORM](/postgres/orm-und-sql) | Ein N+1 im eigenen Code gefunden und mit Test abgesichert |
| 8 | Projekt | [Job-Queue](/postgres/projekte/job-queue) | Lasttest mit vier Workern ohne doppelte Verarbeitung |
| 9 | Performance und Betrieb | [Indexe](/postgres/indexe), [Query-Pläne lesen](/postgres/query-plaene) | Fünf Pläne gelesen und mit passendem Index verbessert |
| 10 | Performance und Betrieb | [Performance](/postgres/performance), [Migrationen](/postgres/migrationen) | Eine Spalte per Expand and Contract umgebaut |
| 11 | Projekt | [Slow-Query-Jagd](/postgres/projekte/slow-query-jagd) | Vorher-nachher-Tabelle für sieben Abfragen |
| 12–15 | Abschluss | [Abschlussprojekt](/postgres/projekte/abschluss-buchungs-backend), alle Karten | Buchungs-Backend mit CI, Performance-Budget und README; zehn Minuten Präsentation |

Wer SQL aus dem Data-Bereich schon sicher beherrscht, kann Woche 1 und 2 verdichten und die Zeit in Isolation, Sperren und Migrationen stecken. Diese Themen unterscheiden im Gespräch Anwendungsentwickler, die eine Datenbank benutzen, von denen, die sie verstehen.

## Ressourcen

**Offizielle Dokumentation:**

- PostgreSQL: [Tutorial](https://www.postgresql.org/docs/current/tutorial.html), [SQL-Befehle](https://www.postgresql.org/docs/current/sql-commands.html), [Concurrency Control](https://www.postgresql.org/docs/current/mvcc.html), [Indexe](https://www.postgresql.org/docs/current/indexes.html), [Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html), [Neuerungen in PostgreSQL 18](https://www.postgresql.org/docs/18/release-18.html).
- Aus der Community: [Don't Do This](https://wiki.postgresql.org/wiki/Don%27t_Do_This) im PostgreSQL-Wiki – kurze Liste typischer Fehler mit Begründung.
- Python: [SQLAlchemy 2.1 – Relationship Loading](https://docs.sqlalchemy.org/en/21/orm/queryguide/relationships.html), [Session Basics](https://docs.sqlalchemy.org/en/21/orm/session_basics.html), [Alembic](https://alembic.sqlalchemy.org/en/latest/), [psycopg 3](https://www.psycopg.org/psycopg3/docs/).
- TypeScript: [Prisma ORM](https://www.prisma.io/docs/orm), [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate).
- Tests: [Testcontainers](https://testcontainers.com/) für echte Datenbanken in Tests.

**Bücher:**

- Markus Winand: *SQL Performance Explained*. Indexe und Ausführungspläne aus Sicht von Entwicklern, für mehrere Datenbanken, auch auf Deutsch. Frei lesbar auf [Use The Index, Luke](https://use-the-index-luke.com/), gedruckt über die [Verlagsseite](https://sql-performance-explained.com/).
- Bill Karwin: *SQL Antipatterns, Volume 1*. Pragmatic Bookshelf, 2022. Typische Modellierungs- und Abfragefehler mit besseren Alternativen. [Verlagsseite](https://pragprog.com/titles/bksap1/sql-antipatterns-volume-1/)
- Martin Kleppmann: *Designing Data-Intensive Applications*. O'Reilly. Die Kapitel zu Transaktionen und Konsistenz erklären Isolationsstufen, Write Skew und Serialisierbarkeit unabhängig von einem Produkt. [Buchseite](https://dataintensive.net/)
- Dimitri Fontaine: *The Art of PostgreSQL*. SQL als Werkzeug für Anwendungsentwickler, mit vielen PostgreSQL-Features. [Buchseite](https://theartofpostgresql.com/)

**Migrationen und Werkzeuge:**

- [GitLab: Migration Style Guide](https://docs.gitlab.com/development/migration_style_guide/) – wie ein großes Team Migrationen ohne Ausfall schreibt.
- [strong_migrations](https://github.com/ankane/strong_migrations) – für Rails geschrieben, die Liste unsicherer Operationen mit sicherer Alternative gilt für jedes Werkzeug.
- [Squawk](https://squawkhq.com/) – Linter, der gefährliche Migrationen in der CI findet.
- [explain.dalibo.com](https://explain.dalibo.com/) – Pläne als Baum darstellen, um sie im Team zu besprechen.

Zum Nachschlagen im Alltag: der [Spickzettel](/postgres/spickzettel) und das [Glossar](/postgres/glossar) dieses Bereichs.
