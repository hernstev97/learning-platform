# learn.kiumu.app

Private Lernplattform für Kotlin & Android, Rust, Linux, Python, Automation mit Python und Git. Live: [learn.kiumu.app](https://learn.kiumu.app) · Privates Repository: [hernstev97/learning-platform](https://github.com/hernstev97/learning-platform)

Die Plattform ist kein Nachschlagewerk. Jedes Modul besteht aus einer Lektion, die ein Denkmodell aufbaut und auf die offizielle Dokumentation verweist, und aus 10–14 Übungen in fester Reihenfolge: verstehen → vorhersagen → schreiben → Fehler finden → erklären → anwenden. Jeder Bereich hat Interview-Karteikarten mit Wiederholung, Projekte und ein Abschlussprojekt, das wie eine Take-Home-Aufgabe im Bewerbungsprozess geschnitten ist.

**Neue Lernbereiche anlegen: siehe [HANDBUCH.md](HANDBUCH.md).** Anmeldung, Convex, Migration und Deployment: **[docs/CONVEX.md](docs/CONVEX.md)**. Prüfbericht und offene Grenzen: [Convex-Audit](docs/CONVEX-AUDIT.md).

## Start

Node.js 24, pnpm 11. Für `pnpm verify` zusätzlich `python3` (3.14) und `rustc` (Edition 2024), für den Bear-Generator Python 3.

```sh
pnpm install
cp .env.example .env.local # Clerk konfigurieren: docs/CONVEX.md
pnpm convex:dev     # eigenes Convex-Projekt verbinden, in diesem Terminal weiterlaufen lassen
pnpm dev            # http://127.0.0.1:5180
```

| Befehl | Zweck |
| --- | --- |
| `pnpm content:check [bereich]` | Inhalte validieren (Pflichtfelder, IDs, Lücken, Richtwerte) |
| `pnpm verify [bereich]` | Python-Übungen und -Beispiele ausführen, Rust kompilieren, Ausgaben vergleichen, Git-Labore durchspielen |
| `pnpm links [bereich]` | Alle externen Links und Anker prüfen |
| `pnpm test` | Unit-Tests (Prüflogik, Speicher, Bear-Rekonstruktion, Inhalte) |
| `pnpm lint`, `pnpm typecheck` | ESLint und strikte TypeScript-Prüfung einschließlich Backend |
| `pnpm test:convex:e2e` | Echte lokale Convex-Verbindung und mehrere Browsersitzungen; Setup in docs/CONVEX.md |
| `pnpm test:e2e` | Browser-Tests aller Lernbereiche, neun Übungsarten, Python-Laufzeit, Lernstand und Bear-Track |
| `pnpm test:pwa:e2e` | Produktionsbuild mit Service Worker: Installierbarkeit und Offline-Lesen |
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
convex/                    Schema, zentrale Einzelnutzer-Autorisierung, Fortschritt und Migration
src/main.ts                Clerk-Anmeldung, geschlossenes Zugriffstor und Offline-Start
src/service-worker.ts      Offline-Cache für App-Shell und Lerninhalte (Build erzeugt /sw.js)
src/app.ts                 Reaktiver Convex-Lernstand und optimistische Mutationen
src/shell.ts               Bestehende Lernoberfläche und Navigation nach autorisiertem Laden
src/exercises/             Die neun Übungsarten
src/pages/                 Startseite, Bereich, Lektion, Übung, Karten, Projekte, Nachschlageseiten, Daten
src/python/                Pyodide-Worker und Harness (dieselbe Harness nutzt pnpm verify)
vendor/pyodide/            Zusätzliche Pyodide-Pakete (tzdata, beautifulsoup4, PyYAML)
```

Die Oberfläche bleibt ein statisches Vite-Projekt ohne Frontendframework. Inhalte, Schriften und Python-Laufzeit werden vom eigenen Ursprung geladen. Clerk stellt die Anmeldung bereit; Convex speichert und synchronisiert den persönlichen Lernstand. Genau ein serverseitig konfiguriertes Clerk-Konto erhält Zugriff auf die privaten Backendfunktionen. Das Curriculum bleibt statisch im Repository.

## Lernstand

Convex speichert gelöste Übungen mit Fingerprint, versionierte Entwürfe, gelesene Lektionen, Kartenboxen, Projektschritte und die letzte Lernposition. Fortschrittsanzeigen werden daraus berechnet. Ändert sich der geprüfte Teil einer Übung, zählt ein früherer Erfolg nicht mehr. Bestehende `learn:<bereich>:v1`-Einträge werden nach Anmeldung erkannt und unter `/daten` bewusst importiert; Originale bleiben erhalten. Dort gibt es weiterhin JSON-Sicherung, Wiederherstellung, Bereichsreset und Bear-Import. Details und Konfliktregeln: [Convex-Dokumentation](docs/CONVEX.md).

Die Plattform ist als App installierbar (PWA) und offline lesbar. Details und Grenzen: [Offline und installierbare App](docs/CONVEX.md#offline-und-installierbare-app).

Das Design (hell oder dunkel) folgt der Systemeinstellung, bis es über den Schalter in der Kopfzeile gewählt wird. Diese Wahl gilt pro Gerät (`localStorage`, Schlüssel `learn:theme`) und wird nicht synchronisiert.

## Prüfung der Antworten – und ihre Grenzen

- **Lückencode, Terminal, Fehlerkorrektur:** tokenweiser Vergleich mit den akzeptierten Antworten, je nach Sprache (Python: `'a'` = `"a"`; Shell: `-la` = `-al` = `-l -a`, harmlose Anführungszeichen egal). Es wird kein Compiler ausgeführt; gleichwertige Umformulierungen müssen als Alternative hinterlegt sein.
- **Python-Code:** läuft wirklich – in Pyodide (Python 3.14) in einem Web Worker mit Zeitlimit, gegen die Tests der Übung. Kein Netzwerk, keine Threads, kein `subprocess`.
- **Ausgabe vorhersagen:** zeilenweiser Vergleich; die erwarteten Ausgaben stammen aus echten Läufen (`pnpm verify`).
- **Praxis- und Erklär-Übungen:** Selbstkontrolle über Checklisten; Rust-Entwürfe lassen sich im offiziellen Playground ausführen.

## Deployment

Vercel-Projekt `learning-platform` im Team `kiumu`, verbunden mit diesem Repository. `main` wird über `pnpm build:production` gebaut und unter https://learn.kiumu.app veröffentlicht. **Vor dem ersten Deployment die Convex-/Clerk-Produktionsvariablen einrichten**, siehe [Setup](docs/CONVEX.md#produktion-und-vercel). Dieser Build verbindet Backenddeployment und passende Frontend-URL. `vercel.json` enthält weiterhin SPA-Routing, Cache- und Sicherheits-Header. Die gepinnte pnpm-Version wird über Corepack genutzt (`ENABLE_EXPERIMENTAL_COREPACK=1`).

```sh
# Die vorhandene Regression läuft lokal mit einem nur für Tests geladenen Adapter.
pnpm test:e2e
```

Die bisherige unangemeldete Produktions-Smoke-Prüfung ist durch die Anmeldung nicht mehr passend. Eine echte Cloud-Abnahme erfolgt nach dem Setup mit dem erlaubten Konto und einer zweiten Sitzung; Backend-Sicherheit und lokale Cross-Device-Synchronisierung werden separat automatisiert geprüft.

## Herkunft

Der Kotlin-Bereich enthält das frühere Repository `kotlin-lernen` samt Git-Historie (per `git subtree` unter `content/kotlin/bear` übernommen). Das alte Repository und kotlin.kiumu.app bleiben unverändert bestehen.

Schriften: DM Sans und JetBrains Mono (SIL Open Font License, Lizenzen in `public/fonts/`).
