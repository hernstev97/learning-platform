# Handbuch: Lernbereiche anlegen und pflegen

Dieses Handbuch beschreibt, wie auf learn.kiumu.app ein neuer Lernbereich entsteht und wie bestehende Bereiche wachsen. Es gilt für Menschen und für KI-Agenten gleichermaßen. Wer sich daran hält, bekommt eine Seite, die ohne Codeänderung erscheint, geprüft wird und sich wie die übrigen Bereiche bedient.

Inhalt:

1. [Grundsätze](#1-grundsätze)
2. [Aufbau eines Bereichs](#2-aufbau-eines-bereichs)
3. [Neuen Bereich anlegen – Schritt für Schritt](#3-neuen-bereich-anlegen--schritt-für-schritt)
4. [area.yaml](#4-areayaml)
5. [Module](#5-module)
6. [Lektionen schreiben](#6-lektionen-schreiben)
7. [Übungen](#7-übungen)
8. [Interview-Karten, Projekte, Glossar, Spickzettel, Beruf](#8-interview-karten-projekte-glossar-spickzettel-beruf)
9. [Sprache und Stil](#9-sprache-und-stil)
10. [Qualitätssicherung](#10-qualitätssicherung)
11. [IDs, Fortschritt und Änderungen](#11-ids-fortschritt-und-änderungen)
12. [YAML-Fallen](#12-yaml-fallen)
13. [Sonderfall: Bear-Track](#13-sonderfall-bear-track)

---

## 1. Grundsätze

Die Plattform soll auf eine Anstellung als Entwickler vorbereiten. Sie ist **keine Enzyklopädie**: Sie führt aktiv vom Verständnis zur praktischen Anwendung. Daraus folgen diese Regeln:

1. **Tiefe vor Menge.** Lieber die Kernkonzepte eines Themas richtig und tief verstanden als jedes Detail oberflächlich. Eine Lektion erklärt das *Denkmodell* hinter einem Konzept, das *Warum* und die Abwägungen. Randthemen bekommen einen Satz und einen Link auf die offizielle Dokumentation statt eines eigenen Abschnitts.
2. **Korrekt und belegt.** Technische Aussagen, die über das Offensichtliche hinausgehen, verlinken auf die **offizielle Dokumentation** (Sprachreferenz, Standardbibliothek, Handbuch des Werkzeugs, man-Pages) – möglichst mit Anker auf den genauen Abschnitt. Inhalte beziehen sich auf aktuelle stabile Versionen (Stand September 2026). Alles, was sich ausführen lässt, wird mit `pnpm verify` ausgeführt.
3. **Aktiv vor passiv.** Jede Lektion endet in Übungen. Die Übungen verlangen, dass man **Code selbst schreibt, Fehler findet, Verhalten vorhersagt und bestehende Implementierungen erklärt** – nicht nur Begriffe wiedererkennt. Multiple Choice ist die Ausnahme, nicht die Regel.
4. **Vom Verstehen zum Anwenden.** Jedes Modul folgt der Lernprogression in Abschnitt 7: verstehen → vorhersagen → schreiben → Fehler finden → erklären → anwenden. Über die Module eines Bereichs steigt das Niveau bis zum Abschlussprojekt.
5. **Berufsrelevanz.** Zeige, wie etwas in echten Projekten aussieht, was in Code-Reviews auffällt und was im Vorstellungsgespräch gefragt wird (Callouts `PRAXIS` und `INTERVIEW`, Interview-Karten). Jeder Bereich endet mit einem **realistischen Abschlussprojekt**, das sich wie eine Take-Home-Aufgabe eines Arbeitgebers anfühlt und ins Portfolio gehört.
6. **Erklären, nicht nur bewerten.** Jede Übung hat eine Erklärung, die das *Warum* liefert. Falsche Optionen begründen, warum sie falsch sind.
7. **Ehrlich über Grenzen.** Wenn eine Prüfung nur vergleicht und nicht ausführt, steht das da. Wenn es mehrere richtige Antworten gibt, werden sie akzeptiert oder die Aufgabe wird eindeutig formuliert.
8. **Persönlich und frei nutzbar.** Ein freigeschaltetes Konto synchronisiert den Lernstand über Convex. Keine Streaks oder Pflichtreihenfolge. Inhalte bleiben hier im Repository, Fortschritt lässt sich exportieren. Backend und Einrichtung: [docs/CONVEX.md](docs/CONVEX.md).

## 2. Aufbau eines Bereichs

```text
content/<bereich>/
├── area.yaml          # Pflicht: Titel, Farbe, Lernziele, Tracks mit Modul-Reihenfolge
├── modules/
│   ├── <modul-id>.yaml   # Pflicht: je ein Modul (Lektion + Übungen)
│   └── …
├── interview.yaml     # empfohlen: Interview-Karteikarten
├── projects.yaml      # empfohlen: Portfolio-Projekte mit Meilensteinen
├── glossary.yaml      # empfohlen: Fachbegriffe
├── cheatsheet.md      # empfohlen: Spickzettel zum Ausdrucken
└── career.md          # empfohlen: Berufsbild, Erwartungen, Bewerbung
```

Mehr braucht es nicht. Der Build liest `content/` über ein Vite-Plugin (`tooling/vite-plugins.ts`), prüft alles (`tooling/content.ts`) und liefert pro Bereich ein eigenes, nachladbares JavaScript-Paket aus. Startseite, Bereichsseite, Navigation, Fortschritt, Karten und Projekte entstehen automatisch.

Routen, die daraus entstehen:

| Route | Inhalt |
| --- | --- |
| `/` | Startseite mit allen Bereichen |
| `/<bereich>` | Überblick, Lernpfad, Fortschritt |
| `/<bereich>/<modul>` | Lektion |
| `/<bereich>/<modul>/<n>` | Übung Nummer n (ab 1) |
| `/<bereich>/karten` | Interview-Training (Karteikarten mit Wiederholung) |
| `/wiederholen`, `/<bereich>/wiederholen` und `/<bereich>/wiederholen/<thema>` | Schwachstellen: heute fällige Themen, alle Themen eines Bereichs, eine Wiederholungsrunde |
| `/<bereich>/projekte` und `/<bereich>/projekte/<id>` | Projekte |
| `/<bereich>/spickzettel`, `/<bereich>/glossar`, `/<bereich>/beruf` | Nachschlageseiten |

Die Namen `karten`, `projekte`, `spickzettel`, `glossar`, `beruf` und `wiederholen` sind deshalb als Modul-IDs verboten, `daten` und `wiederholen` als Bereichs-IDs.

Eine vollständige, minimale Vorlage mit jeder Übungsart liegt in [`tooling/fixtures/beispiel/`](tooling/fixtures/beispiel/). Sie wird nicht ausgeliefert, aber von den Tests geladen.

## 3. Neuen Bereich anlegen – Schritt für Schritt

1. **Lehrplan entwerfen.** Schreibe zuerst die Liste der Module auf: 10–16 Module in 2–4 Tracks, vom Einstieg bis zum Profi-Niveau. Frage dich bei jedem Modul: *Was kann ich danach, was ich vorher nicht konnte?* Und: *Würde ein Arbeitgeber das erwarten?*
2. **Ordner anlegen:** `content/<bereich>/` mit `area.yaml` (Abschnitt 4). Die Ordner-ID ist kurz, klein und kebab-case, zum Beispiel `go`, `typescript`, `devops`.
3. **Farbe wählen.** Eine kräftige Farbe, auf der schwarzer Text gut lesbar ist (Kontrast ≥ 4,5 : 1 zu `#0B0B0B`). Vorhandene Farben nicht wiederholen: `#A98BFF` Kotlin, `#FF6A3D` Rust, `#FFD400` Linux, `#4D8BFF` Python, `#2BD97C` Automation, `#FF5CA8` Git, `#22D3EE` Data Analysis, `#C6F432` Testing, `#FF9F1C` PostgreSQL. Guter freier Kandidat: `#F4A3FF` (Orchidee).
4. **Module schreiben** (Abschnitte 5–7). Ein Modul pro Datei, Dateiname = Modul-ID.
5. **Karten, Projekte, Glossar, Spickzettel, Berufsseite** ergänzen (Abschnitt 8).
6. **Prüfen:** `pnpm content:check <bereich>`, dann `pnpm verify <bereich>`, dann `pnpm test` und `pnpm build`.
7. **Ansehen:** `pnpm dev`, Bereich im Browser durchklicken, mindestens eine Übung jeder Art lösen, auch auf schmalem Bildschirm.
8. **Committen und pushen.** Vercel veröffentlicht `main` automatisch auf learn.kiumu.app.

Die Startseite zählt Bereiche, Module und Übungen selbst. Die Reihenfolge der Blöcke bestimmt `order` in `area.yaml`.

## 4. area.yaml

```yaml
id: rust                      # = Ordnername, kebab-case
title: Rust                   # groß auf Startseite und Bereichsseite
short: Rust                   # optional, für enge Stellen (Navigation)
tagline: Systemnah, sicher, schnell – ohne Garbage Collector.
description: >                # 2–3 Sätze, erscheint auf der Bereichsseite
  Ownership und Borrowing, Traits und Generics, …
color: "#FF6A3D"              # Anführungszeichen nötig (sonst Kommentar!)
order: 2                      # Position auf der Startseite
outcomes:                     # 4–7 Lernziele, Markdown inline erlaubt
  - Du verstehst **Ownership, Borrowing und Lifetimes** …
tracks:
  - title: Fundament
    description: Werkzeuge, Syntax und das Ownership-Modell.
    modules: [rust-einstieg, ownership, structs-enums, fehlerbehandlung]
  - title: Abstraktion
    description: …
    modules: [collections-strings, traits-generics]
```

Jede Modul-ID in `tracks` braucht eine Datei `modules/<id>.yaml`. Module, die in keinem Track stehen, werden gemeldet und nicht ausgeliefert.

## 5. Module

```yaml
id: ownership                 # = Dateiname ohne .yaml
title: Ownership & Borrowing
level: 1                      # 1 Einstieg · 2 Fortgeschritten · 3 Profi
minutes: 120                  # realistische Lernzeit inkl. Übungen
summary: Ein Satz, der sagt, worum es geht und warum es zählt.
goals:                        # 3–6 überprüfbare Lernziele, beginnen mit „Du …“
  - Du erklärst die drei Ownership-Regeln.
  - Du erkennst, wann ein Wert verschoben und wann er kopiert wird.
resources:                    # 2–5 offizielle Quellen, nur https
  - title: The Rust Book · Kapitel 4
    url: https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html
lab: |                        # optional, nur Linux: bereitet das Terminal der Lektion vor (Abschnitt 6, Codeblöcke)
  …
lesson: |
  ## Erste Überschrift
  …Markdown…
exercises:
  - …
```

**Richtwerte pro Modul**

| | Minimum | Ziel |
| --- | --- | --- |
| Wörter in der Lektion | 1 000 | 1 500–3 000 |
| `##`-Abschnitte | 4 | 5–8 |
| Codebeispiele in der Lektion | 5 | 8–12 |
| Links auf offizielle Doku in der Lektion | 4 | 6–12 |
| Übungen | 10 | 10–14 |
| Übungsarten | 4 | 5–7 |
| davon Multiple Choice | – | höchstens ein Drittel |

`pnpm content:check` warnt unterhalb der Minima.

## 6. Lektionen schreiben

Eine Lektion ist ein gut strukturiertes Kapitel, kein Blogartikel und kein Nachschlagewerk. Sie baut ein belastbares Denkmodell auf und bereitet die Übungen vor. Aufbau:

1. **Einstieg** (ohne eigene Überschrift, 1–2 Absätze): Welches Problem löst das Thema? Ein konkretes Beispiel aus dem Alltag eines Entwicklers.
2. **Kernabschnitte** (`##`, meist 3–5): je ein Kernkonzept, erklärt an Code. Erst das einfachste funktionierende Beispiel, dann *warum* es so funktioniert (Denkmodell, was im Speicher/Prozess/Netz passiert), dann Varianten und Grenzfälle. Jede nicht offensichtliche Aussage verlinkt die offizielle Doku.
3. **Häufige Fehler** (`## Häufige Fehler`): was Anfänger falsch machen, woran man es erkennt (Fehlermeldung, Symptom) und wie man es behebt.
4. **Aus der Praxis**: wie das Thema in echten Codebasen, Code-Reviews oder im Betrieb auftaucht (als `PRAXIS`-Callout oder eigener Abschnitt).
5. **Zusammenfassung** (`## Zusammenfassung`): 5–8 Stichpunkte zum Merken.

Was nicht in die Lektion gehört: vollständige API-Listen, Historie, Randfälle ohne Praxisrelevanz. Dafür gibt es Links, Glossar und Spickzettel.

Nur `##` und `###` verwenden. `##`-Überschriften bilden das Inhaltsverzeichnis neben der Lektion. Außerdem wird jeder `##`-Abschnitt ein eigener Treffer der globalen Suche, mit der Überschrift als Titel. Überschriften sollten deshalb das Thema nennen („Borrowing: Daten nutzen, ohne sie zu besitzen“) statt nur „Beispiel“ zu lauten.

### Callouts

```markdown
> [!TIP] Optionaler Titel
> Text, auch mehrere Zeilen und `Code`.
```

| Typ | Wofür |
| --- | --- |
| `NOTE` | Ergänzende Information |
| `TIP` | Abkürzung, gute Gewohnheit |
| `WARNING` | Falle, die Zeit oder Daten kostet |
| `MERKE` | Kernsatz, den man auswendig können sollte |
| `PRAXIS` | So sieht es in echten Projekten aus |
| `INTERVIEW` | So wird danach gefragt – und so antwortest du |
| `DEEP` | Optionaler Blick unter die Haube |

Richtwert: 3–6 Callouts pro Lektion, davon mindestens ein `INTERVIEW` und ein `PRAXIS`.

### Codeblöcke

Codeblöcke immer mit Sprache angeben. Unterstützt werden `kotlin`, `rust`, `python`, `bash`/`sh`, `console`, `yaml`, `toml`, `json`, `sql`, `postgres` (auch `postgresql`, `pgsql`), `xml`, `dockerfile`, `ini` (auch für systemd-Units), `diff`, `excel` (Formeln), `powerquery` (Power Query M, auch `m`), `csv`, `typescript` (auch `ts`, `tsx`), `javascript` (auch `js`, `jsx`) und `text`.

| Info-String | Wirkung |
| --- | --- |
| ` ```python run ` | Block wird im Browser editierbar und mit Pyodide ausführbar. `pnpm verify` führt ihn aus; er darf keinen Fehler werfen. |
| ` ```python run fails ` | Ausführbar, soll aber absichtlich eine Exception zeigen. `pnpm verify` prüft, dass er fehlschlägt. |
| ` ```python pytest ` | Der Block ist eine Testdatei: editierbar, „Ausführen“ startet pytest (`-v --tb=short`) und zeigt dessen echten Bericht. Den getesteten Code definiert der Block selbst. `pnpm verify` verlangt, dass alle Tests bestehen; mit `pytest fails` muss mindestens einer scheitern – gut, um echte Fehlermeldungen zu zeigen. |
| ` ```sql run ` | Block wird editierbar und läuft Anweisung für Anweisung gegen eine frische SQLite-Datenbank im Browser; jede Ergebnismenge erscheint als Tabelle. Der Block legt seine Tabellen selbst an (`CREATE TABLE`, `INSERT`). `pnpm verify` führt ihn aus; `sql run fails` erwartet einen Fehler. |
| ` ```postgres run ` | Wie `sql run`, aber gegen ein frisches **PostgreSQL 18** (PGlite) im Browser. Zeigt je Anweisung, was psql zeigt: Tabelle, Befehlsmeldung (`CREATE TABLE`, `INSERT 0 3`), Hinweise (`NOTICE`), Pläne von `EXPLAIN` als Text, Fehler mit Zeilenmarker. `pnpm verify` führt ihn aus; `postgres run fails` erwartet einen Fehler. |
| ` ```rust ` mit `fn main` | Bekommt einen Link zum Rust Playground. `pnpm verify` kompiliert ihn. |
| ` ```rust nocheck ` | Absichtlich nicht kompilierender Code (etwa um einen Borrow-Checker-Fehler zu zeigen). Kein Playground-Link, keine Prüfung. |
| ` ```console ` | Terminal-Sitzung: Zeilen mit `$ ` oder `# ` am Anfang sind Befehle, der Rest ist Ausgabe. |
| ` ```console vm `, ` ```bash vm ` | Läuft unverändert im Linux der Lektion (siehe unten). Der Block bekommt „Im Terminal“: Ein Klick öffnet unten im Fenster ein echtes Debian und tippt die Befehle ein. Bei `console` sind nur die `$ `-Zeilen Befehle. `pnpm vm:verify` führt jeden Block aus; ` vm fails ` erwartet einen Exit-Code ungleich 0. |
| ` ```yaml title=docker-compose.yml ` | Eigene Beschriftung statt Sprachname (Unterstriche werden zu Leerzeichen). |

SQL läuft im Browser mit **SQLite 3.39** (die Version in Pyodide), nicht mit der neueren SQLite auf dem Rechner. Fensterfunktionen, `RIGHT`/`FULL JOIN`, `IS DISTINCT FROM`, JSON-Funktionen und Mathefunktionen (`sqrt`, `ln`, `floor`) gibt es; `string_agg`, `concat`, `median` und `percentile` nicht. `pnpm verify` prüft SQL deshalb mit genau dieser Version.

#### PostgreSQL im Browser

Blöcke und Übungen mit `postgres` laufen in [PGlite](https://pglite.dev/), einem echten PostgreSQL 18 als WebAssembly, in einem Web Worker. Beim ersten Gebrauch lädt der Browser einmalig rund 5 MB (komprimiert); der Service Worker legt die Dateien danach ab. Jeder Lauf klont eine frische Datenbank, nichts überlebt bis zum nächsten. `pnpm verify` und die Tabellenvorschau beim Build nutzen dieselbe PGlite-Version unter Node.

- **Einstellungen:** Zeitzone `Europe/Berlin` (Sommerzeit inklusive), Meldungen auf Englisch, `DateStyle` ISO, keine parallelen Pläne (`max_parallel_workers_per_gather = 0`, PGlite hat keine Worker-Prozesse). Die Erweiterungen `btree_gist` und `pg_trgm` stehen für `CREATE EXTENSION` bereit; `pg_stat_statements` und `auto_explain` nicht.
- **Eine Sitzung:** PGlite ist ein einzelner Prozess mit einer Verbindung. Transaktionen, Savepoints, `SELECT … FOR UPDATE` und Isolationsstufen laufen, aber **zwei Sitzungen gleichzeitig gibt es nicht**: Sperrkonflikte, Deadlocks und Serialisierungsfehler zwischen Sitzungen lassen sich nicht vorführen. Zeige sie als Zeitleiste in einem `text`-Block oder in `explain`-, `order`- und `choice`-Übungen.
- **Zeitlimit:** 10 Sekunden je Lauf. `statement_timeout` wirkt in PGlite nicht; der Worker wird beendet und neu gestartet. Tabellen für `EXPLAIN`-Beispiele mit `generate_series` füllen, ein paar tausend Zeilen genügen, danach `ANALYZE`.
- **Nicht deterministisch** und deshalb ungeeignet für `output`-Übungen und für Spalten, die eine `sql`-Übung vergleicht: `now()`, `clock_timestamp()`, `random()`, `gen_random_uuid()`, Zeiten aus `EXPLAIN ANALYZE`. Für Pläne `EXPLAIN (COSTS OFF)` nehmen, mit `ANALYZE` zusätzlich `TIMING OFF, SUMMARY OFF, BUFFERS OFF` (PostgreSQL 18 zeigt Buffers sonst immer an).
- **Ausprobieren:** `pnpm pg:run datei.sql` oder `pnpm pg:run -e 'SELECT …'` führt SQL in einer frischen Datenbank aus und zeigt jede Anweisung wie psql; `--tuples` gibt nur die Zeilen aus, genau das Format von `output`-Übungen.

Python-Blöcke mit `run` laufen mit denselben Einschränkungen wie `code`-Übungen (siehe dort): frisches Verzeichnis, kein Netzwerk, keine Threads oder Prozesse, kein `input()`, kein `asyncio.run()` – `await` auf oberster Ebene funktioniert aber. Blöcke, die Threads oder Netzwerk zeigen, deshalb **ohne** `run` schreiben. Rust-Blöcke, die Crates wie `serde` oder `tokio` benutzen, werden nicht kompiliert; sie bekommen trotzdem einen Playground-Link, weil der Playground die beliebtesten Crates mitbringt.

#### Linux im Browser: `vm`-Blöcke und `lab`

Lektionen mit mindestens einem `vm`-Block oder einem `lab` bekommen ein Linux-Terminal: dieselbe VM wie bei den `scenario`-Übungen (Debian 12, Benutzer `ops`, siehe dort). Es öffnet sich erst auf Klick, über „Im Terminal“ an einem Block oder „Linux-Terminal öffnen“ im Kopf der Lektion, und endet mit der Lektion.

````yaml
lab: |                         # optional, vor lesson: bash als root, bereitet die VM für die Beispiele vor
  set -e
  install -d -o ops -g ops /home/ops/logs
  printf '%s\n' '10.0.0.7 GET /health 200' … > /home/ops/logs/access.log
lesson: |
  ```console vm
  $ grep -c ' 500 ' ~/logs/access.log
  3
  ```
````

- Markiere nur Befehle, die in der VM wirklich laufen und nicht auf Eingaben warten: kein `less`, `top`, `vim`, `ssh` mit Passwortabfrage, kein `exit` (es schließt die Shell des Lernenden). Die gezeigte Ausgabe soll die sein, die Debian 12 in der VM ausgibt (gekürzt mit `…` ist in Ordnung). `pnpm vm:run` zeigt sie dir.
- `lab` läuft nach jedem Start und nach „Zurücksetzen“, danach meldet sich `ops` neu an, und erst dann erscheint der Prompt. Lege dort die Dateien, Benutzer und Units an, mit denen die Beispiele arbeiten. Halte es kurz.
- `pnpm vm:verify` führt nach `lab` alle `vm`-Blöcke der Lektion der Reihe nach als `ops` in einer Login-Shell aus, ohne Terminal. Dateien bleiben von Block zu Block erhalten, Shell-Variablen und das aktuelle Verzeichnis nicht. Jeder Block muss mit 0 enden (bei `console` zählt der letzte Befehl), Blöcke mit `fails` mit einem anderen Wert.

Tabellen (GFM) sind erlaubt und im Spickzettel ausdrücklich erwünscht.

## 7. Übungen

Gemeinsame Felder aller Übungen:

| Feld | Pflicht | Inhalt |
| --- | --- | --- |
| `id` | ja | kebab-case, eindeutig im Modul. Nie ändern, sobald veröffentlicht (Fortschritt hängt daran). |
| `type` | ja | `gap`, `choice`, `order`, `output`, `command`, `code`, `practice`, `bug`, `explain`, `sql`, `scenario` |
| `title` | ja | Kurz, neugierig machend, keine Lösung verraten |
| `prompt` | ja | Markdown. Die Aufgabe, eindeutig formuliert. |
| `explanation` | ja | Markdown. Erscheint nach dem Lösen: *warum* das richtig ist, was dahintersteckt, typische Verwechslungen. 2–6 Sätze. |
| `hints` | nein | Liste abgestufter Hinweise (Markdown inline), vom sanften Schubs bis fast zur Lösung. Bei `gap` stattdessen `gaps[].hint`. |
| `wiki` | nein | Hintergrundwissen, das die Lösung **nicht** verrät. Text oder `{ title, body }`. Wird im aufklappbaren „Zum Nachlesen“ gezeigt. |
| `resources` | empfohlen | `[{ title, url }]` – gezielte Links in die offizielle Doku (Anker verwenden). Mindestens die Hälfte der Übungen eines Moduls hat einen. |

Nach jeder Übung kann man „Lösung zeigen“. Gelöst ist eine Übung aber erst, wenn die eigene Eingabe stimmt oder, bei `practice`, alle Punkte abgehakt sind.

### Lernprogression im Modul

Die Übungen eines Moduls stehen in dieser Reihenfolge. Jede Stufe setzt die vorige voraus:

| Stufe | Ziel | Übungsarten | Anzahl |
| --- | --- | --- | --- |
| 1. Verstehen | Kernbegriffe und Denkmodell sitzen | `choice`, `order` | 1–3 |
| 2. Vorhersagen | Code im Kopf ausführen | `output` | 2–3 |
| 3. Schreiben | Syntax und Idiome aktiv produzieren | `gap`, `command`, `code`, `sql` | 3–5 |
| 4. Fehler finden | Bugs erkennen, erklären, beheben | `bug` (oder `code` mit fehlerhaftem Startcode) | 1–2 |
| 5. Erklären | Bestehende Implementierungen in eigenen Worten erklären | `explain` | 1–2 |
| 6. Anwenden | Eine kleine, realistische Aufgabe lösen | `code`, `practice`, `scenario` | 1–2 |

`pnpm content:check` warnt, wenn einem Modul `output`, `bug` oder `explain` fehlt oder mehr als ein Drittel Multiple Choice ist.

### Welche Übungsart wofür?

| Art | Tätigkeit | Einsatz |
| --- | --- | --- |
| `choice` | Konzepte unterscheiden | Verwechslungen, Abwägungen, „Welche Aussage stimmt?“ |
| `order` | Abläufe strukturieren | Parsons-Aufgaben: Zeilen sortieren, Schrittfolgen |
| `output` | Verhalten vorhersagen | Auswertungsreihenfolge, Referenzen, Shadowing, Scoping, Ownership |
| `gap` | Code schreiben (gezielt) | Schlüsselwörter, Ausdrücke, ganze Zeilen in echtem Code |
| `command` | Befehle aus dem Kopf schreiben | Linux, Git, Cargo, Gradle, uv |
| `code` | Code schreiben (frei, mit Tests) – nur Python | Funktionen schreiben, die im Browser automatisch geprüft werden |
| `sql` | Abfragen schreiben, die im Browser laufen | Filtern, Gruppieren, Joins, Fensterfunktionen – verglichen wird das Ergebnis, nicht der Text. In PostgreSQL mit `check` auch DDL, Datenänderungen und Transaktionen |
| `bug` | Fehler finden und beheben | Off-by-one, falsche Bedingung, Race Condition, Sicherheitslücke, falscher Befehl |
| `explain` | Bestehende Implementierung erklären | Code lesen und in eigenen Worten wiedergeben – wie im Code-Review oder Interview |
| `practice` | Größere Aufgaben mit Musterlösung | Rust/Kotlin-Programme, Konfigurationen, Skripte |
| `scenario` | Einen Fehler in einem echten Linux finden und beheben | Diagnose im Linux-Pfad: Dienste, Logs, Rechte, Konfiguration. Bewertet wird der reparierte Zustand. |

Python- und Automation-Module haben mindestens drei `code`-Übungen, davon gern eine mit fehlerhaftem Startcode („Repariere …“).

### `gap` – Lückentext im Code

```yaml
- id: funktion-ergaenzen
  type: gap
  title: Eine Funktion ergänzen
  prompt: Ergänze das Schlüsselwort und den Rückgabewert.
  lang: python
  code: |
    ⟦def⟧ doppelt(x):
        return ⟦x * 2⟧
  gaps:                        # optional, aber empfohlen – gleiche Reihenfolge wie im Code
    - label: Funktionsdefinition
      hint: Funktionen beginnen mit einem Schlüsselwort aus drei Buchstaben.
    - label: Rückgabe
      hint: Multipliziere den Parameter.
      accept: ["2 * x"]        # weitere akzeptierte Antworten
  explanation: |
    `def` definiert eine Funktion. `x * 2` und `2 * x` sind gleichwertig.
```

- Lücken stehen direkt im Code zwischen `⟦` und `⟧` (U+27E6/U+27E7). Der Inhalt ist die Musterantwort.
- Geprüft wird **tokenweise** je nach `lang`: Leerraum zwischen Tokens ist egal, Groß-/Kleinschreibung und Zeichen nicht. In Python gelten `'a'` und `"a"` als gleich.
- Mehrdeutigkeit vermeiden: Wenn mehrere Schreibweisen richtig sind, alle in `accept` aufnehmen oder die Aufgabe enger formulieren. Alternativen, die der Vergleich ohnehin gleich behandelt, sind überflüssig; die Lösung zeigt sie nicht an.
- Mehrzeilige Lücken sind möglich (Einrückung ist für die Prüfung egal).
- Rust-Code mit `fn main` wird nach dem Einsetzen der Musterantworten kompiliert.
- **SQL** (`lang: sql`): Schlüsselwörter, Funktionen und Namen ohne Groß-/Kleinschreibung (`count(*)` = `COUNT(*)`), `!=` = `<>`, ein `;` am Ende ist optional. Text in Anführungszeichen bleibt exakt.
- **TypeScript und JavaScript** (`lang: typescript`, `javascript`): `'a'`, `"a"` und `` `a` `` sind gleich, solange darin nichts escaped oder mit `${…}` eingesetzt wird. Ein Semikolon am Zeilenende ist optional. Vitest-, Testing-Library- und Playwright-Code läuft nirgends; prüfe ihn gegen die offizielle Dokumentation und probiere ihn außerhalb des Repositorys aus.
- **Excel-Formeln** (`lang: excel`): Deutsche und englische Schreibweise sind gleichwertig. `=SUMMEWENNS(B:B;A:A;"Nord")` = `=SUMIFS(B:B,A:A,"Nord")`: Funktionsnamen werden übersetzt, Groß-/Kleinschreibung von Funktionen, Bezügen und strukturierten Verweisen ist egal, `;` gilt als `,`, das Dezimalkomma als Punkt, das führende `=` ist optional. `$A$1` und `A1` bleiben verschieden, Text in Anführungszeichen ebenso. Die Übersetzungstabelle steht in `src/engine/excel.ts`; neue Funktionen dort ergänzen. Das gilt auch für `bug`-Korrekturen. Excel selbst läuft nicht – Formeln werden verglichen, nicht berechnet.

### `choice` – Auswahl

```yaml
- id: unveraenderlich
  type: choice
  title: Was ist unveränderlich?
  prompt: Welche dieser Typen sind in Python unveränderlich?
  lang: python                 # nur nötig, wenn `code` gesetzt ist
  code: |                      # optional: Code, auf den sich die Frage bezieht
    t = (1, 2)
  options:
    - text: "`tuple`"          # Markdown inline; Backtick am Anfang → in Anführungszeichen setzen
      correct: true
      why: Ein Tupel kann nach dem Erzeugen nicht verändert werden.
    - text: "`list`"
      correct: false
      why: Listen lassen sich verändern, etwa mit `append`.
  explanation: …
```

- Sind mehrere Optionen richtig, wird automatisch eine Mehrfachauswahl daraus und der Prompt sagt „Mehrere Antworten richtig“.
- Jede Option braucht `why`. Die Begründung wird nach dem Prüfen bei den gewählten Optionen angezeigt.
- 3–5 Optionen, plausible Distraktoren (typische Missverständnisse), keine Witzantworten, kein „Alle genannten“.

### `order` – Zeilen sortieren

```yaml
- id: datei-lesen
  type: order
  title: Datei zeilenweise lesen
  prompt: Bring die Zeilen in die richtige Reihenfolge.
  lang: python
  lines: |                     # in der RICHTIGEN Reihenfolge; Einrückung gehört zur Zeile
    from pathlib import Path
    pfad = Path("notizen.txt")
    with pfad.open(encoding="utf-8") as datei:
        for zeile in datei:
            print(zeile.rstrip())
  alternatives:                # optional: weitere richtige Reihenfolgen (1-basiert)
    - [2, 1, 3, 4, 5]
  explanation: …
```

Die Plattform mischt die Zeilen deterministisch. 4–10 Zeilen sind ideal. Zeilen mit identischem Text sind austauschbar. Wenn zwei Zeilen unabhängig voneinander sind, entweder `alternatives` angeben oder das Beispiel eindeutig machen.

### `output` – Ausgabe vorhersagen

```yaml
- id: sorted-vs-sort
  type: output
  title: Was wird ausgegeben?
  prompt: Was gibt dieses Programm aus?
  lang: python                 # python und rust werden von pnpm verify ausgeführt
  code: |
    werte = [3, 1, 2]
    print(sorted(werte))
    print(werte)
  expected: |
    [1, 2, 3]
    [3, 1, 2]
  accept: []                   # optional: weitere gültige Ausgaben
  verify: false                # optional: nur wenn die Ausgabe nicht deterministisch ist
  explanation: …
```

Verglichen wird zeilenweise ohne Leerraum am Zeilenende und ohne Leerzeilen am Anfang oder Ende. TypeScript und JavaScript (`lang: typescript`, `javascript`) führt `pnpm verify` mit Node 24 aus: nur eigenständiger Code ohne Imports aus npm-Paketen (`node:`-Module gehen) und nur TypeScript, das Node durch Entfernen der Typen ausführen kann (kein `enum`, kein `namespace`, keine Parameter-Properties). SQL (`lang: sql`) führt `pnpm verify` immer aus: Der Code legt seine Tabellen selbst an, erwartet wird die Ausgabe der `sqlite3`-Kommandozeile im Standardmodus – Werte durch `|` getrennt, keine Kopfzeile, `NULL` als leerer Wert, Kommazahlen mit Punkt (`3.0`, `12.5`). Sag das im Prompt. PostgreSQL (`lang: postgres`) ebenso, erwartet wird die Ausgabe von `psql -At`: Werte durch `|` getrennt, keine Kopfzeile, `NULL` leer, Wahrheitswerte als `t`/`f`, Zahlen und Zeiten so, wie PostgreSQL sie ausgibt (`numeric(8,2)` als `12.50`, `timestamptz` als `2026-03-02 09:00:00+01`). Nur Zeilen zählen, keine Befehlsmeldungen wie `INSERT 0 3`. `pnpm pg:run --tuples` zeigt genau diese Ausgabe. Für Shell-Code (`lang: bash`) kann `verify: true` gesetzt werden; dann führt `pnpm verify` ihn in einem leeren Wegwerf-Verzeichnis aus. Ausgaben mit Zeitstempeln, PIDs, Commit-Hashes oder Zufall sind ungeeignet.

Git läuft dabei ohne System- und globale Konfiguration, mit fester Identität, `init.defaultBranch=main`, ohne Editor und Pager und mit englischen Meldungen (`GIT_ENV` in `tooling/verify-code.ts`). Verglichen wird nur stdout; viele Git-Meldungen landen auf stderr.

### `command` – Terminal

```yaml
- id: versteckte-dateien
  type: command
  title: Alle Dateien anzeigen
  prompt: Zeige **alle** Dateien im aktuellen Verzeichnis ausführlich an, auch versteckte.
  context: Du bist in `~/projekt`.       # optional, Markdown: Ausgangslage
  answers: ["ls -la", "ls -lA"]          # erste Antwort = Musterlösung
  output: |                              # optional: simulierte Ausgabe nach dem Lösen
    drwxr-xr-x 3 steven steven 4096 Sep 28 10:00 .
  symbol: "$"                            # optional: "#" für Root-Shells
  explanation: …
```

Die Prüfung ist tolerant bei Dingen, die die Bedeutung nicht ändern:

- Kurzoptionen dürfen gebündelt und umsortiert werden: `ls -la` = `ls -al` = `ls -l -a`.
- Einfache Wörter dürfen gequotet sein: `grep error log` = `grep "error" log` = `grep 'error' log`.
- `'…'` und `"…"` sind gleich, solange darin kein `$`, `` ` `` oder `\` steht.

Alles andere (Langoptionen wie `--all`, `sudo`, andere Pfade, Reihenfolge von Argumenten) muss in `answers` stehen. Denke beim Schreiben an die drei, vier häufigsten korrekten Varianten.

### `code` – Python mit Tests (läuft im Browser)

```yaml
- id: woerter-zaehlen
  type: code
  title: Wörter zählen
  prompt: Schreibe `zaehle_woerter(text)`, die die Anzahl der Wörter zurückgibt.
  lang: python
  starter: |                   # was im Editor steht; muss mindestens einen Test NICHT bestehen
    def zaehle_woerter(text: str) -> int:
        ...
  solution: |                  # Musterlösung; muss alle Tests bestehen
    def zaehle_woerter(text: str) -> int:
        return len(text.split())
  setup: |                     # optional: läuft vorher unsichtbar, z. B. Dateien anlegen
    from pathlib import Path
    Path("daten.txt").write_text("a\nb\n", encoding="utf-8")
  tests:
    - name: Zwei Wörter        # sichtbarer Name, beschreibt das Verhalten
      code: assert zaehle_woerter("Hallo Welt") == 2
    - name: Leerer Text
      code: |
        ergebnis = zaehle_woerter("")
        assert ergebnis == 0, f"erwartet 0, bekommen {ergebnis!r}"
  explanation: …
```

Laufzeitumgebung (Browser und `pnpm verify` identisch, siehe `src/python/harness.py`):

- Pyodide mit **Python 3.14** und der Standardbibliothek (inklusive `sqlite3`, `json`, `csv`, `re`, `pathlib`, `shutil`, `zipfile`, `hashlib`, `email`, `html.parser`, `xml.etree`, `tomllib`, `unittest.mock`). Zusätzlich verfügbar: `bs4` (BeautifulSoup), `yaml` (PyYAML), `zoneinfo` mit Zeitzonendaten, **pandas 3.0 mit numpy 2.4** sowie **pytest 9.0 und Hypothesis 6.168** (siehe unten). Beim ersten `import pandas` lädt der Browser einmalig etwa 8 MB; das zählt nicht zum Zeitlimit. pandas 3 hat Copy-on-Write und einen eigenen `str`-Datentyp für Text – Beispiele und erwartete Ausgaben müssen dazu passen. `pnpm verify` führt pandas-Code in einer virtuellen Umgebung mit denselben Versionen aus (angelegt mit `uv`). Nicht verfügbar: matplotlib, openpyxl, pyarrow – Code dafür als `python` ohne `run` oder als `practice`.
- **Nicht verfügbar:** Netzwerk, `subprocess`, Threads (`threading`, `ThreadPoolExecutor`), `multiprocessing`-Prozesse, `input()`. Für diese Themen `explain`, `output` (nur deterministisch), `bug` oder `practice` verwenden – oder die Aufgabe so schneiden, dass die Logik als reine Funktion testbar ist (zum Beispiel eine Funktion, die die Befehlsliste für `subprocess.run` *baut*, oder ein Abrufer, der als Parameter übergeben wird).
- **Async:** Tests dürfen `await` auf oberster Ebene verwenden (`assert await hole(1) == …`). `asyncio.gather`, `TaskGroup`, `asyncio.timeout` und `asyncio.sleep` funktionieren. Niemals `asyncio.run()` im Lernenden-Code oder in Tests aufrufen – im Browser läuft bereits eine Event-Loop.
- Jeder Lauf startet in einem frischen, leeren Arbeitsverzeichnis. `setup` kann dort Dateien anlegen, auch Module: Das Verzeichnis ist importierbar, `from tarif import mietpreis` findet also eine Datei `tarif.py` aus `setup`.
- Der Code läuft mit `__name__ == "loesung"`; ein `if __name__ == "__main__":`-Block wird also nicht ausgeführt.
- Tests laufen nacheinander im selben Namensraum wie der Code. Die Hilfsfunktion `capture(fn, *args)` liefert, was `fn` auf stdout schreibt.
- Zeitlimit im Browser: 10 Sekunden.
- Assertion-Meldungen (`assert x == y, "…"`) erscheinen beim Lernenden – formuliere sie hilfreich.
- **Tests selbst schreiben lassen:** Der Lernende schreibt pytest-Tests, und die Prüfung lässt sie mit echtem pytest gegen eine richtige und mehrere fehlerhafte Implementierungen laufen („Schreibe Tests, die den Bug fangen“). Das trainiert Testdenken besser als jede Theorie. Dafür gibt es in den Tests `run_pytest` (siehe unten).

3–6 Tests pro Aufgabe: Normalfall, Randfälle (leer, eins, viele), Fehlerfall. Für Automation-Aufgaben externe Dienste mit einfachen Fake-Objekten simulieren (zum Beispiel eine Funktion `hole_seite(url)` als Parameter übergeben), statt echte HTTP-Aufrufe zu machen.

#### Tests mit pytest prüfen: `run_pytest`

In den `tests` einer `code`-Übung führt `run_pytest(files=None, *, args=(), name="test_loesung.py")` pytest auf dem Code des Lernenden aus. Er wird als `name` in ein neues Verzeichnis gespeichert, daneben die Dateien aus `files` (`{pfad: quelltext}`). Module werden für jeden Lauf neu importiert; so lässt sich dieselbe Testdatei gegen verschiedene Fassungen eines Moduls laufen lassen. pytest läuft nur auf dieser Datei. Ist `name` keine Testdatei, etwa eine `conftest.py` mit Fixtures, sammelt pytest stattdessen alle Testdateien des Verzeichnisses; `args` kann weitere Pfade oder Optionen wie `-k` nennen. Das Ergebnis ist ein `PytestRun`:

| Attribut | Inhalt |
| --- | --- |
| `ok` | Exit-Code 0 und mindestens ein bestandener Test |
| `passed`, `failed`, `skipped` | Namen der Tests, etwa `test_preis[5-0]`; `failed` enthält auch Fehler in Fixtures und beim Sammeln |
| `outcomes` | `{name: "passed" \| "failed" \| "error" \| "skipped" \| "xfailed" \| "xpassed"}` |
| `exit_code`, `output` | Exit-Code und Bericht von pytest (`-q --tb=short`), gut als Meldung für den Lernenden |

```yaml
setup: |
  from pathlib import Path

  RICHTIG = '''
  def brutto(netto):
      return round(netto * 1.19, 2)
  '''
  OHNE_RUNDUNG = RICHTIG.replace("round(netto * 1.19, 2)", "netto * 1.19")
  Path("preise.py").write_text(RICHTIG)   # der Code des Lernenden wird vorher einmal importiert
tests:
  - name: Grün gegen die richtige Implementierung
    code: |
      lauf = run_pytest({"preise.py": RICHTIG})
      assert lauf.ok, lauf.output
  - name: Fängt einen Fehler beim Runden
    code: |
      lauf = run_pytest({"preise.py": OHNE_RUNDUNG})
      assert not lauf.ok, "Deine Tests bleiben grün, obwohl nicht mehr gerundet wird."
```

- Der erste Test prüft, dass die Tests gegen die richtige Fassung grün sind, jeder weitere einen Mutanten. Die Namen nennen den Regelbereich, nicht den Fall, der scheitert – sie sind vor dem Lösen sichtbar.
- Mutanten sind realistische Fehler (Grenze um eins verschoben, `<` statt `<=`, fehlende Rundung, vergessener Fall), die sich aus der Beschreibung im Prompt finden lassen. Der Prompt nennt deshalb den vollständigen Vertrag.
- Höchstens etwa fünf Läufe je Übung: Jeder dauert im Browser 0,1 bis 0,5 Sekunden, mit Hypothesis länger. pytest selbst wird vor dem Zeitlimit geladen.
- Hypothesis läuft mit `derandomize=True`, `deadline=None` und ohne Beispieldatenbank: dieselben Beispiele bei jedem Lauf, im Browser wie in `pnpm verify`.
- Ein Starter mit einer leeren Testfunktion (`...`) fängt keinen Mutanten und erfüllt so die Regel, dass er mindestens einen Test nicht besteht.

### `sql` – SQL-Abfrage (läuft im Browser)

```yaml
- id: umsatz-je-region
  type: sql
  title: Umsatz je Region
  prompt: |
    Berechne den Nettoumsatz je Region. Spalten `region` und `umsatz`, größter Umsatz zuerst.
  schema: |                    # Pflicht: baut die Datenbank auf, vor jedem Lauf neu
    CREATE TABLE bestellungen (bestellung_id INTEGER PRIMARY KEY, region TEXT NOT NULL, betrag REAL);
    INSERT INTO bestellungen (region, betrag) VALUES ('Nord', 120.5), ('Süd', 80), ('Nord', 40);
  starter: |                   # optional: was im Editor steht; darf das Ergebnis nicht schon liefern
    SELECT region, betrag
    FROM bestellungen;
  solution: |                  # Pflicht: eine Abfrage (SELECT, gern mit WITH davor)
    SELECT region, SUM(betrag) AS umsatz
    FROM bestellungen
    GROUP BY region
    ORDER BY umsatz DESC;
  ordered: true                # optional: Reihenfolge der Zeilen zählt (verlangt ORDER BY in der Lösung)
  explanation: …
```

- Die Abfrage des Lernenden und die Musterlösung laufen im Browser (SQLite 3.39 in Pyodide) gegen je eine frische Datenbank aus `schema`. Verglichen wird das **Ergebnis**: Spaltenzahl, Spaltennamen (ohne Groß-/Kleinschreibung), Werte (3 = 3.0, Rundungsrauschen unter 10⁻⁹ zählt nicht) und – nur mit `ordered: true` – die Reihenfolge. Jede richtige Formulierung wird also akzeptiert.
- Der Prompt nennt deshalb **Spaltennamen, Rundung und Sortierung** ausdrücklich („Spalten `region` und `umsatz`, auf zwei Stellen gerundet“). Ohne diese Angaben ist die Aufgabe nicht eindeutig lösbar.
- Die Tabellen erscheinen über dem Editor als Vorschau (bis zu 12 Zeilen je Tabelle, erzeugt beim Build), das vollständige `schema` aufklappbar. Halte Tabellen klein genug, dass man das Ergebnis im Kopf nachrechnen kann – meist 5–20 Zeilen – und baue die Fallen ein, um die es geht (`NULL`, Duplikate, Kunden ohne Bestellung, gleiche Werte bei Rangfolgen).
- Die Rückmeldung nennt die erste Abweichung („Spalte 2 heißt `summe`, erwartet ist `umsatz`“, „Deine Abfrage liefert 5 Zeilen, erwartet sind 4“, „Die Zeile (West, 0) gehört so nicht ins Ergebnis“), ohne das erwartete Ergebnis zu verraten.
- `pnpm verify` führt die Musterlösung mit derselben SQLite-Version aus: Sie muss Zeilen liefern, und der `starter` darf das erwartete Ergebnis noch nicht liefern.
- SQL-Module mischen `sql` mit `output` (`lang: sql`, siehe oben), `gap`, `bug` und `explain`; `sql` ersetzt dort die `code`-Übungen.

#### `sql` in PostgreSQL: `lang: postgres` und `check`

Mit `lang: postgres` laufen Schema, Abfrage und Musterlösung in PostgreSQL 18 (siehe [PostgreSQL im Browser](#postgresql-im-browser)), und die Vorschau zeigt die Werte so, wie psql sie ausgibt. Gesucht ist weiter genau eine Anweisung, die Zeilen liefert – in PostgreSQL also auch `INSERT`, `UPDATE`, `DELETE` oder `MERGE` mit `RETURNING`.

Für alles, was kein Ergebnis liefert – Constraints anlegen, Daten migrieren, Indexe bauen, Transaktionen –, gibt es `check`: Der Lernende schreibt beliebig viele Anweisungen, danach läuft die Prüfabfrage. Verglichen wird ihr Ergebnis mit ihrem Ergebnis nach der Musterlösung, wie bei einer Abfrage. Der Lernende sieht die Meldung jeder Anweisung, das Ergebnis der Prüfabfrage und die Prüfabfrage selbst (aufklappbar).

```yaml
- id: preis-nie-negativ
  type: sql
  lang: postgres
  title: Kein Preis unter null
  prompt: |
    Sorge dafür, dass `buchungen.preis` nie negativ sein kann. Fehlende Preise (`NULL`) bleiben erlaubt.
  schema: |
    CREATE TABLE buchungen (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, raum text NOT NULL, preis numeric(8,2));
  starter: |
    -- ALTER TABLE …
  solution: |
    ALTER TABLE buchungen ADD CONSTRAINT preis_nicht_negativ CHECK (preis >= 0);
  check: |                     # eine Abfrage; läuft nach den Anweisungen des Lernenden bzw. nach der Lösung
    SELECT lp.versuch($$INSERT INTO buchungen (raum, preis) VALUES ('Loft', -1)$$) AS negativ,
           lp.versuch($$INSERT INTO buchungen (raum) VALUES ('Loft')$$) AS ohne_preis;
  explanation: …
```

- **Prüfe das Verhalten, nicht die Schreibweise.** `lp.versuch(anweisung)` führt eine Anweisung aus, rollt sie immer zurück und liefert `ok` oder den Namen des Fehlers (`check_violation`, `unique_violation`, `foreign_key_violation`, `not_null_violation`, `exclusion_violation`, sonst den SQLSTATE). So gilt jeder Constraint-Name und jede gleichwertige Bedingung. Für Daten genügen Abfragen auf die Tabellen, für Indexe und Spalten der Katalog (`pg_indexes`, `information_schema.columns`) – aber nur Eigenschaften, die die Aufgabe verlangt, nicht Namen, die der Lernende frei wählt.
- Der Prompt nennt alles, was geprüft wird. Die Prüfabfrage ist für den Lernenden sichtbar und verrät die Lösung nicht.
- `pnpm verify` verlangt: Nach der Lösung liefert die Prüfabfrage Zeilen und keinen Fehler, nach dem `starter` (oder, ohne Starter, auf dem nackten Schema) ein anderes Ergebnis.
- `ordered: true` bezieht sich bei `check` auf die Prüfabfrage; sie braucht dann `ORDER BY`.

### `scenario` – Linux-Szenario (echte VM im Browser)

```yaml
- id: dienst-nach-boot
  type: scenario
  title: Läuft von Hand, aber nicht nach dem Neustart
  prompt: |                    # Symptom und Ziel, so wie es im Betrieb ankommt
    `web01` wurde heute früh neu gestartet. Seitdem antwortet `http://localhost:8000/health` nicht. …
  setup: |                     # Pflicht: bash als root, baut den Fehler in den frischen Snapshot ein
    set -e
    mkdir -p /opt/healthapp/www
    …
    systemctl daemon-reload
  checks:                      # Pflicht: je ein bash-Skript als root, Exit-Code 0 = bestanden
    - name: healthapp startet beim Boot
      run: systemctl is-enabled healthapp
    - name: Der Health-Endpunkt antwortet
      run: curl -fsS --max-time 5 http://localhost:8000/health
  solution: |                  # Pflicht: Musterlösung, so wie der Lernende sie tippt (als ops, mit sudo)
    sudo systemctl enable --now healthapp
    …
  hints: […]
  explanation: …
```

Die Übung startet ein echtes Debian 12 (i386, systemd 252) in [v86](https://github.com/copy/v86), einem x86-Emulator in WebAssembly. Der Lernende arbeitet frei im Terminal und meldet mit „Prüfen“, dass er fertig ist. Bewertet wird der reparierte Zustand, nicht der Weg dorthin.

- **Ablauf:** „Linux starten“ lädt einmalig den Snapshot (rund 32 MB) und stellt ihn wieder her. Danach stellt der Steuerkanal die Uhr auf jetzt und führt `setup` aus. Anschließend meldet sich `ops` auf dem Terminal neu an, damit die Shell Gruppen, Startdateien und `/etc/environment` aus `setup` kennt; erst dann erscheint der Prompt. „Zurücksetzen“ stellt den Snapshot wieder her und führt `setup` erneut aus. Die Kopfzeile zählt die Befehle; die Zahl fließt nicht in die Bewertung ein.
- **Umgebung:** Hostname `web01`, angemeldet als `ops` mit `sudo` ohne Passwort, Mitglied von `adm` und `systemd-journal` (Journal ohne sudo), Zeitzone Europe/Berlin, Ausgaben auf Englisch. root hat kein Passwort. Ein emulierter Prozessor, rund 220 MB RAM, kein Swap. Unter Emulation ist alles 10- bis 50-mal langsamer als auf echter Hardware.
- **Dienste:** systemd 252 mit journald (persistent, `journalctl -b -1` nach einem Neustart), udev, logind, dbus, polkit, `ssh` (sshd auf Port 22) und `cron`. `nginx` ist installiert, aber nicht aktiviert. `lp-agent` (Steuerkanal auf ttyS1) und das Autologin auf ttyS0 gehören der Plattform: Szenarien ändern sie nicht.
- **Werkzeuge:** coreutils, util-linux (`lsblk`, `findmnt`, `losetup`, `fdisk`), e2fsprogs, `lvm2`, `cryptsetup`, `acl`, `setcap`/`capsh`, `curl`, `dig`/`host`, `dnsmasq` (ohne Dienst-Unit), `ip`, `ss`, `ping`, `nc`, `tcpdump`, OpenSSH, `rsync`, `busybox` (zum Beispiel `busybox httpd`), procps, `sysstat` (`iostat`, `pidstat`, `mpstat`), `htop`, psmisc, `lsof`, `strace`, `file`, `tree`, `less`, `nano`, `vim.tiny`, `man` mit Handbuchseiten, `desktop-file-validate`, `pkexec`, `lspci`, initramfs-tools, GRUB 2.06, dpkg und apt (nur lokale `.deb`-Dateien). Nicht vorhanden: Python, ein Compiler, Docker, git, systemd-resolved, NetworkManager, nftables. Die Paketliste steht in `tooling/vm/Dockerfile`.
- **Netzwerk:** nur `lo`. Das ganze Netz 127.0.0.0/8 zeigt darauf, damit lassen sich „fremde“ Server nachstellen, etwa ein DNS-Server mit `dnsmasq --listen-address=127.0.10.53 --bind-interfaces`.
- **Platten und Dateisysteme:** Das Wurzeldateisystem kommt per 9p aus dem Emulator (`host9p`). Es kennt keine erweiterten Attribute: ACLs, Datei-Capabilities und `chattr` gehen dort nicht. Lege dafür in `setup` ein ext4 auf einem Loop-Device oder ein tmpfs an und hänge es ein. `/boot` liegt auf `/dev/sda1` (ext4, Label `boot`) der 64-MB-Platte `/dev/sda`, GRUB steht im MBR. Loop-Devices, Device Mapper, LVM und LUKS funktionieren.
- **Neustart:** `sudo reboot` startet die VM wirklich neu, über GRUB (Menü im Terminal, 5 Sekunden, `e` bearbeitet einen Eintrag, `Strg`+`X` bootet). Nach rund 40 Sekunden ist der Prompt zurück. Alles auf der Platte und im Wurzeldateisystem bleibt erhalten, Mounts, Loop-Devices und Prozesse aus `setup` nicht; `setup` läuft danach nicht erneut. Im Rescue- oder Emergency-Modus genügt Enter an der Passwortabfrage. Dort und während des Starts antwortet der Steuerkanal nicht; „Prüfen“ sagt das dem Lernenden.
- **`setup`** läuft als root im frischen Snapshot. Beginne mit `set -e`, damit ein Fehler im Aufbau auffällt, statt ein halb kaputtes Szenario zu liefern. Neue oder geänderte Units brauchen `systemctl daemon-reload`. Halte `setup` kurz: Der Lernende wartet darauf, und unter Emulation dauert schon `daemon-reload` rund vier Sekunden, `update-grub` drei, `update-initramfs -u` über 40.
- **`checks`** laufen als root nacheinander, alle, auch nach einem Fehlschlag. Die Ausgabe einer gescheiterten Prüfung sieht der Lernende, die Befehle erst in der Lösung. Prüfe das Ergebnis, nicht einen bestimmten Lösungsweg: `curl` auf den Endpunkt statt `grep` in der Unit-Datei. Eine Prüfung kann nicht neu starten. Für „übersteht den Boot“ reichen `systemctl is-enabled` und `systemctl restart`, denn ein von Hand gestarteter Prozess besteht das nicht; für Mounts `findmnt --verify`, `systemctl daemon-reload` und der Start der einzelnen Mount-Unit (`systemctl start -- "$(systemd-escape -p --suffix=mount /srv/data)"`). Nie `local-fs.target` starten: Scheitert dabei ein Pflicht-Mount, schaltet `OnFailure=` die VM in den Emergency-Modus, und der Steuerkanal endet.
- **`solution`** erscheint unter „Lösung zeigen“. `pnpm vm:verify` führt sie als `ops` in einer Login-Shell ohne Terminal aus, also genau so, wie sie dasteht. Editoren und Rückfragen gehen dort nicht: Schreibe Dateien mit `tee`, `sed -i` oder `printf`. `systemctl` und `journalctl` öffnen im Terminal einen Pager, sobald die Ausgabe nicht auf den Bildschirm passt; in Lösungen deshalb `--no-pager`.
- **Fallen:** `bash -i` ohne Terminal (etwa in `checks`) bricht mit „Hangup“ ab, prüfe Startdateien mit `runuser -l` oder `su - … -c`. `ssh localhost` kostet unter Emulation rund fünf Sekunden. Nach `systemctl reload ssh` ist Port 22 kurz zu, warte mit `nc -z`.
- **Prüfung:** `pnpm vm:verify [bereich | bereich/modul]` stellt für jedes Szenario den Snapshot unter Node wieder her. Nach `setup` muss mindestens eine Prüfung scheitern, nach `setup` und `solution` müssen alle bestehen. Mehrere VMs laufen parallel (`--jobs N`). `pnpm verify` prüft Szenarien nicht.
- **Ausprobieren:** `pnpm vm:run skript.sh` führt Skripte in einer frischen VM aus und zeigt Exit-Code, Dauer und Ausgabe; `-e 'befehle'` statt einer Datei, `--as ops` führt die folgenden Skripte als Lernender aus (`--as root` schaltet zurück), `--reboot` zwischen zwei Skripten startet neu, `--tty` zeigt die Konsole mit GRUB und Bootmeldungen.
- **Firmennetz:** Die VM hat kein Netzwerk (kein Relay, keine Netzwerktreiber im Image). Alle Dateien kommen von der eigenen Domain, nichts lädt vor „Linux starten“, und nichts landet im Precache. Lädt der Snapshot nicht, etwa weil ein Proxy große Downloads sperrt, meldet die Übung das, und der Rest der Seite läuft weiter. In einem Hintergrund-Tab pausiert die VM.
- **Offline:** Der Service Worker legt den Snapshot und jede Datei, die die VM liest, beim ersten Gebrauch ab. Offline funktioniert, was die VM schon einmal gelesen hat.

#### Das Image

```sh
pnpm vm:build      # Docker baut Debian und die Bootplatte, v86 bootet zweimal unter Node und speichert den Zustand (6–8 Minuten)
pnpm vm:verify     # alle Szenarien und vm-Blöcke gegen das Image prüfen
```

`pnpm vm:build` braucht Docker mit buildx, `python3` (3.14 oder das Modul `zstandard`) und `zstd`. Das Dockerfile hat zwei Ergebnisse: das Wurzeldateisystem und eine 64-MB-Bootplatte mit GRUB im MBR und `/boot` auf der ersten Partition. Die VM bootet von der Platte, GRUB lädt Kernel und initramfs, und das initramfs hängt das Wurzeldateisystem per 9p ein. Beim ersten Start ersetzt `update-grub` die von Hand geschriebene `grub.cfg` (`tooling/vm/disk/grub.cfg`), ein zweiter Start beweist, dass die erzeugte bootet. Weil 9p auf keinem Blockgerät liegt, beantwortet ein kleiner Wrapper um `grub-probe` die Frage nach dem Gerät von `/` mit `host9p`. Die Kernelzeile steht in `tooling/vm/rootfs/etc/default/grub`.

Das Ergebnis liegt in `vendor/vm/debian-12/` und wird committet wie `vendor/pyodide`. Es besteht aus `state.bin.zst` (Snapshot samt Dateitabelle und Inhalt der Bootplatte), `files/` (eine zstd-Datei je Datei im Wurzeldateisystem, benannt nach ihrem Hash), dem BIOS und `manifest.json`. Das Vite-Plugin `vm()` kopiert es zusammen mit v86 nach `public/vm/`.

Szenarien brauchen keinen Neubau, solange ihnen das Image reicht. Neu bauen musst du nach Änderungen an `tooling/vm/` (Pakete, Steuerkanal, Benutzer, GRUB) und nach einem v86-Update, denn der Snapshot passt nur zu der v86-Version, mit der er entstand. v86 läuft mit einem kleinen Patch (`patches/v86.patch`, über `pnpm patch` eingebunden): Symlinks, die erst in der VM entstehen, bekommen auf 9p die Rechte `lrwxrwxrwx` und die richtige Größe. Ohne ihn verliert `cpio` sie, und `update-initramfs` baut ein initramfs, das nicht bootet. Prüfe nach einem v86-Update, ob der Patch noch nötig ist und noch passt. Speicher, Plattengröße und serielle Schnittstellen stehen in `src/vm/config.ts` und gelten für Build und Browser gleichermaßen.

### `bug` – Fehler finden und beheben

```yaml
- id: summe-off-by-one
  type: bug
  title: Die Summe stimmt nicht
  prompt: |
    `summe_bis(n)` soll alle Zahlen von 1 bis einschließlich `n` addieren.
    Für `summe_bis(3)` kommt aber `3` statt `6` heraus. Finde die fehlerhafte Zeile und korrigiere sie.
  lang: python
  code: |
    def summe_bis(n):
        total = 0
        for i in range(n):
            total += i
        return total
  lines: [3]                   # fehlerhafte Zeile(n), 1-basiert
  fix:                         # optional, empfohlen: die korrigierte Zeile muss eingetippt werden
    - line: 3
      answers: ["for i in range(n + 1):", "for i in range(1, n + 1):"]
  explanation: |
    `range(n)` endet **vor** `n` …
```

Ablauf: Erst die fehlerhafte(n) Zeile(n) anklicken und prüfen, dann – falls `fix` gesetzt ist – die korrigierte Zeile eintippen (tokenweise geprüft, Einrückung egal). Der Prompt beschreibt das **Symptom** (erwartetes vs. tatsächliches Verhalten, Fehlermeldung), nicht die Ursache. Gute Bugs sind realistisch: Off-by-one, vertauschte Bedingung, vergessenes `await`, geteilter veränderlicher Zustand, fehlendes Quoting in Bash, falsche Rechte. Genau eine Ursache pro Zeile. `pnpm verify` prüft, dass der korrigierte Code kompiliert (Rust mit `fn main`) bzw. gültiges Python ist.

### `explain` – Code erklären

```yaml
- id: lru-cache-erklaeren
  type: explain
  title: Was macht dieser Cache?
  prompt: Erkläre in eigenen Worten, was `@lru_cache` hier bewirkt und warum die Funktion dadurch schnell wird.
  lang: python
  code: |
    @lru_cache(maxsize=None)
    def fib(n: int) -> int:
        return n if n < 2 else fib(n - 1) + fib(n - 2)
  points:                      # Kernpunkte, die eine gute Erklärung enthält (Selbstkontrolle)
    - Ergebnisse werden pro Argument gespeichert (Memoization).
    - Jeder Wert von `fib` wird nur einmal berechnet.
    - Laufzeit sinkt von exponentiell auf linear.
  explanation: |               # dient als Musterantwort
    `lru_cache` merkt sich für jedes Argument das Ergebnis …
```

Ablauf: Der Lernende schreibt seine Erklärung (mindestens ein paar Sätze), vergleicht dann mit der Musterantwort und hakt ab, welche Kernpunkte er getroffen hat. Gelöst ist die Übung, wenn alle Punkte abgehakt sind – wer einen Punkt vergessen hat, ergänzt seine Erklärung. 3–5 Kernpunkte, jeweils ein überprüfbarer Gedanke. Die Musterantwort ist so formuliert, wie man es im Code-Review oder Interview sagen würde.

### `practice` – Praxisaufgabe mit Musterlösung

```yaml
- id: fizzbuzz
  type: practice
  title: FizzBuzz in Rust
  prompt: Schreibe FizzBuzz von 1 bis 15.
  lang: rust
  starter: |                   # optional
    fn main() {
        // Dein Code
    }
  solution: |                  # Pflicht; Rust wird von pnpm verify kompiliert (#[test]s laufen)
    fn main() { … }
  checklist:                   # Selbstkontrolle; alle Punkte abhaken = gelöst
    - Du nutzt `match` auf einem Tupel.
    - Die Reihenfolge der Arme ist korrekt.
  verify: false                # optional: Rust-Lösung nicht kompilieren (z. B. braucht Crates)
  explanation: …
```

Für alles, was sich im Browser nicht prüfen lässt: Kotlin-Programme, Rust-Programme, Konfigurationen, Dockerfiles, systemd-Units, Bash-Skripte. Rust-Aufgaben bekommen automatisch einen Button „Im Rust Playground öffnen“ mit dem eigenen Entwurf. Die Checkliste enthält überprüfbare Kriterien, keine Floskeln.

**Kaputt-Labore** (Bash mit `verify: true`): `starter` ist ein Skript, das in einem leeren Verzeichnis einen kaputten Zustand erzeugt, etwa ein Git-Repository nach einem missglückten `reset --hard`. `solution` wiederholt dieses Skript zeichengleich, ergänzt die Reparatur und endet mit einer `# Kontrolle` aus `test`, `grep -q` oder `git diff --quiet`, die ohne Reparatur scheitert. `pnpm verify` führt die Lösung unter `set -euo pipefail` in einem Wegwerf-Verzeichnis aus und verlangt Exit-Code 0. Absichtlich scheiternde Befehle (Merge mit Konflikt, abgelehnter Push) brauchen `|| true`. Der Git-Bereich nutzt dieses Muster in jedem Modul.

## 8. Interview-Karten, Projekte, Glossar, Spickzettel, Beruf

### interview.yaml

```yaml
cards:
  - id: send-sync               # kebab-case, stabil
    module: nebenlaeufigkeit     # Modul, dessen Stoff die Karte abfragt (empfohlen)
    q: Was bedeuten `Send` und `Sync`?
    a: |
      Markdown-Antwort, so formuliert, wie man sie im Gespräch geben würde:
      erst der Kernsatz, dann ein Beispiel, dann eine Abgrenzung.
    tags: [nebenläufigkeit, traits]
    level: 2                    # 1–3
```

Richtwert: 40–60 Karten pro Bereich. Mischung aus Wissensfragen („Was ist …?“), Vergleichen („Unterschied zwischen …?“), Szenarien („Die App friert ein – wie gehst du vor?“), Code-Review-Fragen und Verhaltensfragen mit Fachbezug. Die Plattform wiederholt Karten nach dem Leitner-System (Box 1–5, fällig nach 1, 3, 7, 16 und 35 Tagen). Nach dem Aufdecken bewertet man sich selbst: „Okay“ schiebt die Karte eine Box weiter, „Leicht“ zwei, „Schwer“ lässt sie in ihrer Box, „Vergessen“ setzt sie auf Box 1 zurück. Die Regeln stehen in `src/engine/review.ts`.

**`module`** ordnet die Karte dem Modul zu, dessen Stoff sie abfragt. Unter „Wiederholen“ werden Schwächen nach Themen gebündelt: Eine vergessene Karte erscheint dann zusammen mit den Übungen desselben Moduls („Ownership: 2 Fehlversuche, 1 Karte vergessen“). Wähle das Modul, in dem man das Konzept tatsächlich lernt, nicht nur das mit dem passenden Tag. Reine Verhaltens- und Karrierefragen („Wie gehst du mit einer Deadline um?“) bekommen kein Modul; sie werden nach ihrem ersten Tag gebündelt („Interview: Praxis“). Der Build meldet unbekannte oder Bear-Module als Fehler.

### projects.yaml

```yaml
projects:
  - id: todo-cli
    title: Todo-CLI
    level: 1
    hours: 6
    summary: Eine Zeile, erscheint in der Übersicht (Markdown inline).
    brief: |
      Markdown: Ausgangslage, Anforderungen (als Liste), Rahmenbedingungen.
    skills: [argparse, json, pathlib]
    steps:                      # Meilensteine; werden abgehakt und gespeichert
      - id: datenmodell         # Pflicht, stabil; nicht aus dem sichtbaren Titel ableiten
        title: Datenmodell entwerfen
        detail: Markdown mit konkreten Hinweisen, aber ohne fertige Lösung.
    stretch:                    # Zusatzaufgaben für Ehrgeizige
      - Fälligkeitsdaten
    portfolio: |
      Wie man das Projekt im Portfolio und im Gespräch präsentiert.
```

Richtwert: 3–5 Projekte je Bereich, vom Wochenendprojekt bis zum Portfolio-Stück, jedes mit 5–10 Schritten. `acceptance` (optional, Liste aus `{ id, text }`) enthält überprüfbare Abnahmekriterien mit stabilen IDs. Schritt- und Abnahme-IDs müssen innerhalb des Projekts eindeutig sein.

**Abschlussprojekt.** Genau ein Projekt pro Bereich trägt `capstone: true`. Es erscheint am Ende des Lernpfads und fühlt sich an wie eine echte Aufgabe eines Arbeitgebers: ein Auftraggeber mit Problem, klare fachliche Anforderungen, technische Rahmenbedingungen, mindestens fünf Abnahmekriterien (Tests, CI, README, Fehlerbehandlung, Code-Qualität, Sicherheit), 8–12 Meilensteine und eine Anleitung, wie man es im Portfolio und im Gespräch präsentiert. Es verbindet die Inhalte möglichst vieler Module des Bereichs.

```yaml
  - id: abschluss-…
    title: …
    capstone: true
    level: 3
    hours: 40
    acceptance:
      - id: ci-pruefung
        text: "`cargo test` und `cargo clippy -- -D warnings` laufen in GitHub Actions grün."
```

### glossary.yaml

```yaml
terms:
  - term: Borrow Checker
    definition: Markdown, 1–3 Sätze.
```

Richtwert: 30–60 Begriffe. Die Plattform sortiert alphabetisch und bietet eine Suche. Jeder Begriff ist unter `/<bereich>/glossar#begriff-<slug>` direkt erreichbar, auch aus der globalen Suche.

### cheatsheet.md und career.md

Normales Markdown mit `##`-Abschnitten. Der **Spickzettel** ist dicht: Tabellen, kurze Codeblöcke, keine Prosa. Er wird druckfreundlich dargestellt. Die **Berufsseite** beschreibt Rollen und Jobtitel, was Arbeitgeber (auch im deutschsprachigen Raum) erwarten, wie Vorstellungsgespräche und Coding-Challenges ablaufen, welche Projekte ins Portfolio gehören, einen Lernplan in Wochen und die wichtigsten Ressourcen.

## 9. Sprache und Stil

- **Deutsch, Du-Form**, klar und direkt. Fachbegriffe bleiben englisch, wenn sie in der Praxis englisch sind (Ownership, Borrowing, Coroutine, Pull Request, Pipe). Beim ersten Auftreten kurz erklären.
- **Echte Umlaute** (ä, ö, ü, ß), deutsche Anführungszeichen „…“, Gedankenstrich –, Auslassung …
- Code, Bezeichner und Befehle immer in Backticks. Bezeichner im Code dürfen deutsch sein, wenn das Beispiel dadurch verständlicher wird; bei Bibliotheks-APIs und in „echtem“ Code englisch.
- Kurze Sätze. Keine Füllwörter („eigentlich“, „einfach“, „natürlich“), kein Marketing, keine Emojis.
- Nichts behaupten, was man nicht belegen kann. Versionen nennen, wenn sich etwas geändert hat (zum Beispiel „seit Python 3.12“, „Rust Edition 2024“).
- Beispiele aus dem echten Leben eines Entwicklers: Logdateien, Konfigurationen, APIs, Apps – nicht `foo` und `bar`.

## 10. Qualitätssicherung

```sh
pnpm content:check [bereich]   # Struktur, Pflichtfelder, IDs, Lücken, Richtwerte (Warnungen)
pnpm verify [bereich]          # führt Python aus, kompiliert Rust, vergleicht Ausgaben
                               # beide mit --allow-missing: fehlende Moduldateien nur als Warnung
pnpm vm:verify [bereich]       # Linux-Szenarien und vm-Blöcke in der echten VM (siehe scenario)
pnpm vm:run skript.sh          # ein Skript in einer frischen VM ausführen (zum Ausprobieren)
pnpm pg:run datei.sql          # SQL in einem frischen PostgreSQL ausführen (wie im Browser)
pnpm test                      # Unit-Tests inkl. Bear-Rekonstruktion und Prüflogik
pnpm test:e2e                  # Browser-Tests (Playwright)
pnpm build                     # TypeScript + Produktionsbuild
```

`pnpm verify` braucht lokal `python3` und `rustc` (Edition 2024), für pandas- und pytest-Code zusätzlich `uv`: Beim ersten Lauf entsteht unter `node_modules/.cache/verify-python/` eine virtuelle Umgebung mit genau den pandas- und numpy-Versionen des Browsers (aus `pyodide-lock.json`) und den pytest- und Hypothesis-Versionen aus `src/python/packages.ts`. TypeScript- und JavaScript-`output` laufen mit dem Node, das auch `pnpm verify` ausführt. SQL prüft `verify` in Pyodide unter Node, also mit derselben SQLite wie im Browser, PostgreSQL mit derselben PGlite-Version wie im Browser. Kotlin wird nicht kompiliert; Kotlin-Aufgaben daher besonders sorgfältig gegen die offizielle Dokumentation prüfen. Excel-Formeln und Power-Query-Code laufen nirgends; sie brauchen besonders sorgfältige Prüfung gegen die Microsoft-Dokumentation.

`content:check` und `verify` nehmen auch einzelne Module: `pnpm verify data/sql-joins`. Dann zählen nur Fehler dieses Moduls und der `area.yaml` – praktisch, solange andere Module desselben Bereichs noch entstehen.

Checkliste vor dem Commit:

- [ ] `content:check` ohne Fehler, Warnungen bewusst akzeptiert
- [ ] `verify` ohne Fehler
- [ ] Bei Linux-Szenarien und `vm`-Blöcken: `vm:verify` ohne Fehler
- [ ] Jede Übung ist eindeutig lösbar; alternative richtige Antworten sind in `accept`/`answers`/`alternatives`
- [ ] Jede Erklärung liefert das *Warum*
- [ ] Links zeigen auf offizielle Dokumentation und funktionieren
- [ ] Im Browser durchgeklickt, auch mobil

## 11. IDs, Fortschritt und Änderungen

Fortschritt liegt nach Anmeldung in Convex: gelöste Übungen (mit Fingerprint), Entwürfe, gelesene Lektionen, Notizen pro Lektion, Kartenboxen, Fehlversuche, Hinweise und angesehene Lösungen pro Übung (für „Wiederholen“), Projektschritte und die letzte Lernposition. Die alten Browser-Einträge `learn:<bereich>:v1` bleiben als importierbare Quelle unverändert. [Migration und Zustandsmodell](docs/CONVEX.md).

- **Übungs-ID** = `<modul>/<id>`. Wer eine ID oder den Modulnamen ändert, verliert den Fortschritt dieser Übung, auch ihren Wiederholungsstand.
- **Wiederholen** braucht keine Pflege: Fehlversuche meldet jede Übungsart selbst. Neue Übungsarten müssen bei einer falsch geprüften Antwort `ctx.fail()` aufrufen (oder `failOnce(ctx)` aus `src/exercises/types.ts`, damit dieselbe Antwort nur einmal zählt), sonst fließen sie nicht in die Schwachstellen ein. Die Regeln stehen in `src/engine/drill.ts` und `src/engine/weakness.ts`; die Seite „Wiederholen“ erklärt sie auch für Lernende.
- **Fingerprint:** Ändert sich der geprüfte Teil einer Übung (Code, Antworten, Optionen, Tests), zählt ein früherer Erfolg nicht mehr. Tippfehler in Titel oder Erklärung ändern den Fingerprint nicht.
- **Neue Übungen** ans Ende eines Moduls oder dazwischen einfügen ist unproblematisch – die Nummer in der URL ändert sich, der Fortschritt nicht.
- Module umsortieren ist jederzeit möglich (`area.yaml`).
- Auch „Weiterlernen“ speichert jetzt die Übungs-ID und berechnet die aktuelle URL-Nummer daraus.
- Abnahmekriterien tragen explizite IDs. Die früher verwendeten Schlüssel `abnahme-N` bleiben bei bestehenden Inhalten erhalten und dürfen beim Umsortieren nicht neu nummeriert werden. Neue Kriterien brauchen neue IDs.
- Entwürfe sind an ihren Inhaltsfingerprint gebunden; veraltete Entwürfe bleiben exportierbar, werden aber nicht automatisch in geänderte Übungen geladen.
- Die **globale Suche** braucht keine Pflege: Der Build indexiert Module, Lektionsabschnitte, Glossar, Spickzettel, Projekte und Interview-Karten aus denselben Dateien. Sprungziele sind die `##`-Überschriften, Glossarbegriffe und Karten-IDs (`/<bereich>/karten#karte-<id>`).

## 12. YAML-Fallen

- Code und Markdown **immer** als Blockliteral `|` schreiben. Darin braucht nichts escaped zu werden.
- Einzeilige Werte, die mit `` ` ``, `*`, `&`, `!`, `[`, `{`, `>`, `|`, `%`, `@`, `#` oder `"` beginnen oder `: ` bzw. ` #` enthalten, in Anführungszeichen setzen: `text: "`list`"`. Das gilt auch für Listeneinträge: ``- Die Datei enthält `timeout: 30`.`` wird ohne Anführungszeichen zu einem Objekt. `content:check` meldet solche Einträge in Checklisten, Kernpunkten, Zielen und Antwortlisten als Fehler.
- Farben quoten: `color: "#FF6A3D"` – ohne Anführungszeichen ist es ein Kommentar.
- `yes`, `no`, `on`, `off` sind in YAML 1.2 Strings, aber `true`/`false` sind Booleans. `correct:` braucht echte Booleans.
- Einrückung in Blockliteralen: der Inhalt muss mindestens so weit eingerückt sein wie die erste Zeile. Python-Code darin normal weiter einrücken.
- Tabs sind in YAML verboten; im Code eines Blockliterals sind sie erlaubt, aber vermeide sie.

## 13. Sonderfall: Bear-Track

Der Track „Praxis: Kotlin mit Bear“ im Kotlin-Bereich stammt aus dem früheren Repository `kotlin-lernen` (Historie per `git subtree` übernommen). Er wird nicht in YAML geschrieben, sondern aus einem gepinnten Snapshot echter Bear-Dateien erzeugt:

```sh
pnpm bear:build   # content/kotlin/bear/lessons.py + bear-source.json → bear-course.json
pnpm bear:check   # prüft, dass bear-course.json aktuell ist
```

`area.yaml` bindet ihn mit `bear: bear/bear-course.json` als eigenen Track ein; der Loader macht daraus zehn Module `bear-01` … `bear-10`. Details: [content/kotlin/bear/README.md](content/kotlin/bear/README.md).

Aufgaben in `lessons.py` nennen ihre bestehende Aufgaben-ID und Kapitel-ID jetzt ausdrücklich als erste zwei Argumente. Kapitel in `build_course.py` besitzen ebenfalls eine explizite ID. Diese Kennungen niemals aus der neuen Reihenfolge neu erzeugen. `bear-course.json` immer mit dem Generator bauen, nicht von Hand ändern.
