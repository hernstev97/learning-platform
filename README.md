# learn.kiumu.app

Private Lernplattform für Kotlin & Android, Rust, Linux, Python und Automation mit Python. Live: [learn.kiumu.app](https://learn.kiumu.app) · Privates Repository: [hernstev97/learning-platform](https://github.com/hernstev97/learning-platform)

Die Plattform ist kein Nachschlagewerk. Jedes Modul besteht aus einer Lektion, die ein Denkmodell aufbaut und auf die offizielle Dokumentation verweist, und aus 10–14 Übungen in fester Reihenfolge: verstehen → vorhersagen → schreiben → Fehler finden → erklären → anwenden. Jeder Bereich hat Interview-Karteikarten mit Wiederholung, Projekte und ein Abschlussprojekt, das wie eine Take-Home-Aufgabe im Bewerbungsprozess geschnitten ist.

**Neue Lernbereiche anlegen: siehe [HANDBUCH.md](HANDBUCH.md).**

## Start

Node.js 24, pnpm 11. Für `pnpm verify` zusätzlich `python3` (3.14) und `rustc` (Edition 2024), für den Bear-Generator Python 3.

```sh
pnpm install
pnpm dev            # http://127.0.0.1:5180
```

| Befehl | Zweck |
| --- | --- |
| `pnpm content:check [bereich]` | Inhalte validieren (Pflichtfelder, IDs, Lücken, Richtwerte) |
| `pnpm verify [bereich]` | Python-Übungen und -Beispiele ausführen, Rust kompilieren, Ausgaben vergleichen |
| `pnpm links [bereich]` | Alle externen Links und Anker prüfen |
| `pnpm test` | Unit-Tests (Prüflogik, Speicher, Bear-Rekonstruktion, Inhalte) |
| `pnpm test:e2e` | Browser-Tests aller Lernbereiche, neun Übungsarten, Python-Laufzeit, Lernstand und Bear-Track |
| `pnpm build` | TypeScript prüfen und statisch nach `dist/` bauen |
| `pnpm bear:build`, `pnpm bear:check` | Bear-Track aus dem gepinnten Snapshot erzeugen bzw. prüfen |
| `pnpm screenshots /pfad@390 …` | Screenshots gegen den laufenden Dev-Server |

`CONTENT_LENIENT=1 pnpm dev` überspringt ungültige oder fehlende Module statt abzubrechen – praktisch, während man an Inhalten schreibt. Der Produktionsbuild ist immer strikt.

## Aufbau

```text
content/<bereich>/         Inhalte (YAML + Markdown) – siehe HANDBUCH.md
content/kotlin/bear/       Bear-Track: Generator, gepinnter Bear-Snapshot, erzeugter Kurs
tooling/content.ts         Lädt, validiert und normalisiert alle Inhalte (Build, Tests, Skripte)
tooling/markdown.ts        Markdown → HTML zur Build-Zeit (Callouts, Codeblöcke, Inhaltsverzeichnis)
tooling/vite-plugins.ts    Inhalte als virtuelle Module (ein Chunk pro Bereich), Pyodide selbst gehostet
tooling/verify-code.ts     Führt Musterlösungen und Beispiele aus
tooling/fixtures/          Beispielbereich mit jeder Übungsart (Tests, Vorlage)
src/engine/                Prüflogik (tokenbasiert je Sprache), Highlighter, Lernstand
src/exercises/             Die neun Übungsarten
src/pages/                 Startseite, Bereich, Lektion, Übung, Karten, Projekte, Nachschlageseiten, Daten
src/python/                Pyodide-Worker und Harness (dieselbe Harness nutzt pnpm verify)
vendor/pyodide/            Zusätzliche Pyodide-Pakete (tzdata, beautifulsoup4, PyYAML)
```

Die App ist ein statisches Vite-Projekt ohne Framework, Backend oder Konto. Alle Assets, Schriften und die Python-Laufzeit werden vom eigenen Ursprung geladen; nur explizit geöffnete Doku-Links und der Rust Playground führen nach außen.

## Lernstand

Pro Bereich ein Eintrag `learn:<bereich>:v1` im `localStorage`: gelöste Übungen mit Fingerprint, Entwürfe, gelesene Lektionen, Kartenboxen, Projektschritte. Ändert sich der geprüfte Teil einer Übung, zählt ein früherer Erfolg nicht mehr. Unter `/daten` lässt sich alles als JSON sichern und wieder zusammenführen; dort kann auch der alte Stand von kotlin.kiumu.app übernommen werden.

## Prüfung der Antworten – und ihre Grenzen

- **Lückencode, Terminal, Fehlerkorrektur:** tokenweiser Vergleich mit den akzeptierten Antworten, je nach Sprache (Python: `'a'` = `"a"`; Shell: `-la` = `-al` = `-l -a`, harmlose Anführungszeichen egal). Es wird kein Compiler ausgeführt; gleichwertige Umformulierungen müssen als Alternative hinterlegt sein.
- **Python-Code:** läuft wirklich – in Pyodide (Python 3.14) in einem Web Worker mit Zeitlimit, gegen die Tests der Übung. Kein Netzwerk, keine Threads, kein `subprocess`.
- **Ausgabe vorhersagen:** zeilenweiser Vergleich; die erwarteten Ausgaben stammen aus echten Läufen (`pnpm verify`).
- **Praxis- und Erklär-Übungen:** Selbstkontrolle über Checklisten; Rust-Entwürfe lassen sich im offiziellen Playground ausführen.

## Deployment

Vercel-Projekt `learning-platform` im Team `kiumu`, verbunden mit diesem Repository. `main` wird automatisch gebaut (`pnpm build`) und unter https://learn.kiumu.app veröffentlicht. `vercel.json` enthält das SPA-Routing, Cache- und Sicherheits-Header. Die gepinnte pnpm-Version wird über Corepack genutzt (`ENABLE_EXPERIMENTAL_COREPACK=1`).

```sh
PLAYWRIGHT_BASE_URL=https://learn.kiumu.app pnpm test:e2e e2e/learning-paths.spec.ts e2e/kotlin-bear.spec.ts --workers=3
```

## Herkunft

Der Kotlin-Bereich enthält das frühere Repository `kotlin-lernen` samt Git-Historie (per `git subtree` unter `content/kotlin/bear` übernommen). Das alte Repository und kotlin.kiumu.app bleiben unverändert bestehen.

Schriften: DM Sans und JetBrains Mono (SIL Open Font License, Lizenzen in `public/fonts/`).
