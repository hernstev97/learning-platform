## Godot-Wissen im Beruf

Dein Anlass für diesen Kurs ist dein eigenes Spiel. Die Fertigkeit, um die es geht, ist trotzdem eine eigene Rolle in Teams: Systeme, die jemand anderes gebaut hat, im Editor lesen, mit Assets füllen, einstellen und Fehler eingrenzen. In großen Studios teilen sich das Technical Artists, Technical Designer und Level Designer. In kleinen Teams und bei Solo-Projekten macht es dieselbe Person, die auch zeichnet und entwirft. Mit Coding-Agenten verschiebt sich die Arbeit weiter in diese Richtung: Der Code entsteht schneller, aber jemand muss ihn im Editor prüfen, mit eigenen Assets verbinden und abstimmen.

Diese Seite zeigt, wo das Wissen aus dem Kurs in der Praxis vorkommt und wie du es belegst. Sie ist keine Arbeitsmarktstudie und nennt keine Zahlen zu Stellen.

## Rollen, in denen Editor-Arbeit zählt

Titel bedeuten in jedem Studio etwas anderes. Lies die Aufgaben, nicht nur die Überschrift.

| Rolle | Arbeit im Editor | Module, die dazu passen |
| --- | --- | --- |
| Technical Artist | Assets ins Spiel bringen: Import, Raster, Animation, Shader, Werkzeuge für Zeichner; Darstellungsfehler finden | Pixelraster, Sprites importieren, Animationen, Fehler eingrenzen |
| Technical Designer | Mechaniken im Editor zusammensetzen und abstimmen, exportierte Werte und Ressourcen pflegen, kleine Skripte lesen und ändern | Instanzen und Ressourcen, Eingabeaktionen und Parameter, Werkstatt |
| Level Designer | Level aus Tiles und Szenen bauen, Kollision, Zeichenreihenfolge, Laufwege messen | Kollisionen, Level aus Tiles, Szenenbäume |
| Game Designer in kleinen Teams | Prototypen bauen lassen und selbst prüfen, Werte ändern, Testversionen verteilen | Projekt erkunden, Werkstatt, Export |
| Gameplay Programmer | Code schreiben, aber auch Szenen und Ressourcen so anlegen, dass andere sie im Editor bedienen können | Szenenbaum, Instanzen und Ressourcen, Bildrate und Simulation |
| QA und Test | Fehler reproduzierbar machen, eingrenzen, mit Log und Screenshot beschreiben | Fehler eingrenzen, Bildrate und Simulation |

## Spiele, die mit Godot entstanden sind

Studios veröffentlichen kommerzielle Spiele mit Godot, viele davon in 2D und Pixelart. Eine Auswahl aus dem offiziellen [Showcase](https://godotengine.org/showcase/), jeweils mit der Seite dort:

- [Slay the Spire 2](https://godotengine.org/showcase/slay-the-spire-2/) von Mega Crit, Early Access seit März 2026.
- [Dome Keeper](https://godotengine.org/showcase/dome-keeper/) von Bippinbits, Pixelart.
- [Brotato](https://godotengine.org/showcase/brotato/) von Blobfish.
- [Halls of Torment](https://godotengine.org/showcase/halls-of-torment/) von Chasing Carrots.
- [Cassette Beasts](https://godotengine.org/showcase/cassette-beasts/) von Bytten Studio.
- [The Case of the Golden Idol](https://godotengine.org/showcase/case-of-the-golden-idol/) von Color Gray Games.
- [Until Then](https://godotengine.org/showcase/until-then/) von Polychroma Games.
- [DOGWALK](https://godotengine.org/showcase/dogwalk/) vom Blender Studio.

Spiel eines davon mit dem Blick aus diesem Kurs: Wo siehst du ganzzahlige Skalierung, wo Y-Sortierung, wo Ränder bei einem anderen Seitenverhältnis?

## Was Teams erwarten

Wer im Editor arbeitet, an dessen Arbeit hängen andere. Daraus folgen Erwartungen, die nicht an Godot gebunden sind:

- **Fremde Projekte lesen.** Du findest dich in einer Szene zurecht, die du nicht gebaut hast, und änderst sie, ohne etwas anderes zu zerbrechen.
- **Saubere Assets.** Was du importierst, ist scharf, sitzt im Raster, hat den richtigen Ursprung und folgt den Einstellungen, die das Team festgelegt hat.
- **Werte an einer Stelle.** Du weißt, wo ein Wert lebt und welcher gilt, und du legst neue Werte so an, dass andere sie finden.
- **Reproduzierbare Fehlerberichte.** Symptom, Schritte, erwartetes und tatsächliches Verhalten, Version, Log. „Fühlt sich komisch an“ ist der Anfang einer Untersuchung, kein Bericht.
- **Saubere Historie.** Kleine Commits mit sprechender Nachricht, Originaldateien im Repository, keine Builds und kein Cache. Die Grundlagen dazu stehen im [Git-Bereich](/git).

## Probeaufgaben und Gespräche

Für Rollen nahe am Editor kann statt eines Programmiertests eine Probeaufgabe kommen: ein kleines Projekt, in das du Assets einbaust, ein Level, das du erweiterst, oder ein Prototyp mit Fehlern, die du finden sollst. Ob du den Weg dorthin nachvollziehbar aufschreibst, sieht man dabei sofort. Das [Abschlussprojekt](/godot/projekte) ist so geschnitten.

Fragen, die sich aus dem Stoff dieses Kurses ergeben und die du in eigenen Worten beantworten können solltest:

- Ein Sprite ist im Editor scharf und im Spiel unscharf. Wie gehst du vor?
- Zwei Gegner teilen sich eine Kollisionsform, und eine Änderung wirkt auf beide. Warum, und wie verhinderst du das?
- Ein Wert steht im Skript, in der Szene und in einer Ressource. Welcher gilt?
- Auf einem 144-Hz-Monitor ruckelt die Figur, auf 60 Hz nicht. Woran denkst du zuerst?
- Was gehört von einem Godot-Projekt ins Repository und was nicht?

Die Interview-Karten dieses Bereichs üben solche Fragen mit Wiederholung.

## Portfolio: was du zeigen kannst

- **Ein kurzes Video** des Testgeländes mit eigenen Assets und sichtbaren Kollisionsformen. Zwei Minuten reichen.
- **`KORREKTUREN.md`** mit zwei ausgewählten Fehlern von Symptom bis Beleg. Das zeigt mehr als jede Liste von Werkzeugen.
- **`ASSETS.md`** mit deiner Pipeline und einem Commit, in dem eine Änderung am Original ohne Handarbeit im Spiel ankommt.
- **Eine Projektkarte** eines fremden Projekts, etwa der offiziellen JRPG-Demo.

Zeig deine eigene Gestaltung, wenn du sie zeigen willst. Für die Arbeit, um die es hier geht, zählt der nachvollziehbare Weg.

## Lernplan in Wochen

Bei etwa fünf Stunden pro Woche, davon die Hälfte unterwegs:

| Woche | Unterwegs | Am PC |
| --- | --- | --- |
| 1 | Der Editor als Werkstatt, Szenenbäume lesen | Testgelände aufbauen |
| 2 | Instanzen und Ressourcen | Projektkarte der JRPG-Demo |
| 3 | Pixelraster und Skalierung | Eigene Sprites importieren |
| 4 | Kollisionen und Trefferzonen | Animationen zuordnen |
| 5 | Eingabeaktionen und Parameter | Audio zuordnen |
| 6 | Bildrate und Simulation | Level aus Tiles |
| 7 | Fehler eingrenzen | Testversionen exportieren und sichern |
| 8 | Karten wiederholen | Werkstatt und Fehlerkiste |
| 9–12 | Karten wiederholen | Abschlussprojekt |

Die Reihenfolge ist ein Vorschlag. Wenn dein Spiel gerade eine Frage aufwirft, geh zu dem Modul, das sie beantwortet.

## Ressourcen

- [Godot-Dokumentation: Step by step](https://docs.godotengine.org/en/stable/getting_started/step_by_step/index.html) – die offiziellen Grundlagen.
- [Godot-Dokumentation: Editor](https://docs.godotengine.org/en/stable/tutorials/editor/index.html) – Aufbau und Bedienung des Editors.
- [Godot-Dokumentation: Project organization](https://docs.godotengine.org/en/stable/tutorials/best_practices/project_organization.html) und [Version control systems](https://docs.godotengine.org/en/stable/tutorials/best_practices/version_control_systems.html).
- [Godot-Demoprojekte](https://github.com/godotengine/godot-demo-projects) – offizielle kleine Projekte für Godot 4.7, gut zum Lesen fremder Projekte.
- [Godot Asset Store](https://store.godotengine.org/) – Erweiterungen und Vorlagen, im Editor über den Bildschirm „Asset Store“.
- [Art Design Deep Dive: Dead Cells](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-) – Thomas Vasseur (Motion Twin, 2018) beschreibt, wie das Studio Pixelart-Animationen aus 3D-Modellen rendert: eine andere Engine, dieselbe Frage nach Pipeline und Raster.
- [games-career.com](https://www.games-career.com/) – Jobportal der Spielebranche, vor allem mit Stellen in Deutschland.
