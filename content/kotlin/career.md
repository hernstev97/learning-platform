## Welche Rolle du anstrebst

Als **Android Developer** entwickelst und betreibst du native Android-Anwendungen. Ein **Mobile Developer** kann zusätzlich andere Plattformen oder übergreifende Produktaufgaben betreuen. **Kotlin-Multiplatform-Entwicklung** ergänzt geteilte Logik zwischen Plattformen; Plattformwissen zu Lifecycle, Berechtigungen und Bedienung bleibt trotzdem relevant. Die genaue Aufgabenverteilung ergibt sich aus der Stelle, nicht allein aus dem Titel. [Android-Lernpfad](https://developer.android.com/courses/android-basics-compose/course), [Kotlin Multiplatform](https://kotlinlang.org/docs/multiplatform.html).

Für Bewerbungen im deutschsprachigen Raum solltest du fachlich in verständlichem Deutsch über Entscheidungen sprechen und englische Dokumentation sicher lesen können. Betrachte die folgende Einteilung als Orientierung für deine Vorbereitung, nicht als einheitlichen Standard aller Arbeitgeber. Prüfe konkrete Stellen auf Produkt, Team, Betreuung, Tests und Release-Verantwortung.

| Niveau | Nachweis, den du vorbereiten solltest |
| --- | --- |
| Junior | Kleine Funktion selbstständig umsetzen, Kotlin-Code erklären, Fehler reproduzieren, Tests ergänzen und Review-Rückmeldung aufnehmen |
| Junior mit Android-Praxis | Lifecycle, Compose State, Navigation, Coroutines und eine lokale Datenquelle an einem vollständigen Ablauf zeigen |
| Mid-Level | Mehrere Schichten verbinden, Daten- und Lebensdauerentscheidungen begründen, Fehler im Betrieb eingrenzen und Release-Risiken übernehmen |
| Spezialisierung | Performance, Barrierefreiheit, Offline-Synchronisation oder Plattformintegration mit konkretem Beleg vertiefen |

Die technischen Grundlagen dieser Orientierung entsprechen den [Android-Architekturempfehlungen](https://developer.android.com/topic/architecture/recommendations). Ein bestimmter Job kann zusätzlich Java, bestehende Views, andere Architekturansätze oder Teamwerkzeuge verlangen. Das ist ein Anlass, gezielt Lücken zu schließen; es macht die hier erarbeiteten Zustands- und Testgrundlagen nicht wertlos.

## Was in dein Portfolio gehört

Ein vollständiger kleiner Ablauf ist überzeugender als viele Screens ohne Fehlerbehandlung. Zeige Installation, Datenfluss, Lade-/Leer-/Fehlerzustände, Tests und eine auf einem Gerät geprüfte Version. Ein Reviewer sollte erkennen, welches Nutzerproblem die App löst und welche Entscheidungen du selbst erklären kannst.

**Bear** eignet sich als konkreter Erfahrungsanker: Erkläre einen Gedanken von der Eingabe über lokale Speicherung bis zur vorgesehenen Synchronisation. Verwende dafür den in diesem Kurs gepinnten Bear-Snapshot und prüfe den aktuellen Repository-Stand separat. Behaupte nicht, dass ein hier gelöster Code-Lückentext bereits eine auf dem Gerät abgenommene Funktion beweist. Bei KI-Unterstützung benennst du offen den Anteil und zeigst dein eigenes Verständnis durch Fehlersuche, Tests und eine begründete Änderung.

Das [Abschlussprojekt](/kotlin/projekte/abschluss-leseliste) liefert einen ergänzenden, klar abgegrenzten Nachweis: Offline-Nutzung, Room als Datenquelle, typisierte Navigation, Background-Refresh und signiertes Release. Verwende synthetische Daten; veröffentliche keine echten Gedanken, API-Zugangsdaten oder Signing-Schlüssel.

## Bewerbungsgespräche üben

Rechne je nach Unternehmen mit Screening, technischem Gespräch, Live-Coding oder Take-Home-Aufgabe. Manche Teams besprechen zusätzlich eine kleine mobile Systemarchitektur. Frage nach dem Format und erlaubten Hilfsmitteln, statt einen bestimmten Ablauf vorauszusetzen.

Übe drei unterschiedliche Situationen: eine Funktion unter Beobachtung schreiben, bestehenden Code im Review erklären und einen Fehler anhand von Evidenz eingrenzen. Beim Live-Coding klärst du zuerst Eingaben, Randfälle und Vertrag. Beim Take-Home hältst du den geforderten Umfang ein und lieferst README, Tests und bekannte Grenzen mit. Für eine Architekturfrage zeichnest du Datenhoheit, Lebensdauer und Fehlerfluss, bevor du Bibliotheken aufzählst.

Nutze die [Interviewkarten](/kotlin/karten) mit eigenen Beispielen. Eine Antwort ist belastbar, wenn du sie an Code zeigen und eine Gegenfrage beantworten kannst. Auswendig gelernte Definitionen sind nur der Einstieg.

## Zwölf Wochen mit überprüfbarem Ergebnis

Plane pro Woche mehrere kurze aktive Einheiten und einen längeren Praxisblock. Die Tabelle ist ein Vorschlag, keine Garantie für eine bestimmte Lerngeschwindigkeit oder Anstellung. Wiederhole eine Woche, wenn du ihren Nachweis noch nicht selbstständig erbringen kannst.

| Woche | Module | Nachweis am Ende |
| --- | --- | --- |
| 1 | [Kotlin-Grundlagen](/kotlin/kotlin-grundlagen), [Null-Safety](/kotlin/null-safety) | Kleine Parserfunktion ohne unkritisches `!!`; Randfälle erklären |
| 2 | [Klassen & Objekte](/kotlin/klassen-objekte), [Funktionen & Lambdas](/kotlin/funktionen-lambdas) | Zustände mit Data Class und Sealed Type modellieren |
| 3 | [Collections und Daten-Pipelines](/kotlin/collections), [Generics & Delegation](/kotlin/generics-delegation) | Eine Datenpipeline schreiben, testen und ihre Kosten erklären |
| 4 | [Coroutines](/kotlin/coroutines), [Flow, StateFlow und SharedFlow](/kotlin/flow) | Abbruch und konkurrierende Zustandsänderung kontrolliert prüfen |
| 5 | [Android-Grundlagen: App, Lebenszyklus, Prozess](/kotlin/android-grundlagen), [Jetpack Compose: Denkmodell, Layouts, Material 3](/kotlin/compose-grundlagen) | Bedienbaren Screen mit großer Schrift und Preview bauen |
| 6 | [Compose State & Side Effects](/kotlin/compose-state), [Navigation mit Compose](/kotlin/navigation) | Editorprojekt mit Wiederherstellung und geprüftem Rückweg |
| 7 | [App-Architektur: MVVM, UDF und Dependency Injection](/kotlin/architektur) | Route, Screen, ViewModel und Repository begründet trennen |
| 8 | [Daten & Netzwerk: Room, DataStore, Retrofit, WorkManager](/kotlin/daten-netzwerk) | Lokale Leseliste und Fake-basierte API-Fehlerbehandlung |
| 9 | [Testing: ViewModels, Coroutines, Room und Compose](/kotlin/testing) | Tests für einen vollständigen Erfolgspfad und zwei Fehlerfälle |
| 10 | [Gradle, Signieren und Release](/kotlin/gradle-release) | CI und installierbares signiertes Test-Release ohne Geheimnisse im Repo |
| 11 | [Praxis: Kotlin mit Bear](/kotlin/bear-01) und Abschlussprojekt | Einen realen Bear-Ablauf erklären; Offline-Abnahme des eigenen Projekts |
| 12 | [Interviewtraining](/kotlin/karten), [Abschlussprojekt](/kotlin/projekte/abschluss-leseliste) | Demo, README, Architekturdiagramm und technisches Probeinterview |

## Offizielle Ressourcen

- [Kotlin-Dokumentation](https://kotlinlang.org/docs/home.html): Sprache und Referenz.
- [Kotlin Coroutines Guide](https://kotlinlang.org/docs/coroutines-guide.html): Scopes, Abbruch und Flow.
- [Android Basics with Compose](https://developer.android.com/courses/android-basics-compose/course): geführter ergänzender Praxispfad.
- [Android Architecture](https://developer.android.com/topic/architecture): Zuständigkeiten und Datenfluss.
- [Now in Android](https://github.com/android/nowinandroid): vollständiges offizielles Beispiel zum Lesen und Vergleichen.
- [Android Testing](https://developer.android.com/training/testing): Prüfarten und Werkzeuge.
- [App Signing](https://developer.android.com/studio/publish/app-signing): Signierung und Veröffentlichungsgrundlagen.
