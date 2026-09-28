> **Hinweis (September 2026):** Dieser Kurs ist jetzt der Track „Praxis: Kotlin mit Bear“ auf learn.kiumu.app. Die Web-App aus `kotlin-lernen` wurde durch die Plattform ersetzt (Oberfläche, Speicherung, Tests: siehe `README.md` und `HANDBUCH.md` im Wurzelverzeichnis). In diesem Ordner liegen nur noch Generator (`build_course.py`), Aufgaben (`lessons.py`), der gepinnte Bear-Snapshot (`bear-source.json`) und der erzeugte Kurs (`bear-course.json`). Befehle: `pnpm bear:build`, `pnpm bear:check`. Der Text unten beschreibt die ursprüngliche eigenständige App und bleibt zur Nachvollziehbarkeit erhalten.

# Kotlin mit Bear

Live: [kotlin.kiumu.app](https://kotlin.kiumu.app) · Privates Repository: [hernstev97/kotlin-lernen](https://github.com/hernstev97/kotlin-lernen)

100 Aufgaben in zehn Kapiteln, mit 235 einzeln geprüften Lücken. Alle Codeausschnitte stammen aus 21 echten Bear-Dateien des Commits `8330866964842d1f586c71bc1881787c1d90489e`. Der Kurs beginnt mit einzelnen Variablen und führt bis zu langen Funktionen mit sieben Lücken, Fehlerbehandlung, Synchronisierung, Rundenplanung und dynamischer Programmierung.

Die App läuft eigenständig mit Vite und TypeScript, ohne Backend, Konto oder externe Schriftserver. Bears Android-App wird durch die Lernaufgaben nicht verändert oder angesprochen. Es werden keine API-Anfragen an Linear gesendet.

## Start

Node.js 22.12+ oder 24+, pnpm 11; für die Kurserzeugung zusätzlich Python 3. Ein Bear-Checkout ist nicht erforderlich.

```sh
cd kotlin-lernen
pnpm install
pnpm dev
```

Öffnen: http://127.0.0.1:5173. Der feste Port hält den LocalStorage-Ursprung stabil. Bei belegtem Port startet Vite nicht auf einem anderen Port.

```sh
pnpm build        # TypeScript und statischer Build in dist/
pnpm preview      # Produktionsbuild auf Port 4173
pnpm test         # Quellenzuordnung, Lückenprüfung und Speicherung
pnpm test:e2e     # kompletter Kurs, Navigation, Wiki, Mobile, Speicherfehler
pnpm course:check # Kursdaten gegen Aufgabenbeschreibung und gepinnten Bear-Snapshot prüfen
```

Wenn der Testbrowser fehlt: `pnpm exec playwright install chromium`.

`dist/` kann im Wurzelverzeichnis eines statischen Hosters liegen. Andere Hosts, Protokolle oder Ports haben eigene Browser-Speicherstände.

## Lernen über mehrere Sitzungen

- Genau eine Aufgabe gleichzeitig, mit frei nutzbarem Überspringen und Zurückgehen.
- 100 kleine Fortschrittslinien: grün nach einer vollständig gelösten Aufgabe, sonst grau; ein Punkt zeigt die aktuelle Aufgabe.
- Klick auf eine Linie öffnet die Aufgabe. Pfeiltasten, Pos1 und Ende navigieren innerhalb der Fortschrittsanzeige. Die Kapitelauswahl springt zum Kapitelanfang.
- Jede Lücke hat ein eigenes Eingabefeld, ihren Prüfstatus und einen aufklappbaren Hinweis. Nummern im Code springen direkt zum betreffenden Feld.
- Lange Ausdrücke und Codeblöcke können mehrzeilig eingegeben werden.
- Erst wenn **alle** Lücken korrekt sind, zählt die Aufgabe als erledigt. Richtige Teillösungen bleiben als Entwurf erhalten.
- Das Mini-Wiki ist anfänglich geschlossen. Bei jedem Aufgabenwechsel wird es wieder geschlossen – auch nach Erfolg, beim Überspringen, beim Zurückgehen und beim Wechsel über die Linien oder Kapitelauswahl. Während der Eingabe bleibt ein manuell geöffnetes Wiki offen.
- Pro Aufgabe: Bear-bezogene Erklärung und Hinweise im Mini-Wiki sowie direkt sichtbare Links zur offiziellen Kotlin-/Android-Dokumentation unter der Aufgabenbeschreibung. Grundlagen verweisen gezielt auf den passenden Artikelabschnitt; die Links öffnen einen neuen Tab und bleiben auch bei geschlossenem Mini-Wiki erreichbar.
- Der Dateiverweis öffnet den vollständigen lokalen Originalcode im Dialog und markiert die verwendeten Zeilen. **Die Originaldatei enthält auch die Lösungen.** Escape oder Schließen kehrt zur Aufgabe zurück.

## Kursaufbau

| Aufgaben | Schwerpunkt |
| --- | --- |
| 1–10 | Kleine Bear-Zeilen: Werte, Strings, Typen und Konstanten |
| 11–20 | Begrüßung, Bedingungen, Funktionen, Bereiche und Extensions |
| 21–30 | Datenklassen, Enums, nullable Werte, Safe Calls und copy |
| 31–40 | Rundenkandidaten, Listenoperationen und Bear-Block-Parsing |
| 41–50 | Activity, Compose, Zustand, Callbacks und Layout |
| 51–60 | Effekte, ViewModel, StateFlow, combine und Entwurfsschutz |
| 61–70 | Room-Schema, DAO, Migration, DataStore und AppContainer |
| 71–80 | Lokale Outbox, HTTP, WorkManager, Wiederholung und Versionsprüfung |
| 81–90 | Fachliche Algorithmen und echte Bear-Tests, bis Levenshtein |
| 91–100 | Umfangreiche Rekonstruktionen: Textaufteilung, Bear-Blöcke, Alarm-/Worker-Pfade, Widget-Speicherung und Textvergleich |

Spätere Aufgaben verlangen vollständige Ausdrücke und zusammenhängende Operationen. Es gibt keine Sitzungslimits, Streaks oder Pflicht, ein Kapitel auf einmal zu schaffen.

## Echtes Kotlin und Grenzen der Prüfung

`course/lessons.py` beschreibt den didaktischen Inhalt sowie exakte Quellbereiche und Lücken. `course/bear-source.json` enthält die 21 Originaldateien, ihren Bear-Commit und SHA-256-Prüfsummen. Der Snapshot wurde bei der Auslagerung gegen den ursprünglichen Bear-Commit geprüft. `scripts/build_course.py` prüft die Snapshot-Prüfsummen und erzeugt daraus `src/bear-course.json`, ohne auf das Bear-Repository zuzugreifen. Die Originaldateien werden für den Quellen-Dialog mitgeliefert und sind damit auch in der ausgelieferten Webapp lesbar. Die Tests setzen jede Aufgabe wieder zusammen und vergleichen sie mit dem ausgewiesenen Originalausschnitt.

Die Ausschnitte werden ausschließlich gemeinsam eingerückt und an den beschriebenen Stellen maskiert. Imports und umgebende Klassen/Funktionen bleiben im Originaldatei-Dialog verfügbar. Ein Konstruktorparameter allein ist beispielsweise ein echter Kotlin-Ausschnitt, aber kein eigenständig startbares Programm.

Die Eingabeprüfung rekonstruiert die **vorgegebene Bear-Implementierung**. Sie vergleicht Kotlin-Tokens mit den akzeptierten Antworten; Leerraum zwischen Tokens darf variieren, Strings und zusammengesetzte Operatoren bleiben erhalten. Sie führt **keinen Kotlin-Compiler** aus. Beliebige semantisch gleichwertige Umformulierungen werden nicht automatisch erkannt. Die UI benennt diese Grenze. Android-Projekte oder Nutzer-Code werden nicht ausgeführt.

Vorhandener Projektcode ist kein automatischer Best-Practice-Beweis. Die Lerntexte benennen unter anderem Grenzen bei nebenläufigen Edits, der nicht atomaren Rundenauslösung, der UI-Speicherbestätigung und zeitabhängigen Heuristiken.

## Lokaler Lernstand

Neuer Schlüssel: `kotlin-lernen:bear:progress:v2`.

Gespeichert werden die aktive Aufgaben-ID, der Text jeder einzelnen Lücke und erfolgreiche Gesamtantworten mit Zeitpunkt und Aufgaben-Fingerprint. Speichern erfolgt nach jeder Eingabe und Navigation. Spätere Fehlversuche löschen einen bereits erreichten Erfolg nicht; der aktuelle Eingabestatus bleibt dennoch sichtbar.

Der alte Schlüssel `kotlin-lernen:progress:v1` bleibt unverändert erhalten. Der 100-Aufgaben-Bear-Kurs startet einen eigenen Stand, weil die früheren 48 Aufgaben andere Inhalte hatten. Ein Hinweis erklärt dies beim ersten Wechsel. Alte Erfolge werden nicht als Bear-Erfolge ausgegeben.

Gesperrter, voller oder beschädigter Speicher wird sichtbar gemeldet. Die App bleibt im aktuellen Tab nutzbar. Das Löschen der Website-Daten entfernt die Fortschritte; es gibt keine Konto-Synchronisation. Quellen, Aufgaben und Schriften werden mit der App ausgeliefert. Nur explizit geöffnete Dokumentationslinks führen zu externen Websites.

## Pflege

```sh
pnpm course:build # Kurs aus dem versionierten Bear-Snapshot neu erzeugen
pnpm course:check
pnpm test
pnpm test:e2e
pnpm build
```

Optional lässt sich die Herkunft erneut gegen ein lokales Bear-Repository prüfen (benötigt Git und den Snapshot-Commit im Checkout):

```sh
python3 scripts/build_course.py --check --verify-bear /pfad/zu/bear
```

Der Generator bricht ab, wenn eine Prüfsumme, ein Anker oder eine Lücke nicht passt. Bei einem Bear-Update müssen Snapshot, Commit, Prüfsummen und betroffene Aufgaben bewusst überarbeitet werden. Stabile IDs beibehalten; ein geänderter Aufgaben-Fingerprint verhindert die Übernahme veralteter erfolgreicher Antworten. Entwürfe bleiben erhalten.

- `course/lessons.py`: 100 didaktische Aufgaben, Quellenanker und Lückendefinitionen.
- `scripts/build_course.py`: prüfbare Extraktion und Quellensnapshot.
- `course/bear-source.json`: gepinnte Originaldateien mit Commit und Prüfsummen.
- `src/bear-course.json`: generierter Kurs und Originaldateien.
- `src/validation.ts`, `src/storage.ts`: Lückenprüfung und versionierter Speicher.
- `src/main.ts`, `src/format.ts`, `src/style.css`: Oberfläche, Quellcodeanzeige und Interaktionen.

Die Kursstruktur ist derzeit bewusst auf zehn Kapitel mit je zehn Aufgaben ausgelegt. Schriftlizenzen liegen unter `public/fonts/`.

## Deployment

Eigenes Vercel-Projekt `kotlin-lernen` im Team `kiumu`, verbunden mit diesem privaten GitHub-Repository. Der Produktionszweig ist `main`; Vercel baut die statische App mit `pnpm build` und veröffentlicht `dist/` auf `https://kotlin.kiumu.app`.

Die mit `packageManager` gepinnte pnpm-Version wird über Vercels Corepack-Unterstützung verwendet (`ENABLE_EXPERIMENTAL_COREPACK=1` in den Build-Umgebungen). Es werden keine Laufzeit-Umgebungsvariablen oder API-Schlüssel benötigt.

Die Browserprüfungen können auch direkt gegen das Deployment laufen:

```sh
PLAYWRIGHT_BASE_URL=https://kotlin.kiumu.app pnpm test:e2e
```

Ein lokaler Lernstand von `127.0.0.1` wird durch den Domainwechsel nicht automatisch übernommen; LocalStorage ist an den jeweiligen Ursprung gebunden.
