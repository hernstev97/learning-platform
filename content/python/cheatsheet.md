## Syntax und Werte

| Ausdruck | Bedeutung |
| --- | --- |
| `x is None` | Identität mit None |
| `a == b` | Wertvergleich |
| `value if condition else fallback` | Bedingter Ausdruck |
| `items[1:5:2]` | Start inklusive, Ende exklusiv, Schritt 2 |
| `enumerate(items, start=1)` | Position und Wert |
| `zip(names, values, strict=True)` | Paarung; ungleiche Länge als Fehler |
| `match value: ...` | Pattern Matching |

```python
from dataclasses import dataclass, field

@dataclass
class Report:
    title: str
    rows: list[str] = field(default_factory=list)

def labels(items: list[str] | None = None) -> list[str]:
    return [] if items is None else [item.strip() for item in items]
```

## Collections und typische Kosten

| Typ / Operation | Zweck | Typische Kosten in CPython |
| --- | --- | --- |
| `list.append(x)` | Am Ende ergänzen | amortisiert O(1) |
| `list[i]` | Indexzugriff | O(1) |
| `x in list` | Mitgliedschaft | O(n) |
| `list.pop(0)` | Erstes Element entfernen | O(n) |
| `deque.popleft()` | Queue-Entnahme | O(1) |
| `key in dict`, `x in set` | Hashbasierte Suche | im Mittel O(1), Worst Case O(n) |
| `sorted(items)` | Neue sortierte Liste | O(n log n) im Worst Case |
| `items[a:b]` bei Listen | Flache Teilkopie | O(k) für k Elemente |

```python
squares = [n * n for n in range(6) if n % 2 == 0]
by_id = {row["id"]: row for row in [{"id": 1}, {"id": 2}]}
unique = {word.casefold() for word in ["Code", "code"]}
lazy_squares = (n * n for n in range(1_000_000))
```

## Strings und Ausgabe

| Format | Beispiel | Ergebnis |
| --- | --- | --- |
| `.2f` | `f'{12.345:.2f}'` | `12.35` |
| `04d` | `f'{7:04d}'` | `0007` |
| `>6` | `f'{"ok":>6}'` | Vier Leerzeichen vor `ok` |
| `!r` | `f'{"a\nb"!r}'` | Debug-Repräsentation mit Escapes |
| `%` | `f'{0.25:.0%}'` | `25%` |

```python
text = "  erster,zweiter  "
parts = text.strip().split(",")
message = " / ".join(parts)
```

## Fehler, Ressourcen und Dateien

```python
import csv
import json
from pathlib import Path

path = Path("report.json")
try:
    data = json.loads(path.read_text(encoding="utf-8"))
except FileNotFoundError:
    data = []

with Path("input.csv").open(encoding="utf-8", newline="") as source:
    rows = list(csv.DictReader(source))
```

| Muster | Einsatz |
| --- | --- |
| `except ValueError as exc` | Erwarteten ungültigen Wert behandeln |
| `raise DomainError(...) from exc` | Fehlerkontext erhalten |
| `finally` | Aufräumen unabhängig vom Ausgang |
| `with resource` | Ressourcenlebensdauer |
| `if __name__ == '__main__':` | Skriptstart vom Import trennen |

## Iteratoren, functools und Typen

```python
from collections.abc import Iterable, Iterator
from functools import lru_cache
from itertools import islice
from typing import Protocol

# Typ-Parameter-Syntax seit Python 3.12
def first[T](items: Iterable[T]) -> T:
    return next(iter(items))

def positive(items: Iterable[int]) -> Iterator[int]:
    for item in items:
        if item > 0:
            yield item

class Sender(Protocol):
    def send(self, text: str) -> None: ...

@lru_cache(maxsize=128)
def square(value: int) -> int:
    return value * value

preview = list(islice(positive([-1, 2, 3, 4]), 2))
```

| Werkzeug | Zweck |
| --- | --- |
| `functools.wraps` | Wrapper-Metadaten erhalten |
| `itertools.chain` | Iterables nacheinander durchlaufen |
| `itertools.islice` | Iterator begrenzt konsumieren |
| `collections.Counter` | Häufigkeiten zählen |
| `typing.Protocol` | Strukturellen Vertrag beschreiben |
| `T \| None` | Wert darf None sein, nicht automatisch optionales Argument |

## Tests und Projektwerkzeuge

```python
import pytest

@pytest.mark.parametrize("value, expected", [(0, 0), (2, 4), (-2, 4)])
def test_square(value, expected):
    assert value * value == expected

def test_invalid_number():
    with pytest.raises(ValueError):
        int("kein Wert")
```

```bash
uv init
uv add httpx
uv add --dev pytest ruff mypy
uv sync --locked
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run mypy src
uv build
```

| pytest-Hilfe | Einsatz |
| --- | --- |
| `tmp_path` | Isolierte Testdateien |
| `monkeypatch` | Kontrollierte Umgebungswerte/Binds ersetzen |
| `capsys` | stdout/stderr prüfen |
| `@pytest.fixture` | Setup, Abhängigkeiten, optional Cleanup mit yield |

## HTTP und SQL

```python
import sqlite3

connection = sqlite3.connect(":memory:")
try:
    connection.execute("CREATE TABLE ticket (id INTEGER PRIMARY KEY, title TEXT)")
    with connection:
        connection.execute("INSERT INTO ticket(title) VALUES (?)", ("Üben",))
    titles = connection.execute("SELECT title FROM ticket ORDER BY id").fetchall()
finally:
    connection.close()
```

| Grenze | Vertrag |
| --- | --- |
| HTTP | Timeout + Statusprüfung + Datenvalidierung |
| SQL | Werte als Parameter, Bezeichner aus erlaubter Auswahl |
| Transaktion | Zusammengehörige Änderungen gemeinsam bestätigen |
| Pagination | Stabile Sortierung + begrenzte Seitengröße |
| Geheimnisse | Laufzeitkonfiguration, nicht Quelltext/Logs |

## Dataclass, NamedTuple, TypedDict und pydantic

| | `@dataclass` | `NamedTuple` | `TypedDict` | pydantic `BaseModel` |
| --- | --- | --- | --- | --- |
| Typen zur Laufzeit geprüft | nein | nein | nein | ja, mit Umwandlung |
| Veränderlich | ja, `frozen=True` nein | nein | ja | ja, `frozen=True` nein |
| Zur Laufzeit | eigene Klasse | `tuple` | `dict` | eigene Klasse |
| Als Dictionary | `asdict(obj)` | `obj._asdict()` | ist schon eines | `obj.model_dump()` |
| Passt zu | Domänenobjekt mit Verhalten | Zeile, Rückgabewert, Entpacken | `dict` aus `json.loads` | Daten von außen |

```python
from dataclasses import asdict, astuple, fields, replace
from typing import NamedTuple

d = asdict(obj)                  # rekursiv, kopiert tief
t = astuple(obj)
namen = [f.name for f in fields(obj)]
neu = replace(obj, status="neu") # flache Kopie, __post_init__ läuft erneut

class Server(NamedTuple):
    host: str
    port: int = 5432

host, port = Server("db.intern")
Server("db.intern")._replace(port=5433)
```

| Falle | Wirkung |
| --- | --- |
| `x: Statistik = Statistik()` | Ein Objekt für alle Instanzen. `field(default_factory=Statistik)` nehmen. |
| `Konfig(port="8080")` | Läuft durch. Daten von außen vor dem Erzeugen prüfen. |
| `json.dumps(asdict(obj))` mit `date` oder `Enum` | `TypeError`. `dict_factory` übergeben. |
| `Punkt(1, 2) == Groesse(1, 2)` | `True`. `NamedTuple` vergleicht nur Werte. |

## Logging konfigurieren

```python
import logging
import logging.config

KONFIG = {
    "version": 1,
    "disable_existing_loggers": False,   # Standard True stellt vorhandene Logger stumm
    "formatters": {"kurz": {"format": "%(levelname)s %(name)s: %(message)s"}},
    "handlers": {
        "konsole": {"class": "logging.StreamHandler", "formatter": "kurz",
                    "level": "INFO", "stream": "ext://sys.stdout"},
    },
    "loggers": {"shop": {"level": "DEBUG", "handlers": ["konsole"], "propagate": False}},
    "root": {"level": "WARNING", "handlers": ["konsole"]},
}

def main() -> None:
    logging.config.dictConfig(KONFIG)    # einmal, nur in der Anwendung
```

| Regel | Wirkung |
| --- | --- |
| Logger-Level, dann Handler-Level | Beide müssen die Meldung durchlassen |
| `propagate=True` (Standard) | Handler der Vorfahren bekommen die Meldung, ihre Logger-Level zählen nicht |
| Bibliothek: `getLogger(__name__).addHandler(logging.NullHandler())` | Still ohne Konfiguration der Anwendung, kein Handler in der Bibliothek |
| Kein Handler gefunden | `logging.lastResort` schreibt `WARNING` und höher nach stderr |
| `extra={"auftrag_id": 1}` | Feld im `LogRecord`, Ausgabe mit `%(auftrag_id)s` |
| `extra={"name": ...}` oder `"message"` | `KeyError: Attempt to overwrite ... in LogRecord` |
| `LoggerAdapter(log, {"auftrag_id": 1})` | Fester Kontext, ersetzt `extra` am Aufruf (seit 3.13 `merge_extra=True`) |
| Filter mit `ContextVar` am Handler | Kontext pro Request oder Task ohne Durchreichen |

## ExitStack, async Context Manager und typisierte Dekoratoren

```python
from contextlib import AsyncExitStack, ExitStack, asynccontextmanager

with ExitStack() as stack:
    dateien = [stack.enter_context(open(p, encoding="utf-8")) for p in pfade]
    stack.callback(print, "fertig")          # Funktion und Argumente getrennt
    # beim Verlassen: umgekehrte Reihenfolge, auch wenn das Öffnen mittendrin scheitert
    besitz = stack.pop_all()                 # optional, letzte Zeile: Besitz an den Aufrufer

@asynccontextmanager
async def sitzung(name: str):
    s = await oeffne(name)
    try:
        yield s
    finally:
        await s.schliesse()

async with AsyncExitStack() as stack:
    s = await stack.enter_async_context(sitzung("db"))
```

| Methode | Zweck |
| --- | --- |
| `enter_context(cm)` | Context Manager betreten und für später merken |
| `callback(func, *args)` | Funktion beim Verlassen aufrufen, unterdrückt keine Exception |
| `push(exit_func)` | Funktion mit `__exit__`-Signatur merken |
| `pop_all()` | Aufräumschritte in neuen Stack verschieben |
| `close()` | Stack von Hand beenden |
| `enter_async_context`, `push_async_callback`, `aclose()` | Gegenstücke bei `AsyncExitStack` |

```python
import functools
from collections.abc import Callable
from typing import Concatenate, Literal, Self, overload, override

def deco[**P, R](func: Callable[P, R]) -> Callable[P, R]:   # Signatur bleibt erhalten
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        return func(*args, **kwargs)
    return wrapper

def mit_db[**P, R](func: Callable[Concatenate[Db, P], R]) -> Callable[P, R]: ...

@overload
def lies(p: str, *, text: Literal[True]) -> str: ...
@overload
def lies(p: str, *, text: Literal[False] = ...) -> bytes: ...
def lies(p: str, *, text: bool = False) -> str | bytes: ...
```

| Typ-Werkzeug | Bedeutung |
| --- | --- |
| `Callable[..., R]` | Parameterliste vergessen, Aufrufe werden nicht geprüft |
| `Callable[P, R]` | Parameterliste des Originals erhalten |
| `Concatenate[X, P]` | Fester erster Parameter `X`, Rest `P` |
| `-> Self` | Typ der Unterklasse bei `return self` und `cls(...)` |
| `@overload` | Rückgabetyp je nach Argument, erste passende Variante gewinnt |
| `@override` | Methode muss in der Basisklasse existieren (`__override__ = True` zur Laufzeit) |
| mypy `explicit-override` | `@override` für jede Überschreibung erzwingen |

## Nebenläufigkeit: asyncio im Detail

| Aufgabe | Code |
| --- | --- |
| Task abbrechen | `task.cancel()`, dann `await task` (löst `CancelledError` aus) |
| Abbruch behandeln | `try: … except asyncio.CancelledError: aufräumen; raise` oder `finally` |
| Abbruch vom Task fernhalten | `await asyncio.shield(task)` (Referenz auf `task` behalten) |
| Mehrere Tasks, ein Fehler stoppt alle | `async with asyncio.TaskGroup() as tg:` und `except*` |
| Frist setzen | `async with asyncio.timeout(sekunden):` löst `TimeoutError` aus |
| Ergebnisse nach Fertigstellung | `async for t in asyncio.as_completed(tasks): await t` |
| Höchstens n gleichzeitig | `asyncio.Semaphore(n)` mit `async with` |
| Exklusiver Abschnitt über `await` | `asyncio.Lock()` mit `async with` |
| Signal an viele Wartende | `asyncio.Event()`: `set()`, `await wait()`, `clear()` |

Regeln beim Abbruch:

- `CancelledError` erbt von `BaseException`: nie mit `except Exception` oder nacktem `except:` verschlucken, immer erneut auslösen.
- `asyncio.timeout` ist Cancellation: Ein verschluckter Abbruch entwertet die Frist.
- `as_completed` bricht nichts ab: Verlierer selbst `cancel()` und mit `gather(..., return_exceptions=True)` abwarten.

### Producer und Consumer mit `asyncio.Queue`

| Aufruf | Wirkung |
| --- | --- |
| `Queue(maxsize=n)` | Begrenzt: `put` wartet bei voller Queue (Backpressure) |
| `await q.put(x)`, `q.put_nowait(x)` | Einreihen; `put_nowait` löst `QueueFull` aus |
| `await q.get()`, `q.get_nowait()` | Entnehmen; `get_nowait` löst `QueueEmpty` aus |
| `q.task_done()` | Ein `get()` ist fertig bearbeitet (im `finally`) |
| `await q.join()` | Wartet, bis zu jedem `put` ein `task_done` kam |
| `q.shutdown()` (3.13) | Keine Einträge mehr; `get` löst nach dem Leeren `QueueShutDown` aus |

```python
async def worker(q):
    while True:
        job = await q.get()
        try:
            await bearbeite(job)
        except Exception:                  # CancelledError nicht fangen
            log.exception("Job %s", job)
        finally:
            q.task_done()
```

### async with und async for

```python
class Verbindung:
    async def __aenter__(self): ...        # darf await benutzen
    async def __aexit__(self, typ, wert, tb): ...   # True unterdrückt die Exception

async def seiten(api):                     # async Generator
    n = 1
    while liste := await api.seite(n):
        for eintrag in liste:
            yield eintrag
        n += 1

from contextlib import aclosing
async with aclosing(seiten(api)) as gen:   # schließt bei break/Fehler
    async for eintrag in gen: ...
alle = [e async for e in seiten(api)]      # async Comprehension, nur in async def
```

## Performance messen und beschleunigen

```python
import cProfile, pstats, timeit, tracemalloc

with cProfile.Profile() as profiler:
    verarbeite(daten)
pstats.Stats(profiler).strip_dirs().sort_stats("tottime").print_stats(10)

zeiten = timeit.repeat("x in menge", setup="menge = set(range(10_000)); x = 9_999", number=1_000, repeat=5)
pro_aufruf = min(zeiten) / 1_000

tracemalloc.start()
vorher = tracemalloc.take_snapshot()
arbeite()
for zeile in tracemalloc.take_snapshot().compare_to(vorher, "lineno")[:5]:
    print(zeile)
```

```bash
python -m cProfile -o profil.out skript.py     # Profil speichern
python -m pstats profil.out                    # darin blättern
python -m timeit -s "daten = list(range(10_000))" "9_999 in daten"
```

| Spalte | Bedeutung |
| --- | --- |
| `ncalls` | Aufrufe, bei Rekursion `gesamt/primitiv` (`25/1`) |
| `tottime` | Zeit in der Funktion selbst |
| `cumtime` | Zeit mit allen Unteraufrufen |
| `percall` | je Aufruf (erst `tottime`, dann `cumtime`) |

| Muster | Besser | Kosten |
| --- | --- | --- |
| `x in liste` in Schleife | `x in menge`, Dict als Index | O(n) gegen O(1) im Mittel |
| `sorted(d)[:k]` | `heapq.nlargest(k, d)` | O(n log n) gegen O(n log k) |
| `s += teil` auf Attribut | `"".join(teile)` | quadratisch gegen linear |
| `[...]` in `sum(...)` | Generatorausdruck | O(n) gegen O(1) Speicher |
| `werte[1:]` in Schleife | Index oder `islice` | O(n) je Kopie |
| gleiche Funktion, gleiche Argumente | `lru_cache` (reine Funktion) | `cache_info()` prüfen |
| Python-Schleife über Zahlen | NumPy-Ausdruck auf Arrays | oft 10- bis 50-fach |

| Regel | Merksatz |
| --- | --- |
| Amdahl | Gewinn `1 / ((1 - p) + p / s)`, höchstens `1 / (1 - p)` |
| `timeit` | Minimum aus `repeat`, durch `number` teilen, `setup` nicht mitmessen |
| `getsizeof` | nur flache Größe, Gesamtverbrauch mit `tracemalloc` |
| `__slots__` | kein `__dict__`, Tendenz zu weniger Speicher, Unterklasse braucht eigenes |
| Reihenfolge | Algorithmus, Datenstruktur, Vektorisierung, native Erweiterung, Parallelität |

## pytest: conftest, Marker, approx, caplog, Hypothesis

| Aufgabe | Code |
| --- | --- |
| Fixture für mehrere Dateien | `tests/conftest.py` mit `@pytest.fixture`, gilt unter `tests/` |
| Test überspringen | `@pytest.mark.skip(reason="…")` |
| Bedingt überspringen | `@pytest.mark.skipif(sys.platform == "win32", reason="…")` |
| Bekannter Bug | `@pytest.mark.xfail(reason="RAD-231", strict=True)` |
| Eigenen Marker registrieren | `[tool.pytest]` mit `markers = ["slow: …"]` und `strict_markers = true` |
| Tests nach Marker wählen | `pytest -m "not slow"`, `-m "slow or integration"` |
| Gründe von skip und xfail zeigen | `pytest -rxs` |
| Kommazahlen vergleichen | `x == pytest.approx(0.3)`, `pytest.approx(0, abs=1e-9)` |
| Ausgabe prüfen | `capsys.readouterr().out` |
| Logs prüfen | `with caplog.at_level(logging.INFO):`, dann `caplog.records` |

```python
import pytest
from hypothesis import assume, given, strategies as st

@given(st.lists(st.text()))
def test_hin_und_zurueck(tags):
    assert dekodiere(kodiere(tags)) == tags

@given(st.integers(), st.integers())
def test_division(a, b):
    assume(b != 0)
    assert (a // b) * b + a % b == a
```

```bash
uv add --dev pytest-cov hypothesis
uv run pytest --cov=paket --cov-branch --cov-report=term-missing --cov-fail-under=90
```

Regeln:

- `approx` toleriert relativ `1e-6` und absolut `1e-12`. Gegen `0` zählt nur `abs`.
- `xfail` ohne `strict=True` meldet einen behobenen Bug nur als `XPASS`.
- Unregistrierte Marker sind ohne `strict_markers` nur eine Warnung.
- `caplog` sieht `INFO` nur mit `at_level(logging.INFO)`. Prüfe Level und Meldung, nicht `caplog.text`.
- Coverage zeigt nie ausgeführten Code, nicht geprüftes Verhalten.

## uv: Gruppen, Extras, Versionen, Upgrades, Audit, Wheel

| Aufgabe | Befehl |
| --- | --- |
| Entwicklungswerkzeug | `uv add --dev pytest` (Gruppe `dev`) |
| Eigene Gruppe | `uv add --group lint ruff` |
| Gruppe installieren | `uv sync --group lint`, `--all-groups` |
| Nur eine Gruppe, ohne Projekt | `uv sync --only-group lint` |
| Ohne `dev` | `uv sync --no-dev` |
| Extra anlegen | `uv add --optional cli "rich>=13"` |
| Extra installieren | `uv sync --extra cli`, `--all-extras` |
| Lockfile prüfen | `uv lock --check`, `uv sync --locked` |
| Lockfile ohne Prüfung nutzen | `uv sync --frozen` |
| Ein Paket anheben | `uv lock --upgrade-package httpx` (kurz `-P`) |
| Alles anheben | `uv lock --upgrade` |
| Veraltetes zeigen | `uv tree --outdated --depth 1` |
| Warum ist das Paket drin? | `uv tree --invert --package h11` |
| Untergrenzen prüfen | `uv lock --resolution lowest-direct` |
| Schwachstellen (Vorschau) | `uv audit` |
| Schwachstellen mit pip-audit | `uv export --no-emit-project -o requirements.txt`, dann `uvx pip-audit -r requirements.txt` |
| Bauen | `uv build` (`--sdist`, `--wheel`) |
| Wheel auflisten | `unzip -l dist/*.whl`, Metadaten mit `unzip -p dist/*.whl '*/METADATA'` |
| sdist auflisten | `tar tzf dist/*.tar.gz` |

| Versionsangabe | Erlaubt |
| --- | --- |
| `==1.4.2` | genau 1.4.2 |
| `>=1.4` | 1.4 und neuer |
| `>=1.4,<2` | 1.4 bis vor 2 |
| `~=1.4` | `>=1.4, ==1.*` |
| `~=1.4.2` | `>=1.4.2, ==1.4.*` |

Regeln:

- Anwendung: Untergrenzen in `pyproject.toml`, exakte Versionen in `uv.lock`, `uv sync --locked` in der CI.
- Bibliothek: Bereiche mit Untergrenze, kein `==`, Obergrenze nur mit Grund und Kommentar.
- Gruppen stehen nicht im Wheel, Extras schon (`Provides-Extra`).
- `uv build` baut die sdist zuerst und daraus das Wheel. Die sdist kann `.env` und Tests enthalten.
- `pip-audit -r -` liest nicht von stdin. Schreibe eine Datei.

## Web-API und ORM: FastAPI, Pydantic, SQLAlchemy

```python
class TicketCreate(BaseModel):                      # Eingabe: was der Client senden darf
    title: str = Field(min_length=1, max_length=120)

    @field_validator("title", mode="before")        # läuft vor der Typprüfung
    @classmethod
    def trimmen(cls, wert: object) -> object:
        return wert.strip() if isinstance(wert, str) else wert

class TicketRead(BaseModel):                        # Ausgabe: was die API zurückgibt
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
```

```python
SessionDep = Annotated[Session, Depends(get_session)]   # get_session: Session per yield

@router.post("", response_model=TicketRead, status_code=201)
def create(data: TicketCreate, session: SessionDep) -> Ticket:
    ticket = Ticket(**data.model_dump())
    session.add(ticket)
    session.commit()                                # ohne commit: Rollback beim Schließen
    return ticket
```

```python
class Ticket(Base):                                 # Base(DeclarativeBase)
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]                              # NOT NULL
    note: Mapped[str | None]                        # NULL erlaubt

stmt = select(Ticket).where(Ticket.status == "open").order_by(Ticket.id).limit(20)
tickets = session.scalars(stmt).all()
with SessionFactory.begin() as session:             # commit bei Erfolg, sonst rollback
    session.add(Ticket(title="VPN streikt"))
```

| Parameter in FastAPI | Quelle |
| --- | --- |
| Name im Pfad (`/{ticket_id}`) | Pfad |
| einfacher Typ, nicht im Pfad | Query-String |
| Pydantic-Modell | JSON-Körper |
| `Header()` | HTTP-Header |

| Statuscode | Wann |
| --- | --- |
| `201` | Ressource angelegt |
| `401` | Schlüssel fehlt oder falsch |
| `404` | ID unbekannt |
| `409` | Konflikt, z. B. ungültiger Statusübergang |
| `422` | Eingabe passt nicht zum Modell (FastAPI setzt ihn selbst) |

| Fehler | Ursache und Behebung |
| --- | --- |
| `201`, aber Zeile fehlt | nur `flush()`, `commit()` fehlt |
| Hash in der Antwort | falsches `response_model`; eigenes Ausgabemodell |
| Server hängt unter Last | `async def` mit synchroner Session; `def` schreiben |
| `no such table` im Test | In-Memory-SQLite ohne `StaticPool` |
| `A transaction is already begun` | `begin()` nach erster Abfrage; `commit()` nutzen |
| `DetachedInstanceError` | Attribut nach `commit()` und geschlossener Session gelesen |
| N+1-Abfragen | `selectinload(Ticket.events)` |

```python
@pytest.fixture
def client(engine):                                 # engine: sqlite:// + StaticPool + create_all
    def test_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = test_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
```

```console
$ uv run alembic revision --autogenerate -m "ticket_events"
$ uv run alembic upgrade head
```

[FastAPI](https://fastapi.tiangolo.com/tutorial/) · [Pydantic](https://docs.pydantic.dev/latest/concepts/models/) · [SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/orm/quickstart.html) · [Alembic](https://alembic.sqlalchemy.org/en/latest/tutorial.html)

## Offizielle Referenzen

[Python-Tutorial](https://docs.python.org/3/tutorial/) · [Datentypen](https://docs.python.org/3/library/stdtypes.html) · [Typing](https://docs.python.org/3/library/typing.html) · [itertools](https://docs.python.org/3/library/itertools.html) · [pytest](https://docs.pytest.org/en/stable/) · [uv](https://docs.astral.sh/uv/guides/projects/)
