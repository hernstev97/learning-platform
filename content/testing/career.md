## Testing im Beruf

In vielen Teams schreiben Entwicklerinnen und Entwickler die meisten Tests selbst – zusammen mit dem Code, im selben Pull Request, geprüft von derselben CI. Gefragt ist dabei weniger, ob du die API von pytest oder Playwright auswendig kennst, sondern ob du für eine Änderung begründet entscheiden kannst: Was kann hier kaputtgehen, welcher Test zeigt das am billigsten, und welcher Test lohnt sich nicht? Genau diese Entscheidung übt dieser Bereich.

Daneben gibt es Rollen, in denen Qualität der Hauptberuf ist: Testautomatisierung, Quality Engineering, Testmanagement. Die Grenzen sind fließend, und Titel bedeuten in jedem Unternehmen etwas anderes. Lies in Stellenanzeigen die Aufgaben, nicht nur die Überschrift. Die folgenden Punkte sind Kompetenzziele, die du an Anzeigen deiner Zielrolle überprüfen solltest; diese Seite ist keine Arbeitsmarktstudie.

## Rollen und Jobtitel

| Rolle | Typische Titel in Anzeigen | Alltag | Was oft verlangt wird |
| --- | --- | --- | --- |
| Software Engineer mit starkem Testing | Softwareentwickler (m/w/d), Backend Developer, Full-Stack Developer | Features bauen und dabei Unit-, Integrations- und API-Tests schreiben; Tests anderer im Review beurteilen | eine Sprache sicher, Testframework der Sprache, CI, Git, Clean Code, oft „TDD“ |
| QA Engineer | QA Engineer, Software Tester, Softwaretester | Anforderungen prüfen, Testfälle entwerfen, explorativ testen, Fehler berichten, zunehmend automatisieren | Testmethodik, Fachdomäne, Kommunikation mit Fachbereichen, oft ISTQB |
| Test Automation Engineer | Testautomatisierer, Test Automation Engineer | Automatisierte UI- und API-Suites aufbauen und pflegen, in die CI einbinden, Flakiness bekämpfen | Playwright, Selenium oder Cypress, eine Programmiersprache, API-Tests, CI |
| SDET | Software Development Engineer in Test | Entwickler mit Schwerpunkt Testinfrastruktur: Frameworks, Testdaten, Fakes, Testumgebungen, Werkzeuge für andere Teams | Programmieren auf Entwicklerniveau, Architektur, CI, oft Contract- und Performance-Tests |
| Quality Engineer | Quality Engineer, QA Lead, Quality Coach | Qualität als Teamaufgabe organisieren: Teststrategie, Metriken, Coaching, Pipelines | Teststrategie, Kennzahlen, Moderation, Erfahrung über mehrere Ebenen |
| Testmanagement (später) | Testmanager, Test Lead | Testplanung, Risiken, Berichte, Abnahmen, oft in großen Projekten und regulierten Branchen | ISTQB Advanced Level, Projekterfahrung, Dokumentation |

Für dich als Entwickler mit Python, Kotlin und TypeScript ist die erste Zeile der Kern. Die SDET-Rolle liegt direkt daneben: Wer Fakes, Testdaten-Builder und eine schnelle Pipeline bauen kann, wird in jedem Team gebraucht, auch ohne diesen Titel.

## Was Arbeitgeber im deutschsprachigen Raum erwarten

**Bei Entwicklerstellen** ist Testing meist ein Punkt unter vielen, etwa „Erfahrung mit automatisierten Tests“, „CI/CD“ oder „Clean Code“. Geprüft wird es oft nebenbei: im Live-Coding („Schreib bitte auch Tests“), in der Take-Home-Aufgabe und im Fachgespräch über ein eigenes Projekt. Erwartet wird typischerweise, dass du

- Testfälle systematisch findest, mit Grenzwerten und Fehlerfällen, nicht nur den glücklichen Pfad,
- Tests schreibst, die bei einem Refactoring grün bleiben und bei einem Fehler rot werden,
- erklären kannst, was du auf welcher Ebene testest und was bewusst nicht,
- mit Mocks sparsam umgehst und weißt, wann eine echte Datenbank im Test besser ist,
- eine rote oder flaky Pipeline methodisch untersuchst, statt den Job neu zu starten.

**Bei Rollen in QA und Testautomatisierung** kommen Werkzeuge dazu – Playwright, Selenium oder Cypress, API-Tests, CI-Systeme wie GitHub Actions, GitLab CI oder Jenkins –, außerdem Testmethodik und oft gute Deutschkenntnisse, weil Anforderungen und Abstimmungen mit Fachbereichen auf Deutsch laufen.

**In regulierten Branchen** – Automotive, Medizintechnik, Banken und Versicherungen, öffentliche Auftraggeber – zählen dokumentierte Testprozesse und Rückverfolgbarkeit von der Anforderung bis zum Testfall. Dort tauchen Normen wie ISO 26262 oder Automotive SPICE und Zertifikate wie ISTQB häufiger in Anzeigen auf als bei Produktfirmen und Start-ups.

**Kotlin und Android:** Die Denkweise dieses Bereichs überträgt sich direkt. Die Werkzeuge heißen dort JUnit, MockK, Kotest (mit Property-based Testing) und die Compose- bzw. Espresso-Tests für Oberflächen; der Contract zwischen App und API ist derselbe wie im Modul [Contract Testing](/testing/contract-testing).

## ISTQB Certified Tester Foundation Level

Das International Software Testing Qualifications Board (ISTQB) betreibt das größte Zertifizierungsschema für Softwaretests: nach [eigenen Angaben](https://istqb.org/) über 1,1 Millionen Zertifikate in mehr als 130 Ländern (Stand Mai 2025). Im deutschsprachigen Raum betreuen es das [German Testing Board](https://www.german-testing-board.info/) sowie die Boards in Österreich und der Schweiz; Lehrplan und Prüfung gibt es auf Deutsch.

| Punkt | Stand Oktober 2026 |
| --- | --- |
| Name | ISTQB Certified Tester Foundation Level (CTFL), Version 4.0, Lehrplan 4.0.1 |
| Prüfung | 40 Multiple-Choice-Fragen, 60 Minuten (+25 % bei Prüfung in einer Fremdsprache), bestanden ab 26 Punkten |
| Voraussetzungen | keine |
| Vorbereitung | akkreditierte Kurse (meist mehrere Tage, Prüfung am Ende) oder Selbststudium mit Lehrplan und offiziellen Probeprüfungen |
| Gültigkeit | ohne Ablaufdatum |
| Inhalt | Grundbegriffe, Testen im Entwicklungsprozess, statischer Test und Reviews, Testverfahren (Äquivalenzklassen, Grenzwerte, Entscheidungstabellen, Zustandsübergänge, Anweisungs- und Zweigüberdeckung, erfahrungsbasiertes Testen), zusammenarbeitsbasierte Ansätze wie ATDD, Testmanagement mit Risiken, Werkzeuge |

Quellen: [ISTQB – CTFL v4.0](https://istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/), [Gültigkeit der Zertifikate](https://istqb.org/help/certifications-2/).

**Was es wert ist:** ein gemeinsames Vokabular, das in großen Organisationen, Beratungen und Behörden verbreitet ist; in Anzeigen für Tester und Testmanager dort oft „gewünscht“ oder gefordert; ein Nachweis, dass du Testmethodik systematisch gelernt hast. Viele Begriffe aus diesem Bereich – Äquivalenzklasse, Grenzwertanalyse, Entscheidungstabelle, Regression, risikobasiertes Testen – stammen aus genau dieser Tradition.

**Was es nicht ist:** ein Nachweis, dass du automatisierte Tests schreiben kannst. In der Prüfung schreibst du keinen Code. TDD, Continuous Integration und Stubs kommen als Begriffe vor, Werkzeuge wie pytest, Contract Tests oder der Umgang mit Flaky Tests nicht, und Multiple Choice prüft Wissen, nicht Urteilsvermögen. Für Entwicklerstellen überzeugt ein Repository mit guten Tests und einer begründeten Teststrategie mehr als das Zertifikat.

**Empfehlung:** Für eine Entwicklerstelle nicht nötig. Zielst du auf QA, Testautomatisierung oder Beratung in Konzernen, ist das Foundation Level eine überschaubare Investition – mit dem Lehrplan und den Probeprüfungen im Selbststudium machbar, weil du die Konzepte hier schon praktisch gelernt hast. Für Automatisierungsrollen gibt es als Aufbaustufe den Advanced Level Test Automation Engineering (CTAL-TAE).

## Wie Vorstellungsgespräche Testkompetenz prüfen

| Format | Ablauf | Worauf geachtet wird | Übung hier |
| --- | --- | --- | --- |
| Fachgespräch | Fragen zu Testebenen, Mocks, Flaky Tests, deinen Projekten | Begriffe mit Beispiel erklären, Abwägungen nennen, Grenzen kennen | [Interview-Karten](/testing/karten) |
| Live-Coding mit Tests | Eine Funktion implementieren oder eine vorhandene testen, oft mit geteiltem Editor | Rückfragen zur Spezifikation, systematische Testfälle, sprechende Namen, kleine Schritte | `code`-Übungen der Module [Unit-Tests](/testing/unit-tests) und [Property-based Testing](/testing/property-based-testing) |
| Code-Review | Ein PR mit Code und Tests, du kommentierst | Prüfen die Tests das Risiko? Richtige Ebene? Über-Mocking, Zeitabhängigkeit, fehlende Grenzwerte | Karten [Tests im Review](/testing/karten#karte-tests-im-review), [Über-Mocking](/testing/karten#karte-ueber-mocking-review) |
| Teststrategie-Fall | „Wie würdest du dieses Feature testen?“ am Whiteboard | Risiken zuerst, Ebenen mit Begründung, was bewusst nicht getestet wird | Modul [Teststrategie](/testing/teststrategie), Karte [Gutscheine testen](/testing/karten#karte-gutscheine-testen) |
| Debugging-Aufgabe | Ein roter oder flaky Test, du findest die Ursache | Methode statt Raten: lesen, reproduzieren, Hypothesen, eingrenzen | Module [Tests debuggen](/testing/tests-debuggen), [Flaky Tests](/testing/flaky-tests) |
| Take-Home | Feature mit Tests, einige Tage Zeit, danach Besprechung | Testauswahl, Lesbarkeit, README, CI, ehrliche Grenzen | [Abschlussprojekt](/testing/projekte/qualitaetsoffensive) |

### Live-Coding: so gehst du vor

1. **Rückfragen stellen:** Was passiert bei 0, bei negativen Werten, an der Grenze? Gilt „bis einschließlich“? Welche Zeitzone? Solche Fragen fließen meist in die Bewertung ein.
2. **Testliste laut aufschreiben:** Äquivalenzklassen und Grenzwerte als Kommentar oder Tabelle, bevor du Code schreibst. Das zeigt Methode, auch wenn die Zeit nicht für alle Fälle reicht.
3. **Klein anfangen:** erst der einfachste Fall, dann die Grenzen, dann Fehlerfälle. Rot – grün – aufräumen, wenn das Team TDD mag; sonst zumindest jeden Test einmal rot sehen.
4. **Namen als Spezifikation:** `test_fahrt_bis_fuenf_minuten_kostet_nichts` statt `test_1`.
5. **Grenzen ansprechen:** „Für die Zeitzonenfälle würde ich die Uhr injizieren“, „eine Property für die Monotonie würde ich mit Hypothesis ergänzen“. Das zeigt, dass du über die Übung hinaus denkst.

### Take-Home: was Prüfer lesen

Rechne damit, dass Prüfer zuerst README und Tests öffnen und dann den Code. Eine starke Abgabe enthält:

- einen Befehl, mit dem alles läuft (`uv run pytest`, `npm test`), und eine CI, die es beweist,
- einen kurzen Abschnitt „Was ich wie getestet habe und warum“ – Ebenen, bewusste Lücken, Annahmen,
- Tests, die sich wie die Anforderungen lesen, mit Grenzwerten und Fehlerfällen,
- keine Tests, die nur Implementierungsdetails spiegeln, und keine Mocks für Dinge, die du selbst besitzt,
- ehrliche nächste Schritte: was du mit mehr Zeit ergänzen würdest.

Im Gespräch danach wirst du nach Entscheidungen gefragt: Warum hier ein Fake? Warum kein E2E-Test für diese Regel? Was passiert, wenn zwei Anfragen gleichzeitig kommen? Die Karten dieses Bereichs trainieren genau diese Antworten.

## Portfolio: Projekte, die zählen

Zwei bis drei Projekte mit sichtbarer Testqualität sagen mehr als eine lange Liste. Wichtig ist, dass man die Entscheidungen sieht: ein kurzes Dokument zur Teststrategie, eine grüne CI mit Badge, ein Bericht, der zeigt, dass die Tests Fehler finden (etwa ein Mutationsscore).

| Projekt | Was es belegt |
| --- | --- |
| [Reservierungskalender als gut getestete Bibliothek](/testing/projekte/reservierungskalender) | Du findest Testfälle systematisch, nutzt Property-based Testing und misst mit Mutation Testing, ob die Tests Fehler bemerken |
| [Flaky-Test-Detektor für JUnit-Berichte](/testing/projekte/flaky-detektor) | Du verstehst Flakiness als Datenproblem und baust ein Werkzeug, das einem Team hilft |
| [Frontend- und E2E-Tests für die Buchungsseite](/testing/projekte/buchungsseite-tests) | Du testest Oberflächen wie Nutzer, trennst Komponenten- von E2E-Tests und betreibst eine Suite mit Sharding und Traces |
| [Abschlussprojekt: Qualitätsoffensive für einen Buchungsdienst](/testing/projekte/qualitaetsoffensive) | Du entwirfst und begründest eine Teststrategie über alle Ebenen, mit statischer Analyse, schneller CI und Flake-Policy |

Praktische Hinweise:

- **README zuerst:** In zwei Minuten muss klar sein, was das Projekt tut, wie man die Tests startet und welche Entscheidungen du getroffen hast.
- **Die Teststrategie als eigene Datei** (`TESTSTRATEGIE.md`) mit Risiken, Ebenen und bewussten Lücken. Im Gespräch kannst du darauf zeigen.
- **Beweise statt Behauptungen:** CI-Badge, Laufzeit der Pipeline, Mutationsscore, ein Beispiel für einen Fehler, den ein Property-Test gefunden hat.
- **Commit-Historie:** Ein Bugfix-Commit mit dem Test, der vorher rot war, zeigt Arbeitsweise besser als jeder Satz im Lebenslauf.
- **Keine echten Daten:** Testdaten sind erfunden; Kundendaten haben in öffentlichen Repositorys nichts verloren.

## Lernplan in Wochen

Der Plan geht von etwa acht bis zehn Stunden pro Woche aus. Die Module bauen aufeinander auf; die Projekte setzen die Module davor voraus.

| Woche | Track | Inhalt | Ergebnis |
| --- | --- | --- | --- |
| 1 | Fundament | [Unit-Tests mit pytest](/testing/unit-tests), [Testpyramide und Testgrenzen](/testing/testpyramide) | Tariftests mit Äquivalenzklassen und Grenzwerten; eine eigene Regel, welches Risiko auf welche Ebene gehört |
| 2 | Fundament | [Test Doubles und Mocks](/testing/test-doubles), [Testbarkeit durch Design](/testing/testbares-design) | Uhr und Zahlungsadapter als Abhängigkeit, ein Fake-Repository statt Mocks |
| 3 | Testebenen | [Integrationstests](/testing/integrationstests), [Backend- und API-Tests](/testing/api-tests) | Repository gegen eine echte Datenbank, API-Tests für Statuscodes und Fehlerformat |
| 4 | Testebenen | [Contract Testing](/testing/contract-testing) | Ein Pact zwischen einem Client und einer API, verifiziert mit Provider States |
| 5 | Testebenen | [Frontend-Tests](/testing/frontend-tests), [End-to-End-Tests mit Playwright](/testing/e2e-tests) | Komponententests mit Testing Library und MSW, eine Playwright-Journey |
| 6 | Projekt | [Buchungsseite testen](/testing/projekte/buchungsseite-tests) | Frontend-Suite mit CI, Sharding und Traces |
| 7 | Tests, die tragen | [Property-based Testing](/testing/property-based-testing) | Properties für Preise und Reservierungen, ein Gegenbeispiel durch Shrinking verstanden |
| 8 | Projekt | [Reservierungskalender](/testing/projekte/reservierungskalender) | Bibliothek mit Beispielen, Properties und Mutationsscore |
| 9 | Tests, die tragen | [Fehlgeschlagene Tests debuggen](/testing/tests-debuggen), [Flaky Tests](/testing/flaky-tests) | Drei flaky Tests repariert, ein `git bisect run` durchgespielt |
| 10 | Tests, die tragen | [Regressionsstrategien](/testing/regression-strategien), Projekt [Flaky-Test-Detektor](/testing/projekte/flaky-detektor) | Mutation Testing auf einem eigenen Modul, Detektor mit Statistik |
| 11 | Qualität im Team | [Statische Analyse](/testing/statische-analyse), [Tests in der CI](/testing/ci-pipelines) | Ruff und mypy mit Baseline, eine Pipeline von schnell nach langsam |
| 12 | Qualität im Team | [Teststrategie für ein Feature](/testing/teststrategie) | Testplan auf einer Seite für „Gutscheincodes im Buchungsprozess“ |
| 13–16 | Abschluss | [Abschlussprojekt](/testing/projekte/qualitaetsoffensive), alle Karten | Buchungsdienst mit Strategie, Tests auf allen Ebenen und CI; zehn Minuten Präsentation |

Wer pytest schon sicher beherrscht, kann Woche 1 verdichten und die Zeit in Contract Testing und Property-based Testing stecken. Beides zeigt im Gespräch, dass du über Beispieltests hinausdenkst – am stärksten an einem eigenen Projekt.

## Ressourcen

**Bücher** (Erscheinungsjahr der genannten Auflage):

- Vladimir Khorikov: *Unit Testing: Principles, Practices, and Patterns*. Manning, 2020. Die beste Begründung, was einen guten Unit-Test ausmacht, wann Mocks schaden und wie man Code in testbare und weniger testbare Teile schneidet; Beispiele in C#, Aussagen sprachunabhängig. [Verlagsseite](https://www.manning.com/books/unit-testing)
- Michael Feathers: *Working Effectively with Legacy Code*. Prentice Hall, 2004. Seams, Characterization Tests und Dutzende Techniken, um Abhängigkeiten in Altcode aufzubrechen. [Verlagsseite](https://www.informit.com/store/working-effectively-with-legacy-code-9780131177055)
- Gerard Meszaros: *xUnit Test Patterns: Refactoring Test Code*. Addison-Wesley, 2007. Herkunft der Begriffe Test Double, Dummy, Stub, Spy, Mock und Fake; ein Nachschlagewerk für Test-Smells. Viele Muster stehen auf [xunitpatterns.com](http://xunitpatterns.com/). [Verlagsseite](https://www.informit.com/store/xunit-test-patterns-refactoring-test-code-9780131495050)
- Brian Okken: *Python Testing with pytest*, 2. Auflage. Pragmatic Bookshelf, 2022. Praktischer Einstieg in Fixtures, Parametrisierung, Marker und Plugins. [Verlagsseite](https://pragprog.com/titles/bopytest2/python-testing-with-pytest-second-edition/)
- Maurício Aniche: *Effective Software Testing: A Developer's Guide*. Manning, 2022. Systematische Testfallfindung aus Sicht von Entwicklern, inklusive Property-based Testing; Beispiele in Java. [Verlagsseite](https://www.manning.com/books/effective-software-testing)
- Titus Winters, Tom Manshreck, Hyrum Wright (Hrsg.): *Software Engineering at Google*. O'Reilly, 2020. Die Kapitel 11–14 behandeln Testing, Unit-Tests, Test Doubles und größere Tests; das Buch ist [frei online](https://abseil.io/resources/swe-book) lesbar.

**Artikel:**

- Ham Vocke: [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) – die Pyramide mit konkreten Beispielen für jede Ebene.
- Martin Fowler: [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html) – Zustands- gegen Verhaltensprüfung, klassische und Mockist-Schule.
- Kent C. Dodds: [The Testing Trophy and Testing Classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications).
- Simon Stewart: [Test Sizes](https://testing.googleblog.com/2010/12/test-sizes.html) im Google Testing Blog.
- Spotify Engineering: [Testing of Microservices](https://engineering.atspotify.com/2018/01/testing-of-microservices) – die Honeycomb.

**Offizielle Dokumentation:** [pytest](https://docs.pytest.org/en/stable/), [Hypothesis](https://hypothesis.readthedocs.io/en/latest/), [unittest.mock](https://docs.python.org/3/library/unittest.mock.html), [Playwright](https://playwright.dev/docs/intro), [Testing Library](https://testing-library.com/docs/guiding-principles), [Vitest](https://vitest.dev/guide/), [MSW](https://mswjs.io/docs/), [Pact](https://docs.pact.io/), [GitHub Actions](https://docs.github.com/en/actions), [Ruff](https://docs.astral.sh/ruff/), [mypy](https://mypy.readthedocs.io/en/stable/), [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/).

Zum Nachschlagen im Alltag: der [Spickzettel](/testing/spickzettel) und das [Glossar](/testing/glossar) dieses Bereichs.
