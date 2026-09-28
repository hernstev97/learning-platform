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

[The Book](https://doc.rust-lang.org/book/) · [Standardbibliothek](https://doc.rust-lang.org/std/) · [Cargo](https://doc.rust-lang.org/cargo/) · [Compilerfehler](https://doc.rust-lang.org/error_codes/error-index.html) · [Clippy](https://doc.rust-lang.org/clippy/) · [Tokio](https://tokio.rs/tokio/tutorial)
