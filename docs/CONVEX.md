# Persönlicher Lernstand mit Convex

Die App bleibt Vite + TypeScript + DOM ohne Frameworkwechsel. YAML, Markdown, Bear-Generator, Aufgabenprüfung, Navigation und Gestaltung bleiben im Repository. Clerk übernimmt die Anmeldung, Convex ausschließlich den veränderlichen persönlichen Lernstand. Es gibt keine Kontenverwaltung, Teams oder SaaS-Funktionen in der App.

## Einrichtung

1. In Clerk eine Anwendung erstellen, das eigene Konto anlegen und die unveränderliche **User ID** (`user_…`) aus dem Dashboard notieren. Unter **User & authentication → Access mode** die Registrierung auf **Invite-only** stellen und nur das eigene Konto anlegen. Die serverseitige ID-Prüfung bleibt unabhängig davon zwingend aktiv.
2. Clerk/Convex-Integration aktivieren. Für den hier verwendeten JavaScript-Client einen JWT-Template namens **`convex`** mit Audience **`convex`** verwenden. Standard-Claims `iss` und `sub` unverändert lassen. Den exakten Clerk Frontend API URL ohne abschließenden Slash als Issuer notieren. Development und Production haben unterschiedliche Clerk-Instanzen und meist unterschiedliche User IDs.
3. `.env.example` nach `.env.local` kopieren und `VITE_CLERK_PUBLISHABLE_KEY` setzen. `pnpm install`, dann `pnpm convex:dev` starten und das eigene Convex-Projekt auswählen. Die CLI schreibt `CONVEX_DEPLOYMENT` und `VITE_CONVEX_URL`. Sollte die CLI wegen des fehlenden Issuers warten, die nächsten Befehle in einem zweiten Terminal ausführen.
4. Die **Convex-Deployment-Variablen** setzen:

   ```sh
   pnpm exec convex env set CLERK_JWT_ISSUER_DOMAIN https://deine-instanz.clerk.accounts.dev
   pnpm exec convex env set ALLOWED_CLERK_USER_ID user_DEINE_ID
   ```

5. `pnpm convex:dev` weiterlaufen lassen; in einem zweiten Terminal `pnpm dev` starten. In Clerk den lokalen Ursprung `http://127.0.0.1:5180` und später die Produktionsdomain korrekt konfigurieren. Die App führt zur von Clerk gehosteten Anmeldung und anschließend zur ursprünglich geöffneten Lernseite zurück.

Es werden **kein Clerk Secret Key und kein Convex Admin Key im Frontend** benötigt. Der Clerk Publishable Key und die Convex-URL sind öffentlich. Das erlaubte Konto steht ausschließlich in Convex. Ohne gültige Serverkonfiguration oder Identität verweigert jede öffentliche Funktion den Zugriff. Ohne Frontendvariablen erscheint eine geschlossene Einrichtungsseite; es gibt keinen automatischen LocalStorage-Fallback.

Offizielle Anleitungen: [Convex mit Clerk](https://docs.convex.dev/auth/clerk), [Clerk JavaScript](https://clerk.com/docs/js-frontend/getting-started/quickstart), [Clerk Zugriff einschränken](https://clerk.com/docs/guides/secure/restricting-access).

## Das einzige erlaubte Konto ändern

`ALLOWED_CLERK_USER_ID` im passenden Convex-Deployment ersetzen, für Produktion mit `pnpm exec convex env set --prod ALLOWED_CLERK_USER_ID user_NEUE_ID`. Bei Wechsel der Clerk-Anwendung auch Issuer und Frontend-Publishable-Key ändern und Auth-Konfiguration/Frontend neu deployen. Keine E-Mail, LocalStorage-ID oder Benutzerkennung aus Funktionsargumenten gewährt Zugriff.

Es gibt absichtlich **einen persönlichen Datenbestand**, keine Daten pro registriertem Konto. Das neu erlaubte Konto erhält denselben Bestand, das alte verliert den Zugriff. Nur ersetzen, wenn beide Konten dir gehören. Bereits an ein früher autorisiertes Gerät ausgelieferte Informationen lassen sich nicht nachträglich zurückholen.

## Backend und Schema

| Tabelle | Inhalt | Index |
| --- | --- | --- |
| `progress` | Kleine, typisierte Einträge: Lektion gelesen/ungelesen, Übungserfolg mit Fingerprint, Lösung angesehen, Kartenbox/Fälligkeit/Reviewzahl/Zahl der „Vergessen“/letzte Bewertung, einzelner Projektschritt, letzte Position je Bereich; jeweils `updatedAt` | `by_area_key` |
| `cardReviews` | Eine Zeile pro Kartenbewertung: Bereich, Reset-Generation, Karte, Bewertung, lokaler Tag, Serverzeit, Box und Fälligkeit danach. Nicht Teil von `snapshot` | `by_area_generation_card` |
| `drafts` | Entwurf pro Bereich, Reset-Generation und Übungs-ID; JSON bis 60 KB, Inhaltsfingerprint und Änderungszeit | `by_area_generation_exercise` |
| `areaResets` | Monotone Reset-Generation je Bereich, schützt vor verspäteten alten Schreibvorgängen | `by_area` |
| `notes` | Persönliche Notiz pro Bereich und Lektion (Modul-ID), bis 20 000 Zeichen, mit Änderungszeit; bewusst ohne Reset-Generation | `by_area_module` |
| `imports` | Atomare Importbelege pro Bereich und Chunk, ohne Kopie der importierten Inhalte | `by_area_import` |

`convex/model.ts` definiert die Zustandsvarianten und Eingabegrenzen, `schema.ts` Tabellen/Indizes. Ein Modul hat bereits genau eine Lektion; seine stabile Modul-ID ist deshalb gleichzeitig die Lektions-ID. Ein Projektschritt verwendet `projekt-id/schritt-id`. Status und Prozente ergeben sich aus den aktuellen Schritten bzw. aktuellen Übungs-IDs/Fingerprints. Keine gespeicherten Summen, unnötigen Versuchszähler oder Kopien des Curriculums.

**Kartenwiederholung.** Die Regeln stehen allein in `src/engine/review.ts` (`schedule`), das Client (optimistisch) und `reviewCard` (maßgeblich) gemeinsam nutzen: Box 1–5 mit 1, 3, 7, 16 und 35 Tagen; „Vergessen“ → Box 1 und heute fällig, „Schwer“ → gleiche Box, „Okay“ → eine Box höher, „Leicht“ → zwei. Fällige Karten werden schwächste zuerst abgefragt (niedrige Box, häufig vergessen, lange überfällig). `cardReviews` hält jede Bewertung mit Tag fest, sodass sich ein anderer Algorithmus später aus der Historie neu berechnen lässt. Die Historie ist nicht in der JSON-Sicherung enthalten; ein Import übernimmt nur den Kartenstand.

`convex/auth.ts::requireOwner` prüft die von Convex validierte Identität auf **Issuer, Subject und deren tokenIdentifier**. Convex selbst prüft Signatur, Ablauf und Audience anhand von `auth.config.ts`. Alle zwölf öffentlichen Endpunkte beginnen mit diesem Guard; keiner nimmt eine Eigentümer-ID entgegen:

| Endpunkt | Zweck |
| --- | --- |
| `snapshot` | Reaktiver Gesamtstand ohne Antworttexte |
| `draft` | Reaktiver Entwurf der geöffneten Übung |
| `exportDrafts` | Begrenzte Seiten für eine JSON-Sicherung |
| `set` | Gezielt einzelne Fortschrittsfelder ändern; kein Überschreiben ganzer Bereiche |
| `saveDraft` | Einen versionierten Entwurf ersetzen |
| `reviewCard` | Eine Bewertung (`again`, `hard`, `good`, `easy`) atomar auf den letzten Serverstand anwenden und in `cardReviews` protokollieren. Das frühere `knew` wird für vor dem Update geöffnete Tabs noch angenommen |
| `importLegacy` | Begrenzt große, wiederholbar sichere Import-Chunks |
| `resetArea` | Einen Bereich absichtlich zurücksetzen |
| `note` | Reaktive Notiz der geöffneten Lektion |
| `noteIndex` | Welche Lektionen eine Notiz haben, ohne deren Text |
| `saveNote` | Eine Notiz ersetzen; leerer Text löscht sie |
| `exportNotes` | Begrenzte Seiten für eine JSON-Sicherung |

`purgeDrafts` und `purgeReviews` sind **nur intern** aufrufbar. Nach einem Reset sind alte Entwürfe sofort unsichtbar; `purgeDrafts` löscht sie anschließend in begrenzten Batches, `purgeReviews` ebenso die Review-Historie der alten Generation. So funktioniert Zurücksetzen auch, wenn alle Entwürfe zusammen ein Convex-Transaktionslimit überschreiten. Importbelege und Reset-Grenzen bleiben erhalten.

Die Backend-Validierung prüft Typen, IDs, Datumswerte, JSON-Struktur, Größen und Positionskonsistenz. Sie importiert kein Curriculum: entfernte IDs dürfen archiviert bleiben und werden von aktuellen Fortschrittsberechnungen ignoriert. Client und Backend können deshalb unabhängig aktualisiert werden. Wer das erlaubte Konto besitzt, darf seinen Lernstand selbst bewerten; der Server führt keine Aufgabenlösungen aus.

## Frontend, Reaktivität und Konflikte

`src/main.ts` stellt die Clerk-Sitzung her und wartet auf eine erfolgreiche autorisierte Convex-Abfrage, bevor `shell.ts` die Lernoberfläche startet. Abmeldung/Sitzungswechsel schließen den Client und entfernen die Ansicht samt privatem Arbeitsspeicher durch Neuladen. Einzige lokale Kopie privater Daten ist die schreibgeschützte Offline-Kopie des Lernstands (siehe [Offline](#offline-und-installierbare-app)); Entwürfe und Notizen werden nie lokal gespeichert.

`src/app.ts` übersetzt Convex-Abonnements in das bestehende `AreaProgress`-Modell. Mutationen nutzen die optimistischen Updates des Convex-JavaScript-Clients; kein eigener Offline-Sync-Dienst. Die geöffneten Editoren und Kartenrunden werden bei Serverupdates nicht neu aufgebaut. Ein fremd geänderter Entwurf wird mit einem kleinen „Laden“-Button angeboten; während des Tippens bleibt der aktuelle Text stehen.

Verschiedene Einträge werden unabhängig geschrieben. Beim selben Häkchen/Entwurf gewinnt die zuletzt vom Server verarbeitete explizite Änderung; es gibt keine gemeinsame Dokumentbearbeitung. Kartenbewertungen werden serverseitig nacheinander verrechnet.

**Notizen** stehen unter jeder Lektion („Meine Notizen“, auch im Inhaltsverzeichnis) und speichern 0,8 Sekunden nach der letzten Eingabe, beim Verlassen des Felds, der Lektion oder des Tabs. Die Lernpfad-Übersicht markiert Lektionen mit Notiz. Das Feld ist erst nach dem Laden der gespeicherten Notiz beschreibbar. Solange eigene Notizänderungen ausstehen, zeigt es keine Serverstände an; so ersetzt eine verspätete Bestätigung nie neueren Text. Ohne eigene Änderungen übernimmt es eine auf einem anderen Gerät geänderte Notiz direkt. Stehen noch eigene, nicht bestätigte Änderungen im Feld, wird die fremde Fassung mit „Auf einem anderen Gerät geändert · Laden“ angeboten. Beim Weitertippen gewinnt wie bei Entwürfen die zuletzt gespeicherte Fassung. Notizen sind im Offline-Lesemodus nicht verfügbar. Convex wiederholt ausstehende Mutationen nach einem Verbindungsabbruch mit seiner normalen Exactly-once-Semantik. Ein wiederholtes bewusstes Kartenreview zählt als neues Review; identische Zustandsschreibvorgänge erstellen keine Duplikate.

Der Footer unterscheidet synchronisiert, wartende Änderungen, Verbindungsaufbau, Offline und Fehler. Offene Mutationen lösen eine Warnung vor dem Schließen aus. Während einer Unterbrechung bleibt die geladene Seite benutzbar; Änderungen warten im Convex-Client. **Das Schließen vor bestätigter Synchronisierung verliert diese Änderungen**, deshalb nennt ein Hinweis unter der Kopfzeile ihre Zahl, solange die Verbindung fehlt. Fehlgeschlagene Änderungen werden zurückgerollt; Eingabetext im offenen Editor bleibt kopierbar. Bei einer dauerhaften Fehlermeldung Ursache beheben, Änderung wiederholen und anschließend neu laden.

## Offline und installierbare App

Die Plattform ist eine installierbare PWA (`public/manifest.webmanifest`, Logo `public/icons/learnkiumu-logo.svg` als Favicon und im Header, PNG-Symbole daraus mit `node tooling/icons.mjs`). Es gibt keine eigene Sync-Engine: Schreibvorgänge laufen weiterhin ausschließlich über die Warteschlange und optimistischen Updates des Convex-Clients.

**Service Worker.** `pnpm build` erzeugt `/sw.js` aus `src/service-worker.ts` (Plugin `serviceWorker` in `tooling/vite-plugins.ts`). Er speichert beim ersten Besuch App-Shell, alle Inhaltschunks, Schriften und Symbole (gzip etwa 1,5 MB) in einem versionierten Cache. Seitenaufrufe gehen zuerst ins Netz, sodass online immer das aktuelle Deployment läuft; ohne Antwort nach 4 Sekunden oder offline rendert die zwischengespeicherte Shell jede Route. Pyodide (etwa 12 MB) wird erst bei der ersten Python-Übung gespeichert. Python läuft offline also nur, wenn es auf diesem Gerät schon einmal geladen wurde. Ein neues Deployment installiert sich im Hintergrund; der vorherige Cache bleibt für bereits geöffnete Seiten erhalten. Clerk, Convex und der persönliche Lernstand laufen nicht über den Service Worker. Der Worker ist nur im Produktionsbuild aktiv, nicht im Dev-Server.

**Verbindung bricht während der Sitzung ab.** Nach drei Sekunden ohne Verbindung (Browser offline, WebSocket getrennt oder Anfragen länger als fünf Sekunden unbeantwortet) erscheint unter der Kopfzeile ein Hinweis mit der Zahl nicht synchronisierter Änderungen. Übungen öffnen sich auch ohne Verbindung (auf einer langsamen nach vier Sekunden). Clerk liefert offline keinen Token; `waitForToken` wartet dann auf die Verbindung, statt Convex eine fehlende Anmeldung zu melden. Sonst würden nach dem Wiederverbinden alle wartenden Änderungen abgewiesen und die Seite neu geladen.

**Konflikte nach dem Wiederverbinden.** Es gelten die Regeln oben: Einträge werden einzeln geschrieben, beim selben Eintrag gewinnt die zuletzt verarbeitete explizite Änderung. Kartenreviews rechnet der Server aus dem aktuellen Stand. Schreibvorgänge in einen inzwischen zurückgesetzten Bereich lehnt die Reset-Generation ab. Zusätzlich gilt für Entwürfe: Wurde eine Übung geöffnet, bevor ihr gespeicherter Entwurf geladen war, hält die App den getippten Text zurück. Fehlt auf dem Server ein Entwurf oder ist er gleich, wird der Text gespeichert. Liegt ein anderer Entwurf vor, bleibt er erhalten und wird mit „Geänderter Entwurf verfügbar · Laden“ angeboten; erst Weitertippen überschreibt ihn bewusst. Wer die Übung vorher verlässt, speichert den Text wie bisher (letzte Änderung gewinnt).

**Offline starten.** Nach jeder bestätigten Synchronisierung legt die App eine Kopie des Serverstands ohne Entwürfe, ohne Notizen und ohne optimistische Änderungen in LocalStorage ab (`learn-offline:snapshot:v1`). Startet der Browser ohne Netz, zeigt er damit Lerninhalte und den Lernstand zu diesem Zeitpunkt. Clerk und Convex werden dabei nicht kontaktiert. Ist das Netz nur schlecht oder Clerk nicht erreichbar, bietet das Anmeldetor „Offline weiterlesen“ an. Dieser Lesemodus schreibt nichts: Häkchen, Antworten und Karten gelten nur bis zum Neuladen, Daten-Export, Import und Reset sind gesperrt. Ein Hinweis sagt das; „Erneut verbinden“ lädt die Seite mit Anmeldung neu. Ohne Kopie zeigt ein offline gestarteter Browser nur „Keine Verbindung“ und lädt neu, sobald das Netz zurück ist.

Die Kopie ist keine Autorisierung und keine Datenquelle für Convex. Sie wird gelöscht bei Abmeldung, bei „Kein Zugriff“ und wenn Clerk online bestätigt, dass keine Sitzung besteht. Ist Clerk nicht erreichbar, meldet es ebenfalls keine Sitzung (ohne Client-ID); das löscht die Kopie nicht. Auf fremden Geräten deshalb abmelden. Der Offline-Start mit echter Clerk-Sitzung, eine Unterbrechung über mehr als eine Minute (Token-Ablauf) und die Installation auf Android und iOS lassen sich nur mit dem echten Konto prüfen. Die automatisierten Tests decken den Service Worker im Produktionsbuild (`pnpm test:pwa:e2e`) sowie Unterbrechungen und Entwurfskonflikte gegen lokales Convex ab.

## Stabile IDs und Inhaltsänderungen

- Modul-, Übungs-, Karten-, Projekt- und Schritt-IDs beibehalten; sichtbare Titel und Reihenfolgen dürfen sich ändern. Keine neuen IDs aus Überschriften oder Arraypositionen ableiten. IDs sind kebab-case, höchstens 120 Zeichen; `constructor` und `prototype` sind reserviert.
- Im Bear-Generator sind die bisher veröffentlichten Aufgaben-/Kapitel-IDs nun explizit an jeder Aufgabendeklaration bzw. Kapiteldefinition festgehalten. Der Loader verwendet `chapterId` statt der Arrayposition. Diese IDs beim Umordnen beibehalten; Quelltext, Aufgaben und bestehende Fingerprints wurden nicht verändert.
- Projekt-Abnahmen haben jetzt explizite `{ id, text }`-Einträge. Die bereits veröffentlichten Schlüssel `abnahme-1`, `abnahme-2` usw. wurden unverändert übernommen. **Nicht neu nummerieren**, wenn du Kriterien verschiebst oder einfügst. Neue Kriterien erhalten eine neue freie, vorzugsweise beschreibende ID.
- Übungserfolge zählen wie bisher nur bei passendem Fingerprint. Neue Entwürfe erhalten ebenfalls einen Fingerprint; nach einer inhaltlich relevanten Änderung wird ein alter Entwurf nicht ungeprüft in den neuen Renderer geladen. Er bleibt in der Sicherung erhalten. Die vorhandene Fingerprint-Regel für `practice` enthält auch den Aufgabentitel; dessen Änderung macht einen alten Erfolg weiterhin ungültig. Diese bestehende Regel wurde zur Kompatibilität mit lokalen Erfolgen beibehalten.
- „Weiterlernen“ speichert Modul-/Übungs-/Projekt-IDs mit Serverzeit; die Startseite nimmt den Bereich mit der jüngsten Position. Besuche der Interview-Karten setzen keine Position. Die numerische Übungs-URL wird erst beim Öffnen aus dem aktuellen Curriculum abgeleitet (`resolveResume` in `src/engine/persistence.ts`). Ist die gespeicherte Übung schon gelöst oder entfernt, führt der Link zur nächsten offenen Übung im Modul, danach zum nächsten Modul mit offenen Übungen; ist alles gelöst, zum Interview-Training. Ein entferntes Modul oder Projekt fällt auf das erste offene Modul des Bereichs zurück.
- Die Prozentanzeige folgt weiterhin den Übungen; „Lektion gelesen“ ist ein separates Häkchen. Projektstatus ergibt sich aus aktuellen Checklistenpunkten, Kartenbeherrschung aus der Leitner-Box.

## Lokale Migration und Sicherungen

Nach autorisierter Server-Hydration erkennt die App `learn:<bereich>:v1` sowie den alten Bear-v2-Schlüssel desselben Ursprungs. Ein Hinweis führt zu **Daten → Bisheriger Browser-Lernstand**. Der Import startet nur über den Button. Daten anderer Domains müssen weiterhin über JSON bzw. den vorhandenen Bear-Import übertragen werden.

Der Import ergänzt **ausschließlich fehlende Einträge**. Bestehende Serverdaten und ausdrücklich entfernte Häkchen haben Vorrang. Ein leerer Browser löscht nichts. Jeder Chunk (max. 32 kleine Einträge und vier Entwürfe) schreibt Daten und Importbeleg in derselben Transaktion. Wiederholen, mehrere Tabs und ein Abbruch zwischen Chunks erzeugen keine Duplikate und überschreiben nichts. Teilimporte können sicher fortgesetzt werden. Erst nach vollständigem Erfolg wird ein lokaler Hinweis-Marker gesetzt; er ist keine Autorisierung und keine Datenquelle. Die alten Schlüssel werden nie gelöscht oder weiter beschrieben.

Ungültige lokale Speicherobjekte werden gemeldet und unverändert behalten. Alte Entwürfe hatten keinen eigenen Fingerprint: wenn vorhanden, wird der gespeicherte Erfolg-Fingerprint verwendet, sonst der aktuelle Inhaltsfingerprint. Eine frühere URL konnte nur eine Positionsnummer enthalten; bei der einmaligen Konvertierung ist deren damalige Reihenfolge nicht rekonstruierbar. Ab dem Import werden stabile IDs verwendet.

**Sichern** lädt Serverfortschritt, paginierte Entwürfe und Notizen (`notes` je Bereich, nach Modul-ID) als kompatible JSON-Datei; zusätzliche `draftFingerprints` bewahren deren Inhaltsversion und `position` die stabilen Navigations-IDs. Die Datei ist privat zu behandeln. Während eines Exports auf anderen Geräten vorgenommene Änderungen können zwischen den Abfrageseiten liegen; die Sicherung ist kein atomarer Datenbanksnapshot. Für exakte Server-Snapshots die Convex-Exportfunktion benutzen.

**Zurücksetzen** erfordert wie bisher eine Bestätigung unter Daten. Es gilt geräteübergreifend, erhöht die Reset-Generation und verwirft wartende Schreibvorgänge älterer Generationen. Ein alter Browser darf einen zurückgesetzten Bereich nicht über den Legacy-Button wieder füllen. Eine bewusst ausgewählte JSON-Sicherung kann fehlende Einträge anschließend wiederherstellen. **Notizen bleiben beim Zurücksetzen erhalten**; einzeln löscht man sie, indem man den Text leert. Eine Sicherung ergänzt nur Notizen zu Lektionen, die noch keine haben. Einzelne bewusst aufgehobene Häkchen werden durch einen Import weiterhin nicht wieder gesetzt.

## Produktion und Vercel

1. In Convex ein Produktionsdeployment erstellen. In Clerk eine Produktionsinstanz mit produktiver Domain und deinem Produktionskonto konfigurieren.
2. `CLERK_JWT_ISSUER_DOMAIN` und `ALLOWED_CLERK_USER_ID` **im Produktionsdeployment** setzen (`convex env set --prod …` oder Dashboard).
3. In Convex unter **Settings → General → Create Deploy Key** ausschließlich `deployment:deploy` auswählen. Den Schlüssel in Vercel als **Secret**, ausschließlich unter **Production**, als `CONVEX_DEPLOY_KEY` hinterlegen. Dazu `VITE_CLERK_PUBLISHABLE_KEY` der Produktionsinstanz setzen. Kein Schlüssel gehört ins Repository. `.vercelignore` schließt lokale Umgebungsdateien, Testdaten und alte Build-Ausgaben auch beim direkten CLI-Upload aus.
4. Der Build-Befehl in `vercel.json` lautet `pnpm build:production`. Dieser führt `convex deploy --cmd "pnpm build" --cmd-url-env-var-name VITE_CONVEX_URL` aus: Backend/Schema werden geprüft und die zugehörige Frontend-URL an Vite übergeben. `pnpm build` allein baut nur das Frontend und veröffentlicht kein Backend.
5. Preview-Builds benötigen eigene isolierte Convex-Deployments/Preview-Keys samt Auth-Konfiguration und Testkonto. **Nie den Produktions-Deploy-Key auf Preview/Development erweitern.** Wenn du keine Previews brauchst, diese im Hosting deaktivieren. Anleitung: [Convex auf Vercel](https://docs.convex.dev/production/hosting/vercel).

Der statische Build enthält weiterhin das Curriculum als Assets; der Login ist keine Geheimhaltungsschicht für diese statischen Inhalte. Sämtlicher persönlicher Lernstand kommt hingegen ausschließlich über autorisierte Convex-Funktionen. Ein kompromittierter Hosting-/Convex-/Clerk-Adminzugang liegt außerhalb der Benutzerautorisierung dieser App.

### Eingerichtete Produktionsumgebung

Stand 2026-09-28: Frontend **https://learn.kiumu.app**, Vercel-Projekt **kiumu/learning-platform**, Convex-Produktion **wooden-kangaroo-392** in US East (N. Virginia). Die Entwicklung bleibt separat auf **rightful-opossum-852**. Der Produktions-Issuer lautet **https://clerk.learn.kiumu.app**; die einzige erlaubte Produktions-User-ID steht ausschließlich in den Convex-Umgebungsvariablen. Entwicklungs- und Produktionskonto haben unterschiedliche IDs.

Die Clerk-Instanz wurde für `learn.kiumu.app` als **Secondary application** angelegt. Die fünf von Clerk vorgegebenen CNAME-Einträge für `clerk.learn`, `accounts.learn`, `clkmail.learn`, `clk._domainkey.learn` und `clk2._domainkey.learn` sind in Vercel DNS hinterlegt. DNS und TLS-Zertifikate wurden von Clerk bestätigt. Der bestehende JWT-Template `convex` mit `{"aud":"convex"}` und Invite-only-Modus wurden übernommen und geprüft. Ein Clerk Secret Key wird weiterhin nicht benötigt.

`learn.kiumu.app` hat außerdem einen eigenen CNAME auf den Vercel-Zielhost. **Nicht allein auf `*.kiumu.app` verlassen:** Sobald unter `learn.kiumu.app` eigene Clerk-DNS-Einträge existieren, kann der übergeordnete Wildcard-Eintrag für `learn.kiumu.app` nicht mehr greifen. Nach dem Ergänzen eines fehlenden Eintrags können DNS-Caches die vorherige leere Antwort noch bis zum Ablauf ihrer TTL liefern.

Beim erstmaligen Produktionssetup wurde der Entwicklungsstand einmalig per Convex-Snapshot übertragen: vorher alle vier Produktionstabellen als leer geprüft, anschließend ohne `--replace` oder `--append` importiert. Zwei Fortschrittseinträge und ein Entwurf wurden unverändert übernommen und gegen den Snapshot verglichen; die Entwicklung wurde nicht gelöscht. **Diesen einmaligen Import nicht auf eine inzwischen benutzte Produktion wiederholen.** Für spätere Zusammenführungen den ergänzenden JSON-/Legacy-Import der App verwenden.

## Tests und lokale Backend-Prüfung

```sh
pnpm test             # Content/Engine plus Convex-Funktionen mit convex-test
pnpm lint
pnpm typecheck
pnpm content:check
pnpm bear:check
pnpm verify
pnpm test:e2e         # Bestehende Lernabläufe mit lokalem Regressionstest-Adapter
pnpm test:pwa:e2e     # Produktionsbuild: Manifest, Service Worker, Offline-Lesen
pnpm build
```

Der lokale Adapter wird ausschließlich von `vite serve --mode test-local` geladen. Produktionsbuilds verwenden unabhängig vom Modus immer `src/main.ts` mit Auth-Gate. `test:convex:e2e` verwendet dagegen den echten Convex-JavaScript-Client und ein **wegwerfbares lokales Convex-Deployment**, um zwei Browser, WebSockets, Optimismus, Import/Export und Verbindungsabbrüche zu prüfen:

```sh
# In einer separaten temporären Kopie des Repos, niemals in Produktion:
CONVEX_AGENT_MODE=anonymous pnpm exec convex dev --local-cloud-port 13210 --local-site-port 13211
pnpm exec convex env set CLERK_JWT_ISSUER_DOMAIN https://learning.clerk.accounts.dev
pnpm exec convex env set ALLOWED_CLERK_USER_ID user_owner
# Im eigentlichen Checkout; Pfad zur Konfiguration der temporären Kopie:
CONVEX_TEST_CONFIG=/pfad/zur/kopie/.convex/local/default/config.json pnpm test:convex:e2e
```

Diese Tests setzen Testbereiche zurück und verwenden Convex-Admin-Impersonation ausschließlich im Browser-Testeinstieg. Sie testen keine reale Clerk-Anmeldung. Der Testeinstieg wird ausschließlich im expliziten Serve-Modus geladen, akzeptiert nur Loopback-URLs und wird nie ins Produktionsbundle importiert. Die Testkonfiguration und temporäre Admin-Schlüssel nicht teilen oder committen.

Zur finalen Cloud-Abnahme nach Einrichtung: autorisiert anmelden, Häkchen/Übung/Projekt ändern, „synchronisiert“ abwarten, zweite Browsersitzung anmelden, Stand und Weiterlernen prüfen; anschließend abgemeldet und mit einem anderen Konto Zugriff verifizieren. Die automatisierten Backendtests prüfen jeden öffentlichen Endpunkt bereits direkt mit erlaubten, fehlenden, fremden und inkonsistenten Identitäten; der lokale Backendtest prüft zusätzlich die Ablehnung eines unsignierten JWT.

Ergebnisse der Implementierungsprüfung, behobene Schwachstellen und verbleibende Abhängigkeitshinweise: [CONVEX-AUDIT.md](CONVEX-AUDIT.md).

## Fehlerbehebung

| Symptom | Prüfen |
| --- | --- |
| Einrichtung fehlt | Beide `VITE_`-Variablen vor dem Build gesetzt? Danach neu bauen. |
| Anmeldung erreichbar, aber kein Zugriff | Clerk User ID des richtigen Environments, exakter Issuer ohne Slash, JWT-Template `convex`, Audience `convex`, deployed `auth.config.ts`. |
| Backend meldet fehlenden Issuer | Variable auf dem ausgewählten Convex-Deployment setzen; eine lokale `.env`-Variable konfiguriert nicht automatisch den Server. |
| Verbindung wird hergestellt | Richtige `.convex.cloud`-URL (nicht `.convex.site`), WebSocket-Verbindung/Firewall, Convex-Prozess und Deploymentstatus prüfen. |
| Fortschritt fehlt auf zweitem Gerät | Gleiche Produktions-URL/Deployment und freigeschaltetes Konto, Legacy-Import noch ausstehend, bestätigte Synchronisierung vor Schließen? |
| Legacy-Import nach Reset abgelehnt | Beabsichtigter Schutz. Falls gewünscht, JSON-Sicherung explizit wiederherstellen. |
| Entwurf nicht gespeichert | Verbindung und Anmeldung prüfen, bei Größenfehler Text sichern/unter 60 KB reduzieren. |
| Ungültige Übung nach Curriculumänderung | IDs/Fingerprints prüfen; unveränderte IDs beibehalten, entfernte Inhalte bleiben nur im Backup. |
