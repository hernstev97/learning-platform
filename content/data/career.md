## Was Datenanalyse im Beruf bedeutet

Datenanalyse heißt im Arbeitsalltag selten „Modelle bauen“. Meist heißt es: Eine Fachabteilung hat eine Frage, die Daten liegen verteilt in Exporten, Datenbanken und Excel-Mappen, und jemand muss daraus eine belastbare Zahl machen, sie erklären und dafür sorgen, dass sie nächsten Monat wieder stimmt. Der größte Teil der Arbeit steckt in Klären, Bereinigen und Prüfen, nicht im Auswerten.

Deshalb verbindet dieser Bereich zwei Linien, die im Beruf zusammengehören: Analyst-Aufgaben – Kennzahlen definieren, SQL schreiben, Ergebnisse präsentieren – und Prozessverbesserung – Importe wiederholbar machen, Prüfungen automatisieren, manuelle Monatsroutinen abschaffen. Wer beides kann, ist in vielen Teams wertvoller als jemand, der nur eines davon beherrscht.

Stellenanforderungen ändern sich. Nimm die folgenden Punkte als überprüfbare Kompetenzziele und gleiche sie mit aktuellen Anzeigen deiner Zielrolle ab; diese Seite ist keine Arbeitsmarktstudie.

## Rollen und Jobtitel

Die Grenzen zwischen den Rollen sind fließend, und Titel werden je nach Unternehmen unterschiedlich verwendet. Lies in Anzeigen die Aufgaben, nicht nur die Überschrift.

| Rolle | Typische Titel | Alltag | Werkzeuge, die oft gefragt sind |
| --- | --- | --- | --- |
| Data Analyst | Data Analyst, Datenanalyst, Analyst Sales/Marketing/E-Commerce | Ad-hoc-Fragen beantworten, Kennzahlen definieren, Analysen präsentieren | SQL, Excel, ein BI-Werkzeug, zunehmend Python |
| BI-Analyst | BI Analyst, Business Intelligence Developer, Reporting Analyst | Berichte und Dashboards bauen und pflegen, Datenmodelle für das Reporting | SQL, Power BI oder Tableau oder Qlik, Power Query, Datenmodellierung |
| Business / Process Analyst | Business Analyst, Prozessanalyst, Prozessmanager | Abläufe aufnehmen, Schwachstellen mit Daten belegen, Anforderungen formulieren | Excel, Prozesskennzahlen, SQL, Modellierung von Abläufen |
| Controlling mit Datenschwerpunkt | Controller Reporting, Business Controller, Financial Analyst | Monatsabschluss, Plan-Ist-Vergleiche, Abweichungsanalysen, Management-Reporting | Excel auf hohem Niveau, Power Query, ERP-Exporte (oft SAP), zunehmend SQL und Power BI |
| Analytics Engineer (nächster Schritt) | Analytics Engineer, Data Engineer mit Schwerpunkt Modellierung | Aus Rohdaten getestete, dokumentierte Tabellen bauen, auf denen alle Analysen aufsetzen | SQL auf Profi-Niveau, Versionskontrolle, Tests, Werkzeuge wie dbt, Cloud-Datenbanken |

Der Analytics Engineer ist der natürliche nächste Schritt nach diesem Bereich: Die Module [Reproduzierbare Analyse-Workflows](/data/reproduzierbare-analysen) und [Kleine Automationen](/data/automationen) zeigen die Arbeitsweise – Rohdaten unverändert, Pipeline in Schritten, Tests für Transformationen. Was dann dazukommt, sind größere Datenbanken, Orchestrierung und Datenmodellierung im Team.

## Was Arbeitgeber im deutschsprachigen Raum erwarten

**SQL** gehört zu den Anforderungen, die in Anzeigen für Analystenrollen regelmäßig auftauchen – prüfe das an den Anzeigen, die dich interessieren –, und in Vorstellungsgesprächen wird es oft live geprüft. Gefragt sind sichere Gruppierungen, Joins ohne Doppelzählung, der Umgang mit `NULL` und Fensterfunktionen für Rangfolgen und Periodenvergleiche – genau der Stoff der drei SQL-Module.

**Excel** bleibt im deutschsprachigen Mittelstand und im Controlling das Werkzeug, in dem Fachabteilungen arbeiten. Wer `XVERWEIS`, `SUMMEWENNS`, PivotTables und Power Query sicher beherrscht und eine gewachsene Mappe in eine saubere Struktur überführen kann, wird dort sofort gebraucht. Viele Unternehmen nutzen die Microsoft-Welt; **Power BI** taucht deshalb häufig in Anzeigen auf. Power Query ist dort dieselbe Technik wie in Excel – was du im Modul [Power Query](/data/power-query) lernst, überträgt sich direkt. In größeren Unternehmen kommen Daten oft aus SAP; Erfahrung mit ERP-Exporten und deren Eigenheiten ist ein Plus.

**Python** mit pandas ist bei Data-Analyst-Stellen zunehmend gewünscht, im Controlling eher ein Unterscheidungsmerkmal als eine Voraussetzung. Wichtiger als Bibliothekswissen ist, dass du eine Auswertung reproduzierbar baust und testen kannst.

Zwischen den Zeilen erwarten die meisten Teams außerdem:

- Du klärst eine Frage, bevor du rechnest, und legst Kennzahlen schriftlich fest.
- Du prüfst Daten mit Regeln und gleichst mit dem Quellsystem ab, statt Zahlen ungeprüft weiterzugeben.
- Du erklärst Ergebnisse Menschen ohne Technikhintergrund, auf Deutsch, knapp und mit einer klaren Aussage.
- Du gehst mit personenbezogenen Daten sorgfältig um: Kundennamen und E-Mail-Adressen gehören nicht in Testdateien, Screenshots oder öffentliche Repositorys (Stichwort DSGVO).
- Du kennst die Fachdomäne oder lernst sie schnell – im Controlling etwa Kostenrechnung und Monatsabschluss, im E-Commerce Warenkorb, Retouren und Wiederkauf.

## Wie Vorstellungsgespräche ablaufen

Der Ablauf unterscheidet sich je nach Unternehmen, besteht aber meist aus einer Auswahl dieser Formate:

| Format | Ablauf | Worauf geachtet wird | Übung hier |
| --- | --- | --- | --- |
| Erstgespräch | Motivation, Werdegang, Rahmenbedingungen | Eine stimmige Geschichte, warum Daten und warum diese Stelle | Zwei-Minuten-Vorstellung mit einem Projekt |
| Fachgespräch | Fragen zu SQL, Excel, Statistik und deinen Projekten | Begriffe sicher und mit Beispiel erklären, Grenzen kennen | [Interview-Karten](/data/karten) |
| SQL-Live-Coding | Zwei bis vier Aufgaben an einem vorgegebenen Schema, im Browser-Editor oder am Whiteboard | Rückfragen, Granularität, `NULL`, Joins, Fensterfunktionen, Kontrolle des Ergebnisses | `sql`-Übungen aller SQL-Module |
| Excel-Case | Rohdatei mit Aufgaben, oft mit Zeitlimit: bereinigen, auswerten, darstellen | Strukturiertes Vorgehen, Plausibilisierung, saubere Formeln | [Excel-Case-Karte](/data/karten#karte-excel-case), [Excel-Monatsreport](/data/projekte/excel-monatsreport) |
| Take-Home | Datensatz und Fragestellung, einige Tage Zeit, Abgabe als Bericht, Notebook oder Mappe | Annahmen, Datenqualität, Nachvollziehbarkeit, Kommunikation | [Abschlussprojekt](/data/projekte/monatsauswertung) |
| Präsentation | Ergebnisse des Take-Home oder einer Fallstudie vor Fachbereich und Team | Kernaussage zuerst, Diagramme mit Aussage, offen mit Grenzen umgehen | Modul [Visualisierung](/data/visualisierung) |
| Verhaltensfragen | Fehler, Konflikte, Stakeholder, Prioritäten | Verantwortung, konkrete Beispiele mit Zahlen | Karten [Abweichung zum Controlling](/data/karten#karte-abweichung-controlling), [Fehler im Bericht](/data/karten#karte-fehler-im-bericht), [Prozessverbesserung](/data/karten#karte-prozessverbesserung) |

### SQL-Live-Coding: so gehst du vor

1. **Rückfragen stellen:** Was ist eine Zeile in jeder Tabelle? Zählen stornierte Bestellungen? Wie sollen Gleichstände behandelt werden? Welche Zeitzone gilt? Diese Fragen sind Teil der Bewertung.
2. **Laut denken und in Stufen bauen:** erst die Basistabelle mit den richtigen Zeilen, dann Joins, dann Aggregation, dann Fensterfunktionen – gern als CTEs mit sprechenden Namen.
3. **Zwischenergebnisse prüfen:** Zeilenzahl nach jedem Join, eine Summe gegen die Ausgangstabelle, ein Stichprobenwert von Hand.
4. **Annahmen aussprechen:** „Ich nehme an, dass `status` nie leer ist – in echten Daten würde ich das vorher zählen.“
5. **Grenzen nennen:** Dialektunterschiede (`strftime` in SQLite, `date_trunc` in PostgreSQL), fehlende Monate beim Vormonatsvergleich, Rundung.

Typische Aufgaben: Umsatz je Monat mit Vormonatsvergleich, Top-N je Kategorie, Kunden ohne Bestellung, Duplikate finden und den letzten Stand je Schlüssel behalten, Wiederkaufrate von Neukunden, Durchlaufzeiten aus Zeitstempeln. Alle kommen in den Modulen und Karten vor.

### Excel-Case: so gehst du vor

Erst die Daten ansehen, dann rechnen: Was ist eine Zeile, sind Zahlen und Datumswerte echte Zahlen, gibt es Summenzeilen oder Leerzeilen? Dann als Tabelle formatieren, Hilfsspalten als berechnete Spalten, Auswertung per PivotTable oder `SUMMEWENNS`, Ergebnis gegen eine unabhängige Summe prüfen. Sag, was du mit mehr Zeit anders bauen würdest – etwa den Import per Power Query, damit die Auswertung nächsten Monat nur „Alle aktualisieren“ braucht. Das zeigt, dass du über den Einzelfall hinaus denkst.

### Take-Home und Präsentation

Bei einer Take-Home-Aufgabe wird selten nur das Ergebnis bewertet. Prüfer lesen, wie du mit unsauberen Daten umgehst, welche Annahmen du triffst und ob sie deine Zahlen nachvollziehen können. Eine gute Abgabe enthält:

- eine Zusammenfassung mit den drei wichtigsten Aussagen ganz oben,
- einen kurzen Abschnitt zur Datenqualität: was auffiel, wie du damit umgegangen bist, wie viele Zeilen betroffen waren,
- Definitionen der Kennzahlen und die Annahmen, die du nicht klären konntest,
- Code oder Mappe, die sich von den Rohdaten bis zum Ergebnis erneut ausführen lassen,
- Grenzen und nächste Schritte.

In der Präsentation beginnst du mit der Aussage und der Empfehlung, nicht mit der Methode. Details hast du als Antwort auf Rückfragen parat. Wer Unsicherheiten selbst anspricht, wirkt glaubwürdiger als jemand, der sie verschweigt.

## Portfolio: Projekte, die zählen

Ein überzeugendes Portfolio besteht aus zwei bis vier Projekten, die jeweils eine echte Frage beantworten und den ganzen Weg zeigen: Frage, Daten, Bereinigung, Prüfung, Auswertung, Aussage. Ein Dashboard-Screenshot allein belegt wenig; ein README, das in zwei Minuten Ausgangslage, Vorgehen, Ergebnis und Grenzen erklärt, belegt viel.

| Projekt | Was es belegt |
| --- | --- |
| [Excel-Monatsreport mit Power Query und PivotTable](/data/projekte/excel-monatsreport) | Du machst eine manuelle Excel-Routine wiederholbar und prüfbar |
| [Support-Tickets mit SQL auswerten](/data/projekte/ticket-kennzahlen) | Du definierst Prozesskennzahlen sauber und beherrschst Fensterfunktionen |
| [Datenqualitäts-Check als Python-Werkzeug](/data/projekte/dq-pruefwerkzeug) | Du prüfst Daten mit Regeln statt Bauchgefühl und baust ein Werkzeug für andere |
| [Abschlussprojekt: Vom Rohdatenexport zur Monatsauswertung](/data/projekte/monatsauswertung) | Du verantwortest einen ganzen Workflow – vom Export bis zum Bericht, reproduzierbar und getestet |

Praktische Hinweise:

- **Daten:** Nimm erfundene Daten aus einem eigenen Generator oder offene Daten öffentlicher Stellen. Nie Firmendaten, auch nicht „anonymisiert“ – Kundennamen, E-Mail-Adressen und interne Zahlen haben in einem öffentlichen Repository nichts zu suchen.
- **Excel-Projekte sichtbar machen:** Lege neben die Mappe den M-Code der Abfragen als Textdatei, Screenshots der angewendeten Schritte und eine kurze Bildschirmaufnahme vom Aktualisieren. So kann ein Prüfer die Arbeit auch ohne Excel beurteilen.
- **SQL und Python:** Abfragen als `.sql`-Dateien mit Kopfkommentar, Python-Code mit Tests und einer Umgebung, die sich mit `uv sync` herstellen lässt.
- **Ehrlichkeit:** Schreib dazu, dass die Daten simuliert sind und welche Fehler du absichtlich eingebaut hast. Das ist kein Makel, sondern zeigt, dass du Prüfungen gezielt testest.

## Excel-Prozessverbesserungen aus dem eigenen Job als Referenz

Wer schon im Job Excel-Abläufe verbessert hat – einen Monatsbericht beschleunigt, eine fehleranfällige Liste neu strukturiert, einen Import mit Power Query gebaut –, hat eine der stärksten Referenzen für einen Wechsel in die Datenanalyse. Sie zeigt genau das, was Arbeitgeber suchen: ein echtes Problem erkannt, eine Lösung gebaut, und andere nutzen sie.

So machst du daraus eine Referenz, die im Gespräch trägt:

1. **Vorher und nachher messen:** Zeitaufwand pro Durchlauf, Häufigkeit, Fehler pro Monat, beteiligte Personen. „Drei Stunden pro Monat auf zehn Minuten, seitdem keine doppelt eingefügten Zeilen mehr“ überzeugt mehr als „deutlich effizienter“. Gib an, was gemessen und was geschätzt ist.
2. **In Analystensprache beschreiben:** Datenquellen, Bereinigung, Prüfung, Kennzahl, Wirkung. Aus „Makro für die Liste gebaut“ wird „Import von drei ERP-Exporten mit Power Query automatisiert, Typen mit Gebietsschema, Kontrollsummen je Quelle eingeführt“.
3. **Als Geschichte erzählen:** Situation, Aufgabe, Handlung, Ergebnis – und was du beim nächsten Mal anders machen würdest.
4. **Nichts mitnehmen:** Firmendateien, Screenshots mit echten Zahlen und interne Details bleiben im Unternehmen. Baue die Technik stattdessen mit erfundenen Daten nach, etwa mit dem Bohnenwerk-Modell aus diesem Bereich, und zeige diesen Nachbau.
5. **Den nächsten Schritt zeigen:** Setze denselben Ablauf zusätzlich mit SQL oder Python um. Damit belegst du, dass du nicht nur Excel beherrschst, sondern das Muster verstanden hast.
6. **Bestätigung einholen:** Bitte deine Führungskraft, die Verbesserung in einer Referenz oder im Arbeitszeugnis zu erwähnen, und frag vorher, welche Details du im Gespräch nennen darfst.

Im Lebenslauf steht so etwas als eine Zeile mit Wirkung: „Monatlichen Umsatzbericht mit Power Query und PivotTables automatisiert – Aufwand von 3 Stunden auf 10 Minuten je Monat, Kontrollsummen je Quelle eingeführt.“

## Lernplan in 16 Wochen

Plane sieben bis acht Stunden pro Woche. Die Reihenfolge folgt den vier Tracks, die Projekte liegen dort, wo ihr Stoff sitzt. Wiederhole jede Woche einige [Interview-Karten](/data/karten) und nutze [Wiederholen](/data/wiederholen) für Themen mit Fehlversuchen.

| Woche | Track | Module und Projekte | Sichtbares Ergebnis |
| --- | --- | --- | --- |
| 1 | Fundament | [Saubere Tabellen](/data/tabellenmodelle), [CSV-Import](/data/csv-import) | Eine eigene chaotische Liste in eine saubere Tabelle mit Schlüssel überführt |
| 2 | Fundament | [Datenqualität](/data/datenqualitaet), [Deskriptive Statistik](/data/deskriptive-statistik) | Regelkatalog für einen Export; Median und Quartile einer echten Verteilung erklärt |
| 3 | Excel professionell | [Excel-Formeln](/data/excel-formeln), [Tabellen und PivotTables](/data/tabellen-pivot) | Eine Auswertung mit `XVERWEIS`, `SUMMEWENNS` und PivotTable |
| 4 | Excel professionell | [Power Query](/data/power-query) | Ordner-Import mit Gebietsschema |
| 5 | Excel professionell | Projekt [Excel-Monatsreport](/data/projekte/excel-monatsreport) | Bericht mit „Alle aktualisieren“ und Kontrollblatt |
| 6 | SQL für Analyse | [SQL-Abfragen](/data/sql-abfragen) | Monatsauswertung mit `GROUP BY`, `HAVING` und sauberem `NULL` |
| 7 | SQL für Analyse | [Joins](/data/sql-joins) | Abfragen über das Sternschema ohne Fan-out |
| 8 | SQL für Analyse | [Fensterfunktionen](/data/sql-fensterfunktionen) | Top-N, Vormonat, Kohorte ohne Hilfe gelöst |
| 9 | SQL für Analyse | Projekt [Support-Tickets](/data/projekte/ticket-kennzahlen) | Kennzahlen-Steckbrief und Memo |
| 10 | Python & Workflows | [pandas: laden und bereinigen](/data/pandas-grundlagen), [pandas: gruppieren und verknüpfen](/data/pandas-auswertung) | Den CSV-Import aus Woche 1 in pandas nachgebaut |
| 11 | Python & Workflows | [Visualisierung](/data/visualisierung), [Reproduzierbare Workflows](/data/reproduzierbare-analysen) | Diagramme mit Aussage; Projektgerüst mit `uv` und Prüfsummen |
| 12 | Python & Workflows | [Kleine Automationen](/data/automationen), Projekt [Datenqualitäts-Check](/data/projekte/dq-pruefwerkzeug) | Prüfwerkzeug mit Tests und Exit-Codes |
| 13–16 | Abschluss | [Abschlussprojekt](/data/projekte/monatsauswertung), Karten aller Module | Monatslauf mit einem Befehl, Präsentation von zehn Minuten |

Wer bereits sicher mit Excel arbeitet, kann die Wochen 3 bis 5 auf zwei Wochen verdichten und die gewonnene Zeit in SQL stecken – dort liegt im Vorstellungsgespräch meist der Schwerpunkt.

## Ressourcen

Offizielle Dokumentation, nach Werkzeug geordnet:

- **Excel:** [Excel-Funktionen (alphabetisch)](https://support.microsoft.com/de-de/excel/excel-functions-alphabetical), [Excel-Funktionen nach Kategorie](https://support.microsoft.com/de-de/excel/excel-functions-by-category), [Übersicht zu Excel-Tabellen](https://support.microsoft.com/de-de/excel/overview-of-excel-tables), [PivotTable erstellen](https://support.microsoft.com/de-de/excel/get-started/create-a-pivottable-to-analyze-worksheet-data), [Dynamische Arrayformeln](https://support.microsoft.com/de-de/excel/dynamic-array-formulas-and-spilled-array-behavior), [Spezifikationen und Beschränkungen](https://support.microsoft.com/de-de/excel/excel-specifications-and-limits).
- **Power Query:** [Was ist Power Query?](https://learn.microsoft.com/de-de/power-query/power-query-what-is-power-query), [Power Query in Excel](https://support.microsoft.com/de-de/excel/about-power-query-in-excel), [Referenz der Formelsprache M](https://learn.microsoft.com/de-de/powerquery-m/), [M-Funktionsreferenz](https://learn.microsoft.com/de-de/powerquery-m/power-query-m-function-reference).
- **Office Scripts und Power BI:** [Office-Skripts in Excel](https://learn.microsoft.com/de-de/office/dev/scripts/overview/excel), [Was ist Power BI?](https://learn.microsoft.com/de-de/power-bi/fundamentals/power-bi-overview), [Zertifizierung Power BI Data Analyst](https://learn.microsoft.com/de-de/credentials/certifications/data-analyst-associate/).
- **SQL:** [SQLite: Sprachreferenz](https://www.sqlite.org/lang.html), [Fensterfunktionen](https://www.sqlite.org/windowfunctions.html), [Datums- und Zeitfunktionen](https://www.sqlite.org/lang_datefunc.html), [Eigenheiten von SQLite](https://www.sqlite.org/quirks.html); für den Vergleich [PostgreSQL: Window Functions](https://www.postgresql.org/docs/current/tutorial-window.html).
- **pandas:** [User Guide](https://pandas.pydata.org/docs/user_guide/index.html), [10 minutes to pandas](https://pandas.pydata.org/docs/user_guide/10min.html), [Vergleich mit Tabellenkalkulation](https://pandas.pydata.org/docs/getting_started/comparison/comparison_with_spreadsheets.html), [Vergleich mit SQL](https://pandas.pydata.org/docs/getting_started/comparison/comparison_with_sql.html), [Neuerungen in pandas 3.0](https://pandas.pydata.org/docs/whatsnew/v3.0.0.html).
- **Python und Werkzeuge:** [Python-Tutorial](https://docs.python.org/3/tutorial/), [`csv`](https://docs.python.org/3/library/csv.html), [`statistics`](https://docs.python.org/3/library/statistics.html), [`sqlite3`](https://docs.python.org/3/library/sqlite3.html), [uv: Arbeiten mit Projekten](https://docs.astral.sh/uv/guides/projects/).

Zum Nachschlagen im Alltag: der [Spickzettel](/data/spickzettel) und das [Glossar](/data/glossar) dieses Bereichs.
