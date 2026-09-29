# Architektur- und Sicherheitsprüfung · 2026-09-28

Die automatisierte Implementierungsprüfung verwendete ein separates, wegwerfbares lokales Convex-Deployment mit dem echten Browser-Client. Anschließend wurde Stevens tatsächliche Clerk-Entwicklungsinstanz mit seinem Convex-Cloud-Entwicklungsdeployment verbunden; Issuer und einzige erlaubte User-ID wurden dort konfiguriert.

Steven bestätigte am 2026-09-28 den erfolgreichen echten Login und den erhaltenen Fortschritt nach einem Reload in der Entwicklungsumgebung. Anschließend wurden Clerk-Produktion, Domain/TLS und das Convex-Produktionsdeployment eingerichtet und die App unter https://learn.kiumu.app veröffentlicht. Steven meldete sich erfolgreich am Produktionskonto an; danach wurden der echte autorisierte Lernstand, Reload und reaktive Positionsänderungen in zwei Browser-Tabs geprüft. Die direkte Browserprüfung betraf zwei Tabs; Steven bestätigte anschließend die erfolgreiche persönliche Nutzung.

## Grenzen und Architektur

Vite, TypeScript, DOM-Renderer, History-Router, Lernpfade, neun Übungstypen und statische Inhalte bleiben bestehen. Convex enthält ausschließlich persönliche Zustandsdaten in vier Tabellen. Ein typisierter Eintrag pro Fortschrittsfeld vermeidet das Überschreiben ganzer Bereiche bei gleichzeitigen Änderungen. Große Antwortentwürfe sind separat gespeichert und einzeln abonniert; Gesamtabfragen übertragen keine Antworttexte. Prozente und Projektstatus folgen den bestehenden Berechnungen anhand aktueller Inhalts-IDs/Fingerprints. Es gibt keinen weiteren lokalen Fortschrittsspeicher nach der Anmeldung.

Die vorhandenen Projekttexte und Schritt-IDs wurden gegen Git HEAD verglichen: alle 20 Projekte unverändert, außer der expliziten Benennung schon bestehender Abnahmeschlüssel. Im erzeugten Bear-Kurs sind alle 100 bisherigen Aufgaben einschließlich IDs, Fingerprints und Inhalten unverändert; hinzugekommen sind explizite Kapitel-IDs. Ein Test ordnet Kapitel und Aufgaben um und prüft die identische Zuordnung von IDs/Fingerprints.

## Prüfung sämtlicher öffentlicher Backendfunktionen

| Funktion | Zugriff und Datenintegrität |
| --- | --- |
| `snapshot` | `requireOwner` vor Lesen; nur kleine Fortschrittseinträge und Reset-Generationen |
| `draft` | `requireOwner`; validierte Bereich-/Übungs-ID; nur aktuelle Reset-Generation |
| `exportDrafts` | `requireOwner`; höchstens 16 Entwürfe pro Seite; alte Generationen ausgefiltert |
| `set` | `requireOwner`; Generation, IDs, Zustandsvarianten und maximal 32 Einträge geprüft; gezielte Upserts |
| `saveDraft` | `requireOwner`; Generation, Inhaltsfingerprint, JSON-Tiefe, Struktur und maximal 60 KB geprüft; idempotenter Upsert |
| `reviewCard` | `requireOwner`; Generation, IDs und Bewertung geprüft; Zähler/Box atomar aus Serverstand berechnet; Historie in derselben Transaktion |
| `importLegacy` | `requireOwner`; begrenzte Chunks, nur fehlende Datensätze, Importbeleg in derselben Transaktion; Reset-Sperre |
| `resetArea` | `requireOwner`; Generation geprüft; Fortschritt gelöscht und Generation atomar erhöht |

`purgeDrafts` ist eine interne Mutation, kein öffentlicher Endpunkt. Sie darf ausschließlich ältere Entwurfsgenerationen löschen. Es gibt keine öffentlichen Actions, HTTP-Endpunkte, Dateien oder clientgesteuerten Eigentümer-IDs. Ein Test enumeriert die öffentlichen Exporte und verlangt für jeden explizite Autorisierungstests.

Jeder Endpunkt wurde mit erlaubtem Konto, ohne Identität, anderem Konto, anderem Issuer, inkonsistentem tokenIdentifier, fehlender Allowlist und fehlerhafter Issuer-Konfiguration geprüft. Die Entscheidung verwendet ausschließlich die von Convex validierte Identität (`issuer`, `subject`, `tokenIdentifier`); E-Mail oder Browserwerte gewähren keinen Zugriff. Der echte lokale Convex-Server lehnt auch ein unsigniertes JWT mit behaupteter Owner-ID ab. Die erfolgreichen Integrationstests verwenden lokale Admin-Impersonation für synthetische Testidentitäten; sie ersetzen keine Prüfung des echten Clerk-Logins.

Clerk Publishable Key und Convex-URL sind öffentlich. Erlaubte User-ID und Issuer werden am Convex-Deployment konfiguriert; Deploy-/Admin-Schlüssel gehören nicht ins Frontend. Beide untersuchten Builds — normaler Produktionsmodus und ausdrücklich `--mode test-convex` — enthalten das produktive Auth-Gate und weder Testeinstieg, Testidentität noch Serverkonfiguration. Der Testzugang ist nur in Vites explizitem Serve-Modus verfügbar. Das Curriculum bleibt wie beauftragt in öffentlich ausgelieferten statischen Assets; privater Lernstand ist davon getrennt.

## Während der Prüfung behoben

- **Positionsabhängige Inhalts-IDs:** Bear-Kapitel/-Aufgaben sowie Projektabnahmen besitzen jetzt explizite IDs unter Beibehaltung ihrer alten Werte. „Weiterlernen“ speichert Übungs-IDs statt numerischer URL-Positionen; Sicherungen behalten diese IDs.
- **Konkurrierende Änderungen:** einzelne Einträge statt ganzer Objekte; Kartenreviews werden atomar addiert. Acht gleichzeitige identische Direktaufrufe erzeugten einen Lektionsdatensatz, acht gleichzeitige Reviews genau acht Reviews.
- **Veraltete Antworten nach Inhaltsänderung:** Entwürfe sind an Fingerprints gebunden; Formprüfung vor Übergabe an die vorhandenen Renderer. Sicherungen bewahren die ursprünglichen Fingerprints.
- **Migration nach explizitem Entfernen/Reset:** false/null-Einträge bleiben als Löschmarker bestehen. Reset-Generationen sperren alte wartende Schreibvorgänge und spätere Legacy-Importe. Bewusst ausgewählte JSON-Sicherungen dürfen fehlende Daten wiederherstellen.
- **Zu große Reset-Transaktion:** alte Entwürfe werden sofort durch die Generation unsichtbar und anschließend intern in begrenzten Batches gelöscht. Neue Generationen werden dabei nicht berührt.
- **Wiederkehrender Importhinweis:** Der Hinweis-Marker liegt außerhalb des Musters der alten Fortschrittsschlüssel; er wird erst nach vollständigem Import gesetzt. Originale bleiben unverändert.
- **Sitzungswechsel:** private DOM-Ansicht wird sofort entfernt, bevor das Neuladen weitere Listener und Speicher freigibt; das hängt nicht allein vom Gelingen der Navigation ab.
- **UI- und Navigationsrennen:** alte asynchrone Seitenaufrufe können eine jüngere Navigation nicht ersetzen. Reaktive Updates überschreiben keine offenen Editoren oder aktive Kartenrunde. Fremde Entwürfe werden zum bewussten Laden angeboten.
- **Ungültige Eingaben:** reservierte Objektschlüssel, unpassende Positions-IDs, übergroße/tief verschachtelte Entwürfe und gefälschte Eigentümerargumente werden abgewiesen. Gesperrtes LocalStorage beeinträchtigt den Cloud-Lernstand nicht.

## Ausgeführte Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm test` | 198 Tests bestanden: bestehende Engine/Inhalte plus Auth, CRUD, Migration, Resets, stabile IDs und Aggregation |
| `pnpm test:e2e` | 28 bestehende Browsertests bestanden; lokaler Regressionstest-Adapter |
| `pnpm test:convex:e2e` | 9 Tests gegen echten lokalen Convex-Server bestanden: zwei Browser, Wiederladen, Weiterlernen, Projekte, Karten, Offline/Reconnect, Migration/Backup, direkte unzulässige Aufrufe, gesperrter Speicher, konkurrierende Mutationen |
| `pnpm lint`, `pnpm typecheck` | Bestanden; bestehende `any`-Verwendungen nur in benannten Altdateien ausgenommen, keine neuen im handgeschriebenen Backend |
| `pnpm content:check`, `pnpm bear:check` | Bestanden; 5 Bereiche, 80 Module, 940 Übungen, 238 Karten, 20 Projekte |
| `pnpm verify` | 587 ausführbare Prüfungen, 0 Fehler; 526 Übungen sind konzeptionell nicht automatisch ausführbar |
| `pnpm build` | Produktionsbuild mit syntaktisch gültigen öffentlichen Platzhaltervariablen bestanden; kein Deployment |
| Build mit `--mode test-convex` | Ebenfalls produktives Auth-Gate; Testadapter und Testidentitäten fehlen im Bundle |
| Browser-Sichtprüfung | Desktop und 390-px-Mobilansicht geladen; kein horizontaler Überlauf, keine Browserfehler oder Vite-Fehleransicht |
| Manueller Test mit echtem Konto | Von Steven bestätigt: Clerk-Login funktioniert; Lernfortschritt bleibt nach Reload mit dem Convex-Cloud-Entwicklungsdeployment erhalten |
| `git diff --check` | Bestanden |

## Produktive Einrichtung und direkte Prüfung

- Vercel-Deployment `dpl_2nwLy1xmif1rxp6wZfypJMss9Qjg`: Produktionsbuild einschließlich TypeScript, Frontend, Convex-Funktionen und Schema erfolgreich; Domain `learn.kiumu.app` zugewiesen.
- Clerk-Produktion: Invite-only, JWT-Template `convex` mit Audience `convex`, fünf bestätigte DNS-Einträge und ausgestellte TLS-Zertifikate. Das Produktionskonto wurde von Steven selbst erstellt; exakt dessen feste User-ID und der Produktions-Issuer wurden in Convex gesetzt und zurückgelesen.
- Vercel besitzt einen ausschließlich auf `deployment:deploy` beschränkten Schlüssel für `wooden-kangaroo-392`, als Secret nur im Production-Environment. Der Schlüssel wurde nicht ausgegeben oder ins Repository geschrieben; die temporäre Übertragungsdatei wurde nach erfolgreicher Speicherung entfernt.
- Upload-Vorschau bestätigt: keine lokalen Umgebungsdateien, Convex-Testdaten, alten Build-Ausgaben oder Testberichte. Ausgeliefertes Einstiegsskript geprüft: produktiver Publishable Key und produktive Convex-URL; keine Entwicklungswerte, erlaubte User-ID oder privaten Servervariablen.
- Alle acht öffentlichen Endpunkte der echten Produktion direkt ohne Anmeldung aufgerufen: jeder verweigert mit `ACCESS_DENIED`, auch Mutationen und Migration. Auch ein unsigniertes JWT mit behaupteter erlaubter Produktions-ID wird bereits von Convex Authentication abgelehnt. Produktionsfehler enthalten keine internen Stacktraces; der Fehlercode steht im strukturierten Convex-Fehlerfeld.
- Einmalige Übernahme aus der Entwicklung in zuvor als leer geprüfte Produktion ohne Ersetzungsoption: zwei Fortschrittseinträge und ein Entwurf. Vollständiger Datensatzvergleich gegen den Export erfolgreich; Entwicklung unverändert erhalten.
- Ein fehlender expliziter DNS-Eintrag für `learn.kiumu.app` wurde ergänzt: die neuen Clerk-Unterdomains verhindern dort die bisherige Wildcard-Auflösung. Autoritative und öffentliche DNS-Auflösung sowie HTTPS-Zertifikat und HTTP 200 am Vercel-Ziel geprüft.
- Nach Ablauf der zuvor gecachten leeren DNS-Antwort funktionieren auch der lokale Resolver, normales HTTPS und der Chrome-Aufruf. Stevens reale Produktionssitzung lädt den autorisierten Lernstand und zeigt „Lernstand synchronisiert“.
- Der erkannte ältere Browserstand eines Bereichs wurde über den ergänzenden UI-Import übernommen. Erfolgsmeldung, Importmarker und weiter bestehender Serverfortschritt geprüft; lokale Originale bleiben erhalten.
- Ein zweiter Chrome-Tab mit eigenem Convex-Client zeigt den gleichen Fortschritt. Navigation von Übung zu Lektion aktualisiert „Weiterlernen“ im anderen Tab ohne Reload. Danach ursprüngliche Übungsposition wiederhergestellt; Reload zeigt weiterhin dieselbe Position und denselben Übungserfolg. Keine Browserfehler oder Warnungen. Die Tabs teilen sich die echte Clerk-Sitzung; dies wird nicht als Anmeldung auf zwei physischen Geräten gewertet.
- **Persönliche Abnahme:** Nach der abschließenden Bitte, die Produktionsseite auf dem Handy zu öffnen und sich anzumelden, bestätigte Steven am 2026-09-28: „klappt alles wunderbar.“ Diese Nutzerbestätigung ergänzt die direkt beobachteten Browserprüfungen; der Assistent hat das Handy selbst nicht bedient oder beobachtet.

## Verbleibende Grenzen und Abhängigkeiten

Produktionslogin, Reload, Synchronisierung zwischen zwei Tabs, Produktionsvariablen, Build, DNS/TLS und die Ablehnung unangemeldeter Direktaufrufe wurden geprüft; die persönliche Abnahme ist bestätigt. Ein fremdes tatsächlich registriertes Clerk-Produktionskonto wurde nicht eigens angelegt; die Ablehnung fremder authentifizierter Identitäten ist für alle Endpunkte automatisiert getestet. Ohne Konfiguration ist die Anwendung absichtlich geschlossen. Ein Offline-Neustart zeigt seit LRN-7 nur einen schreibgeschützten Lesemodus (siehe CONVEX.md, Offline); ausstehende Änderungen müssen vor dem Schließen bestätigt sein. Beim gleichzeitig bearbeiteten selben Feld gewinnt die zuletzt vom Server verarbeitete explizite Änderung. Mehrseitige JSON-Sicherungen sind kein atomarer Datenbanksnapshot.

`pnpm audit --prod` meldet **zwei moderate**, keine hohen oder kritischen Hinweise und beendet sich deshalb mit Status 1:

| Transitive Abhängigkeit | Hinweis |
| --- | --- |
| `uuid` über Clerk → Solana web3 → `jayson` | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq): fehlende Buffer-Grenzprüfung in bestimmten v3/v5/v6-Aufrufen |
| `stream-json` über dieselbe Kette | [GHSA-528h-pc64-c93x](https://github.com/advisories/GHSA-528h-pc64-c93x): quadratische Filterverarbeitung bei speziell verschachteltem JSON |

Die App verwendet gehostete Clerk-Anmeldung und keine Wallet-Funktionen oder Jayson-Server. Die Hinweise betreffen dennoch den installierten SDK-Abhängigkeitsbaum und bleiben offen dokumentiert. Ein erzwungener Major-Override einer ungenutzten transitiven Bibliothek würde den bereits gebündelt ausgelieferten Clerk-Code nicht verlässlich reparieren und wurde nicht eingesetzt. SDK-/Upstream-Updates weiterhin verfolgen; der Audit wird nicht als vollständig warnungsfrei bezeichnet.
