## Rust als berufliches Werkzeug

Rust passt zu Aufgaben, bei denen Ressourcen, Zuverlässigkeit und kontrollierte Systemgrenzen wichtig sind. Mögliche Arbeitsfelder sind Infrastruktur, CLI-Werkzeuge, Backend-Dienste, Embedded-Systeme, WebAssembly und sicherheitsrelevante Komponenten. Die Rollen heißen dabei nicht immer „Rust Developer“, sondern beispielsweise Systems Engineer, Backend Developer oder Infrastructure Engineer. Die offiziellen [Anwendungsfelder](https://www.rust-lang.org/what/) helfen bei der fachlichen Einordnung.

Plane den Einstieg nicht ausschließlich um reine Rust-Junior-Stellen. Dieser Filter begrenzt den Suchraum stark; der tatsächliche regionale Markt muss anhand aktueller Ausschreibungen geprüft werden. Die [State-of-Rust-Umfrage 2025](https://blog.rust-lang.org/2026/03/02/2025-State-Of-Rust-Survey-results/) beschreibt Erfahrungen und Einschätzungen der Community, ist aber keine vollständige Stellenzählung für Deutschland. Nutze Rust als gut belegte zweite Sprache zusammen mit vorhandener Web-, Linux- oder Automatisierungspraxis.

Für dich kann das konkret heißen: ein TypeScript- oder Kotlin-System verstehen und dazu ein verlässliches Rust-Werkzeug liefern. Zeige, weshalb die Sprachwahl zum Problem passt. „Rust ist schneller“ ohne Messung und Vergleich ist keine Begründung. Speicherbedarf, Deployment, Integration und Teamkenntnis gehören ebenfalls dazu.

## Was du für eine Bewerbung belegen solltest

| Bereich | Konkreter Nachweis |
| --- | --- |
| Sprache | Ownership-Transfer, Leihen und Lebensdauer an deinem eigenen Code erklären |
| Modellierung | Structs, Enums und Fehlerarten aus fachlichen Regeln ableiten |
| Qualität | Tests für Grenzwerte und Fehlerpfade; saubere fmt-/Clippy-Läufe |
| Systeme | Dateien, Prozesse, stdout/stderr und Exit-Status bewusst behandeln |
| Nebenläufigkeit | Owner, maximale Arbeitsmenge, Abschluss und Abbruch jeder Task benennen |
| Zusammenarbeit | Ein verständlicher PR, nachvollziehbare Review-Entscheidung oder kleiner Open-Source-Beitrag |

Für eine Junior-Rolle zählt besonders, ob du eine begrenzte Aufgabe mit Unterstützung zuverlässig abschließen und dazulernen kannst. Mehr Verantwortung verlangt zusätzlich belastbare Entscheidungen zu API-Verträgen, Betrieb, Fehlerdiagnose und Abwärtskompatibilität. Das sind Orientierungen für die Vorbereitung, keine einheitlichen Einstufungsregeln aller Arbeitgeber.

Bei Open Source beginne mit einer reproduzierten Fehlermeldung, verbesserter Dokumentation oder einem passenden Regressionstest. Lies die Beitragsregeln des konkreten Projekts. Ein kleiner verstandener Beitrag ist besser erklärbar als eine große Änderung, deren Sicherheitsannahmen du nicht nachvollziehen kannst.

## Portfolio und Gespräch

Das [Abschlussprojekt Logwerk](/rust/projekte/abschluss-logwerk) verbindet Syntax mit nutzbarem Verhalten: mehrere Dateien, begrenzte Parallelität, Fehlerkontext, deterministische Ausgabe und ein Release-Artefakt. Zeige eine gültige Fixture und unmittelbar danach einen kaputten Datensatz. So sieht ein Reviewer, wie sich dein Programm unter realistischen Störungen verhält.

Dein README enthält Problem, Installation, Beispiele, Architektur, Testbefehle und Grenzen. Lege nur synthetische Logs bei. Beschreibe bei KI-Unterstützung offen, was unterstützt entstand und welche Entscheidungen du selbst erklären und ändern kannst. Testzahlen und Compilererfolg ersetzen keine eigene Beherrschung des Datenflusses.

Technische Gespräche können Code-Review, kleine Implementierung, Debugging oder Take-Home-Arbeit enthalten. Für systemnahe Rollen können Speicherlayout, Nebenläufigkeit und Schnittstellen wichtiger werden; für Backends Fehlerverträge und Betrieb. Kläre das konkrete Format. Übe, einen Borrow-Checker-Fehler laut anhand von Besitz und letzter Nutzung zu erklären, statt nur die nächste Compiler-Empfehlung zu übernehmen.

Bei einer Architekturfrage beginne mit Eingaben, Fehlern, Datenmengen und Abnahme. Bei einer Performancefrage frage nach Profil und Messung. Die [Interviewkarten](/rust/karten) liefern Begriffe und Szenarien; deine eigenen Beispiele machen die Antworten glaubwürdig.

## Zwölf Wochen vom Einstieg zur Abgabe

Der Plan ist eine Arbeitsstruktur. Er verspricht keine bestimmte Lerngeschwindigkeit und keine Anstellung. Plane aktive Aufgaben und Wiederholung ein; bearbeite einen Nachweis so lange, bis du ihn ohne Musterlösung erklären kannst.

| Woche | Module | Nachweis am Ende |
| --- | --- | --- |
| 1 | [Einstieg: Cargo, Typen und Ausdrücke](/rust/rust-einstieg) | Kleines Cargo-Projekt mit Funktionen, match und sinnvollen Typen |
| 2 | [Ownership & Borrowing](/rust/ownership) | Move, Clone und geliehene Parameter an drei eigenen Beispielen erklären |
| 3 | [Structs, Enums & Pattern Matching](/rust/structs-enums), [Fehlerbehandlung mit Result](/rust/fehlerbehandlung) | Parser mit vollständigen Zuständen und unterscheidbaren Fehlern |
| 4 | [Collections & Strings](/rust/collections-strings) | Textstatistikprojekt mit Unicode- und Leerfällen |
| 5 | [Traits & Generics](/rust/traits-generics), [Lifetimes](/rust/lifetimes) | Kleine generische API und geliehenen Rückgabewert begründen |
| 6 | [Closures & Iteratoren](/rust/closures-iteratoren) | Fallible Pipeline ohne still verworfene Fehler |
| 7 | [Module, Crates & Cargo](/rust/module-cargo), [Smart Pointer](/rust/smart-pointer) | Persistente Aufgabenverwaltung mit klaren Modul- und Besitzgrenzen |
| 8 | [Nebenläufigkeit mit Threads](/rust/nebenlaeufigkeit) | Begrenzte Dateiprüfung; alle Worker-Abschlüsse beobachten |
| 9 | [Async Rust mit Tokio](/rust/async-rust) | Bounded Channel, Task-Ergebnis und Timeout-Grenze lokal demonstrieren |
| 10 | [Tests & Code-Qualität](/rust/testen-qualitaet) | Regression, CLI-Integrationstests und reproduzierbare CI |
| 11 | [Rust in der Praxis: ein robustes CLI](/rust/rust-praxis) und [Logwerk](/rust/projekte/abschluss-logwerk) | Vollständiger Kernpfad mit strukturierter Fehlerausgabe |
| 12 | [Interviewtraining](/rust/karten) und Projektabnahme | Release-Binary, Fixtures, README und Probeinterview mit Code-Review |

## Lernressourcen

- [The Rust Programming Language](https://doc.rust-lang.org/book/): offizieller zusammenhängender Sprachkurs.
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/): kleine ausführbare Beispiele.
- [Rustlings](https://github.com/rust-lang/rustlings): lokale Übungen aus dem Rust-Projekt.
- [Standardbibliothek](https://doc.rust-lang.org/std/): konkrete Typverträge und Methoden.
- [Cargo Book](https://doc.rust-lang.org/cargo/): Pakete, Features, Tests und Veröffentlichung.
- [Tokio Tutorial](https://tokio.rs/tokio/tutorial): Runtime, Tasks, Channels und Cancellation.
- [Exercism Rust Track](https://exercism.org/tracks/rust): ergänzende unabhängige Übungsplattform; kein offizieller Bestandteil des Rust-Projekts.
