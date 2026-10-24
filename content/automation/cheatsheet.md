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
| Excel | Blatt über Namen, Spalten über Kopfzeile, Formeln werden nicht berechnet, fremden Text als Text |
| HTML-Bericht | Fremden Text escapen, keine ungeprüften HTML-Fragmente übernehmen |

## Excel mit openpyxl

```python
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font

buch = Workbook()
ws = buch.active
ws.title = "Bericht"
ws.append(["Posten", "Betrag"])
ws["A1"].font = Font(bold=True)
ws.append(["Miete", 950])
ws["B2"].number_format = "#,##0.00"
ws["A3"], ws["B3"] = "Summe", "=SUM(B2:B2)"
ws.freeze_panes = "A2"
buch.create_sheet("Fehler")
buch.save("bericht.xlsx")              # überschreibt ohne Rückfrage

ws = load_workbook("ein.xlsx")["Eingang"]   # über den Namen, nicht active
kopf, *zeilen = ws.values
```

| Falle | Abhilfe |
| --- | --- |
| `buch.active` ist eine Position | Blätter über `buch["Name"]` ansprechen |
| Formel wird nicht berechnet | `data_only=True` liest nur gespeicherte Ergebnisse; Summen in Python rechnen |
| Formeln in der Datei | englische Namen, Kommas: `=SUM(B2:B9)` (deutsches Excel zeigt `SUMME`) |
| Text beginnt mit `=` | nach Zuweisung `zelle.data_type = "s"` |
| Beträge als `"120,50 €"` | Zahl schreiben, `number_format` setzen |
| Original überschrieben | neue Datei schreiben; openpyxl verliert Formen beim Speichern |

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

## Authentifizierung

| Verfahren | Header | Merke |
| --- | --- | --- |
| API-Key | z. B. `X-API-Key: …` | nie als Query-Parameter |
| Basic | `Authorization: Basic base64(user:pass)` | nur mit TLS, kein `:` im Nutzer |
| Bearer | `Authorization: Bearer <token>` | Token = Passwort mit Ablaufdatum |
| OAuth `client_credentials` | Token per POST an Token-Endpunkt | kein Refresh-Token, neu anfragen |
| OAuth Refresh | `grant_type=refresh_token` | rotiertes Token sofort atomar speichern |

```python
def rufe(anfrage, token):
    r = anfrage(token.aktuell())
    if r.status != 401:
        return r                       # 403 nie mit neuem Token beantworten
    token.verwerfen()
    r = anfrage(token.aktuell())       # genau einmal wiederholen
    if r.status == 401:
        raise AuthFehler("401")
    return r
```

```python
mac = hmac.new(geheim, roh, hashlib.sha256)            # Rohdaten, nicht json.dumps(...)
soll = "sha256=" + mac.hexdigest()
ok = hmac.compare_digest(soll.encode(), kopf.encode())  # Bytes, konstante Zeit
```

`invalid_grant` → neu anmelden, kein Retry. Token-Cache: erneuern, wenn `uhr() + puffer >= ablauf`.

## Fehlerfälle im Test

```python
class Uhr:                     # Fake: schlafe() stellt die Uhr vor
    def __init__(self): self.t = 0.0
    def __call__(self): return self.t
    def schlafe(self, s): self.t += s

pause = zufall() * min(8, 2 ** versuch)        # Full Jitter
if uhr() + pause > ende: raise TimeoutError()  # Deadline vor dem Schlafen prüfen
```

| Muster | Kern |
| --- | --- |
| Retry nach Status | 429, 502, 503, 504 ja; 400, 401, 403, 404, 422 nein |
| Retry-After | Ziffern = Sekunden, sonst `email.utils.parsedate_to_datetime`, min. 0 |
| Lockfile | `os.open(p, O_CREAT \| O_EXCL \| O_WRONLY)`; nur eigene Sperre löschen |
| flock | `fcntl.flock(f, LOCK_EX \| LOCK_NB)` → `BlockingIOError`; verschwindet mit dem Prozess |
| Checkpoint | nach der Wirkung, atomar mit `os.replace`; kaputte Datei → anhalten |
| Deduplizierung | `UNIQUE` + `INSERT OR IGNORE`, `cursor.rowcount == 1` heißt neu; committen |

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

## Postfach und Kalender

```python
ctx = ssl.create_default_context()                 # ohne: Zertifikat ungeprüft
with imaplib.IMAP4_SSL(HOST, ssl_context=ctx, timeout=30) as imap:
    imap.login(USER, PASSWORT)
    imap.select("INBOX")                           # UIDVALIDITY merken
    typ, daten = imap.uid("SEARCH", None, "UNKEYWORD", "$Verarbeitet")
    for uid in daten[0].split():
        typ, teile = imap.uid("FETCH", uid, "(BODY.PEEK[])")   # kein \Seen
        roh = next(t[1] for t in teile if isinstance(t, tuple))
        verarbeite(roh)
        imap.uid("STORE", uid, "+FLAGS", "($Verarbeitet)")    # erst nach Erfolg
```

| Thema | Regel |
| --- | --- |
| Anhangname | `Path(name).name`, nur `[A-Za-z0-9._-]`, führende Punkte weg, nie überschreiben |
| Anhang senden | `mail.add_attachment(daten, maintype="application", subtype="pdf", filename=…)` |
| ICS-Datei | CRLF, `VERSION:2.0`, `PRODID`; `VEVENT` mit `UID`, `DTSTAMP`, `DTSTART` |
| ICS-Text | `\` → `\\`, `;` → `\;`, `,` → `\,`, Umbruch → `\n` (Backslash zuerst) |
| ICS-Faltung | höchstens 75 Bytes je Zeile, Fortsetzung mit Leerzeichen; beim Lesen zuerst entfalten |
| Google Calendar | `syncToken`, gelöschte Termine `cancelled`, 410 → alles neu laden |
| Microsoft Graph | `calendarView/delta`, `@odata.nextLink` / `@odata.deltaLink` |

## Logs und Geheimnisse

```python
lauf_id = contextvars.ContextVar("lauf_id", default="-")

class LaufFilter(logging.Filter):
    def filter(self, r):
        r.lauf = lauf_id.get()
        return True

h = RotatingFileHandler("job.log", maxBytes=1_000_000, backupCount=5)  # 0 = nie rotieren
h.addFilter(LaufFilter())       # am Handler, sonst fehlen Kind-Logger
lauf_id.set(os.environ.get("INVOCATION_ID", uuid.uuid4().hex[:12]))
```

| Quelle | Wofür |
| --- | --- |
| keyring | Skripte am Desktop: `keyring.get_password(dienst, name)` → `None` |
| `.env` + python-dotenv | Entwicklung; `load_dotenv()` überschreibt nichts; Datei in `.gitignore` |
| `LoadCredential=api_token` | systemd-Dienst, Datei aus `/etc/credstore/`, lesen unter `$CREDENTIALS_DIRECTORY` |
| `Environment=` / `EnvironmentFile=` | nur Einstellungen, keine Geheimnisse (über D-Bus sichtbar) |
| `${{ secrets.NAME }}` | Actions, als `env:` an einzelne Schritte; nicht in Forks |

Leak: widerrufen → ersetzen → Audit-Log prüfen → entfernen → Ursache abstellen.

## Playwright im Betrieb

```python
context.storage_state(path="playwright/.auth/state.json")    # wie ein Passwort behandeln
context = browser.new_context(storage_state="playwright/.auth/state.json")

with page.expect_response("**/api/kurse") as info:            # warten mit Ziel
    page.get_by_role("button", name="Laden").click()
expect(page.get_by_role("row")).to_have_count(12, timeout=10_000)

context.tracing.start(screenshots=True, snapshots=True)
try:
    lauf(page)
except Exception:
    page.screenshot(path="fehler.png", full_page=True)
    context.tracing.stop(path="trace.zip")                     # playwright show-trace trace.zip
    raise
else:
    context.tracing.stop()

page.route("**/api/kurse", lambda r: r.fulfill(json=KURSE))  # Glob trifft die ganze URL
```

Timeouts: Aktionen 30 s (`set_default_timeout`), `expect` 5 s. `click` wirft `TimeoutError`, `expect` wirft `AssertionError`. Nie `wait_for_timeout` im Betrieb.

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

[pathlib](https://docs.python.org/3/library/pathlib.html) · [subprocess](https://docs.python.org/3/library/subprocess.html) · [logging](https://docs.python.org/3/library/logging.html) · [csv](https://docs.python.org/3/library/csv.html) · [Regex](https://docs.python.org/3/library/re.html) · [HTTPX](https://www.python-httpx.org/advanced/timeouts/) · [systemd.timer](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html) · [zoneinfo](https://docs.python.org/3/library/zoneinfo.html) · [uv](https://docs.astral.sh/uv/) · [openpyxl](https://openpyxl.readthedocs.io/en/stable/tutorial.html) · [RFC 6749 OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749.html) · [hmac](https://docs.python.org/3/library/hmac.html) · [imaplib](https://docs.python.org/3/library/imaplib.html) · [RFC 5545 iCalendar](https://www.rfc-editor.org/rfc/rfc5545.html) · [contextvars](https://docs.python.org/3/library/contextvars.html) · [systemd Credentials](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html#Credentials) · [Playwright Trace Viewer](https://playwright.dev/python/docs/trace-viewer)
