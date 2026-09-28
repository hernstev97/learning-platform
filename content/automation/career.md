## Wo Automatisierung Arbeit verändert

Automatisierung taucht in internen Werkzeugen, IT-Betrieb, QA, Datenverarbeitung und Plattformarbeit auf. Die Jobtitel unterscheiden sich: Ein QA Engineer braucht verlässliche Tests und gute Fehlersignale, ein Data Engineer nachvollziehbare Datenflüsse, ein Platform Engineer wiederholbare Betriebsabläufe. Python ist dabei ein Werkzeug; die eigentliche Aufgabe ist, einen fachlichen Prozess mit klaren Grenzen zuverlässig auszuführen.

RPA steuert häufig vorhandene Benutzeroberflächen. Codebasierte Integration verwendet, wenn möglich, Dateiformate oder APIs mit explizitem Vertrag. Browserautomation kann die richtige Brücke sein, bringt aber eine zusätzliche Abhängigkeit von UI-Zustand mit. Wähle den Zugang nach der Aufgabe und dem erlaubten Zugriff, nicht nach dem gerade bekanntesten Werkzeug.

Konkrete Stellenanforderungen ändern sich. Nutze die folgenden Punkte als überprüfbare Kompetenzziele und gleiche sie mit aktuellen Anzeigen deiner Zielrolle ab; dieser Kurs ist keine aktuelle Arbeitsmarktstudie.

## Was du im Gespräch zeigen solltest

Ein guter Einstieg ist ein vollständiger kleiner Ablauf: Eingabe lesen, validieren, Änderungen planen, sicher ausführen und das Ergebnis belegen. Du solltest erklären können, was bei einem zweiten Lauf, einem Timeout und einem Absturz passiert. Dazu gehören Git, reproduzierbare Installation, Tests mit Fakes, Logs und ein verständlicher Startweg.

Für betriebliche Aufgaben kommen Linux, Berechtigungen, Scheduler und Fehlersuche hinzu. Für Datenaufgaben zählen Identitäten, Transaktionen und Datenqualität. Bei Webintegration musst du Statuscodes, Timeouts, Paginierung und Rate Limits im konkreten Vertrag behandeln. Echte Zugangsdaten und persönliche Daten gehören nicht in eine öffentliche Demo.

## Zwölf Wochen mit sichtbaren Ergebnissen

Die Wochen sind eine veränderbare Reihenfolge, keine Garantie beruflicher Einsatzfähigkeit. Wiederhole einen Schritt, wenn du den Fehlerpfad noch nicht ohne Musterlösung erklären kannst.

| Woche | Module | Ergebnis |
| --- | --- | --- |
| 1 | Automatisieren denken | Einen manuellen Ablauf messen, Vertrag und Nichtziele notieren |
| 2 | Dateien & Ordner | Organisierer mit Vorschau und Konfliktfall |
| 3 | CLI-Werkzeuge, Prozesse & Shell | CLI mit verständlicher Hilfe, Fehlercodes und sicheren Argumentlisten |
| 4 | Datenformate | Bericht aus CSV mit Fehlerliste und überprüfbaren Summen |
| 5 | Regex & Text | Parser mit positiven und negativen Beispielen |
| 6 | Web-APIs | Paginierter Abruf mit Fake, Timeout und begrenztem Retry |
| 7 | Scraping & Browser | Einen erlaubten Datenzugriff begründen und anhand Fixtures testen |
| 8 | Zeitsteuerung | Job manuell und über Timer starten; letzten Erfolg nachweisen |
| 9 | Benachrichtigungen | Fake-Sender und persistierten Zustellstatus implementieren |
| 10 | Robustheit | Abbruchfälle und Wiederanlauf gezielt testen |
| 11 | Deployment & CI, KI-Automatisierung | Reproduzierbare Pipeline; optionale KI streng begrenzen |
| 12 | Team-Digest als Abschlussprojekt | Erstlauf, Wiederholung, Ausfall und Wiederanlauf vorführen |

Die technischen Modul-IDs dazu sind `automatisieren-denken`, `dateien-ordner`, `cli-werkzeuge`, `prozesse-shell`, `datenformate`, `regex-text`, `web-apis`, `scraping-browser`, `zeitsteuerung`, `benachrichtigungen`, `robustheit`, `deployment-ci` und `ki-automatisierung`.

## Interviewaufgaben üben

Typische Übungsformate sind ein Dateiimport mit ungültigen Zeilen, eine API-Synchronisation mit doppelten Einträgen oder ein nicht gestarteter Nachtjob. Beginne mit Rückfragen zu Identität, erwarteter Wirkung und Fehlerfällen. Schreibe einen kleinen korrekten Ablauf; ergänze danach gezielt Robustheit. Benenne, was eine lokale Prüfung belegt und welche echte Betriebsgrenze noch offen ist.

Für eine Code-Review-Übung suche nach `shell=True` mit zusammengesetztem Text, fehlenden Timeouts, unbeschränkten Wiederholungen und still geschluckten Exceptions. Erkläre jeweils einen konkreten Fehlerablauf. Eine Aufzählung möglicher Probleme ohne Bezug zur Aufgabe hilft weniger als ein reproduzierbarer Test.

Verhaltensfragen beantwortest du an realen oder ausdrücklich als Lernprojekt gekennzeichneten Beispielen. Beschreibe Situation, eigene Entscheidung, Ergebnis und Lernpunkt. Schreibe fremde oder KI-erstellte Arbeit nicht als selbständig erbrachte Leistung um.

## Portfolio: Wirkung belegbar machen

Die vier Projekte verbinden Vorschau, Berichte, API-Integration und Betrieb. Ein abgeschlossenes Projekt enthält README, Beispieldaten, Tests, Konfiguration ohne Geheimnisse und ein Runbook. Zeige neben dem Erfolgsfall einen absichtlichen Fehler und die Wiederherstellung. Ein Screenshot des Dashboards allein beweist keinen zuverlässigen Job.

Wenn du Zeitersparnis angibst, beschreibe deinen Vergleichsablauf und gemessene Werte. Berücksichtige Kontrolle und Wartung. Hochrechnungen bleiben Schätzungen. Ohne reale Teamnutzung beschreibst du die Demo-Last, nicht einen erfundenen geschäftlichen Nutzen.

Ein besonders guter Transfercheck: Lass eine andere Person oder ein frisches Arbeitsverzeichnis nur nach README starten. Ändere danach eine Anforderung selbst, etwa eine zweite Quelle oder ein anderes Berichtzeitfenster. Erkläre, welche Tests deine Änderung absichern und welche Betriebsannahmen unverändert gelten.

## Ressourcen

[Python-Standardbibliothek](https://docs.python.org/3/library/), [subprocess](https://docs.python.org/3/library/subprocess.html), [HTTPX](https://www.python-httpx.org/), [Playwright für Python](https://playwright.dev/python/docs/intro), [pytest](https://docs.pytest.org/en/stable/), [systemd-Timer](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html), [GitHub Actions](https://docs.github.com/en/actions) und ergänzend [Automate the Boring Stuff with Python](https://automatetheboringstuff.com/).
