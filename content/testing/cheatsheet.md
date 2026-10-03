## pytest auf der Kommandozeile

Stand pytest 9.0. Alle Optionen: `pytest --help`. [Referenz](https://docs.pytest.org/en/stable/reference/reference.html#command-line-flags)

| Ziel | Befehl |
| --- | --- |
| Alle Tests, knapp / ausführlich | `pytest -q` · `pytest -v` · `-vv` (volle Diffs, keine Kürzung) |
| Eine Datei, ein Test, ein Parameterfall | `pytest tests/test_tarif.py` · `…::test_fehlstart_kostet_nichts` · `"…::test_city_rad[fehlstart-grenze]"` |
| Nach Namen filtern | `pytest -k "fehlstart and not ebike"` (Teilstring, ohne Groß/klein) |
| Nach Marker filtern | `pytest -m "not slow"` |
| Beim ersten / n-ten Fehler stoppen | `-x` · `--maxfail=3` |
| Nur die zuletzt roten / rote zuerst | `--lf` · `--ff` |
| Rote Tests der Reihe nach abarbeiten | `--sw` (hält am ersten roten, setzt beim nächsten Lauf dort fort) |
| Lokale Variablen im Traceback | `-l` (`--showlocals`) |
| Traceback-Länge | `--tb=short` · `--tb=line` · `--tb=no` · `--tb=long` |
| `print` sehen, nichts einfangen | `-s` (`--capture=no`) |
| Debugger bei Fehler / ab Teststart | `--pdb` · `--trace` · im Code `breakpoint()` |
| Zusammenfassung erweitern | `-ra` (alles außer passed) · `-rA` (alles) · Standard `-rfE` |
| Langsamste Tests | `--durations=10` |
| Nur sammeln | `--co -q` |
| Fixtures ansehen | `--fixtures` · `--fixtures-per-test` · `--setup-show` |
| Registrierte Marker | `--markers` |
| Bericht für die CI | `--junitxml=reports/junit.xml` |
| Konfiguration übersteuern | `-o addopts=""` · `-c andere.toml` |
| Plugin ab- oder zuschalten | `-p no:randomly` · `-p no:cacheprovider` |
| Warnungen als Fehler | `-W error` |
| Cache löschen (`--lf`-Daten) | `--cache-clear` |
| Version und Plugins | `pytest --version --version` |

| Plugin | Optionen |
| --- | --- |
| pytest-xdist | `-n auto` (CPU-Kerne; physische nur mit installiertem psutil) · `-n 4` · `--dist=loadscope` |
| pytest-randomly | aktiv, sobald installiert · `--randomly-seed=1234` · `--randomly-seed=last` · `-p no:randomly` |
| pytest-repeat | `--count=50` · `--repeat-scope=session` |
| pytest-rerunfailures | `--reruns=2 --reruns-delay=1` · `--only-rerun=TimeoutError` · `@pytest.mark.flaky(reruns=2)` · `--fail-on-flaky` |
| pytest-cov | `--cov=radwerk --cov-branch --cov-report=term-missing` · `--cov-fail-under=80` |
| pytest-timeout | `--timeout=30` |

| Exit-Code | Bedeutung |
| --- | --- |
| `0` | alle Tests bestanden |
| `1` | Tests fehlgeschlagen |
| `2` | abgebrochen (Strg+C, Sammelfehler) |
| `3` | interner Fehler |
| `4` | Aufruffehler |
| `5` | keine Tests gesammelt |

## pytest-Grundlagen

```python
import pytest
from tarif import mietpreis


def test_fehlstart_kostet_nichts():
    assert mietpreis(5) == 0


def test_negative_dauer_wird_abgelehnt():
    with pytest.raises(ValueError, match=r"Dauer .* negativ") as info:
        mietpreis(-1)
    assert info.value.args[0].startswith("Dauer")


def test_durchschnitt_in_stunden():
    assert 0.1 + 0.2 == pytest.approx(0.3)
    assert [1.0001, 2.0] == pytest.approx([1.0, 2.0], abs=1e-3)


@pytest.mark.parametrize(
    "minuten, cent",
    [
        pytest.param(5, 0, id="fehlstart-grenze"),
        pytest.param(6, 150, id="erste-halbe-stunde"),
        pytest.param(31, 300, id="angefangene-halbe-stunde"),
    ],
)
def test_city_rad(minuten, cent):
    assert mietpreis(minuten) == cent
```

| Werkzeug | Merksatz |
| --- | --- |
| `pytest.raises(Typ, match=r"…")` | `match` ist `re.search` auf `str(exc)`; nur die Zeile in den Block, die werfen soll |
| `pytest.approx(x, rel=1e-6, abs=…)` | für Gleitkomma; Standard relativ `1e-6`. Geld in Cent als `int` braucht kein `approx` |
| `pytest.warns(DeprecationWarning, match=…)` | wie `raises`, für Warnungen |
| `parametrize("a, b", […], ids=[…])` | ein Testfall je Tupel; `ids` oder `pytest.param(…, id=…)` für lesbare Namen |
| `pytest.param(…, marks=pytest.mark.xfail)` | Marker für einen einzelnen Fall |
| Gestapelte `parametrize` | Kreuzprodukt aller Werte |
| `pytest.skip("…")` · `pytest.fail("…")` · `pytest.importorskip("fastapi")` | im Testkörper |

```python
import logging
import sqlite3

import pytest


@pytest.fixture
def db(tmp_path):
    verbindung = sqlite3.connect(tmp_path / "radwerk.db")
    verbindung.execute("CREATE TABLE fahrten (id INTEGER PRIMARY KEY, minuten INTEGER NOT NULL)")
    yield verbindung                   # Teardown nach yield läuft auch bei rotem Test
    verbindung.close()


@pytest.fixture(scope="session")
def tarife():
    return {"city": 150, "ebike": 300}


def test_fahrt_speichern(db, tarife):
    db.execute("INSERT INTO fahrten (minuten) VALUES (?)", (31,))
    assert db.execute("SELECT count(*) FROM fahrten").fetchone() == (1,)


def test_zeitzone_und_schluessel(monkeypatch):
    monkeypatch.setenv("TZ", "Europe/Berlin")
    monkeypatch.delenv("PAYSTREAM_KEY", raising=False)
    monkeypatch.setattr("tarif.CITY_CENT", 200)        # "modul.name" oder (objekt, "name", wert)


def test_ausgabe(capsys):
    print("3 Räder frei")
    out, err = capsys.readouterr()
    assert out == "3 Räder frei\n"


def test_warnung_im_log(caplog):
    with caplog.at_level(logging.WARNING, logger="radwerk"):
        logging.getLogger("radwerk").warning("Station %s offline", "Südstadt")
    assert caplog.messages == ["Station Südstadt offline"]
```

| Fixture-Scope | Lebensdauer | Typisch für |
| --- | --- | --- |
| `function` (Standard) | ein Test | veränderliche Daten, DB-Transaktion |
| `class` · `module` · `package` | eine Klasse / Datei / ein Paket | teurer Aufbau, nur lesend genutzt |
| `session` | ganzer Lauf (mit xdist: je Worker) | Datenbankschema, Container, Konfiguration |

| Eingebaute Fixture | Wofür |
| --- | --- |
| `tmp_path` · `tmp_path_factory` | frisches `pathlib.Path` je Test · für breitere Scopes |
| `monkeypatch` | `setattr`, `setenv`, `delenv`, `setitem`, `chdir` – wird nach dem Test zurückgesetzt |
| `capsys` · `capfd` | `readouterr()` für stdout/stderr (Python-Ebene · Dateideskriptoren) |
| `caplog` | `messages`, `records`, `text`, `record_tuples`, `at_level(…)`, `set_level(…)`, `clear()` |
| `request` | `request.param` bei `@pytest.fixture(params=[…])`, `request.node.name` |
| `subtests` (seit 9.0) | `with subtests.test(datei=p): …` – jeder Fehlschlag einzeln gemeldet |

Fixtures teilen: in `conftest.py` ablegen, pytest findet sie ohne Import. `autouse=True` nur für echte Querschnittsthemen (Uhr einfrieren, Netzwerk sperren).

| Marker | Wirkung |
| --- | --- |
| `@pytest.mark.skip(reason="…")` | nie ausführen |
| `@pytest.mark.skipif(sys.platform == "win32", reason="…")` | bedingt überspringen |
| `@pytest.mark.xfail(reason="…", strict=True, raises=…)` | erwarteter Fehlschlag; `strict`: unerwartet grün → rot |
| `@pytest.mark.usefixtures("db")` | Fixture ohne Parameter nutzen |
| `@pytest.mark.filterwarnings("error")` | Warnungen dieses Tests als Fehler |
| `@pytest.mark.slow` (eigener) | in der Konfiguration registrieren, sonst Warnung (mit `strict` Fehler) |

```toml title=pyproject.toml
[tool.pytest]                    # natives TOML seit pytest 9.0; älter: [tool.pytest.ini_options]
minversion = "9.0"
testpaths = ["tests"]
addopts = ["-ra"]
strict = true                    # strict_config, strict_markers, strict_xfail, strict_parametrization_ids
markers = [
    "slow: läuft nur nachts",
    "integration: braucht eine echte Datenbank",
]
filterwarnings = ["error"]
```

## unittest.mock

[Referenz](https://docs.python.org/3/library/unittest.mock.html) · [Where to patch](https://docs.python.org/3/library/unittest.mock.html#where-to-patch)

```python
from unittest.mock import ANY, Mock, call

zahlung = Mock()
zahlung.belaste.return_value = {"status": "ok"}
zahlung.erstatte.side_effect = TimeoutError("Paystream antwortet nicht")
zahlung.status.side_effect = ["offen", "bezahlt"]        # Werte nacheinander

zahlung.belaste(kunde="k-17", cent=450)
zahlung.belaste.assert_called_once_with(kunde="k-17", cent=450)
assert zahlung.belaste.call_args == call(kunde="k-17", cent=450)
assert zahlung.belaste.call_args.kwargs["cent"] == 450
zahlung.belaste.assert_called_with(kunde=ANY, cent=450)
zahlung.erstatte.assert_not_called()
```

| API | Zweck |
| --- | --- |
| `Mock()` · `MagicMock()` | beliebige Attribute und Aufrufe; `MagicMock` zusätzlich mit `__len__`, `__iter__`, `__enter__` … |
| `AsyncMock()` | für `async def`; `assert_awaited_once_with(…)` |
| `return_value` | Rückgabe beim Aufruf |
| `side_effect = Exception(…)` · `= [a, b]` · `= funktion` | werfen · nacheinander liefern · berechnen |
| `call_args` · `call_args_list` · `call_count` · `mock_calls` | Aufrufe ansehen |
| `assert_called_once_with` · `assert_called_with` · `assert_any_call` · `assert_has_calls([call(…), …])` · `assert_not_called` | Aufrufe prüfen |
| `ANY` | Platzhalter in erwarteten Argumenten |
| `Mock(spec=Klasse)` · `spec_set=` | nur existierende Attribute · auch beim Setzen |
| `create_autospec(Klasse, instance=True)` | Attribute **und Signaturen** wie das Original |
| `patch("paket.modul.name")` | als Dekorator, Kontextmanager oder `start()`/`stop()` |
| `patch(…, autospec=True)` · `patch.object(Klasse, "methode")` · `patch.dict(os.environ, {…})` | Varianten |
| pytest-mock: `mocker.patch(…)` | wie `patch`, automatisch zurückgesetzt |

**Wo patchen:** dort, wo der Name **nachgeschlagen** wird, nicht dort, wo er definiert ist.

```python
# radwerk/buchung.py
from radwerk.mail import sende_bestaetigung       # bindet den Namen in radwerk.buchung

# tests/test_buchung.py
from unittest.mock import patch

with patch("radwerk.buchung.sende_bestaetigung") as sende:   # wirkt
    buche(kunde="k-17", rad="r-4")
sende.assert_called_once()
# patch("radwerk.mail.sende_bestaetigung") wirkt hier nicht: buchung hält die alte Referenz.
# Steht in buchung.py `import radwerk.mail` und der Aufruf `radwerk.mail.sende_bestaetigung(…)`,
# dann ist "radwerk.mail.sende_bestaetigung" richtig.
```

## Test Doubles

Begriffe nach Meszaros, [xUnit Patterns](http://xunitpatterns.com/Test%20Double.html). `unittest.mock.Mock` zeichnet auf, geprüft wird danach – streng genommen ein Spy, mit `return_value` zugleich ein Stub. Im Alltag heißt jedes Double „Mock“.

| Double | Liefert | Prüft der Test | Radwerk-Beispiel |
| --- | --- | --- | --- |
| Dummy | nichts, füllt nur einen Parameter | nichts | `logger=None` für einen Pfad, der nie loggt |
| Stub | feste Antworten | Zustand / Rückgabe des SUT | Uhr, die immer `2026-03-29 01:59` meldet |
| Spy | echte oder feste Antworten, zeichnet Aufrufe auf | Aufrufe danach | Mail-Adapter, der versendete Mails in einer Liste sammelt |
| Mock | kennt die erwarteten Aufrufe vorab, schlägt bei Abweichung selbst an | Verhalten während des Laufs | Paystream-Double, das bei einer zweiten Belastung sofort scheitert |
| Fake | funktionierende, vereinfachte Implementierung | Zustand über die echte Schnittstelle | `InMemoryReservierungen` statt PostgreSQL |

| Situation | Wahl |
| --- | --- |
| Abfrage (liefert Daten, keine Nebenwirkung) | Stub oder Fake, **keine** Aufrufprüfung |
| Kommando nach außen (Mail, Zahlung, Event) | Mock oder Spy am eigenen Adapter |
| Eigene Datenbank | echte DB im Integrationstest; Fake für schnelle Domänentests |
| Fremde API / SDK | eigener Adapter; Domäne testet gegen Fake des Adapters, Adapter gegen echte API-Beispiele oder Vertrag |
| Zeit, Zufall, IDs | als Parameter oder Abhängigkeit hineingeben, im Test fest |

## Hypothesis

Stand 6.168. [Strategien](https://hypothesis.readthedocs.io/en/latest/reference/strategies.html) · [Settings](https://hypothesis.readthedocs.io/en/latest/reference/api.html#settings)

```python
from datetime import datetime, timedelta

from hypothesis import example, given, settings, strategies as st

from tarif import mietpreis


def ueberlappen(a, b):
    return a[0] < b[1] and b[0] < a[1]          # halboffen: [start, ende)


@st.composite
def reservierungen(draw):
    start = draw(st.datetimes(min_value=datetime(2026, 1, 1), max_value=datetime(2026, 12, 31)))
    dauer = draw(st.integers(min_value=1, max_value=24 * 60))
    return (start, start + timedelta(minutes=dauer))


@given(reservierungen(), reservierungen())
@example((datetime(2026, 5, 1, 10), datetime(2026, 5, 1, 11)),
         (datetime(2026, 5, 1, 11), datetime(2026, 5, 1, 12)))     # Grenze immer prüfen
def test_ueberlappung_ist_symmetrisch(a, b):
    assert ueberlappen(a, b) == ueberlappen(b, a)


@settings(max_examples=500)
@given(st.integers(min_value=0, max_value=10_000))
def test_laengere_fahrt_kostet_nie_weniger(minuten):
    assert mietpreis(minuten) <= mietpreis(minuten + 1)
```

| Strategie | Erzeugt |
| --- | --- |
| `st.integers(min_value=0, max_value=1440)` | ganze Zahlen, Grenzen eingeschlossen |
| `st.text(alphabet="ABC123", min_size=1, max_size=8)` | Zeichenketten |
| `st.from_regex(r"RW-[A-Z0-9]{6}", fullmatch=True)` | Strings zu einem Muster |
| `st.sampled_from(["city", "ebike"])` | ein Element einer Sequenz |
| `st.lists(st.integers(), min_size=1, unique=True)` | Listen |
| `st.tuples(…)` · `st.dictionaries(k, v)` · `st.fixed_dictionaries({…})` | Strukturen |
| `st.datetimes(min_value=…, max_value=…, timezones=st.timezones())` | Zeitpunkte, optional mit Zeitzone |
| `st.floats(allow_nan=False, allow_infinity=False)` | Gleitkomma ohne Sonderwerte |
| `st.builds(Reservierung, rad=st.sampled_from(["r1", "r2"]))` | Objekte über ihren Konstruktor |
| `@st.composite` + `draw(…)` | abhängige Werte (Ende nach Start) |
| `st.from_type(Reservierung)` | aus Typannotationen |
| `st.one_of(a, b)` · `st.just(x)` · `st.none()` · `st.booleans()` | Kombinieren, Konstanten |
| `.map(f)` · `.flatmap(f)` · `.filter(p)` | umformen · abhängig erzeugen · aussortieren |
| `st.data()` + `data.draw(…)` | Werte erst im Testkörper ziehen |

| Werkzeug | Hinweis |
| --- | --- |
| `@example(…)` | fester Fall, läuft immer zuerst – für Grenzen und gefundene Bugs |
| `assume(bedingung)` | verwirft den Fall im Test; besser: Strategie so bauen, dass sie nur Gültiges erzeugt |
| `.filter(p)` | verwirft beim Erzeugen; viele Verwerfungen → HealthCheck `filter_too_much` |
| `note(…)` · `event(…)` · `target(…)` | Zusatzinfo im Fehlerbericht · Statistik · Suche lenken |
| `RuleBasedStateMachine` mit `@rule`, `@invariant`, `Bundle` | zustandsbehaftete Abläufe; `TestX = Maschine.TestCase` |

| Setting | Standard | Profil `ci` |
| --- | --- | --- |
| `max_examples` | 100 | 100 |
| `deadline` | 200 ms | `None` |
| `derandomize` | `False` | `True` |
| `database` | `.hypothesis/examples` | `None` |
| `print_blob` | `False` | `True` |
| `suppress_health_check` | – | `[HealthCheck.too_slow]` |

Das Profil `ci` ist automatisch aktiv, wenn die Umgebungsvariable `CI` gesetzt ist (GitHub Actions setzt sie). [Built-in profiles](https://hypothesis.readthedocs.io/en/latest/reference/api.html#built-in-profiles)

```python title=conftest.py
import os

from hypothesis import settings

settings.register_profile("nightly", settings.get_profile("ci"), max_examples=2_000, derandomize=False)
if profil := os.getenv("HYPOTHESIS_PROFILE"):      # sonst bleibt default bzw. ci aktiv
    settings.load_profile(profil)
```

`--hypothesis-profile=nightly` · `--hypothesis-show-statistics` · `--hypothesis-seed=42` · `--hypothesis-verbosity=verbose` · `--hypothesis-explain`

| Muster | Radwerk-Beispiel |
| --- | --- |
| Round Trip | `parse(format(gutschein)) == gutschein` |
| Invariante | Preis ≥ 0 und ≤ Tageshöchstpreis je Kalendertag |
| Idempotenz | `normalisiere(normalisiere(code)) == normalisiere(code)` |
| Orakel | schnelle Überlappungsprüfung == naive Prüfung Minute für Minute |
| Metamorphe Relation | City-Rad ab 6 Minuten: 30 Minuten länger → genau 150 Cent mehr, solange der Tageshöchstpreis nicht greift |
| Kein Absturz | beliebiger Request-Body → 4xx, nie 500 |
| Symmetrie | `ueberlappen(a, b) == ueberlappen(b, a)` |

## Welche Ebene?

Regel: jedes Risiko auf der **niedrigsten Ebene**, die es **verlässlich** zeigt. Dieselbe Prüfung nicht auf mehreren Ebenen wiederholen.

| Risiko | Ebene | Grund |
| --- | --- | --- |
| Tarifregeln, Grenzwerte, Rundung, Gutscheinrabatt | Unit (reine Funktion), `parametrize` + Property | Millisekunden, exakter Fehlerort, alle Grenzfälle bezahlbar |
| Tagesgrenze, Sommerzeit in `Europe/Berlin` | Unit mit injizierter Uhr | echte Uhr macht den Test zeitabhängig |
| Keine überlappenden Reservierungen | Unit/Property für die Regel · Integration für den DB-Constraint | Regel und Durchsetzung sind zwei Risiken |
| SQL, Constraints, Transaktionen, Migrationen | Integration mit echter DB (Postgres per Testcontainers) | ein Mock prüft kein SQL; SQLite verhält sich anders |
| Statuscodes, Validierung (422), 401/403, Fehlerformat | API-Test in-process (`TestClient`) | HTTP-Schicht ohne Netz und Browser |
| Antwortform, die die Android-App erwartet | Contract Test (Pact) | E2E über Dienste ist langsam und schwer zu koordinieren |
| Paystream-Webhook (Signatur, Felder) | Adapter-Test mit echten Beispielpayloads + Schema/Vertrag | fremdes System, eigener Adapter |
| Formularfehler, Fokus, Ladezustand, Barrierefreiheit | Komponententest (Testing Library + MSW + axe) | schneller als Browser, nah am Nutzer |
| Login → Reservierung → Zahlung | 1 E2E-Journey (Playwright) | verbindet alles, deshalb wenige und kritische |
| Typfehler, unsichere Aufrufe, tote Importe | Typchecker, Linter, SAST | kein Test nötig |
| Deployment, Konfiguration, Secrets | Smoke Test nach dem Deploy | Fehler entstehen erst in der Umgebung |
| Last, Antwortzeiten | eigener Lasttest, nur bei echtem Risiko | teuer, eigene Umgebung |

| Frage im Review | Wenn ja |
| --- | --- |
| Lässt sich die Logik ohne I/O aufrufen? | Unit-Test, I/O in die Hülle verschieben |
| Prüft der Test etwas, das nur die Integration zeigt (SQL, Serialisierung, Konfiguration)? | Integrationstest, kein Mock |
| Gibt es einen Konsumenten in einem anderen Repository? | Contract Test |
| Bricht ein Refactoring den Test, obwohl das Verhalten gleich bleibt? | zu nah an der Implementierung – auf Verhalten umstellen |
| Prüft ein E2E-Test eine Regel, die ein Unit-Test schon zeigt? | E2E-Fall streichen |

## Vitest, Testing Library und MSW

Stand Vitest 5, React Testing Library 16, user-event 14, MSW 3. [Query-Priorität](https://testing-library.com/docs/queries/about#priority) · [user-event](https://testing-library.com/docs/user-event/intro) · [MSW 2 → 3](https://mswjs.io/docs/migrations/2.x-to-3.x#imports)

| Rang | Query | Wann |
| --- | --- | --- |
| 1 | `getByRole('button', { name: 'Reservieren' })` | fast immer; findet über den Accessibility-Baum |
| 2 | `getByLabelText('Gutscheincode')` | Formularfelder |
| 3 | `getByPlaceholderText(…)` | nur wenn kein Label existiert |
| 4 | `getByText(…)` | nicht-interaktiver Text |
| 5 | `getByDisplayValue(…)` | ausgefüllte Felder |
| 6 | `getByAltText(…)` · `getByTitle(…)` | Bilder · `title`-Attribut |
| 7 | `getByTestId(…)` | letzter Ausweg, Nutzer sehen `data-testid` nicht |

| Variante | 0 Treffer | 1 | >1 | Wartet |
| --- | --- | --- | --- | --- |
| `getBy…` | wirft | Element | wirft | nein |
| `queryBy…` | `null` | Element | wirft | nein |
| `findBy…` | Fehler nach Timeout | Element | Fehler | ja (Promise, alle 50 ms, Standard 1 000 ms) |
| `getAllBy…` · `queryAllBy…` · `findAllBy…` | wirft · `[]` · Fehler nach Timeout | Array | Array | nur `findAll…` |

```ts title=src/test/server.ts_und_setup.ts
// src/test/server.ts
import { http, HttpResponse } from 'msw/http'      // MSW 2: from 'msw'
import { setupServer } from 'msw/node'

export const server = setupServer(
  http.post('/api/reservierungen', () => HttpResponse.json({ nummer: 'R-1042' }, { status: 201 })),
)

// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))   // MSW 2: onUnhandledRequest
afterEach(() => {
  cleanup()                 // ohne globals: true räumt sonst niemand auf
  server.resetHandlers()
})
afterAll(() => server.close())
```

```tsx title=src/buchung/Buchungsformular.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { expect, it } from 'vitest'
import { server } from '../test/server'
import { Buchungsformular } from './Buchungsformular'

it('meldet, wenn das Rad schon reserviert ist', async () => {
  server.use(http.post('/api/reservierungen', () => new HttpResponse(null, { status: 409 })))
  const user = userEvent.setup()
  render(<Buchungsformular radId="R-17" radtyp="city" />)

  await user.type(screen.getByLabelText('Gutscheincode'), 'RW-AB12CD')
  await user.click(screen.getByRole('button', { name: 'Reservieren' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('schon reserviert')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
```

| Thema | Kurz |
| --- | --- |
| `user-event` statt `fireEvent` | `userEvent.setup()` vor `render`; jede Aktion `await`en; löst die ganze Ereigniskette aus (Fokus, Tastatur, Klick) und tippt nicht in gesperrte Felder |
| Aktionen | `user.click` · `user.type` · `user.clear` · `user.keyboard('{Enter}')` · `user.tab()` · `user.selectOptions` · `user.upload` · `user.hover` |
| Warten | `await screen.findBy…` für Erscheinen · `await waitFor(() => expect(…))` für anderes, darin keine Aktionen · `waitForElementToBeRemoved` |
| Abwesenheit | `expect(screen.queryByText('Fehler')).not.toBeInTheDocument()` |
| Bereich eingrenzen | `within(screen.getByRole('list')).getAllByRole('listitem')` |
| jest-dom | `import '@testing-library/jest-dom/vitest'` in der Setup-Datei: `toBeInTheDocument`, `toHaveTextContent` (Teiltext), `toBeDisabled`, `toHaveValue`, `toHaveAccessibleName` |
| Vitest-Umgebung | `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] }`; ohne `globals: true` dort `cleanup()` in `afterEach` |
| Server-Antworten | MSW-Handler statt `fetch` zu mocken; je Test `server.use(…)`, danach `resetHandlers()`; unbekannte Anfragen scheitern mit `onUnhandledFrame: 'error'` |
| Fake-Timer und Testing Library | `vi.useFakeTimers({ shouldAdvanceTime: true })` + `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`; mit `vi.useFakeTimers()` allein hängen `user-event`, `findBy…` und `waitFor` |

| Vitest | Kurz |
| --- | --- |
| `describe` · `it`/`test` · `it.each([[30, 'city', 150]])('%i Minuten %s', …)` | gruppieren · Testfall · Tabelle wie `parametrize` |
| `toBe` · `toEqual` · `toMatch(/…/)` · `toBeNull()` | `Object.is` · tiefer Vergleich · Regex · `null` |
| `vi.fn()` · `toHaveBeenCalledExactlyOnceWith(…)` | Spy für Callbacks · genau ein Aufruf mit diesen Argumenten |
| `vi.spyOn(globalThis, 'fetch')` · `mockRestore()` | ersetzt das Original, bis jemand es zurücksetzt; `clearMocks` (Standard seit 5.0) leert nur die Aufrufliste |
| `vi.useFakeTimers()` · `vi.setSystemTime(…)` · `act(() => vi.advanceTimersByTime(60_000))` | Uhr steuern; bei React-Komponenten in `act` vorspulen |
| `await expect(promise).resolves.toBe(…)` | ohne `await` seit Vitest 5 rot |
| `vitest run` · `vitest` · `vitest run -u` | einmal · Watch-Modus (lokal) · Snapshots neu schreiben, nur nach Blick in den Diff |
| Browser Mode: `const screen = await render(…)` aus `vitest-browser-react` · `await expect.element(loc).toMatchTextContent('…')` | echter Browser (Playwright oder WebdriverIO); `toHaveTextContent` vergleicht dort exakt |
| `const ergebnis = await axe(container)` (jest-axe) · `expect(ergebnis.violations).toEqual([])` | findet einen Teil der Barrieren, ohne Kontrastprüfung |

## Playwright

Stand 1.63. [Locators](https://playwright.dev/docs/locators) · [Assertions](https://playwright.dev/docs/test-assertions) · [Best Practices](https://playwright.dev/docs/best-practices)

| Locator | Beispiel |
| --- | --- |
| Rolle (erste Wahl) | `page.getByRole('button', { name: 'Reservieren' })` |
| Label · Platzhalter · Text | `page.getByLabel('E-Mail')` · `getByPlaceholder(…)` · `getByText('Südstadt')` |
| Alt · Titel · Test-ID | `getByAltText(…)` · `getByTitle(…)` · `getByTestId('preis')` |
| Eingrenzen | `page.getByRole('listitem').filter({ hasText: 'City-Rad 17' }).getByRole('button')` |
| Position (sparsam) | `.first()` · `.last()` · `.nth(2)` |
| CSS/XPath (Notlösung) | `page.locator('#preis')` |

| Web-first Assertion (wartet und wiederholt) | Prüft |
| --- | --- |
| `await expect(loc).toBeVisible()` · `.toBeHidden()` | Sichtbarkeit |
| `.toHaveText('…')` · `.toContainText('…')` | Text, exakt · enthalten |
| `.toHaveValue('…')` · `.toBeChecked()` · `.toBeEnabled()` · `.toBeDisabled()` | Formularzustand |
| `.toHaveCount(3)` · `.toHaveAttribute('aria-expanded', 'true')` | Anzahl · Attribut |
| `await expect(page).toHaveURL(/konto/)` · `.toHaveTitle(/Radwerk/)` | Seite |
| `await expect(page).toHaveScreenshot()` · `await expect(loc).toMatchAriaSnapshot()` | Screenshot-Vergleich · Rollen und Namen |
| `await expect(antwort).toBeOK()` | API-Antwort 2xx |
| `expect.soft(…)` · `await expect.poll(() => …).toBe(…)` | weiterlaufen · beliebigen Wert abfragen (Pausen 100, 250, 500, 1 000 ms) |

Nicht: `waitForTimeout(3000)`, `expect(await loc.textContent()).toBe(…)` (prüft einmal), `expect(loc)…` ohne `await`. Ein String in `toHaveText` gleicht Leerraum an, ein regulärer Ausdruck nicht: `\s` vor `€` (geschütztes Leerzeichen).

```ts title=playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,        // CI: ein Worker je Maschine, Tempo über Shards
  reporter: process.env.CI ? [['blob'], ['github']] : 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',                       // oder 'retain-on-first-failure'
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/stammkundin.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
```

```ts title=e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test'

setup('Stammkundin anmelden', async ({ page }) => {
  await page.goto('/anmelden')
  await page.getByLabel('E-Mail').fill('stammkundin@test.radwerk.de')
  await page.getByLabel('Passwort').fill(process.env.STAMMKUNDIN_PASSWORT!)
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page.getByRole('heading', { name: 'Hallo Stammkundin' })).toBeVisible()   // erst dann steht das Cookie
  await page.context().storageState({ path: 'playwright/.auth/stammkundin.json' })
})
```

| Aufgabe | Befehl / API |
| --- | --- |
| Gemeinsames Konto | nur für Tests, die nichts ändern; `playwright/.auth/` gehört in `.gitignore` |
| Abgemeldet starten | `test.use({ storageState: { cookies: [], origins: [] } })` |
| Eigene Kundin je Test | Fixture: `base.extend<{ kunde: Kunde }>({ kunde: async ({ page }, use) => { …; await use(kunde); /* Abbau */ } })` |
| Testdaten per API statt UI | `const antwort = await page.request.post('/api/test/reservierungen', { data: {…} })` · `await expect(antwort).toBeOK()`; `page.request` teilt die Cookies der Seite |
| Eindeutige Testdaten | `crypto.randomUUID()`; `testInfo.testId` ist in jedem Lauf und Retry gleich |
| Auf eine Antwort warten | `const zahlung = page.waitForResponse('**/zahlung')` vor dem Klick, `await zahlung` danach |
| Fremden Dienst abfangen | `await page.route('**/v1/zahlungen', (route) => route.fulfill({ json: { status: 'declined' } }))`; nicht die eigene API |
| Geteilte Ressource | `test('…', { lock: 'paystream-konto' }, async ({ page }) => { … })` (seit 1.63) |
| Retries erst am Ende | `retryStrategy: 'isolated'` (seit 1.62) |
| Interaktiv / debuggen | `npx playwright test --ui` · `--debug` · `--headed` |
| Nur zuletzt rote | `npx playwright test --last-failed` |
| Flakiness provozieren | `--repeat-each=20` · `--fail-on-flaky-tests` |
| Sharding | `npx playwright test --shard=2/4` · danach `npx playwright merge-reports --reporter html ./all-blob-reports` |
| Trace / Bericht | `npx playwright show-trace test-results/…/trace.zip` · `npx playwright show-report` |
| Code aufzeichnen | `npx playwright codegen http://localhost:4173` |
| `.only` in der CI verbieten | `forbidOnly: !!process.env.CI` bzw. `--forbid-only` |

[Authentication](https://playwright.dev/docs/auth) · [Fixtures](https://playwright.dev/docs/test-fixtures) · [Sharding](https://playwright.dev/docs/test-sharding) · [Trace Viewer](https://playwright.dev/docs/trace-viewer)

## Contract Testing mit Pact

[Pact-Doku](https://docs.pact.io/) · [can-i-deploy](https://docs.pact.io/pact_broker/can_i_deploy) · Python: pact-python v3

| Schritt | Wer | Was |
| --- | --- | --- |
| 1. Consumer-Test | Android-App bzw. Client | beschreibt Request und erwartete Antwort gegen den Pact-Mock-Server; Ergebnis: Pact-Datei (JSON) |
| 2. Veröffentlichen | CI des Consumers | `pact-broker publish pacts --consumer-app-version $SHA --branch $BRANCH` |
| 3. Provider-Verifikation | CI des Providers | spielt jede Interaktion gegen den echten Dienst ab; Provider States legen Daten an; Ergebnis mit `set_publish_options(version=…, branch=…)` an den Broker |
| 4. `can-i-deploy` | CI beider Seiten vor dem Deploy | `pact-broker can-i-deploy --pacticipant buchungs-api --version $SHA --to-environment production` |
| 5. Deployment melden | nach Deploy bzw. Store-Freigabe | API: `pact-broker record-deployment --pacticipant buchungs-api --version $SHA --environment production` · App: `record-release`, weil alte Versionen weiterlaufen |

```python
from pact import Pact, match

pact = Pact("radwerk-android", "buchungs-api").with_specification("V4")
(
    pact.upon_receiving("eine Reservierung für ein freies Rad")
    .given("Rad r-17 ist frei")                                   # Provider State
    .with_request("POST", "/reservierungen")
    .with_body({"rad_id": "r-17", "start": "2026-05-01T10:00:00+02:00"}, content_type="application/json")
    .will_respond_with(201)
    .with_body({"id": match.str("res-1"), "preis_cent": match.int(150)}, content_type="application/json")
)
with pact.serve() as server:
    antwort = BuchungsClient(str(server.url)).reserviere("r-17", "2026-05-01T10:00:00+02:00")
    assert antwort.preis_cent == 150
pact.write_file("pacts")
```

```python
from pact import Verifier

(
    Verifier("buchungs-api")
    .add_transport(url="http://localhost:8000")
    .add_source("pacts/")                         # oder .broker_source(url, token=…)
    .state_handler({"Rad r-17 ist frei": lege_freies_rad_an}, teardown=True)   # f(action, parameters)
    .verify()
)
```

Matcher (`match.int`, `match.str`, `match.regex`, `match.each_like`) prüfen Typ und Form, nicht konkrete Werte. Contract Tests prüfen keine Geschäftslogik.

## GitHub Actions

[Workflow-Syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) · [Service-Container](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers)

```yaml title=.github/workflows/ci.yml
name: CI
on:
  pull_request:
  merge_group:
  push:
    branches: [main]
concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.run_id }}
  cancel-in-progress: true
permissions:
  contents: read
jobs:
  statisch:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: astral-sh/setup-uv@v10.2.0
      - run: uv run --locked ruff check --output-format=github
      - run: uv run --locked ruff format --check
      - run: uv run --locked mypy
  tests:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:18
        env:
          POSTGRES_PASSWORD: postgres
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: astral-sh/setup-uv@v10.2.0                 # Python-Version aus requires-python bzw. .python-version
      - run: uv run --locked pytest -n auto --junitxml=reports/junit.xml --cov=radwerk --cov-branch
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: backend-reports
          path: reports/
```

```yaml title=.github/workflows/e2e.yml
jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build                               # für den webServer (npm run preview)
      - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1
  bericht:
    if: ${{ !cancelled() }}
    needs: [e2e]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - uses: actions/download-artifact@v8
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true
      - run: npx playwright merge-reports --reporter html ./all-blob-reports
      - uses: actions/upload-artifact@v7
        with:
          name: playwright-report-attempt-${{ github.run_attempt }}
          path: playwright-report
          retention-days: 14
```

| Baustein | Zweck |
| --- | --- |
| `concurrency` + `cancel-in-progress` | alter Lauf desselben PRs wird abgebrochen; `main` und Merge Queue nie (Gruppe aus `github.head_ref`, sonst `github.run_id`) |
| `merge_group` | Trigger der Merge Queue; ohne ihn meldet sie nie einen Check |
| `persist-credentials: false` | Checkout hinterlegt das Token nicht für spätere Git-Befehle |
| `timeout-minutes` | hängende Jobs beenden (Standard 360) |
| `strategy.fail-fast: false` | alle Matrix-Jobs laufen zu Ende, alle Fehler sichtbar |
| `if: ${{ !cancelled() }}` | Berichte auch nach roten Tests hochladen |
| `permissions: contents: read` | `GITHUB_TOKEN` minimal |
| Required Status Checks + Merge Queue | Branch-Schutz: nur grüne PRs, gegen aktuellen `main` geprüft |
| `pull_request_target` | läuft mit Secrets im Kontext des Basis-Repos – nie fremden PR-Code darin auschecken und ausführen |
| `schedule: - cron: "17 2 * * *"` | Nightly, nicht zur vollen Stunde: lange Property-Läufe, volle E2E-Suite, Mutation Testing |

## Ruff und mypy

[Ruff-Regeln](https://docs.astral.sh/ruff/rules/) · [Default Rules](https://docs.astral.sh/ruff/default-rules/) · [Ruff-Einstellungen](https://docs.astral.sh/ruff/settings/) · [mypy-Konfiguration](https://mypy.readthedocs.io/en/stable/config_file.html)

```toml title=pyproject.toml
[tool.ruff]
line-length = 100
target-version = "py314"

[tool.ruff.lint]                       # Ruff 0.16 aktiviert schon 413 Regeln (Default Rules)
extend-select = ["S", "PT"]            # dazu alle Sicherheits- und pytest-Regeln

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101"]                  # assert ist in Tests gewollt

[tool.ruff.lint.flake8-pytest-style]
parametrize-names-type = "csv"         # "minuten, cent" statt ("minuten", "cent")

[tool.mypy]
python_version = "3.14"
files = ["src", "tests"]
strict = true
warn_unreachable = true

[[tool.mypy.overrides]]
module = ["radwerk.altbestand.*"]      # Altcode: erst einmal ausnehmen, Modul für Modul aufnehmen
ignore_errors = true
```

| Befehl | Wirkung |
| --- | --- |
| `ruff check` · `ruff check --fix` · `ruff check --fix --unsafe-fixes` | prüfen · sichere Autofixes · auch unsichere (Diff ansehen) |
| `ruff check --statistics` | Treffer je Regel – Grundlage für die Einführung |
| `ruff check --add-noqa="Altbestand, Ticket RW-311"` | Baseline: bestehende Treffer mit Begründung markieren |
| `ruff format` · `ruff format --check` | formatieren · in der CI nur prüfen |
| `ruff rule S608` | Erklärung einer Regel |
| `# noqa: S311  # nur für Testdaten-Seeds` | gezielt und begründet ausnehmen |
| `# ruff: ignore[S311]` | seit 0.16, am Zeilenende oder in der Zeile davor |
| `mypy` · `mypy --strict src/radwerk/tarif.py` | Projekt prüfen · einzelne Datei strikt |
| `# type: ignore[arg-type]` | gezielt, mit Fehlercode; `warn_unused_ignores` (in `strict`) meldet überflüssige |
| `reveal_type(x)` | Typ an einer Stelle anzeigen lassen |

| Werkzeug | Findet | Findet nicht |
| --- | --- | --- |
| Linter (Ruff, ESLint) | Stilfehler, verdächtige Muster, ungenutzte Namen, einfache Sicherheitsmuster | falsche Geschäftslogik |
| Typchecker (mypy, pyright, `tsc --strict`) | falsche Typen an Grenzen, `None`-Zugriffe, vergessene Fälle | falsche Werte desselben Typs (Euro statt Cent als `int`) |
| SAST (Ruff `S`, Bandit, Semgrep, CodeQL) | SQL-Injection-Muster, `shell=True`, schwache Krypto | Logiklücken in der Autorisierung |
| Abhängigkeiten (pip-audit, `npm audit`, Dependabot) | bekannte CVEs in Paketen | Lücken im eigenen Code |

## Roter Test: Vorgehen

| Schritt | Fragen und Werkzeuge |
| --- | --- |
| 1. Lesen | Welcher Test, welche Zeile, welcher Diff? `-vv`, `-l`, `--tb=long`; erste Fehlermeldung zuerst |
| 2. Reproduzieren | `pytest "tests/test_tarif.py::test_preis[31-300]"` · `--lf -x` · gleiche Seeds, gleiche Umgebung |
| 3. Hypothese | Test falsch? Code falsch? Umgebung anders? Eine Annahme nach der anderen prüfen |
| 4. Eingrenzen | Eingabe verkleinern, `breakpoint()`, `--pdb`, `caplog`/`capsys`, `git bisect run` |
| 5. Beheben | erst ein Test, der den Fehler zeigt (rot), dann der Fix (grün), dann die ganze Suite |

```bash
cp tests/test_tarif.py ..                  # der neue Test fehlt in alten Commits
git bisect start HEAD v2.4.0
git bisect run sh -c 'uv run --frozen python -m pytest -x -q ../test_tarif.py; s=$?; [ $s -le 1 ] && exit $s; exit 125'
git bisect reset                           # Bisect: 0 gut, 125 überspringen, 1–127 schlecht; pytest 2–5 → 125
```

| Nur in der CI rot | Lokal nachstellen |
| --- | --- |
| Zeitzone | `TZ=UTC pytest` |
| Locale | `LC_ALL=C.UTF-8 pytest` |
| Reihenfolge, geteilter Zustand | `pytest --randomly-seed=<Seed aus dem CI-Log>` (pytest-randomly) |
| Parallelität | `pytest -n 4` |
| Versionen | `uv sync --locked`, gleiche Python-Version wie die Matrix |
| Umgebungsvariablen | `env -i HOME=$HOME PATH=$PATH uv run pytest` |
| Groß-/Kleinschreibung im Dateisystem | Linux-CI vs. macOS lokal: Importe und Dateinamen prüfen |
| Langsame Maschine, Timeouts | `--durations=20`, Timeouts großzügig, auf Zustände statt Zeit warten |

## Flaky Tests: Ursache → Lösung

| Ursache | Symptom | Lösung |
| --- | --- | --- |
| Echte Uhr (`now()`, Mitternacht, Sommerzeit) | rot um 0 Uhr, am Monatsende, Ende März | Uhr injizieren; feste Zeitpunkte an der Grenze testen |
| Zeitzone der Maschine | rot nur in der CI | `ZoneInfo("Europe/Berlin")` explizit, aware `datetime` |
| Reihenfolge, geteilter Zustand | rot nur mit anderen Tests zusammen | Isolation: frische Fixtures, Rollback je Test, keine Modul-Globals; `pytest-randomly` |
| Zufall ohne Seed | selten rot, nicht reproduzierbar | Seed als Parameter, `random.Random(42)`; Hypothesis statt Eigenbau |
| Async, Threads, Polling | rot unter Last | auf Zustand warten (`findBy…`, web-first Assertions), nie feste Pausen |
| Netzwerk, externe Dienste | Timeout, 503 | Fake oder MSW; echte Dienste nur in eigenen, nicht blockierenden Suites |
| Ports, Dateien, Temp-Verzeichnisse | „Address already in use“ | Port `0`, `tmp_path`, eindeutige Namen |
| Parallele Läufe, gemeinsame Testdaten | Konflikte unter `-n auto` / Sharding | eindeutige Testdaten je Test (`uuid4`), eigene DB je Worker |
| Gleitkomma, Mengen-/Dict-Reihenfolge | Abweichung in letzter Stelle, andere Reihenfolge | `pytest.approx`, sortieren, Cent als `int` |
| UI-Animationen, Ladezeiten | Element „nicht sichtbar“ | Locator + web-first Assertion, `trace: 'on-first-retry'` |

| Maßnahme | Regel |
| --- | --- |
| Erkennen | `pytest --count=50 -x` · `npx playwright test --repeat-each=20` · CI-Statistik je Test über JUnit-XML |
| Retries | nur sichtbar (Playwright: „flaky“ im Bericht; pytest-rerunfailures mit `--fail-on-flaky`), nur für teure E2E-Tests; kein Ersatz für die Ursache |
| Quarantäne | eigener Marker, nicht blockierend, Ticket mit Verantwortlichem und Frist; Liste begrenzt |
| Messen | Flake-Rate je Test und Woche; Ziel: sinkt |
