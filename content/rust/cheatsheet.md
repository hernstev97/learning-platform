## Cargo und Werkzeugkette

```bash
cargo new logwerk
cargo check
cargo run -- app.log
cargo test --locked
cargo test parse
cargo test -- --nocapture
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo build --release --locked
cargo doc --open
cargo tree
```

| Befehl / Datei | Bedeutung |
| --- | --- |
| `Cargo.toml` | Paket, Targets, Dependencies, Features |
| `Cargo.lock` | Aufgelöste Abhängigkeiten |
| `--` | Argumente an nachgelagertes Werkzeug oder Binary |
| `--locked` | Keine notwendige Lockfile-Änderung zulassen |
| `--workspace` | Relevante Workspace-Pakete auswählen |
| `--all-features` | Nur bei gemeinsam unterstützten Features sinnvoll |

## Ownership und Referenzen

| Form | Zugriff |
| --- | --- |
| `T` als Parameter | Besitzübernahme; bei Copy wird kopiert |
| `&T` | Geteilte Leihe |
| `&mut T` | Exklusive Leihe |
| `let b = a` | Move, sofern der Typ nicht Copy ist |
| `a.clone()` | Explizite, typspezifische Duplizierung |
| Ende des Besitzes | Wert und besessene Ressourcen werden gedroppt |
| Referenz | Darf ihre Quelle nicht überleben |

```rust
fn zeichen(text: &str) -> usize { text.chars().count() }
fn ergaenzen(text: &mut String) { text.push('!'); }
fn uebernehmen(text: String) -> String { text }
```

## Häufige Typen und Konvertierungen

| Ausgang | Ausdruck | Ergebnis |
| --- | --- | --- |
| `String` | `text.as_str()` | Geliehenes `&str` |
| `&str` | `text.to_owned()` | Eigener `String` |
| `Vec<T>` | `werte.as_slice()` | Geliehenes `&[T]` |
| `&str` | `text.parse::<u32>()` | `Result<u32, ParseIntError>` |
| `Option<T>` | `wert.ok_or(fehler)` | `Result<T, E>` |
| `Result<T, E>` | `wert.ok()` | `Option<T>`; Ursache geht verloren |
| `Option<&T>` | `wert.cloned()` | `Option<T>` bei Clone |
| `Option<&T>` | `wert.copied()` | `Option<T>` bei Copy |
| `u32` | `u64::from(n)` | Verlustfreie Verbreiterung |
| `u64` | `u32::try_from(n)` | Geprüfte Verengung als Result |

## Muster und Kontrollfluss

```rust
match eingabe {
    Some(0) => "null",
    Some(1..=9) => "einstellig",
    Some(_) => "größer",
    None => "fehlt",
};

if let Some(wert) = optional { println!("{wert}"); }
let Some(wert) = optional else { return; };
let (id, status) = datensatz;
```

| Muster | Bedeutung |
| --- | --- |
| `Enum::Variante(x)` | Nutzdaten binden |
| `Typ { id, .. }` | Ein Struct-Feld binden |
| `Some(x) if x > 5` | Guard; weitere Fälle weiterhin behandeln |
| `match &wert` | Nutzdaten lesend zerlegen |
| `_` | Wert ignorieren; bei Enums kann neue Variante verdeckt werden |

## Fehlerbehandlung

```rust
fn menge(text: &str) -> Result<u32, std::num::ParseIntError> {
    let wert = text.parse::<u32>()?;
    Ok(wert)
}
```

| API | Wirkung |
| --- | --- |
| `?` | Fehler / None früh weitergeben |
| `map` | Erfolgswert transformieren |
| `map_err` | Fehlerwert transformieren |
| `and_then` | Weiteren falliblen Schritt verketten |
| `unwrap_or_else` | Ersatz erst bei Bedarf berechnen |
| `expect` | Panic mit Begründung; keine normale Eingabevalidierung |
| `Error::source` | Ursprüngliche Fehlerursache zugänglich machen |

## Traits, Generics und Lifetimes

```rust
trait Label { fn label(&self) -> &str; }
fn anzeigen<T: Label>(wert: &T) { println!("{}", wert.label()); }
fn anzeigen_dyn(wert: &dyn Label) { println!("{}", wert.label()); }
fn erster<'a>(werte: &'a [String]) -> Option<&'a str> {
    werte.first().map(String::as_str)
}
```

| Form | Vertrag |
| --- | --- |
| `T: Trait + Send` | Alle genannten Bounds gelten |
| `where T: Trait` | Lesbar ausgelagerte Bounds |
| `impl Trait` als Rückgabe | Ein konkreter, verborgener Ergebnistyp |
| `&dyn Trait` | Dynamische Dispatch über geliehenes Trait-Objekt |
| `type Item = T` | Assoziierter Typ einer Implementierung |
| `T: 'static` | Keine zu kurzen geliehenen Abhängigkeiten; nicht ewige Lebensdauer |

## API-Design

| Ziel | Werkzeug | Merksatz |
| --- | --- | --- |
| Prüfend konvertieren | `impl TryFrom<u16> for Port` | `TryInto` gibt es dazu |
| Aus Text lesen | `impl FromStr for Stufe` | dann geht `"warn".parse::<Stufe>()` |
| Viele Optionen | Builder mit `fn x(mut self, …) -> Self` | `build()` prüft und liefert `Result` |
| Abläufe erzwingen | Typestate `Verbindung<Verbunden>` + `PhantomData` | falsche Reihenfolge = E0599 |
| Fremde nicht implementieren lassen | sealed trait (privater Supertrait) | Trait bleibt erweiterbar |
| Methoden für fremde Typen | extension trait `…Ext` | wirkt nur, wo importiert |
| Enum darf wachsen | `#[non_exhaustive]` ab dem ersten Release | nachträglich selbst ein Major-Change |
| Ergebnis nicht verwerfen | `#[must_use = "…"]` | nicht doppelt an `Result`-Funktionen |
| Felder ändern dürfen | private Felder + Konstruktor | Literal-Syntax bricht sonst |

[Rust API Guidelines · Checkliste](https://rust-lang.github.io/api-guidelines/checklist.html)

## Iteratoren und Closures

| API | Zweck |
| --- | --- |
| `iter()` | Elemente geteilt leihen |
| `iter_mut()` | Elemente exklusiv leihen |
| `into_iter()` | Empfänger gemäß Implementierung konsumieren |
| `map` / `filter` | Transformieren / auswählen |
| `filter_map` | Nur Some-Ergebnisse; Fehler nicht unbeabsichtigt verwerfen |
| `flat_map` | Innere Iteratoren flach verketten |
| `enumerate` | Nullbasierten Index ergänzen |
| `take` | Anzahl begrenzen |
| `fold` / `try_fold` | Aggregieren / fallibel aggregieren |
| `collect::<Result<Vec<_>, _>>()` | Beim ersten Fehler abbrechen |
| `Fn` / `FnMut` / `FnOnce` | Geteilter / verändernder / konsumierender Closure-Aufruf |

## Smart Pointer und Nebenläufigkeit

| Bedarf | Typ / Muster | Grenze |
| --- | --- | --- |
| Ein Besitzer, Indirektion | `Box<T>` | Kein gemeinsamer Besitz |
| Gemeinsamer Besitz, ein Thread | `Rc<T>` | Nicht Send |
| Gemeinsamer Besitz über Threads | `Arc<T>` | Inhalt muss passend sicher sein |
| Innere Veränderbarkeit, ein Thread | `RefCell<T>` | Leihprüfung zur Laufzeit |
| Exklusive gemeinsame Änderung | `Mutex<T>` | Deadlocks weiterhin möglich |
| Viele Leser, einzelner Schreiber | `RwLock<T>` | Workload messen |
| Besitz über Nachrichten übertragen | Channel | Kapazität und Ende planen |
| Schwacher Rückverweis | `Weak<T>` | `upgrade()` kann None liefern |

| Async-API | Bedeutung |
| --- | --- |
| `async fn` | Erzeugt Future |
| `.await` | Future vorantreiben; mögliche kooperative Unterbrechung |
| `tokio::join!` | Mehrere Futures in derselben Task |
| `tokio::spawn` | Task starten; Handle beobachten |
| `spawn_blocking` | Synchrone Arbeit aus Runtime-Workern auslagern; Begrenzung beachten |
| `timeout` | Warten begrenzen; keine Rückabwicklung |
| `mpsc::channel(n)` | Begrenzter Puffer mit Backpressure |
| `tokio::select!` | Erster fertiger Zweig gewinnt, die anderen werden gedroppt; `biased;` für feste Reihenfolge |
| `tokio::pin!(f)` + `&mut f` | Dieselbe Future über mehrere `select!`-Runden, etwa eine Frist |
| `Semaphore::acquire_owned` | Permit vor `spawn` holen, in die Task verschieben; begrenzt laufende Arbeit |
| `CancellationToken` | `cancel()` auslösen, in jeder Task `cancelled()` im `select!` abwarten |
| `TaskTracker` | `close()`, dann `wait()` bis alle Tasks fertig sind |
| `#[tokio::test(start_paused = true)]` | Timer ohne echte Wartezeit testen (Feature `test-util`) |

| Kanal | Sender → Leser | Was ankommt |
| --- | --- | --- |
| `oneshot` | einer → einer | genau ein Wert (Antwort) |
| `mpsc` | viele → einer | jede Nachricht, begrenzter Puffer |
| `broadcast` | viele → viele | jede Nachricht an jeden; `Lagged(n)` bei Rückstand |
| `watch` | viele → viele | nur der letzte Wert (Konfiguration, Shutdown) |

## Dateien, Prozesse und Netzwerk (std)

| Aufgabe | API | Falle |
| --- | --- | --- |
| Anhängen | `OpenOptions::new().append(true).create(true)` | – |
| Nur neu anlegen | `.write(true).create_new(true)` | `AlreadyExists`, wenn es die Datei gibt |
| Gepuffert schreiben | `BufWriter::new(datei)` | Drop schluckt Fehler: `flush()?` aufrufen |
| Verzeichnis lesen | `fs::read_dir(pfad)?` | Reihenfolge unbestimmt, Einträge sind `Result` |
| Atomar ersetzen | temp im Zielverzeichnis, `sync_all`, `fs::rename` | anderes Dateisystem: `rename` scheitert |
| Programm starten | `Command::new(p).args(a).output()?` | keine Shell; `status.success()` prüfen |
| Exit-Code | `status.code()` | `None` bei Signal (Unix) |
| Kindprozess | `spawn()` und `wait()` | kein Kill bei Drop; ohne `wait` Zombie |
| Zwei Pipes lesen | `wait_with_output()` | nacheinander bis EOF lesen kann hängen |
| TCP-Server | `TcpListener::bind("127.0.0.1:0")?` | Port 0: das System wählt, `local_addr()` |
| Zeilen lesen | `reader.read_line(&mut zeile)?` | `0` heißt EOF; Framing ist deine Aufgabe |
| Schreiben | `write_all` + `flush` | `write` darf weniger schreiben |
| Hängende Gegenstelle | `set_read_timeout(Some(d))` | ohne Timeout blockiert der Thread |

```rust
use std::{fs, io::Write};

fn ersetzen(ziel: &str, inhalt: &[u8]) -> std::io::Result<()> {
    let tmp = format!("{ziel}.tmp");
    let mut f = fs::File::create(&tmp)?;
    f.write_all(inhalt)?;
    f.sync_all()?;
    fs::rename(&tmp, ziel)
}
```

## CLI und Tests mit Crates

| Aufgabe | Werkzeug | Merksatz |
| --- | --- | --- |
| Argumente, Subcommands | `#[derive(Parser)]`, `#[derive(Subcommand)]` (clap) | Nutzungsfehler enden mit Status 2 |
| Wert aus Umgebung | `#[arg(env = "LOGWERK_STUFE")]` | Vorrang: CLI > Umgebung > Datei > Standard |
| stdin als Datei | Pfad `-` → `io::stdin().lock()` als `BufRead` | eine Funktion für beides: `Box<dyn BufRead>` |
| Schnelle Ausgabe | `BufWriter::new(io::stdout().lock())` | `flush()` am Ende selbst aufrufen |
| Ausgabe an `head` | `ErrorKind::BrokenPipe` als normales Ende | `println!` panikt bei Schreibfehlern |
| Strg+C | `ctrlc::set_handler` + `AtomicBool` | ohne Handler gehen Puffer verloren |
| TOML-Konfiguration | `#[derive(Deserialize)]`, `toml::from_str` | `#[serde(deny_unknown_fields)]` fängt Tippfehler |
| Binary im Test | `env!("CARGO_BIN_EXE_logwerk")` | nur in Integrationstests und Benchmarks gesetzt |
| CLI-Asserts | `assert_cmd` + `predicates` | Status, stdout und stderr getrennt prüfen |
| Wegwerf-Verzeichnis | `tempfile::tempdir()` | wird beim Drop gelöscht; `keep()` zum Untersuchen |
| Property-Test | `proptest! { … }` | verkleinert ein Gegenbeispiel, solange der Test scheitert |
| Snapshot | `insta::assert_snapshot!` | Änderungen mit `cargo insta review` bewusst annehmen |

## Messen und Profiling

```toml
[profile.profiling]
inherits = "release"
debug = true
```

```bash
cargo build --profile profiling
hyperfine --warmup 3 ./logauswertung-vorher target/profiling/logauswertung
samply record ./target/profiling/logauswertung
cargo bench --bench auswerten -- --save-baseline vorher
cargo bench --bench auswerten -- --baseline vorher
```

| Werkzeug / Ausgabe | Lesart |
| --- | --- |
| `Instant::now()` / `elapsed()` | Monotone Uhr; eine Einzelmessung ist Rauschen |
| `std::hint::black_box(x)` | Eingabe und Ergebnis vor dem Optimierer verstecken; „best effort“ |
| criterion `time: [a b c]` | Konfidenzintervall: untere Grenze, Schätzung, obere Grenze |
| criterion `change:` mit `p < 0.05` | Signifikant; „within noise threshold“ heißt trotzdem: nicht relevant |
| `iter_batched` | Frische Eingabe pro Aufruf, Herstellen wird nicht gemessen |
| hyperfine | Ganzes Programm mit Start und I/O; erstes Kommando ist die Referenz |
| Flamegraph-Breite | Anteil der Samples inklusive Kinder; x-Achse ist keine Zeit |
| Oberkante eines Balkens | Selbstzeit der Funktion |
| Viel `malloc`/`free` im Profil | Allokationen zählen (`GlobalAlloc`-Zähler), `&str` statt `String`, `entry`, `with_capacity`, Puffer wiederverwenden |
| Amdahl | 5 % Anteil an der Laufzeit spart höchstens 5 % |

## Häufige Compilerfehler

| Code | Ursache | Prüfansatz |
| --- | --- | --- |
| E0382 | Wert nach Move verwendet | Leihen, Besitzfluss ändern oder begründet klonen |
| E0499 | Überlappende exklusive Leihen | Lebensdauern verkürzen, Zugriffe nacheinander |
| E0502 | Geteilte und exklusive Leihe überlappen | Letzte Nutzung vor Änderung legen |
| E0106 | Lifetime-Beziehung fehlt | Quelle einer zurückgegebenen Referenz klären |
| E0277 | Trait Bound nicht erfüllt | Benötigten Vertrag, Typ und Implementierung prüfen |
| E0308 | Typen passen nicht | Ausdrücke, Result/Option und Rückgabetyp vergleichen |
| E0597 | Geliehener Wert lebt zu kurz | Besitzer länger erhalten oder eigenen Wert zurückgeben |

## Offizielle Referenzen

[The Book](https://doc.rust-lang.org/book/) · [Standardbibliothek](https://doc.rust-lang.org/std/) · [Cargo](https://doc.rust-lang.org/cargo/) · [Compilerfehler](https://doc.rust-lang.org/error_codes/error-index.html) · [Clippy](https://doc.rust-lang.org/clippy/) · [Tokio](https://tokio.rs/tokio/tutorial) · [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/) · [Rust Performance Book](https://nnethercote.github.io/perf-book/)
