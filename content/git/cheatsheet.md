## Konfiguration

| Ebene | Datei | Schalter |
| --- | --- | --- |
| system | `$(prefix)/etc/gitconfig` | `--system` |
| global | `~/.gitconfig` bzw. `~/.config/git/config` | `--global` |
| local (Standard) | `.git/config` | `--local` |

Die spezifischere Ebene gewinnt. Herkunft eines Werts: `git config --show-origin --show-scope user.email`.

```ini title=.gitconfig
[user]
    name = Lea Lernt
    email = lea@example.com
[init]
    defaultBranch = main
[core]
    editor = code --wait
[pull]
    rebase = true              # oder: ff = only
[fetch]
    prune = true
[push]
    autoSetupRemote = true     # erster Push setzt den Upstream
[rebase]
    autoSquash = true
    autoStash = true
    updateRefs = true
[merge]
    conflictStyle = zdiff3
[rerere]
    enabled = true
[diff]
    algorithm = histogram
    colorMoved = default
[commit]
    verbose = true
[includeIf "gitdir:~/arbeit/"]
    path = ~/.gitconfig-arbeit
```

## Tägliche Befehle

| Aufgabe | Befehl |
| --- | --- |
| Repository anlegen / klonen | `git init` · `git clone <url> [verzeichnis]` |
| Zustand kurz | `git status --short --branch` (`-sb`) |
| Datei(en) stagen | `git add src/api.py` · `git add -p` (Hunks wählen) |
| Unstaged Änderungen ansehen | `git diff` |
| Gestagte Änderungen ansehen | `git diff --staged` |
| Alles gegenüber letztem Commit | `git diff HEAD` |
| Committen | `git commit -m "Betreff"` · `git commit -v` (Diff im Editor) |
| Letzten Commit ergänzen (ungepusht) | `git commit --amend --no-edit` |
| Unstagen | `git restore --staged datei` (alt: `git reset datei`) |
| Lokale Änderung verwerfen | `git restore datei` (alt: `git checkout -- datei`) |
| Datei löschen / umbenennen | `git rm datei` · `git mv alt neu` |
| Aus Index nehmen, lokal behalten | `git rm --cached .env` |
| History | `git log --oneline --graph --all` · `git log -p -n 3` · `git log --stat` |
| Commit ansehen | `git show <rev>` · `git show <rev>:pfad` (Datei in Version) |
| Hilfe | `git help <befehl>` · `git <befehl> -h` |

**`git status --short`** – linke Spalte Index, rechte Spalte Arbeitsverzeichnis:

| Code | Bedeutung |
| --- | --- |
| `M ` | geändert und gestaged |
| ` M` | geändert, nicht gestaged |
| `MM` | gestaged und danach erneut geändert |
| `A ` / `AM` | neu hinzugefügt / und danach geändert |
| `D ` | Löschung gestaged |
| `??` | untracked |
| `UU` | Konflikt, beide Seiten geändert |

## Revisionen und Bereiche

| Ausdruck | Bedeutung |
| --- | --- |
| `HEAD` | aktueller Commit bzw. Branch |
| `HEAD~` = `HEAD~1` = `HEAD^` | erster Elternteil |
| `HEAD~3` | drei Generationen zurück, immer über den ersten Elternteil |
| `HEAD^2` | zweiter Elternteil (nur bei Merge-Commits) |
| `main@{1}` | vorheriger Stand von `main` laut Reflog |
| `HEAD@{2.hours.ago}` | Stand von `HEAD` vor zwei Stunden (Reflog, lokal) |
| `@{u}` / `@{upstream}` | Upstream des aktuellen Branches |
| `@{-1}` | zuvor ausgecheckter Branch (`git switch -`) |
| `v2.4.0^{commit}` | Commit, auf den der Tag zeigt |
| `HEAD^{tree}` | Tree des aktuellen Commits |
| `:1:datei` `:2:datei` `:3:datei` | Index-Stufen im Konflikt: Basis, ours, theirs |
| `ORIG_HEAD` | Stand vor dem letzten `reset`, `merge` oder `rebase` |

| Bereich | In `git log` | In `git diff` |
| --- | --- | --- |
| `A..B` | in `B`, nicht in `A` | wie `git diff A B` |
| `A...B` | nur in `A` oder nur in `B` (mit `--left-right` markiert) | von Merge-Base(A, B) bis `B` – der PR-Diff |
| `^A B` | wie `A..B` | – |
| `A^..B` | `B` und Vorfahren bis einschließlich `A` | – |

```bash
git log --format=%s main..feature            # was der Branch mitbringt
git log --left-right --format='%m %s' main...feature
git rev-list --left-right --count @{u}...HEAD  # hinter / voraus
git merge-base --is-ancestor hotfix main && echo "enthalten"
```

## Branches, Tags und Remotes

| Aufgabe | Befehl |
| --- | --- |
| Branch anlegen und wechseln | `git switch -c feature/login` (alt: `git checkout -b`) |
| Wechseln / zurück | `git switch main` · `git switch -` |
| Commit oder Tag ansehen (Detached HEAD) | `git switch --detach v2.4.0` |
| Detached-Arbeit sichern | `git switch -c fix/retry` |
| Branches mit Upstream und Stand | `git branch -vv` |
| Gemergte / nicht gemergte | `git branch --merged main` · `--no-merged` |
| Umbenennen / löschen | `git branch -m alt neu` · `-d` (sicher) · `-D` (erzwungen) |
| Branch auf Commit setzen | `git branch -f main origin/main` (nicht der ausgecheckte) |
| Upstream setzen | `git push -u origin feature/login` · `git branch -u origin/main` |
| Annotierter Tag | `git tag -a v2.4.0 -m "Release 2.4.0"` |
| Tags pushen | `git push origin v2.4.0` · `git push --follow-tags` |
| Remotes | `git remote -v` · `git remote add upstream <url>` · `git remote set-url origin <url>` |
| Holen ohne Integration | `git fetch --prune` |
| Holen und integrieren | `git pull --rebase` · `git pull --ff-only` |
| Remote-Branch löschen | `git push origin --delete feature/login` |
| Sicher überschreiben | `git push --force-with-lease` (+ `--force-if-includes`) |
| Fork synchron halten | `git fetch upstream` · `git rebase upstream/main` |

## Merge und Rebase

```text
Vorher:          A---B---C  main
                      \
                       D---E  feature

git merge feature:        A---B---C-------M  main
                               \         /
                                D-------E  feature

git rebase main (auf feature): A---B---C  main
                                        \
                                         D'---E'  feature
```

| Befehl | Wirkung |
| --- | --- |
| `git merge feature` | Fast-Forward wenn möglich, sonst Merge-Commit |
| `git merge --no-ff feature` | immer Merge-Commit |
| `git merge --ff-only feature` | nur Fast-Forward, sonst Abbruch |
| `git merge --squash feature` | Änderungen stagen, kein Merge-Commit, keine Verwandtschaft |
| `git merge -X ours feature` | Konflikt-Hunks zugunsten der eigenen Seite, Rest normal |
| `git merge -s ours alt` | Ergebnis = eigener Tree, andere Seite nur als Elternteil |
| `git merge --abort` | Merge abbrechen, Zustand davor |
| `git rebase main` | eigene Commits auf `main` neu anwenden |
| `git rebase --onto main feature/login feature/export` | Commits aus `feature/login..feature/export` auf `main` |
| `git rebase --update-refs main` | gestapelte Branches mit umsetzen |
| `git rebase --continue` · `--skip` · `--abort` | im Konflikt |
| `git log --first-parent main` | nur Integrationen auf `main` |

Goldene Regel: Keine Commits rebasen, auf denen andere aufbauen. Auf geteilten Branches `revert` statt `reset`/`rebase`.

## Interaktives Rebase

```bash
git rebase -i main                        # Todo-Liste im Editor
git rebase -i --autosquash main           # fixup!/squash!/amend! einsortieren
git rebase -i --exec "pytest -q" main     # jeden Commit testen
git commit --fixup=<rev>                  # fixup! <Betreff>
git commit --fixup=amend:<rev>            # amend! – ersetzt auch die Nachricht
git commit --fixup=reword:<rev>           # amend! – nur neue Nachricht
git commit --squash=<rev>                 # squash! – Nachrichten zusammenführen
GIT_SEQUENCE_EDITOR="sed -i '2s/^pick/fixup/'" git rebase -i HEAD~3   # ohne Editor
```

| Befehl | Kurz | Wirkung |
| --- | --- | --- |
| `pick` | `p` | Commit übernehmen |
| `reword` | `r` | übernehmen, Nachricht bearbeiten |
| `edit` | `e` | übernehmen und anhalten (ändern, aufteilen) |
| `squash` | `s` | mit vorigem verschmelzen, Nachrichten kombinieren |
| `fixup` | `f` | mit vorigem verschmelzen, nur dessen Nachricht behalten |
| `fixup -C` / `-c` | | Nachricht dieses Commits nehmen / und bearbeiten |
| `drop` | `d` | Commit entfernen (Zeile löschen wirkt gleich) |
| `exec` | `x` | Shell-Befehl ausführen, Abbruch bei Fehler |
| `break` | `b` | hier anhalten, weiter mit `--continue` |
| `label` · `reset` · `merge` | `l` · `t` · `m` | Merges nachbauen (`--rebase-merges`) |
| `update-ref` | `u` | Branch an dieser Stelle mitziehen (`--update-refs`) |

Commit aufteilen: `edit` setzen → `git reset HEAD~` → `git add -p` → `git commit` (mehrmals) → `git rebase --continue`.

## Konflikte

Mit `merge.conflictStyle=zdiff3` zeigt der mittlere Block die Basis:

```text
<<<<<<< HEAD
timeout: 30
||||||| 9df8bc2
timeout: 10
=======
timeout: 60
>>>>>>> feature/retry
```

| Situation | ours · `--ours` · `:2:` | theirs · `--theirs` · `:3:` |
| --- | --- | --- |
| `git merge feature` auf `main` | `main` (aktueller Branch) | `feature` |
| `git rebase main` auf `feature` | `main` samt schon übertragener Commits | dein Commit, der gerade angewendet wird |
| `git pull --rebase` | Remote-Stand (`origin/main`) | deine lokalen Commits |
| `git cherry-pick <c>` | aktueller Branch | der gepickte Commit |
| `git stash pop` | aktueller Stand („Updated upstream“) | Stash („Stashed changes“) |
| `-X ours` beim Rebase | bevorzugt die Basis – deine Änderung kann vollständig entfallen | `-X theirs` bevorzugt deine Commits |

| Aufgabe | Befehl |
| --- | --- |
| Konfliktdateien | `git diff --name-only --diff-filter=U` · `git ls-files -u` |
| Beteiligte Commits | `git log --merge -p datei` |
| Versionen ansehen | `git show :1:datei` · `:2:` · `:3:` |
| Eine Seite nehmen | `git restore --ours datei` · `--theirs` (alt: `git checkout --ours`) |
| Marker neu erzeugen | `git checkout --conflict=zdiff3 datei` · `git restore --merge datei` |
| Als gelöst markieren | `git add datei` bzw. `git rm datei` (modify/delete) |
| Weiter / abbrechen | `git merge --continue` · `git rebase --continue` · `--abort` |
| Übersehene Marker finden | `git diff --check` |
| Lock-Datei | Quelle mergen, Lock-Datei neu erzeugen, nicht von Hand mergen |
| Grafisches Werkzeug | `git mergetool` |

## Reset, Restore, Revert

| Befehl | Branch (über `HEAD`) | Index | Arbeitsverzeichnis |
| --- | --- | --- | --- |
| `git reset --soft <c>` | → `c` | unverändert | unverändert |
| `git reset <c>` (`--mixed`) | → `c` | = `c` | unverändert |
| `git reset --hard <c>` | → `c` | = `c` | = `c` – uncommittete Änderungen an getrackten Dateien weg |
| `git reset --keep <c>` | → `c` | = `c` | = `c`, lokale Änderungen bleiben; Abbruch bei Kollision |
| `git reset <c> -- datei` | unverändert | Datei = `c` | unverändert |
| `git restore --staged datei` | unverändert | Datei = `HEAD` | unverändert |
| `git restore datei` | unverändert | unverändert | Datei = Index |
| `git restore -s <c> -SW datei` | unverändert | Datei = `c` | Datei = `c` |
| `git revert <c>` | neuer Commit, der `c` umkehrt | | |
| `git revert -m 1 <merge>` | neuer Commit, der den Merge umkehrt (Seite 1 bleibt) | | |

```bash
git reset --soft HEAD~3 && git commit -m "Login mit OAuth"   # drei Commits zu einem
git reset HEAD~                                             # letzten Commit auflösen, Änderungen behalten
git restore --source=v2.3.0 -- config.yaml                  # Datei aus altem Stand ins Arbeitsverzeichnis
```

## Rettungsrezepte

| Symptom | Diagnose | Rettung |
| --- | --- | --- |
| Commits nach `reset --hard` weg | `git reflog` | `git reset --hard HEAD@{1}` bzw. `ORIG_HEAD` |
| Branch mit `-D` gelöscht | Ausgabe „was abc1234“, `git reflog` | `git branch feature/login abc1234` |
| In Detached HEAD committet, weggewechselt | Warnung „leaving 1 commit behind“, `git reflog` | `git branch fix/retry <hash>` |
| Merge, Rebase oder Cherry-pick läuft und ist verkorkst | `git status` | `git merge --abort` · `git rebase --abort` · `git cherry-pick --abort` |
| Rebase abgeschlossen, Ergebnis falsch | `git reflog feature/login` | `git reset --hard ORIG_HEAD` bzw. `feature/login@{1}` |
| Falschen Branch gemergt (ungepusht) | `git log --graph --format=%s` | `git reset --hard ORIG_HEAD` |
| Falscher Merge schon gepusht | `git log --first-parent` | `git revert -m 1 <merge>` |
| Commit auf `main` statt Feature-Branch (ungepusht) | `git status -sb` zeigt „ahead“ | `git branch feature/x` · `git reset --hard origin/main` · `git switch feature/x` |
| Nachricht falsch / Datei vergessen (ungepusht) | `git show --stat` | `git commit --amend` · `git add datei && git commit --amend --no-edit` |
| `.env` im letzten Commit (ungepusht) | `git show --stat` | `git rm --cached .env` · in `.gitignore` · `git commit --amend --no-edit` |
| Secret gepusht | – | **zuerst rotieren**, dann ggf. `git filter-repo` und Force-Push nach Absprache |
| Konfliktmarker committet | `git diff --check HEAD~1` | Datei korrigieren, `git commit --amend` (ungepusht) |
| Gelöschte Datei zurückholen | `git log --format='%h %s' -- pfad` | `git restore --source=<löschcommit>^ -- pfad` |
| Gestasht, dann gedroppt | siehe unten | `git stash apply <hash>` |
| Gestaged, nie committet, dann `reset --hard` | `git fsck --lost-found` | Inhalt aus `.git/lost-found/other/` |
| Nie gestaged, dann `reset --hard` / `restore` | – | nicht über Git rettbar (Editor-Historie prüfen) |
| Push abgelehnt „fetch first“ | `git fetch` · `git log HEAD..@{u}` | `git rebase @{u}` (oder Merge) · Tests · `git push` |
| Force-with-lease abgelehnt „stale info“ | `git fetch` · `git log HEAD..@{u}` | fremde Commits einarbeiten, dann erneut |
| `.gitignore` greift nicht | `git check-ignore -v datei` · `git ls-files datei` | `git rm --cached datei` |
| „already used by worktree“, Ordner gelöscht | `git worktree list` („prunable“) | `git worktree prune` |
| Nach Bisect in Detached HEAD | `git bisect log` | `git bisect reset` |

```bash
# Gedroppten Stash finden
git fsck --no-reflogs | awk '/dangling commit/ {print $3}' \
  | xargs -r -n1 git log -1 --format='%h %s'      # „WIP on main: …“
# Vorsorge vor riskanten Aktionen
git branch backup/vor-rebase
```

Reflog: erreichbare Einträge 90 Tage (`gc.reflogExpire`), unerreichbare 30 Tage (`gc.reflogExpireUnreachable`). Nur lokal.

## Stash

| Aufgabe | Befehl |
| --- | --- |
| Sichern mit Nachricht | `git stash push -m "login halb fertig"` |
| Mit untracked Dateien / auch ignorierte | `-u` / `-a` |
| Nur Teile / nur Gestagtes / Index behalten | `-p` / `--staged` / `--keep-index` |
| Liste / Inhalt | `git stash list` · `git stash show -p stash@{1}` |
| Anwenden und behalten / und löschen | `git stash apply stash@{1}` · `git stash pop` |
| Löschen | `git stash drop stash@{1}` · `git stash clear` |
| Als Branch fortsetzen | `git stash branch feature/login stash@{0}` |

Konflikt bei `pop`: Stash bleibt erhalten → lösen, `git add`, dann `git stash drop`.

## Worktrees

```bash
git worktree add ../hotfix -b hotfix/login-timeout main    # neuer Branch
git worktree add --detach ../review origin/feature/export  # PR ansehen
git worktree list
git worktree remove ../review
git worktree prune          # Einträge gelöschter Verzeichnisse entfernen
git worktree lock --reason "auf USB-Platte" ../hotfix
```

| Gemeinsam | Pro Worktree |
| --- | --- |
| Objekte, Refs, Branches, Tags, Stash, Konfiguration | Arbeitsverzeichnis, Index, `HEAD` |

Ein Branch kann nur in einem Worktree ausgecheckt sein.

## Bisect

```bash
git bisect start HEAD v2.3.0         # schlecht, gut
git bisect good                      # bzw. bad oder skip für den aktuellen Commit
git bisect run pytest -q tests/test_login.py
git bisect log > bisect.log ; git bisect replay bisect.log
git bisect reset                     # zurück zum Ausgangsbranch
git bisect start --term-old=schnell --term-new=langsam
git bisect start --first-parent      # nur Merge-Commits von main testen
```

| Exit-Code von `run` | Bedeutung |
| --- | --- |
| `0` | gut (alt) |
| `1`–`127` außer `125` | schlecht (neu) |
| `125` | nicht testbar, überspringen |
| `128` und höher | Bisect bricht ab |

## Suchen in der History

| Frage | Befehl |
| --- | --- |
| Wann kam der String rein oder raus? | `git log -S "MAX_RETRIES" -p` |
| Welche Diffs passen auf Regex? | `git log -G "timeout.*30"` |
| Geschichte einer Funktion / Zeilen | `git log -L :login:src/auth.py` · `git log -L 40,60:src/api.py` |
| Datei über Umbenennungen | `git log --follow -- src/api.py` |
| Wer hat die Zeile zuletzt geändert? | `git blame -w -C -M src/api.py` |
| Formatierungs-Commit ignorieren | `git blame --ignore-rev <hash>` · `git config blame.ignoreRevsFile .git-blame-ignore-revs` |
| In Dateien einer Version suchen | `git grep -n "TODO" v2.4.0` |
| Commits nach Autor / Zeit / Nachricht | `git log --author=lea --since=2.weeks --grep="login" -i` |
| Doppelte Patches zwischen Branches | `git cherry -v main feature` · `git log --cherry-pick --right-only main...feature` |
| Zwei Versionen einer Commit-Folge | `git range-diff main feature@{1} feature` |

## Hooks und CI

| Hook | Wann | Argumente / Eingabe | Abbruch |
| --- | --- | --- | --- |
| `pre-commit` | vor dem Commit | – | Exit ≠ 0 |
| `commit-msg` | nach Eingabe der Nachricht | `$1` = Pfad der Nachrichtendatei | Exit ≠ 0 |
| `pre-push` | vor dem Push | `$1` Remote-Name, `$2` URL; stdin: `<lokale-ref> <hash> <remote-ref> <hash>` | Exit ≠ 0 |
| `post-checkout`, `post-merge` | danach | – | kein Abbruch möglich |

```bash
git config core.hooksPath .githooks    # versionierte Hooks teilen
chmod +x .githooks/commit-msg
git commit --no-verify                 # umgeht pre-commit und commit-msg
```

```bash title=.githooks/commit-msg
#!/usr/bin/env bash
set -euo pipefail
re='^(feat|fix|docs|refactor|test|chore|ci|build|perf)(\([a-z0-9-]+\))?!?: .+'
if ! head -n 1 "$1" | grep -Eq "$re"; then
  echo "Commit-Nachricht folgt nicht Conventional Commits: $(head -n 1 "$1")" >&2
  exit 1
fi
```

```yaml title=.github/workflows/ci.yml
on:
  pull_request:
  push:
    branches: [main]
    tags: ["v*"]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0     # volle History und Tags: describe, Changelog, Diff zur Basis
      - run: git describe --tags --always
```

| Klon | Befehl | Folge |
| --- | --- | --- |
| flach | `git clone --depth 1` | kein `describe`, kein Diff zu älterer Basis → `git fetch --unshallow --tags` |
| partiell | `git clone --filter=blob:none` | History vollständig, Blobs bei Bedarf |
| sparse | `git sparse-checkout set src/api` | nur Teilverzeichnisse im Arbeitsverzeichnis |

Releases: SemVer `MAJOR.MINOR.PATCH`, annotierter Tag, `git describe` → `v2.4.0-3-gab12cd3` (3 Commits nach dem Tag). Secrets: nie committen; wenn doch gepusht, rotieren – History-Bereinigung ist zweitrangig.
