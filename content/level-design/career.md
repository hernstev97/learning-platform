## Level-Design im Beruf

Level-Design ist die Arbeit an den Räumen, durch die sich Spieler bewegen: wo sie hingehen, was sie sehen, wann sie etwas Neues lernen und wann sie auf Widerstand treffen. In größeren Studios ist das eine eigene Rolle neben Game-, Combat-, Narrative- und Technical Design und neben Environment Art. In kleinen Teams und bei Solo-Projekten macht es dieselbe Person, die auch den Rest des Spiels entwirft.

Für dich ist der Anlass dein eigenes Spiel. Diese Seite zeigt trotzdem, wie die Arbeit in Studios aussieht und welche Fähigkeiten dort gefragt sind. Das hilft auch ohne Bewerbung: Wer weiß, woran Studios einen Level Designer messen, weiß, worauf er beim eigenen Abschnitt achten sollte. Die Zitate aus Stellenanzeigen stammen aus Anzeigen, die im Oktober 2026 online waren. Diese Seite ist keine Arbeitsmarktstudie.

## Rollen und Jobtitel

Titel bedeuten in jedem Studio etwas anderes. Lies die Aufgaben, nicht nur die Überschrift.

| Rolle | Typische Titel | Alltag |
| --- | --- | --- |
| Level Design | Level Designer, Game/Level Designer | Abschnitte von der Idee über den Blockout bis zur fertigen Fassung verantworten, testen, überarbeiten |
| World Design | World Designer, Open World Designer | große Gebiete, Wege zwischen Orten, Landmarken und Orientierung über lange Strecken |
| Mission und Quest Design | Mission Designer, Quest Designer | Abläufe und Ziele innerhalb von Räumen, oft mit Skripten |
| Technical Level Design | Technical Level Designer | Skripte, Auslöser und Werkzeuge im Editor, damit Level funktionieren |
| Environment Art | Environment Artist | den Blockout ausgestalten, ohne Spielfluss und Hinweise zu zerstören |

Die letzte Zeile gehört nicht zum Level-Design, aber eng daneben. Das Level Design Book beschreibt Environment Art als „the cosmetic decoration of a level or game world, while preserving its core functionality and gameplay“ und hält fest, dass Artists in der Regel „wait for a mature blockout before beginning an art pass“ ([Environment art](https://book.leveldesignbook.com/process/env-art)). Die Grenze zwischen Blockout und Ausgestaltung, die dieser Kurs zieht, ist also auch eine Grenze zwischen zwei Berufen.

## Was Studios erwarten

Die Anzeigen wiederholen sich in wenigen Punkten. Zwei Beispiele:

- **KAIKO, Frankfurt am Main**, „Game Designer / Level Designer“: „Create whitebox/blockout levels for rapid prototyping and playtesting.“ – „Ensure strong pacing, composition, player guidance, and flow throughout levels.“ – „Take ownership of levels through the full production pipeline (concept -> blockout -> art -> final).“ ([DEVjobs.de](https://devjobs.de/job/057858f1b855dc9f6286960843cf3c5d))
- **2K**, „Senior Level Designer“: „Create playable blockouts (greyboxing) of large-scale open zones, focusing on landmark readability, navigation flow, and gameplay spaces“ – „Quickly iterate on level layouts based on playtest feedback, moving efficiently from low-fidelity blockouts to final geometry without losing the core experience“ ([Hitmarker](https://hitmarker.net/jobs/2k-senior-level-designer-1645113))

Daraus lassen sich vier Erwartungen lesen, und alle vier übst du in diesem Kurs:

- **Blockout zuerst.** Beide Anzeigen nennen Blockout oder Greybox als eigenen Schritt vor der Grafik ([Blockout in Godot](/level-design/blockout)).
- **Führung und Orientierung.** „player guidance“, „landmark readability“, „navigation flow“ sind die Inhalte von [Blickführung](/level-design/blickfuehrung) und [Orientierung](/level-design/orientierung).
- **Rhythmus und Komposition.** „pacing, composition“ entsprechen [Rhythmus](/level-design/rhythmus) und der Komposition in der Draufsicht.
- **Iterieren nach Playtests.** Beide verlangen, nach Tests zu überarbeiten, ohne den Kern zu verlieren ([Überarbeiten](/level-design/ueberarbeiten)).

Dazu kommt die Arbeit im Editor der Engine, mit der das Studio baut. Was du in diesem Kurs lernst, hängt nicht an Godot: Blockout, Maße, Tests und Protokoll gehen in jedem Editor gleich.

## Designtests und Gespräche

Manche Studios schicken für Design-Stellen einen Test. Für Level-Design kann das heißen: einen kleinen Abschnitt in einer vorgegebenen Engine bauen und dokumentieren, in wenigen Tagen. Bewertet wird selten, ob der Raum schön ist, sondern wie du denkst. Wenn du einen bekommst:

- **Kläre den Rahmen.** Was wird bewertet, wie viel Zeit ist vorgesehen, darf es ein Blockout bleiben?
- **Schreib die Absicht auf.** Ein Satz pro Abschnitt, dazu der erwartete Weg und woran man sieht, ob er gelingt ([Absicht und Skizze](/level-design/absicht-skizze)).
- **Zeig eine Draufsicht mit Anmerkungen.** Erwarteter Weg, Hinweise, Begegnungen, Maße in Einheiten des Spiels.
- **Belege mindestens einen Test.** Auch ein Test mit zwei Personen aus dem Bekanntenkreis zeigt, dass du beobachtest statt rätst. Schreib ehrlich hin, was nicht aufging.

Im Gespräch fragen Designer gern nach einer Stelle, an der ein Test dich überrascht hat, wie du mit Rückmeldung wie „mach das rot“ umgehst und wie du einem Artist erklärst, welche Hinweise die Ausgestaltung nicht verdecken darf. Die Interview-Karten dieses Bereichs üben solche Antworten.

## Portfolio: was zählt

- **Vorher und nachher.** Blockout und fertige Fassung, oder Runde 1 und Runde 2 desselben Abschnitts, mit dem Grund für die Änderung.
- **Die Draufsicht mit Weg.** Eine Karte mit erwartetem Weg und aufgezeichneten Wegen von Testern sagt mehr als zehn Screenshots.
- **Die Absicht.** Ein Satz pro Abschnitt zeigt, dass du weißt, was du baust.
- **Ein kurzes Video.** Höchstens zwei Minuten, der Abschnitt einmal durchgespielt.
- **Analyse fremder Level.** Eine gründliche Analyse eines veröffentlichten Abschnitts zeigt, dass du Level lesen kannst ([Projekt Analyse](/level-design/projekte/analyse-abschnitt)).

Ein Portfolio mit einem gut dokumentierten Abschnitt ist mehr wert als eines mit vielen schönen Bildern ohne Erklärung. Das [Abschlussprojekt](/level-design/projekte/abschluss-abschnitt) ist genau so geschnitten.

## Lernplan in Wochen

Der Plan rechnet mit einem Unterwegs-Modul pro Woche (etwa anderthalb Stunden auf dem Handy, mit Übungen) und drei bis vier Stunden am PC. PC-Arbeit kommt erst, wenn die Module davor gelesen sind, auf denen sie aufbaut.

- **Woche 1** · unterwegs: [Level lesen](/level-design/raum-lesen) · am PC: Godot-Grundlagen, falls noch nicht da ([2D-Level aus Tiles](/godot/level-tilemap))
- **Woche 2** · unterwegs: [Blickführung](/level-design/blickfuehrung) · am PC: Godot-Grundlagen
- **Woche 3** · unterwegs: [Orientierung](/level-design/orientierung) · am PC: –
- **Woche 4** · unterwegs: [Maßstab und Dichte](/level-design/massstab-dichte) · am PC: –
- **Woche 5** · unterwegs: [Möglichkeiten einführen](/level-design/einfuehren-variieren) · am PC: –
- **Woche 6** · unterwegs: [Rhythmus](/level-design/rhythmus) · am PC: [Analyse eines Abschnitts](/level-design/projekte/analyse-abschnitt), Abschnitt wählen und skizzieren
- **Woche 7** · unterwegs: [Umgebung als Information](/level-design/umgebung-informiert) · am PC: Analyse ausarbeiten
- **Woche 8** · unterwegs: [Absicht und Skizze](/level-design/absicht-skizze) · am PC: [Blockout in Godot](/level-design/blockout)
- **Woche 9** · unterwegs: [Playtests beobachten](/level-design/playtest-methode) · am PC: [Maßstabsraum und Baukasten](/level-design/projekte/massstab-baukasten)
- **Woche 10** · unterwegs: [Überarbeiten](/level-design/ueberarbeiten) · am PC: [Playtest am PC](/level-design/playtest-godot)
- **Woche 11** · unterwegs: Karten wiederholen · am PC: [Einführung testen](/level-design/projekte/einfuehrung-testen), Folge planen und bauen
- **Woche 12** · unterwegs: Tester anfragen, Notizen auswerten · am PC: Einführung testen, zwei Runden
- **Woche 13** · unterwegs: Karten wiederholen · am PC: [Ausgestaltung](/level-design/ausgestaltung)
- **Woche 14–19** · unterwegs: Karten, Tester anfragen, Notizen auswerten · am PC: [Werkstatt](/level-design/werkstatt-abschnitt) und [Abschlussprojekt](/level-design/projekte/abschluss-abschnitt), etwa vier Stunden pro Woche

Hast du mehr Zeit am PC, zieh die Projekte vor, sobald ihre Module gelesen sind; die Unterwegs-Module kannst du unabhängig davon im Bus lesen. Für die PC-Module brauchst du die Grundlagen aus dem Godot-Kurs, vor allem [2D-Level aus Tiles](/godot/level-tilemap).

## Ressourcen

- [The Level Design Book](https://book.leveldesignbook.com/) von Robert Yang und anderen: frei, aktuell, mit Seiten zu Blockout, Maßen, Orientierung, Rhythmus und Playtests.
- Christopher W. Totten, [An Architectural Approach to Level Design](https://www.routledge.com/An-Architectural-Approach-to-Level-Design-Second-edition/Totten/p/book/9780815361367), 2. Auflage 2019.
- Dan Taylor, [Ten Principles of Good Level Design](https://www.gamedeveloper.com/design/ten-principles-of-good-level-design-part-1-), Game Developer 2013, und der [Vortrag auf YouTube](https://www.youtube.com/watch?v=iNEe3KhMvXM).
- Steve Lee, [An Approach to Holistic Level Design](https://www.youtube.com/watch?v=CpOoTAVeEcU), GDC 2017.
- Valve, [Publikationen](https://www.valvesoftware.com/en/publications) mit den Folien zu Playtests (2009), Portal (2008) und Left 4 Dead (2009).
- Tracy Fullerton, [Game Design Workshop](https://www.routledge.com/Game-Design-Workshop-A-Playcentric-Approach-to-Creating-Innovative-Games/Fullerton/p/book/9781032607009), 5. Auflage 2024, für Playtests im ganzen Entwurfsprozess.
- Godot-Doku: [Using TileMaps](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilemaps.html) und [Camera2D](https://docs.godotengine.org/en/stable/classes/class_camera2d.html).
