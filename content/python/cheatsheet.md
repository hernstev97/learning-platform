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

## Offizielle Referenzen

[Python-Tutorial](https://docs.python.org/3/tutorial/) · [Datentypen](https://docs.python.org/3/library/stdtypes.html) · [Typing](https://docs.python.org/3/library/typing.html) · [itertools](https://docs.python.org/3/library/itertools.html) · [pytest](https://docs.pytest.org/en/stable/) · [uv](https://docs.astral.sh/uv/guides/projects/)
