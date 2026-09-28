## Was Linux-Kenntnisse im Beruf zeigen

Linux-Kenntnisse sind besonders dann sichtbar, wenn du eine Anwendung außerhalb deiner IDE erklären und betreiben kannst: Woher kommt ihre Konfiguration? Unter welchem Benutzer läuft sie? Was passiert nach einem Neustart? Wie findest du eine fehlgeschlagene Anfrage in den Logs? Dieser Lernbereich zielt auf solche überprüfbaren Fähigkeiten.

Die folgende Rollenübersicht ist eine Orientierung für die Arbeit, keine Aussage darüber, dass jeder Arbeitgeber dieselben Aufgaben gleich benennt. Lies konkrete Stellenanzeigen nach Tätigkeiten, Verantwortungsumfang und verwendeter Infrastruktur. Ein Junior muss nicht schon ein großes Produktionssystem allein verantworten; wichtig sind belastbare Grundlagen, ein vorsichtiger Umgang mit fremden Systemen und ein nachvollziehbarer Lernweg.

| Rolle | Wo Linux vorkommt | Geeigneter Nachweis |
| --- | --- | --- |
| Softwareentwickler / Backend Developer | Entwicklungsumgebung, Prozesse, Logs, Dateien, lokale Dienste, CI | Eigene Anwendung unter einer begrenzten Identität starten und einen Fehler diagnostizieren |
| DevOps Engineer | Build- und Releaseabläufe, Container, Konfiguration und Zusammenarbeit zwischen Entwicklung und Betrieb | Reproduzierbares Deployment mit Prüfungen, Rückweg und dokumentierten Datenpfaden |
| Site Reliability Engineer | Zuverlässigkeit, Messung, Incidents, Kapazität und Automatisierung | Ein konkretes Symptom mit Messwerten eingrenzen und einen passenden Alarm begründen |
| Platform Engineer | Gemeinsame Laufzeit- und Entwicklungswege für andere Teams | Ein dokumentierter Standardweg, der Einrichtung und Betrieb einer kleinen App vereinfacht |
| Systemadministrator | Benutzer, Pakete, Speicher, Netzwerke, Dienste und Wiederherstellung | Eine VM samt Zugängen, Updates und getesteten Backups betreiben |

Für DevOps, SRE und Platform-Rollen kommen je nach Stelle weitere Themen hinzu, etwa Cloudplattformen, Infrastructure as Code oder verteilte Systeme. Sie gehören nicht automatisch zu jeder Einstiegsaufgabe. Nutze diesen Kurs als tragfähige Basis und ergänze danach gezielt die Anforderungen einer realen Zielrolle.

## Was du konkret demonstrieren können solltest

Du solltest die wichtigsten Werkzeuge nicht nur erkennen, sondern ihren Einsatz begründen können. Wer bei `Permission denied` sofort `chmod 777` setzt, zeigt einen anderen Umgang mit Betrieb als jemand, der Identität, Pfad und benötigte Operation prüft. Ebenso ist ein Containerstart weniger aussagekräftig als ein dokumentierter Neustart mit erhaltenen Daten und einer erfolgreichen Anfrage.

Ein guter erster Kompetenznachweis enthält diese Fähigkeiten:

- Du navigierst sicher, untersuchst Dateitypen und vermeidest Datenverlust bei Pfadoperationen.
- Du schreibst eine kleine Textauswertung und prüfst sie gegen bekannte Eingaben.
- Du erklärst Benutzer, Gruppen, Verzeichnisrechte und den Zweck begrenzter Dienstkonten.
- Du liest Dienstzustand und Logs im richtigen Zeitfenster und kennst den Unterschied zwischen start, enable und reload.
- Du unterscheidest DNS-, Verbindungs-, TLS- und HTTP-Probleme.
- Du schreibst ein kleines Bash-Skript mit Argumentvertrag und getesteten Fehlerfällen.
- Du erklärst, welche Daten persistent sind und wie ein ausgewählter Stand wiederhergestellt wird.
- Du dokumentierst, was beobachtet, geändert und anschließend wirklich geprüft wurde.

Für eine Bewerbung im deutschsprachigen Raum kannst du README und Übergabe auf Deutsch schreiben und technische Bezeichner beibehalten. Eine kurze englische Projektzusammenfassung zeigt zusätzlich, dass du dich in der üblichen Werkzeugdokumentation zurechtfindest. Verständlichkeit und überprüfbare Aussagen sind wichtiger als künstlich komplizierte Fachsprache.

## Vorstellungsgespräch und praktische Aufgaben

Ein sinnvolles technisches Gespräch wechselt zwischen Wissen, Anwendung und Abwägung. Übe Antworten in drei Schritten: ein klarer Kernsatz, ein konkretes Beispiel und eine Grenze. Bei „Was ist ein Snapshot?“ erklärst du den festgehaltenen Stand, zeigst einen möglichen Rollback und grenzt ihn vom unabhängigen Backup ab.

Für eine praktische Übung kannst du dir eine eigene Test-VM mit einer kleinen Störung vorbereiten. Beispiele sind ein falscher Unitpfad, eine an Loopback gebundene App, ein fehlendes Suchrecht in einem Elternverzeichnis oder ein Healthcheck, der HTTP 500 fälschlich als Erfolg wertet. Die Bewertung sollte sich auf deinen Diagnoseweg beziehen, nicht darauf, ob du den ersten Befehl sofort auswendig weißt.

| Aufgabe | Was du zeigen kannst |
| --- | --- |
| „Der Dienst startet nach dem Boot nicht.“ | Aktivierung, Unitabhängigkeiten, Journal des aktuellen Boots und echten Endpunkt prüfen |
| „Die Platte ist voll, du findet wenig.“ | Mount, Inodes, offene gelöschte Dateien, Snapshots und Messgrenzen unterscheiden |
| „Review dieses Bash-Skript.“ | Quoting, Argumentgrenzen, Exit-Status, temporäre Dateien und Löschziele erklären |
| „Deploy diese kleine App.“ | Benutzer, Konfiguration, Portbindung, Datenpfad, Healthcheck und Rückweg festlegen |
| „Wie testest du ein Backup?“ | Gewählten Stand getrennt wiederherstellen und eine fachliche Funktion prüfen |

Sag im Gespräch offen, wenn du einen Schalter nachschlagen musst. Beschreibe zuerst die Frage, die dein Befehl beantworten soll. Manpages zu verwenden ist im Alltag sinnvoll; unüberprüfte Befehle mit Root-Rechten auszuführen ist kein Kompetenznachweis. Die [Interviewkarten](/linux/karten) helfen bei kurzen Erklärungen, ersetzen aber die Arbeit in der eigenen Umgebung nicht.

## Ein Portfolio mit nachvollziehbaren Betriebsnachweisen

Ein Homelab-Repository ist dann aussagekräftig, wenn eine andere Person seinen Umfang versteht und die wichtigsten Schritte nachvollziehen kann. Veröffentliche keine echten Keys, Tokens, privaten IP-Topologien oder unbereinigten Nutzerlogs. Ein Diagramm mit Rollen und Beispieladressen reicht für die technische Erklärung.

Beginne mit einem kleinen Projekt wie dem [Dotfiles-Installer](/linux/projekte/dotfiles-installer) oder dem [Loganalyse-Toolkit](/linux/projekte/loganalyse-toolkit). Zeige einen normalen Lauf, eine Wiederholung und einen absichtlich ausgelösten Fehler. Das schafft eine überprüfbare Grundlage, bevor du viele weitere Werkzeuge hinzufügst.

Das [Abschlussprojekt](/linux/projekte/server-produktionsreif) verbindet den gesamten Kurs. Eine überzeugende Abgabe enthält ein README, ein Architekturdiagramm, eine begrenzte Startkonfiguration, getestete Backups, einen Alarmnachweis und ein kurzes Postmortem. Erläutere Entscheidungen: Weshalb ist die Datenbank intern? Weshalb läuft die App als eigener Benutzer? Welche Störung findet dein Healthcheck, welche nicht?

Schreibe den Projektstand präzise in die Bewerbung: „Debian-Test-VM mit systemd-Dienst, TLS-Proxy und dokumentiertem Restore betrieben“ ist überprüfbarer als „Experte für sichere Cloud-Infrastruktur“. Nenne selbst geleistete Arbeit und verwendete Hilfsmittel ehrlich. Ein nachgebauter Entwurf wird zur eigenen Arbeitsprobe, wenn du Entscheidungen erklären, Varianten testen und Fehler selbst eingrenzen kannst.

## Zertifikate sinnvoll einordnen

Ein Zertifikat kann einen strukturierten Lernplan und einen externen Nachweis liefern. Ob es für deine Bewerbung die beste Verwendung von Zeit und Geld ist, hängt von Zielrolle und konkreten Stellenanforderungen ab. Prüfe vor einer Buchung die aktuellen Prüfungsziele, Sprache, technische Umgebung und Bedingungen direkt beim Anbieter. Die folgenden Links sind die maßgeblichen Ausgangspunkte, keine Preis- oder Einstellungsversprechen.

| Zertifikat | Schwerpunkt | Wann es zum Lernziel passen kann |
| --- | --- | --- |
| [LPIC-1](https://www.lpi.org/our-certifications/lpic-1-overview/) | Distributionsübergreifende Grundlagen; zwei Prüfungen mit Wissens- und Eingabefragen | Wenn du einen breiten Grundlagenrahmen systematisch abdecken willst |
| [LFCS](https://training.linuxfoundation.org/certification/linux-foundation-certified-sysadmin-lfcs/) | Praktische Linux-Administration mit leistungsbasierter Prüfung | Wenn du administrative Aufgaben unter klaren Zeit- und Umgebungsbedingungen üben möchtest |
| [RHCSA](https://www.redhat.com/en/services/certification/rhcsa) | Praktische Administration im Red-Hat-Enterprise-Linux-Umfeld | Wenn konkrete Zielstellen mit RHEL arbeiten oder diesen Nachweis nennen |

Keines dieser Zertifikate ersetzt den Restore einer eigenen Anwendung oder eine verständliche Fehleranalyse. Umgekehrt ersetzt dieses Lernangebot keine vollständige Prüfungsvorbereitung auf jeden offiziellen Themenpunkt. Vergleiche die aktuellen Prüfungsziele mit deinen Fähigkeiten und schließe konkrete Lücken, statt nur den Namen einer Zertifizierung zu sammeln.

## Ein anpassbarer Plan für zwölf Wochen

Plane ungefähr sechs bis zehn konzentrierte Stunden pro Woche, wenn du diesen Vorschlag nutzen möchtest. Das ist eine Planungshilfe, keine Garantie für Jobbereitschaft nach zwölf Wochen. Wenn ein Modul mehr Übung braucht, verschiebst du den Folgeschritt. Beginne den Serverentwurf in Woche acht und entwickle ihn parallel weiter, damit die letzte Woche der Abnahme statt einem hektischen Neubau dient.

| Woche | Module und Schwerpunkt | Sichtbares Ergebnis |
| --- | --- | --- |
| 1 | Linux & die Shell; Dateisystem & Navigation | Eigene Testumgebung, Hilfe finden, Pfade und Links erklären |
| 2 | Textverarbeitung & Pipes | Kleines Logsample samt geprüftem Häufigkeitsbericht |
| 3 | Rechte & Benutzer | Konfiguration für einen Dienst gezielt lesbar machen und Zugriff prüfen |
| 4 | Prozesse & Signale; Paketverwaltung | Prozessbaum erklären, geordnet stoppen, Updateablauf dokumentieren |
| 5 | systemd, Dienste & Logs | Eigene Demo-Unit mit Timer und Journalnachweis |
| 6 | Netzwerk & SSH | Schlüsselzugang, Portbindung und eine nach Schichten diagnostizierte Störung |
| 7 | Robuste Bash-Skripte | CLI mit Quoting, hilfreichen Fehlern und Tests für leere oder fehlende Eingaben |
| 8 | Speicher, Dateisysteme & Backups | Erster getrennter Restore; Daten- und Architekturplan des Servers |
| 9 | Sicherheit & Härtung | Getestete Zugänge, Firewallplan und begrenzte Dienstidentität im Abschlussprojekt |
| 10 | Container mit Docker & Podman | Reproduzierbares Image oder begründeter systemd-Betrieb samt Betriebsvergleich |
| 11 | Systematische Fehlersuche | Zwei kontrollierte Störungen, Messprotokoll, Alarm und Reparaturnachweis |
| 12 | Abschlussprojekt und Interviewtraining | Reboot-Demo, Restore, grüner Prüfablauf, README und kurze Präsentation |

Wiederhole wöchentlich einige Karten und erkläre ein eigenes Kommando ohne Spickzettel. Nutze die Exportfunktion der Plattform für deinen lokalen Lernfortschritt. Der stärkere Nachweis bleibt dein Projekt: gespeicherte Testfälle, dokumentierte Befunde und ein Ergebnis, das nach einer frischen Einrichtung wieder funktioniert.

## Ressourcen für die nächsten Schritte

- [Linux man-pages](https://man7.org/linux/man-pages/) für genaue Kernel- und Systembegriffe; beginne bei der passenden Sektion.
- [GNU Bash-Handbuch](https://www.gnu.org/software/bash/manual/bash.html) und [ShellCheck](https://www.shellcheck.net/) für Shellsyntax, Fehlerfälle und konkrete Regelbegründungen.
- [systemd-Handbücher](https://www.freedesktop.org/software/systemd/man/latest/) für Units, Timer, Logs und Diensthärtung.
- [ArchWiki](https://wiki.archlinux.org/) für technische Hintergründe und Arch-bezogene Betriebsfragen; beachte Distributionsunterschiede.
- [Ubuntu Server-Dokumentation](https://ubuntu.com/server/docs/) für die eigene Debian- beziehungsweise Ubuntu-nahe Serverpraxis, mit Prüfung der jeweils unterstützten Distribution.
- [The Linux Command Line von William Shotts](https://linuxcommand.org/tlcl.php) als längere zusammenhängende Einführung mit Übungen.
- [OverTheWire Bandit](https://overthewire.org/wargames/bandit/) für zusätzliche Kommandozeilenübungen in der ausdrücklich dafür bereitgestellten Umgebung und nach deren Regeln.
- [Docker-Dokumentation](https://docs.docker.com/) und [Podman-Dokumentation](https://docs.podman.io/) für die konkret eingesetzte Containerumgebung.
