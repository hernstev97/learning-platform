## Navigation und Dateien

| Aufgabe | Befehl | Hinweis |
| --- | --- | --- |
| Aktuellen Pfad zeigen | `pwd` | Logischer Pfad der Shell |
| Vorheriges Verzeichnis | `cd -` | Bash nutzt OLDPWD |
| Details inklusive versteckter Einträge | `ls -lah` | `-a` enthält auch `.` und `..` |
| Verzeichnisstruktur anlegen | `mkdir -p ./berichte/2026` | Existierende Verzeichnisse bleiben erhalten |
| Dateityp untersuchen | `file -- bericht.dat` | Inhaltsbasierte Erkennung |
| Metadaten | `stat -- bericht.dat` | Besitzer, Rechte, Zeiten, Größe |
| Datei kopieren | `cp -- quelle.txt ziel.txt` | Bestehendes Ziel vorher prüfen |
| Baum samt Metadaten kopieren | `cp -a -- quelle/ ziel/` | Rechte zum Erhalten von Metadaten nötig |
| Symlink erzeugen | `ln -s release-01 current` | Ziel ist ein Pfad |
| Hilfe in einer Sektion | `man 5 fstab` | 1 Befehle, 5 Formate, 8 Administration |
| Befehlsauflösung | `type python` | Alias, Funktion, Builtin oder Programm |

```bash
find ./logs -type f -name '*.log'
find ./logs -type f -mtime +7
find ./daten -type f -size +100M
find ./logs -type f -name '*.log' -exec wc -l {} +
find ./logs -type f -print0 | xargs -0 -r wc -l
```

## Umleitungen und Textwerkzeuge

| Schreibweise | Wirkung |
| --- | --- |
| `cmd > datei` | stdout überschreibend speichern |
| `cmd >> datei` | stdout anhängen |
| `cmd 2> fehler` | stderr speichern |
| `cmd > alles 2>&1` | Beide Ströme in dieselbe Datei |
| `cmd 2>&1 > daten` | stderr behält das ursprüngliche stdout-Ziel |
| `cmd < datei` | stdin aus Datei |
| `a | b` | stdout von a wird stdin von b |
| `a | tee bericht.txt` | Ausgabe zeigen, speichern und weiterreichen |
| `cat <<'EOF'` | Here-Document ohne Expansion des Inhalts |
| `grep muster <<< "$text"` | Bash-Here-String mit abschließendem Newline |

```bash
head -n 5 app.log
tail -n 50 app.log
tail -F app.log
grep -Fin 'error' app.log
grep -E 'ERROR|WARN' app.log
grep -v '^#' config.txt
cut -d: -f1 /etc/passwd
LC_ALL=C sort werte.txt | uniq -c | sort -nr
sort -t: -k3,3n daten.txt
sed 's/dev/prod/g' config.txt
sed -n '2,5p' app.log
awk -F: '{ print $1, $3 }' /etc/passwd
awk '{ sum += $2 } END { print sum }' laufzeiten.txt
```

| Werkzeug | Merksatz |
| --- | --- |
| `grep -c` | Zählt passende Zeilen, nicht alle Einzelmatches |
| `grep -o` | Gibt passende Teile statt ganzer Zeilen aus |
| `grep -F` | Sucht festen Text statt Regex |
| `uniq` | Fasst nur benachbarte gleiche Zeilen zusammen |
| `wc -l` | Zählt Newline-Zeichen |
| `sort -n` | Numerische Sortierung |
| `sort -h` | Sortierung von Größen wie 2K und 1M |
| `tr` | Übersetzt beziehungsweise entfernt Zeichen |
| `sed -i` | Verändert Dateien; zunächst ohne `-i` prüfen |

## Rechte und Identität

| Wert | Rechte | Typischer Zweck |
| --- | --- | --- |
| 0 | `---` | Kein Zugriff |
| 1 | `--x` | Ausführen beziehungsweise Verzeichnis durchsuchen |
| 4 | `r--` | Lesen |
| 5 | `r-x` | Lesen und ausführen beziehungsweise durchsuchen |
| 6 | `rw-` | Lesen und schreiben |
| 7 | `rwx` | Alle drei klassischen Rechte |
| 600 | `rw-------` | Private Datei |
| 640 | `rw-r-----` | Besitzer schreibt, Gruppe liest |
| 750 | `rwxr-x---` | Privates Gruppenverzeichnis oder Programm |
| 2770 | Setgid + `rwxrwx---` | Neue Einträge übernehmen die Verzeichnisgruppe |
| 1777 | Sticky + `rwxrwxrwx` | Gemeinsam nutzbares temporäres Verzeichnis |

```bash
id
getent passwd deploy
chmod u+x report.sh
chmod 640 config.ini
chgrp developers config.ini
namei -l /srv/app/config.ini
getfacl config.ini
umask 027
sudo -l
sudo visudo -c
```

| Operation | Maßgebliche Prüfung |
| --- | --- |
| Datei lesen | Suchrechte auf dem Pfad und Leserecht an der Datei |
| Dateiinhalt ändern | Pfadzugriff und Schreibrecht an der Datei |
| Namen löschen oder umbenennen | Schreib- und Suchrecht am Elternverzeichnis, weitere Einschränkungen möglich |
| Neue Standarddatei bei umask 027 | Typischerweise 640 aus angefordertem 666 |
| Neues Standardverzeichnis bei umask 027 | Typischerweise 750 aus angefordertem 777 |

## Prozesse, Dienste und Logs

```bash
ps -eo pid,ppid,user,stat,pcpu,pmem,comm --sort=-pcpu
top
pgrep -a nginx
kill -TERM PID
systemctl status app.service
systemctl cat app.service
systemctl --failed
journalctl -u app.service -b -n 100 --no-pager
journalctl -u app.service --since '1 hour ago'
journalctl -k -b
systemctl list-timers --all
systemd-analyze calendar 'daily'
```

| Aktion | Befehl | Zeitpunkt |
| --- | --- | --- |
| Start | `sudo systemctl start app` | Jetzt |
| Bootaktivierung | `sudo systemctl enable app` | Künftige Aktivierung über Installationsverknüpfungen |
| Beides | `sudo systemctl enable --now app` | Jetzt und nach Konfiguration beim Boot |
| Dienstkonfiguration neu lesen | `sudo systemctl reload app` | Nur wenn unterstützt |
| Unitdateien neu lesen | `sudo systemctl daemon-reload` | systemd-Konfiguration |
| Geordnet neu starten | `sudo systemctl restart app` | Stoppen, dann starten |
| Timerübersicht | `systemctl list-timers --all` | Planung und letzte Auslösung |

## Netzwerk und SSH

```bash
ip -br addr
ip route
ip route get 203.0.113.10
ss -tulpn
ss -ltnp 'sport = :8000'
getent ahosts app.example
dig +short app.example
curl --fail -sS --max-time 5 https://app.example/health
curl -v --max-time 5 https://app.example/health
ssh -J gateway target
ssh -L 15432:127.0.0.1:5432 server
rsync -an -- ./daten/ server:/srv/backup/daten/
```

```text title=~/.ssh/config
Host demo
    HostName server.example
    User deploy
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 30
```

| Prüfung | Aussagegrenze |
| --- | --- |
| `ping -c 3 HOST` | ICMP-Erreichbarkeit; kein HTTP-Nachweis |
| `ss -ltnp` | Lokaler Listener; keine externe Firewallprüfung |
| `dig HOST` | DNS-Abfrage; kein vollständiger NSS-Weg |
| `curl --fail` | HTTP-Fehlerstatus beeinflusst Exit-Status |
| `sshd -t` | Konfigurationstest; kein Test eines neuen Logins |
| `rsync -an` | Dry-run, noch keine Übertragung |
| Quelle `daten/` | Inhalt des Verzeichnisses übertragen |
| `rsync --delete` | Entfernt zusätzliche Zielinhalte; bewusst prüfen |

## Bash-Skelett und Expansionen

```bash
#!/usr/bin/env bash
set -u

if [[ $# -ne 1 ]]; then
  printf 'Aufruf: %s DATEI\n' "$0" >&2
  exit 2
fi

tmp=$(mktemp) || exit 1
trap 'rm -f -- "$tmp"' EXIT

if wc -l < "$1" > "$tmp"; then
  cat -- "$tmp"
else
  status=$?
  printf 'Auswertung fehlgeschlagen\n' >&2
  exit "$status"
fi
```

| Ausdruck | Bedeutung |
| --- | --- |
| `"$@"` | Alle Positionsargumente mit ihren Grenzen |
| `"${dateien[@]}"` | Alle Arrayelemente mit ihren Grenzen |
| `${wert:-standard}` | Standard bei unset oder leer |
| `${wert-standard}` | Standard nur bei unset |
| `${pfad##*/}` | Längsten passenden Präfix bis zum letzten Slash entfernen |
| `${name%.*}` | Kürzesten passenden Suffix ab dem letzten Punkt entfernen |
| `$(cmd)` | stdout einsetzen; abschließende Newlines entfernen |
| `$(( a + b ))` | Ganzzahlarithmetik |
| `[[ -f $pfad ]]` | Reguläre Datei |
| `[[ -z $wert ]]` | Leerer String |
| `return 1` | Funktion erfolglos beenden |
| `exit 1` | Skriptprozess erfolglos beenden |

```bash
bash -n report.sh
shellcheck report.sh
while IFS= read -r line || [[ -n $line ]]; do
  printf '%s\n' "$line"
done < eingabe.txt
```

`set -euo pipefail`: Hilfen mit Kontextgrenzen; erwartete Sonderstatus ausdrücklich behandeln.

## Pakete: apt und pacman

| Aufgabe | Debian / Ubuntu | Arch / CachyOS |
| --- | --- | --- |
| Vollständiger üblicher Updateablauf | `sudo apt update` und `sudo apt upgrade` | `sudo pacman -Syu` |
| Installieren | `sudo apt install PAKET` | `sudo pacman -S PAKET` |
| Suchen | `apt search SUCHTEXT` | `pacman -Ss SUCHTEXT` |
| Installierte Pakete | `apt list --installed` | `pacman -Q` |
| Paketdetails | `apt show PAKET` | `pacman -Si PAKET` |
| Besitzer einer installierten Datei | `dpkg -S /pfad/datei` | `pacman -Qo /pfad/datei` |
| Paketdateien auflisten | `dpkg -L PAKET` | `pacman -Ql PAKET` |
| Entfernen | `sudo apt remove PAKET` | `sudo pacman -R PAKET` |

## Container

```bash
docker build -t learn-web:1.0 .
docker run --rm -p 127.0.0.1:8080:8000 learn-web:1.0
docker ps -a
docker logs --tail 50 learn-web
docker inspect learn-web
docker exec learn-web id
docker stop learn-web
docker compose config
docker compose up -d --build
docker compose ps
docker compose down
```

| Begriff | Grenze |
| --- | --- |
| `-p 127.0.0.1:8080:8000` | Hostadresse, Hostport, Containerport |
| `EXPOSE` | Dokumentiert; veröffentlicht keinen Hostport |
| `USER` | Laufzeitidentität; Datenpfade brauchen passende Rechte |
| `CMD` | Überschreibbarer Standardstart beziehungsweise Standardargumente |
| `ENTRYPOINT` | Festes Programm bei üblicher Exec-Form |
| Named Volume | Daten unabhängig vom Container; kein automatisches Backup |
| Bind-Mount | Konkreter Hostpfad; Hostrechte und Pfadlayout beachten |
| `depends_on: {db: {condition: service_healthy}}` | Wartet beim Start auf den Healthcheck von db |
| `down -v` | Zusätzliche Volumelöschung; keine normale harmlose Aufräumroutine |
| Podman | Viele Basisbefehle ähnlich; Rootless-Rechte und Optionen gesondert prüfen |

## Speicher und schnelle Diagnose

| Symptom | Erste Prüfungen |
| --- | --- |
| Platte voll | `findmnt -T PFAD`, `df -h PFAD`, `df -i PFAD` |
| Große Verbraucher | `du -xhd1 PFAD` |
| df und du unterscheiden sich | `lsof +L1`, Mounts, Rechte, Snapshots |
| Speicher knapp | `free -h`, `swapon --show`, `cat /proc/pressure/memory` |
| Hohe Last | `uptime`, `vmstat 1 5`, `iostat -xz 1 5` |
| Prozessressourcen | `pidstat -u -d -r 1 5` |
| Dienst startet nicht | `systemctl status UNIT`, `journalctl -u UNIT -b` |
| Permission denied | `namei -l PFAD`, `getfacl PFAD`, Dienstidentität |
| Unklarer Systemaufruf | `strace -f -e trace=openat,connect -p PID` |
| fstab geändert | `findmnt --verify --verbose`; Mountversuch separat in Test-VM |
| Backupstand prüfen | `restic snapshots`, `restic check` |
| Restore prüfen | `restic restore SNAPSHOT --target ./restore-test` |

## Offizielle Referenzen

[Bash](https://www.gnu.org/software/bash/manual/bash.html) · [Coreutils](https://www.gnu.org/software/coreutils/manual/coreutils.html) · [Linux man-pages](https://man7.org/linux/man-pages/) · [systemd](https://www.freedesktop.org/software/systemd/man/latest/) · [OpenSSH](https://man.openbsd.org/ssh) · [Docker](https://docs.docker.com/) · [Podman](https://docs.podman.io/) · [Restic](https://restic.readthedocs.io/en/stable/)
