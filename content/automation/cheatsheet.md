## Dateien und Pfade

| Operation | Werkzeug | Beachten |
| --- | --- | --- |
| Pfad zusammensetzen | `base / 'report.json'` | Absolute rechte Seite kann die Basis ersetzen |
| Text lesen | `path.read_text(encoding='utf-8')` | Fehler gezielt behandeln |
| Text schreiben | `path.write_text(text, encoding='utf-8')` | Überschreibt vorhandenen Inhalt |
| Verzeichnis anlegen | `path.mkdir(parents=True, exist_ok=True)` | Rechte und Zielbereich prüfen |
| Dateien finden | `path.glob('*.csv')` | Reihenfolge bei Bedarf sortieren |
| Datei kopieren | `shutil.copy2(source, target)` | Überschreibverhalten bewusst wählen |
| Pfad verschieben | `shutil.move(source, target)` | Über Dateisystemgrenzen nicht pauschal atomar |
| Datei ersetzen | `os.replace(temp, target)` | Gleiches Dateisystem; Dauerhaftigkeit separat betrachten |

```python
from pathlib import Path

base = Path("testdaten")
plan = [(source, base / "csv" / source.name)
        for source in sorted(base.glob("*.csv")) if not source.is_symlink()]
for source, target in plan:
    print(f"{source} -> {target}")  # reine Vorschau
```

## CLI, Konfiguration und Logging

```python
import argparse
import logging

parser = argparse.ArgumentParser(description="Testdaten verarbeiten")
parser.add_argument("source")
parser.add_argument("--apply", action="store_true")
parser.add_argument("--limit", type=int, default=100)
# Lokal im CLI: args = parser.parse_args()
args = parser.parse_args(["testdaten", "--limit", "20"])
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logging.info("Start: limit=%s apply=%s", args.limit, args.apply)
```

| Kanal | Inhalt |
| --- | --- |
| stdout | Weiterverarbeitbares Ergebnis |
| stderr | Diagnose und Fehlermeldungen |
| Exit-Code 0 | Erfolgreicher Ablauf, auch mit leerem Ergebnis nach Vertrag |
| Andere Exit-Codes | Dokumentierte Fehlerklassen |
| Konfiguration | Defaults → Datei → Umgebung → explizite CLI-Werte |
| Geheimnisse | Laufzeitquelle; nie komplettes Konfigurationsobjekt loggen |

## Externe Prozesse

Lokal ausführen; im Browser-Python sind keine Unterprozesse verfügbar.

```python
import subprocess

result = subprocess.run(
    ["git", "status", "--short"],
    check=True,
    capture_output=True,
    text=True,
    timeout=10,
)
print(result.stdout)
```

| Muster | Bewertung |
| --- | --- |
| `['tool', '--', filename]` | Argumentgrenze, sofern das Werkzeug `--` unterstützt |
| `shell=False` | Keine Shell-Auswertung von Argumenten |
| `shell=True` mit fremd zusammengesetztem Text | Injection-Risiko |
| `capture_output=True` | Ausgabe wird im Speicher gesammelt; begrenzen |
| `check=True` | Fehlercode wird als Exception sichtbar |
| `timeout=...` | Ausführungsgrenze definieren |

## Datenformate

```python
import csv
import io
import json
import tomllib

rows = list(csv.DictReader(io.StringIO("id,title\n1,Üben\n")))
text = json.dumps(rows, ensure_ascii=False, indent=2)
config = tomllib.loads('[job]\nlimit = 20\n')
assert config["job"]["limit"] == 20
```

```python
import yaml
config = yaml.safe_load("limit: 20\n")
if not isinstance(config, dict) or not isinstance(config.get("limit"), int):
    raise ValueError("limit muss eine Ganzzahl sein")
```

| Grenze | Prüfung |
| --- | --- |
| CSV | Encoding, Trennzeichen, Quotes, Kopfzeile, Typkonvertierung |
| JSON | Syntax, danach Wurzeltyp, Pflichtfelder, Wertebereiche |
| YAML | Safe Loader, danach Schema und Größenlimits |
| Excel | Zelltypen, leere Zellen, führende Nullen; separater lokaler Adapter |
| HTML-Bericht | Fremden Text escapen, keine ungeprüften HTML-Fragmente übernehmen |

## Reguläre Ausdrücke

| Muster | Bedeutung |
| --- | --- |
| `r'\d+'` | Eine oder mehr Dezimalziffern; Unicode beachten |
| `r'[0-9]+'` | ASCII-Ziffern |
| `r'\s+'` | Leerraum |
| `r'[^,]+'` | Zeichen außer Komma; kein allgemeiner CSV-Parser |
| `r'(?P<id>[0-9]+)'` | Benannte Gruppe |
| `re.fullmatch(pattern, text)` | Ganze Eingabe prüfen |
| `re.search(pattern, text)` | Treffer irgendwo suchen |
| `re.escape(text)` | Literalen Text für ein Muster escapen |

```python
import re
match = re.fullmatch(r"ticket-(?P<id>[0-9]+)", "ticket-42")
if match:
    print(int(match.group("id")))
```

## HTTP und Wiederholungen

Lokales HTTP-Beispiel; mit echten Diensten nur im vorgesehenen Testkonto verwenden.

```python
import httpx

with httpx.Client(timeout=httpx.Timeout(10.0, connect=3.0)) as client:
    response = client.get("https://example.com/api/items")
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, list):
        raise ValueError("Liste erwartet")
```

| Status / Ereignis | Nächster Schritt |
| --- | --- |
| 2xx | Inhalt weiter validieren |
| 401 / 403 | Authentifizierung beziehungsweise Berechtigung prüfen |
| 404 | Ziel/Vertrag prüfen, nicht blind wiederholen |
| 429 | Rate Limit, Diensthinweis und Gesamtbudget beachten |
| 5xx / temporärer Netzfehler | Nur geeignete Operationen begrenzt wiederholen |
| Timeout bei Mutation | Ausgang möglicherweise ungewiss; Idempotenzvertrag prüfen |

```python
import random

def retry_delays(attempts: int, cap: float = 30.0) -> list[float]:
    return [random.uniform(0, min(cap, 2 ** attempt))
            for attempt in range(attempts)]
```

## Zeitplanung

| cron-Feld | Bedeutung |
| --- | --- |
| 1 | Minute |
| 2 | Stunde |
| 3 | Tag im Monat |
| 4 | Monat |
| 5 | Wochentag |
| `17 8 * * 1-5` | Werktags um 08:17 in der für den Scheduler geltenden Zone |

```ini title=digest.timer
[Unit]
Description=Täglicher Digest

[Timer]
OnCalendar=*-*-* 08:17:00 Europe/Berlin
Persistent=true

[Install]
WantedBy=timers.target
```

Passende `digest.service` benötigt `[Service]`, `Type=oneshot` und einen absoluten `ExecStart` zum eingerichteten Job. `Persistent=true` holt beim Aktivieren einen verpassten Kalendertermin nach, nicht jede einzelne ausgefallene Periode.

```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

instant = datetime(2026, 9, 28, 6, 17, tzinfo=timezone.utc)
local = instant.astimezone(ZoneInfo("Europe/Berlin"))
print(local.isoformat())
```

## GitHub Actions: minimaler Zeitplan

```yaml title=.github/workflows/digest.yml
name: Digest
on:
  workflow_dispatch:
  schedule:
    - cron: '17 6 * * *'
permissions:
  contents: read
concurrency:
  group: digest
  cancel-in-progress: false
jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - run: echo 'Hier Checkout, festgelegte Laufzeit und getesteten Job einbinden'
```

Das ist ein Zeitplan-Gerüst, noch kein lauffähiger Digest. Für den eigenen Workflow Actions-Referenzen prüfen und festlegen, Lockfile verwenden, Zustand zwischen Runnern bewusst speichern und fehlende Erfolge überwachen. Ohne zusätzliche Zeitzonen-Konfiguration ist UTC der Ausgangspunkt; Details anhand der aktuellen [Schedule-Dokumentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) prüfen.

## Werkzeuge und Betriebsvertrag

```bash
uv init
uv add httpx pyyaml
uv add --dev pytest ruff
uv sync --locked
uv run pytest
uv run ruff check .
pipx run --spec package-name command-name
```

`package-name` und `command-name` sind Platzhalter für ein geprüftes CLI-Paket. Nicht als Abhängigkeit für ein Projekt verwenden; dort die Version im Projekt festlegen.

| Vor Betrieb klären | Beleg |
| --- | --- |
| Wiederholung | Derselbe Eingang erzeugt keine ungewollte Doppelwirkung |
| Wiederanlauf | Test vor/nach jedem wichtigen Persistenzschritt |
| Parallelstart | Sperr-/Concurrency-Vertrag |
| Beobachtbarkeit | Letzter Start, letzter Erfolg, Fehlergrund |
| Rücknahme | Gesicherter Zustand, Journal oder dokumentierter manueller Weg |
| KI-Erweiterung | Ausgabevalidierung, Budget, begrenzte Rechte, Fallback |

## Offizielle Referenzen

[pathlib](https://docs.python.org/3/library/pathlib.html) · [subprocess](https://docs.python.org/3/library/subprocess.html) · [logging](https://docs.python.org/3/library/logging.html) · [csv](https://docs.python.org/3/library/csv.html) · [Regex](https://docs.python.org/3/library/re.html) · [HTTPX](https://www.python-httpx.org/advanced/timeouts/) · [systemd.timer](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html) · [zoneinfo](https://docs.python.org/3/library/zoneinfo.html) · [uv](https://docs.astral.sh/uv/)
