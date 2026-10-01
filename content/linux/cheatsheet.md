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

## Shell-Start und Umgebung

| Start | Beispiel | bash liest (Debian) |
| --- | --- | --- |
| Login, interaktiv | Konsole, `ssh host`, `su -`, `sudo -i` | `/etc/profile` → `/etc/bash.bashrc`, `/etc/profile.d/*.sh`; erste von `~/.bash_profile`, `~/.bash_login`, `~/.profile` |
| interaktiv, kein Login | `bash`, neues Terminalfenster | `/etc/bash.bashrc`, `~/.bashrc` |
| weder noch | Skript, `bash -c`, cron, systemd | nichts (`$BASH_ENV`) |
| `ssh host befehl` | Pipeline | `~/.bashrc`, die auf Debian sofort aussteigt |

| Aufgabe | Befehl |
| --- | --- |
| Login-Shell? | `shopt login_shell` · `echo $0` (`-bash`) |
| Interaktiv? | `echo $-` (enthält `i`) |
| Startdatei neu lesen | `source ~/.profile` oder `exit` und neu anmelden |
| Variable für alle Anmeldungen | `echo 'NAME=wert' \| sudo tee -a /etc/environment` (kein `$VAR`, wirkt nicht für sudo/Dienste) |
| Skript zum Befehl | `#!/usr/bin/env bash`, `chmod +x`, nach `~/bin` |
| Link auf Verzeichnis umschalten | `ln -sfn releases/v43 current` |
| Alte Archive löschen | `find DIR -maxdepth 1 -type f -name 'x-*.gz' -mtime +14` prüfen, dann `-delete` anhängen |

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
| `set -o pipefail` | Pipeline scheitert, wenn ein Glied scheitert; `echo "${PIPESTATUS[@]}"` zeigt alle Status |
| `awk '$9 >= 500' access.log` | nginx combined: IP `$1`, Zeit `$4`, Pfad `$7`, Status `$9`, Bytes `$10` |
| `cmd > tmp && mv tmp datei` | Datei sicher ersetzen; nie `cmd datei > datei` |

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

## ACL, sudoers und Capabilities

```bash
setfacl -m u:bob:r-- bericht.txt          # einzelne Freigabe
setfacl -d -m g::rwx,o::--- /srv/team     # Default-ACL für neue Einträge
getfacl -p datei                          # mask:: begrenzt user:NAME, group::, group:NAME
sudo visudo -cf entwurf                   # sudoers-Entwurf prüfen
sudo install -m 0440 -o root -g root entwurf /etc/sudoers.d/deploy   # Name ohne Punkt!
sudo -l -U deploy                         # was darf deploy?
/usr/sbin/getcap /pfad/programm           # Datei-Capabilities
```

| Merksatz | |
| --- | --- |
| `chmod` an den Gruppenbits einer ACL-Datei | ändert die Maske, nicht `group::` |
| `/etc/sudoers.d/*.conf` | wird ignoriert (Punkt im Namen) |
| `*` in sudoers-Argumenten | deckt auch Leerzeichen und weitere Argumente ab |
| Port < 1024 ohne root | `AmbientCapabilities=CAP_NET_BIND_SERVICE` in der Unit |
| `fs.protected_regular = 2` (Debian) | `>>` auf fremde Datei in `/tmp` scheitert trotz 666 |

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

| Frage | Befehl |
| --- | --- |
| Wer hält Port 8080? | `sudo ss -ltnp 'sport = :8080'`, `sudo fuser -v 8080/tcp`, `sudo lsof -i :8080` |
| Wer hat den Prozess gestartet? | `ps -o pid,ppid,user,unit,cmd -p PID`, `systemctl status PID` |
| Welche Signale ignoriert/fängt er? | `grep -E '^Sig(Ign\|Cgt)' /proc/PID/status` (Bit n−1 = Signal n, TERM = `0x4000`) |
| Offene, gelöschte Dateien | `lsof +L1`, `ls -l /proc/PID/fd` |
| Eigenschaft einer Unit | `systemctl show -p MainPID,NRestarts,Result --value app` |
| Drop-in ohne Editor | `sudo mkdir -p /etc/systemd/system/app.service.d && printf '[Service]\nRestartSec=2\n' \| sudo tee …/override.conf && sudo systemctl daemon-reload` |
| Startlimit zurücksetzen | `sudo systemctl reset-failed app` |
| Timer prüfen | `systemctl list-timers --all`, `systemctl status app.timer` (Trigger/Triggers), `systemd-analyze calendar 'Mon..Fri 06:30'` |
| Script mit Priorität loggen | `logger -t backup -p user.err "…"`, `echo … \| systemd-cat -t backup -p warning` |
| 203/EXEC | `ls -l`, `file skript`, `head -n1 skript \| od -c`, `sed -i 's/\r$//' skript` |

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
| Verfügbare Versionen | `apt-cache policy PAKET` | `ls /var/cache/pacman/pkg/PAKET-*` |
| Ältere Version | `sudo apt install PAKET=VERSION --allow-downgrades` | `sudo pacman -U /var/cache/pacman/pkg/DATEI` |
| Version festhalten | `sudo apt-mark hold PAKET` | `IgnorePkg = PAKET` in `/etc/pacman.conf` |

## Pakete reparieren

| Problem | Befehl |
| --- | --- |
| Halbe Installationen finden | `sudo dpkg --audit` |
| Konfiguration wiederholen | `sudo dpkg --configure -a` |
| Fehlende Abhängigkeiten nachziehen | `sudo apt -f install` |
| Paketstatus | `dpkg-query -W -f '${Status}\n' PAKET` |
| Maintainer-Skript lesen | `cat /var/lib/dpkg/info/PAKET.postinst` |
| `NO_PUBKEY` | Schlüssel nach `/etc/apt/keyrings/NAME.asc`, `Signed-By:` in der `.sources`-Datei prüfen |
| Fehlende Bibliothek | `ldd PROGRAMM \| grep 'not found'` |
| Bibliotheksverzeichnis eintragen | `echo /opt/APP/lib \| sudo tee /etc/ld.so.conf.d/APP.conf && sudo ldconfig` |
| Cache abfragen | `/sbin/ldconfig -p \| grep NAME` |

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

```bash
cat /etc/resolv.conf; grep '^hosts:' /etc/nsswitch.conf
getent -s files hosts NAME      # nur /etc/hosts
getent -s dns hosts NAME        # nur DNS
dig +noall +answer NAME         # Records samt TTL
dig @SERVER NAME | grep status: # NOERROR, NXDOMAIN, SERVFAIL, REFUSED
resolvectl status; resolvectl query NAME; resolvectl flush-caches
sudo tcpdump -i any -n -c 20 port 53
sudo tcpdump -i eth0 -n -w mitschnitt.pcap 'tcp port 443'; tcpdump -n -r mitschnitt.pcap
nmcli connection modify "PROFIL" ipv4.method manual ipv4.addresses 192.168.10.20/24 ipv4.gateway 192.168.10.1
nmcli connection up "PROFIL"; sudo networkctl reload; networkctl status IF
ssh -v -o BatchMode=yes user@host true; journalctl -u ssh -n 20
```

| Meldung | Bedeutung |
| --- | --- |
| `Name or service not known` | NXDOMAIN: Name gibt es nicht |
| `No address associated with hostname` | NODATA: Name ohne A/AAAA |
| `Temporary failure in name resolution` | SERVFAIL, REFUSED oder kein Server erreichbar |
| `bad ownership or modes for …` (Journal) | StrictModes: Rechte auf dem Weg zu authorized_keys |

## Desktop, Geräte und Rechte

```bash
echo $XDG_SESSION_TYPE                       # wayland, x11, tty
loginctl show-session "$XDG_SESSION_ID" -p Type -p Seat
busctl list; busctl --user list
busctl get-property org.freedesktop.hostname1 /org/freedesktop/hostname1 org.freedesktop.hostname1 Hostname
pkaction --verbose --action-id org.freedesktop.login1.reboot
journalctl -u polkit                          # Fehler in Regeln
udevadm info -a /dev/ttyUSB0                  # Attribute für Regeln
sudo udevadm control --reload && sudo udevadm trigger --action=add --settle /dev/ttyUSB0
sudo udevadm test /sys/class/tty/ttyUSB0      # welche Regel setzt was
lspci -k -d ::03xx                            # Grafik + gebundener Treiber
cat /sys/module/nvidia_drm/parameters/modeset
wpctl status; systemctl --user restart pipewire pipewire-pulse wireplumber
desktop-file-validate ~/.local/share/applications/app.desktop
systemctl --user list-dependencies xdg-desktop-autostart.target
```

| Was | Benutzer | System |
| --- | --- | --- |
| Konfiguration | `~/.config` | `/etc/xdg` |
| Starter | `~/.local/share/applications` | `/usr/share/applications` |
| Autostart | `~/.config/autostart` | `/etc/xdg/autostart` |
| polkit-Regeln | – | `/etc/polkit-1/rules.d` vor `/usr/share/polkit-1/rules.d` |
| udev-Regeln | – | `/etc/udev/rules.d` vor `/usr/lib/udev/rules.d` |

Gleicher Dateiname beim Benutzer ersetzt die Systemdatei. `Hidden=true` heißt „gelöscht“, `NoDisplay=true` heißt „nicht im Menü“.

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

## Umgebung: sudo, cron, systemd, ssh (Debian 12)

| Aufruf | Startdateien | PATH | Arbeitsverzeichnis |
| --- | --- | --- | --- |
| Terminal | `~/.profile`, `~/.bashrc` | `/usr/local/bin:/usr/bin:/bin:…` + eigene | aktuelles |
| `sudo befehl` | keine, `env_reset` | `secure_path` | aktuelles |
| cron | keine, `/bin/sh` | `/usr/bin:/bin` | `$HOME` |
| systemd-Dienst | keine | `/usr/local/sbin:…:/sbin:/bin` | `/` |
| `ssh host befehl` | `~/.bashrc` bis zur `case $-`-Abfrage | `/usr/local/bin:/usr/bin:/bin:/usr/games` | `$HOME` |

```bash
sudo systemd-run --wait --pipe -p User=ops env   # Umgebung eines Dienstes
* * * * * env > /tmp/cron-env.txt                # Umgebung eines Cronjobs
ziel=${BACKUP_ZIEL:?nicht gesetzt}               # Pflichtvariable mit Meldung
# crontab: % als \% schreiben, Ausgabe selbst in ein Log umleiten
```

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

## LVM, LUKS und Plattenprüfung

```bash
sudo pvs; sudo vgs; sudo lvs                    # Platten, Gruppen, Volumes
sudo pvcreate /dev/sdc                          # neue Platte vorbereiten (löscht ihren Anfang)
sudo vgextend vgdata /dev/sdc                   # in die Volume Group aufnehmen
sudo lvextend -r -l +100%FREE vgdata/app        # LV und Dateisystem vergrößern
sudo resize2fs /dev/vgdata/app                  # ext4 nachziehen, falls ohne -r
sudo xfs_growfs /srv/app                        # XFS nachziehen (Mountpunkt)
sudo lvcreate -s -n app-snap -L 1G vgdata/app   # Snapshot, danach lvremove
sudo cryptsetup luksDump /dev/sdb               # Header, Keyslots
sudo cryptsetup open --key-file KEY /dev/sdb NAME   # → /dev/mapper/NAME
sudo cryptsetup close NAME
sudo cryptsetup luksAddKey /dev/sdb NEUER-KEY   # zusätzlicher Keyslot
sudo cryptsetup luksHeaderBackup /dev/sdb --header-backup-file sdb-header.img
sudo e2fsck -f -n /dev/sdb1                     # nur ansehen, ausgehängt
sudo e2fsck -f -y /dev/sdb1                     # reparieren, ausgehängt
sudo tune2fs -l /dev/sdb1                       # Superblock: state, Mount count, Last checked
sudo dmesg -T --level=err,warn | tail           # Kernelfehler mit Uhrzeit
journalctl -k -p err -b -1                      # Kernelfehler des vorigen Boots
sudo smartctl -H -A /dev/sdb                    # SMART-Bewertung und Attribute
sudo smartctl -t long /dev/sdb; sudo smartctl -l selftest /dev/sdb
```

| Wert | Bedeutung |
| --- | --- |
| fstab, 6. Feld | `0` keine Prüfung, `1` Wurzel, `2` alle anderen |
| e2fsck-Exit-Code | `0` sauber, `1` behoben, `2` behoben + Neustart, `4` Fehler bleiben, `8` Bedienfehler |
| crypttab | `NAME  UUID=…  /etc/cryptsetup-keys.d/NAME.key  luks` |
| Keyfile | root, `chmod 400`, ohne Zeilenumbruch (`printf '%s'`, nicht `echo`) |
| SMART 5 / 187 / 197 / 198 | Rohwert > 0 und steigend: Platte tauschen |
| SMART 199 | CRC-Fehler, eher Kabel oder Anschluss |
| NVMe | `Critical Warning`, `Available Spare`, `Percentage Used`, `Media and Data Integrity Errors` |

## Boot und Recovery

| Aufgabe | Befehl |
| --- | --- |
| Kernelzeile dieses Boots | `cat /proc/cmdline` |
| GRUB-Konfiguration neu erzeugen | `sudo update-grub` (Arch/Fedora: `grub-mkconfig -o /boot/grub/grub.cfg`) |
| Einmalig einen Eintrag starten | `sudo grub-reboot "Untermenü>Eintrag"`, prüfen mit `sudo grub-editenv list` |
| Standardziel | `systemctl get-default`, `sudo systemctl set-default multi-user.target` |
| fstab vor dem Neustart prüfen | `sudo findmnt --verify`, `sudo systemctl daemon-reload`, `sudo systemctl start <pfad>.mount` |
| Was blockiert den Start? | `systemctl show -p Requires local-fs.target` |
| Voriger Boot | `journalctl -b -1 -p err` |
| initramfs neu bauen | Debian `update-initramfs -u -k all` · Arch `mkinitcpio -P` · Fedora `dracut -f --regenerate-all` |
| initramfs-Inhalt | `lsinitramfs` · `lsinitcpio` · `lsinitrd` |

| Kernelparameter | Wirkung |
| --- | --- |
| `systemd.unit=rescue.target` / `single` | Rescue: fstab eingehängt, root-Passwort |
| `systemd.unit=emergency.target` / `emergency` | Emergency: nur `/`, root-Passwort |
| `init=/bin/bash` | Shell als PID 1, kein Passwort; `mount -o remount,rw /`, danach `exec /sbin/init` |

GRUB-Menü: `e` editieren, ↓ zur `linux`-Zeile, Strg+E ans Ende, Strg+X booten.
chroot: `mount` Root → `/mnt`, `/boot` bzw. ESP darunter, `for d in dev proc sys run; do mount --rbind /$d /mnt/$d; done`, `chroot /mnt`, am Ende `umount -R /mnt`.

## Härtung prüfen

```bash
sudo sshd -t && sudo sshd -T | grep -E '^(passwordauthentication|kbdinteractiveauthentication|permitrootlogin|allowusers)'
sudo sshd -T -C user=deploy,host=client,addr=192.0.2.10
ssh -o PubkeyAuthentication=no -o BatchMode=yes user@host true   # (publickey) = keine Passwörter mehr
sudo find / -xdev -perm -4000 -type f; sudo -l
systemd-analyze security --no-pager UNIT | tail -1               # < 5,0 = OK
```

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

## Container ohne Container-Engine

```bash
lsns                                                  # Namespaces und ihre Prozesse
sudo unshare --pid --fork --mount-proc ps -ef         # eigener PID-Namespace
cat /proc/self/cgroup                                 # eigene cgroup
systemd-cgls; systemd-cgtop                           # cgroup-Baum, Verbrauch
sudo systemd-run --scope -p MemoryMax=256M BEFEHL     # Prozess mit Speichergrenze
sudo systemctl set-property UNIT MemoryMax=64M CPUQuota=20%
cat /sys/fs/cgroup/system.slice/UNIT/memory.max       # wirksame Grenze
```

| Docker | cgroup v2 | systemd |
| --- | --- | --- |
| `--memory=512m` | `memory.max` = 536870912 | `MemoryMax=512M` |
| `--cpus=0.5` | `cpu.max` = `50000 100000` | `CPUQuota=50%` |

## Engpässe lesen

| Werkzeug | Spalte | Achte auf |
| --- | --- | --- |
| `vmstat 1 5` | `r` | dauerhaft mehr als CPUs: CPU gesättigt |
| | `b`, `wa` | Aufgaben warten auf I/O |
| | `si`, `so` | Swapping; ohne Swap immer 0 |
| | `st` | Hypervisor gibt die CPU anderen Gästen |
| `iostat -dxy 1 5` | `r_await`, `w_await` | ms pro Anfrage inklusive Warteschlange |
| | `aqu-sz` | ≈ Anfragen/s × Dauer; wächst bei Stau |
| | `%util` | nur bei Festplatten ein Sättigungsmaß |
| `pidstat -u 1` | `%usr`, `%system`, `%wait` | rechnet selbst, im Kernel, wartet auf CPU |
| `pidstat -d 1`, `pidstat -r 1` | `kB_wr/s`, `majflt/s` | wer schreibt, wer Seiten nachlädt |
| `grep . /proc/pressure/*` | `some`, `full` (`avg10`) | verlorene Zeit; je Unit in `/sys/fs/cgroup/system.slice/UNIT/*.pressure` |

| Frage | Befehl |
| --- | --- |
| Woran scheitert ein stummes Programm? | `strace -f -e trace=file,network PROGRAMM` |
| Nur fehlgeschlagene Aufrufe | `strace -f -Z PROGRAMM` |
| Worauf wartet ein Prozess? | `sudo strace -c -w -f -p PID`, Strg+C beendet |
| Dauer jedes Aufrufs | `strace -T -e trace=connect PROGRAMM` |
| Womit rechnet ein Prozess? | `sudo perf top -p PID` |
| Profil mit Aufrufstapeln | `sudo perf record -g -p PID -- sleep 30`, dann `sudo perf report` |
| Prozess → Unit | `ps -o unit= -p PID`, `systemctl status PID` |
| Job dauerhaft drosseln | `sudo systemctl set-property UNIT CPUQuota=20%` |

## Offizielle Referenzen

[Bash](https://www.gnu.org/software/bash/manual/bash.html) · [Coreutils](https://www.gnu.org/software/coreutils/manual/coreutils.html) · [Linux man-pages](https://man7.org/linux/man-pages/) · [systemd](https://www.freedesktop.org/software/systemd/man/latest/) · [OpenSSH](https://man.openbsd.org/ssh) · [Docker](https://docs.docker.com/) · [Podman](https://docs.podman.io/) · [Restic](https://restic.readthedocs.io/en/stable/)
