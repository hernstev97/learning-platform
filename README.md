# learn.kiumu.app

Private Lernplattform für Kotlin & Android, Rust, Linux, Python, Automation mit Python, Git, Data Analysis mit Excel, SQL und Python sowie Testing & Softwarequalität. Live: [learn.kiumu.app](https://learn.kiumu.app) · Privates Repository: [hernstev97/learning-platform](https://github.com/hernstev97/learning-platform)

Die Plattform ist kein Nachschlagewerk. Jedes Modul besteht aus einer Lektion, die ein Denkmodell aufbaut und auf die offizielle Dokumentation verweist, und aus 10–14 Übungen in fester Reihenfolge: verstehen → vorhersagen → schreiben → Fehler finden → erklären → anwenden. Jeder Bereich hat Interview-Karteikarten mit Wiederholung, Projekte und ein Abschlussprojekt, das wie eine Take-Home-Aufgabe im Bewerbungsprozess geschnitten ist.

**Neue Lernbereiche anlegen: siehe [HANDBUCH.md](HANDBUCH.md).** Anmeldung, Convex, Migration und Deployment: **[docs/CONVEX.md](docs/CONVEX.md)**. Prüfbericht und offene Grenzen: [Convex-Audit](docs/CONVEX-AUDIT.md).

## Start

Node.js 24, pnpm 11. Für `pnpm verify` zusätzlich `python3` (3.14), `rustc` (Edition 2024) und `uv` (legt für pandas- und pytest-Übungen eine Umgebung mit den pandas-, numpy-, pytest- und Hypothesis-Versionen des Browsers an), für den Bear-Generator Python 3.

```sh
pnpm install
cp .env.example .env.local # Clerk konfigurieren: docs/CONVEX.md
pnpm convex:dev     # eigenes Convex-Projekt verbinden, in diesem Terminal weiterlaufen lassen
pnpm dev            # http://127.0.0.1:5180
```

| Befehl | Zweck |
| --- | --- |
| `pnpm content:check [bereich[/modul]]` | Inhalte validieren (Pflichtfelder, IDs, Lücken, Richtwerte) |
| `pnpm verify [bereich[/modul]]` | Python-Übungen und -Beispiele ausführen (auch pandas, pytest und Hypothesis), SQL mit der SQLite des Browsers prüfen, Rust kompilieren, TypeScript-Ausgaben mit Node prüfen, Ausgaben vergleichen, Git-Labore durchspielen |
| `pnpm links [bereich]` | Alle externen Links und Anker prüfen |
| `pnpm test` | Unit-Tests (Prüflogik, Speicher, Bear-Rekonstruktion, Inhalte) |
| `pnpm lint`, `pnpm typecheck` | ESLint und strikte TypeScript-Prüfung einschließlich Backend |
| `pnpm test:convex:e2e` | Echte lokale Convex-Verbindung und mehrere Browsersitzungen; Setup in docs/CONVEX.md |
| `pnpm test:e2e` | Browser-Tests aller Lernbereiche, elf Übungsarten, Python-, pytest- und SQL-Laufzeit, Linux-VM in Übung und Lektion, Lernstand und Bear-Track |
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
tooling/search-index.ts    Suchindex zur Build-Zeit (Klartext je Modul, Abschnitt, Begriff, Projekt und Karte)
tooling/vite-plugins.ts    Inhalte als virtuelle Module (ein Chunk pro Bereich), Pyodide und Linux-VM selbst gehostet
tooling/vm/                Debian-Image samt GRUB-Bootplatte bauen (pnpm vm:build), Szenarien und vm-Blöcke darin prüfen (pnpm vm:verify), Skripte ausprobieren (pnpm vm:run)
tooling/verify-code.ts     Führt Musterlösungen und Beispiele aus
tooling/fixtures/          Beispielbereich mit jeder Übungsart (Tests, Vorlage)
src/engine/                Prüflogik (tokenbasiert je Sprache), Highlighter, Lernstand, Suche (Treffer und Ranking), Wiederholungsregeln und Schwachstellenanalyse
convex/                    Schema, zentrale Einzelnutzer-Autorisierung, Fortschritt und Migration
src/main.ts                Clerk-Anmeldung, geschlossenes Zugriffstor und Offline-Start
src/service-worker.ts      Offline-Cache für App-Shell und Lerninhalte (Build erzeugt /sw.js)
src/app.ts                 Reaktiver Convex-Lernstand und optimistische Mutationen
src/shell.ts               Bestehende Lernoberfläche und Navigation nach autorisiertem Laden
src/exercises/             Die elf Übungsarten
src/ui/search.ts           Suchdialog mit Tastaturbedienung
src/pages/                 Startseite, Bereich, Lektion, Übung, Karten, Wiederholen, Projekte, Nachschlageseiten, Daten
src/python/                Pyodide-Worker und Harness für Python, pytest und SQLite (dieselbe Harness nutzt pnpm verify), Liste der Test-Pakete
src/vm/                    Linux-VM im Browser (v86): Laden, Snapshot, Steuerkanal, Prüfungen, Terminal in Übungen und Lektionen
vendor/pyodide/            Zusätzliche Pyodide-Pakete (tzdata, beautifulsoup4, PyYAML, pandas mit numpy, pytest, Hypothesis)
vendor/vm/                 Gebautes Debian-Image samt Snapshot für die Linux-VM
```

Die Oberfläche bleibt ein statisches Vite-Projekt ohne Frontendframework. Inhalte, Schriften, Python-Laufzeit und Linux-VM werden vom eigenen Ursprung geladen. Clerk stellt die Anmeldung bereit; Convex speichert und synchronisiert den persönlichen Lernstand. Genau ein serverseitig konfiguriertes Clerk-Konto erhält Zugriff auf die privaten Backendfunktionen. Das Curriculum bleibt statisch im Repository.

## Lernstand

Convex speichert gelöste Übungen mit Fingerprint, versionierte Entwürfe, gelesene Lektionen, persönliche Notizen pro Lektion, Kartenboxen samt Review-Historie, Fehlversuche, Hinweise und angesehene Lösungen pro Übung, Projektschritte und die letzte Lernposition. Fortschrittsanzeigen werden daraus berechnet. Ändert sich der geprüfte Teil einer Übung, zählt ein früherer Erfolg nicht mehr. Bestehende `learn:<bereich>:v1`-Einträge werden nach Anmeldung erkannt und unter `/daten` bewusst importiert; Originale bleiben erhalten. Dort gibt es weiterhin JSON-Sicherung, Wiederherstellung, Bereichsreset und Bear-Import. Details und Konfliktregeln: [Convex-Dokumentation](docs/CONVEX.md).

**Wiederholen** (Pfeile in der Kopfzeile, `/wiederholen`, dazu ein Reiter je Bereich) leitet aus diesem Lernstand ab, welche Themen heute wiederholt werden sollten. Ein Thema ist ein Modul samt der Interviewkarten, die ihm zugeordnet sind. Gründe sind Übungen mit Fehlversuchen, Hinweisen oder angesehener Lösung, angefangene, aber ungelöste Übungen, vergessene oder als „Schwer“ bewertete Karten und gelernte Module, die lange nicht geübt wurden. Jedes Thema nennt seine Gründe. Die Startseite zeigt die dringendsten Themen für etwa 25 Minuten. Eine Wiederholungsrunde stellt schwache Übungen neu, ohne den gespeicherten Entwurf, und fragt fällige Karten ab. Danach zeigt sie, wann was wiederkommt. Alles ist regelbasiert und ohne KI: `src/engine/drill.ts` (Stufen 1, 4, 10 Tage; Auffrischung nach 10, 30, 75, 180 Tagen) und `src/engine/weakness.ts` (Bündelung, Gewichtung, Tagesplan). Die Seite erklärt die Regeln unter „So entscheidet die Plattform“.

Die globale Suche (Lupe in der Kopfzeile, Taste `/` oder `Strg`/`⌘`+`K`) findet Module, Lektionsabschnitte, Glossarbegriffe, Spickzettel-Abschnitte, Projekte und Interview-Karten aller Bereiche und springt direkt an die Stelle. Der Index entsteht beim Build aus den Inhalten, wird erst beim ersten Öffnen geladen und funktioniert offline. Einen externen Suchdienst gibt es nicht.

Die Plattform ist als App installierbar (PWA) und offline lesbar. Details und Grenzen: [Offline und installierbare App](docs/CONVEX.md#offline-und-installierbare-app).

Das Design (hell oder dunkel) folgt der Systemeinstellung, bis es über den Schalter in der Kopfzeile gewählt wird. Diese Wahl gilt pro Gerät (`localStorage`, Schlüssel `learn:theme`) und wird nicht synchronisiert.

## Prüfung der Antworten – und ihre Grenzen

- **Lückencode, Terminal, Fehlerkorrektur:** tokenweiser Vergleich mit den akzeptierten Antworten, je nach Sprache (Python: `'a'` = `"a"`; Shell: `-la` = `-al` = `-l -a`, harmlose Anführungszeichen egal). Es wird kein Compiler ausgeführt; gleichwertige Umformulierungen müssen als Alternative hinterlegt sein.
- **Python-Code:** läuft wirklich – in Pyodide (Python 3.14, pandas 3.0) in einem Web Worker mit Zeitlimit, gegen die Tests der Übung. Kein Netzwerk, keine Threads, kein `subprocess`.
- **Selbst geschriebene Tests:** laufen mit echtem pytest 9.0 (und Hypothesis 6.168) im Browser, gegen die richtige Implementierung und gegen fehlerhafte Varianten. Gelöst ist die Übung, wenn die Tests die richtige Fassung bestehen und jede fehlerhafte rot werden lassen. Lektionsblöcke mit `python pytest` zeigen den echten Bericht von pytest.
- **Linux-Szenarien:** ein echtes Debian 12 mit systemd läuft in v86 (x86-Emulator in WebAssembly), ohne Netzwerk. Es bootet über GRUB von einer emulierten Platte, `sudo reboot` startet also wirklich neu. Geprüft wird der Zustand der VM mit Shell-Befehlen, nicht der Weg dorthin. Dieselbe VM steht in Linux-Lektionen als Terminal bereit: Beispiele mit „Im Terminal“ laufen dort, `pnpm vm:verify` führt sie vorher aus.
- **SQL-Abfragen:** laufen wirklich – SQLite 3.39 in Pyodide, gegen eine frische Datenbank je Lauf. Verglichen wird das Ergebnis mit dem der Musterlösung (Spalten, Werte, bei Bedarf Reihenfolge), nicht der Text der Abfrage.
- **Excel-Formeln und Power Query:** tokenweiser Vergleich wie bei Lückencode; deutsche und englische Funktionsnamen und `;`/`,` gelten als gleich. Excel selbst läuft nicht.
- **Ausgabe vorhersagen:** zeilenweiser Vergleich; die erwarteten Ausgaben stammen aus echten Läufen (`pnpm verify`).
- **Praxis- und Erklär-Übungen:** Selbstkontrolle über Checklisten; Rust-Entwürfe lassen sich im offiziellen Playground ausführen.

## Deployment

Vercel-Projekt `learning-platform` im Team `kiumu`, verbunden mit diesem Repository. `main` wird über `pnpm build:production` gebaut und unter https://learn.kiumu.app veröffentlicht. Andere Branches erzeugen keine Preview-Deployments (`git.deploymentEnabled` in `vercel.json`), weil Previews keinen Convex-Deploy-Key haben. **Vor dem ersten Deployment die Convex-/Clerk-Produktionsvariablen einrichten**, siehe [Setup](docs/CONVEX.md#produktion-und-vercel). Dieser Build verbindet Backenddeployment und passende Frontend-URL. `vercel.json` enthält weiterhin SPA-Routing, Cache- und Sicherheits-Header. Die gepinnte pnpm-Version wird über Corepack genutzt (`ENABLE_EXPERIMENTAL_COREPACK=1`).

```sh
# Die vorhandene Regression läuft lokal mit einem nur für Tests geladenen Adapter.
pnpm test:e2e
```

Die bisherige unangemeldete Produktions-Smoke-Prüfung ist durch die Anmeldung nicht mehr passend. Eine echte Cloud-Abnahme erfolgt nach dem Setup mit dem erlaubten Konto und einer zweiten Sitzung; Backend-Sicherheit und lokale Cross-Device-Synchronisierung werden separat automatisiert geprüft.

## Herkunft

Der Kotlin-Bereich enthält das frühere Repository `kotlin-lernen` samt Git-Historie (per `git subtree` unter `content/kotlin/bear` übernommen). Das alte Repository und kotlin.kiumu.app bleiben unverändert bestehen.

Schriften: DM Sans und JetBrains Mono (SIL Open Font License, Lizenzen in `public/fonts/`).
