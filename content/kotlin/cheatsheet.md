## Kotlin-Syntax

```kotlin
val title: String = "Plan"
var count = 0
fun label(n: Int): String = "$n Gedanken"
data class Thought(val id: String, val text: String)
sealed interface LoadState {
    data object Loading : LoadState
    data class Ready(val thoughts: List<Thought>) : LoadState
    data class Error(val message: String) : LoadState
}
```

| Form | Bedeutung |
| --- | --- |
| `val` / `var` | Keine neue Zuweisung / neue Zuweisung erlaubt |
| `value is String` | Typprüfung; Smart Cast bei stabiler Annahme |
| `value as? String` | Sicherer Cast; bei unpassendem Typ null |
| `when (state) { ... }` | Fallunterscheidung, bei Sealed Types vollständig formulierbar |
| `1..5` / `1..<5` | Inklusive / exklusive obere Grenze |
| `item.copy(text = "Neu")` | Flache Data-Class-Kopie |
| `object` / `companion object` | Singleton / klassenzugeordneter Singleton |
| `by lazy { ... }` | Verzögerte Property-Initialisierung |

## Null-Safety

| Ausdruck | Wirkung |
| --- | --- |
| `String?` | Nullable Typ |
| `name?.length` | Bei null ebenfalls null |
| `name ?: "Unbekannt"` | Alternative nur bei null |
| `name ?: return` | Früher Ausstieg bei fehlendem Wert |
| `name?.let { use(it) }` | Block nur mit vorhandenem Wert |
| `requireNotNull(name)` | Validierung einer Argumentannahme; kann werfen |
| `name!!` | Erzwungene Annahme; kann NullPointerException werfen |

## Scope Functions

| Funktion | Empfänger | Rückgabe | Typischer Zweck |
| --- | --- | --- | --- |
| `let` | `it` | Lambda-Ergebnis | Transformation / nullable Wert |
| `run` | `this` | Lambda-Ergebnis | Berechnung mit Empfänger |
| `with(value)` | `this` | Lambda-Ergebnis | Gruppe von Operationen |
| `apply` | `this` | Empfänger | Objekt konfigurieren |
| `also` | `it` | Empfänger | Zusätzliche nachvollziehbare Aktion |

## Collections

| Operation | Ergebnis / Grenze |
| --- | --- |
| `map { ... }` | Ein Ergebnis je Element |
| `mapNotNull { ... }` | Nur nicht-null Ergebnisse |
| `filter { ... }` | Passende Elemente |
| `firstOrNull { ... }` | Erstes passendes Element oder null |
| `associateBy { it.id }` | Map; gleiche Keys ersetzen frühere Werte |
| `groupBy { ... }` | Map von Gruppenlisten |
| `any` / `all` / `none` | Quantifizierte Bedingung; leere Eingabe beachten |
| `fold(initial) { acc, item -> ... }` | Aggregation mit Startwert |
| `sortedBy { ... }` | Neue sortierte Liste |
| `asSequence()` | Lazy Pipeline; erst Consumer fordert Werte an |

```kotlin
val openTitles = thoughts
    .filter { it.text.isNotBlank() }
    .map { it.text.trim() }
```

## Coroutines

| API | Vertrag |
| --- | --- |
| `launch { ... }` | Job; Arbeit ohne Ergebniswert |
| `async { ... }` | Deferred; Ergebnis mit `await()` |
| `coroutineScope { ... }` | Auf Kinder warten, gemeinsame Fehlerpropagation |
| `supervisorScope { ... }` | Kindfehler isolieren; trotzdem Fehler behandeln |
| `withContext(Dispatchers.IO)` | Kontextwechsel für blockierendes I/O |
| `Dispatchers.Default` | CPU-orientierte Arbeit |
| `Dispatchers.Main` | UI-Kontext auf Android |
| `delay(...)` | Kooperatives Warten |
| `ensureActive()` | Cancellation in eigener Arbeit prüfen |
| `viewModelScope` | Lebensdauer des ViewModels |

```kotlin
try {
    repository.refresh()
} catch (cancelled: CancellationException) {
    throw cancelled
} catch (error: IOException) {
    showRetry(error)
}
```

## Flow

| API | Zweck / Grenze |
| --- | --- |
| `flow { emit(value) }` | Kalter Produzent |
| `map` / `filter` | Werte transformieren / auswählen |
| `combine(a, b)` | Neueste Werte beider Quellen verbinden |
| `distinctUntilChanged()` | Gleiche aufeinanderfolgende Ergebnisse reduzieren |
| `debounce(...)` | Auf Ruhe nach Änderungen warten; API-Opt-in der Version prüfen |
| `flatMapLatest` | Vorherigen inneren Flow bei neuem Eingang abbrechen |
| `catch { ... }` | Upstream-Fehler behandeln; ersetzt keine allgemeine Cancellation-Strategie |
| `stateIn(scope, started, initial)` | Geteilter aktueller Zustand |
| `shareIn(scope, started, replay)` | Geteilter Flow mit Replay-Vertrag |
| `MutableStateFlow.update { ... }` | Atomare Zustandsänderung; Lambda ohne Nebenwirkungen |

## Compose State und Effekte

| API | Lebensdauer / Zweck |
| --- | --- |
| `remember` | Wert in der Composition erhalten |
| `mutableStateOf` | Beobachtbarer Wert |
| `rememberSaveable` | Kleinen Zustand über Saved State wiederherstellen |
| `collectAsStateWithLifecycle` | Android-Flow lifecyclebewusst lesen |
| `derivedStateOf` | Seltener wechselndes Ergebnis aus häufiger wechselnden Eingaben |
| `LaunchedEffect(key)` | Coroutine; bei Key-Wechsel ersetzen |
| `rememberUpdatedState` | Aktueller Wert ohne Effekt-Neustart |
| `rememberCoroutineScope` | UI-Coroutine aus Event-Handler starten |
| `DisposableEffect(key)` | Registrieren und in `onDispose` aufräumen |
| `SideEffect` | Zustand nach erfolgreicher Composition veröffentlichen |
| `remember(key) { … }` | Neu rechnen, wenn sich der Key ändert |
| `rememberSaveable(saver = …)` | Eigene Klasse mit `listSaver`/`mapSaver` wiederherstellen |
| `produceState(initial, key)` | Fremde `suspend`-Quelle als State |
| `snapshotFlow { … }` | Compose-State als Flow |

```kotlin
@Composable
fun Draft(value: String, onChange: (String) -> Unit) {
    TextField(value = value, onValueChange = onChange)
}
// In einer Composable, mit Runtime-/Saveable-Imports:
var draft by rememberSaveable { mutableStateOf("") }
Draft(value = draft, onChange = { draft = it })
```

## Navigation und Daten

| Aufgabe | Muster |
| --- | --- |
| Argument | `@Serializable data class Detail(val id: String)` |
| Ziel öffnen | `nav.navigate(Detail(id))` |
| Route lesen | `entry.toRoute<Detail>()` |
| Zurück | `nav.popBackStack()`; leeren Verlauf vermeiden |
| Doppeltes oberstes Ziel vermeiden | `launchSingleTop = true` |
| Ablauf bündeln | `navigation<Onboarding>(startDestination = Welcome) { … }` |
| Ablauf verlassen | `navigate(Done) { popUpTo<Onboarding> { inclusive = true } }` |
| ViewModel für den Ablauf | `viewModel(nav.getBackStackEntry<Onboarding>())` |
| Ergebnis zurück | `nav.previousBackStackEntry?.savedStateHandle?.set(KEY, wert)` |
| Bereich wechseln | `popUpTo(graph.findStartDestination().id) { saveState = true }`, `launchSingleTop`, `restoreState` |
| Zurück abfangen | `BackHandler(enabled = hatEntwurf) { … }` |
| Datenquelle | Room → Repository → ViewModel → Screen |
| Änderung | UI-Callback → Owner → Repository → neue Daten |
| Dauerhafter Bestand | Room |
| Kleine Einstellungen | DataStore |
| Verschiebbare Hintergrundarbeit | WorkManager; keine exakte Uhrzeitgarantie |
| Relation lesen | `@Embedded` + `@Relation(parentColumns = […], entityColumns = […])`, DAO mit `@Transaction` |
| Fremdschlüssel | `ForeignKey(…)` plus `Index("spalte")` |
| Token anhängen | OkHttp-`Interceptor` mit `newBuilder().header(…)` |
| Token erneuern | `Authenticator`: bei 401, Grenze über `priorResponse`, sonst `null` |
| Lange Listen | `Pager(PagingConfig(pageSize))` → `collectAsLazyPagingItems()`; Netz + Room: `RemoteMediator` |
| Konflikt beim Sync | Version mitschicken; Server gewinnt, Last write wins oder feldweise zusammenführen |

## Compose fortgeschritten

| Aufgabe | API |
| --- | --- |
| Wert animieren | `animateFloatAsState(target, label = …)` |
| Erscheinen/Verschwinden | `AnimatedVisibility(visible) { … }` |
| Inhalt wechseln | `AnimatedContent(state) { shown -> … }` – `shown` benutzen |
| Eigenes Layout | `Layout(content) { ms, cs -> … layout(w, h) { p.placeRelative(x, y) } }` |
| Zeichnen | `Canvas`, `Modifier.drawBehind`, `drawWithCache { onDrawBehind { … } }` |
| Geste | `Modifier.pointerInput(key) { detectTapGestures(…) }` |
| Wert im Teilbaum | `staticCompositionLocalOf { … }`, `CompositionLocalProvider(X provides y)` |
| Fensterbreite | `currentWindowAdaptiveInfo().windowSizeClass.isWidthAtLeastBreakpoint(WIDTH_DP_MEDIUM_LOWER_BOUND)` |
| View einbetten | `AndroidView(factory = { … }, update = { … }, onRelease = { … })` |

## Performance und Debugging

| Frage | Werkzeug |
| --- | --- |
| Warum komponiert das neu? | Compiler-Report (`reportsDestination`), Layout Inspector mit Recomposition-Zählern |
| Instabile Klasse? | `val` statt `var`, UI-Modell, `@Immutable`, `stabilityConfigurationFiles` |
| Wert ändert sich jeden Frame | Lambda-Modifier: `offset { }`, `graphicsLayer { }`, `drawBehind { }` |
| Welcher Frame ruckelt? | System-Trace, Spur „Janky frames“, Perfetto |
| Startzeit | Macrobenchmark mit `StartupTimingMetric`, `ReportDrawnWhen` für TTFD |
| Baseline Profile | `BaselineProfileRule`, `./gradlew :app:generateBaselineProfile`, `None()` gegen `Partial(Require)` |
| Arbeit auf dem Main-Thread | StrictMode im Debug-Build |
| Speicherleck | LeakCanary als `debugImplementation` |
| Absturz im Release | Android vitals, letzte `Caused by`-Zeile, `mapping.txt` |

| Logcat-Abfrage | Bedeutung |
| --- | --- |
| `package:mine` | nur deine App |
| `level:warn` | Warnung und schwerer |
| `-tag:OkHttp` | Tag ausschließen |
| `is:crash` | nur Abstürze |

## Gradle und adb

```bash
./gradlew tasks
./gradlew testDebugUnitTest
./gradlew connectedDebugAndroidTest
./gradlew lintDebug
./gradlew assembleDebug
./gradlew assembleRelease
./gradlew :app:generateBaselineProfile
./gradlew :baselineprofile:connectedBenchmarkReleaseAndroidTest
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb logcat
adb logcat -s StrictMode
adb shell am start -W -S app.bear/.MainActivity
```

| Grenze | Beachten |
| --- | --- |
| `connectedDebugAndroidTest` | Laufendes passendes Gerät / Emulator erforderlich |
| `assembleRelease` | Signing-Konfiguration und Artefakt prüfen |
| Build-Varianten | Task-Namen hängen vom konkreten Projekt ab |
| Logs / Repository | Keine Tokens, Nutzerdaten oder Signing-Geheimnisse veröffentlichen |
| Mehrere Module | Build-Logik in Convention Plugins (`build-logic`), Wurzel deklariert Fremd-Plugins mit `apply false` |
| `api` oder `implementation` | `implementation` als Standard, `api` nur für Typen der öffentlichen Schnittstelle |

## Offizielle Referenzen

[Kotlin](https://kotlinlang.org/docs/home.html) · [Coroutines](https://kotlinlang.org/docs/coroutines-guide.html) · [Flow](https://kotlinlang.org/docs/flow.html) · [Compose State](https://developer.android.com/develop/ui/compose/state) · [Effekte](https://developer.android.com/develop/ui/compose/side-effects) · [Navigation](https://developer.android.com/guide/navigation/design/type-safety) · [Paging](https://developer.android.com/topic/libraries/architecture/paging/v3-overview) · [Compose-Performance](https://developer.android.com/develop/ui/compose/performance) · [Baseline Profiles](https://developer.android.com/topic/performance/baselineprofiles/overview) · [Modularisierung](https://developer.android.com/topic/modularization) · [adb](https://developer.android.com/tools/adb)
