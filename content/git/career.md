## Warum Git im Beruf mehr ist als ein Werkzeug

In Stellenanzeigen steht „Git“ oft nur als ein Wort in einer Liste. Im Arbeitsalltag ist es die Stelle, an der deine Arbeit für andere sichtbar wird: Jeder Commit, jeder Pull Request und jede Antwort auf ein Review ist ein Arbeitsnachweis. Ein Team merkt schnell, ob jemand Änderungen in lesbaren Schritten liefert, Konflikte ruhig löst und nach einem Fehler weiß, wie man zurückkommt – oder ob jemand nach dem dritten „rejected“ zu `--force` greift.

Dieser Lernbereich zielt auf genau diese sichtbaren Fähigkeiten: das Datenmodell verstehen statt Befehle raten, History bewusst formen, Fehler reparieren und im Team nach klaren Regeln arbeiten.

## Rollen und wie sie Git nutzen

Die Übersicht ist eine Orientierung. Welche Plattform und welches Branching-Modell ein Arbeitgeber nutzt, steht selten in der Anzeige – frag im Gespräch danach.

| Rolle | Typischer Git-Alltag | Was dort besonders zählt |
| --- | --- | --- |
| Softwareentwickler (Backend, Frontend, Mobile) | Feature-Branches, Pull Requests, Reviews, Rebase auf `main`, Konflikte | Atomare Commits, gute PR-Beschreibungen, sicherer Umgang mit Rebase und Force-with-lease |
| DevOps / Platform Engineer | CI/CD-Pipelines, Branch-Schutz, Release-Tags, GitOps-Repositorys für Infrastruktur | Hooks vs. CI, flache Klone, Release-Automatisierung, Secrets-Vorfälle |
| Site Reliability Engineer | Hotfixes auf Release-Branches, Rollbacks, Ursachenanalyse nach Incidents | `revert`, Cherry-pick-Backports, `bisect`, `log -S` für die Frage „Seit wann?“ |
| QA / Test Engineer | Testcode im selben Repository, Reproduktion auf bestimmten Versionen | Versionen auschecken, Worktrees, `bisect run` mit Testskripten |
| Data / ML Engineer | Pipelines, Notebooks und Konfiguration versionieren | `.gitignore` und `.gitattributes` für große und generierte Dateien, saubere Trennung von Code und Daten |
| Tech Lead | Teamkonventionen, Review-Kultur, Release-Prozess | Branching-Modell begründen, Merge-Methode festlegen, Recovery im Ernstfall anleiten |

## Was Arbeitgeber erwarten

Von Juniors erwarten die meisten Teams keinen Git-Experten, aber einen sicheren Grundumgang: Branch anlegen, sinnvoll committen, PR öffnen, auf Review reagieren, `main` aktuell halten und einen Konflikt ohne fremde Hilfe lösen. Wer darüber hinaus erklären kann, was ein Rebase mit den Hashes macht, und einen „verlorenen“ Commit über den Reflog zurückholt, hebt sich deutlich ab.

Mit steigender Erfahrung verschiebt sich die Erwartung von Bedienung zu Verantwortung: Du legst Konventionen fest, schützt `main`, automatisierst Releases, reagierst auf einen Secret-Leak mit der richtigen Reihenfolge und hilfst anderen aus verkorksten Zuständen.

Im deutschsprachigen Raum triffst du neben GitHub häufig auf **GitLab**, oft selbst betrieben – dort heißen Pull Requests „Merge Requests“, das Prinzip ist gleich. In Unternehmen mit Atlassian- oder Microsoft-Umgebung kommen Bitbucket und Azure DevOps Repos vor. Die Git-Grundlagen dieses Kurses gelten überall; Oberflächen und Namen der Schutzregeln unterscheiden sich. Commit-Nachrichten und PR-Beschreibungen sind je nach Team deutsch oder englisch – übernimm die Sprache, die im Repository schon üblich ist.

Häufige Erwartungen, die in Anzeigen eher zwischen den Zeilen stehen:

- Du arbeitest in einem Review-Prozess und kannst Feedback annehmen und begründet widersprechen.
- Du hältst dich an eine Commit-Konvention, zum Beispiel [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), und an die Merge-Methode des Teams.
- Du kennst den Unterschied zwischen Hooks auf deinem Rechner und Pflicht-Checks in CI.
- Du committest keine Secrets und weißt, was zu tun ist, wenn es doch passiert.
- Du kannst Git über die Kommandozeile bedienen. Eine grafische Oberfläche ist in Ordnung, aber im Pair Programming oder auf einem CI-Runner gibt es oft nur das Terminal.

## Git im Vorstellungsgespräch

Git-Fragen kommen selten als eigene Runde, sondern verteilt: als Wissensfrage im technischen Gespräch, als Szenario („Was tust du, wenn …?“) oder nebenbei beim Live-Coding. Übe Antworten in drei Schritten: Kernsatz, konkretes Beispiel, Abgrenzung. „Rebase spielt meine Commits als neue Commits auf eine andere Basis – etwa `git rebase main` vor dem PR – und deshalb rebase ich keine Branches, auf denen andere aufbauen.“

| Frageform | Beispiel | Was du zeigen kannst |
| --- | --- | --- |
| Wissen | „Was ist der Unterschied zwischen Merge und Rebase?“ | Denkmodell mit Graph, Abwägung statt Dogma |
| Vergleich | „`reset --soft`, `--mixed`, `--hard`?“ | Drei Bereiche benennen, ein Anwendungsfall pro Modus |
| Szenario | „Du hast drei Commits mit `reset --hard` verloren.“ | Reflog, Lesezeichen-Branch, Grenze: nie gestagte Änderungen |
| Szenario | „Ein API-Key ist gepusht.“ | Zuerst rotieren, dann informieren, erst danach History |
| Szenario | „Der Push wird abgelehnt.“ | Fetch, ansehen, integrieren, testen – nicht `--force` |
| Code-Review | „Hier ist ein PR mit einem Commit ‚fixes‘ über 60 Dateien.“ | Konkrete Vorschläge zum Aufteilen, sachlicher Ton |
| Verhalten | „Erzähl von einem Fehler mit Git.“ | Situation, eigene Handlung, Reparatur, dauerhafte Verbesserung |

Die [Interview-Karten](/git/karten) decken alle Module ab. Wiederhole sie laut. Eine Antwort, die im Kopf klar klingt, ist laut ausgesprochen oft zu lang oder zu vage. Wenn du einen Schalter nicht weißt, sag das und beschreibe, wo du nachschlägst – `git help rebase` oder der [Spickzettel](/git/spickzettel) gehören zum Alltag.

## Take-Home-Aufgaben: Die History wird gelesen

Bei Take-Home-Aufgaben bekommst du ein Repository oder eine Aufgabe und gibst nach einigen Tagen ein Repository ab. Viele Prüfer sehen sich dabei nicht nur den Endstand an, sondern auch `git log`: Wie hast du gearbeitet? Eine History aus „init“, „stuff“, „fix“, „final“, „final2“ sagt etwas anderes als eine Folge wie diese:

```text
feat: Buchungen per CSV importieren
test: Randfälle für leere und doppelte Zeilen
refactor: Validierung in eigenes Modul auslagern
fix: Datumsformat mit Zeitzone korrekt parsen
docs: README mit Aufruf, Annahmen und offenen Punkten
```

Praktische Regeln für die Abgabe:

- Committe in logischen Schritten, während du arbeitest. Räume vor der Abgabe mit [interaktivem Rebase](/git/interactive-rebase) auf – WIP-Commits zusammenfassen, Nachrichten verbessern, Debug-Code entfernen.
- Keine generierten Dateien, keine `node_modules/`, keine `.env`. Eine `.env.example` mit Platzhaltern zeigt, dass du daran gedacht hast.
- Wenn die Aufgabe einen Branch oder PR verlangt, schreibe eine PR-Beschreibung wie im Job: Ziel, Vorgehen, Annahmen, wie man testet, was bewusst fehlt.
- Verändere nach der Deadline nichts mehr an der History, die du abgegeben hast. Nachbesserungen gehören, falls erlaubt, in neue, klar benannte Commits.
- Schreibe die Commits selbst. Ob KI-Werkzeuge erlaubt sind, regelt die Aufgabe; wenn ja, benenne ihren Einsatz im README.

Das [Abschlussprojekt](/git/projekte/repo-sanierung) ist wie eine solche Aufgabe aufgebaut – einschließlich der Regel, dass die History deiner Abgabe selbst gelesen wird.

## Portfolio: saubere History, gute PRs, Open Source

Ein GitHub-Profil wirkt nicht durch viele grüne Kästchen, sondern durch zwei oder drei Repositorys, die man gern öffnet: README mit Zweck und Startanleitung, grüne CI, eine History mit sprechenden Commits und ein paar Pull Requests, in denen man Review und Reaktion darauf sieht. Auch in eigenen Projekten kannst du über PRs arbeiten und dir selbst ein kurzes Review schreiben – das zeigt den Ablauf, den Teams erwarten.

Die Projekte dieses Bereichs bauen aufeinander auf:

| Projekt | Was es belegt |
| --- | --- |
| [Git-Objekt-Inspektor](/git/projekte/objekt-inspektor) | Du verstehst das Datenmodell bis auf Byte-Ebene |
| [Git-Rettungsdienst](/git/projekte/git-rettungsdienst) | Du reparierst kaputte Zustände und machst das Wissen für andere nutzbar |
| [Hooks und CI für ein Team-Repository](/git/projekte/team-repo-automation) | Du richtest Regeln ein, die ein Team schützen, statt sie nur zu befolgen |
| [Repository sanieren](/git/projekte/repo-sanierung) | Du übernimmst Verantwortung für einen ganzen Workflow – vom Befund bis zum Release |

**Open Source** ist der glaubwürdigste Nachweis für Teamarbeit mit Git, weil Fremde deinen PR reviewen. So fängst du an:

- Suche Projekte, die du selbst nutzt, und dort Issues mit Labels wie „good first issue“ ([GitHub-Doku zu Labels](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/encouraging-helpful-contributions-to-your-project-with-labels)).
- Lies `CONTRIBUTING.md` vollständig: Commit-Format, Tests, ob Commits mit `git commit -s` signiert werden müssen ([Developer Certificate of Origin](https://developercertificate.org/)) oder ein CLA nötig ist.
- Arbeite im Fork-Workflow: `origin` ist dein Fork, `upstream` das Original, der PR-Branch basiert auf aktuellem `upstream/main` ([Fork synchronisieren](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/syncing-a-fork)).
- Klein anfangen: Dokumentation korrigieren, einen Test für einen gemeldeten Bug schreiben, eine Fehlermeldung verbessern. Kündige größere Änderungen vorher im Issue an.
- Reagiere auf Review mit Fixup-Commits oder nach den Regeln des Projekts, bleib freundlich und geduldig. Maintainer arbeiten oft ehrenamtlich.

Ein gemergter kleiner PR in einem bekannten Projekt, den du im Gespräch erklären kannst, zählt mehr als ein großer, nie beantworteter.

## Lernplan in zehn Wochen

Plane etwa sechs bis acht Stunden pro Woche. Die Reihenfolge folgt den vier Tracks; wenn ein Modul länger braucht, verschiebe den Rest. Wiederhole jede Woche einige Karten und arbeite mindestens ein Kaputt-Labor ohne Musterlösung durch.

| Woche | Track | Module | Sichtbares Ergebnis |
| --- | --- | --- | --- |
| 1 | Fundament | [Git-Grundlagen](/git/git-einstieg), [Datenmodell](/git/datenmodell) | Du erklärst Commit, Tree und Blob an einem eigenen Repository |
| 2 | Fundament | [Branches und HEAD](/git/branches-head), [Commit-Hygiene](/git/commit-hygiene) | [Objekt-Inspektor](/git/projekte/objekt-inspektor) fertig; eigene `.gitconfig` |
| 3 | History formen | [Merge](/git/merge), [Konflikte](/git/konflikte) | Drei Konfliktlabore gelöst, `zdiff3` eingerichtet |
| 4 | History formen | [Rebase](/git/rebase), [Interaktives Rebase](/git/interactive-rebase) | Einen eigenen Branch vor dem PR sauber aufgeräumt |
| 5 | History formen / Recovery | [Cherry-pick und Revert](/git/cherry-pick-revert), [Reset und Reflog](/git/reset-reflog) | Alle Recovery-Labore ohne Hinweis gelöst |
| 6 | Recovery & Werkzeuge | [Stash und Worktrees](/git/stash-worktrees), [Fehlersuche in der History](/git/bisect-historie) | [Git-Rettungsdienst](/git/projekte/git-rettungsdienst) mit ersten Szenarien |
| 7 | Im Team | [Pull Requests](/git/pull-requests), [CI/CD](/git/ci-cd) | Rettungsdienst fertig; erster Open-Source-PR vorbereitet |
| 8 | Im Team | Wiederholung, Projekt | [Hooks und CI für ein Team-Repository](/git/projekte/team-repo-automation) |
| 9–10 | Abschluss | alle | [Repository-Sanierung](/git/projekte/repo-sanierung) mit Präsentation; Karten aller Module |

Wenn du schneller vorankommst, zieh das Abschlussprojekt nicht vor, sondern starte früher mit einem echten Open-Source-Beitrag. Der Nutzen liegt in der Wiederholung unter realen Bedingungen.

## Ressourcen

- [Pro Git](https://git-scm.com/book/en/v2) (englisch, frei; [deutsche Übersetzung](https://git-scm.com/book/de/v2)) – besonders die Kapitel [Git Internals](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain), [Rewriting History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History) und [Reset Demystified](https://git-scm.com/book/en/v2/Git-Tools-Reset-Demystified).
- [Git-Referenzhandbuch](https://git-scm.com/docs) mit den Seiten [gitrevisions](https://git-scm.com/docs/gitrevisions), [gitglossary](https://git-scm.com/docs/gitglossary), [githooks](https://git-scm.com/docs/githooks) und [gitworkflows](https://git-scm.com/docs/gitworkflows). Lokal: `git help <befehl>`.
- [GitHub-Doku zu Pull Requests](https://docs.github.com/en/pull-requests/reference/pull-requests), [Merge-Methoden](https://docs.github.com/en/pull-requests/reference/pull-request-merges), [geschützte Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) und [GitHub Actions](https://docs.github.com/en/actions).
- [GitLab-Doku zu Merge Requests](https://docs.gitlab.com/user/project/merge_requests/), falls dein Zielarbeitgeber GitLab nutzt.
- [Sensible Daten aus einem Repository entfernen](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) und [git filter-repo](https://github.com/newren/git-filter-repo) für den Ernstfall.
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) und [Semantic Versioning](https://semver.org/) für Commit-Konventionen und Versionsnummern.
