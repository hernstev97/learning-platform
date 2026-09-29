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
| `/<bereich>/projekte` und `/<bereich>/projekte/<id>` | Projekte |
| `/<bereich>/spickzettel`, `/<bereich>/glossar`, `/<bereich>/beruf` | Nachschlageseiten |

Die Namen `karten`, `projekte`, `spickzettel`, `glossar` und `beruf` sind deshalb als Modul-IDs verboten.

Eine vollständige, minimale Vorlage mit jeder Übungsart liegt in [`tooling/fixtures/beispiel/`](tooling/fixtures/beispiel/). Sie wird nicht ausgeliefert, aber von den Tests geladen.

## 3. Neuen Bereich anlegen – Schritt für Schritt

1. **Lehrplan entwerfen.** Schreibe zuerst die Liste der Module auf: 10–16 Module in 2–4 Tracks, vom Einstieg bis zum Profi-Niveau. Frage dich bei jedem Modul: *Was kann ich danach, was ich vorher nicht konnte?* Und: *Würde ein Arbeitgeber das erwarten?*
2. **Ordner anlegen:** `content/<bereich>/` mit `area.yaml` (Abschnitt 4). Die Ordner-ID ist kurz, klein und kebab-case, zum Beispiel `go`, `typescript`, `devops`.
3. **Farbe wählen.** Eine kräftige Farbe, auf der schwarzer Text gut lesbar ist (Kontrast ≥ 4,5 : 1 zu `#0B0B0B`). Vorhandene Farben nicht wiederholen: `#A98BFF` Kotlin, `#FF6A3D` Rust, `#FFD400` Linux, `#4D8BFF` Python, `#2BD97C` Automation, `#FF5CA8` Git. Gute freie Kandidaten: `#22D3EE` (Cyan), `#C6F432` (Limette), `#FF9F1C` (Orange-Gelb).
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

Nur `##` und `###` verwenden. `##`-Überschriften bilden das Inhaltsverzeichnis neben der Lektion.

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

Codeblöcke immer mit Sprache angeben. Unterstützt werden `kotlin`, `rust`, `python`, `bash`/`sh`, `console`, `yaml`, `toml`, `json`, `sql`, `xml`, `dockerfile`, `ini` (auch für systemd-Units), `diff` und `text`.

| Info-String | Wirkung |
| --- | --- |
| ` ```python run ` | Block wird im Browser editierbar und mit Pyodide ausführbar. `pnpm verify` führt ihn aus; er darf keinen Fehler werfen. |
| ` ```python run fails ` | Ausführbar, soll aber absichtlich eine Exception zeigen. `pnpm verify` prüft, dass er fehlschlägt. |
| ` ```rust ` mit `fn main` | Bekommt einen Link zum Rust Playground. `pnpm verify` kompiliert ihn. |
| ` ```rust nocheck ` | Absichtlich nicht kompilierender Code (etwa um einen Borrow-Checker-Fehler zu zeigen). Kein Playground-Link, keine Prüfung. |
| ` ```console ` | Terminal-Sitzung: Zeilen mit `$ ` oder `# ` am Anfang sind Befehle, der Rest ist Ausgabe. |
| ` ```yaml title=docker-compose.yml ` | Eigene Beschriftung statt Sprachname (Unterstriche werden zu Leerzeichen). |

Python-Blöcke mit `run` laufen mit denselben Einschränkungen wie `code`-Übungen (siehe dort): frisches Verzeichnis, kein Netzwerk, keine Threads oder Prozesse, kein `input()`, kein `asyncio.run()` – `await` auf oberster Ebene funktioniert aber. Blöcke, die Threads oder Netzwerk zeigen, deshalb **ohne** `run` schreiben. Rust-Blöcke, die Crates wie `serde` oder `tokio` benutzen, werden nicht kompiliert; sie bekommen trotzdem einen Playground-Link, weil der Playground die beliebtesten Crates mitbringt.

Tabellen (GFM) sind erlaubt und im Spickzettel ausdrücklich erwünscht.

## 7. Übungen

Gemeinsame Felder aller Übungen:

| Feld | Pflicht | Inhalt |
| --- | --- | --- |
| `id` | ja | kebab-case, eindeutig im Modul. Nie ändern, sobald veröffentlicht (Fortschritt hängt daran). |
| `type` | ja | `gap`, `choice`, `order`, `output`, `command`, `code`, `practice`, `bug`, `explain` |
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
| 3. Schreiben | Syntax und Idiome aktiv produzieren | `gap`, `command`, `code` | 3–5 |
| 4. Fehler finden | Bugs erkennen, erklären, beheben | `bug` (oder `code` mit fehlerhaftem Startcode) | 1–2 |
| 5. Erklären | Bestehende Implementierungen in eigenen Worten erklären | `explain` | 1–2 |
| 6. Anwenden | Eine kleine, realistische Aufgabe lösen | `code`, `practice` | 1–2 |

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
| `bug` | Fehler finden und beheben | Off-by-one, falsche Bedingung, Race Condition, Sicherheitslücke, falscher Befehl |
| `explain` | Bestehende Implementierung erklären | Code lesen und in eigenen Worten wiedergeben – wie im Code-Review oder Interview |
| `practice` | Größere Aufgaben mit Musterlösung | Rust/Kotlin-Programme, Konfigurationen, Skripte |

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
- Mehrdeutigkeit vermeiden: Wenn mehrere Schreibweisen richtig sind, alle in `accept` aufnehmen oder die Aufgabe enger formulieren.
- Mehrzeilige Lücken sind möglich (Einrückung ist für die Prüfung egal).
- Rust-Code mit `fn main` wird nach dem Einsetzen der Musterantworten kompiliert.

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

Verglichen wird zeilenweise ohne Leerraum am Zeilenende und ohne Leerzeilen am Anfang oder Ende. Für Shell-Code (`lang: bash`) kann `verify: true` gesetzt werden; dann führt `pnpm verify` ihn in einem leeren Wegwerf-Verzeichnis aus. Ausgaben mit Zeitstempeln, PIDs, Commit-Hashes oder Zufall sind ungeeignet.

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

- Pyodide mit **Python 3.14** und der Standardbibliothek (inklusive `sqlite3`, `json`, `csv`, `re`, `pathlib`, `shutil`, `zipfile`, `hashlib`, `email`, `html.parser`, `xml.etree`, `tomllib`, `unittest.mock`). Zusätzlich verfügbar: `bs4` (BeautifulSoup), `yaml` (PyYAML) und `zoneinfo` mit Zeitzonendaten.
- **Nicht verfügbar:** Netzwerk, `subprocess`, Threads (`threading`, `ThreadPoolExecutor`), `multiprocessing`-Prozesse, `input()`. Für diese Themen `explain`, `output` (nur deterministisch), `bug` oder `practice` verwenden – oder die Aufgabe so schneiden, dass die Logik als reine Funktion testbar ist (zum Beispiel eine Funktion, die die Befehlsliste für `subprocess.run` *baut*, oder ein Abrufer, der als Parameter übergeben wird).
- **Async:** Tests dürfen `await` auf oberster Ebene verwenden (`assert await hole(1) == …`). `asyncio.gather`, `TaskGroup`, `asyncio.timeout` und `asyncio.sleep` funktionieren. Niemals `asyncio.run()` im Lernenden-Code oder in Tests aufrufen – im Browser läuft bereits eine Event-Loop.
- Jeder Lauf startet in einem frischen, leeren Arbeitsverzeichnis. `setup` kann dort Dateien anlegen.
- Der Code läuft mit `__name__ == "loesung"`; ein `if __name__ == "__main__":`-Block wird also nicht ausgeführt.
- Tests laufen nacheinander im selben Namensraum wie der Code. Die Hilfsfunktion `capture(fn, *args)` liefert, was `fn` auf stdout schreibt.
- Zeitlimit im Browser: 10 Sekunden.
- Assertion-Meldungen (`assert x == y, "…"`) erscheinen beim Lernenden – formuliere sie hilfreich.
- **Tests selbst schreiben lassen:** Der Lernende kann auch eine Testfunktion schreiben, die die Tests gegen eine richtige und eine fehlerhafte Implementierung aus `setup` laufen lassen („Schreibe einen Test, der den Bug fängt“). Das trainiert Testdenken besser als jede Theorie.

3–6 Tests pro Aufgabe: Normalfall, Randfälle (leer, eins, viele), Fehlerfall. Für Automation-Aufgaben externe Dienste mit einfachen Fake-Objekten simulieren (zum Beispiel eine Funktion `hole_seite(url)` als Parameter übergeben), statt echte HTTP-Aufrufe zu machen.

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
    q: Was bedeuten `Send` und `Sync`?
    a: |
      Markdown-Antwort, so formuliert, wie man sie im Gespräch geben würde:
      erst der Kernsatz, dann ein Beispiel, dann eine Abgrenzung.
    tags: [nebenläufigkeit, traits]
    level: 2                    # 1–3
```

Richtwert: 40–60 Karten pro Bereich. Mischung aus Wissensfragen („Was ist …?“), Vergleichen („Unterschied zwischen …?“), Szenarien („Die App friert ein – wie gehst du vor?“), Code-Review-Fragen und Verhaltensfragen mit Fachbezug. Die Plattform wiederholt Karten nach dem Leitner-System (Box 1–5; nach „Gewusst“ in 1, 3, 7, 16 und 35 Tagen).

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

Richtwert: 30–60 Begriffe. Die Plattform sortiert alphabetisch und bietet eine Suche.

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
pnpm test                      # Unit-Tests inkl. Bear-Rekonstruktion und Prüflogik
pnpm test:e2e                  # Browser-Tests (Playwright)
pnpm build                     # TypeScript + Produktionsbuild
```

`pnpm verify` braucht lokal `python3` und `rustc` (Edition 2024). Kotlin wird nicht kompiliert; Kotlin-Aufgaben daher besonders sorgfältig gegen die offizielle Dokumentation prüfen.

Checkliste vor dem Commit:

- [ ] `content:check` ohne Fehler, Warnungen bewusst akzeptiert
- [ ] `verify` ohne Fehler
- [ ] Jede Übung ist eindeutig lösbar; alternative richtige Antworten sind in `accept`/`answers`/`alternatives`
- [ ] Jede Erklärung liefert das *Warum*
- [ ] Links zeigen auf offizielle Dokumentation und funktionieren
- [ ] Im Browser durchgeklickt, auch mobil

## 11. IDs, Fortschritt und Änderungen

Fortschritt liegt nach Anmeldung in Convex: gelöste Übungen (mit Fingerprint), Entwürfe, gelesene Lektionen, Kartenboxen, Projektschritte und die letzte Lernposition. Die alten Browser-Einträge `learn:<bereich>:v1` bleiben als importierbare Quelle unverändert. [Migration und Zustandsmodell](docs/CONVEX.md).

- **Übungs-ID** = `<modul>/<id>`. Wer eine ID oder den Modulnamen ändert, verliert den Fortschritt dieser Übung.
- **Fingerprint:** Ändert sich der geprüfte Teil einer Übung (Code, Antworten, Optionen, Tests), zählt ein früherer Erfolg nicht mehr. Tippfehler in Titel oder Erklärung ändern den Fingerprint nicht.
- **Neue Übungen** ans Ende eines Moduls oder dazwischen einfügen ist unproblematisch – die Nummer in der URL ändert sich, der Fortschritt nicht.
- Module umsortieren ist jederzeit möglich (`area.yaml`).
- Auch „Weiterlernen“ speichert jetzt die Übungs-ID und berechnet die aktuelle URL-Nummer daraus.
- Abnahmekriterien tragen explizite IDs. Die früher verwendeten Schlüssel `abnahme-N` bleiben bei bestehenden Inhalten erhalten und dürfen beim Umsortieren nicht neu nummeriert werden. Neue Kriterien brauchen neue IDs.
- Entwürfe sind an ihren Inhaltsfingerprint gebunden; veraltete Entwürfe bleiben exportierbar, werden aber nicht automatisch in geänderte Übungen geladen.

## 12. YAML-Fallen

- Code und Markdown **immer** als Blockliteral `|` schreiben. Darin braucht nichts escaped zu werden.
- Einzeilige Werte, die mit `` ` ``, `*`, `&`, `!`, `[`, `{`, `>`, `|`, `%`, `@`, `#` oder `"` beginnen oder `: ` bzw. ` #` enthalten, in Anführungszeichen setzen: `text: "`list`"`.
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
