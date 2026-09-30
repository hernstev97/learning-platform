## Excel-Funktionen deutsch ↔ englisch

Argumente mit `;` trennen, Dezimalkomma. Spalte „Ab“: erste Excel-Version mit der Funktion, „365“ nur Microsoft 365; leer heißt in allen aktuellen Versionen. [Alle Funktionen](https://support.microsoft.com/de-de/excel/excel-functions-alphabetical)

| Deutsch | Englisch | Ab | Zweck |
| --- | --- | --- | --- |
| `XVERWEIS` | `XLOOKUP` | 2021 | Suchen, exakt als Standard; `[wenn_nicht_gefunden]` |
| `SVERWEIS` | `VLOOKUP` | | Alte Suche; immer 4. Argument `FALSCH` |
| `INDEX` | `INDEX` | | Wert an Zeilen-/Spaltenposition |
| `VERGLEICH` | `MATCH` | | Position eines Werts; `0` = exakt |
| `XVERGLEICH` | `XMATCH` | 2021 | Position, exakt als Standard |
| `WENN` | `IF` | | Bedingung |
| `WENNS` | `IFS` | 2019 | Mehrere Bedingungen ohne Verschachtelung |
| `WENNFEHLER` | `IFERROR` | | Fängt **jeden** Fehler ab – sparsam |
| `WENNNV` | `IFNA` | 2013 | Fängt nur `#NV` ab |
| `SUMMEWENNS` | `SUMIFS` | | Summe mit Bedingungen |
| `ZÄHLENWENNS` | `COUNTIFS` | | Anzahl mit Bedingungen |
| `MITTELWERTWENNS` | `AVERAGEIFS` | | Mittelwert mit Bedingungen |
| `MAXWENNS` / `MINWENNS` | `MAXIFS` / `MINIFS` | 2019 | Maximum/Minimum mit Bedingungen |
| `SUMMENPRODUKT` | `SUMPRODUCT` | | Summe von Produkten, gewichtete Summen |
| `ANZAHL` / `ANZAHL2` | `COUNT` / `COUNTA` | | Zahlen / nicht leere Zellen – Vergleich zeigt Text-Zahlen |
| `TEILERGEBNIS` | `SUBTOTAL` | | Aggregat ohne herausgefilterte Zeilen; `9` = Summe, `109` = Summe ohne ausgeblendete Zeilen |
| `MITTELWERT` | `AVERAGE` | | Arithmetisches Mittel |
| `MEDIAN` | `MEDIAN` | | Mittlerer Wert |
| `STABW.S` / `STABW.N` | `STDEV.S` / `STDEV.P` | 2010 | Standardabweichung Stichprobe (n − 1) / Grundgesamtheit (n) |
| `QUANTIL.INKL` / `QUARTILE.INKL` | `PERCENTILE.INC` / `QUARTILE.INC` | 2010 | Quantil / Quartil, wie pandas `quantile()` |
| `KORREL` | `CORREL` | | Korrelationskoeffizient |
| `RANG.GLEICH` | `RANK.EQ` | 2010 | Rang, Gleichstand teilt den Rang |
| `GLÄTTEN` | `TRIM` | | Leerzeichen am Rand und doppelte entfernen |
| `SÄUBERN` | `CLEAN` | | Nicht druckbare Zeichen entfernen |
| `WECHSELN` | `SUBSTITUTE` | | Text ersetzen |
| `LINKS` / `RECHTS` / `TEIL` | `LEFT` / `RIGHT` / `MID` | | Zeichen ausschneiden |
| `TEXTVOR` / `TEXTNACH` | `TEXTBEFORE` / `TEXTAFTER` | 2024 | Text vor/nach einem Trennzeichen |
| `TEXTTEILEN` | `TEXTSPLIT` | 2024 | Text in Spalten/Zeilen aufteilen |
| `TEXTVERKETTEN` | `TEXTJOIN` | 2019 | Werte mit Trennzeichen verbinden |
| `TEXT` | `TEXT` | | Zahl/Datum als Text; Formatcodes deutsch: `"TT.MM.JJJJ"`, `"JJJJ-MM"` |
| `ZAHLENWERT` | `NUMBERVALUE` | 2013 | Text → Zahl mit angegebenen Trennzeichen |
| `DATUM` | `DATE` | | Datum aus Jahr, Monat, Tag |
| `JAHR` / `MONAT` | `YEAR` / `MONTH` | | Teile eines Datums |
| `MONATSENDE` | `EOMONTH` | | Letzter Tag eines Monats (`0` = gleicher Monat) |
| `EDATUM` | `EDATE` | | Datum ± n Monate |
| `NETTOARBEITSTAGE` | `NETWORKDAYS` | | Arbeitstage zwischen zwei Daten, beide eingeschlossen |
| `ISOKALENDERWOCHE` | `ISOWEEKNUM` | 2013 | Kalenderwoche nach ISO 8601 |
| `HEUTE` | `TODAY` | | Heutiges Datum – in Berichten besser ein Stichtag |
| `FILTER` | `FILTER` | 2021 | Zeilen nach Bedingung, läuft über |
| `EINDEUTIG` | `UNIQUE` | 2021 | Eindeutige Werte |
| `SORTIEREN` / `SORTIERENNACH` | `SORT` / `SORTBY` | 2021 | Sortieren nach Position / nach anderem Bereich |
| `LET` | `LET` | 2021 | Zwischenergebnissen Namen geben |
| `GRUPPIERENNACH` | `GROUPBY` | 365 | Gruppieren und aggregieren als Formel |
| `PIVOTMIT` | `PIVOTBY` | 365 | Kreuztabelle als Formel |
| `PIVOTDATENZUORDNEN` | `GETPIVOTDATA` | | Wert aus einer PivotTable |

```excel
=XVERWEIS([@artikel_nr];Artikel[artikel_nr];Artikel[kategorie];"fehlt")
=SUMMEWENNS(Umsatz[netto];Umsatz[region];"Nord";Umsatz[datum];">="&DATUM(2026;3;1);Umsatz[datum];"<="&MONATSENDE(DATUM(2026;3;1);0))
=LET(netto;[@menge]*[@einzelpreis]*(1-[@rabatt]);RUNDEN(netto;2))
=GRUPPIERENNACH(Umsatz[region];Umsatz[netto];SUMME)
=ZAHLENWERT("1.234,50";",";".")
```

**Fehlerwerte:** `#NV` nicht gefunden · `#WERT!` falscher Typ (oft Text statt Zahl) · `#BEZUG!` gelöschter Bezug · `#DIV/0!` Division durch null · `#NAME?` unbekannter Name, Tippfehler in der Funktion · `#ÜBERLAUF!` Überlaufbereich blockiert · `#ZAHL!` ungültige Zahl.

## Bezüge und strukturierte Verweise

| Schreibweise | Bedeutung |
| --- | --- |
| `A1` | Relativ: wandert beim Kopieren mit |
| `$A$1` | Absolut: bleibt fest (F4 schaltet um) |
| `$A1` / `A$1` | Spalte fest / Zeile fest – für Kreuztabellen |
| `Rabattsatz` | Name für eine Zelle oder einen Bereich (Formeln › Namens-Manager) |
| `F2#` | Ganzer Überlaufbereich einer Formel in F2 |
| `Umsatz[Betrag]` | Datenbereich der Spalte `Betrag` der Tabelle `Umsatz` |
| `[@Menge]` | Wert der aktuellen Zeile, innerhalb der Tabelle |
| `Umsatz[@[Preis netto]]` | Spaltenname mit Leerzeichen oder Sonderzeichen in doppelten Klammern |
| `Umsatz[[Menge]:[Rabatt]]` | Mehrere zusammenhängende Spalten |
| `Umsatz[[Betrag]:[Betrag]]` | Spalte, die beim Kopieren nach rechts nicht mitwandert |
| `Umsatz[[#Kopfzeilen];[Betrag]]` | Überschriftszelle |
| `Umsatz[[#Ergebnisse];[Betrag]]` | Zelle der Ergebniszeile |
| `Umsatz[[#Alle];[Betrag]]` | Spalte mit Kopf, Daten und Ergebniszeile |

Start › Als Tabelle formatieren; Name unter Tabellenentwurf › Tabellenname. Berechnete Spalte: Formel einmal eingeben, sie gilt für die ganze Spalte. Überlaufende Formeln funktionieren nicht innerhalb einer Tabelle. [Strukturierte Verweise](https://support.microsoft.com/de-de/excel/using-structured-references-with-excel-tables)

## PivotTable-Handgriffe

| Aufgabe | Weg |
| --- | --- |
| Anlegen | Einfügen › PivotTable, Quelle = intelligente Tabelle |
| Summe statt Anzahl | Wertfeldeinstellungen › Werte zusammenfassen nach › Summe; „Anzahl“ heißt meist: Text in der Spalte |
| Anteile | Wertfeldeinstellungen › Werte anzeigen als › % des Gesamtergebnisses / % des Zeilengesamtergebnisses |
| Vormonat | Werte anzeigen als › Differenz von (Basisfeld Datum, Basiselement Vorheriger) |
| Monate | Rechtsklick auf Datum › Gruppieren › Monate und Jahre |
| Top N | Zeilenbeschriftungen › Wertefilter › Top 10 … |
| Filter zum Klicken | PivotTable-Analyse › Datenschnitt einfügen / Zeitachse einfügen |
| Neue Daten | Daten › Alle aktualisieren; bei festem Quellbereich: PivotTable-Analyse › Datenquelle ändern |

## Power Query: Schritte und M-Funktionen

| Aufgabe | Im Editor | M |
| --- | --- | --- |
| CSV lesen | Daten › Aus Text/CSV | `Csv.Document(File.Contents(pfad), [Delimiter=";", Encoding=1252])` |
| Alle Dateien eines Ordners | Daten › Daten abrufen › Aus Datei › Aus Ordner › Kombinieren | `Folder.Files(pfad)` |
| Tabelle der Mappe | Daten › Aus Tabelle/Bereich | `Excel.CurrentWorkbook(){[Name="Artikel"]}[Content]` |
| Kopfzeile | Start › Erste Zeile als Überschriften verwenden | `Table.PromoteHeaders(t, [PromoteAllScalars=true])` |
| Vorspann entfernen | Start › Zeilen entfernen › Oberste Zeilen entfernen | `Table.Skip(t, 3)` |
| Typ mit Gebietsschema | Rechtsklick › Typ ändern › Mit Gebietsschema … | `Table.TransformColumnTypes(t, {{"betrag", type number}}, "de-DE")` |
| Zeilen filtern | Filterpfeil im Spaltenkopf | `Table.SelectRows(t, each [status] = "bezahlt")` |
| Spalten entfernen / umbenennen | Start › Spalten entfernen / Doppelklick auf Kopf | `Table.RemoveColumns` / `Table.RenameColumns` |
| Text trimmen | Transformieren › Format › Kürzen | `Table.TransformColumns(t, {{"stadt", Text.Trim, type text}})` |
| Werte ersetzen | Transformieren › Werte ersetzen | `Table.ReplaceValue` |
| Spalte teilen | Transformieren › Spalte teilen › Nach Trennzeichen | `Table.SplitColumn` |
| Monatsspalten in Zeilen | Transformieren › Andere Spalten entpivotieren | `Table.UnpivotOtherColumns(t, {"produkt"}, "Attribut", "Wert")` |
| Berechnete Spalte | Spalte hinzufügen › Benutzerdefinierte Spalte | `Table.AddColumn(t, "netto", each [menge] * [einzelpreis] * (1 - [rabatt]), type number)` |
| Gruppieren | Start › Gruppieren nach | `Table.Group(t, {"region"}, {{"umsatz", each List.Sum([netto]), type number}})` |
| Join | Start › Abfragen zusammenführen | `Table.NestedJoin(a, {"id"}, b, {"id"}, "b", JoinKind.LeftOuter)` + `Table.ExpandTableColumn` |
| Stapeln | Start › Abfragen anfügen | `Table.Combine({shop, b2b})` |
| Duplikate entfernen | Start › Zeilen entfernen › Duplikate entfernen | `Table.Distinct(t, {"bestellung_id"})` |
| Fehlerzeilen entfernen | Start › Zeilen entfernen › Fehler entfernen | `Table.RemoveRowsWithErrors(t)` |

Join-Arten: Linker äußerer `JoinKind.LeftOuter` · Rechter äußerer `RightOuter` · Vollständiger äußerer `FullOuter` · Innerer `Inner` · Linker Anti `LeftAnti` · Rechter Anti `RightAnti`. Codierung: `65001` UTF-8, `1252` Windows-1252.

```powerquery
let
    Quelle = Csv.Document(File.Contents("C:\Bohnenwerk\Exporte\erp_2026-03.csv"),
        [Delimiter = ";", Encoding = 1252, QuoteStyle = QuoteStyle.Csv]),
    #"Höher gestufte Header" = Table.PromoteHeaders(Quelle, [PromoteAllScalars = true]),
    #"Gefilterte Zeilen" = Table.SelectRows(#"Höher gestufte Header", each [Belegnummer] <> "Summe"),
    #"Geänderter Typ mit Gebietsschema" = Table.TransformColumnTypes(#"Gefilterte Zeilen",
        {{"Belegdatum", type date}, {"Betrag", type number}, {"Kundennummer", type text}}, "de-DE")
in
    #"Geänderter Typ mit Gebietsschema"
```

M-Regeln: Groß-/Kleinschreibung zählt (auch `"Bezahlt" <> "bezahlt"`) · `each [x]` ist `(_) => _[x]` · `&` verkettet Text · `and`, `or`, `not` · fehlend = `null` · `try … otherwise …` fängt Fehler · Kommentare mit `//`. [M-Funktionsreferenz](https://learn.microsoft.com/de-de/powerquery-m/power-query-m-function-reference)

## SQL: geschrieben und ausgewertet

| Nr. | Geschrieben | Logisch ausgewertet |
| --- | --- | --- |
| 1 | `WITH …` (CTEs) | `FROM`, `JOIN … ON` |
| 2 | `SELECT` (`DISTINCT`) | `WHERE` |
| 3 | `FROM`, `JOIN … ON` | `GROUP BY` |
| 4 | `WHERE` | `HAVING` |
| 5 | `GROUP BY` | `SELECT`: Ausdrücke, Aliase, Fensterfunktionen |
| 6 | `HAVING` | `DISTINCT` |
| 7 | `WINDOW` | `ORDER BY` |
| 8 | `ORDER BY` | `LIMIT` / `OFFSET` |
| 9 | `LIMIT` / `OFFSET` | |

Folgen: Aliase sind erst in `ORDER BY` sicher (SQLite erlaubt sie auch in `WHERE`, PostgreSQL nicht). Aggregate nicht in `WHERE`, sondern in `HAVING`. Fensterfunktionen nicht in `WHERE` – außen in einer CTE filtern. [SQLite SELECT](https://www.sqlite.org/lang_select.html)

## NULL-Regeln

| Ausdruck | Ergebnis |
| --- | --- |
| `NULL = NULL`, `NULL <> 'a'` | `NULL` – in `WHERE` wie falsch |
| `x IS NULL`, `x IS NOT NULL` | wahr oder falsch |
| `x IS DISTINCT FROM 'a'` (SQLite ≥ 3.39, PostgreSQL), `x IS NOT 'a'` (SQLite) | NULL-sicherer Vergleich |
| `NULL + 1`, `'a' \|\| NULL` | `NULL` |
| `COUNT(*)` / `COUNT(x)` / `COUNT(DISTINCT x)` | alle Zeilen / Werte ≠ NULL / verschiedene Werte ≠ NULL |
| `SUM`, `AVG`, `MIN`, `MAX` | ignorieren NULL; `SUM` über keine Zeile → `NULL`, `TOTAL()` → `0.0` (SQLite) |
| `COALESCE(x, 0)`, `IFNULL(x, 0)` | Ersatzwert |
| `NULLIF(n, 0)` | `NULL`, wenn `n = 0` – schützt Divisionen |
| `WHERE status <> 'storniert'` | Zeilen mit `status` NULL fallen heraus |
| `x NOT IN (…, NULL)` | keine einzige Zeile – `NOT EXISTS` nehmen |
| `GROUP BY x`, `DISTINCT x` | alle NULL bilden eine Gruppe |
| `ORDER BY x` | SQLite: NULL zuerst, PostgreSQL: NULL zuletzt; ausdrücklich `NULLS LAST` |
| `LEFT JOIN` ohne Partner | Spalten der rechten Tabelle NULL |

[NULL in SQLite](https://www.sqlite.org/nulls.html)

## Joins

| Art | Ergebnis | Einsatz | Falle |
| --- | --- | --- | --- |
| `INNER JOIN` | nur Zeilen mit Partner | Positionen mit Produktdaten | Zeilen ohne Partner verschwinden still |
| `LEFT JOIN` | alle links, rechts NULL | Kunden inklusive ohne Bestellung | Filter auf rechte Tabelle in `WHERE` macht einen `INNER JOIN` daraus – in `ON` schreiben |
| `RIGHT` / `FULL JOIN` | spiegelbildlich / beide Seiten | Abgleich zweier Quellen | SQLite erst ab 3.39 |
| Anti-Join | links ohne Partner | Waisen, Kunden ohne Bestellung | `NOT IN` mit NULL |
| Semi-Join | links mit mindestens einem Partner, einmal | Kunden mit Zubehörkauf | `JOIN` + `DISTINCT` versteckt Fan-out |
| Self-Join | Tabelle mit sich selbst | Paare, Vorgänger | zwei Aliase nötig |
| `CROSS JOIN` | jede Zeile mit jeder | Kalender × Region | n × m Zeilen |
| `UNION ALL` / `UNION` | untereinander, mit / ohne Duplikate | Shop + B2B | `UNION` löscht auch echte gleiche Zeilen |

```sql
-- Anti-Join: Kunden ohne Bestellung
SELECT k.* FROM kunden AS k
LEFT JOIN bestellungen AS b ON b.kunde_id = k.kunde_id
WHERE b.bestellung_id IS NULL;

-- Semi-Join: Kunden mit mindestens einer bezahlten Bestellung
SELECT k.* FROM kunden AS k
WHERE EXISTS (SELECT 1 FROM bestellungen AS b
              WHERE b.kunde_id = k.kunde_id AND b.status = 'bezahlt');

-- Fan-out-Test: Ist COUNT(*) größer als die Zahl der Bestellungen, stehen Bestellungen
-- mehrfach im Ergebnis – Werte je Bestellung (Versandkosten) dann nicht mehr summieren
SELECT COUNT(*), COUNT(DISTINCT b.bestellung_id)
FROM bestellungen AS b JOIN positionen AS p ON p.bestellung_id = b.bestellung_id;
```

Granularität zuerst: gröbere Werte (Versandkosten je Bestellung) nie nach dem Join mit feineren Zeilen summieren – vorher je Bestellung verdichten.

## Fensterfunktionen

`funktion(…) OVER (PARTITION BY gruppe ORDER BY sortierung [ROWS | RANGE BETWEEN … AND …])`

| Funktion | Zweck |
| --- | --- |
| `ROW_NUMBER()` | Laufende Nummer: Top-N je Gruppe, Deduplizieren (letzter Stand) |
| `RANK()` / `DENSE_RANK()` | Rang mit / ohne Lücke nach Gleichstand (500, 500, 300 → 1, 1, 3 / 1, 1, 2) |
| `NTILE(4)` | In vier gleich große Gruppen teilen |
| `LAG(x)` / `LEAD(x)` | Wert der vorigen / nächsten Zeile – Vormonat, nächste Bestellung |
| `FIRST_VALUE(x)` / `LAST_VALUE(x)` | Erster / letzter Wert im Rahmen; `LAST_VALUE` braucht `… AND UNBOUNDED FOLLOWING` |
| `SUM(x) OVER (PARTITION BY g)` | Gruppensumme an jeder Zeile → Anteil |
| `SUM(x) OVER ()` | Gesamtsumme an jeder Zeile → Anteil am Gesamt |
| `SUM(x) OVER (ORDER BY d)` | Laufende Summe; Standardrahmen `RANGE … CURRENT ROW` nimmt Gleichstände gemeinsam |
| `AVG(x) OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` | Gleitender Durchschnitt über 7 Zeilen |
| `COUNT(*) OVER (PARTITION BY g)` | Gruppengröße, etwa für den Median |

```sql
-- Top 3 je Kategorie: filtern erst außen
WITH gerankt AS (
  SELECT kategorie, name, umsatz,
         ROW_NUMBER() OVER (PARTITION BY kategorie ORDER BY umsatz DESC, name) AS rang
  FROM umsatz_produkt
)
SELECT * FROM gerankt WHERE rang <= 3;

-- Vormonat mit benanntem Fenster
SELECT monat, umsatz,
       ROUND(100.0 * (umsatz - LAG(umsatz) OVER w) / LAG(umsatz) OVER w, 1) AS veraenderung_prozent
FROM umsatz_monat
WINDOW w AS (ORDER BY monat);

-- Median ohne median(): die mittlere Zeile bzw. das Mittel der beiden mittleren
WITH d AS (
  SELECT kategorie, stunden,
         ROW_NUMBER() OVER (PARTITION BY kategorie ORDER BY stunden) AS nr,
         COUNT(*) OVER (PARTITION BY kategorie) AS n
  FROM durchlauf
)
SELECT kategorie, AVG(stunden) AS median_stunden
FROM d WHERE nr IN ((n + 1) / 2, (n + 2) / 2)
GROUP BY kategorie;

-- Lückenloser Kalender
WITH RECURSIVE kalender(tag) AS (
  SELECT '2026-03-01'
  UNION ALL
  SELECT date(tag, '+1 day') FROM kalender WHERE tag < '2026-03-31'
)
SELECT tag FROM kalender;
```

`LAG` nimmt die vorige *Zeile*, nicht den vorigen Monat – fehlende Monate vorher über einen Kalender ergänzen. [Window Functions](https://www.sqlite.org/windowfunctions.html)

## SQLite: Datum, Typen, Rechnen

| Zweck | SQLite | PostgreSQL |
| --- | --- | --- |
| Monat als Schlüssel | `strftime('%Y-%m', d)` | `to_char(d, 'YYYY-MM')` |
| Monatsanfang | `date(d, 'start of month')` | `date_trunc('month', d)` |
| Monatsende | `date(d, 'start of month', '+1 month', '-1 day')` | `(date_trunc('month', d) + interval '1 month - 1 day')::date` |
| Tage addieren | `date(d, '+7 days')` | `d + 7` |
| Differenz in Tagen | `julianday(b) - julianday(a)` | `b - a` (bei `date`) |
| Differenz in Stunden | `(julianday(b) - julianday(a)) * 24` | `extract(epoch from b - a) / 3600` |
| Jahr als Zahl | `CAST(strftime('%Y', d) AS INTEGER)` | `extract(year from d)` |
| Wochentag | `strftime('%w', d)`, 0 = Sonntag | `extract(dow from d)`, 0 = Sonntag |
| Heute | `date('now')` – in UTC | `current_date` |
| Unix-Zeit | `unixepoch(d)` (ab 3.38) | `extract(epoch from d)` |
| Text ohne Groß-/Kleinschreibung | `LIKE` (nur ASCII) | `ILIKE` |
| Text verbinden | `a \|\| b`, `GROUP_CONCAT(x, ', ')` | `a \|\| b`, `string_agg(x, ', ')` |

| Stolperstein | Verhalten |
| --- | --- |
| Datumsformat | Datumsfunktionen brauchen ISO-Text `2026-03-14`; `14.03.2026` ergibt `NULL` und sortiert falsch |
| Monatsüberlauf | `date('2026-01-31', '+1 month')` → `2026-03-03` |
| Integer-Division | `7 / 2` → `3`; `100.0 * a / b` oder `CAST(a AS REAL)` |
| Division durch null | SQLite: `NULL`, PostgreSQL: Fehler |
| Wahrheitswerte | `SUM(status = 'storniert')` zählt in SQLite; PostgreSQL: `COUNT(*) FILTER (WHERE …)` |
| Umlaute | `LOWER('KÖLN')` → `kÖln`, `LIKE` ignoriert Groß/klein nur bei ASCII |
| Typaffinität | `'12,5'` bleibt in einer `REAL`-Spalte Text; `typeof(x)` prüft, `STRICT`-Tabellen erzwingen Typen |
| Rundung | `ROUND(2.5)` → `3.0` (von null weg) |
| Nicht in SQLite 3.39 | `string_agg`, `concat()`, `median`, `percentile`, `ILIKE`, `QUALIFY` |

[Datums- und Zeitfunktionen](https://www.sqlite.org/lang_datefunc.html) · [Datentypen](https://www.sqlite.org/datatype3.html) · [PostgreSQL Date/Time](https://www.postgresql.org/docs/current/functions-datetime.html)

## pandas: read_csv für deutsche Exporte

| Option | Zweck | Beispiel |
| --- | --- | --- |
| `sep` | Trennzeichen | `";"` |
| `decimal` / `thousands` | Dezimal-/Tausenderzeichen | `","` / `"."` |
| `encoding` | Codierung | `"utf-8-sig"` (mit BOM), `"cp1252"` |
| `dtype` | Typ je Spalte | `{"plz": "str", "kunde_id": "Int64"}` |
| `parse_dates` + `date_format` | Datum lesen | `["datum"]`, `"%d.%m.%Y"` |
| `dayfirst` | Tag vor Monat, ohne festes Format | `True` |
| `na_values` | zusätzliche Fehlwerte | `["n/a", "-"]` |
| `keep_default_na` | Standardliste wie `"NA"`, `"NULL"` abschalten | `False` |
| `usecols` | nur diese Spalten | `["datum", "betrag"]` |
| `skiprows` / `skipfooter` | Vorspann / Summenzeile überspringen | `3` / `1` mit `engine="python"` |
| `header` / `names` | eigene Spaltennamen | `header=None, names=[…]` |

```python
import pandas as pd

df = pd.read_csv("erp_2026-03.csv", sep=";", decimal=",", thousands=".", encoding="cp1252",
                 dtype={"Kundennummer": "str"}, parse_dates=["Belegdatum"], date_format="%d.%m.%Y",
                 na_values=["n/a", "-"], skipfooter=1, engine="python")
df.dtypes          # Typen prüfen
df.tail()          # Summenzeile weg?
```

Fallen: Ohne `dtype` wird `000482` zu `482`. Mit `thousands="."` und ohne `parse_dates` wird `14.03.2026` zur Zahl `14032026`. Eine Summenzeile macht die ID-Spalte zu Text. Eine Lücke macht aus `int64` `float64` (`1001.0`). [read_csv](https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html)

## pandas: Kernoperationen

| Aufgabe | pandas 3 |
| --- | --- |
| Spalten wählen | `df[["region", "netto"]]` |
| Zeilen filtern | `df[df["kanal"] == "B2B"]`, `df.query("kanal == 'B2B' and netto > 100")` |
| Nach Label / Position | `df.loc[maske, "rabatt"]`, `df.iloc[:5]` |
| Wert setzen | `df.loc[maske, "rabatt"] = 0.1` – nie `df[maske]["rabatt"] = …` |
| Neue Spalte | `df.assign(netto=lambda d: d["menge"] * d["einzelpreis"] * (1 - d["rabatt"]))` |
| Text | `df["stadt"].str.strip().str.title()`, `.str.casefold()` |
| Datum | `df["datum"].dt.to_period("M")`, `.dt.year`, `.dt.tz_convert("Europe/Berlin")` |
| Lücken | `isna()`, `fillna(0)` nur mit fachlicher Begründung, `dropna(subset=["kunde_id"])` |
| Duplikate | `df.duplicated(subset=["bestellung_id"], keep=False)`, `drop_duplicates` |
| Häufigkeiten | `df["status"].value_counts(dropna=False)` |
| Gruppieren | `df.groupby("region", as_index=False).agg(umsatz=("netto", "sum"), bestellungen=("bestellung_id", "nunique"))` |
| Gruppenwert je Zeile | `df.groupby("kunde_id")["netto"].transform("sum")` |
| Verknüpfen | `a.merge(b, on="kunde_id", how="left", validate="many_to_one", indicator=True)` |
| Stapeln | `pd.concat([shop, b2b], ignore_index=True)` |
| Kreuztabelle | `df.pivot_table(index="region", columns="monat", values="netto", aggfunc="sum", fill_value=0, margins=True)` |
| Breit → lang | `plan.melt(id_vars="produkt", var_name="monat", value_name="menge")` |
| Häufigkeitstabelle | `pd.crosstab(df["region"], df["kanal"])` |
| Lückenlose Monate | `df.resample("MS", on="datum")["netto"].sum()` – `"M"` gibt es in pandas 3 nicht mehr |
| Vormonat | `s.shift(1)`, `s.pct_change()` |
| Top N je Gruppe | `df.sort_values("netto", ascending=False).groupby("kategorie").head(3)` |
| SQLite lesen | `pd.read_sql_query(sql, verbindung)` |
| Excel schreiben | `df.to_excel("bericht.xlsx", index=False)` – braucht openpyxl |

`pivot_table` mittelt ohne `aggfunc`, `pivot` bricht bei doppelten Paaren ab. `std()` rechnet mit `ddof=1`. [Vergleich mit SQL](https://pandas.pydata.org/docs/getting_started/comparison/comparison_with_sql.html) · [Vergleich mit Tabellenkalkulation](https://pandas.pydata.org/docs/getting_started/comparison/comparison_with_spreadsheets.html)

## Dieselbe Auswertung in Excel, SQL und pandas

| Schritt | Excel | SQL | pandas |
| --- | --- | --- | --- |
| Filtern | Filter, Datenschnitt, `FILTER` | `WHERE` | `df[maske]`, `query` |
| Berechnete Spalte | `=[@menge]*[@einzelpreis]*(1-[@rabatt])` | `menge * einzelpreis * (1 - rabatt) AS netto` | `assign(netto=…)` |
| Gruppieren und summieren | PivotTable, `GRUPPIERENNACH`, `SUMMEWENNS` | `GROUP BY` + `SUM` | `groupby` + `agg` |
| Filter nach Summe | Wertefilter | `HAVING` | Filter nach `agg` |
| Nachschlagen | `XVERWEIS` | `JOIN` | `merge` |
| Kreuztabelle | PivotTable-Spalten, `PIVOTMIT` | `SUM(CASE WHEN … THEN … ELSE 0 END)` | `pivot_table` |
| Breit → lang | Power Query: Andere Spalten entpivotieren | `UNION ALL` | `melt` |
| Anteil an der Gruppe | % des Zeilengesamtergebnisses | `x / SUM(x) OVER (PARTITION BY g)` | `x / groupby(g)[x].transform("sum")` |
| Rang | `RANG.GLEICH` | `RANK() OVER (…)` | `rank()` |
| Vormonat | Werte anzeigen als › Differenz von | `LAG(x) OVER (ORDER BY monat)` | `shift(1)` |

Nettoumsatz je Region und Monat, nur bezahlte Bestellungen:

```excel
=PIVOTMIT(Zeilen[region];TEXT(Zeilen[bestelldatum];"JJJJ-MM");Zeilen[netto];SUMME;;;;;;Zeilen[status]="bezahlt")
```

```sql
SELECT k.region, strftime('%Y-%m', b.bestelldatum) AS monat,
       ROUND(SUM(p.menge * p.einzelpreis * (1 - p.rabatt)), 2) AS netto
FROM bestellungen AS b
JOIN kunden AS k ON k.kunde_id = b.kunde_id
JOIN positionen AS p ON p.bestellung_id = b.bestellung_id
WHERE b.status = 'bezahlt'
GROUP BY k.region, monat
ORDER BY k.region, monat;
```

```python
(zeilen
 .query("status == 'bezahlt'")
 .assign(monat=lambda d: d["bestelldatum"].dt.to_period("M"))
 .pivot_table(index="region", columns="monat", values="netto", aggfunc="sum", fill_value=0))
```

## Statistik und Rundung

| Kennzahl | Excel | Python `statistics` | pandas |
| --- | --- | --- | --- |
| Mittelwert | `MITTELWERT` | `mean` | `mean()` |
| Median | `MEDIAN` | `median` | `median()` |
| Modus | `MODUS.EINF` | `mode` | `mode()` |
| Standardabweichung Stichprobe | `STABW.S` | `stdev` | `std()` |
| Standardabweichung Grundgesamtheit | `STABW.N` | `pstdev` | `std(ddof=0)` |
| Quantil | `QUANTIL.INKL` | `quantiles(…, method="inclusive")` | `quantile(0.9)` |
| Korrelation | `KORREL` | `correlation` | `corr()` |

| Rundung von 2,5 | Ergebnis |
| --- | --- |
| Excel `RUNDEN(2,5;0)` | `3` (von null weg) |
| SQLite `ROUND(2.5)` | `3.0` |
| Python `round(2.5)` | `2` (zur geraden Ziffer) |
| pandas `Series.round()` | `2.0` (zur geraden Ziffer) |
| `Decimal("2.5").quantize(Decimal("1"), rounding=ROUND_HALF_UP)` | `3` |

Merksätze: Median bei schiefen Verteilungen · Prozentpunkte für Differenzen von Quoten · Mittelwert von Mittelwerten nur gewichtet · Ausreißer-Kandidaten außerhalb Q1 − 1,5 · IQR bis Q3 + 1,5 · IQR · Korrelation ist keine Ursache · Gesamtquote erst nach Blick auf die Zusammensetzung (Simpson). [statistics](https://docs.python.org/3/library/statistics.html)

## Diagrammwahl

| Frage | Diagramm | Achte auf |
| --- | --- | --- |
| Vergleich von Kategorien | Balken, sortiert; horizontal bei langen Namen | Achse beginnt bei 0 |
| Verlauf über die Zeit | Linie; bei wenigen Zeitpunkten Säulen | gleiche Zeitabstände, Lücken sichtbar lassen |
| Verteilung | Histogramm, Boxplot | Klassenbreite bewusst wählen |
| Zusammenhang | Streudiagramm | Korrelation ist keine Ursache |
| Anteil am Ganzen | gestapelter oder 100-%-Balken; Kreis höchstens bei 2–3 Teilen | Teile ergeben 100 % |
| Abweichung von Ziel oder Vormonat | Balken um eine Nulllinie, Wasserfall | Vorzeichen beschriften, nicht nur färben |
| Viele Gruppen im Verlauf | Small Multiples | gleiche Skala in allen Feldern |
| Eine Kennzahl | große Zahl mit Vergleich | Definition und Datenstand dazu |

Titel als Aussage („B2B wächst seit Februar“) · direkt beschriften statt Legende · Farbe nur zum Hervorheben, nie als einzige Unterscheidung · kein 3D · Einheit und Zeitraum nennen · Top 5 + „Sonstige“ statt 20 Kategorien. [Diagrammtypen in Excel](https://support.microsoft.com/de-de/excel/available-chart-types-in-office)

## Datenqualitäts-Checkliste

| Dimension | Prüfung | Beispiel |
| --- | --- | --- |
| Vollständigkeit | Pflichtfelder gefüllt, alle Zeilen der Quelle da | `SELECT COUNT(*) - COUNT(kunde_id) FROM bestellungen` · Zeilenzahl und Summe gegen die Summenzeile der Quelle |
| Eindeutigkeit | Schlüssel genau einmal | `GROUP BY bestellung_id HAVING COUNT(*) > 1` · `df.duplicated(subset=[…])` |
| Gültigkeit | Wertebereich, erlaubte Werte, Format | `rabatt BETWEEN 0 AND 0.2` · `status IN ('bezahlt', 'storniert', 'retourniert')` |
| Konsistenz | Referenzen und Regeln zwischen Spalten | Anti-Join Positionen → Bestellungen · `geschlossen_am >= erstellt_am` |
| Genauigkeit | Werte stimmen mit der Wirklichkeit überein | Stichprobe gegen Belege oder das führende System |
| Aktualität | Datenstand passt zum Bericht | `MAX(bestelldatum)` gegen Stichtag |

Vor jedem Versand:

- [ ] Zeilenbilanz: eingelesen = geladen + Quarantäne + bewusst gefiltert
- [ ] Summen und Zeilenzahlen je Quelle gegen Kontrollwerte abgeglichen
- [ ] Nach jedem Join Zeilen gezählt (kein Fan-out, nichts verloren)
- [ ] Zeitraum, Zeitzone und Monatsgrenzen geprüft
- [ ] Definitionen (brutto/netto, Stornos, Retouren) stehen im Bericht
- [ ] Datenstand und Stichtag genannt
- [ ] Rohdaten unverändert, Prüfsummen im Manifest
- [ ] Ein zweiter Lauf liefert dieselben Zahlen

[Datenüberprüfung in Excel](https://support.microsoft.com/de-de/excel/get-started/apply-data-validation-to-cells)
